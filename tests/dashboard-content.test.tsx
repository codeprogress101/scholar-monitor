import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {YearLevelChart,ClassificationChart,classificationPercent} from '../src/DashboardScholarCharts';
import type {AnnualOverview} from '../server/dashboard/overview';

const annual=(counts:number[]):AnnualOverview=>({academicYearId:'y',yearCode:'AY',workingYear:true,total:counts.reduce((a,b)=>a+b,0),new:1,continuing:2,unknown:3,academic:{known:counts.slice(0,7).reduce((a,b)=>a+b,0),unknown:counts[7],levels:counts.map((count,index)=>({level:index===7?null:index+1,label:index===7?'Unknown / unrecognized':index===6?'Year 7+':`Year ${index+1}`,count}))}});
describe('concise Dashboard evidence',()=>{
 it('retains every exceptional level in a closed disclosure and scales visible bars to the whole cohort',()=>{
  const html=renderToStaticMarkup(<YearLevelChart data={annual([2,0,0,0,0,1,2,3])}/>);
  const visible=html.slice(0,html.indexOf('<details'));
  for(const year of [1,2,3,4,5])expect(visible).toContain(`Year ${year}`);
  expect(visible).not.toContain('Year 6');expect(visible).not.toContain('Unknown / unrecognized');
  expect(visible).toContain('width="250"');
  expect(html).toContain('Other / Unknown levels (6)');expect(html).not.toContain('<details open');
  for(const label of ['Year 6','Year 7+','Unknown / unrecognized'])expect(html).toContain(label);
  for(const count of [1,2,3])expect(html).toContain(`>${count}</span>`);
 });
 it('omits an empty supplementary disclosure without removing the five visible zero rows',()=>{
  const html=renderToStaticMarkup(<YearLevelChart data={annual(Array(8).fill(0))}/>);
  expect(html).not.toContain('Other / Unknown levels');
  expect(html.match(/<dt>Year /g)).toHaveLength(5);
  expect(html).toContain('Year-level source');expect(html).toContain('initial registration'.replace(/^i/,'I'));
 });
 it('shows exact classification counts and readable percentages without inflating tiny shares',()=>{
  const value=annual([5000,0,0,0,0,0,0,0]);value.new=1;value.continuing=4999;value.unknown=0;
  const html=renderToStaticMarkup(<ClassificationChart data={value}/>);
  expect(classificationPercent(1,5000)).toBe('0.02%');
  expect(classificationPercent(0,0)).toBe('0%');
  expect(html).toContain('0.02%');expect(html).toContain('99.98%');expect(html).toContain('>4,999 ');
  expect(html).toContain('Annual classification, not admission approval.');
 });
});
