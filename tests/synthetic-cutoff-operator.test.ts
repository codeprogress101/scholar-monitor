import{describe,it,expect}from'vitest';
import{parseSyntheticRuleRequest,authorizationSha256,authorizationSource,syntheticTimes}from'../scripts/record-synthetic-cutoff-rule';
import{windowTiming,windowCutoffReached}from'../server/payouts/cutoff-policy';
import{classifyReceiptTiming}from'../server/requirements/timing-rules';
const request={kind:'synthetic_uat_test',officeApproval:false,targetKind:'primary-synthetic',database:'ldss_primary_test_12676_61497616',runtimeUser:'ldss_primary_12676_61497616',cycleId:'829ae3dc-9b49-4d88-9dfe-0a7250b164c0',commandId:'00000000-0000-4000-8000-000000000001',actorId:'00000000-0000-4000-8000-000000000002',expectedActorVersion:1,expectedCycleVersion:2,expectedDeadlineRevision:3,expectedWindowSequence:3,expectedRuleRevision:0,validFrom:'2026-10-27',validThrough:'2026-10-31',timeZone:'Asia/Manila',permittedTimes:[...syntheticTimes],defaultLocalTime:'17:00:00',boundaryRule:'inclusive_microsecond_v1',authorizationSha256,authorizationSource,procedureSha256:'a'.repeat(64),operator:{principal:'desktop-bpljkrp\\admin',sid:'S-1-5-21-1',hostname:'DESKTOP-BPLJKRP'}};
describe('Single-authorization synthetic operator boundary',()=>{
 it('accepts only the explicit five values, default and non-office provenance',()=>expect(parseSyntheticRuleRequest(request)).toEqual(request));
 it.each([{officeApproval:true},{kind:'office_policy'},{timeZone:'UTC'},{defaultLocalTime:'19:00:00'},{permittedTimes:['15:00:00','17:00:00','18:00:00']},{authorizationSha256:'b'.repeat(64)},{physicalReceiptTime:'17:00'}])('rejects unsupported authority, choices or extra evidence %j',change=>expect(()=>parseSyntheticRuleRequest({...request,...change})).toThrow());
 it.each(['ldss_scholar_monitor_dev','ldss_operational','ldss_primary_test_other'])('rejects unrelated target %s',database=>expect(()=>parseSyntheticRuleRequest({...request,database})).toThrow());
 it('requires a protected-copy identity for the disposable path',()=>{
  expect(()=>parseSyntheticRuleRequest({...request,targetKind:'owned-disposable'})).toThrow();
  expect(parseSyntheticRuleRequest({...request,targetKind:'owned-disposable',database:'ldss_restore_1790000000000_1234abcd',runtimeUser:'ldss_pt4_123456789abc'}).targetKind).toBe('owned-disposable');
 });
 it.each([['12:00:00','04:00:00'],['15:00:00','07:00:00'],['17:00:00','09:00:00'],['19:00:00','11:00:00'],['23:59:00','15:59:00']])('keeps %s as the exact inclusive minute instant', (time,utc)=>{
  const t=windowTiming('2026-10-28','manila_time_v1',time);expect(t.cutoffAtUtc).toBe('2026-10-28T'+utc+'.000000Z');expect(windowCutoffReached('2026-10-28','manila_time_v1',t.cutoffAtUtc,time)).toBe(false);expect(windowCutoffReached('2026-10-28','manila_time_v1',t.finalizationFromUtc,time)).toBe(true);
  expect(classifyReceiptTiming({source:'initial_receipt',sourceId:'synthetic',version:1,physicalPrecision:'date',receivedOn:'2026-10-28',recordedAt:'2026-10-28T00:00:00Z',recordedBy:'Synthetic receiver'},'2026-10-28','manila_time_v1',time)).toBe('physical_time_review_required');
 });
});
