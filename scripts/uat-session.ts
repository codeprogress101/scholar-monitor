// Fresh authenticated session for one already-owned synthetic fixture.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import {owned,folder} from './uat-environment.mjs';
import {loadConfig} from '../server/config.js';
import {buildApp} from '../server/app.js';
export async function session(scenario:string) {
 const {db,metadata}=await owned(scenario),secrets=JSON.parse(await readFile(`${folder}/private/${scenario}-credentials.json`,'utf8'));await db.end();
 const admin=mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:metadata.database,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z',connectionLimit:4});
 const runtime=mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:metadata.database,user:secrets.runtimeUser,password:secrets.runtimePassword,timezone:'Z',connectionLimit:8});
 const origin='http://127.0.0.1:3003',app=buildApp(loadConfig({APP_ENV:'test',APP_ORIGIN:origin,INDIVIDUAL_PAYMENTS_ENABLED:'true',OMITTED_PAYMENTS_ENABLED:'true',INDIVIDUAL_DOCUMENTS_ENABLED:'true',INDIVIDUAL_SETTLEMENT_ENABLED:'true'}),{database:{pool:runtime,check:async()=> 'connected',close:async()=>{}}});
 const accounts=new Map<string,{cookie:string;csrf:string}>();
 for(const role of ['staff','coordinator','system_admin','unassigned']) {
  const r=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin,'content-type':'application/json'},payload:{email:role+'@example.invalid',password:secrets.accountPassword}});assert.equal(r.statusCode,200);
  accounts.set(role,{cookie:String(r.headers['set-cookie']).split(';')[0],csrf:r.json().csrfToken});
 }
 const request=(role:string,url:string,body?:object,key:string=randomUUID())=>{const a=accounts.get(role)!;return app.inject({method:body?'POST':'GET',url,headers:{origin,cookie:a.cookie,...(body?{'content-type':'application/json','x-csrf-token':a.csrf,'idempotency-key':key}:{})},...(body?{payload:body}:{})});};
 return {admin,runtime,app,request,metadata,database:metadata.database,scenario,close:async()=>{await app.close();await runtime.end();await admin.end();}};
}
