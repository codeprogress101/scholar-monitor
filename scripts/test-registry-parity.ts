import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../server/authorization/service.js";
import { registryEligibility } from "../server/scholars/registry-eligibility.js";
import { legacyRegistryEligibility } from "../tests/fixtures/legacy-registry-eligibility.js";
import type { OvrBatch } from "../server/ovr/model.js";
import { assertCandidateParity } from "./test-candidate-parity.js";

/** Both readers see exactly the same authorized, immutable transaction snapshot. */
export async function assertRegistryParity(pool: Pool, actor: string, raw: Record<string,string>) {
  return new AuthorizationService(pool).readSnapshot(actor,"scholars.read",async db=>{
    const before = await legacyRegistryEligibility(db,raw);
    const after = await registryEligibility(db,raw);
    // PAY-NEW adds explicit assessment context and retains distinct document
    // reasons. Keep the independent legacy oracle for every original field.
    const legacyProjection=structuredClone(after);
    for(const item of legacyProjection.items){
      const actual=after.items.find(x=>x.scholarId===item.scholarId)!;
      if(actual.payout?.context?.batchId){
        const [[batch]]=await db.execute<RowDataPacket[]>('SELECT code,cycle_id FROM ovr_batches WHERE id=?',[actual.payout.context.batchId]);
        assert.equal(batch.cycle_id,after.periodId);assert.equal(batch.code,actual.payout.context.batchCode);
      }
      if(item.payout){delete item.payout.context;delete item.payout.publishedActive;if(item.payout.reasons)item.payout.reasons=item.payout.reasons.filter((r,i,all)=>all.findIndex(x=>x.code===r.code)===i);}
      item.reasons=item.reasons.filter((r,i,all)=>all.findIndex(x=>x.code===r.code)===i);
      if(item.payout?.status==='Not yet assigned to a new payroll'){
        assert.equal(actual.payout?.context?.batchId,null);assert.equal(actual.payout?.eligible,false);
        const original=before.items.find(x=>x.scholarId===item.scholarId)!;assert.equal(original.payout?.eligible,false);item.payout.status=original.payout!.status;
      }
    }
    assert.deepEqual(legacyProjection,before,"R01 changed original Registry eligibility, reasons, requirements or links");
    return after;
  });
}

export function registryCheckpoints(pool: Pool) {
  const checked = new Set<string>();
  return async (actor: string, detail: {cycle:{id:string;academicYearId:string};batch:{id:string;revision:number}}) => {
    const [people]=await pool.execute<RowDataPacket[]>("SELECT scholar_id FROM scholarship_records WHERE academic_year_id=? ORDER BY id LIMIT 90",[detail.cycle.academicYearId]);
    const ids=people.map(r=>String(r.scholar_id));
    const missing=randomUUID();
    await assertRegistryParity(pool,actor,{ids:[...ids,...ids.slice(0,1),missing].join(","),periodId:detail.cycle.id});
    if(ids.length)await assertRegistryParity(pool,actor,{ids:ids[0],periodId:detail.cycle.id});
    if(!checked.has(detail.cycle.id)) {
      checked.add(detail.cycle.id);
      await assertRegistryParity(pool,actor,{ids:"",periodId:detail.cycle.id});
      await assertRegistryParity(pool,actor,{ids:ids.join(","),academicYearId:detail.cycle.academicYearId});
    }
  };
}

/** Legacy payroll is read-only in current commands. Seed historical-format rows
 * only in the owned disposable database to exercise its existing read semantics. */
export async function testRegistryLegacy(pool: Pool, actor: string, cycleId: string, annualId: string) {
  const [[annual]]=await pool.execute<RowDataPacket[]>("SELECT scholar_id FROM scholarship_records WHERE id=?",[annualId]);
  const batches=[randomUUID(),randomUUID()];
  const raw={ids:annual.scholar_id as string,periodId:cycleId};
  const append=async(id:string,revision:number,action:string,state="draft")=>{
    const snapshot:OvrBatch={id,cycleId,revision,state,action,code:id,name:"Synthetic historical Registry fixture",actorName:"Synthetic Staff",actorId:actor,recordedAt:new Date().toISOString(),reason:"R01 disposable historical read fixture",reference:"TEST-R01"};
    await pool.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,revision,state,action,JSON.stringify(snapshot),actor]);
  };
  try{
    for(const id of batches){await pool.execute("INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",[id,cycleId,id,"Synthetic legacy Registry",actor]);await append(id,1,"create");}
    let view=await assertRegistryParity(pool,actor,raw);
    assert.equal(view.items[0].inclusion,"Eligible for multiple drafts - select a batch");
    for(const id of batches)await assertCandidateParity(pool,actor,id);
    await append(batches[0],2,"add");
    await pool.execute("INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,?,?,'add','{}')",[batches[0],2,annualId]);
    view=await assertRegistryParity(pool,actor,raw);assert.equal(view.items[0].inclusion,"Included in draft");assert.equal(view.items[0].links?.length,1);
    for(const id of batches)await assertCandidateParity(pool,actor,id);
    await append(batches[0],3,"remove");
    await pool.execute("INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,?,?,'remove','{}')",[batches[0],3,annualId]);
    await pool.execute("INSERT INTO payroll_draft_deferrals(id,batch_id,scholarship_id,revision,action,reason,actor_id,recorded_at) VALUES(?,?,?,1,'defer','Synthetic deferral',?,UTC_TIMESTAMP(6))",[randomUUID(),batches[0],annualId,actor]);
    view=await assertRegistryParity(pool,actor,raw);assert.equal(view.items[0].links?.length,1);
    await append(batches[1],2,"submit-review","review");
    view=await assertRegistryParity(pool,actor,raw);assert.equal(view.items[0].inclusion,"Deferred from this batch");
    for(const id of batches)await assertCandidateParity(pool,actor,id);
    console.log("PASS R01 historical automatic drafts: multiple destinations, reserved entries, latest removal, deferral and review-state parity");
  }finally{
    for(const id of batches){await pool.execute("DELETE FROM payroll_draft_deferrals WHERE batch_id=?",[id]);await pool.execute("DELETE FROM ovr_entries WHERE batch_id=?",[id]);await pool.execute("DELETE FROM ovr_batch_events WHERE batch_id=?",[id]);await pool.execute("DELETE FROM ovr_batches WHERE id=?",[id]);}
  }
}
