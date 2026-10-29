import {describe,it,expect} from 'vitest';
import {individualInput,individualTransition,individualState} from '../server/payments/individual-model.js';
import {sourceBlockers} from '../server/payments/individual-reads.js';
import type {RowDataPacket} from 'mysql2/promise';
const id='12345678-1234-4234-9234-123456789abc';
describe('P04 unpaid DV-only workflow',()=>{
 it('rejects backdated requests, official numbers, payment actions and hidden future states',()=>{
  const input={action:'request',paymentId:id,expectedRevision:0};
  expect(individualInput.safeParse(input).success).toBe(true);
  for(const field of ['requestedAt','officialDvNumber','paidOn','amount'])expect(individualInput.safeParse({...input,[field]:'2026-01-01'}).success).toBe(false);
  for(const action of ['paid','generate','forward','approve'])expect(individualInput.safeParse({...input,action}).success).toBe(false);
 });
 it('requires a current transaction and reason for cancellation decisions',()=>{
  expect(individualInput.safeParse({action:'prepare',paymentId:id,expectedRevision:1}).success).toBe(false);
  expect(individualInput.safeParse({action:'approve-cancellation',paymentId:id,transactionId:id,expectedRevision:3,reason:'okay'}).success).toBe(false);
 });
 it('has no Staff approval prerequisite for ordinary preparation',()=>{
  expect(individualTransition('request_recorded','prepare')).toBe('prepared');
  expect(individualState('prepared')).toBe('DV Prepared');
 });
 it('permits cancellation rejection and a later cancellation request',()=>{
  expect(individualTransition('prepared','request-cancellation')).toBe('cancel_requested');
  expect(individualTransition('cancel_requested','reject-cancellation')).toBe('cancel_rejected');
  expect(individualTransition('cancel_rejected','request-cancellation')).toBe('cancel_requested');
  expect(individualTransition('cancel_requested','approve-cancellation')).toBe('cancelled');
 });
 it('rejects repeated preparation, unreviewed cancellation and cancelled resurrection',()=>{
  for(const [old,action] of [['prepared','prepare'],['prepared','approve-cancellation'],['cancelled','prepare'],['original_paid_cancelled','prepare']] as const)expect(()=>individualTransition(old,action)).toThrow();
 });
 it('retains the inclusive Philippine semester-end boundary without extending it',()=>{
  const row={effective_outcome:'not_paid',unpaid_reason:'did_not_claim',batch_state:'processed',ends_on:'2026-12-31',day:'2026-12-31'} as RowDataPacket;
  expect(sourceBlockers(row)).toEqual([]);
  expect(sourceBlockers({...row,day:'2027-01-01'} as RowDataPacket)).toContain('The semester claiming period has ended. No late-payment authority is recorded.');
  expect(sourceBlockers({...row,ends_on:null} as RowDataPacket)).toContain('The semester end date is unavailable.');
 });
 it('keeps genuine financial conflicts visible',()=>{
  const row={effective_outcome:'paid',unpaid_reason:null,batch_state:'closed',ends_on:'2026-12-31',day:'2026-10-22',pending_correction:1,pending_receipt:1,disputed:1,other_route:1} as RowDataPacket;
  expect(sourceBlockers(row)).toHaveLength(5);
 });
});
