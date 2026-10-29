import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseMonitoringQuery} from '../server/scholars/graduation-monitoring';
import {normalizedMonitoringLevel,potentialIndicator,type MonitoringList} from '../server/scholars/graduation-monitoring-model';
import {MonitoringTable} from '../src/GraduationMonitoring';
const id='12345678-1234-4234-8234-123456789012';
describe('A6.1 evidence-based monitoring',()=>{
 it.each([['4th Year',4],['Year IV',4],['V',5],['fifth year',5],['4 of 5',null],['',null],['4th-year maybe',null]])('normalizes only explicit supported academic label %s',(input,level)=>expect(normalizedMonitoringLevel(input as string)).toBe(level));
 it.each([[4,4,'potentially_graduating'],[4,5,'not_final_year'],[5,5,'potentially_graduating'],[6,5,'cannot_determine'],[4,null,'cannot_determine']])('requires applicable official duration, year %s / duration %s',(year,duration,expected)=>{
  expect(potentialIndicator({yearLevel:String(year),approvedPlacement:true,applicableOfficialDurationYears:duration as number|null,finalYearLevel:duration as number|null})).toBe(expected);
 });
 it('does not derive graduation, expectation or delay from initial facts, a course name, or a passed duration',()=>{
  expect(potentialIndicator({yearLevel:'4',approvedPlacement:false,applicableOfficialDurationYears:4,finalYearLevel:4})).toBe('cannot_determine');
  expect(potentialIndicator({yearLevel:'5',approvedPlacement:true,applicableOfficialDurationYears:null,finalYearLevel:null})).toBe('cannot_determine');
 });
 it('validates strict bounded context before querying',()=>{
  expect(parseMonitoringQuery({academicYearId:id})).toMatchObject({limit:25,offset:0,filter:'final_year_review'});
  for(const bad of [{},{academicYearId:''},{academicYearId:id,limit:101},{academicYearId:id,offset:-1},{academicYearId:id,filter:'auto_graduate'},{academicYearId:id,approved:true},{academicYearId:id,q:'\u0000'}])expect(()=>parseMonitoringQuery(bad)).toThrow();
 });
 it('renders unknown evidence, full names, semantic headers and valid year-scoped read destinations without approval buttons',()=>{
  const data:MonitoringList={items:[{id,scholarId:'LDSS-2026-00001',name:'Long fictional scholar name',school:null,course:null,yearLevel:null,provisional:true,durationYears:null,indicator:'cannot_determine',explanation:'Current academic placement is missing.',graduationRequestId:null}],total:1,limit:25,offset:0,academicYear:{id,name:'Synthetic year'},semester:null,durationSourceAvailable:false,reviewSourceAvailable:false};
  const html=renderToStaticMarkup(createElement(MonitoringTable,{data,permissions:['scholars.read']}));
  expect(html).toContain('scope="col"');expect(html).toContain('scope="row"');expect(html).toContain('Cannot Determine Automatically');expect(html).toContain('Unknown — reference needed');expect(html).toContain('Long fictional scholar name');expect(html).toContain('academicYear='+id);expect(html).not.toContain('Review scholarship standing');expect(html).not.toContain('<button');
  const staff=renderToStaticMarkup(createElement(MonitoringTable,{data,permissions:['scholars.read','scholarship.status.request']}));expect(staff).toContain('Review scholarship standing');expect(staff).toContain('section=scholarship');expect(staff).not.toContain('Approve');
  expect(html).toContain('aria-label="Review monitoring evidence for LDSS-2026-00001"');
  expect(html).toContain('aria-label="Review academic record for LDSS-2026-00001"');
  expect(html).toContain('<summary>Status details</summary><p>Current academic placement is missing.</p>');
  expect(html).not.toContain('<details open');
  expect(staff).toContain('aria-label="Review scholarship standing for LDSS-2026-00001"');
 });
});
