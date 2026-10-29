/// <reference types="vite/client" />
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {pendingAction} from '../server/notifications/pending-action';
import {noticeLink} from '../server/notifications/service';
import {notificationQuery} from '../server/notifications/queries';
import ScholarProfileFacts from '../src/ScholarProfileFacts';
import type {ScholarDetail} from '../server/scholars/model';
import type {PoolConnection} from 'mysql2/promise';
const row={kind:'payroll',source_id:'batch',batch_id:'batch',cycle_id:'cycle',revision:7,state:'processed',pending_permission:'ovr.process',managed_batch:1};
describe('existing pending authority and actionable destinations',()=>{
 it('explains genuine processed outcomes without treating processing as payment',()=>{
  expect(pendingAction('ovr.process','processed')).toBe('Record remaining payment outcomes');
  expect(pendingAction('ovr.close','processed')).toBe('Reconcile outcomes and close payroll');
  expect(noticeLink(row,true)).toContain('view=recording');
  expect(noticeLink({...row,pending_permission:'ovr.close'},true)).toContain('view=reconciliation');
  expect(noticeLink({...row,managed_batch:0},true)).toContain('task=processing');
  expect(noticeLink(row)).not.toContain('view=');
 });
 it('opens the existing published lock workflow and preserves completed update links',()=>{
  const r={kind:'masterlist',source_id:'list',state:'published',revision:3};
  expect(pendingAction('masterlists.lock','published')).toBe('Lock published official list');
  expect(noticeLink(r,true)).toContain('draft=list&workflow=1');
  expect(noticeLink(r)).not.toContain('workflow=');
  expect(noticeLink({...r,state:'locked'},true)).not.toContain('workflow=');
  expect(pendingAction(null,'closed')).toBeNull();
 });
 it('hydrates numbered-batch destination metadata only for bounded selected details',()=>{
  const db={escape:(v:string)=>`'${v}'`} as PoolConnection,filters={mode:'pending' as const,limit:3,offset:0};
  expect(notificationQuery(db,'actor',['ovr.prepare','ovr.process'],filters,'details',['payroll:batch'])).toContain('EXISTS(SELECT 1 FROM payroll_submission_windows');
  for(const projection of ['count','page','groups'] as const)expect(notificationQuery(db,'actor',['ovr.prepare','ovr.process'],filters,projection)).not.toContain('payroll_submission_windows');
 });
});
describe('selected-year profile facts',()=>{
 const person={placement:{academicYearId:'year',school:'Supplied <school>',course:null,yearLevel:'Year IV',classification:'continuing',provisional:true,scholarshipStanding:'active'}} as ScholarDetail;
 it('preserves escaped identity facts, unknowns and provisional meaning',()=>{
  const html=renderToStaticMarkup(<ScholarProfileFacts person={person} yearId="year"/>);
  expect(html).toContain('Supplied &lt;school&gt;');expect(html).toContain('Initial school (provisional)');expect(html).toContain('Not recorded');expect(html).toContain('Continuing');expect(html).toContain('active');expect(html).not.toContain('Paid');
 });
 it('never carries another year into the current context',()=>{
  const html=renderToStaticMarkup(<ScholarProfileFacts person={person} yearId="other-year"/>);
  expect(html).toContain('not loaded here');expect(html).not.toContain('Supplied');expect(html).not.toContain('Continuing');
 });
});
