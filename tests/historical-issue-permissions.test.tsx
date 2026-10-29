import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ScholarIssueAction from '../src/ScholarIssueAction';

it('shows only permitted existing actions for Staff, Coordinator, pure Administrator and unassigned viewers',()=>{
 const render=(code:string,permissions:string[])=>renderToStaticMarkup(<ScholarIssueAction code={code} scholarId="student" yearId="year" permissions={permissions}/>);
 const staff=['scholars.read','academic.edit','requirements.receive'];
 const coordinator=[...staff,'masterlists.approve','academic.changes.approve','requirements.verify','semesters.configure'];
 expect(render('ACADEMIC_RECORD_REQUIRED',staff)).toContain('href=');
 expect(render('PRIOR_BATCH_APPROVAL_REQUIRED',staff)).not.toContain('href=');
 expect(render('PRIOR_BATCH_APPROVAL_REQUIRED',coordinator)).toContain('href="#scholars"');
 for(const permissions of [staff,coordinator,['users.manage'],[]]){
  expect(render('HISTORICAL_BATCH_APPROVAL_REQUIRED',permissions)).not.toContain('href=');
  expect(render('HISTORICAL_BATCH_APPROVAL_REQUIRED',permissions)).toContain('Payroll source review required');
 }
 for(const permissions of [['users.manage'],[]])expect(render('ACADEMIC_RECORD_REQUIRED',permissions)).not.toContain('href=');
});
