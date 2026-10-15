import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { SemesterAcademicView } from "../server/continuing/semester-academic.js";

export async function testSemesterCategory(input: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  base: string; semesterId: string; previousSemesterId: string; actor: string; scholar: string;
}) {
  const { admin, request, base, semesterId, previousSemesterId, actor, scholar } = input;
  const path = `${base}/${semesterId}/academic-context`, correction = path + "/correct-category";
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  const view = async () => (await ok(request("coordinator", path))).json<SemesterAcademicView>();
  const initial = await view();
  const body = { expectedRevision: initial.revision, academicRecordId: initial.current!.id, expectedAcademicVersion: initial.current!.version, category: "non_degree", reason: "Degree was incorrectly recorded for this unchanged technical course", reference: "SYNTHETIC-COR-CATEGORY", reviewed: true };
  for (const role of ["staff", "system_admin", "unassigned"]) await error(request(role, correction, body), 403, "PERMISSION_DENIED");
  for (const override of [{reason:""}, {reference:""}, {reviewed:false}, {category:"unknown"}, {schoolId:randomUUID()}]) await error(request("coordinator", correction, {...body,...override}), 422, "VALIDATION_FAILED");
  await error(request("coordinator", correction, {...body,expectedRevision:999}), 409, "VERSION_CONFLICT");
  await error(request("coordinator", correction, {...body,expectedAcademicVersion:999}), 409, "VERSION_CONFLICT");
  await error(request("coordinator", correction, {...body,category:"degree"}), 409, "NO_CATEGORY_CHANGE");
  const priorPath = `${base}/${previousSemesterId}/academic-context`;
  const prior = (await ok(request("staff", priorPath))).json<SemesterAcademicView>();
  assert.match(prior.correctionBlocker!, /later semester/);
  await error(request("coordinator", priorPath + "/correct-category", {...body, expectedRevision: prior.revision}), 409, "CATEGORY_CORRECTION_REVIEW_REQUIRED");
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", [semesterId]);
  try { await error(request("coordinator", correction, body), 409, "CATEGORY_CORRECTION_REVIEW_REQUIRED"); }
  finally { await admin.execute("UPDATE semesters SET locked_at=NULL WHERE id=?", [semesterId]); }
  const [[term]] = await admin.execute<RowDataPacket[]>("SELECT id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?", [scholar, semesterId]);
  const entitlement = randomUUID();
  await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, term.id, scholar, semesterId, actor]);
  try { await error(request("coordinator", correction, body), 409, "CATEGORY_CORRECTION_REVIEW_REQUIRED"); }
  finally { await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]); }
  await admin.query("CREATE TRIGGER reject_category_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.category.correct' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  const key = randomUUID();
  try { assert.equal((await request("coordinator", correction, body, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_category_audit"); }
  assert.deepEqual(await view(), initial);
  const otherKey = randomUUID();
  const races = await Promise.all([request("coordinator", correction, body, key), request("reviewer", correction, body, otherKey)]);
  assert.deepEqual(races.map((r) => r.statusCode).sort(), [200,409]);
  const winner = races[0].statusCode === 200 ? "coordinator" : "reviewer", winningKey = winner === "coordinator" ? key : otherKey;
  assert.deepEqual((await ok(request(winner, correction, body, winningKey))).json(), {revision:2,changed:true});
  await error(request(winner, correction, {...body,reference:"DIFFERENT"}, winningKey), 409, "IDEMPOTENCY_CONFLICT");
  const corrected = await view();
  assert.equal(corrected.category, "non_degree"); assert.equal(corrected.history.length, 2);
  assert.deepEqual(corrected.history[1], initial.history[0]);
  assert.deepEqual(corrected.saved.placement, initial.saved.placement);
  assert.equal(corrected.saved.categorySource, undefined);
  assert.equal(corrected.saved.categoryCorrection?.reason, body.reason);
  assert.equal(corrected.saved.categoryCorrection?.reference, body.reference);
  const routine = {expectedRevision:2,academicRecordId:body.academicRecordId,expectedAcademicVersion:body.expectedAcademicVersion,category:"non_degree"};
  assert.deepEqual((await ok(request("staff", path, routine))).json(), {revision:2,changed:false});
  const [[audit]] = await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM audit_logs WHERE event_type='semester.category.correct'");
  assert.equal(audit.n, 1);
  const [[findings]] = await admin.execute<RowDataPacket[]>("SELECT enrolled,full_load,normalized_year_level FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1", [term.id]);
  assert.deepEqual({...findings}, {enrolled:null,full_load:null,normalized_year_level:null});
}
