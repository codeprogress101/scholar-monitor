import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import mysql,{type Connection,type RowDataPacket} from 'mysql2/promise';
import {createBackup,restoreBackup,unseal} from './backup-lib.mjs';
export async function testDocumentBackup(source:Pick<Connection,'query'|'execute'>,transaction:string,options?:{directory:string;verify:(db:Connection)=>Promise<void>}){
 assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');
 const [[name]]=await source.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(name.name,/^ldss_(?:f19|import)_test_\d+_[a-f\d]{8}$/);
 const directory=options?.directory??`${process.env.LDSS_P06_OUTPUT??'output/p06-documents-20261022'}/recovery`,admin={host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'};
 assert.match(directory,/^output\/(?:p0[67]-[a-z]+-\d{8}|individual-uat-activation-20261024\/[a-z-]+\/p0[67])\/recovery$/);
 const hash=(rows:RowDataPacket[])=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex'),before=new Map<string,string>();
 for(const table of ['individual_document_versions','individual_document_contents']){const [rows]=await source.query<RowDataPacket[]>(`SELECT * FROM ${table}`);assert.ok(rows.length>0);before.set(table,hash(rows));}
 const key=randomBytes(32),backup=await createBackup(key,{connection:{...admin,database:name.name},args:['--no-defaults','--host=127.0.0.1',`--port=${admin.port}`,'--user=root','--default-character-set=utf8mb4'],directory});
 let restore:Awaited<ReturnType<typeof restoreBackup>>|undefined,db:Connection|undefined,cleanup:Connection|undefined;
 try{
  const restoreOptions={keep:true,context:{admin,sourceDatabase:name.name,directory}};
  const payload=unseal(await readFile(backup.file),key,name.name),sqlBytes=Buffer.byteLength(payload.sql),sqlLimit=64*1024*1024;
  assert.ok(sqlBytes<sqlLimit);
  restore=await restoreBackup(backup.file,key,restoreOptions);assert.match(restore.target,/^ldss_restore_\d+_[a-f\d]{8}$/);
  db=await mysql.createConnection({...admin,database:restore.target});
  for(const [table,digest] of before)assert.equal(hash((await db.query<RowDataPacket[]>(`SELECT * FROM ${table}`))[0]),digest,table);
  const [contents]=await db.query<RowDataPacket[]>('SELECT c.*,v.content_bytes FROM individual_document_contents c JOIN individual_document_versions v ON v.transaction_id=c.transaction_id AND v.document_kind=c.document_kind AND v.revision=c.revision WHERE c.transaction_id=?',[transaction]);
  for(const row of contents){const content=Buffer.from(row.content_base64,'base64');assert.equal(content.length,Number(row.content_bytes));assert.equal(createHash('sha256').update(content).digest('hex'),row.document_hash);}
  await options?.verify(db);
  await assert.rejects(db.execute('UPDATE individual_document_contents SET content_base64=? WHERE transaction_id=?',['!',transaction]),e=>Boolean(e&&typeof e==='object'&&'errno'in e&&e.errno===4025));
  await mkdir(directory,{recursive:true});await writeFile(directory+`/${transaction}.json`,JSON.stringify({at:new Date().toISOString(),source:name.name,backup:{...backup,file:'Disposable encrypted fixture archive removed after successful verification',sqlBytes,sqlLimit,remainingSqlBytes:sqlLimit-sqlBytes},restore,documentTablesExact:true,latestDecodedBytesVerified:contents.length,contentHashConstraintPreserved:true,financialInventoryAndConstraintsVerified:true},null,2));
  console.log('PASS P06 populated document backup/restore: latest OR/DV bytes, all version metadata, financial records and constraints preserved');
 }finally{
  if(db)await db.end();
  if(restore){const metadata=JSON.parse(await readFile(restore.reportFile,'utf8'));assert.match(metadata.definerAccount,/^ldss_r_[a-f\d]{16}$/);cleanup=await mysql.createConnection(admin);try{await cleanup.query(`DROP DATABASE \`${restore.target}\``);await cleanup.query(`DROP USER ${cleanup.escape(metadata.definerAccount)}@'localhost'`);}finally{await cleanup.end();}}
  assert.ok(resolve(backup.file).startsWith(resolve(directory)+sep));await unlink(backup.file);
 }
}
