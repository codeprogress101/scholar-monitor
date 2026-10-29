import {ApiError} from './auth-api';
// These responses follow the journal lookup inside P05's protected command.
// They prove this exact submission did not commit. Permission/network/integrity
// uncertainty still retains its payload and key.
export function definitiveOmissionConflict(error:unknown,path:string){
 return (path==='individual-payments/omissions/commands'||/^payout-cycles\/[a-f\d-]+\/preparation$/.test(path))&&error instanceof ApiError&&error.status===409&&[
  'FORWARDED_PAYMENT_REVIEW_REQUIRED',
  'OMISSION_STATE_CHANGED','OMISSION_BLOCKED','OMISSION_UNAVAILABLE','OMISSION_EXISTS','OMISSION_IDENTITY_INVALID','OMISSION_SOURCE_INVALID','OMISSION_DESTINATION_INVALID','OMISSION_DESTINATION_BLOCKED','OMISSION_APPROVAL_REQUIRED','INDIVIDUAL_ROUTE_ACTIVE','ENTITLEMENT_RESERVED','PAYROLL_FIRST_REQUIRED','PREPARATION_CLOSED','PREPARATION_UNCHANGED','CLAIM_PERIOD_ENDED','STIPEND_ALREADY_PAID','HISTORICAL_RECEIPT_PENDING','PAYMENT_CORRECTION_PENDING',
 ].includes(error.code);
}
