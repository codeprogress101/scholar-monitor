import assert from "node:assert/strict";
import { testSemesterCategory } from "./test-semester-category-scenarios.js";
import { testSemesterRecovery } from "./test-semester-recovery-scenarios.js";
import { testSemesterCompliance } from "./test-semester-compliance-scenarios.js";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { ConfigRecord } from "../server/configuration/model.js";
import type { SemesterAcademicView } from "../server/continuing/semester-academic.js";

export async function testSemesterAcademic(input: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  config: (kind: string, fields: object) => Promise<ConfigRecord>;
  scholar: string; semester: ConfigRecord; year: ConfigRecord; setupPath: string; actor: string;
}) {
  const { admin, request, config, scholar, semester, year, setupPath, actor } = input;
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  const base = `/api/v1/scholars/${scholar}/semester-requirements`, path = `${base}/${semester.id}/academic-context`;
  const view = async () => (await ok(request("staff", path))).json<SemesterAcademicView>();
  assert.equal((await view()).current, null);
  const school = await config("schools", { code: "SEM-SCHOOL", name: "Synthetic semester college" });
  const course = await config("courses", { code: "SEM-COURSE", name: "Synthetic degree course" });
  await ok(request("staff", `/api/v1/scholars/${scholar}/academic-records`, { academicYearId: year.id, schoolId: school.id, courseId: course.id, yearLevel: "Second year", reason: "Synthetic academic context", reference: "TEST-COR" }));
  const initial = await view();
  assert.equal(initial.current?.placement.yearLevel, "Second year"); assert.equal(initial.saved.placement, undefined);
  const body = { expectedRevision: initial.revision, academicRecordId: initial.current!.id, expectedAcademicVersion: initial.current!.version, category: "degree" };
  await error(request("system_admin", path, body), 403, "PERMISSION_DENIED");
  await error(request("staff", path, { ...body, academicRecordId: randomUUID() }), 409, "VERSION_CONFLICT");
  await error(request("staff", path, { ...body, expectedAcademicVersion: 99 }), 409, "VERSION_CONFLICT");
  await error(request("staff", path, { ...body, yearLevel: "Fourth year" }), 422, "VALIDATION_FAILED");
  const key = randomUUID();
  await admin.query("CREATE TRIGGER reject_semester_academic BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.academic' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("staff", path, body, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_semester_academic"); }
  assert.equal((await view()).revision, 1);
  const saved = (await ok(request("staff", path, body, key))).json();
  assert.equal(saved.revision, 2);
  assert.deepEqual((await ok(request("staff", path, body, key))).json(), saved);
  await error(request("staff", path, { ...body, category: "non_degree" }, key), 409, "IDEMPOTENCY_CONFLICT");
  await error(request("coordinator", path, body), 409, "VERSION_CONFLICT");
  await error(request("staff", path, { ...body, expectedRevision: 2, category: "non_degree" }), 409, "CATEGORY_REVIEW_REQUIRED");
  assert.deepEqual((await ok(request("staff", path, { ...body, expectedRevision: 2 }))).json(), { revision: 2, changed: false });
  const current = await view();
  assert.equal(current.history.length, 2); assert.equal(current.history[1].category, "unknown");
  assert.equal(current.saved.placement?.yearLevel, "Second year");
  const changedCourse = await config("courses", { code: "SEM-CHANGED", name: "Synthetic changed course" });
  await admin.execute("UPDATE academic_records SET course_id=? WHERE id=?", [changedCourse.id, initial.current!.id]);
  try { await error(request("staff", path, { ...body, expectedRevision: 2 }), 409, "SEMESTER_ACADEMIC_REVIEW_REQUIRED"); }
  finally { await admin.execute("UPDATE academic_records SET course_id=? WHERE id=?", [course.id, initial.current!.id]); }
  const [[term]] = await admin.execute<RowDataPacket[]>("SELECT id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?", [scholar, semester.id]);
  const [[revision]] = await admin.execute<RowDataPacket[]>("SELECT enrolled,full_load,normalized_year_level FROM scholar_semester_revisions WHERE scholar_semester_id=? AND revision=2", [term.id]);
  assert.deepEqual({...revision}, { enrolled: null, full_load: null, normalized_year_level: null });
  // A synthetic future entitlement must freeze upstream context even before its writer is enabled.
  const entitlement = randomUUID();
  await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, term.id, scholar, semester.id, actor]);
  try { await error(request("staff", path, { ...body, expectedRevision: 2 }), 409, "SEMESTER_ACADEMIC_REVIEW_REQUIRED"); }
  finally { await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]); }
  // Simulate the calendar advancing in this disposable database; no operational dates are changed.
  await admin.execute("UPDATE semesters SET ends_on='2026-09-30' WHERE id=?", [semester.id]);
  const next = await config("semesters", { code: "SETUP-NEXT", name: "Next receiving semester", academicYearId: year.id, startsOn: "2026-10-01", endsOn: "2026-12-31" });
  for (const code of ["NEXT-COR", "NEXT-COG"]) await ok(request("system_admin", "/api/v1/requirement-definitions", { action: "create", code, expectedVersion: 0, reason: "Synthetic next period", reference: "TEST", fields: { documentKind: code.endsWith("COR") ? "enrollment" : "grades", name: code, instructions: "Synthetic document", appliesTo: "semester", semesterId: next.id, effectiveFrom: "2026-10-01", effectiveUntil: null } }));
  const options = (await ok(request("coordinator", `${setupPath}?semesterId=${next.id}`))).json();
  const setup = (await ok(request("coordinator", setupPath, { semesterId: next.id, expectedSemesterVersion: next.version, coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId: semester.id, corDefinitionVersionId: options.definitions.find((d: {code:string}) => d.code === "NEXT-COR").id, cogDefinitionVersionId: options.definitions.find((d: {code:string}) => d.code === "NEXT-COG").id, issuer: "Synthetic authority", reference: "TEST-NEXT", sourceReference: "Synthetic next period policy", reviewed: true }))).json();
  await ok(request("coordinator", setupPath + "/availability", { scopeId: setup.id, expectedRevision: 1, mode: "enabled", expectedSemesterVersion: next.version, expectedPredecessorVersion: semester.version, reviewed: true }));
  const before = (await ok(request("staff", base))).json().items.find((c: {semesterId:string}) => c.semesterId === semester.id);
  const oldRevisions = (await view()).history;
  await ok(request("staff", base + "/provision", { periodId: next.id }));
  const after = (await ok(request("staff", base))).json().items;
  assert.deepEqual(after.find((c: {semesterId:string}) => c.semesterId === semester.id), before);
  assert.deepEqual((await view()).history, oldRevisions);
  const fresh = after.find((c: {semesterId:string}) => c.semesterId === next.id);
  assert.equal(fresh.items.length, 2);
  for (const doc of fresh.items) { assert.equal(doc.status, "not_submitted"); assert.equal(doc.receipt, null); }
  assert.equal(fresh.items.find((d: {coverage:{kind:string}}) => d.coverage.kind === "cog").coverage.semesterName, semester.name);
  const nextView = (await ok(request("staff", `${base}/${next.id}/academic-context`))).json<SemesterAcademicView>();
  assert.equal(nextView.saved.placement?.yearLevel, "Second year"); assert.equal(nextView.category, "degree");
  assert.deepEqual(nextView.saved.categorySource, { scholarSemesterId: term.id, revision: 2 });
  await testSemesterCategory({ admin, request, base, semesterId: next.id, previousSemesterId: semester.id, actor, scholar });
  await testSemesterRecovery({ admin, request, base, setupPath, semester: next, previous: semester, actor, scholar });
  const [[counts]] = await admin.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM semester_entitlements) AS entitlements,(SELECT COUNT(*) FROM scholarship_records) AS annuals,(SELECT COUNT(*) FROM semester_review_events) AS reviews");
  assert.deepEqual({...counts}, {entitlements: 0,annuals: 0,reviews: 0});
  await testSemesterCompliance({ admin, request, base, setupPath, semester: next, previous: semester, actor, scholar });
}
