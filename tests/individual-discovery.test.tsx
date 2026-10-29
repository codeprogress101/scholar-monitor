import {afterEach,describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {discoveryQuery} from '../server/payments/discovery-model';
import IndividualPaymentDiscovery from '../src/IndividualPaymentDiscovery';
import IndividualPayments from '../src/IndividualPayments';
import {retainPriorCommand} from '../src/prior-command';
import type {Session} from '../src/auth-api';
const id='12345678-1234-4234-9234-123456789abc',scope={academicYearId:id,semesterId:id};
afterEach(()=>{retainPriorCommand(id,null);vi.unstubAllGlobals();});
describe('Read-only Individual Payments discovery',()=>{
 it('requires an explicit period and keeps existing bounded pagination',()=>{expect(discoveryQuery(scope)).toEqual({...scope,filter:'unassigned',q:'',offset:0,limit:25});expect(discoveryQuery({...scope,filter:'deferred',sourceBatchId:id,limit:'100',offset:'25',q:'  scholar  '})).toMatchObject({limit:100,offset:25,q:'scholar'});});
 it.each([null,[],{}, {...scope,semesterId:'wrong'},{...scope,filter:'payable'},{...scope,limit:101},{...scope,limit:0},{...scope,offset:-1},{...scope,offset:100001},{...scope,q:'a'.repeat(161)},{...scope,paid:true},{...scope,skipValidation:true},{...scope,sourceBatchId:'wrong'}])('rejects invalid periods, widened scope and write-like fields: %j',raw=>expect(()=>discoveryQuery(raw)).toThrow());
 it('uses inline read loading without any financial confirmation or command',()=>{vi.stubGlobal('location',{hash:'#individual-payments'});const html=renderToStaticMarkup(<IndividualPaymentDiscovery/>);expect(html).toContain('Not Yet on Payroll');expect(html).toContain('Loading academic periods');expect(html).toContain('Discovery does not authorize payment');expect(html).not.toContain('Record Payment Request');expect(html).not.toContain('<dialog');});
 it('adds discovery without defaulting a retained Unclaimed command away from recovery',()=>{const location={hash:'#individual-payments'},command={path:'individual-payments/commands',key:id,body:{action:'request',paymentId:id,expectedRevision:0},route:'individual-payments' as const};vi.stubGlobal('window',{location});vi.stubGlobal('location',location);vi.stubGlobal('sessionStorage',{getItem:(key:string)=>key===`ldss-individual-command:${id}`?JSON.stringify(command):null});const html=renderToStaticMarkup(<IndividualPayments session={{user:{id}} as Session} permissions={['ovr.process']}/>);expect(html).toContain('Not Yet on Payroll');expect(html).toContain('Unclaimed Stipends');expect(html).toContain('Retry saved request');expect(html).not.toContain('Loading discovery');});
});
