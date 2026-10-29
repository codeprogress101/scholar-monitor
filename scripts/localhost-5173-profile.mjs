import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createConnection} from 'node:net';
const folder='output/5173-synthetic-primary-20261024',stateFile=folder+'/running-profile.json',profile=process.argv[2];
assert.ok(['synthetic','original'].includes(profile),'Usage: node scripts/localhost-5173-profile.mjs synthetic|original');
assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');assert.equal(process.cwd().toLowerCase(),resolve('C:/xampp/htdocs/scholar_monitor').toLowerCase());
const state=await readFile(stateFile,'utf8').then(JSON.parse,e=>{if(e.code==='ENOENT')return null;throw e;});
if(state){
 assert.ok(Number.isInteger(state.controllerPid)&&state.controllerPid>0&&state.controllerPid!==process.pid);
 const command=execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${state.controllerPid}'; if($p){$p.CommandLine}`],{encoding:'utf8',windowsHide:true}).trim();
 if(command){assert.ok(command.includes('scripts/localhost-5173-profile.mjs')||command.includes('scripts\\localhost-5173-profile.mjs'),'Recorded PID is no longer this launcher; refusing to stop it');execFileSync('taskkill.exe',['/PID',String(state.controllerPid),'/T','/F'],{stdio:'ignore',windowsHide:true});}
}
async function quiet(port){await new Promise((resolveQuiet,reject)=>{const socket=createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(new Error(`Port ${port} is occupied. Stop only its verified local profile before switching.`));});socket.once('error',error=>{socket.destroy();if(error.code==='ECONNREFUSED')resolveQuiet();else reject(error);});socket.setTimeout(3000,()=>{socket.destroy();reject(new Error('Cannot verify loopback listener'));});});}
await quiet(3001);await quiet(5173);await access(resolve('node_modules/vite/bin/vite.js'));
// The preserved original remains schema 63 and must use its compatible source.
const apiSource=profile==='original'?'output/ap5-b3b-20261024/baseline/scripts/localhost-5173-api.ts':'scripts/localhost-5173-api.ts';
const api=spawn(process.execPath,['--import','tsx',apiSource,profile],{stdio:'inherit',windowsHide:true});
let web;const stop=()=>{api.kill();web?.kill();};
api.once('error',error=>{stop();throw error;});api.once('exit',code=>{stop();process.exitCode=code??1;});
for(let n=0;n<40;n++){
 const ready=await fetch('http://127.0.0.1:3001/api/v1/ready').then(r=>r.ok,()=>false);
 if(ready)break;
 assert.equal(api.exitCode,null,'API profile failed to start');assert.ok(n<39,'API profile readiness timed out');await new Promise(r=>setTimeout(r,250));
}
web=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(profile==='original'?['output/ap5-b3b-20261024/baseline']:[]),'--host','127.0.0.1'],{stdio:'inherit',windowsHide:true});
web.once('error',error=>{stop();throw error;});web.once('exit',code=>{stop();process.exitCode=code??1;});
await writeFile(stateFile,JSON.stringify({profile,controllerPid:process.pid,apiPid:api.pid,webPid:web.pid,startedAt:new Date().toISOString(),frontend:'http://127.0.0.1:5173',backend:'http://127.0.0.1:3001'},null,2));
console.log(`Local primary profile: ${profile}. Return with: node scripts/localhost-5173-profile.mjs original`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
