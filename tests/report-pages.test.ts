import { describe, it, expect } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import type { AuthorizationService } from "../server/authorization/service";
import { digest } from "../server/auth/crypto";
import { parseReport, ReportService, readOperationalReport } from "../server/reports/service";

const cycleId = "c0dcf5e2-9e45-43d9-9241-3664534e1731";
const annuals = Array.from({ length: 235 }, (_, i) => ({ id: String(i), scholar_id: String(i), human_id: `TEST-${String(i).padStart(4, "0")}`, name: `Synthetic ${i}`, status: "selected", operational_status: i % 2 ? "active" : "inactive" }));
function fixture(count = annuals.length) {
  const data = annuals.slice(0, count);
  const selected: string[] = [];
  const db = {
    query: async () => [[]],
    execute: async (sql: string) => {
      if (sql.includes("FROM payout_cycles c")) return [[{ id: cycleId, version_id: cycleId, version: 1, academic_year_id: cycleId, code: "TEST", state: "open" }]];
      if (sql.includes("FROM workflow_scope_versions") || sql.includes("FROM payout_requirements") || sql.includes("graduation_confirmations")) return [[]];
      if (sql.includes("GROUP BY r.operational_status")) return [[{ status: "inactive", n: Math.ceil(data.length/2) }, { status: "active", n: Math.floor(data.length/2) }].filter(g=>g.n)];
      if (sql.includes("COUNT(*) AS n FROM scholarship_records")) return [[{ n: data.length }]];
      if (sql.includes("JOIN scholars s")) {
        selected.push(sql);
        const limit = Number(sql.match(/LIMIT (\d+)/)?.[1]), offset = Number(sql.match(/OFFSET (\d+)/)?.[1]);
        return [data.slice(offset, offset + limit)];
      }
      throw new Error(`Unexpected report read: ${sql}`);
    },
  } as unknown as PoolConnection;
  const permissions: string[] = [];
  const auth = { readSnapshot: async (_actor: string, permission: string, run: (db: PoolConnection) => unknown) => { permissions.push(permission); return run(db); } } as unknown as AuthorizationService;
  return { db, selected, service: new ReportService(auth), permissions };
}
describe("R05 bounded report pages", () => {
  it("returns an empty authoritative scope without evaluating a scholar", async () => {
    const f = fixture(0), page = await f.service.page("actor", { kind: "scholars", cycleId });
    expect(page.items).toEqual([]); expect(page.total).toBe(0); expect(page.counts).toEqual({});
  });
  it.each([25, 50, 100])("SQL-paginates %i rows, including middle, last and empty pages", async limit => {
    const f = fixture();
    for (const offset of [0, limit, 200, 235]) {
      const page = await f.service.page("actor", { kind: "scholars", cycleId, limit, offset });
      expect(page.items.map(r => r.id)).toEqual(annuals.slice(offset, offset + limit).map(r => r.id));
      expect(page.total).toBe(235);
      expect(page.countsScope).toBe("page");
      expect(page.sourceHashBasis).toBe("report-page-v1");
      expect(Object.values(page.counts).reduce((a,b) => a+b,0)).toBe(page.items.length);
      expect(f.selected.at(-1)).toContain(`LIMIT ${limit} OFFSET ${offset}`);
      expect(page.sourceHash).toBe(digest(JSON.stringify({ kind: "scholars", cycle: page.cycle, columns: page.columns, rows: page.items })));
    }
    expect(f.permissions).toEqual(Array(4).fill("scholars.read"));
  });
  it("streams exactly the old whole-report fingerprint while returning a bounded page", async () => {
    const f = fixture(), query = parseReport({ kind: "scholars", cycleId, limit: 25, offset: 100 });
    const report = await readOperationalReport(f.db, query);
    const rows = annuals.map(r => ({ id: r.id, values: [r.human_id, r.name, r.status, r.operational_status] }));
    expect(report.sourceHash).toBe(digest(JSON.stringify({ kind: "scholars", cycle: report.cycle, columns: report.columns, rows })));
    expect(report.items).toEqual(rows.slice(100, 125));
    expect(report.counts).toEqual({ inactive: 118, active: 117 });
    const summary = await f.service.summary("actor", query);
    expect(summary.sourceHashBasis).toBe("dashboard-summary-v1");
    expect(summary.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(summary).not.toHaveProperty("columns");
    expect(summary.counts).toEqual(report.counts);
    expect(summary).not.toHaveProperty("items");
  });
});
