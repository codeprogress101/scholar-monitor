/** Test-only logical bootstrap: historical SQL executes unchanged on 10.4, then transfers. */
import mysql from 'mysql2/promise';import assert from'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';
import{createBackup,loadKey,unseal,run,inventory}from'../backup-lib.mjs';import{adaptPayload}from'./f54-logical-transfer.mjs';
export async function bootstrapTarget(connection,options,applyOriginal){
 const[[actual]]=await connection.query('SELECT DATABASE() name,@@port port,@@version version');assert.equal(actual.port,3337);assert.match(actual.version,/^11\.4\.13-/);assert.match(actual.name,new RegExp('^ldss_[a-z0-9_]+_test_'+process.pid+'_[a-f0-9]{8}$'));
 const[tables]=await connection.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');if(tables.length)return applyOriginal(connection,options);
 assert.equal(Object.keys(options).length,0,'Partial migration suites need separate target bootstrap review');
 const admin={host:'127.0.0.1',port:3306,user:'root',password:process.env.LDSS_DB_COMPAT_SOURCE_PASSWORD??'',timezone:'Z'},source=await mysql.createConnection(admin);let made=false;
 try{const[[exists]]=await source.query('SELECT COUNT(*) n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[actual.name]);assert.equal(exists.n,0);await source.query('CREATE DATABASE `'+actual.name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');made=true;await source.changeUser({database:actual.name});
 const applied=await applyOriginal(source,options);assert.equal(applied.length,67);
 const backup=await createBackup(await loadKey(),{connection:{...admin,database:actual.name},directory:process.env.LDSS_DB_COMPAT_EVIDENCE+'/bootstrap',dumpTool:'C:/xampp/mysql/bin/mysqldump.exe',args:['--no-defaults','--host=127.0.0.1','--port=3306','--user=root','--default-character-set=utf8mb4']});
 const payload=unseal(await readFile(backup.file),await loadKey(),actual.name),adapted=adaptPayload(payload,{expectedTableCount:148}),sql=adapted.sql.replace(/^\/\*!\d{5}[^\r\n]*$/gm,l=>l.replace(/DEFINER=`(?:[^`]|``)*`@`(?:[^`]|``)*`/g,'DEFINER=CURRENT_USER'));
 await run('C:/xampp/mysql/bin/mysql.exe',['--no-defaults','--host=127.0.0.1','--port=3337','--user=root','--default-character-set=utf8mb4','--binary-mode','--local-infile=0',actual.name],{input:sql,password:process.env.LDSS_SETUP_ADMIN_PASSWORD});assert.deepEqual(await inventory(connection),adapted.expected);
 await writeFile(process.env.LDSS_DB_COMPAT_EVIDENCE+'/bootstrap-'+process.pid+'.json',JSON.stringify({passed:true,originalMigrationsActuallyExecutedOn3306:true,targetPort:3337,originalJournalTransferredExactly:true,tables:148,adaptation:adapted.proof},null,2));return applied;
 }finally{try{if(made)await source.query('DROP DATABASE `'+actual.name+'`');}finally{await source.end();}}
}
