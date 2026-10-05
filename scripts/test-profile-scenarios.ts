import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { testFinalization } from "./test-ovr-finalization-scenarios.js";
import type { ScholarProfile } from "../server/scholars/profile-model.js";
import type { OvrDetail } from "../server/ovr/model.js";
export async function testProfile(
  c: Parameters<typeof testFinalization>[0],
  batchId: string,
) {
  const [annual] = await c.admin.execute<RowDataPacket[]>(
      "SELECT * FROM scholarship_records WHERE id=?",
      [c.annualId],
    ),
    id = annual[0].scholar_id;
  const path = `/api/v1/scholars/${id}/profile`;
  // Use the production four-connection pool: a fifth checkout must queue, not fail.
  const held = await Promise.all(
    Array.from({ length: 4 }, () => c.runtime.getConnection()),
  );
  try {
    const queued = c.runtime.getConnection();
    const outcome = queued.then(
      (connection) => ({ connection, error: null }),
      (error) => ({ connection: null, error }),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
    held.pop()!.release();
    const result = await outcome;
    assert.equal(
      result.error,
      null,
      "Profile requests must queue when the database pool is busy",
    );
    result.connection!.release();
  } finally {
    held.forEach((connection) => connection.release());
  }

  const get = async (role: string, query = "") => {
    const r = await c.request(role, path + query);
    assert.equal(r.statusCode, 200, r.body);
    return r.json<ScholarProfile>();
  };
  const [before] = await c.admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs",
  );
  for (const role of ["system_admin", "unassigned"]) {
    const denied = await c.request(role, path);
    assert.equal(denied.statusCode, 403, denied.body);
    assert.equal(denied.body.includes("Ada"), false);
    assert.equal(denied.body.includes("birthDate"), false);
  }
  assert.equal(
    (await c.request("staff", `/api/v1/scholars/${randomUUID()}/profile`))
      .statusCode,
    404,
  );
  assert.equal((await c.request("staff", path + "?limit=101")).statusCode, 422);
  assert.equal(
    (await c.request("staff", path + "?category=secret")).statusCode,
    422,
  );
  const staff = await get("staff"),
    coord = await get("coordinator"),
    source = (
      await c.request("staff", `/api/v1/ovr-batches/${batchId}`)
    ).json<OvrDetail>();
  assert.equal(staff.person.id, id);
  assert.equal(staff.auditScope, "own");
  assert.equal(coord.auditScope, "all");
  assert.equal(
    staff.items
      .find((i) => i.id === c.annualId)
      ?.detail.includes(annual[0].operational_status),
    true,
  );
  const ownPayment = source.payments.find(
    (p) => p.scholarshipId === c.annualId,
  )!;
  assert.equal(staff.totals.paidTotal, ownPayment.amount);
  assert.equal(staff.totals.payments, 1);
  assert.equal(JSON.stringify(coord).includes("Bea Atomic"), false);
  assert.equal(
    staff.items.some((i) => i.category === "academic" && i.current),
    true,
  );
  assert.equal(
    staff.items.some((i) => i.category === "masterlist"),
    true,
  );
  const [requirements] = await c.admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholarship_records r ON r.id=c.scholarship_record_id WHERE r.scholar_id=?",
    [id],
  );
  assert.equal(staff.totals.requirements, requirements[0].n);
  const audit = await get("staff", "?category=audit&limit=100");
  assert.equal(
    audit.timeline.items.every((e) => e.actor === "Synthetic staff"),
    true,
  );
  assert.equal(JSON.stringify(audit).includes("payload_hash"), false);
  const full = await get("coordinator", "?limit=100"),
    first = await get("coordinator", "?limit=2"),
    second = await get("coordinator", "?limit=2&offset=2");
  assert.deepEqual(
    [...first.timeline.items, ...second.timeline.items],
    full.timeline.items.slice(0, 4),
  );
  const payments = await get("coordinator", "?category=payout&limit=100");
  assert.equal(
    payments.timeline.items.some((e) => e.label === "Original payment"),
    true,
  );
  assert.equal(
    payments.timeline.items.every((e) => e.category === "payout"),
    true,
  );
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      c.request(
        "staff",
        index % 2 ? path : `/api/v1/scholars/${id}/academic-records`,
      ),
    ),
  );
  assert.equal(
    concurrent.every((response) => response.statusCode === 200),
    true,
    "Concurrent profile sections must load without pool errors",
  );
  const [after] = await c.admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs",
  );
  assert.equal(after[0].n, before[0].n);
  await assert.rejects(
    c.runtime.query("SELECT details FROM audit_logs LIMIT 1"),
  );
  await assert.rejects(
    c.runtime.query("SELECT details FROM scholar_profile_audit LIMIT 1"),
  );
  await assert.rejects(
    c.runtime.query("EXPLAIN DELETE FROM scholar_profile_audit WHERE 1=0"),
  );
  console.log(
    "PASS F26 Profile status, requirement counts and effective payment totals match source records; original history stays visible",
  );
  console.log(
    "PASS F26 Scholar PII denied to non-operational accounts; own-audit scope and cross-scholar isolation enforced",
  );
  console.log(
    "PASS F26 Timeline category/pagination are stable and profile reads do not mutate source or audit records",
  );
}
