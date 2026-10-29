import {it,expect} from 'vitest';
import {ApiError} from '../src/auth-api';
import {definitiveSettlementConflict} from '../src/settlement-command-conflicts';
it('allows fresh review only after a definitively uncommitted settlement conflict',()=>{
 expect(definitiveSettlementConflict(new ApiError(409,'SETTLEMENT_REVIEW_CHANGED','Changed'),'individual-payments/settlement/paid')).toBe(true);
 for(const e of [new Error('Lost connection'),new ApiError(500,'UNAVAILABLE','Unknown'),new ApiError(403,'PERMISSION_CHANGED','Revoked'),new ApiError(409,'IDEMPOTENCY_CONFLICT','Different payload'),new ApiError(409,'SETTLEMENT_EVIDENCE_INVALID','Integrity review')])expect(definitiveSettlementConflict(e,'individual-payments/settlement/paid')).toBe(false);
 expect(definitiveSettlementConflict(new ApiError(409,'SETTLEMENT_REVIEW_CHANGED','Changed'),'unrelated/commands')).toBe(false);
});
