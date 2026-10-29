import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {PoolConnection} from 'mysql2/promise';
import type {PayoutCycle} from '../server/payouts/model';
import {annualOverview,payrollOverview} from '../server/dashboard/overview';
import {DashboardService} from '../server/dashboard/service';
import type {AuthorizationService} from '../server/authorization/service';
import {renderToStaticMarkup} from 'react-dom/server';
import DashboardCharts,{outcomeShare} from '../src/DashboardCharts';
const {recording,currentPayout}=vi.hoisted(()=>({recording:vi.fn(),currentPayout:vi.fn()}));
vi.mock('../server/payments/recording-reads.js',()=>({recordingSummary:recording}));
vi.mock('../server/payouts/service.js',()=>({currentPayout}));
const cycle={id:'85ba6437-2cac-4f43-9d91-96b483e6c2ea',academicYearId:'year',yearCode:'AY2026',semesterId:'semester',semesterCode:'1ST'} as PayoutCycle;
beforeEach(()=>vi.clearAllMocks());
describe('annual discovery summary',()=>{
 it('uses the B1 association and selected-year classification without per-person reads',async()=>{
  const execute=vi.fn().mockResolvedValueOnce([[{classification:'new',n:1},{classification:'continuing',n:2},{classification:null,n:1}]]).mockResolvedValueOnce([[{setting_value:'year'}]]);
  expect(await annualOverview({execute} as unknown as PoolConnection,cycle)).toEqual({academicYearId:'year',yearCode:'AY2026',workingYear:true,total:4,new:1,continuing:2,unknown:1,academic:{known:0,unknown:4,levels:Array.from({length:8},(_,i)=>({level:i===7?null:i+1,label:i===7?'Unknown / unrecognized':i===6?'Year 7+':`Year ${i+1}`,count:i===7?4:0}))}});
  expect(execute).toHaveBeenCalledTimes(2);const [sql,values]=execute.mock.calls[0];expect(values).toEqual(Array(5).fill('year'));
  for(const table of ['scholar_intakes','academic_records','scholarship_records','scholar_semesters'])expect(sql).toContain(table);
  expect(sql).not.toContain('first_entry');expect(sql).not.toContain('human_id LIKE');
 });
 it('keeps genuine zero distinct from excessive scope',async()=>{
  const execute=vi.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);expect((await annualOverview({execute} as unknown as PoolConnection,cycle)).total).toBe(0);
  execute.mockResolvedValueOnce([[{classification:'new',n:5001}]]);await expect(annualOverview({execute} as unknown as PoolConnection,cycle)).rejects.toMatchObject({code:'REPORT_SCOPE_TOO_LARGE'});
 });
});
describe('authoritative payroll aggregate',()=>{
 it('uses each existing Recording aggregate in the selected semester and returns no roster or amounts',async()=>{
  const execute=vi.fn().mockResolvedValue([[{id:'batch-a',cycle_id:'cycle-a'},{id:'batch-b',cycle_id:'cycle-b'}]]);
  recording.mockResolvedValue({batchId:'batch-a',code:'PAY-001',name:'First',state:'processed',total:800,paid:2,pending:798,unclaimed:0,needsReview:0});
  recording.mockResolvedValueOnce({batchId:'batch-b',code:'PAY-002',name:'Second',state:'processed',total:200,paid:0,pending:198,unclaimed:1,needsReview:1});
  const value=await payrollOverview({execute} as unknown as PoolConnection,cycle);expect(value.totals).toEqual({total:1000,paid:2,pending:996,unclaimed:1,needsReview:1});
  expect(execute.mock.calls[0][1]).toEqual(['year','semester']);expect(execute.mock.calls[0][0]).toContain('LIMIT 51');expect(recording).toHaveBeenCalledTimes(2);expect(value.batches[0]).not.toHaveProperty('scholarshipIds');expect(value.scope).toContain('not unique entitlements');
 });
 it('returns empty supported scope and fails closed on oversized or unsupported sources',async()=>{
  const execute=vi.fn().mockResolvedValueOnce([[]]);expect((await payrollOverview({execute} as unknown as PoolConnection,cycle)).totals.total).toBe(0);expect(recording).not.toHaveBeenCalled();
  execute.mockResolvedValueOnce([Array(51).fill({id:'batch'})]);await expect(payrollOverview({execute} as unknown as PoolConnection,cycle)).rejects.toMatchObject({code:'REPORT_SCOPE_TOO_LARGE'});expect(recording).not.toHaveBeenCalled();
  execute.mockResolvedValue([[{id:'legacy',cycle_id:'cycle'}]]);recording.mockRejectedValue(new Error('Existing historical guard'));await expect(payrollOverview({execute} as unknown as PoolConnection,cycle)).rejects.toThrow('Existing historical guard');
 });
 it('rejects mismatched outcome totals rather than drawing partial financial data',async()=>{
  const execute=vi.fn().mockResolvedValue([[{id:'batch',cycle_id:'cycle'}]]);recording.mockResolvedValue({total:3,paid:1,pending:1,unclaimed:0,needsReview:0});await expect(payrollOverview({execute} as unknown as PoolConnection,cycle)).rejects.toMatchObject({code:'PAYROLL_ALLOCATION_MISMATCH'});
 });
});
describe('summary authority',()=>{
 it.each(['annual','payroll'] as const)('checks %s domain permission inside the fresh authorization snapshot',async method=>{
  const query=vi.fn();const readSnapshot=vi.fn(async(_actor,_permission,fn)=>fn({query},{permissions:[{code:'configuration.read'}]}));const service=new DashboardService({readSnapshot} as unknown as AuthorizationService);
  await expect(service[method]('actor',{cycleId:cycle.id})).rejects.toMatchObject({code:'PERMISSION_DENIED'});expect(query).not.toHaveBeenCalled();expect(readSnapshot.mock.calls[0][1]).toBe('configuration.read');
  expect(()=>service[method]('actor',{cycleId:cycle.id,paid:2})).toThrow('Choose a payout cycle');
 });
});
describe('chart presentation',()=>{
 it('keeps every exact payment label and batch destination without redundant financial charts',()=>{
  const counts={total:1000,paid:2,pending:998,unclaimed:0,needsReview:0};expect(outcomeShare(2,1000)).toBe(.002);expect(outcomeShare(0,0)).toBe(0);
  const html=renderToStaticMarkup(<DashboardCharts data={{academicYearId:'year',semesterId:'sem',yearCode:'AY',semesterCode:'1ST',scope:'Current effective payroll rows, not original closures.',totals:counts,batches:[{...counts,batchId:'b',cycleId:'c',code:'PAY-001',name:'Batch',state:'processed'}]}}/>);
  for(const label of ['Paid','Pending','Unclaimed','Needs resolution'])expect(html).toContain('Payment outcome: '+label);
  expect(html).not.toContain('<svg');expect(html).toContain('>998</dd>');expect(html).toContain('>0</dd>');expect(html).toContain('view=recording');expect(html).not.toContain('role="button"');expect(html).not.toContain('Paid percentage');
 });
});
