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
import type { EligibilityView } from "../server/eligibility/model.js";
import type { PayoutCycle } from "../server/payouts/model.js";
import type { OvrBatch } from "../server/ovr/model.js";

// This is deliberately additive. Completed commands are never replayed or reset.
const config = loadConfig(process.env);
assert.equal(config.APP_ENV, "development");
assert.equal(config.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["localhost", "127.0.0.1"].includes(config.DB_HOST));
const file = "output/demo-data-manifest.json";
type Step = { key: string; role: string; url: string; body: object; result?: unknown };
type Manifest = { database: string; day: string; complete: boolean; steps: Record<string, Step> };
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
      const [existing] = await root.query<RowDataPacket[]>("SELECT id FROM users WHERE email LIKE 'f26-demo-%@example.invalid'");
      assert.equal(existing.length, 0, "Demo actors exist but the manifest is missing. Restore the manifest before reseeding.");
      await persist();
    }
    const origin = config.APP_ORIGIN ?? "http://127.0.0.1:5173";
    app = buildApp({ ...config, LOG_LEVEL: "silent" }, { database: createDatabase(config) });
    const auth = new AuthService(root), roles = new AuthorizationService(root);
    const sessions = new Map<string, { cookie: string; csrf: string }>();
    for (const role of ["system_admin", "staff", "coordinator"] as const) {
      const email = `f26-demo-${role}@example.invalid`;
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
    async function read<T>(url: string): Promise<T> {
      const response = await app!.inject({ method: "GET", url, headers: { cookie: sessions.get("staff")!.cookie, origin } });
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
    const day = manifest.day, evidence = { reason: "Synthetic DEMO training data", reference: "DEMO-F26" };
    const later = (days: number) => new Date(Date.parse(day + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);
    const setup = (kind: string, code: string, fields: object) => command<ConfigRecord>(code, "system_admin", `/api/v1/configuration/${kind}`,
      { action: "create", expectedVersion: 0, reason: evidence.reason, fields: { code, ...fields } });
    const year = await setup("academic-years", "DEMO-YEAR", { name: "DEMO Training Academic Year", startsOn: later(-60), endsOn: later(300) });
    const semester = await setup("semesters", "DEMO-SEM", { name: "DEMO First Semester", academicYearId: year.id, startsOn: day, endsOn: later(100) });
    const schools = [], courses = [];
    for (let i = 1; i <= 2; i++) {
      schools.push(await setup("schools", `DEMO-SCHOOL-${i}`, { name: `DEMO Training College ${i}` }));
      courses.push(await setup("courses", `DEMO-COURSE-${i}`, { name: `DEMO ${i === 1 ? "Information Technology" : "Education"}` }));
    }
    const definitions = [];
    for (const code of ["DEMO-COR", "DEMO-COG", "DEMO-ID"]) {
      const d = await command(code, "system_admin", "/api/v1/requirement-definitions", { action: "create", code, expectedVersion: 0, ...evidence,
        fields: { name: `${code} training document`, instructions: "Synthetic document for local testing only", appliesTo: code === "DEMO-ID" ? "semester" : "payout",
          semesterId: semester.id, effectiveFrom: day, effectiveUntil: null } });
      if (code !== "DEMO-ID") definitions.push({ definitionVersionId: d.id, allowWaiver: code === "DEMO-COG" });
    }
    let cycle = await command<PayoutCycle>("cycle", "system_admin", "/api/v1/payout-cycles", { action: "create", code: "DEMO-PAYOUT", semesterId: semester.id,
      expectedSemesterVersion: semester.version, expectedVersion: 0, fields: { name: "DEMO Training Payout", targetDate: day, requirements: definitions }, ...evidence });
    cycle = await command<PayoutCycle>("cycle-open", "coordinator", `/api/v1/payout-cycles/${cycle.id}/open`, { action: "open", expectedVersion: cycle.version, ...evidence });
    const scenarios = ["Applicant", "Exam Passed", "Qualified", "Selected", "Missing Documents", "Submitted Documents", "For Verification", "For Correction",
      "Eligible", "Waiver", "OVR Draft", "OVR Review", "OVR Finalized", "OVR Submitted", "OVR Processed", "Paid and Closed", "Not Paid and Closed"];
    const people: { person: { id: string; scholarId: string }; annual: { id: string }; scenario: string }[] = [];
    for (const [i, scenario] of scenarios.entries()) {
      const person = await command(`person-${i}`, "staff", "/api/v1/scholars", { expectedVersion: 0, reason: evidence.reason,
        fields: { firstName: scenario, lastName: "Demo", academicYearId: year.id, contact: {} } });
      const annual = await command(`annual-${i}`, "staff", `/api/v1/scholars/${person.id}/scholarships`, { academicYearId: year.id, expectedVersion: 0, effectiveOn: day, ...evidence });
      await command(`academic-${i}`, "staff", `/api/v1/scholars/${person.id}/academic-records`, { academicYearId: year.id, schoolId: schools[i % 2].id,
        courseId: courses[i % 2].id, yearLevel: "First year", ...evidence });
      for (const [j, action] of ["exam-passed", "qualify", "select"].entries()) {
        if (i <= j) break;
        await command(`qualify-${i}-${j}`, j === 0 ? "staff" : "coordinator", `/api/v1/scholarships/${annual.id}/qualification/${action}`,
          { expectedVersion: j + 1, effectiveOn: day, ...evidence });
      }
      people.push({ person, annual, scenario });
    }
    let official = await command("masterlist", "staff", "/api/v1/masterlists", { academicYearId: year.id, title: "DEMO Official Training Scholars", ...evidence });
    for (let i = 4; i < people.length; i++) official = await command(`member-${i}`, "staff", `/api/v1/masterlists/${official.id}/entries`,
      { action: "add", expectedVersion: official.version, scholarId: people[i].person.id, awardNumber: `DEMO-${i}`, ...evidence });
    for (const [i, action] of ["submit-verification", "submit-approval", "approve", "publish", "lock"].entries()) official = await command(`masterlist-${action}`,
      i < 2 ? "staff" : "coordinator", `/api/v1/masterlists/${official.id}/${action}`, { expectedVersion: official.version, ...evidence, ...(action === "publish" ? { effectiveOn: day } : {}) });
    for (let i = 4; i < people.length; i++) {
      const annual = people[i].annual, base = `/api/v1/scholarships/${annual.id}/requirements`;
      await command(`semester-checklist-${i}`, "staff", base + "/generate", { semesterId: semester.id, expectedSemesterVersion: semester.version, ...evidence });
      await command(`payout-checklist-${i}`, "staff", base + "/generate", { semesterId: semester.id, expectedSemesterVersion: semester.version,
        payoutCycleId: cycle.id, expectedPayoutVersion: cycle.version, ...evidence });
      const checklist = (await read<{ items: RequirementChecklist[] }>(base)).items.find(c => c.items.some(r => r.code === "DEMO-COR"))!;
      assert.ok(checklist, "Payout checklist must exist");
      for (const requirement of checklist.items) {
        const doc = `/api/v1/requirement-instances/${requirement.id}`, key = `${i}-${requirement.code}`;
        if (i === 4) continue;
        if (i === 9 && requirement.code === "DEMO-COG") {
          await command(`waive-${key}`, "coordinator", doc + "/waive", { expectedVersion: 0, effectiveOn: day, reason: evidence.reason, authorityReference: "DEMO-WAIVER", remarks: null });
          continue;
        }
        await command(`receive-${key}`, "staff", doc + "/receive", { expectedVersion: 0, receivedOn: day, physicalReference: `DEMO-${key}`,
          storageLocation: "DEMO training cabinet", remarks: null, reason: evidence.reason });
        if (i === 5) continue;
        const workflow = (action: string, expectedVersion: number) => ({ action, expectedVersion, effectiveOn: day, ...evidence, remarks: null });
        await command(`send-${key}`, "staff", doc + "/send-for-verification", workflow("send-for-verification", 1));
        if (i === 6) continue;
        if (i === 7) {
          await command(`correction-${key}`, "staff", doc + "/return-for-correction", { ...workflow("return-for-correction", 2), correctionOf: null, reason: "DEMO document is missing a signature" });
          continue;
        }
        const c = await read<VerificationContext>(doc + "/verification-context");
        await command(`verify-${key}`, "staff", doc + "/verify", { ...workflow("verify", 2), document: { scholarId: c.scholarId, scholarVersion: c.scholarVersion,
          academicYearId: c.academicYearId, semesterId: c.semesterId, schoolId: c.schoolId, courseId: c.courseId, academicVersion: c.academicVersion, definitionVersionId: c.definitionVersionId },
          checks: { identity: true, period: true, placement: true, applicability: true, validity: true } });
      }
      const eligibilityPath: string = `/api/v1/payout-cycles/${cycle.id}/scholarships/${annual.id}/eligibility`;
      const view: EligibilityView = await read<EligibilityView>(eligibilityPath);
      assert.equal(view.current.eligible, i >= 8, `Unexpected eligibility for ${people[i].scenario}`);
      await command(`eligibility-${i}`, "staff", eligibilityPath + "/calculate", { expectedRevision: view.latest?.revision ?? 0, expectedSourceHash: view.current.sourceHash, ...evidence });
      if (i < 10) continue;
      let batch = await command<OvrBatch>(`ovr-${i}`, "staff", `/api/v1/payout-cycles/${cycle.id}/ovr-batches`, { expectedRevision: 0, expectedCycleVersion: cycle.version,
        code: `DEMO-OVR-${i}`, name: `DEMO ${people[i].scenario}`, ...evidence });
      const batchPath = `/api/v1/ovr-batches/${batch.id}`;
      batch = await command<OvrBatch>(`ovr-add-${i}`, "staff", batchPath + "/entries/add", { expectedRevision: batch.revision, scholarshipId: annual.id, ...evidence });
      for (const [j, action] of ["submit-review", "finalize", "submit", "mark-processed"].entries()) {
        if (i < 11 + j) break;
        batch = await command<OvrBatch>(`ovr-${action}-${i}`, j === 0 || j === 3 ? "staff" : "coordinator", batchPath + "/" + action,
          { expectedRevision: batch.revision, ...evidence, ...(j >= 2 ? { effectiveOn: day } : {}) });
      }
      if (i >= 15) {
        batch = await command<OvrBatch>(`payment-${i}`, "staff", batchPath + "/payments", { expectedRevision: batch.revision, effectiveOn: day, ...evidence,
          scholarshipId: annual.id, outcome: i === 15 ? "paid" : "not_paid", amount: i === 15 ? "5000.00" : "0.00", remarks: "DEMO training outcome; no real funds transferred" });
        await command(`close-${i}`, "coordinator", batchPath + "/close", { expectedRevision: batch.revision, effectiveOn: day, reconciled: true, ...evidence });
      }
      console.log(`Prepared DEMO ${people[i].scenario}`);
    }
    const guide = ["# DEMO testing data", "", "Synthetic local training data only. No real payments were made.", "",
      "Sign in with your existing Staff or Coordinator account. System Administrator manages configuration only.", "",
      "Start: Scholar registry > search Demo > Open profile > Receive requirements > DEMO-YEAR > DEMO-PAYOUT.",
      "Use Missing Documents to receive a document; Submitted Documents to send for verification; For Verification to verify; For Correction to resubmit.",
      "Semester checklists also contain an unsubmitted DEMO-ID document for practice.", "",
      "Payout cycles > DEMO-PAYOUT provides eligibility and OVR batches at each processing stage.", "",
      "| Scholar ID | Demo scenario |", "| --- | --- |", ...people.map(p => `| ${p.person.scholarId} | ${p.scenario} |`), "",
      "Includes one academic year, one semester, two schools, two courses, three scoped requirement definitions, one open payout cycle, one locked official masterlist, 26 checklists, and seven OVR batches.", "",
      "Rerun npm run demo:seed safely: completed setup is skipped and your testing changes remain. Keep output/demo-data-manifest.json; it records resumable commands. No existing personal accounts or records are changed.", "",
      "The three DEMO seed actors use random passwords that are not saved. Continue using your own role accounts.", ""].join("\n");
    writeFileSync("output/demo-data-guide.md", guide);
    manifest.complete = true; await persist();
    console.log("Installed 17 DEMO scholars across the complete F26 workflow. See output/demo-data-guide.md.");
  }
} finally {
  if (app) await app.close();
  await lock.query("SELECT RELEASE_LOCK('ldss_demo_seed')");
  lock.release(); await root.end();
}
