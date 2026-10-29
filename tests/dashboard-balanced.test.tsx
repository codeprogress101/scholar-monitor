import {describe,expect,it,vi} from 'vitest';
import type {PoolConnection} from 'mysql2/promise';
import type {PayoutCycle} from '../server/payouts/model';
import {annualOverview,type AnnualOverview} from '../server/dashboard/overview';
import {renderToStaticMarkup} from 'react-dom/server';
import DashboardScholarCharts from '../src/DashboardScholarCharts';
import {graduationDashboardLink} from '../src/DashboardPage';

const cycle={academicYearId:'year',yearCode:'AY'} as PayoutCycle;
const run=async(rows:unknown[])=>{
 const execute=vi.fn().mockResolvedValueOnce([rows]).mockResolvedValueOnce([[{setting_value:'year'}]]);
 return {value:await annualOverview({execute} as unknown as PoolConnection,cycle),execute};
};
describe('selected-year academic aggregation',()=>{
 it('shares one bounded group read with classification and keeps unsupported placement Unknown',async()=>{
  const {value,execute}=await run([
   {classification:'new',academic_level:'I',n:2},
   {classification:'continuing',academic_level:'Year IV',n:3},
   {classification:null,academic_level:null,n:1},
   {classification:'continuing',academic_level:'Foundation',n:2},
   {classification:'continuing',academic_level:'7',n:1},
   {classification:'continuing',academic_level:'100th year',n:1},
  ]);
  expect(value).toMatchObject({total:10,new:2,continuing:7,unknown:1,academic:{known:7,unknown:3}});
  expect(value.academic.levels.map(g=>g.count)).toEqual([2,0,0,3,0,0,2,3]);
  expect(execute).toHaveBeenCalledTimes(2);
  const [sql,args]=execute.mock.calls[0];expect(args).toEqual(Array(5).fill('year'));
  expect(sql).toContain('CASE WHEN a.id IS NOT NULL THEN CASE WHEN ac.id IS NOT NULL');
  expect(sql).toContain('academic_change_decisions');expect(sql).toContain("decision='approve'");
  expect(sql).toContain('MAX(ad2.resulting_version)');expect(sql).toContain('utf8mb4_bin');
  expect(sql).toContain('LIMIT 5001');expect(sql).not.toContain('first_entry');
 });
 it('distinguishes genuine empty association from a person without recognized academic facts',async()=>{
  const empty=(await run([])).value,unknown=(await run([{classification:'new',academic_level:null,n:1}])).value;
  expect(empty.academic.known+empty.academic.unknown).toBe(0);
  expect(unknown.total).toBe(1);expect(unknown.academic.unknown).toBe(1);
  expect(unknown.academic.levels.at(-1)?.count).toBe(1);
 });
 it('rejects oversized scope without partial academic or classification totals',async()=>{
  await expect(run([{classification:'new',academic_level:'1',n:5001}])).rejects.toMatchObject({code:'REPORT_SCOPE_TOO_LARGE'});
 });
});
describe('balanced presentation',()=>{
 it('shows exact classification, year-level and zero counts with no graduation inference',async()=>{
  const {value}=await run([{classification:'new',academic_level:'4',n:2},{classification:'continuing',academic_level:'5',n:998}]);
  const html=renderToStaticMarkup(<DashboardScholarCharts data={value}/>);
  for(const label of ['Scholar classification','New','Continuing','Unknown','Scholars by year level'])expect(html).toContain(label);
  expect(html).toContain('>998 ');expect(html).toContain('>0 ');expect(html).not.toContain('Other / Unknown levels');
  expect(html).toContain('does not establish graduation eligibility');
  expect(html).not.toContain('Potentially Graduating');
  expect(html).toContain('width="2"');
 });
 it('keeps zero visible and has no nonzero donut arc in an empty year',async()=>{
  const html=renderToStaticMarkup(<DashboardScholarCharts data={(await run([])).value}/>);
  expect(html).toContain('No associated scholars');expect(html).not.toContain('stroke-dasharray');
 });
 it('links supported monitoring filters with the exact selected year and semester',()=>{
  const params=new URLSearchParams(graduationDashboardLink('y','s','final_year_review').split('?')[1]);
  expect(Object.fromEntries(params)).toEqual({task:'graduation',academicYearId:'y',semesterId:'s',filter:'final_year_review'});
 });
 it('retains classification and shows unavailable academic data for a legacy D1 response',()=>{
  const legacy={academicYearId:'y',yearCode:'AY',workingYear:true,total:1,new:1,continuing:0,unknown:0} as AnnualOverview;
  const html=renderToStaticMarkup(<DashboardScholarCharts data={legacy}/>);
  expect(html).toContain('Scholar classification');expect(html).toContain('Year-level data is unavailable');
  expect(html).not.toContain('d12-level-list');
 });
});
