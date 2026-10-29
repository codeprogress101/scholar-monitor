import {afterEach,describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {recoveryQuery} from '../server/payments/deferred-recovery';
import {discoveryQuery} from '../server/payments/discovery-model';
import DeferredRecoveryDialog from '../src/DeferredRecoveryDialog';
import type {DiscoveryRow} from '../server/payments/discovery-model';
import {rememberPayroll} from '../src/payroll-navigation';
const id='12345678-1234-4234-9234-123456789abc';
afterEach(()=>vi.unstubAllGlobals());
describe('Deferred recovery read contracts',()=>{
 it('requires one exact origin and annual identity',()=>expect(recoveryQuery({sourceBatchId:id,scholarshipId:id})).toEqual({sourceBatchId:id,scholarshipId:id}));
 it.each([{},null,{sourceBatchId:id},{sourceBatchId:'bad',scholarshipId:id},{sourceBatchId:id,scholarshipId:id,restore:true}])('rejects invalid scope or command-like fields %j',raw=>expect(()=>recoveryQuery(raw)).toThrow());
 it('keeps Needs Review explicit with existing pagination and search bounds',()=>{expect(discoveryQuery({academicYearId:id,semesterId:id,filter:'review',q:'  Test  ',limit:25})).toMatchObject({filter:'review',q:'Test',limit:25,offset:0});});
 it('preserves the existing recovery destination only for the same payroll',()=>{const replaceState=vi.fn();vi.stubGlobal('window',{location:{hash:`#payouts?cycle=${id}&batch=${id}&annual=${id}&recovery=deferral`},history:{replaceState},dispatchEvent:vi.fn()});rememberPayroll(id,id);expect(replaceState.mock.calls[0][2]).toContain('recovery=deferral');rememberPayroll(id,'22345678-1234-4234-9234-123456789abc');expect(replaceState.mock.calls[1][2]).not.toContain('recovery=');});
 it('opens only a read-only focused review with cancel and inline loading',()=>{vi.stubGlobal('document',undefined);const row={name:'Fictional test scholar',humanId:'TEST-ID',scholarshipId:id,deferrals:[{batchId:id,code:'PAY-TEST'}]} as DiscoveryRow;const html=renderToStaticMarkup(<DeferredRecoveryDialog row={row} onClose={()=>{}} onIndividual={()=>{}}/>);expect(html).toContain('Deferred scholar recovery');expect(html).not.toContain('Confirm restoration');expect(html).not.toContain('Record payment');});
});
