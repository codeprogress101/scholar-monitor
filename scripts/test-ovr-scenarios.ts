import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { EligibilityView } from "../server/eligibility/model.js";
import type { EligibilityOverride } from "../server/eligibility/override-model.js";
import type { OvrBatch, OvrDetail } from "../server/ovr/model.js";
type Context = {
  request: (
    role: string,
    path: string,
    body?: object,
    key?: string,
  ) => Promise<LightMyRequestResponse>;
  view: () => Promise<EligibilityView>;
  admin: Connection;
  runtime: Pool;
  path: string;
  cycleId: string;
  cycleVersion: number;
  annualId: string;
};
export async function testOvrScenarios(c: Context) {
  const { request, view, admin, runtime } = c,
    base = `/api/v1/payout-cycles/${c.cycleId}/ovr-batches`,
    evidence = {
      reason: "Synthetic OVR draft preparation",
      reference: "OVR-021",
    };
  let passed = 0;
  const pass = (s: string) => {
    passed++;
    console.log("PASS F21 " + s);
  };
  const ok = async <T>(p: Promise<LightMyRequestResponse>) => {
    const r = await p;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<T>();
  };
  const denied = (r: LightMyRequestResponse, status: number, code: string) => {
    assert.equal(r.statusCode, status, r.body);
    assert.equal(r.json().error.code, code);
  };
  const read = (b: OvrBatch) =>
    ok<OvrDetail>(request("staff", `/api/v1/ovr-batches/${b.id}`));
  const cmd = (
    b: OvrBatch,
    action: string,
    extra: object = {},
    role = "staff",
    key = randomUUID(),
  ) =>
    request(
      role,
      `/api/v1/ovr-batches/${b.id}/${action === "validate" ? "validate" : `entries/${action}`}`,
      { expectedRevision: b.revision, ...evidence, ...extra },
      key,
    );
  const entry = { scholarshipId: c.annualId },
    body = {
      expectedRevision: 0,
      code: "DRAFT-021",
      name: "Synthetic payout roster",
      expectedCycleVersion: c.cycleVersion,
      ...evidence,
    };
  for (const role of ["system_admin", "unassigned"]) {
    denied(await request(role, base), 403, "PERMISSION_DENIED");
    denied(await request(role, base, body), 403, "PERMISSION_DENIED");
  }
  denied(
    await request("staff", base, { ...body, state: "finalized" }),
    422,
    "VALIDATION_FAILED",
  );
  denied(
    await request("staff", base, { ...body, expectedCycleVersion: 1 }),
    409,
    "VERSION_CONFLICT",
  );
  const createKey = randomUUID();
  let batch = await ok<OvrBatch>(request("staff", base, body, createKey));
  const created = batch;
  assert.deepEqual(await ok(request("staff", base, body, createKey)), created);
  denied(
    await request(
      "staff",
      base,
      { ...body, name: "Changed payload" },
      createKey,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  denied(await request("coordinator", base, body), 409, "OVR_CODE_EXISTS");
  assert.equal((await read(batch)).validation.valid, false);
  assert.ok(
    (await read(batch)).validation.issues.some((i) => i.code === "EMPTY_BATCH"),
  );
  pass(
    "Draft creation enforces authority, cycle versions, unique codes and exact retries; empty batches fail validation",
  );
  denied(
    await cmd(batch, "add", { ...entry, eligible: true }),
    422,
    "VALIDATION_FAILED",
  );
  await admin.query(
    "CREATE TRIGGER fail_ovr_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.draft' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  const addKey = randomUUID();
  try {
    assert.equal(
      (await cmd(batch, "add", entry, "staff", addKey)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_ovr_audit");
  }
  assert.equal((await read(batch)).entries.length, 0);
  assert.equal((await read(batch)).batch.revision, batch.revision);
  const beforeAdd = batch;
  batch = await ok<OvrBatch>(cmd(batch, "add", entry, "staff", addKey));
  assert.deepEqual(
    await ok(cmd(beforeAdd, "add", entry, "staff", addKey)),
    batch,
  );
  const detail = await read(batch);
  assert.equal(detail.entries.length, 1);
  assert.equal(detail.validation.valid, true);
  assert.deepEqual(detail.entries[0].evidence.current, (await view()).current);
  pass(
    "Fresh server eligibility admits complete Active official records; audit failure rolls back membership, revision and retry together",
  );
  let second = await ok<OvrBatch>(
    request("coordinator", base, { ...body, code: "SECOND-021" }),
  );
  denied(await cmd(batch, "add", entry), 409, "OVR_DUPLICATE_ENTRY");
  denied(await cmd(second, "add", entry), 409, "OVR_DUPLICATE_ENTRY");
  batch = await ok<OvrBatch>(cmd(batch, "validate", {}, "coordinator"));
  assert.equal(batch.validation!.valid, true);
  denied(await cmd(beforeAdd, "remove", entry), 409, "VERSION_CONFLICT");
  batch = await ok<OvrBatch>(cmd(batch, "remove", entry));
  assert.equal((await read(batch)).entries.length, 0);
  assert.equal((await read(batch)).history[0].entry!.scholarshipId, c.annualId);
  denied(await cmd(batch, "remove", entry), 409, "OVR_ENTRY_NOT_FOUND");
  const racing = await Promise.all([
    cmd(batch, "add", entry),
    cmd(second, "add", entry, "coordinator"),
  ]);
  assert.deepEqual(racing.map((r) => r.statusCode).sort(), [200, 409]);
  const winner = racing.find((r) => r.statusCode === 200)!.json<OvrBatch>();
  const removed = await ok<OvrBatch>(cmd(winner, "remove", entry));
  if (removed.id === batch.id) batch = removed;
  else second = removed;
  pass(
    "Duplicate membership is blocked across a cycle, including concurrent additions; removal retains history and releases membership",
  );
  const overrideBase = c.path + "/overrides";
  const v = await view();
  const overrideBody = {
    expectedRevision: 0,
    calculationId: v.latest!.id,
    expectedSourceHash: v.current.sourceHash,
    requestedEligible: false,
    reasonCode: "MANUAL_HOLD",
    justification: "Synthetic independent review of payout eligibility",
    authorityReference: "AUTH-021",
    ...evidence,
  };
  let override = await ok<EligibilityOverride>(
    request("staff", overrideBase, overrideBody),
  );
  denied(await cmd(batch, "add", entry), 409, "OVR_ENTRY_INELIGIBLE");
  const ovrcmd = (action: string, role = "staff") =>
    request(role, `${overrideBase}/${override.id}/${action}`, {
      expectedRevision: override.revision,
      ...evidence,
    });
  override = await ok<EligibilityOverride>(ovrcmd("submit-review"));
  denied(await cmd(batch, "add", entry), 409, "OVR_ENTRY_INELIGIBLE");
  override = await ok<EligibilityOverride>(ovrcmd("approve", "coordinator"));
  denied(await cmd(batch, "add", entry), 409, "OVR_ENTRY_INELIGIBLE");
  override = await ok<EligibilityOverride>(
    request("staff", overrideBase, {
      ...overrideBody,
      requestedEligible: true,
    }),
  );
  override = await ok<EligibilityOverride>(ovrcmd("submit-review"));
  override = await ok<EligibilityOverride>(ovrcmd("approve", "coordinator"));
  batch = await ok<OvrBatch>(cmd(batch, "add", entry));
  assert.equal(
    (await read(batch)).entries[0].evidence.effective.label,
    "Eligible - Override Approved",
  );
  pass(
    "Draft/Pending overrides block admission; approved negative results block it and a current positive approval is preserved as entry evidence",
  );
  // Fixture-only terminal state proves the forward-compatible guard, without exposing finalization in F21.
  const [owners] = await admin.execute<RowDataPacket[]>(
    "SELECT created_by FROM ovr_batches WHERE id=?",
    [second.id],
  );
  const sealed = {
    ...second,
    revision: second.revision + 1,
    state: "finalized",
    action: "fixture-finalize",
  };
  await admin.execute(
    "INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
    [
      sealed.id,
      sealed.revision,
      sealed.state,
      sealed.action,
      JSON.stringify(sealed),
      owners[0].created_by,
    ],
  );
  denied(await cmd(sealed, "add", entry), 409, "OVR_NOT_DRAFT");
  denied(await cmd(sealed, "remove", entry), 409, "OVR_NOT_DRAFT");
  assert.equal((await read(sealed)).canEdit, false);
  pass(
    "Non-Draft membership is immutable; F21 exposes no finalization command",
  );
  for (const [table, field] of [
    ["ovr_batches", "id"],
    ["ovr_batch_events", "revision"],
    ["ovr_entries", "batch_revision"],
    ["ovr_commands", "result"],
  ]) {
    await assert.rejects(
      runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),
    );
    await assert.rejects(
      runtime.query(`EXPLAIN UPDATE ${table} SET ${field}=${field} WHERE 1=0`),
    );
  }
  const [events] = await admin.query<RowDataPacket[]>(
    "SELECT revision FROM ovr_batch_events WHERE action<>'fixture-finalize'",
  );
  const [audits] = await admin.query<RowDataPacket[]>(
    "SELECT id FROM audit_logs WHERE event_type='ovr.draft'",
  );
  assert.equal(events.length, audits.length);
  pass(
    "All real batch commands have append-only audit events and runtime history is protected from update/delete",
  );
  console.log(`All ${passed} initial F21 OVR scenarios passed.`);
  return { batch, created, body, createKey, base };
}
export async function testChangedOvr(c: Context, batch: OvrBatch) {
  const evidence = {
    reason: "Recheck after authoritative sources changed",
    reference: "OVR-CHANGED-021",
  };
  const r = await c.request("staff", `/api/v1/ovr-batches/${batch.id}`);
  assert.equal(r.statusCode, 200, r.body);
  const detail = r.json<OvrDetail>();
  assert.equal(detail.validation.valid, false);
  for (const code of ["OVR_ENTRY_STALE", "INCOMPLETE_REQUIREMENTS"])
    assert.ok(detail.validation.issues.some((i) => i.code === code));
  const recorded = await c.request(
    "coordinator",
    `/api/v1/ovr-batches/${batch.id}/validate`,
    { expectedRevision: detail.batch.revision, ...evidence },
  );
  assert.equal(recorded.statusCode, 200, recorded.body);
  assert.equal(recorded.json<OvrBatch>().validation!.valid, false);
  const removed = await c.request(
    "staff",
    `/api/v1/ovr-batches/${batch.id}/entries/remove`,
    {
      expectedRevision: recorded.json<OvrBatch>().revision,
      scholarshipId: c.annualId,
      ...evidence,
    },
  );
  assert.equal(removed.statusCode, 200, removed.body);
  const add = await c.request(
    "staff",
    `/api/v1/ovr-batches/${batch.id}/entries/add`,
    {
      expectedRevision: removed.json<OvrBatch>().revision,
      scholarshipId: c.annualId,
      ...evidence,
    },
  );
  assert.equal(add.statusCode, 409);
  assert.equal(add.json().error.code, "OVR_ENTRY_INELIGIBLE");
  console.log(
    "PASS F21 Source changes invalidate existing entries, validation records structured issues, and fresh re-add refuses incomplete documents",
  );
  // A current positive override cannot waive the plan's mandatory OVR document guard.
  const source = await c.view();
  const saved = await c.request("staff", c.path + "/calculate", {
    expectedRevision: source.latest!.revision,
    expectedSourceHash: source.current.sourceHash,
    ...evidence,
  });
  assert.equal(saved.statusCode, 200, saved.body);
  const baseline = await c.view();
  let response = await c.request("staff", c.path + "/overrides", {
    expectedRevision: 0,
    calculationId: baseline.latest!.id,
    expectedSourceHash: baseline.current.sourceHash,
    requestedEligible: true,
    reasonCode: "DOCUMENT_EXCEPTION",
    justification:
      "Synthetic positive exception with incomplete mandatory documents",
    authorityReference: "AUTH-OVR-021",
    ...evidence,
  });
  assert.equal(response.statusCode, 200, response.body);
  let exception = response.json<EligibilityOverride>();
  response = await c.request(
    "staff",
    `${c.path}/overrides/${exception.id}/submit-review`,
    { expectedRevision: exception.revision, ...evidence },
  );
  assert.equal(response.statusCode, 200, response.body);
  exception = response.json<EligibilityOverride>();
  response = await c.request(
    "coordinator",
    `${c.path}/overrides/${exception.id}/approve`,
    { expectedRevision: exception.revision, ...evidence },
  );
  assert.equal(response.statusCode, 200, response.body);
  assert.equal((await c.view()).effective.eligible, true);
  const blocked = await c.request(
    "staff",
    `/api/v1/ovr-batches/${batch.id}/entries/add`,
    {
      expectedRevision: removed.json<OvrBatch>().revision,
      scholarshipId: c.annualId,
      ...evidence,
    },
  );
  assert.equal(blocked.statusCode, 409);
  assert.equal(blocked.json().error.code, "OVR_ENTRY_INELIGIBLE");
  assert.match(blocked.json().error.message, /INCOMPLETE_REQUIREMENTS/);
  console.log(
    "PASS F21 A current approved positive exception cannot bypass mandatory payout documents",
  );
  return removed.json<OvrBatch>();
}
