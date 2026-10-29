import { describe, it, expect, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { preventGraduateRenewal } from "../server/status/graduation";

describe("graduate document receiving guard", () => {
  it("blocks archived graduates with no outstanding stipend", async () => {
    const db = { execute: vi.fn().mockResolvedValue([[{ scholar_id: "s", no_outstanding_stipend: 1, graduated_before_year: "AY2026-2027" }]]) } as unknown as PoolConnection;
    await expect(preventGraduateRenewal(db, "s", "current-semester")).rejects.toMatchObject({ code: "GRADUATE_RENEWAL_BLOCKED" });
  });
  it("allows only the confirmed unpaid final semester", async () => {
    const connection = () => ({ execute: vi.fn(async(sql:string)=>{
      if(sql.includes('FROM scholarship_records r LEFT JOIN status_change_requests'))return [[{scholar_id:'s',scholarship_id:'annual',request_id:'r',semester_id:'final'}]];
      if(sql.includes("p.source_kind='individual'")||sql.startsWith('SELECT DISTINCT p.batch_id')||sql.startsWith('SELECT id FROM semester_entitlements'))return [[]];
      throw Error('Unexpected graduate source: '+sql);
    }) }) as unknown as PoolConnection;
    await expect(preventGraduateRenewal(connection(), "s", "final")).resolves.toBeUndefined();
    await expect(preventGraduateRenewal(connection(), "s", "next")).rejects.toMatchObject({ code: "GRADUATE_RENEWAL_BLOCKED" });
  });
  it("keeps ordinary scholars receivable", async () => {
    const db = { execute: vi.fn().mockResolvedValue([[]]) } as unknown as PoolConnection;
    await expect(preventGraduateRenewal(db, "s", "current")).resolves.toBeUndefined();
  });
  it('recognizes a canonical individual Paid claim on the permanent final-semester entitlement',async()=>{
    const db={execute:vi.fn(async(sql:string)=>{
      if(sql.includes('FROM scholarship_records r LEFT JOIN status_change_requests'))return [[{scholar_id:'s',scholarship_id:'annual',request_id:'r',semester_id:'final'}]];
      if(sql.includes('FROM payment_records p JOIN individual_payment_transactions'))return [[{target_id:'annual',id:'payment',individual_transaction_id:'transaction',entitlement_id:'entitlement',source_batch_id:'original',individual_source_kind:'unclaimed',individual_revision:2,cycle_id:'cycle',scholarship_id:'old-annual',outcome:'paid',amount:'5000.00',paid_on:'2026-01-01',recorded:'2026-01-02T00:00:00Z',reference_text:'Internal reference',remarks:'Acknowledged release',actor_id:'staff',actor_name:'Synthetic Staff',release_evidence:{acknowledgedRelease:true}}]];
      if(sql.includes("p.source_kind='individual'")||sql.startsWith('SELECT DISTINCT p.batch_id')||sql.startsWith('SELECT id FROM semester_entitlements'))return [[]];
      throw Error('Unexpected graduate source: '+sql);
    })} as unknown as PoolConnection;
    await expect(preventGraduateRenewal(db,'s','final')).rejects.toMatchObject({code:'GRADUATE_RENEWAL_BLOCKED'});
  });
});

import { parseStatusRequest } from "../server/status/validation";
it("rejects Graduation as the reason for reversing a graduate to Active", () => {
 expect(() => parseStatusRequest({expectedVersion:2,toStatus:"active",kind:"correction",correctsRequestId:"123e4567-e89b-42d3-a456-426614174000",effectiveOn:"2026-10-08",reasonCode:"GRADUATION",reason:"Graduated scholar",reference:"Graduation record"})).toThrow(/Graduation requires/);
});
