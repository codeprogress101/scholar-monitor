import "dotenv/config";
import { testSemesterAcademic } from "./test-semester-academic-scenarios.js";
import { testRegularCoverage } from "./test-regular-coverage-scenarios.js";
import { testRequirementTiming } from "./test-requirement-timing-scenarios.js";
import { testContinuingMasterlist } from "./test-continuing-masterlist-scenarios.js";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthService } from "../server/auth/service.js";
import { newToken } from "../server/auth/crypto.js";
import { AuthorizationService } from "../server/authorization/service.js";
import type { ScholarResult } from "../server/scholars/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_roster_test_${suffix}`,
  runtimeUser = `ldss_test_${suffix}`,
  runtimePassword = newToken();
const origin = "http://127.0.0.1:3003",
  password = "A long synthetic testing passphrase!";
const adminConfig = {
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: "root",
  password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
  timezone: "Z",
};
const admin = await mysql.createConnection(adminConfig);
let root: mysql.Pool | undefined,
  runtime: mysql.Pool | undefined,
  app: ReturnType<typeof buildApp> | undefined;
let createdDatabase = false,
  createdUser = false,
  passed = 0;
const pass = (name: string) => {
  passed++;
  console.log("PASS " + name);
};
try {
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  createdDatabase = true;
  await admin.changeUser({ database });
  assert.equal((await applyMigrations(admin)).length, 55);
  assert.deepEqual(await applyMigrations(admin), []);
  await admin.query(
    `CREATE USER ${admin.escape(runtimeUser)}@'localhost' IDENTIFIED BY ${admin.escape(runtimePassword)}`,
  );
  createdUser = true;
  await grantAuthRuntime(admin, database, runtimeUser);
  root = mysql.createPool({ ...adminConfig, database, connectionLimit: 4 });
  runtime = mysql.createPool({
    ...adminConfig,
    database,
    user: runtimeUser,
    password: runtimePassword,
    connectionLimit: 8,
  });
  const auth = new AuthService(root),
    roles = new AuthorizationService(root);
  const db = {
    pool: runtime,
    check: async () => "connected" as const,
    close: async () => {},
  };
  app = buildApp(
    loadConfig({ APP_ENV: "test", PORT: "3003", APP_ORIGIN: origin }),
    { database: db },
  );
  const accounts = new Map<
    string,
    { id: string; cookie: string; csrf: string }
  >();
  for (const role of [
    "system_admin",
    "staff",
    "coordinator",
    "reviewer",
    "unassigned",
  ] as const) {
    const email = role + "@example.invalid",
      id = await auth.createAccount(
        "Synthetic " + role,
        email,
        "test-operator",
      );
    const reset = await auth.issueReset(
      email,
      "test-operator",
      "Synthetic fixture activation",
    );
    await auth.resetPassword(reset, password, "127.0.0.1", randomUUID());
    if (role !== "unassigned")
      await roles.setRoles({
        email,
        roles: [role === "reviewer" ? "coordinator" : role],
        expectedVersion: 2,
        requestId: randomUUID(),
        operator: "test-operator",
        reason: "Synthetic fixture role",
      });
    const response: LightMyRequestResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin, "content-type": "application/json" },
      payload: { email, password },
    });
    assert.equal(response.statusCode, 200);
    accounts.set(role, {
      id,
      cookie: String(response.headers["set-cookie"]).split(";")[0],
      csrf: response.json().csrfToken,
    });
  }
  const request = (
    role: string,
    url: string,
    body?: object,
    key: string = randomUUID(),
    method: "GET" | "POST" | "PATCH" = body ? "POST" : "GET",
  ) => {
    const account = accounts.get(role)!;
    return app!.inject({
      method,
      url,
      headers: {
        cookie: account.cookie,
        origin,
        "x-role": "coordinator",
        ...(body
          ? {
              "content-type": "application/json",
              "x-csrf-token": account.csrf,
              "idempotency-key": key,
            }
          : {}),
      },
      ...(body ? { payload: body } : {}),
    });
  };
  const expectError = (
    response: LightMyRequestResponse,
    status: number,
    code: string,
  ) => {
    assert.equal(response.statusCode, status, response.body);
    assert.equal(response.json().error.code, code);
  };
  const config = async (kind: string, fields: object) => {
    const response = await request(
      "system_admin",
      "/api/v1/configuration/" + kind,
      {
        action: "create",
        expectedVersion: 0,
        reason: "Synthetic scholar fixture",
        fields,
      },
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json<ConfigRecord>();
  };

  const year = await config("academic-years", { code: "ROSTER", name: "Roster year", startsOn: "2026-01-01", endsOn: "2026-12-31" });
  const people: ScholarResult[] = [];
  for (const firstName of ["Alice", "Bob", "Carol", "Dora"]) {
    const response = await request("staff", "/api/v1/scholars", { expectedVersion: 0, fields: { firstName, lastName: "Baseline", academicYearId: year.id, contact: {} } });
    assert.equal(response.statusCode, 200, response.body); people.push(response.json());
  }
  const base = "/api/v1/continuing-rosters";
  const body = (index = 0) => ({ sourceReference: "Synthetic hard-copy roster, page 1", entries: [{ scholarId: people[index].id, version: 1, sourceRow: index + 1, originalName: ["Alice", "Bob", "Carol", "Dora"][index] + " Baseline" }] });
  const decision = { expectedRevision: 0, decision: "accepted", effectiveOn: "2026-01-01", issuer: "Synthetic committee", reference: "SYNTHETIC-ONLY", reviewed: true };
  const ok = async (promise: Promise<LightMyRequestResponse>) => { const r = await promise; assert.equal(r.statusCode, 200, r.body); return r; };
  const view = async (id: string) => (await ok(request("staff", `${base}/${id}`))).json();
  assert.equal((await app.inject(base)).statusCode, 401);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, base), 403, "PERMISSION_DENIED");
    expectError(await request(role, base, body()), 403, "PERMISSION_DENIED");
  }
  expectError(await request("staff", base, { ...body(), entries: [body().entries[0], body().entries[0]] }), 422, "VALIDATION_FAILED");
  const key = randomUUID();
  const roster = (await ok(request("staff", base, body(), key))).json();
  assert.deepEqual((await ok(request("staff", base, body(), key))).json(), roster);
  expectError(await request("staff", base, { ...body(), sourceReference: "Different reference" }, key), 409, "IDEMPOTENCY_CONFLICT");
  const endpoint = `${base}/${roster.id}/decision`;
  expectError(await request("staff", endpoint, decision), 403, "PERMISSION_DENIED");
  expectError(await request("system_admin", endpoint, decision), 403, "PERMISSION_DENIED");
  expectError(await request("coordinator", endpoint, { ...decision, reference: "" }), 422, "VALIDATION_FAILED");
  expectError(await request("coordinator", endpoint, { ...decision, reviewed: false }), 422, "VALIDATION_FAILED");
  const account = accounts.get("coordinator")!;
  assert.equal((await app.inject({ method: "POST", url: endpoint, headers: { cookie: account.cookie, origin }, payload: decision })).statusCode, 403);
  pass("Authentication, technical-only Admin, explicit decision authority, duplicate rows, CSRF and safe retries enforced");
  const competing = (await ok(request("staff", base, body()))).json();
  const decisionKey = randomUUID();
  await admin.query("CREATE TRIGGER fail_roster_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='continuing.roster' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic failure'; END IF; END");
  try { assert.equal((await request("coordinator", endpoint, decision, decisionKey)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER fail_roster_audit"); }
  assert.equal((await view(roster.id)).state, "pending");
  assert.equal((await admin.query<RowDataPacket[]>("SELECT id FROM participations"))[0].length, 0);
  assert.equal((await admin.query<RowDataPacket[]>("SELECT id FROM workflow_authority_versions"))[0].length, 0);
  const accepted = (await ok(request("coordinator", endpoint, decision, decisionKey))).json();
  const baselinePath = `/api/v1/scholars/${people[0].id}/continuing-baseline`;
  assert.equal((await ok(request("staff", baselinePath))).json().baseline.batchId, roster.id);
  expectError(await request("system_admin", baselinePath), 403, "PERMISSION_DENIED");
  assert.deepEqual((await ok(request("coordinator", endpoint, decision, decisionKey))).json(), accepted);
  expectError(await request("reviewer", endpoint, decision), 409, "VERSION_CONFLICT");
  expectError(await request("reviewer", `${base}/${competing.id}/decision`, decision), 409, "PARTICIPATION_EXISTS");
  expectError(await request("staff", base, body()), 409, "PARTICIPATION_EXISTS");
  const [events] = await admin.query<RowDataPacket[]>("SELECT snapshot FROM participation_events");
  const snapshot = typeof events[0].snapshot === "string" ? JSON.parse(events[0].snapshot) : events[0].snapshot;
  assert.equal(snapshot.priorShiftCount, null); assert.equal(snapshot.historicalDocuments, "not_recorded");
  for (const table of ["scholarship_records", "qualification_events", "requirement_receipts", "semester_entitlements", "payment_records"])
    assert.equal((await admin.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n, 0);
  pass("Acceptance is atomic, retains unknown history and creates no qualification, document or payout records");
  const own = (await ok(request("coordinator", base, body(1)))).json();
  await ok(request("coordinator", `${base}/${own.id}/decision`, { ...decision, decision: "rejected", reason: "Coordinator rejected own draft after review" }));
  const raced = await Promise.all([request("staff", base, body(2)), request("coordinator", base, body(2))]);
  const raceIds = raced.map((r) => { assert.equal(r.statusCode, 200, r.body); return r.json().id; });
  const decisions = await Promise.all([request("coordinator", `${base}/${raceIds[0]}/decision`, decision), request("reviewer", `${base}/${raceIds[1]}/decision`, decision)]);
  assert.deepEqual(decisions.map((r) => r.statusCode).sort(), [200, 409]);
  pass("Separate Coordinator review and concurrent cross-roster acceptance prevent duplicate participation");
  const stale = (await ok(request("staff", base, body(3)))).json();
  await admin.execute("UPDATE scholars SET version=version+1 WHERE id=?", [people[3].id]);
  expectError(await request("coordinator", `${base}/${stale.id}/decision`, decision), 409, "SOURCE_CHANGED");
  await ok(request("coordinator", `${base}/${stale.id}/decision`, { ...decision, decision: "rejected", reason: "Identity changed; prepare replacement" }));
  assert.equal((await view(stale.id)).state, "rejected");
  for (const table of ["continuing_roster_batches", "continuing_roster_entries", "continuing_roster_decisions", "participations", "participation_events", "workflow_authority_versions", "workflow_commands"]) {
    await assert.rejects(runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`));
    const column = table === "workflow_commands" ? "actor_id" : "id";
    await assert.rejects(runtime.query(`EXPLAIN UPDATE ${table} SET ${column}=${column} WHERE 1=0`));
  }
  pass("Stale identity prevents acceptance; rejection preserves history; runtime cannot overwrite or delete onboarding evidence");
  const semester = await config("semesters", { code: "SETUP-CURRENT", name: "Current setup semester", academicYearId: year.id, startsOn: "2026-07-01", endsOn: "2026-12-31" });
  const previous = await config("semesters", { code: "SETUP-PRIOR", name: "Previous completed semester", academicYearId: year.id, startsOn: "2026-01-01", endsOn: "2026-06-30" });
  for (const code of ["SETUP-COR", "SETUP-COG"]) await ok(request("system_admin", "/api/v1/requirement-definitions", {
    action: "create", code, expectedVersion: 0, reason: "Synthetic setup definition", reference: "TEST", fields: { documentKind: code.endsWith("COR") ? "enrollment" : "grades", name: code, instructions: "Synthetic document", appliesTo: "semester", semesterId: semester.id, effectiveFrom: "2026-07-01", effectiveUntil: null }
  }));
  const setupPath = `${base}/${roster.id}/semester-setup`;
  const options = (await ok(request("coordinator", `${setupPath}?semesterId=${semester.id}`))).json();
  const setupBody = { semesterId: semester.id, expectedSemesterVersion: semester.version, coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId: previous.id,
    corDefinitionVersionId: options.definitions.find((d: {code:string}) => d.code === "SETUP-COR").id,
    cogDefinitionVersionId: options.definitions.find((d: {code:string}) => d.code === "SETUP-COG").id,
    issuer: "Synthetic committee", reference: "TEST-SETUP", sourceReference: "Synthetic policy source", reviewed: true };
  for (const role of ["staff", "system_admin", "unassigned"]) expectError(await request(role, setupPath, setupBody), 403, "PERMISSION_DENIED");
  expectError(await request("coordinator", setupPath, { ...setupBody, mode: "enabled" }), 422, "VALIDATION_FAILED");
  expectError(await request("coordinator", setupPath, { ...setupBody, reviewed: false }), 422, "VALIDATION_FAILED");
  expectError(await request("coordinator", setupPath, { ...setupBody, coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId: semester.id }), 409, "DOCUMENT_COVERAGE_CONFLICT");
  expectError(await request("coordinator", setupPath, { ...setupBody, cogDefinitionVersionId: setupBody.corDefinitionVersionId }), 409, "REQUIREMENT_NOT_APPLICABLE");
  expectError(await request("coordinator", `${base}/${own.id}/semester-setup`, setupBody), 409, "ACCEPTED_ROSTER_REQUIRED");
  expectError(await request("coordinator", setupPath, { ...setupBody, expectedSemesterVersion: 999 }), 409, "SOURCE_CHANGED");
  const setupKey = randomUUID();
  await admin.query("CREATE TRIGGER reject_setup_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.setup' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator", setupPath, setupBody, setupKey)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_setup_audit"); }
  assert.equal((await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM workflow_policy_versions"))[0][0].n, 0);
  assert.equal((await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM workflow_scope_versions"))[0][0].n, 0);
  const setupResult = (await ok(request("coordinator", setupPath, setupBody, setupKey))).json();
  assert.equal(setupResult.mode, "disabled");
  assert.deepEqual((await ok(request("coordinator", setupPath, setupBody, setupKey))).json(), setupResult);
  expectError(await request("coordinator", setupPath, { ...setupBody, reference: "Different authority" }, setupKey), 409, "IDEMPOTENCY_CONFLICT");
  expectError(await request("reviewer", setupPath, setupBody), 409, "SEMESTER_SETUP_EXISTS");
  assert.equal((await ok(request("staff", setupPath))).json().setups[0].mode, "disabled");
  for (const table of ["scholar_semesters", "requirement_checklists", "semester_entitlements"])
    assert.equal((await admin.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n, 0);
  pass("Coordinator-only semester setup is atomic, immutable, retry-safe, scoped to accepted rosters and always disabled without student records or entitlements");
  const availabilityPath = setupPath + "/availability";
  const availability = { scopeId: setupResult.id, expectedRevision: 1, mode: "enabled", expectedSemesterVersion: semester.version, expectedPredecessorVersion: previous.version, reviewed: true };
  for (const role of ["staff", "system_admin", "unassigned"]) expectError(await request(role, availabilityPath, availability), 403, "PERMISSION_DENIED");
  expectError(await request("coordinator", availabilityPath, { ...availability, reviewed: false }), 422, "VALIDATION_FAILED");
  expectError(await request("coordinator", availabilityPath, { ...availability, expectedPredecessorVersion: 999 }), 409, "SOURCE_CHANGED");
  const activationKey = randomUUID();
  await admin.query("CREATE TRIGGER reject_scope_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.scope' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator", availabilityPath, availability, activationKey)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_scope_audit"); }
  assert.equal((await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM workflow_scope_versions"))[0][0].n, 1);
  const enabled = (await ok(request("coordinator", availabilityPath, availability, activationKey))).json();
  assert.equal(enabled.revision, 2); assert.equal(enabled.mode, "enabled");
  assert.deepEqual((await ok(request("coordinator", availabilityPath, availability, activationKey))).json(), enabled);
  expectError(await request("coordinator", availabilityPath, { ...availability, reason: "Other data" }, activationKey), 409, "IDEMPOTENCY_CONFLICT");
  expectError(await request("reviewer", availabilityPath, availability), 409, "VERSION_CONFLICT");
  const disable = { ...availability, scopeId: enabled.id, expectedRevision: 2, mode: "disabled", reason: "Synthetic operational pause" };
  expectError(await request("coordinator", availabilityPath, { ...disable, reason: "" }), 422, "VALIDATION_FAILED");
  const races = await Promise.all([request("coordinator", availabilityPath, disable), request("reviewer", availabilityPath, disable)]);
  assert.deepEqual(races.map((r) => r.statusCode).sort(), [200,409]);
  const history = (await ok(request("staff", setupPath))).json().setups;
  assert.equal(history.length, 3); assert.equal(history.filter((v: {current:boolean}) => v.current).length, 1);
  assert.equal(history.find((v: {current:boolean}) => v.current).mode, "disabled");
  assert.equal((await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM scholar_semesters"))[0][0].n, 0);
  const latestScope = history.find((v: {current:boolean}) => v.current);
  const reactivate = { ...availability, scopeId: latestScope.id, expectedRevision: latestScope.revision };
  await admin.execute("UPDATE requirement_definition_versions SET active=0 WHERE id=?", [setupBody.cogDefinitionVersionId]);
  expectError(await request("coordinator", availabilityPath, reactivate), 409, "REQUIREMENT_NOT_APPLICABLE");
  await admin.execute("UPDATE requirement_definition_versions SET active=1 WHERE id=?", [setupBody.cogDefinitionVersionId]);
  const [[participation]] = await admin.query<RowDataPacket[]>("SELECT id FROM participations WHERE scholar_id=?", [people[0].id]);
  const syntheticTerm = randomUUID();
  await admin.execute("INSERT INTO scholar_semesters(id,scholar_id,semester_id,participation_id,scope_version_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))", [syntheticTerm, people[0].id, semester.id, participation.id, enabled.id, accounts.get("coordinator")!.id]);
  expectError(await request("coordinator", availabilityPath, reactivate), 409, "SEMESTER_REACTIVATION_REVIEW_REQUIRED");
  await admin.execute("DELETE FROM scholar_semesters WHERE id=?", [syntheticTerm]);
  pass("Scope activation/disable preserves revisions, blocks stale or unauthorized commands, rolls back failed audits and has one concurrent winner");
  const provisionScope = (await ok(request("coordinator", availabilityPath, reactivate))).json();
  const receiving = `/api/v1/scholars/${people[0].id}/semester-requirements`;
  assert.equal((await ok(request("staff", receiving + "/receiving-periods"))).json().items[0].canProvision, true);
  for (const role of ["system_admin", "unassigned"]) expectError(await request(role, receiving + "/provision", { periodId: semester.id }), 403, "PERMISSION_DENIED");
  expectError(await request("staff", `/api/v1/scholars/${people[1].id}/semester-requirements/provision`, { periodId: semester.id }), 409, "ACCEPTED_BASELINE_REQUIRED");
  await admin.query("CREATE TRIGGER reject_provision_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.provision' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  const provisionKey = randomUUID();
  try { assert.equal((await request("staff", receiving + "/provision", { periodId: semester.id }, provisionKey)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_provision_audit"); }
  for (const table of ["scholar_semesters", "requirement_checklists", "requirement_instances", "requirement_coverage"])
    assert.equal((await admin.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n, 0);
  const [[originalAuthority]] = await admin.execute<RowDataPacket[]>("SELECT a.id,DATE_FORMAT(a.valid_from,'%Y-%m-%d') AS valid_from FROM workflow_authority_versions a JOIN workflow_policy_versions p ON p.authority_version_id=a.id JOIN workflow_scope_versions s ON s.policy_version_id=p.id WHERE s.id=?", [provisionScope.id]);
  await admin.execute("UPDATE workflow_authority_versions SET valid_from='2025-01-01',valid_until='2026-01-01' WHERE id=?", [originalAuthority.id]);
  expectError(await request("staff", receiving + "/provision", { periodId: semester.id }), 423, "SEMESTER_WORKFLOW_UNAVAILABLE");
  await admin.execute("UPDATE workflow_authority_versions SET valid_from=?,valid_until=NULL WHERE id=?", [originalAuthority.valid_from, originalAuthority.id]);
  const preparations = await Promise.all([request("staff", receiving + "/provision", { periodId: semester.id }, provisionKey), request("coordinator", receiving + "/provision", { periodId: semester.id })]);
  for (const r of preparations) assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(preparations.map((r) => r.json().created).sort(), [false,true]);
  assert.deepEqual((await ok(request("staff", receiving + "/provision", { periodId: semester.id }, provisionKey))).json(), preparations[0].json());
  const termList = (await ok(request("staff", receiving))).json();
  assert.equal(termList.items.length, 1); assert.equal(termList.items[0].scholarshipRecordId, null);
  const termChecklist = termList.items[0];
  const corItem = termChecklist.items.find((i: {coverage: {kind:string}}) => i.coverage.kind === "cor");
  const cogItem = termChecklist.items.find((i: {coverage: {kind:string}}) => i.coverage.kind === "cog");
  assert.equal(corItem.coverage.semesterName, semester.name); assert.equal(cogItem.coverage.semesterName, previous.name);
  await ok(request("staff", `/api/v1/requirement-checklists/${termChecklist.id}/receive`, { items: [{ id: corItem.id, expectedVersion: 0, documentType: "certificate_of_enrollment" }], receivedOn: "2026-10-06", physicalReference: null, storageLocation: null, remarks: null }));
  const received = (await ok(request("staff", receiving))).json().items[0];
  assert.equal(received.items.find((i: {id:string}) => i.id === corItem.id).status, "submitted");
  assert.equal(received.items.find((i: {id:string}) => i.id === corItem.id).receipt.documentType, "certificate_of_enrollment");
  assert.equal(received.items.find((i: {id:string}) => i.id === cogItem.id).status, "not_submitted");
  const missingAcademic = await request("staff", `/api/v1/requirement-instances/${cogItem.id}/verification-context`);
  expectError(missingAcademic, 409, "ACADEMIC_RECORD_REQUIRED"); assert.equal(missingAcademic.json().error.details.academicYearId, year.id);
  for (const table of ["scholarship_records", "qualification_events", "semester_entitlements", "payment_records"])
    assert.equal((await admin.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n, 0);
  const [[unknown]] = await admin.query<RowDataPacket[]>("SELECT program_category,enrolled,full_load,year_level FROM scholar_semester_revisions LIMIT 1");
  assert.deepEqual({...unknown}, {program_category: "unknown", enrolled: null, full_load: null, year_level: null});
  await testSemesterAcademic({ admin, request, config, scholar: people[0].id, semester, year, setupPath, actor: accounts.get("coordinator")!.id });
  pass("Semester academic revisions use authoritative placement, preserve unknown findings, enforce stale/locked/category controls and leave prior semesters unchanged on new-period preparation");
  await ok(request("coordinator", availabilityPath, { ...disable, scopeId: provisionScope.id, expectedRevision: provisionScope.revision }));
  const preserved = (await ok(request("staff", receiving))).json().items[0];
  assert.equal(preserved.periodUnavailable, true); assert.equal(preserved.items.find((i: {id:string}) => i.id === corItem.id).status, "submitted");
  expectError(await request("staff", `/api/v1/requirement-checklists/${termChecklist.id}/receive`, { items: [{id: cogItem.id,expectedVersion: 0}], receivedOn: "2026-10-06", physicalReference:null,storageLocation:null,remarks:null }), 423, "SEMESTER_WORKFLOW_UNAVAILABLE");
  pass("Automatic semester provisioning is atomic/idempotent, needs no invented annual admission, receives COR independently and preserves read-only history after disabling");
  await testRegularCoverage({ admin, request, config, scholar: people[0].id, setupPath, actor: accounts.get("coordinator")!.id });
  await testRequirementTiming({ admin, runtime: runtime!, request, actor: accounts.get("coordinator")!.id, scholar: people[0].id });
  await testContinuingMasterlist({ request, admin, year: year.id });
  console.log(`All ${passed} continuing-roster scenarios passed.`);
  if (process.argv.includes("--browser")) {
    const fixture = buildApp(loadConfig({ APP_ENV: "test", PORT: "3003", APP_ORIGIN: origin }), { database: db, clientRoot: resolve("dist/client") });
    let stop = () => {};
    const finished = new Promise<void>((r) => { stop = r; });
    fixture.get("/__fixture/stop", async () => { setTimeout(stop, 50); return { stopping: true }; });
    await fixture.listen({ host: "127.0.0.1", port: 3003 });
    console.log("Disposable roster fixture ready on port 3003.");
    await finished; await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_roster_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
