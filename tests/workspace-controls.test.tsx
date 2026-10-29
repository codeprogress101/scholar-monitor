/// <reference types="vite/client" />
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import WorkspaceControls,{SidebarAccount} from '../src/WorkspaceControls';
import type {Session} from '../src/auth-api';
import type {Access} from '../server/authorization/policy';
const session:Session={user:{id:'actor',fullName:'Staff <supplied> Name',email:'fictional@example.invalid'},csrfToken:'unused',expiresAt:'unused'};
const access={roles:[{label:'Staff'},{label:'Coordinator'}]} as Access;
const noop=()=>{};
describe('relocated shared controls',()=>{
 it('keeps the complete escaped identity and combined role labels beside one existing logout action',()=>{
  const html=renderToStaticMarkup(<SidebarAccount session={session} access={access} onLogout={noop} signingOut={false}/>);
  expect(html).toContain('aria-label="Signed-in account"');expect(html).toContain('Staff &lt;supplied&gt; Name');
  expect(html).toContain('Staff · Coordinator');expect(html.match(/<button/g)).toHaveLength(1);
  expect(html).toContain('title="Sign out"');expect(html).toContain('aria-label="Sign out"');expect(html).not.toContain('disabled');
  expect(html).toContain('sidebar-account-avatar');expect(html).toContain('sidebar-account-identity');
 });
 it('preserves the signing-out disabled state and honest unassigned role display',()=>{
  const html=renderToStaticMarkup(<SidebarAccount session={session} access={{roles:[]} as unknown as Access} onLogout={noop} signingOut/>);
  expect(html).toContain('No role assigned');expect(html).toContain('disabled');expect(html).toContain('Signing out...');
 });
 it.each([0,1,12,99,100,1250])('uses the original Notifications destination and complete accessible unread count %s',unread=>{
  const feed={data:{unread},error:'',loading:false,refresh:()=>true,update:noop};
  const html=renderToStaticMarkup(<WorkspaceControls notificationCount={feed} menuOpen={false} onOpenNavigation={noop}/>);
  expect(html).toContain('href="#notifications"');expect(html).toContain(`aria-label="Notifications: ${unread} unread"`);
  expect(html).toContain('aria-label="Open navigation"');expect(html).toContain('aria-controls="primary-navigation"');
  expect(html).toContain('aria-expanded="false"');expect(html).not.toContain('<header');
  expect(html).toContain(`title="Notifications: ${unread} unread"`);
  expect(html.includes('notification-unread-badge')).toBe(unread>0);
  if(unread>0)expect(html).toContain(`aria-hidden="true">${unread>99?'99+':unread}</span>`);
 });
 it('retains notification unavailable semantics and the mobile menu expanded state',()=>{
  const feed={data:null,error:'Unavailable',loading:false,refresh:()=>true,update:noop};
  const html=renderToStaticMarkup(<WorkspaceControls notificationCount={feed} menuOpen onOpenNavigation={noop}/>);
  expect(html).toContain('Notifications unavailable');expect(html).toContain('aria-expanded="true"');
  expect(html).not.toContain('0 unread');
  expect(html).not.toContain('notification-unread-badge');
 });
 it('keeps loading separate from zero and hides stale counts when unavailable',()=>{
  const loading=renderToStaticMarkup(<WorkspaceControls notificationCount={{data:null,error:'',loading:true,refresh:()=>true,update:noop}} menuOpen={false} onOpenNavigation={noop}/>);
  expect(loading).toContain('Notifications, loading');expect(loading).not.toContain('0 unread');
  const stale=renderToStaticMarkup(<WorkspaceControls notificationCount={{data:{unread:120},error:'Unavailable',loading:false,refresh:()=>true,update:noop}} menuOpen={false} onOpenNavigation={noop}/>);
  expect(stale).toContain('Notifications unavailable');expect(stale).not.toContain('99+');
 });
 it('retains complete long names and multiple roles without creating an account menu',()=>{
  const fullName='A very long supplied account name with accents Ñé and additional family names';
  const html=renderToStaticMarkup(<SidebarAccount session={{...session,user:{...session.user,fullName}}} access={access} onLogout={noop} signingOut={false}/>);
  expect(html).toContain(fullName);expect(html).toContain('Staff · Coordinator');expect(html).not.toContain('aria-haspopup');
 });
});
