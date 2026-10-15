import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { officialMembership } from "../server/eligibility/official-membership.js";
type Result = {
  id: string;
  version: number;
  masterlistId: string;
  amendmentId: string;
};
export async function testConsolidation({
  admin,
  runtime,
  request,
  year,
  school,
  course,
  target,
}: {
  admin: Connection;
  runtime: Pool;
  request: (
    role: string,
    path: string,
    body?: object,
    key?: string,
  ) => Promise<LightMyRequestResponse>;
  year: string;
  school: string;
  course: string;
  target: string;
}) {
  const evidence = {
    reason: "Synthetic consolidation review",
    reference: "CONSOLIDATION-TEST",
  };
  const ok = async (p: Promise<LightMyRequestResponse>) => {
    const r = await p;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<Result>();
  };
  const reject = async (p: Promise<LightMyRequestResponse>, code: string) => {
    const r = await p;
    assert.ok(r.statusCode >= 400, r.body);
    assert.equal(r.json().error.code, code);
  };
  const create = (body: object, key = randomUUID(), role = "staff") =>
    request(
      role,
      "/api/v1/masterlists",
      { academicYearId: year, ...evidence, ...body },
      key,
    );
  const move = (
    id: string,
    action: string,
    version: number,
    key = randomUUID(),
  ) =>
    request(
      ["submit-verification", "submit-approval"].includes(action)
        ? "staff"
        : "coordinator",
      `/api/v1/masterlists/${id}/${action}`,
      {
        expectedVersion: version,
        ...evidence,
        ...(action === "publish" ? { effectiveOn: "2026-09-15" } : {}),
      },
      key,
    );
  const scholar = async (firstName: string) => {
    const p = await ok(
      request("staff", "/api/v1/scholars", {
        expectedVersion: 0,
        reason: evidence.reason,
        fields: {
          firstName,
          lastName: "ConsolidationFixture",
          academicYearId: year,
          contact: {},
        },
      }),
    );
    await ok(
      request("staff", `/api/v1/scholars/${p.id}/academic-records`, {
        academicYearId: year,
        schoolId: school,
        courseId: course,
        yearLevel: "First year",
        ...evidence,
      }),
    );
    const annual = await ok(
      request("staff", `/api/v1/scholars/${p.id}/scholarships`, {
        expectedVersion: 0,
        academicYearId: year,
        effectiveOn: "2026-09-01",
        ...evidence,
      }),
    );
    for (const [i, action] of ["exam-passed", "qualify", "select"].entries())
      await ok(
        request(
          i === 0 ? "staff" : "coordinator",
          `/api/v1/scholarships/${annual.id}/qualification/${action}`,
          { expectedVersion: i + 1, effectiveOn: "2026-09-01", ...evidence },
        ),
      );
    return { id: p.id, annual: annual.id };
  };
  const targetBody = { targetId: target, targetVersion: 2 };
  const autoKey = randomUUID(),
    autoBody = { title: "Atomic attached draft", ...targetBody };
  const automatic = await ok(create(autoBody, autoKey));
  assert.deepEqual(await ok(create(autoBody, autoKey)), automatic);
  const [events] = await admin.execute<RowDataPacket[]>(
    "SELECT target_id FROM masterlist_addition_events WHERE draft_id=?",
    [automatic.id],
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].target_id, target);
  const count = async () =>
    Number(
      (
        await admin.query<RowDataPacket[]>(
          "SELECT COUNT(*) AS n FROM masterlist_versions",
        )
      )[0][0].n,
    );
  const beforeCount = await count();
  await reject(
    create({ ...autoBody, targetVersion: 999 }),
    "INVALID_ADDITION_TARGET",
  );
  assert.equal(await count(), beforeCount);
  await admin.query(
    "CREATE TRIGGER fail_create_consolidation BEFORE INSERT ON audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic failure'",
  );
  assert.equal(
    (await create({ ...autoBody, title: "Must roll back" })).statusCode,
    500,
  );
  await admin.query("DROP TRIGGER fail_create_consolidation");
  assert.equal(await count(), beforeCount);
  const fourth = await scholar("Fourth");
  const source = await ok(create({ title: "Independent source publication" }));
  await ok(
    request("staff", `/api/v1/masterlists/${source.id}/entries`, {
      action: "add",
      expectedVersion: 1,
      scholarId: fourth.id,
      awardNumber: "OFFICIAL-003-CORRECTED",
      ...evidence,
    }),
  );
  for (const [i, a] of [
    "submit-verification",
    "submit-approval",
    "approve",
    "publish",
    "lock",
  ].entries())
    await ok(move(source.id, a, i + 2));
  const proposalBody = {
    title: "Consolidation proposal",
    ...targetBody,
    sourceId: source.id,
    sourceVersion: 7,
  };
  await reject(
    create(proposalBody, randomUUID(), "system_admin"),
    "PERMISSION_DENIED",
  );
  await reject(
    create({ ...proposalBody, sourceId: target, sourceVersion: 2 }),
    "INVALID_CONSOLIDATION_SOURCE",
  );
  const conflict = await ok(create(proposalBody));
  const conflictDetail = await request(
    "staff",
    `/api/v1/masterlists/${conflict.id}`,
  );
  assert.ok(
    conflictDetail
      .json()
      .validation.issues.some(
        (i: { code: string }) => i.code === "AWARD_NUMBER_CONFLICT",
      ),
  );
  await reject(
    move(conflict.id, "submit-verification", 1),
    "CANDIDATE_INVALID",
  );
  await reject(
    request("staff", `/api/v1/masterlists/${conflict.id}/entries`, {
      action: "remove",
      expectedVersion: 1,
      scholarId: fourth.id,
      awardNumber: null,
      ...evidence,
    }),
    "FROZEN_CONSOLIDATION",
  );
  await reject(
    request("staff", `/api/v1/masterlists/${conflict.id}/addition`, {
      expectedVersion: 1,
      targetId: null,
      ...evidence,
    }),
    "FROZEN_CONSOLIDATION",
  );
  const amend = async (id: string, version: number, number: string) => {
    const a = await ok(
      request("staff", `/api/v1/masterlists/${id}/amendments`, {
        expectedVersion: version,
        scholarId: fourth.id,
        kind: "award_number",
        awardNumber: number,
        effectiveOn: "2026-09-15",
        ...evidence,
      }),
    );
    await ok(
      request(
        "coordinator",
        `/api/v1/masterlist-amendments/${a.amendmentId}/approve`,
        evidence,
      ),
    );
    return (
      await ok(
        request(
          "coordinator",
          `/api/v1/masterlist-amendments/${a.amendmentId}/publish`,
          evidence,
        ),
      )
    ).masterlistId;
  };
  const corrected = await amend(source.id, 7, "FOURTH-004");
  await reject(
    move(conflict.id, "submit-verification", 1),
    "CANDIDATE_INVALID",
  );
  const reviewed = await ok(
    create({ ...proposalBody, sourceId: corrected, sourceVersion: 2 }),
  );
  for (const [i, a] of [
    "submit-verification",
    "submit-approval",
    "approve",
  ].entries())
    await ok(move(reviewed.id, a, i + 1));
  const newest = await amend(corrected, 2, "FOURTH-004-REVIEWED");
  await reject(move(reviewed.id, "publish", 4), "CANDIDATE_INVALID");
  const proposals = [];
  const key = randomUUID(),
    body = { ...proposalBody, sourceId: newest, sourceVersion: 2 };
  const first = await ok(create(body, key));
  assert.deepEqual(await ok(create(body, key)), first);
  proposals.push(
    first,
    await ok(create({ ...body, title: "Competing consolidation" })),
  );
  for (const proposal of proposals)
    for (const [i, a] of [
      "submit-verification",
      "submit-approval",
      "approve",
    ].entries())
      await ok(move(proposal.id, a, i + 1));
  await reject(
    request("staff", `/api/v1/masterlists/${first.id}/publish`, {
      expectedVersion: 4,
      effectiveOn: "2026-09-15",
      ...evidence,
    }),
    "PERMISSION_DENIED",
  );
  await reject(
    request("coordinator", `/api/v1/masterlists/${first.id}/publish`, {
      expectedVersion: 4,
      effectiveOn: "2026-09-01",
      ...evidence,
    }),
    "INVALID_EFFECTIVE_DATE",
  );
  const originals = JSON.stringify(
    (
      await admin.query(
        "SELECT masterlist_id,snapshot,snapshot_hash FROM masterlist_publications ORDER BY masterlist_id",
      )
    )[0],
  );
  const activations = JSON.stringify(
    (
      await admin.query(
        "SELECT * FROM masterlist_activations ORDER BY scholarship_id",
      )
    )[0],
  );
  const statuses = JSON.stringify(
    (
      await admin.query(
        "SELECT id,operational_status,status_version,status_effective_on FROM scholarship_records ORDER BY id",
      )
    )[0],
  );
  await admin.query(
    "CREATE TRIGGER fail_publish_consolidation BEFORE INSERT ON audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic failure'",
  );
  assert.equal((await move(first.id, "publish", 4)).statusCode, 500);
  await admin.query("DROP TRIGGER fail_publish_consolidation");
  assert.equal(
    JSON.stringify(
      (
        await admin.query(
          "SELECT masterlist_id,snapshot,snapshot_hash FROM masterlist_publications ORDER BY masterlist_id",
        )
      )[0],
    ),
    originals,
  );
  assert.equal(
    (
      await admin.query<RowDataPacket[]>(
        "SELECT * FROM masterlist_consolidation_links",
      )
    )[0].length,
    0,
  );
  const publishKeys = proposals.map(() => randomUUID());
  const responses = await Promise.all(
    proposals.map((p, i) => move(p.id, "publish", 4, publishKeys[i])),
  );
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 422]);
  const win = responses.findIndex((r) => r.statusCode === 200),
    combined = proposals[win];
  assert.deepEqual(
    await ok(move(combined.id, "publish", 4, publishKeys[win])),
    responses[win].json(),
  );
  assert.equal(
    JSON.stringify(
      (
        await admin.query(
          "SELECT * FROM masterlist_activations ORDER BY scholarship_id",
        )
      )[0],
    ),
    activations,
  );
  assert.equal(
    JSON.stringify(
      (
        await admin.query(
          "SELECT id,operational_status,status_version,status_effective_on FROM scholarship_records ORDER BY id",
        )
      )[0],
    ),
    statuses,
  );
  assert.equal(
    JSON.stringify(
      (
        await admin.execute(
          "SELECT masterlist_id,snapshot,snapshot_hash FROM masterlist_publications WHERE masterlist_id<>? ORDER BY masterlist_id",
          [combined.id],
        )
      )[0],
    ),
    originals,
  );
  const published = await request(
    "staff",
    `/api/v1/masterlists/${combined.id}/publication`,
  );
  assert.equal(published.json().snapshot.entries.length, 4);
  const check = async (latest: string) => {
    const conn = await runtime.getConnection();
    try {
      const [rows] = await admin.query<RowDataPacket[]>(
        "SELECT scholarship_id,DATE_FORMAT(effective_on,'%Y-%m-%d') AS day FROM masterlist_activations",
      );
      for (const r of rows) {
        const m = await officialMembership(
          conn,
          { academicYearId: year },
          r.scholarship_id,
        );
        assert.equal(m.official.masterlistId, latest);
        assert.equal(m.official.effectiveOn, r.day);
        assert.equal(m.official.valid, true);
      }
    } finally {
      conn.release();
    }
  };
  await check(combined.id);
  await reject(
    create({ ...body, title: "Already consumed" }),
    "INVALID_ADDITION_TARGET",
  );
  await ok(move(combined.id, "lock", 5));
  const fifth = await scholar("Fifth");
  const next = await ok(
    create({
      title: "Addition after consolidation",
      targetId: combined.id,
      targetVersion: 6,
    }),
  );
  await ok(
    request("staff", `/api/v1/masterlists/${next.id}/entries`, {
      action: "add",
      expectedVersion: 1,
      scholarId: fifth.id,
      awardNumber: "FIFTH-005",
      ...evidence,
    }),
  );
  for (const [i, a] of [
    "submit-verification",
    "submit-approval",
    "approve",
    "publish",
    "lock",
  ].entries())
    await ok(move(next.id, a, i + 2));
  await check(next.id);
  const amended = await amend(next.id, 7, "FOURTH-AFTER-CONSOLIDATION");
  await check(amended);
  const currentResponse = await request("staff", "/api/v1/masterlists?scope=current&limit=100");
  assert.equal(currentResponse.statusCode, 200);
  const currentLists = currentResponse.json();
  assert.ok(currentLists.items.some((r: {id:string}) => r.id === amended));
  assert.ok(!currentLists.items.some((r: {id:string}) => r.id === combined.id));
  const historyResponse = await request("staff", "/api/v1/masterlists?scope=history&limit=100");
  assert.equal(historyResponse.statusCode, 200);
  assert.ok(historyResponse.json().items.some((r: {id:string}) => r.id === combined.id));
  assert.ok(!historyResponse.json().items.some((r: {id:string}) => r.id === amended));
  const firstPage = (await request("staff", "/api/v1/masterlists?scope=current&limit=1")).json();
  assert.equal(firstPage.total, currentLists.total);
  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.items[0].id, currentLists.items[0].id);
  console.log("PASS current/history filtering preserves latest revisions and paginated totals");

  console.log(
    "PASS consolidation: atomic attachment, permissions, immutable sources, award conflicts, stale approvals, date floors, audit rollback, competing publication, retries, activation/status preservation, both history roots, later addition and amendment",
  );
}
