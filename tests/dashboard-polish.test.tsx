import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import DashboardCharts from '../src/DashboardCharts';
import {cycleDescription,cycleOptionLabel} from '../src/DashboardPage';

describe('Dashboard presentation safeguards',()=>{
 it('shortens only display wording and retains the complete original cycle description',()=>{
  const name='A very long supplied payout-cycle description, retained exactly';
  expect(cycleOptionLabel(name)).toBe(Array.from(name).slice(0,23).join('')+'…');
  expect(cycleDescription({name,yearCode:'AY',semesterCode:'FIRST',state:'open'})).toBe(name+' / AY / FIRST (open)');
  expect(cycleOptionLabel('Normal cycle')).toBe('Normal cycle');
  expect(Array.from(cycleOptionLabel('𐐀'.repeat(25)))).toHaveLength(24);
 });
 it.each([0,2])('retains exact accessible counts in the smaller section with %s Paid rows',paid=>{
  const counts={total:1000,paid,pending:1000-paid,unclaimed:0,needsReview:0};
  const html=renderToStaticMarkup(<DashboardCharts data={{academicYearId:'y',semesterId:'s',yearCode:'AY',semesterCode:'S',scope:'Effective rows, not unique entitlements or original closures.',totals:counts,batches:[{...counts,batchId:'b',cycleId:'c',code:'PAY-001',name:'Original batch name',state:'processed'}]}}/>);
  expect(html).not.toContain("<svg");
  for(const label of ['Paid','Pending','Unclaimed','Needs resolution'])expect(html).toContain('Payment outcome: '+label);
  expect(html).toContain('not unique entitlements or original closures');
  expect(html).toContain('Original batch name');
  expect(html).toContain(`>${(1000-paid).toLocaleString()}</dd>`);
  expect(html).toContain('>0</dd>');
 });
 it('keeps an empty supported period distinct from unavailable data',()=>{
  const html=renderToStaticMarkup(<DashboardCharts data={{academicYearId:'y',semesterId:'s',yearCode:'AY',semesterCode:'S',scope:'Effective rows.',totals:{total:0,paid:0,pending:0,unclaimed:0,needsReview:0},batches:[]}}/>);
  expect(html).toContain('No finalized numbered payrolls');
  expect(html).not.toContain('stroke-dasharray');
  expect(html).not.toContain('Unavailable');
 });
});
