import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {backupHealth,sha} from './release-lib.mjs';
import {pathToFileURL} from 'node:url';

const release=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const configPath='C:/ProgramData/LDSSBackupConfig/production.json';
const config=JSON.parse(await readFile(configPath,'utf8'));
const read=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
let status=await read(config.statusFile);
const mode=process.argv[2];
if(!['tick','status'].includes(mode))throw Error('Use tick or status');
if(mode==='tick'){
 const age=Date.now()-Date.parse(status?.lastBackup??'');
 // Three-hour threshold plus the existing 30-minute poll leaves headroom below four hours.
 const command=!Number.isFinite(age)||age>=3*3600000?'backup':'tick';
 execFileSync(process.execPath,[resolve(release,'scripts/drive-backup.mjs'),command,'--config',configPath],{cwd:release,stdio:'inherit',windowsHide:true});
 status=await read(config.statusFile);
}
const proof=await read('C:/ProgramData/LDSSBackupStatus/offhost-proof.json');
let health=backupHealth(status,proof);
if(proof){
 try{
  // Operator attestation alone cannot substitute for an actual retrieved archive.
  const bytes=await readFile(proof.retrievedFile);
  const {unseal}=await import(pathToFileURL(resolve(release,'scripts/backup-lib.mjs')).href);
  const payload=unseal(bytes,await readFile(config.keyFile),config.database);
  const restored=await read(proof.restoreReportFile);
  if(sha(bytes)!==proof.sha256||payload.createdAt!==proof.backupCreatedAt||restored?.verified!==true||restored?.backupSha256!==proof.sha256)health=backupHealth(status,null);
 }catch{health=backupHealth(status,null);}
}
const report={checkedAt:new Date().toISOString(),...health,mode:config.mode,error:status?.error?'Backup runner reported an error':null};
await writeFile('C:/ProgramData/LDSSBackupStatus/go-live-monitor.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(report.warning)console.error('BACKUP ATTENTION: verify off-host delivery or use the approved operator fallback; desktop staging is not delivery.');
if(report.breached)process.exitCode=2;
