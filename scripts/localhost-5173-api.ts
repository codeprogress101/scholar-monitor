// Local-only profile for the explicitly authorized primary UAT transition.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadConfig} from '../server/config.js';
import {createDatabase} from '../server/database.js';
import {buildApp} from '../server/app.js';

const folder='output/5173-synthetic-primary-20261024';
const flags={INDIVIDUAL_PAYMENTS_ENABLED:'true',OMITTED_PAYMENTS_ENABLED:'true',INDIVIDUAL_DOCUMENTS_ENABLED:'true',INDIVIDUAL_SETTLEMENT_ENABLED:'true',HISTORICAL_MULTIBATCH_ENABLED:'true'} as const;
type Manifest={database:string;runtimeUser:string;originalDatabase:string;sourceDatabase:string;state:string;origin:string;port:number};
const profile=process.argv[2];assert.ok(profile==='synthetic'||profile==='original','Select synthetic or original explicitly');
const original=loadConfig(process.env);assert.equal(original.APP_ENV,'development');assert.equal(original.DB_NAME,'ldss_scholar_monitor_dev');assert.equal(original.DB_USER,'ldss_monitor_local');assert.ok(['localhost','127.0.0.1'].includes(original.DB_HOST));assert.equal(original.APP_ORIGIN,'http://127.0.0.1:5173');assert.equal(original.PORT,3001);
const inspected=JSON.parse(await readFile(folder+'/inspection.json','utf8')) as {environmentHash:string};assert.equal(createHash('sha256').update(await readFile('.env')).digest('hex'),inspected.environmentHash,'Original environment changed; review the profile before starting');
let config=original;
if(profile==='synthetic'){
 const m=JSON.parse(await readFile(folder+'/primary.json','utf8')) as Manifest;
 assert.match(m.database,/^ldss_primary_test_\d+_[a-f0-9]{8}$/);assert.equal(m.runtimeUser,m.database.replace('ldss_primary_test_','ldss_primary_'));assert.equal(m.originalDatabase,original.DB_NAME);assert.equal(m.sourceDatabase,'ldss_hmulti_test_33804_f28b9d67');assert.equal(m.state,'verified');assert.equal(m.origin,original.APP_ORIGIN);assert.equal(m.port,3001);
 const checks=JSON.parse(await readFile(folder+'/compatibility.json','utf8')) as {passed:boolean};assert.equal(checks.passed,true,'Complete financial compatibility checks before synthetic activation');
 const credentials=JSON.parse(await readFile(folder+'/private/primary-credentials.json','utf8')) as {runtimePassword:string};
 const graduation=JSON.parse(await readFile('output/ap5-b3b-20261024/primary-activation.json','utf8')) as {database:string;authorization:string;writesEnabled:boolean};
 assert.equal(graduation.database,m.database);assert.equal(graduation.authorization,'A6_2_AP5_PRIMARY_20261024');
 config=loadConfig({...process.env,HOST:'127.0.0.1',PORT:'3001',APP_ORIGIN:m.origin,DB_HOST:'127.0.0.1',DB_NAME:m.database,DB_USER:m.runtimeUser,DB_PASSWORD:credentials.runtimePassword,...flags,GRADUATION_MONITORING_WRITES_ENABLED:graduation.writesEnabled?'true':'false'});
}else{
 for(const value of [original.INDIVIDUAL_PAYMENTS_ENABLED,original.OMITTED_PAYMENTS_ENABLED,original.INDIVIDUAL_DOCUMENTS_ENABLED,original.INDIVIDUAL_SETTLEMENT_ENABLED,original.HISTORICAL_MULTIBATCH_ENABLED])assert.ok(value===undefined||value==='false','Original profile must retain its reviewed default-off flags');
}
const database=createDatabase(config);
try{
 const [[actual]]=await database.pool!.query<import('mysql2/promise').RowDataPacket[]>('SELECT DATABASE() name,CURRENT_USER() account,@@hostname hostname');assert.equal(actual.name,config.DB_NAME);assert.equal(actual.account,config.DB_USER+'@localhost');assert.equal(actual.hostname,process.env.COMPUTERNAME);
 const app=buildApp(config,{database,logger:true});const ready=await app.inject({method:'GET',url:'/api/v1/ready'});assert.equal(ready.statusCode,200,'Profile schema/configuration is not ready');
 await app.listen({host:'127.0.0.1',port:3001});console.log(JSON.stringify({profile,database:config.DB_NAME,runtimeUser:config.DB_USER,frontend:config.APP_ORIGIN,backend:'http://127.0.0.1:3001',flagsEnabled:profile==='synthetic'}));
 for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{void app.close().then(()=>process.exit(0));});
}catch(error){await database.close();throw error;}
