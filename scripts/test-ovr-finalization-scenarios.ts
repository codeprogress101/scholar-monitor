import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { EligibilityView } from "../server/eligibility/model.js";
import type { OvrBatch, OvrDetail } from "../server/ovr/model.js";
import type { VerificationContext } from "../server/requirements/workflow-model.js";
import { today } from "../server/scholars/validation.js";
import { digest } from "../server/auth/crypto.js";
export async function testFinalization(c: {
  request: (
    role: string,
    url: string,
    body?: object,
    key?: string,
  ) => Promise<LightMyRequestResponse>;
  admin: Connection;
  runtime: Pool;
  path: string;
  cycleId: string;
  cycleVersion: number;
  annualId: string;
}) {
  const { request, admin, runtime } = c,
    day = today(),
    evidence = {
      reason: "Synthetic atomic OVR review",
      reference: "FINALIZE-022",
    };
  let passed = 0;
  const pass = (s: string) => {
    passed++;
    console.log("PASS F22 " + s);
  };
  const ok = async <T>(r: Promise<LightMyRequestResponse>) => {
    const v = await r;
    assert.equal(v.statusCode, 200, v.body);
    return v.json<T>();
  };
  const deny = (r: LightMyRequestResponse, status: number, code: string) => {
    assert.equal(r.statusCode, status, r.body);
    assert.equal(r.json().error.code, code);
  };
  const path = (id: string) =>
    `/api/v1/payout-cycles/${c.cycleId}/scholarships/${id}/eligibility`;
  const view = (id: string) => ok<EligibilityView>(request("staff", path(id)));
  async function ready(id: string) {
    let v = await view(id),
      cor = v.current.sources.requirements.find((r) => r.code === "COR")!;
    const doc = (action: string) =>
      `/api/v1/requirement-instances/${cor.instanceId}/${action}`;
    if (cor.status === "not_submitted")
      await ok(
        request("staff", doc("receive"), {
          expectedVersion: 0,
          receivedOn: day,
          physicalReference: null,
          storageLocation: "Atomic cabinet",
          remarks: null,
          reason: evidence.reason,
        }),
      );
    if (cor.status === "for_correction")
      await ok(
        request("staff", doc("resubmit"), {
          action: "resubmit",
          expectedVersion: cor.version,
          effectiveOn: day,
          remarks: null,
          physicalReference: null,
          storageLocation: "Atomic cabinet",
          ...evidence,
        }),
      );
    v = await view(id);
    cor = v.current.sources.requirements.find((r) => r.code === "COR")!;
    if (cor.status === "submitted" || cor.status === "resubmitted")
      await ok(
        request("staff", doc("send-for-verification"), {
          action: "send-for-verification",
          expectedVersion: cor.version,
          effectiveOn: day,
          remarks: null,
          ...evidence,
        }),
      );
    const context = await ok<VerificationContext>(
      request("staff", doc("verification-context")),
    );
    v = await view(id);
    cor = v.current.sources.requirements.find((r) => r.code === "COR")!;
    if (cor.status === "for_verification")
      await ok(
        request("staff", doc("verify"), {
          action: "verify",
          expectedVersion: cor.version,
          effectiveOn: day,
          remarks: null,
          ...evidence,
          document: {
            scholarId: context.scholarId,
            scholarVersion: context.scholarVersion,
            academicYearId: context.academicYearId,
            semesterId: context.semesterId,
            schoolId: context.schoolId,
            courseId: context.courseId,
            academicVersion: context.academicVersion,
            definitionVersionId: context.definitionVersionId,
          },
          checks: {
            identity: true,
            period: true,
            placement: true,
            applicability: true,
            validity: true,
          },
        }),
      );
    return context;
  }
  async function reopen(id: string) {
    const v = await view(id),
      r = v.current.sources.requirements.find((r) => r.code === "COR")!;
    await ok(
      request(
        "staff",
        `/api/v1/requirement-instances/${r.instanceId}/return-for-correction`,
        {
          action: "return-for-correction",
          expectedVersion: r.version,
          effectiveOn: day,
          remarks: null,
          correctionOf: r.latestEventId,
          ...evidence,
        },
      ),
    );
  }
  const context = await ready(c.annualId),
    yearId = context.academicYearId;
  // A second complete scholar uses the real qualification, official-list and document APIs.
  const person = await ok<{ id: string }>(
    request("staff", "/api/v1/scholars", {
      expectedVersion: 0,
      reason: evidence.reason,
      fields: {
        firstName: "Bea",
        lastName: "Atomic Finalization",
        academicYearId: yearId,
        contact: {},
      },
    }),
  );
  const annual = await ok<{ id: string }>(
    request("staff", `/api/v1/scholars/${person.id}/scholarships`, {
      academicYearId: yearId,
      expectedVersion: 0,
      effectiveOn: day,
      ...evidence,
    }),
  );
  await ok(
    request("staff", `/api/v1/scholars/${person.id}/academic-records`, {
      academicYearId: yearId,
      schoolId: context.schoolId,
      courseId: context.courseId,
      yearLevel: "First year",
      ...evidence,
    }),
  );
  for (const [i, action] of ["exam-passed", "qualify", "select"].entries())
    await ok(
      request(
        i ? "coordinator" : "staff",
        `/api/v1/scholarships/${annual.id}/qualification/${action}`,
        { expectedVersion: i + 1, effectiveOn: day, ...evidence },
      ),
    );
  const official = await ok<{ id: string }>(
    request("staff", "/api/v1/masterlists", {
      academicYearId: yearId,
      title: "Atomic second official list",
      ...evidence,
    }),
  );
  await ok(
    request("staff", `/api/v1/masterlists/${official.id}/entries`, {
      action: "add",
      expectedVersion: 1,
      scholarId: person.id,
      awardNumber: "ATOMIC-002",
      ...evidence,
    }),
  );
  for (const [i, action] of [
    "submit-verification",
    "submit-approval",
    "approve",
    "publish",
    "lock",
  ].entries())
    await ok(
      request(
        i < 2 ? "staff" : "coordinator",
        `/api/v1/masterlists/${official.id}/${action}`,
        {
          expectedVersion: i + 2,
          ...evidence,
          ...(action === "publish" ? { effectiveOn: day } : {}),
        },
      ),
    );
  const semesters = await ok<{ items: { id: string; version: number }[] }>(
    request("staff", "/api/v1/configuration/semesters?limit=100"),
  );
  await ok(
    request(
      "staff",
      `/api/v1/scholarships/${annual.id}/requirements/generate`,
      {
        semesterId: context.semesterId,
        expectedSemesterVersion: semesters.items.find(
          (s) => s.id === context.semesterId,
        )!.version,
        payoutCycleId: c.cycleId,
        expectedPayoutVersion: c.cycleVersion,
        ...evidence,
      },
    ),
  );
  await ready(annual.id);
  const cog = (await view(annual.id)).current.sources.requirements.find(
    (r) => r.code === "COG",
  )!;
  await ok(
    request(
      "coordinator",
      `/api/v1/requirement-instances/${cog.instanceId}/waive`,
      {
        expectedVersion: 0,
        effectiveOn: day,
        reason: evidence.reason,
        authorityReference: "ATOMIC-WAIVER",
        remarks: null,
      },
    ),
  );
  const base = `/api/v1/payout-cycles/${c.cycleId}/ovr-batches`;
  const create = {
    expectedRevision: 0,
    expectedCycleVersion: c.cycleVersion,
    code: "ATOMIC-022",
    name: "Two-entry atomic roster",
    ...evidence,
  };
  let batch = await ok<OvrBatch>(request("staff", base, create));
  const cmd = (
    action: string,
    role = "staff",
    extra: object = {},
    key = randomUUID(),
  ) =>
    request(
      role,
      `/api/v1/ovr-batches/${batch.id}/${["add", "remove"].includes(action) ? "entries/" : ""}${action}`,
      { expectedRevision: batch.revision, ...evidence, ...extra },
      key,
    );
  const read = () =>
    ok<OvrDetail>(request("staff", `/api/v1/ovr-batches/${batch.id}`));
  const empty = await cmd("submit-review");
  deny(empty, 409, "OVR_VALIDATION_FAILED");
  assert.equal(
    empty.json().error.details.validation.issues[0].code,
    "EMPTY_BATCH",
  );
  for (const id of [c.annualId, annual.id])
    batch = await ok<OvrBatch>(cmd("add", "staff", { scholarshipId: id }));
  for (const role of ["staff", "system_admin", "unassigned"])
    deny(await cmd("finalize", role), 403, "PERMISSION_DENIED");
  deny(await cmd("finalize", "coordinator"), 409, "OVR_INVALID_STATE");
  deny(
    await cmd("submit-review", "staff", { finalized: true }),
    422,
    "VALIDATION_FAILED",
  );
  batch = await ok<OvrBatch>(cmd("submit-review"));
  deny(
    await cmd("remove", "staff", { scholarshipId: c.annualId }),
    409,
    "OVR_NOT_DRAFT",
  );
  deny(await cmd("return-to-draft", "staff"), 403, "PERMISSION_DENIED");
  pass(
    "Only a Coordinator can finalize/return; submission rejects empty or forged rosters and locks review membership",
  );
  await reopen(annual.id);
  const failed = await cmd("finalize", "coordinator");
  deny(failed, 409, "OVR_VALIDATION_FAILED");
  const validation = failed.json().error.details.validation;
  assert.equal(validation.entries.length, 2);
  assert.equal(
    validation.entries.find(
      (e: { scholarshipId: string }) => e.scholarshipId === c.annualId,
    ).issues.length,
    0,
  );
  assert.ok(
    validation.issues.some(
      (i: { scholarshipId: string; code: string }) =>
        i.scholarshipId === annual.id && i.code === "INCOMPLETE_REQUIREMENTS",
    ),
  );
  let [frozen] = await admin.execute<RowDataPacket[]>(
    "SELECT batch_id FROM ovr_finalizations WHERE batch_id=?",
    [batch.id],
  );
  assert.equal(frozen.length, 0);
  assert.equal((await read()).batch.revision, batch.revision);
  assert.equal((await read()).batch.state, "review");
  pass(
    "One failed entry rejects the entire two-entry roster with structured errors and no partial finalization",
  );
  batch = await ok<OvrBatch>(cmd("return-to-draft", "coordinator"));
  await ready(annual.id);
  // Still eligible is insufficient when the admitted evidence has changed.
  deny(await cmd("submit-review"), 409, "OVR_VALIDATION_FAILED");
  batch = await ok<OvrBatch>(
    cmd("remove", "staff", { scholarshipId: annual.id }),
  );
  batch = await ok<OvrBatch>(cmd("add", "staff", { scholarshipId: annual.id }));
  batch = await ok<OvrBatch>(cmd("submit-review"));
  pass(
    "Coordinator return permits corrections; re-admission captures fresh sources before resubmission",
  );
  // Pending exceptions created after submission must be caught at finalization.
  let v = await view(c.annualId);
  await ok(
    request("staff", path(c.annualId) + "/calculate", {
      expectedRevision: v.latest!.revision,
      expectedSourceHash: v.current.sourceHash,
      ...evidence,
    }),
  );
  v = await view(c.annualId);
  const exception = await ok<{ id: string; revision: number }>(
    request("staff", path(c.annualId) + "/overrides", {
      expectedRevision: 0,
      calculationId: v.latest!.id,
      expectedSourceHash: v.current.sourceHash,
      requestedEligible: true,
      reasonCode: "ATOMIC_REVIEW",
      justification: "Synthetic pending review after OVR submission",
      authorityReference: "AUTH-022",
      ...evidence,
    }),
  );
  const pending = await cmd("finalize", "coordinator");
  deny(pending, 409, "OVR_VALIDATION_FAILED");
  assert.ok(
    pending
      .json()
      .error.details.validation.issues.some(
        (i: { code: string }) => i.code === "UNRESOLVED_OVERRIDE",
      ),
  );
  await ok(
    request("staff", `${path(c.annualId)}/overrides/${exception.id}/cancel`, {
      expectedRevision: exception.revision,
      ...evidence,
    }),
  );
  pass("Finalization rechecks unresolved overrides created after submission");
  await admin.query(
    "CREATE TRIGGER fail_finalization_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.draft' AND NEW.action='finalize' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  const failedKey = randomUUID();
  try {
    assert.equal(
      (await cmd("finalize", "coordinator", {}, failedKey)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_finalization_audit");
  }
  [frozen] = await admin.execute<RowDataPacket[]>(
    "SELECT batch_id FROM ovr_finalizations WHERE batch_id=?",
    [batch.id],
  );
  assert.equal(frozen.length, 0);
  assert.equal((await read()).batch.revision, batch.revision);
  pass(
    "Audit failure after snapshot insertion rolls back the snapshot, state event and retry receipt",
  );
  if (
    process.argv.includes("--browser") &&
    !process.argv.includes("--processing") &&
    !process.argv.includes("--amendments") &&
    !process.argv.includes("--payments")
  ) {
    console.log(`F22 browser review fixture ready after ${passed} scenarios.`);
    return { batch, ready, reopen };
  }
  const keys = [failedKey, randomUUID()],
    before = batch;
  const race = await Promise.all(
    keys.map((k) => cmd("finalize", "coordinator", {}, k)),
  );
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  const winner = race.findIndex((r) => r.statusCode === 200);
  batch = race[winner].json<OvrBatch>();
  const final = await read();
  assert.equal(final.finalization!.snapshot.entries.length, 2);
  assert.equal(final.canEdit, false);
  assert.equal(
    digest(JSON.stringify(final.finalization!.snapshot)),
    final.finalization!.hash,
  );
  assert.equal(batch.finalizationHash, final.finalization!.hash);
  const retryBody = { expectedRevision: before.revision, ...evidence };
  const [auditBeforeRetry] = await admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs WHERE entity_id=?",
    [batch.id],
  );
  const simultaneousRetries = await Promise.all(
    Array.from({ length: 3 }, () =>
      request(
        "coordinator",
        `/api/v1/ovr-batches/${batch.id}/finalize`,
        retryBody,
        keys[winner],
      ),
    ),
  );
  for (const response of simultaneousRetries) {
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), batch);
  }
  const [auditAfterRetry] = await admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs WHERE entity_id=?",
    [batch.id],
  );
  const [finalizationCount] = await admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM ovr_finalizations WHERE batch_id=?",
    [batch.id],
  );
  assert.equal(auditAfterRetry[0].n, auditBeforeRetry[0].n);
  assert.equal(finalizationCount[0].n, 1);
  assert.deepEqual(
    await ok(
      request(
        "coordinator",
        `/api/v1/ovr-batches/${batch.id}/finalize`,
        retryBody,
        keys[winner],
      ),
    ),
    batch,
  );
  deny(
    await request(
      "coordinator",
      `/api/v1/ovr-batches/${batch.id}/finalize`,
      { ...retryBody, reason: "Changed decision evidence" },
      keys[winner],
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  for (const action of ["return-to-draft", "submit-review", "finalize"])
    deny(await cmd(action, "coordinator"), 409, "OVR_INVALID_STATE");
  deny(
    await cmd("remove", "staff", { scholarshipId: c.annualId }),
    409,
    "OVR_NOT_DRAFT",
  );
  pass(
    "Concurrent finalization has one winner; immutable two-entry snapshot has a verified hash and exact retries",
  );
  await reopen(c.annualId);
  const changed = await read();
  assert.equal(changed.validation.valid, false);
  assert.deepEqual(changed.finalization, final.finalization);
  assert.equal(changed.entries.length, 2);
  await assert.rejects(
    runtime.query(
      "EXPLAIN UPDATE ovr_finalizations SET snapshot=snapshot WHERE 1=0",
    ),
  );
  await assert.rejects(
    runtime.query("EXPLAIN DELETE FROM ovr_finalizations WHERE 1=0"),
  );
  pass(
    "Later source changes cannot rewrite finalized evidence or membership; runtime snapshot grants are append-only",
  );
  let self = await ok<OvrBatch>(
    request("coordinator", base, { ...create, code: "SELF-022" }),
  );
  // Fixture-only review header isolates same-person finalization denial without admitting duplicate members.
  const [users] = await admin.execute<RowDataPacket[]>(
    "SELECT created_by FROM ovr_batches WHERE id=?",
    [self.id],
  );
  self = {
    ...self,
    revision: 2,
    state: "review",
    action: "submit-review",
    submission: {
      actorId: users[0].created_by,
      actorName: "Synthetic coordinator",
      submittedAt: new Date().toISOString(),
      revision: 2,
    },
  };
  await admin.execute(
    "INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
    [
      self.id,
      2,
      "review",
      "submit-review",
      JSON.stringify(self),
      users[0].created_by,
    ],
  );
  deny(
    await request("coordinator", `/api/v1/ovr-batches/${self.id}/finalize`, {
      expectedRevision: 2,
      ...evidence,
    }),
    403,
    "SEPARATE_FINALIZER_REQUIRED",
  );
  pass("A Coordinator cannot finalize their own submission");
  console.log(`All ${passed} F22 finalization scenarios passed.`);
  return { batch, ready, reopen };
}
