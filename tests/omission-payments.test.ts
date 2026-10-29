import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {parseOmission} from '../server/payments/omission-model';
import {omissionReserved,mayReviewOwnOmission,type OmissionSource} from '../server/payments/omission-source';
import {definitiveOmissionConflict} from '../src/omission-command-conflicts';
import {ApiError} from '../src/auth-api';
const base={sourceBatchId:randomUUID(),scholarshipId:randomUUID(),expectedRevision:0};
describe('omitted source and command boundaries',()=>{
 it('rejects invented payment, amount, source, actor and backdating fields',()=>{for(const field of ['paymentId','amount','recordedAt','actorId','paidOn'])expect(()=>parseOmission({...base,action:'record',[field]:'invented'})).toThrow();});
 it('does not accept unsupported individual payment or document actions',()=>{for(const action of ['paid','forward','generate','create-entitlement'])expect(()=>parseOmission({...base,action})).toThrow();});
 it('requires an actual selected case and destination for payroll refresh',()=>{expect(()=>parseOmission({...base,action:'add-to-payroll'})).toThrow();expect(parseOmission({...base,action:'add-to-payroll',omissionId:randomUUID(),destinationBatchId:randomUUID()})).toHaveProperty('destinationBatchId');});
 it('requires fresh review and a reason for Coordinator authorization',()=>{const v={...base,action:'approve',omissionId:randomUUID()};expect(()=>parseOmission(v)).toThrow();expect(()=>parseOmission({...v,expectedSourceHash:'a'.repeat(64)})).toThrow();expect(parseOmission({...v,expectedSourceHash:'a'.repeat(64),reason:'Reviewed genuine omission'}).action).toBe('approve');});
 it('reserves pending, approved, prepared and cancellation-pending routes',()=>{for(const s of ['requested','approved','prepared','cancel_requested'])expect(omissionReserved(s)).toBe(true);for(const s of ['recorded','payroll','rejected','cancelled'])expect(omissionReserved(s)).toBe(false);});
 it('cannot use another case, scholar result or source batch as own reservation',()=>{const s={id:randomUUID(),sourceBatchId:base.sourceBatchId} as OmissionSource;expect(mayReviewOwnOmission(s,s.id,base.sourceBatchId)).toBe(true);expect(mayReviewOwnOmission(s,randomUUID(),base.sourceBatchId)).toBe(false);expect(mayReviewOwnOmission(s,s.id,randomUUID())).toBe(false);expect(mayReviewOwnOmission(null,s.id,base.sourceBatchId)).toBe(false);});
 it('releases only definitive uncommitted P05 conflicts for exact retry recovery',()=>{
  const error=new ApiError(409,'OMISSION_STATE_CHANGED','Changed');expect(definitiveOmissionConflict(error,'individual-payments/omissions/commands')).toBe(true);expect(definitiveOmissionConflict(error,'individual-payments/commands')).toBe(false);
  for(const code of ['IDEMPOTENCY_CONFLICT','OMISSION_EVIDENCE_INVALID','INDIVIDUAL_EXTERNAL_CONFLICT'])expect(definitiveOmissionConflict(new ApiError(409,code,'Preserve'),'individual-payments/omissions/commands')).toBe(false);
  expect(definitiveOmissionConflict(new ApiError(503,'OMISSION_STATE_CHANGED','Uncertain'),'individual-payments/omissions/commands')).toBe(false);
 });
});
