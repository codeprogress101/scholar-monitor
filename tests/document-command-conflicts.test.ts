import {describe,it,expect} from 'vitest';
import {ApiError} from '../src/auth-api';
import {definitiveDocumentConflict} from '../src/document-command-conflicts';
const path='individual-payments/transactions/12345678-abcd-1234-abcd-123456789abc/documents/generate';
describe('P06 exact retry recovery',()=>{
 it('releases a known uncommitted stale document submission',()=>{for(const code of ['DOCUMENT_CHANGED','DOCUMENT_SOURCE_CHANGED','DOCUMENT_TEMPLATE_CHANGED','DOCUMENT_UNAVAILABLE'])expect(definitiveDocumentConflict(new ApiError(409,code,'Changed'),path)).toBe(true);});
 it('retains ambiguous outcomes and revoked permission',()=>{for(const [status,code] of [[500,'DOCUMENT_CHANGED'],[403,'PERMISSION_DENIED'],[409,'IDEMPOTENCY_CONFLICT'],[409,'DOCUMENT_EVIDENCE_INVALID']] as const)expect(definitiveDocumentConflict(new ApiError(status,code,'Unknown'),path)).toBe(false);expect(definitiveDocumentConflict(new Error('Network'),path)).toBe(false);});
 it('does not alter another workflow retry decision',()=>{expect(definitiveDocumentConflict(new ApiError(409,'DOCUMENT_CHANGED','Changed'),'individual-payments/commands')).toBe(false);});
});
