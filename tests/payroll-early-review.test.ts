import {ApiError} from '../src/auth-api';
import {definitivePayrollReviewConflict} from '../src/prior-command';
import {describe,it,expect} from 'vitest';
import {requireManagedReview} from '../server/ovr/rules';
const ready={opened:true,opensOn:'2026-10-26',cutoffOn:'2026-10-27',cutoffReached:false,pendingCount:0,form:{rows:[{}]}};
describe('payroll review and finalization boundaries',()=>{
 it('allows a complete early review, without allowing an early freeze',()=>{expect(()=>requireManagedReview('submit-review',ready)).not.toThrow();expect(()=>requireManagedReview('finalize',ready)).toThrow(/whole-day cutoff/);});
 it('keeps the entire cutoff day for applicants',()=>{expect(()=>requireManagedReview('finalize',{...ready,cutoffReached:false})).toThrow();expect(()=>requireManagedReview('finalize',{...ready,cutoffReached:true})).not.toThrow();});
 it('requires the window to open for either forward action',()=>{for(const action of ['submit-review','finalize'] as const)expect(()=>requireManagedReview(action,{...ready,opened:false,cutoffReached:true})).toThrow(/opens on/);});
 it('blocks unresolved timely candidates before and after cutoff',()=>{for(const action of ['submit-review','finalize'] as const)expect(()=>requireManagedReview(action,{...ready,cutoffReached:true,pendingCount:1})).toThrow(/unresolved on-time/);});
 it('cannot review or finalize an empty roster',()=>{for(const action of ['submit-review','finalize'] as const)expect(()=>requireManagedReview(action,{...ready,cutoffReached:true,form:{rows:[]}})).toThrow(/No eligible included/);});
});

describe('exact payroll workflow recovery',()=>{
 const path='ovr-batches/7f337596-c36d-41d7-b715-368fd4633b1d/';
 it.each(['submit-review','finalize'])('releases only a definitive noncommitted %s state conflict',action=>{expect(definitivePayrollReviewConflict(new ApiError(409,'OVR_INVALID_STATE','Refresh the current workflow.'),path+action)).toBe(true);});
 it('keeps server/network uncertainty, payload conflicts, role revocation and unrelated payment commands retained',()=>{
  for(const e of [new Error('Lost response'),new ApiError(500,'OVR_INVALID_STATE','Uncertain'),new ApiError(403,'PERMISSION_DENIED','Revoked'),new ApiError(409,'IDEMPOTENCY_CONFLICT','Different body')])expect(definitivePayrollReviewConflict(e,path+'submit-review')).toBe(false);
  expect(definitivePayrollReviewConflict(new ApiError(409,'OVR_INVALID_STATE','Changed'),path+'record-payment')).toBe(false);
 });
});
