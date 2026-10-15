import { describe, it, expect } from "vitest";
import { parseReport, readOperationalReport } from "../server/reports/service";
import type { PoolConnection } from "mysql2/promise";
import { REPORTS } from "../server/reports/model";
const cycleId = "c0dcf5e2-9e45-43d9-9241-3664534e1731";
describe("operational report scope", () => {
  it("reads 1,500 scholars in chunks and refuses more than 5,000 without partial totals", async () => {
    const reader = (count: number) => ({
      query: async () => [[]],
      execute: async (sql: string) => {
        if (sql.includes("FROM payout_cycles c")) return [[{id:cycleId,version_id:cycleId,version:1,academic_year_id:cycleId,code:"TEST",state:"open"}]];
        if (sql.includes("FROM workflow_scope_versions")) return [[]];
        if (sql.includes("FROM payout_requirements")) return [[]];
        if (sql.includes("JOIN scholars s")) return [Array.from({length:count},(_,i)=>({id:String(i),scholar_id:String(i),human_id:`TEST-${i}`,name:"Synthetic",status:"selected",operational_status:"active"})).slice(Number(sql.match(/OFFSET (\d+)/)?.[1]??0),Number(sql.match(/OFFSET (\d+)/)?.[1]??0)+250)];
        if (sql.includes("graduation_confirmations")) return [[]];
        throw new Error(`Unexpected read: ${sql}`);
      },
    }) as unknown as PoolConnection;
    const query=parseReport({kind:"scholars",cycleId});
    const result=await readOperationalReport(reader(1500),query);
    expect(result.total).toBe(1500);
    expect(result.items).toHaveLength(25);
    await expect(readOperationalReport(reader(5001),query)).rejects.toMatchObject({code:"REPORT_SCOPE_TOO_LARGE"});
  });
  it("requires explicit report and cycle, defaults bounded pagination", () => {
    for (const kind of Object.keys(REPORTS))
      expect(parseReport({ kind, cycleId })).toEqual({
        kind,
        cycleId,
        limit: 25,
        offset: 0,
      });
  });
  it("rejects arbitrary columns, invalid scopes and unbounded pagination", () => {
    for (const input of [
      { kind: "unknown", cycleId },
      { kind: "scholars" },
      { kind: "scholars", cycleId, columns: ["email"] },
      { kind: "scholars", cycleId, limit: 101 },
      { kind: "payments", cycleId, offset: -1 },
    ])
      expect(() => parseReport(input)).toThrow();
  });
});
