import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { rename } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { createDatabase } from "../server/database.js";
import { AuthService } from "../server/auth/service.js";
import { AuthorizationService } from "../server/authorization/service.js";
import { today } from "../server/scholars/validation.js";
import type { ConfigRecord } from "../server/configuration/model.js";
import type { RequirementChecklist } from "../server/requirements/instances-model.js";
import type { VerificationContext } from "../server/requirements/workflow-model.js";
import type { PayoutCycle } from "../server/payouts/model.js";
import type { OvrDetail } from "../server/ovr/model.js";

import { OFFICIAL_COHORT } from "../server/continuing/official-cohort.js";

// Resumable API-only setup: dates and evidence are real seed-time events.
// Never reset personal accounts, invent payments, or rewrite historical timestamps.
const config = loadConfig(process.env);
assert.equal(config.APP_ENV, "development");
assert.equal(config.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["localhost", "127.0.0.1"].includes(config.DB_HOST));
const file = "output/payroll-demo-manifest.json";
type Step = { key: string; role: string; url: string; body: object; result?: unknown };
type Manifest = { database: string; day: string; complete: boolean; calendar?: { currentStart: string; previousStart: string; previousEnd: string; yearStart: string }; steps: Record<string, Step> };
mkdirSync("output", { recursive: true });
const root = mysql.createPool({ host: config.DB_HOST, port: config.DB_PORT,
  user: "root", password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
  database: config.DB_NAME, timezone: "Z", connectionLimit: 2 });
