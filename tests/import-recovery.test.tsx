import {afterEach,describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ScholarImport from '../src/ScholarImport';
import {pendingPrior,retainPriorCommand} from '../src/prior-command';
const actor='12345678-1234-4234-8234-123456789012',job='22345678-1234-4234-8234-123456789012',key='32345678-1234-4234-8234-123456789012';
const saved={id:job,key,body:{hash:'a'.repeat(64),confirm:true}};
const session={user:{id:actor,email:'coordinator@example.invalid',fullName:'Synthetic Coordinator'},csrfToken:'synthetic',expiresAt:'2026-10-26T00:00:00Z'};
afterEach(()=>{retainPriorCommand(actor,null);vi.unstubAllGlobals();});
describe('A2.1 import recovery ownership',()=>{
 it('restores the exact retained confirmation without submitting or selecting approval',()=>{
  vi.stubGlobal('window',{location:{hash:`#scholars?importJob=${job}`}});vi.stubGlobal('sessionStorage',{getItem:()=>JSON.stringify(saved)});
  const html=renderToStaticMarkup(createElement(ScholarImport,{session,onImported:()=>{throw Error('Read rendered a command');}}));
  expect(pendingPrior(actor)).toEqual({path:`imports/${job}/confirm`,key,body:saved.body,route:'scholars'});expect(html).toContain('Retry saved import');expect(html).not.toContain('checked=""');
 });
 it('does not overwrite a retained financial command with a saved import',()=>{
  const financial={path:'ovr-batches/retained/payment-operations',key:'kept',body:{operation:'synthetic-kept'},route:'payouts' as const};retainPriorCommand(actor,financial);
  vi.stubGlobal('window',{location:{hash:'#scholars'}});vi.stubGlobal('sessionStorage',{getItem:()=>JSON.stringify(saved)});
  const html=renderToStaticMarkup(createElement(ScholarImport,{session,onImported:()=>{}}));expect(pendingPrior(actor)).toEqual(financial);expect(html).toContain('Resolve your retained command');expect(html).not.toContain('Retry saved import');
 });
});
