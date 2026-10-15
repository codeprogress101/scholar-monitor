import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import type {Connection,Pool,RowDataPacket} from "mysql2/promise";
import type {LightMyRequestResponse} from "fastify";
import {AuthorizationService} from "../server/authorization/service.js";
export async function testSnapshot({admin,runtime,request,cycleId,annualId,batch}:{admin:Connection;runtime:Pool;request:(role:string,path:string)=>Promise<LightMyRequestResponse>;cycleId:string;annualId:string;batch:string}){
 const [[identity]]=await admin.query<RowDataPacket[]>("SELECT DATABASE() AS name");assert.match(identity.name,/^ldss_f19_test_\d+_[a-f0-9]{8}$/);
 const [[user]]=await admin.query<RowDataPacket[]>("SELECT id,version FROM users WHERE email='staff@example.invalid'");
 const authorization=new AuthorizationService(runtime);
 let entered!:()=>void,release!:()=>void;
 const ready=new Promise<void>(r=>entered=r),finish=new Promise<void>(r=>release=r);
 const snapshot=authorization.readSnapshot(user.id,"ovr.prepare",async db=>{await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");entered();await finish;return "snapshot";});
 await ready;
 try{await Promise.race([authorization.withPermission(user.id,"ovr.prepare",async()=>true),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Read snapshot blocked mutation guard")),3000))]);}
 finally{release();}
 assert.equal(await snapshot,"snapshot");
 let reached!:()=>void,resume!:()=>void;const started=new Promise<void>(r=>reached=r),proceed=new Promise<void>(r=>resume=r);
 const revoked=authorization.readSnapshot(user.id,"ovr.prepare",async()=>{reached();await proceed;return "private";});
 const denied=assert.rejects(revoked,(e:{code?:string})=>e.code==="PERMISSION_CHANGED");await started;
 await admin.execute("UPDATE users SET version=version+1 WHERE id=?",[user.id]);resume();await denied;
 await admin.execute("UPDATE users SET version=? WHERE id=?",[user.version,user.id]);
 console.log("PASS consistent snapshot does not hold financial guard; permission revision changed during read prevents return");
 const [[annual]]=await admin.execute<RowDataPacket[]>("SELECT * FROM scholarship_records WHERE id=?",[annualId]);
 const [[scholar]]=await admin.execute<RowDataPacket[]>("SELECT * FROM scholars WHERE id=?",[annual.scholar_id]);
 const [[academic]]=await admin.execute<RowDataPacket[]>("SELECT * FROM academic_records WHERE scholar_id=? AND academic_year_id=?",[annual.scholar_id,annual.academic_year_id]);
 const [[count]]=await admin.execute<RowDataPacket[]>("SELECT COUNT(*) n FROM scholarship_records WHERE academic_year_id=?",[annual.academic_year_id]);
 for(let i=Number(count.n);i<1000;i++){
  const id=randomUUID();await admin.query("INSERT INTO scholars SET ?",[{...scholar,id,last_name:`Synthetic ${i}`,first_name:"Read workload"}]);
  await admin.query("INSERT INTO academic_records SET ?",[{...academic,id:randomUUID(),scholar_id:id}]);
  await admin.query("INSERT INTO scholarship_records SET ?",[{...annual,id:randomUUID(),scholar_id:id}]);
 }
 const results=[];
 for(const concurrency of [1,5])for(const [name,path] of [["dashboard",`/api/v1/dashboard?cycleId=${cycleId}`],["payroll",`/api/v1/ovr-batches/${batch}`],["report",`/api/v1/reports/operational?cycleId=${cycleId}&kind=eligibility&limit=25`]]){
  const started=performance.now();const times=await Promise.all(Array.from({length:concurrency},async(_,index)=>{const t=performance.now();const response=await request(`performance_${index+1}`,path);assert.equal(response.statusCode,200,response.body);return Math.round(performance.now()-t);}));
  results.push({name,concurrency,milliseconds:times,wallMilliseconds:Math.round(performance.now()-started)});
 }
 await mkdir("output/readiness-remediation-20261010",{recursive:true});await writeFile("output/readiness-remediation-20261010/performance.json",JSON.stringify({recordedAt:new Date().toISOString(),synthetic:true,scholars:1000,coverage:"API injection, five simultaneous requests; additional scholars have placement/annual records but no approved compliance or payroll membership. Five independent authenticated Staff accounts; API injection, not browser operators.",results},null,2));
 console.log("PASS 1,000-scholar mixed-readiness fixture: dashboard, payroll and reports at one/five concurrent requests; latency recorded, office targets not asserted");
}
