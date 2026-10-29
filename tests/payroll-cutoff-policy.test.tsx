import {ApiError} from '../src/auth-api';
import {definitiveCutoffConflict} from '../src/prior-command';
import {describe,it,expect} from 'vitest';
import {windowTiming,windowCutoffReached,utcMicroseconds} from '../server/payouts/cutoff-policy';
import {parseWindowAction,submissionState} from '../server/payouts/submission-rules';
import {classifyReceiptTiming} from '../server/requirements/timing-rules';
import {payrollTiming} from '../src/payroll-progress';
import type {SubmissionWindowView} from '../server/payouts/submission-service';
const day='2026-10-29';
const paper=(receivedOn:string,recordedAt:string)=>({source:'initial_receipt' as const,sourceId:'fixture',version:1,physicalPrecision:'date' as const,receivedOn,recordedAt,recordedBy:'Fictional receiver'});
describe('Prospective versioned cutoff timing',()=>{
 it.each(['2026-10-29','2026-01-31','2026-12-31','2028-02-29'])('uses exact database microseconds at 17:00 on %s',d=>{
  const t=windowTiming(d,'manila_time_v1','17:00:00');
  expect(t.cutoffAtUtc).toBe(d+'T09:00:00.000000Z');expect(t.finalizationFromUtc).toBe(d+'T09:00:00.000001Z');
  expect(windowCutoffReached(d,'manila_time_v1',d+'T08:59:59.999999Z','17:00:00')).toBe(false);
  expect(windowCutoffReached(d,'manila_time_v1',t.cutoffAtUtc,'17:00:00')).toBe(false);
  expect(windowCutoffReached(d,'manila_time_v1',t.finalizationFromUtc,'17:00:00')).toBe(true);
  expect(Date.parse(t.cutoffAtUtc)).toBe(Date.parse(t.finalizationFromUtc));
  expect(utcMicroseconds(t.finalizationFromUtc)-utcMicroseconds(t.cutoffAtUtc)).toBe(1n);
 });
 it.each([['15:00:00','07:00:00'],['17:00:00','09:00:00'],['18:00:00','10:00:00'],['00:00:00','16:00:00']])('derives %s in Manila without workstation timezone', (time,utc)=>{
  const t=windowTiming(day,'manila_time_v1',time);expect(t.cutoffAtUtc.slice(11,19)).toBe(utc);if(time==='00:00:00')expect(t.cutoffAtUtc.slice(0,10)).toBe('2026-10-28');
 });
 it('keeps old whole-day behavior and fixed-policy identity',()=>{
  expect(windowTiming(day,'whole_day_v1').finalizationFromUtc).toBe(day+'T16:00:00.000Z');
  expect(windowCutoffReached(day,'whole_day_v1',day+'T15:59:59.999999Z')).toBe(false);
  expect(windowCutoffReached(day,'whole_day_v1',day+'T16:00:00.000000Z')).toBe(true);
  expect(windowTiming(day,'manila_1700_v1','17:00:00').cutoffAtUtc).toBe(day+'T09:00:00.000000Z');
  expect(()=>windowTiming(day,'manila_1700_v1','18:00:00')).toThrow();
 });
 it.each(['24:00:00','-1:00:00','17:00:01','17:00:00.001','17:00','invalid'])('rejects invalid or unsupported precision %s',time=>expect(()=>windowTiming(day,'manila_time_v1',time)).toThrow());
 it('requires the complete confirmed timed contract; old requests stay date-only',()=>{
  const body={expectedCycleVersion:2,expectedDeadlineRevision:3,expectedSequence:3,opensOn:day,cutoffOn:day};
  expect(parseWindowAction('open-window',body)).toEqual(body);
  expect(()=>parseWindowAction('open-window',{...body,cutoffPolicy:'manila_time_v1',cutoffLocalTime:'17:00:00'})).toThrow();
  expect(()=>parseWindowAction('open-window',{...body,cutoffLocalTime:'17:00:00'})).toThrow();
  const confirmed={...body,cutoffPolicy:'manila_time_v1',cutoffLocalTime:'17:00:00',cutoffTimeZone:'Asia/Manila',expectedCutoffRuleRevision:1,expectedCutoffRuleHash:'a'.repeat(64),expectedCutoffAtUtc:day+'T09:00:00.000000Z'};
  expect(parseWindowAction('open-window',confirmed)).toEqual(confirmed);
  expect(()=>parseWindowAction('open-window',{...confirmed,cutoffTimeZone:'UTC'})).toThrow();
 });
 it('never substitutes encoding time for same-day physical receipt time',()=>{
  for(const encoded of [day+'T00:00:00.000000Z',day+'T09:00:00.000000Z',day+'T10:00:00.000000Z'])expect(classifyReceiptTiming(paper(day,encoded),day,'manila_time_v1','17:00:00')).toBe('physical_time_review_required');
  expect(classifyReceiptTiming(paper('2026-10-28',day+'T09:00:00.000000Z'),day,'manila_time_v1','17:00:00')).toBe('on_time');
  expect(classifyReceiptTiming(paper('2026-10-28',day+'T09:00:00.000001Z'),day,'manila_time_v1','17:00:00')).toBe('review_required');
  expect(classifyReceiptTiming(paper('2026-10-30',day+'T00:00:00Z'),day,'manila_time_v1','17:00:00')).toBe('late');
 });
 it('keeps legacy receipt interpretation',()=>expect(classifyReceiptTiming(paper(day,day+'T10:00:00Z'),day)).toBe('on_time'));
 it('formats the actual selected time and first permitted microsecond; rejects mismatched server evidence',()=>{
  const timing=windowTiming(day,'manila_time_v1','18:00:00');
  const view={cycle:{id:'cycle'},timeZone:'Asia/Manila',asOf:timing.cutoffAtUtc,deadlines:[],windows:[{batchId:'batch',cutoffOn:day,cutoffLocalTime:'18:00:00',...timing}]} as unknown as SubmissionWindowView;
  const result=payrollTiming(view,'batch','cycle');expect(result?.cutoff).toContain('6:00 PM');expect(result?.normalFinalization).toContain('6:00:00.000001 PM');expect(result?.cutoffReached).toBe(false);
  view.asOf=timing.finalizationFromUtc;expect(payrollTiming(view,'batch','cycle')?.cutoffReached).toBe(true);
  view.windows[0].cutoffAtUtc=day+'T09:00:00.000000Z';expect(payrollTiming(view,'batch','cycle')).toBeNull();
 });
 it('preserves submission-window state at the exact inclusive instant',()=>{
  expect(submissionState(day,day,day+'T09:00:00.000000Z','manila_time_v1','17:00:00')).toBe('open');
  expect(submissionState(day,day,day+'T09:00:00.000001Z','manila_time_v1','17:00:00')).toBe('cutoff_reached');
 });
});

describe('Timed-window exact-retry rejection safety',()=>{
 const path='payout-cycles/00000000-0000-0000-0000-000000000000/submission-windows/';
 it.each(['CUTOFF_RULE_UNAVAILABLE','CUTOFF_AUTHORITY_CHANGED','CUTOFF_SOURCE_CHANGED'])('releases post-ledger %s only for supported window commands',code=>{
  for(const action of ['open-window','extend-window'])expect(definitiveCutoffConflict(new ApiError(409,code,'Review again'),path+action)).toBe(true);
  expect(definitiveCutoffConflict(new ApiError(409,code,'Review again'),'ovr-batches/00000000-0000-0000-0000-000000000000/finalize')).toBe(false);
 });
 it('retains uncertain transport, authentication, server and changed-body outcomes',()=>{
  for(const error of [new Error('Lost response'),new ApiError(500,'CUTOFF_SOURCE_CHANGED','Unavailable'),new ApiError(401,'AUTH_REQUIRED','Expired'),new ApiError(403,'PERMISSION_DENIED','Revoked'),new ApiError(409,'IDEMPOTENCY_CONFLICT','Changed body')])expect(definitiveCutoffConflict(error,path+'open-window')).toBe(false);
 });
});
