import {describe,it,expect} from 'vitest';
import {ApiError} from '../src/auth-api';
import {definitiveIndividualConflict} from '../src/individual-command-conflicts';
describe('P04 uncertain retry after another operator changes the source',()=>{
 it.each(['INDIVIDUAL_STATE_CHANGED','INDIVIDUAL_BLOCKED','INDIVIDUAL_ROUTE_ACTIVE','UNCLAIMED_REQUIRED','REPLACEMENT_UNAVAILABLE','UNCLAIMED_SOURCE_UNAVAILABLE'])('releases the retry lock for definitive noncommitted %s',code=>{
  expect(definitiveIndividualConflict(new ApiError(409,code,'Refresh the changed source.'))).toBe(true);
 });
 it('retains network/server uncertainty and permission revocation without assuming a receipt is absent',()=>{
  expect(definitiveIndividualConflict(new Error('Network unavailable'))).toBe(false);
  expect(definitiveIndividualConflict(new ApiError(500,'INDIVIDUAL_STATE_CHANGED','Unconfirmed server result'))).toBe(false);
  expect(definitiveIndividualConflict(new ApiError(403,'PERMISSION_DENIED','Role revoked'))).toBe(false);
 });
 it('never clears a key/payload conflict or evidence-integrity failure as an ordinary stale review',()=>{
  expect(definitiveIndividualConflict(new ApiError(409,'IDEMPOTENCY_CONFLICT','Different evidence'))).toBe(false);
  expect(definitiveIndividualConflict(new ApiError(409,'INDIVIDUAL_EVIDENCE_INVALID','Technical review required'))).toBe(false);
 });
});
