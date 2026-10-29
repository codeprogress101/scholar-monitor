import {ApiError} from './auth-api';
/** These 409s are returned only after the guarded command journal lookup found
 * no completed command. Retrying an already committed key returns its receipt
 * instead. Release the browser retry lock so Staff can refresh/review changed
 * sources; network, server, permission and key/payload uncertainty stays saved. */
export function definitiveIndividualConflict(error:unknown){
 return error instanceof ApiError&&error.status===409&&[
  'INDIVIDUAL_STATE_CHANGED','INDIVIDUAL_BLOCKED','INDIVIDUAL_ROUTE_ACTIVE',
  'UNCLAIMED_REQUIRED','REPLACEMENT_UNAVAILABLE','UNCLAIMED_SOURCE_UNAVAILABLE',
  'FORWARDED_PAYMENT_REVIEW_REQUIRED',
 ].includes(error.code);
}
