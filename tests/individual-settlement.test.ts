import {describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {settlementInput,settlementCommit,settlementCommand} from '../server/payments/settlement-model';
import {individualPaymentRow} from '../server/payments/settlement-reads';
import type {RowDataPacket} from 'mysql2/promise';
import type {PoolConnection} from 'mysql2/promise';
import {cachedReads} from '../server/read-cache';
import {individualClaims,primeIndividualClaims} from '../server/payments/settlement-reads';
const id=randomUUID(),input={mode:'single',transactionIds:[id],actualPaidOn:'2026-01-01'};
describe('individual cheque financial boundary',()=>{
 it('requires an explicit acknowledged release, not document/forward state',()=>{
  const commit={input,basis:'a'.repeat(64)};expect(settlementCommit.safeParse(commit).success).toBe(false);expect(settlementCommit.safeParse({...commit,acknowledgedRelease:false}).success).toBe(false);expect(settlementCommit.safeParse({...commit,acknowledgedRelease:true}).success).toBe(true);
 });
 it('permits the three-document representative attestation only on a single release',()=>{
  expect(settlementInput.safeParse({...input,authorizationDocumentsVerified:true}).success).toBe(true);
  for(const mode of ['single','bulk'])for(const field of ['representativeName','idNumber','recipientType','identificationImage'])expect(settlementInput.safeParse({...input,mode,[field]:'must not persist'}).success).toBe(false);
  expect(settlementInput.safeParse({...input,mode:'bulk',authorizationDocumentsVerified:true}).success).toBe(false);
  expect(settlementInput.safeParse({...input,transactionIds:[id,randomUUID()],authorizationDocumentsVerified:true}).success).toBe(false);
  const bulk={input:{mode:'bulk',transactionIds:[id],actualPaidOn:'2026-01-01'},basis:'a'.repeat(64),acknowledgedRelease:true};expect(settlementCommit.safeParse(bulk).success).toBe(false);expect(settlementCommit.safeParse({...bulk,scholarPersonalReleaseConfirmed:true}).success).toBe(true);
 });
 it('rejects partial amounts, forged sources, duplicate IDs and unbounded selection',()=>{
  for(const field of ['amount','entitlementId','scholarshipId','batchId','actorId','recordedAt'])expect(settlementInput.safeParse({...input,[field]:'forged'}).success).toBe(false);
  expect(settlementInput.safeParse({...input,mode:'bulk',transactionIds:[id,id]}).success).toBe(false);
  expect(settlementInput.safeParse({...input,mode:'bulk',transactionIds:Array.from({length:201},()=>randomUUID())}).success).toBe(false);
  expect(settlementInput.safeParse({...input,actualPaidOn:'2999-01-01'}).success).toBe(false);
 });
 it('cannot convert a generic status update or an unacknowledged discovery into settlement',()=>{
  const common={transactionId:id,expectedRevision:1};expect(settlementCommand.safeParse({...common,action:'set-status',status:'paid'}).success).toBe(false);
  expect(settlementCommand.safeParse({...common,action:'report',description:'Discovered original cheque payment',discoveredPaidOn:'2026-01-01'}).success).toBe(false);
  expect(settlementCommand.safeParse({...common,action:'confirm-original',caseId:randomUUID(),sourceHash:'a'.repeat(64),reason:'Review original and unpaid replacement',acknowledgedRelease:true}).success).toBe(false);
 });
 it('uses the existing correction precedence without rewriting original payment facts',()=>{
  const row={id,individual_transaction_id:randomUUID(),entitlement_id:randomUUID(),source_batch_id:randomUUID(),individual_source_kind:'unclaimed',individual_revision:2,cycle_id:randomUUID(),scholarship_id:randomUUID(),outcome:'paid',amount:'5000.00',paid_on:'2026-01-01',recorded:'2026-01-10T02:00:00.000000Z',reference_text:'LDSS internal reference',remarks:'Acknowledged receipt',actor_id:randomUUID(),actor_name:'Synthetic Staff',release_evidence:{acknowledgedRelease:true}} as RowDataPacket;
  const saved=structuredClone(row),original=individualPaymentRow(row);expect(original.batchId).toBe(null);expect(original.recordedAt).toBe(row.recorded);
  const after={...original,revision:5,outcome:'not_paid' as const,amount:'0.00',effectiveOn:null};row.correction={paymentId:id,individualTransactionId:row.individual_transaction_id,revision:5,after};
  expect(individualPaymentRow(row)).toEqual(after);delete row.correction;expect(row).toEqual(saved);
  row.correction={paymentId:id,individualTransactionId:row.individual_transaction_id,revision:6,after:{...after,id:randomUUID()}};expect(()=>individualPaymentRow(row)).toThrow('Preserve the payment correction');
 });
});
it('batches displayed Registry claim reads, isolates caller mutation and invalidates them after a write',async()=>{
 let changed=false;
 const row={target_id:'a',id,individual_transaction_id:'transaction',entitlement_id:'entitlement',source_batch_id:'source',individual_source_kind:'unclaimed',individual_revision:2,cycle_id:'cycle',scholarship_id:'a',outcome:'paid',amount:'5000.00',paid_on:'2026-01-01',recorded:'2026-01-02T00:00:00Z',reference_text:'Internal',remarks:'Receipt',actor_id:'staff',actor_name:'Staff',release_evidence:{acknowledgedRelease:true}} as RowDataPacket;
 const execute=vi.fn(async(sql:string,values:unknown[]=[])=>{
  if(sql.startsWith('UPDATE')){changed=true;return [{affectedRows:1},[]];}
  if(sql.includes('FROM payment_records p JOIN individual_payment_transactions')){
   if(!values.includes('a'))return [[],[]];const r={...row};
   if(changed){const before=individualPaymentRow(row);r.correction={paymentId:id,individualTransactionId:'transaction',revision:4,after:{...before,revision:4,outcome:'not_paid',amount:'0.00',effectiveOn:null}};}return [[r],[]];
  }
  if(sql.includes('FROM payment_corrections c'))return [[],[]];throw Error(sql);
 });
 const db=cachedReads({execute,query:execute} as unknown as PoolConnection);
 await primeIndividualClaims(db,['a','b'],'semester');expect(execute).toHaveBeenCalledTimes(2);
 const first=await individualClaims(db,['a'],'semester');first.attempts.get('a')![0].amount='0.00';
 expect((await individualClaims(db,['a'],'semester')).attempts.get('a')![0].amount).toBe('5000.00');expect((await individualClaims(db,['b'],'semester')).attempts.get('b')).toEqual([]);expect(execute).toHaveBeenCalledTimes(2);
 await db.execute('UPDATE synthetic SET revision=revision+1');
 expect((await individualClaims(db,['a'],'semester')).attempts.get('a')![0].outcome).toBe('not_paid');expect(execute).toHaveBeenCalledTimes(5);
});
