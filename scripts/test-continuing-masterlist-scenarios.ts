import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { today } from "../server/scholars/validation.js";
type Request = (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
export async function testContinuingMasterlist({ request, admin, year }: { request: Request; admin: Connection; year: string }) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r.json(); };
  const person = await ok(request("staff", "/api/v1/scholars", { expectedVersion: 0, fields: { firstName: "Bridge", lastName: "Continuing", academicYearId: year, contact: {} } }));
  const config = async (kind: string, code: string) => ok(request("system_admin", "/api/v1/configuration/" + kind, { action: "create", expectedVersion: 0, reason: "Synthetic bridge fixture", fields: { code, name: code } }));
  const school = await config("schools", "BRIDGE-S"), course = await config("courses", "BRIDGE-C");
  await ok(request("staff", `/api/v1/scholars/${person.id}/academic-records`, { academicYearId: year, schoolId: school.id, courseId: course.id, yearLevel: "Second year", reason: "Verified synthetic placement", reference: "TEST-BRIDGE" }));
  const roster = await ok(request("staff", "/api/v1/continuing-rosters", { sourceReference: "Synthetic continuing bridge roster", entries: [{ scholarId: person.id, version: 1, sourceRow: 1, originalName: "Bridge Continuing" }] }));
  const draft = await ok(request("staff", "/api/v1/masterlists", { academicYearId: year, title: "Accepted continuing bridge" }));
  const path = `/api/v1/masterlists/${draft.id}`, body = { action: "add", expectedVersion: 1, scholarId: person.id, awardNumber: null };
  assert.equal((await request("staff", path + "/entries", body)).statusCode, 422);
  await ok(request("coordinator", `/api/v1/continuing-rosters/${roster.id}/decision`, { expectedRevision: 0, decision: "accepted", effectiveOn: today(), issuer: "Synthetic committee", reference: "TEST-BRIDGE", reviewed: true }));
  assert.equal((await request("system_admin", path + "/entries", body)).statusCode, 403);
  const key = randomUUID();
  await admin.query("CREATE TRIGGER fail_bridge_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='scholarship.continuing-prepared' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic failure'; END IF; END");
  try { assert.equal((await request("staff", path + "/entries", body, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER fail_bridge_audit"); }
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE scholar_id=?", [person.id]))[0].length, 0);
  const added = await ok(request("staff", path + "/entries", body, key));
  assert.deepEqual(await ok(request("staff", path + "/entries", body, key)), added);
  const [[annual]] = await admin.execute<RowDataPacket[]>("SELECT id,status,operational_status,continuing_participation_id FROM scholarship_records WHERE scholar_id=?", [person.id]);
  assert.equal(annual.status, "continuing"); assert.equal(annual.operational_status, null); assert.ok(annual.continuing_participation_id);
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT id FROM qualification_events WHERE scholarship_id=?", [annual.id]))[0].length, 0);
  let version = added.version;
  for (const [action, role] of [["submit-verification", "staff"], ["submit-approval", "staff"], ["approve", "reviewer"], ["publish", "coordinator"], ["lock", "coordinator"]]) {
    const data = { expectedVersion: version, ...(action === "publish" ? { effectiveOn: today() } : {}) };
    if (action === "approve") assert.equal((await request("system_admin", path + "/approve", data)).statusCode, 403);
    version = (await ok(request(role, path + "/" + action, data))).version;
  }
  const official = await ok(request("staff", path + "/workflow"));
  assert.equal(official.publication.snapshot.entries[0].snapshot.continuingAdmission.participationId, annual.continuing_participation_id);
  const [[state]] = await admin.execute<RowDataPacket[]>("SELECT status,operational_status FROM scholarship_records WHERE id=?", [annual.id]);
  assert.equal(state.status, "continuing"); assert.equal(state.operational_status, "active");
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT id FROM semester_entitlements WHERE scholar_id=?", [person.id]))[0].length, 0);
  console.log("PASS Continuing masterlist bridge: reviewed baseline, no invented qualification events, audited atomic annual preparation, role checks, retry, publication and no automatic entitlement");
}