const lock = await root.getConnection();
let app: ReturnType<typeof buildApp> | undefined;
try {
  const [locks] = await lock.query<RowDataPacket[]>("SELECT GET_LOCK('ldss_demo_seed',0) AS acquired");
  assert.equal(locks[0].acquired, 1, "Another demo seed is running");
  const manifest: Manifest = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) :
    { database: config.DB_NAME, day: today(), complete: false, steps: {} };
  assert.equal(manifest.database, config.DB_NAME);
  const persist = async () => {
    writeFileSync(file + ".tmp", JSON.stringify(manifest, null, 2));
    for (let attempt = 0; ; attempt++) {
      try { await rename(file + ".tmp", file); break; }
      catch (error) {
        if (attempt >= 20 || !["EPERM", "EBUSY", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
        await setTimeout(50);
      }
    }
  };
  if (manifest.complete) {
    console.log("Demo dataset already installed. Existing testing changes preserved. See output/demo-data-guide.md.");
  } else {
    if (!existsSync(file)) {
      const [existing] = await root.query<RowDataPacket[]>("SELECT id FROM users WHERE email LIKE 'payroll-demo-%@example.invalid'");
      assert.equal(existing.length, 0, "Demo actors exist but the manifest is missing. Restore the manifest before reseeding.");
      await persist();
    }
    const [legacy] = await root.query<RowDataPacket[]>("SELECT id FROM payout_cycles WHERE code='DEMO-PAYOUT'");
    assert.equal(legacy.length, 0, "Remove the manifest-owned legacy demo first using the reviewed replacement utility");
    const origin = config.APP_ORIGIN ?? "http://127.0.0.1:5173";
    app = buildApp({ ...config, LOG_LEVEL: "silent" }, { database: createDatabase(config) });
    const auth = new AuthService(root), roles = new AuthorizationService(root);
    const sessions = new Map<string, { cookie: string; csrf: string }>();
    for (const role of ["system_admin", "staff", "coordinator"] as const) {
      const email = `payroll-demo-${role}@example.invalid`;
      const [found] = await root.query<RowDataPacket[]>("SELECT id FROM users WHERE email=?", [email]);
      const id = found[0]?.id as string | undefined ?? await auth.createAccount(`DEMO seed ${role}`, email, "demo-seed");
      const password = randomBytes(32).toString("base64url") + "aA1!";
      const reset = await auth.issueReset(email, "demo-seed", "Activate synthetic demo seed actor");
      await auth.resetPassword(reset, password, "127.0.0.1", randomUUID());
      const access = await roles.access(id);
      if (!access.roles.some(r => r.code === role)) await roles.setRoles({ email, roles: [role],
        expectedVersion: access.version, requestId: randomUUID(), operator: "demo-seed", reason: "Assign synthetic demo seed role" });
      const response: LightMyRequestResponse = await app.inject({ method: "POST", url: "/api/v1/auth/login",
        headers: { origin, "content-type": "application/json" }, payload: { email, password } });
      assert.equal(response.statusCode, 200, "Demo actor login failed");
      sessions.set(role, { cookie: String(response.headers["set-cookie"]).split(";")[0], csrf: response.json().csrfToken });
    }
    async function read<T>(url: string, role = "staff"): Promise<T> {
      const response = await app!.inject({ method: "GET", url, headers: { cookie: sessions.get(role)!.cookie, origin } });
      assert.equal(response.statusCode, 200, `${url}: ${response.body}`);
      return response.json<T>();
    }
    async function command<T = { id: string; version: number; scholarId: string }>(name: string, role: string, url: string, body: object): Promise<T> {
      const step = manifest.steps[name] ??= { key: randomUUID(), role, url, body };
      if (step.result !== undefined) return step.result as T;
      assert.equal(step.url, url); assert.equal(step.role, role);
      await persist(); // Retain the exact request and key even if interrupted after commit.
      const session = sessions.get(role)!;
      const response = await app!.inject({ method: "POST", url, payload: step.body, headers: {
        cookie: session.cookie, origin, "content-type": "application/json", "x-csrf-token": session.csrf, "idempotency-key": step.key } });
      assert.equal(response.statusCode, 200, `${name}: ${response.body}`);
      step.result = response.json(); await persist();
      return step.result as T;
    }
    const day = manifest.day;
    const offset = (n: number) => new Date(Date.parse(day + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
    const before = (date: string, days: number) => new Date(Date.parse(date + "T00:00:00Z") - days * 86400000).toISOString().slice(0, 10);
    if (!manifest.calendar) {
      // Align with the earliest current local semester boundary, so another
      // calendar does not intervene between the demo's prior/current terms.
      const [existing] = await root.query<RowDataPacket[]>("SELECT DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts FROM semesters WHERE code NOT IN ('DEMO-PAY-TERM1','DEMO-PAY-TERM2') AND starts_on<=? AND ends_on>=? ORDER BY starts_on", [day, offset(-190)]);
      const currentStart = existing[0]?.starts as string | undefined ?? offset(-20);
      const previousStart = before(currentStart, 90);
      manifest.calendar = { currentStart, previousStart, previousEnd: before(currentStart, 1), yearStart: before(previousStart, 10) };
      await persist();
    }
    const calendar = manifest.calendar;
    const setup = (kind: string, code: string, fields: object) => command<ConfigRecord>(code, "system_admin", `/api/v1/configuration/${kind}`,
      { action: "create", expectedVersion: 0, fields: { code, ...fields } });
    const year = await setup("academic-years", "DEMO-PAY-YEAR", { name: "DEMO Payroll Training Year", startsOn: calendar.yearStart, endsOn: offset(200) });
    const terms = [
      await setup("semesters", "DEMO-PAY-TERM1", { name: "DEMO Previous Semester", academicYearId: year.id, startsOn: calendar.previousStart, endsOn: calendar.previousEnd }),
      await setup("semesters", "DEMO-PAY-TERM2", { name: "DEMO Current Semester", academicYearId: year.id, startsOn: calendar.currentStart, endsOn: offset(100) }),
    ];
    const school = await setup("schools", "DEMO-PAY-COLLEGE", { name: "DEMO Scholarship Training College" });
    const course = await setup("courses", "DEMO-PAY-DEGREE", { name: "DEMO Bachelor of Information Technology" });
    const definitionsByTerm: string[][] = [[], []];
    for (const [n, term] of terms.entries()) for (const kind of ["COR", "COG"]) {
      const code = n === 0 ? `DEMO-PAY-PREV-${kind}` : `DEMO-PAY-${kind}`;
      const d = await command(code, "system_admin", "/api/v1/requirement-definitions", { action: "create", code, expectedVersion: 0,
        fields: { documentKind: code.endsWith("COR") ? "enrollment" : "grades", name: code.endsWith("COR") ? "DEMO Certificate of Registration" : "DEMO Certificate of Grades", instructions: "Synthetic hard-copy training document", appliesTo: "semester", semesterId: term.id, effectiveFrom: calendar.yearStart, effectiveUntil: null } });
      definitionsByTerm[n].push(d.id);
    }
    const definitions = definitionsByTerm[1];
    const cycles: PayoutCycle[] = [];
    for (const [n, term] of terms.entries()) {
      let c = await command<PayoutCycle>(`cycle-${n}`, "system_admin", "/api/v1/payout-cycles", { action: "create", code: `DEMO-PAY-${n + 1}`, semesterId: term.id,
        expectedSemesterVersion: 1, expectedVersion: 0, fields: { name: n === 1 ? "DEMO Current Semester Payroll" : "DEMO Previous Semester Payroll", targetDate: offset(14), requirements: definitionsByTerm[n].map(definitionVersionId => ({ definitionVersionId, allowWaiver: false })) } });
      c = await command<PayoutCycle>(`open-${n}`, "coordinator", `/api/v1/payout-cycles/${c.id}/open`, { action: "open", expectedVersion: c.version });
      await command(`map-${n}`, "coordinator", `/api/v1/payout-cycles/${c.id}/submission-windows/configure`, { expectedCycleVersion: c.version, termNumber: n + 1, expectedSemesterVersion: 1, expectedYearVersion: 1, deadlineOn: offset(60) });
      cycles.push(c);
    }
    const semester = terms[1], cycle = cycles[1];
    const setupPath = `/api/v1/continuing-rosters/${OFFICIAL_COHORT}/semester-setup`;
    const options = await read<{ coverage: { sourceHash: string | null; issue: string | null } }>(setupPath + `?semesterId=${semester.id}`, "coordinator");
    assert.ok(options.coverage.sourceHash, options.coverage.issue ?? "Review demo semester coverage before receiving");
    await command("semester-policy", "coordinator", setupPath, { semesterId: semester.id, expectedSemesterVersion: 1, coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId: terms[0].id, expectedCoverageHash: options.coverage.sourceHash,
      corDefinitionVersionId: definitions[0], cogDefinitionVersionId: definitions[1], issuer: "DEMO Scholarship Coordinator", reference: "DEMO-SEMESTER-POLICY", sourceReference: "Synthetic training setup only", reviewed: true });
    const scope = (await read<{ setups: { id: string; semesterId: string }[] }>(setupPath, "coordinator")).setups.find(s => s.semesterId === semester.id)!;
    assert.ok(scope);
    await command("enable-semester", "coordinator", setupPath + "/availability", { scopeId: scope.id, expectedRevision: 1, mode: "enabled", expectedSemesterVersion: 1, expectedPredecessorVersion: 1, expectedCoverageHash: options.coverage.sourceHash, reviewed: true });

    const scenarios = [
      { name: "Ana", scenario: "Eligible for payroll", stage: "eligible", level: "Second year" },
      { name: "Ben", scenario: "Eligible for payroll", stage: "eligible", level: "Fourth year" },
      { name: "Carlo", scenario: "Missing both COR and COG", stage: "missing", level: "First year" },
      { name: "Diana", scenario: "COR verified; COG missing", stage: "cor-only", level: "Third year" },
      { name: "Elena", scenario: "Both documents received; awaiting review", stage: "received", level: "Second year" },
      { name: "Felix", scenario: "Both documents for verification", stage: "verification", level: "Third year" },
      { name: "Gina", scenario: "COG returned for correction", stage: "correction", level: "Second year" },
      { name: "Hugo", scenario: "Verified documents; unresolved INC blocks payout", stage: "inc", level: "Fourth year" },
      { name: "Iris", scenario: "Verified documents; failed subject blocks payout", stage: "failed", level: "Second year" },
      { name: "Jessa", scenario: "New applicant; exam not yet recorded", stage: "applicant", level: "First year" },
      { name: "Kevin", scenario: "Exam passed; awaiting qualification/selection", stage: "exam", level: "First year" },
    ];
    const people: { id: string; annual: string; scholarId: string; name: string; scenario: string; stage: string; level: string }[] = [];
    for (const [n, scenario] of scenarios.entries()) {
      const p = await command(`person-${n}`, "staff", "/api/v1/scholars", { expectedVersion: 0, fields: { firstName: scenario.name, lastName: "Demo", academicYearId: year.id, contact: {} } });
      await command(`academic-${n}`, "staff", `/api/v1/scholars/${p.id}/academic-records`, { academicYearId: year.id, schoolId: school.id, courseId: course.id, yearLevel: scenario.level });
      const a = await command(`annual-${n}`, "staff", `/api/v1/scholars/${p.id}/scholarships`, { academicYearId: year.id, expectedVersion: 0, effectiveOn: day });
      const actions = scenario.stage === "applicant" ? [] : scenario.stage === "exam" ? ["exam-passed"] : ["exam-passed", "qualify", "select"];
      for (const [j, action] of actions.entries()) await command(`qualification-${n}-${j}`, j === 0 ? "staff" : "coordinator", `/api/v1/scholarships/${a.id}/qualification/${action}`, { expectedVersion: j + 1, effectiveOn: day });
      people.push({ id: p.id, scholarId: p.scholarId, annual: a.id, ...scenario });
    }
    const officialPeople = people.slice(0, 9);
    let master = await command("masterlist", "staff", "/api/v1/masterlists", { academicYearId: year.id, title: "DEMO Published Payroll Scholars" });
    for (const [n, p] of officialPeople.entries()) master = await command(`member-${n}`, "staff", `/api/v1/masterlists/${master.id}/entries`, { action: "add", expectedVersion: master.version, scholarId: p.id, awardNumber: null });
    for (const [n, action] of ["submit-verification", "submit-approval", "approve", "publish"].entries()) master = await command(`master-${action}`, n < 2 ? "staff" : "coordinator", `/api/v1/masterlists/${master.id}/${action}`, { expectedVersion: master.version, ...(action === "publish" ? { effectiveOn: day } : {}) });
    const batch = await command("window", "coordinator", `/api/v1/payout-cycles/${cycle.id}/submission-windows/open-window`, { expectedCycleVersion: cycle.version, expectedDeadlineRevision: 1, expectedSequence: 0, opensOn: day, cutoffOn: offset(7) });
    const list = async (id: string) => (await read<{ items: RequirementChecklist[] }>(`/api/v1/scholars/${id}/semester-requirements`)).items.find(c => c.semesterId === semester.id)!;
    for (const [n, p] of officialPeople.entries()) {
      const path = `/api/v1/scholars/${p.id}/semester-requirements`;
      await command(`provision-${n}`, "staff", path + "/provision", { periodId: semester.id });
      const academic = await read<{ revision: number; current: { id: string; version: number } }>(`${path}/${semester.id}/academic-context`);
      await command(`context-${n}`, "staff", `${path}/${semester.id}/academic-context`, { expectedRevision: academic.revision, academicRecordId: academic.current.id, expectedAcademicVersion: academic.current.version, category: "degree" });
      const checklist = await list(p.id);
      assert.equal(checklist.items.length, 2);
      if (p.stage === "missing") continue;
      const items = checklist.items.filter(i => p.stage !== "cor-only" || i.code.endsWith("COR"));
      await command(`receive-${n}`, "staff", `/api/v1/requirement-checklists/${checklist.id}/receive`, { items: items.map(i => ({ id: i.id, expectedVersion: 0, ...(i.code.endsWith("COR") ? { documentType: "cor" } : {}) })), receivedOn: day, physicalReference: null, storageLocation: null, remarks: "Synthetic demo receipt; no physical original" });
      if (p.stage === "received") continue;
      for (const item of items) {
        const doc = `/api/v1/requirement-instances/${item.id}`, key = `${n}-${item.code}`;
        await command(`send-${key}`, "staff", doc + "/send-for-verification", { action: "send-for-verification", expectedVersion: 1, effectiveOn: day, remarks: null });
        if (p.stage === "verification") continue;
        if (p.stage === "correction" && item.code.endsWith("COG")) {
          await command(`correction-${key}`, "staff", doc + "/return-for-correction", { action: "return-for-correction", expectedVersion: 2, effectiveOn: day, correctionOf: null, reason: "DEMO COG is missing the registrar signature", remarks: null });
          continue;
        }
        const { scholarId, scholarVersion, academicYearId, semesterId, schoolId, courseId, academicVersion, definitionVersionId, coverageId, semesterRevision, predecessorSourceHash } = await read<VerificationContext>(doc + "/verification-context");
        await command(`verify-${key}`, "staff", doc + "/verify", { action: "verify", expectedVersion: 2, effectiveOn: day, remarks: null,
          document: { scholarId, scholarVersion, academicYearId, semesterId, schoolId, courseId, academicVersion, definitionVersionId, coverageId, semesterRevision, ...(predecessorSourceHash ? { predecessorSourceHash } : {}) },
          checks: { identity: true, period: true, placement: true, applicability: true, validity: true } });
      }
      if (["eligible", "inc", "failed"].includes(p.stage)) {
        const compliancePath = `${path}/${semester.id}/compliance`;
        type Review = { sourceHash: string; revision: number; gradingRule: unknown };
        let review = await read<Review>(compliancePath);
        if (!review.gradingRule) {
          await command("grading-rule", "coordinator", compliancePath + "/grading-rule", { sourceHash: review.sourceHash, kind: "native", rule: null, issuer: "DEMO Coordinator", authorityReference: "DEMO-GRADING", sourceReference: "Synthetic 1-best grading scale, threshold 2.50", reviewed: true });
          review = await read<Review>(compliancePath);
        }
        await command(`compliance-${n}`, "staff", compliancePath, { sourceHash: review.sourceHash, expectedRevision: review.revision,
          findings: { average: n === 0 ? "1.75" : "2.50", enrolled: true, fullLoad: true, hasFailed: p.stage === "failed", hasDropped: false, hasIncomplete: p.stage === "inc" }, reviewed: true });
      }
      console.log(`Prepared ${p.name} Demo: ${p.scenario}`);
    }
    const detail = await read<OvrDetail>(`/api/v1/ovr-batches/${batch.id}`);
    assert.ok(detail.managed);
    assert.equal(detail.managed.form.rows.length, 2);
    for (const p of officialPeople) assert.equal(detail.managed.items.find(i => i.scholarshipId === p.annual)?.eligible, p.stage === "eligible", p.name + " eligibility");
    const session = sessions.get("staff")!;
    const preview = await app.inject({ method: "GET", url: `/api/v1/ovr-batches/${batch.id}/payroll-form?draft=true`, headers: { cookie: session.cookie, origin } });
    assert.equal(preview.statusCode, 200);
    assert.match(preview.body, /DRAFT/);
    assert.match(preview.body, /10,000.00/);
    writeFileSync("output/demo-payroll-preview.html", preview.body);
    const [payments] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payment_records WHERE cycle_id=?", [cycle.id]);
    assert.equal(payments[0].n, 0);
    writeFileSync("output/demo-data-guide.md", ["# Current payroll demo", "", `Created ${day}. Synthetic training data only.`, "",
      "Use your existing Staff and Coordinator accounts. Your passwords and roles are unchanged.", "",
      "## Start here", "", "1. Scholar registry: search Demo, open a scholar, then Receive requirements.",
      "2. Choose DEMO Current Semester. COR covers the current semester; COG covers DEMO Previous Semester.",
      "3. Payout cycles: open DEMO Current Semester Payroll, then its first payroll batch and Preview payroll.",
      "4. Ana and Ben appear automatically: two rows, PHP 5,000 each, PHP 10,000 total. Others stay blocked for their displayed reasons.",
      "", `The submission window runs ${day} through ${offset(7)}, inclusive (Asia/Manila). The semester deadline is ${offset(60)}.`,
      "The draft preview is available now. Review/finalization requires the cutoff to pass and timely pending submissions to be resolved or explicitly deferred by the Coordinator. No timestamps were backdated and no payment was recorded.", "",
      "## Scenarios", "", "| Scholar ID | Name | Year level | Test scenario |", "| --- | --- | --- | --- |",
      ...people.map(p => `| ${p.scholarId} | ${p.name} Demo | ${p.level} | ${p.scenario} |`), "",
      "Hugo and Iris remain scholars: academic noncompliance blocks payout without automatically terminating participation. Jessa and Kevin are outside the published masterlist.", "",
      "Nine published scholars each have two individual requirement records. Two applicants have no semester checklist yet. This demo uses synthetic qualification history and is not a names-only continuing roster import.", "",
      "## Preservation and reruns", "", "The legacy F26 demo was removed using its manifest, an encrypted verified backup, and exact dependency checks. Existing accounts, audit history, the separate Juan Dela Cruz record, and the old school/course it uses were preserved.",
      "Keep output/payroll-demo-manifest.json. npm run demo:seed skips a completed installation and preserves your testing changes. An interrupted installation resumes recorded commands; contact the maintainer if its dates have expired.",
      "Synthetic seed accounts have unsaved random passwords; use your normal role accounts. The saved HTML preview is a snapshot; the application preview reflects later testing changes.", ""].join("\n"));
    manifest.complete = true; await persist();
    console.log("Installed 11 fresh demo scholars. Payroll preview: 2 eligible, PHP 10,000. See output/demo-data-guide.md.");
  }
} finally {
  if (app) await app.close();
  await lock.query("SELECT RELEASE_LOCK('ldss_demo_seed')");
  lock.release(); await root.end();
}
