import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { testReports } from "./test-report-scenarios.js";
import type { Dashboard } from "../server/dashboard/service.js";
import type { OperationalReport } from "../server/reports/model.js";
export async function testDashboard(c: Parameters<typeof testReports>[0]) {
  const path = `/api/v1/dashboard?cycleId=${c.cycleId}`;
  for (const role of ["system_admin", "unassigned"])
    assert.equal((await c.request(role, path)).statusCode, 403);
  for (const path of [
    "/api/v1/dashboard",
    `/api/v1/dashboard?cycleId=${c.cycleId}&total=769`,
  ])
    assert.equal((await c.request("staff", path)).statusCode, 422);
  assert.equal(
    (await c.request("staff", `/api/v1/dashboard?cycleId=${randomUUID()}`))
      .statusCode,
    404,
  );
  const response = await c.request("staff", path);
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.headers["cache-control"], "no-store");
  const dashboard = response.json<Dashboard>();
  assert.equal(dashboard.cards.length, 7);
  assert.equal(dashboard.context.cycleId, c.cycleId);
  assert.equal(
    dashboard.context.academicYearId,
    (await c.view()).current.sources.cycle.academicYearId,
  );
  assert.ok(dashboard.context.yearCode);
  assert.ok(dashboard.context.semesterCode);
  for (const card of dashboard.cards) {
    const response = await c.request(
      "staff",
      `/api/v1/reports/operational?cycleId=${c.cycleId}&kind=${card.kind}`,
    );
    assert.equal(response.statusCode, 200, response.body);
    const report = response.json<OperationalReport>();
    assert.equal(card.total, report.total);
    assert.deepEqual(card.counts, report.counts);
    assert.equal(card.sourceHash, report.sourceHash);
    assert.equal(
      Object.hasOwn(card, "items"),
      false,
      "Aggregate endpoint must not expose scholar rows",
    );
  }
  const coord = await c.request("coordinator", path);
  assert.equal(coord.statusCode, 200, coord.body);
  assert.deepEqual(coord.json<Dashboard>().cards, dashboard.cards);
  return dashboard;
}
