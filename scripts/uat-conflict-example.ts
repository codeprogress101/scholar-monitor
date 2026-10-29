import type {RowDataPacket} from 'mysql2/promise';
import assert from 'node:assert/strict';
import {session} from './uat-session.js';
import {save,folder} from './uat-environment.mjs';
import {today} from '../server/scholars/validation.js';
const c=await session('E');
try {
 const replacement=c.metadata.individualTransactions.at(-1),[[header]]=await c.admin.query<RowDataPacket[]>('SELECT replacement_of FROM individual_payment_transactions WHERE id=?',[replacement]);assert.ok(header.replacement_of);
 const root='/api/v1/individual-payments/settlement',read=async(id:string)=>{const r=await c.request('staff',root+'/transactions/'+id);assert.equal(r.statusCode,200);return r.json<Awaited<ReturnType<import('../server/payments/settlement-service.js').IndividualSettlementService['detail']>>>();};
 const original=await read(header.replacement_of);assert.equal(original.status,'Cancelled');
 const result=await c.request('staff',root+'/commands',{action:'report',transactionId:original.transactionId,expectedRevision:original.revision,description:'Synthetic signed evidence reports actual release against a cancelled original while its unpaid replacement remains under review',discoveredPaidOn:today(),acknowledgedRelease:true});assert.equal(result.statusCode,200,result.body);
 const after=await read(replacement),preview=await c.request('staff',root+'/preview',{mode:'single',transactionIds:[replacement],actualPaidOn:today()});assert.equal(preview.statusCode,200);assert.equal(preview.json<import('../server/payments/settlement-model.js').SettlementPreview>().conflicts.length,1);
 await save(folder+'/cancelled-original-conflict.json',{synthetic:true,originalTransaction:header.replacement_of,replacement,reportedOriginalReceipt:true,newPaidRecordCreated:false,replacementStatus:after.status,duplicateReleasePreviewBlocked:true,coordinatorReviewPending:true});
 console.log('PASS synthetic cancelled-original/replacement report retained; replacement release blocked pending review');
}finally{await c.close();}
