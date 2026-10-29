import type {RowDataPacket} from 'mysql2/promise';
import {session} from './uat-session.js';
import {save,folder} from './uat-environment.mjs';
import {AuthorizationService} from '../server/authorization/service.js';
import {PaymentRecordingService} from '../server/payments/recording-service.js';
import {PayrollReconciliationService} from '../server/payments/reconciliation-service.js';
import {FinancialReportService} from '../server/payments/report-service.js';
import {IndividualPaymentService} from '../server/payments/individual-service.js';
import {ScholarService} from '../server/scholars/service.js';
import {DashboardService} from '../server/dashboard/service.js';
import {OvrService} from '../server/ovr/service.js';
const scenario=process.argv.includes('--pending-only')?'A':'B',c=await session(scenario),runs:({name:string;ms:number;selects:number;bytes:number}&Record<string,unknown>)[]=[];let selects=0,sqlMs=0;
const get=c.runtime.getConnection.bind(c.runtime);
c.runtime.getConnection=async()=>new Proxy(await get(),{get(target,key){const fn=Reflect.get(target,key);if(key!=='execute'&&key!=='query')return typeof fn==='function'?fn.bind(target):fn;return async(...args:unknown[])=>{const t=performance.now();try{return await (fn.bind(target) as (...args:unknown[])=>Promise<unknown>)(...args);}finally{sqlMs+=performance.now()-t;if(/^\s*SELECT\b/i.test(String(args[0])))selects++;}};}});
try {
 const [[staff]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM users WHERE email='staff@example.invalid'");
 const auth=new AuthorizationService(c.runtime),recording=new PaymentRecordingService(auth),recon=new PayrollReconciliationService(auth),reports=new FinancialReportService(auth),individual=new IndividualPaymentService(auth,true),registry=new ScholarService(auth),dashboard=new DashboardService(auth);
 const batch=c.metadata.batchId,actor=staff.id;
 const operations:[string,()=>Promise<unknown>][]=[['summary',()=>recording.summary(actor,batch)],['roster_page',()=>recording.page(actor,batch,{limit:25,offset:0,q:''})],['search',()=>recording.page(actor,batch,{limit:25,offset:0,q:'LDSS-2026-00017'})],['registry',()=>registry.list(actor,{scope:'all',limit:25})],['scholar_search',()=>registry.list(actor,{q:'ReceiptVolume0042',scope:'all',limit:25})],['individual_queue',()=>individual.page(actor,{q:'',limit:25,offset:0})],['reconciliation_summary',()=>recon.summary(actor,batch)],['financial_report',()=>reports.page(actor,batch,{basis:'provisional',limit:25})],['dashboard',()=>dashboard.read(actor,{cycleId:c.metadata.cycleId})]];
 for(const [name,run] of operations.filter(([name])=>scenario==='B'||['summary','roster_page','search'].includes(name)))for(let sample=0;sample<3;sample++) {
  global.gc?.();selects=0;sqlMs=0;const start=performance.now(),before=process.memoryUsage();let sampledRss=before.rss;const timer=setInterval(()=>{sampledRss=Math.max(sampledRss,process.memoryUsage().rss);},20);
  try {const value=await run();runs.push({name,sample,ms:performance.now()-start,selects,sqlMs,bytes:Buffer.byteLength(JSON.stringify(value)),before,after:process.memoryUsage(),sampledRss:Math.max(sampledRss,process.memoryUsage().rss)});}finally{clearInterval(timer);}
 }
 const report=await reports.page(actor,batch,{basis:'provisional',limit:25});
 for(const format of (scenario==='B'?['xlsx','pdf']:[]) as ('xlsx'|'pdf')[]) {
  global.gc?.();selects=0;sqlMs=0;const start=performance.now();const file=await reports.export(actor,batch,{basis:'provisional',outcome:'all',sourceHash:report.sourceHash,format},'synthetic-uat-benchmark');runs.push({name:'export_'+format,samples:1,ms:performance.now()-start,selects,sqlMs,bytes:file.buffer.length,after:process.memoryUsage()});
 }
 if(process.argv.includes('--legacy-detail')) {global.gc?.();selects=0;sqlMs=0;const start=performance.now(),before=process.memoryUsage();let peak=before.rss;const timer=setInterval(()=>{peak=Math.max(peak,process.memoryUsage().rss);},20);try{const detail=await new OvrService(auth).read(actor,batch);runs.push({name:'existing_full_detail',samples:1,ms:performance.now()-start,selects,sqlMs,bytes:Buffer.byteLength(JSON.stringify(detail)),sampledRss:Math.max(peak,process.memoryUsage().rss),after:process.memoryUsage()});}finally{clearInterval(timer);}}
 await save(folder+(scenario==='A'?'/benchmark-pending.json':'/benchmark.json'),{at:new Date().toISOString(),database:c.database,sourceMembers:835,explicitGc:typeof global.gc==='function',conditions:'Post-setup isolated fixture, local MariaDB and restricted runtime, direct services with fresh authorization per operation; three sequential reads including first-use overhead, single exports/legacy detail. Other workstation processes may run. Names/payload and supplementary profiles differ from P10; only matching method, membership and SQL scope support direct query-count comparison. Timings are unpaired observations, not a causal regression test or LAN capacity certification.',runs});
 console.log(JSON.stringify(runs.map(({name,ms,selects,bytes})=>({name,ms,selects,bytes}))));
}finally{c.runtime.getConnection=get;await c.close();}
