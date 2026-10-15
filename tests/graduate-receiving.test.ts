import { describe, it, expect, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { preventGraduateRenewal } from "../server/status/graduation";

describe("graduate document receiving guard", () => {
  it("blocks archived graduates with no outstanding stipend", async () => {
    const db = { execute: vi.fn().mockResolvedValue([[{ scholar_id: "s", no_outstanding_stipend: 1, graduated_before_year: "AY2026-2027" }]]) } as unknown as PoolConnection;
    await expect(preventGraduateRenewal(db, "s", "current-semester")).rejects.toMatchObject({ code: "GRADUATE_RENEWAL_BLOCKED" });
  });
  it("allows only the confirmed unpaid final semester", async () => {
    const connection = () => ({ execute: vi.fn().mockResolvedValueOnce([[{ scholar_id: "s", request_id: "r", semester_id: "final" }]]).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]) }) as unknown as PoolConnection;
    await expect(preventGraduateRenewal(connection(), "s", "final")).resolves.toBeUndefined();
    await expect(preventGraduateRenewal(connection(), "s", "next")).rejects.toMatchObject({ code: "GRADUATE_RENEWAL_BLOCKED" });
  });
  it("keeps ordinary scholars receivable", async () => {
    const db = { execute: vi.fn().mockResolvedValue([[]]) } as unknown as PoolConnection;
    await expect(preventGraduateRenewal(db, "s", "current")).resolves.toBeUndefined();
  });
});

import { parseStatusRequest } from "../server/status/validation";
it("rejects Graduation as the reason for reversing a graduate to Active", () => {
 expect(() => parseStatusRequest({expectedVersion:2,toStatus:"active",kind:"correction",correctsRequestId:"123e4567-e89b-42d3-a456-426614174000",effectiveOn:"2026-10-08",reasonCode:"GRADUATION",reason:"Graduated scholar",reference:"Graduation record"})).toThrow(/Graduation requires/);
});
