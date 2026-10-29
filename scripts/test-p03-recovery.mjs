import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {createBackup,restoreBackup} from './backup-lib.mjs';

/** Filled P03 evidence (including the unique generated closure key) must survive
 * the existing backup/restore format. Never use an operational schema here. */
export async function testP03Recovery(database){
 assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');assert.match(database,/^ldss_f19_test_\d+_[a-f0-9]{8}$/);
 const directory='output/p03-reconciliation-20261022/recovery',admin={host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'};
 const key=randomBytes(32),backup=await createBackup(key,{connection:{...admin,database},args:['--no-defaults','--host=127.0.0.1',`--port=${admin.port}`,'--user=root','--default-character-set=utf8mb4'],directory});
 try{
  const restore=await restoreBackup(backup.file,key,{context:{admin,sourceDatabase:database,directory}});
  assert.equal(restore.retained,false);await mkdir(directory,{recursive:true});await writeFile(directory+'/filled-P03.json',JSON.stringify({source:database,backup:{...backup,file:'Disposable encrypted archive removed after successful verification'},restore,generatedClosureKey:true,closureMembersAndHistory:true,verified:true},null,2));
  console.log('PASS filled P03 backup/restore: closure uniqueness, member hashes, verification/discrepancy/correction history, constraints and views; temporary restore/definer removed');
 }finally{await unlink(backup.file);}
}
