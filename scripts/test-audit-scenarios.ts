import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { testReports } from "./test-report-scenarios.js";
import type { AuditList, AuditDetail } from "../server/audit/service.js";
import { today } from "../server/scholars/validation.js";
export async function testAudit(c: Parameters<typeof testReports>[0]) {
  const [users] = await c.admin.query<RowDataPacket[]>(
    "SELECT id,email,version FROM users WHERE email IN ('staff@example.invalid','coordinator@example.invalid')",
  );
  const staff = users.find((r) => r.email === "staff@example.invalid")!,
    coordinator = users.find((r) => r.email === "coordinator@example.invalid")!;
  const ids = [randomUUID(), randomUUID()];
  const day = today(),
    base = `/api/v1/audit-events?from=${day}&to=${day}`;
  for (const [i, user] of [staff, coordinator].entries())
    await c.admin.execute(
      "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,actor_roles,occurred_at,request_id,reason,details) VALUES(?,'test.audit','test',?,'change',?,'user',?,DATE_SUB(?,INTERVAL 8 HOUR),?,'Synthetic evidence',?)",
      [
        ids[i],
        randomUUID(),
        user.id,
        JSON.stringify(["forged"]),
        day + " 12:00:00",
        ids[i],
        JSON.stringify({
          before: { state: "draft" },
          after: { state: "approved" },
          nested: { password: "NEVER-EXPOSE", resetToken: "NEVER-EXPOSE" },
          reference: "TEST-031",
        }),
      ],
    );
  const list = async (role: string, extra = "") => {
    const r = await c.request(role, base + extra);
    assert.equal(r.statusCode, 200, r.body);
    assert.equal(r.headers["cache-control"], "no-store");
    return r.json<AuditList>();
  };
  const own = await list("staff", "&eventType=test.audit");
  assert.equal(own.scope, "own");
  assert.equal(own.total, 1);
  assert.equal(own.items[0].id, ids[0]);
  assert.deepEqual(own.items[0].actorRoles, ["staff"]);
  assert.equal(
    (await list("staff", `&actorId=${coordinator.id}&eventType=test.audit`))
      .total,
    0,
  );
  assert.equal(
    (await c.request("staff", `/api/v1/audit-events/${ids[1]}`)).statusCode,
    404,
  );
  for (const role of ["coordinator", "system_admin"]) {
    const all = await list(role, "&eventType=test.audit");
    assert.equal(all.scope, "all");
    assert.equal(all.total, 2);
    const first = await list(role, "&eventType=test.audit&limit=1"),
      second = await list(role, "&eventType=test.audit&limit=1&offset=1");
    assert.notEqual(first.items[0].id, second.items[0].id);
    assert.equal(second.total, 2);
    const detail = await c.request(role, `/api/v1/audit-events/${ids[0]}`);
    assert.equal(detail.statusCode, 200, detail.body);
    assert.equal(detail.body.includes("NEVER-EXPOSE"), false);
    assert.equal(detail.json<AuditDetail>().reason, "Synthetic evidence");
    assert.deepEqual(
      (detail.json<AuditDetail>().details as { before: unknown }).before,
      { state: "draft" },
    );
  }
  assert.equal((await list("coordinator", `&requestId=${ids[0]}`)).total, 1);
  assert.equal((await c.request("unassigned", base)).statusCode, 403);
  assert.equal(
    (await c.request("unassigned", `/api/v1/audit-events/${ids[0]}`))
      .statusCode,
    403,
  );
  for (const extra of ["&scope=all", "&limit=101", "&actorId=invalid"])
    assert.equal((await c.request("staff", base + extra)).statusCode, 422);
  assert.equal(
    (
      await c.request("staff", `/api/v1/audit-events/${ids[0]}`, {
        action: "delete",
      })
    ).statusCode,
    404,
  );
  const runtime = await c.runtime.getConnection();
  try {
    for (const table of ["audit_logs", "audit_event_view"])
      for (const verb of ["UPDATE", "DELETE"])
        await assert.rejects(
          runtime.query(
            verb === "UPDATE"
              ? `UPDATE ${table} SET action=action WHERE 1=0`
              : `DELETE FROM ${table} WHERE 1=0`,
          ),
        );
    await assert.rejects(
      runtime.query("SELECT details FROM audit_logs LIMIT 0"),
    );
    const rolled = randomUUID();
    await runtime.beginTransaction();
    await runtime.execute("UPDATE users SET version=version+1 WHERE id=?", [
      staff.id,
    ]);
    await runtime.execute(
      "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,details) VALUES(?,'test.rollback','user',?,'change',?,'user',UTC_TIMESTAMP(6),?,'{}')",
      [rolled, staff.id, staff.id, rolled],
    );
    await runtime.rollback();
    const [event] = await c.admin.execute<RowDataPacket[]>(
      "SELECT id FROM audit_logs WHERE id=?",
      [rolled],
    );
    assert.equal(event.length, 0);
    const [unchanged] = await c.admin.execute<RowDataPacket[]>(
      "SELECT version FROM users WHERE id=?",
      [staff.id],
    );
    assert.equal(unchanged[0].version, staff.version);
  } finally {
    await runtime.rollback();
    runtime.release();
  }
  // Existing business scenarios also inject audit failures and verify full rollback.
  return true;
}
