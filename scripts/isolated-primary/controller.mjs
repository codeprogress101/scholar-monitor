import {release} from './guard.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createServer} from 'node:net';

const settingsPath=resolve(process.argv[2]),settings=JSON.parse(await readFile(settingsPath,'utf8'));
const manifest=JSON.parse(await readFile(resolve(release,'runtime-manifest.json'),'utf8'));
if(settings.mode==='primary')assert.equal(manifest.primaryActivationAllowed,true,'Primary activation gate is not satisfied');
let next=0;
await Promise.all(Array.from({length:8},async()=>{while(next<manifest.files.length){const item=manifest.files[next++];assert.equal(createHash('sha256').update(await readFile(resolve(release,item.path))).digest('hex'),item.sha256,item.path);}}));
assert.equal(manifest.environmentHash,createHash('sha256').update(JSON.stringify(settings.environment)).digest('hex'));
assert.ok(settings.mode==='primary'||settings.mode==='owned-rehearsal');
assert.deepEqual([settings.apiPort,settings.webPort],settings.mode==='primary'?[3001,5173]:[3026,3028]);
for(const port of [settings.apiPort,settings.webPort]) await new Promise((ok,no)=>{const s=createServer();s.once('error',no);s.listen({host:'127.0.0.1',port,exclusive:true},()=>s.close(ok));});
const children=[],handles=[],started=performance.now();
const childEnvironment=Object.fromEntries(Object.entries(process.env).filter(([key])=>['SYSTEMROOT','WINDIR','TEMP','TMP','COMSPEC','COMPUTERNAME','PATHEXT','USERPROFILE','LOCALAPPDATA','APPDATA'].includes(key.toUpperCase())));
childEnvironment.PATH=resolve(release,'bin')+';'+resolve(process.env.SystemRoot||'C:/Windows','System32');
let stopping=false;
function stop() { if(stopping)return; stopping=true;for(const child of children)child.kill(); }
async function child(name) {
 const log=await open(settings.stateDirectory+'/'+name+'.log','a');handles.push(log);
 const p=spawn(process.execPath,[resolve(release,'scripts/isolated-primary/'+name+'.mjs'),settingsPath],{cwd:release,env:childEnvironment,windowsHide:true,stdio:['ignore',log.fd,log.fd]});children.push(p);
 p.on('error',()=>{stop();process.exitCode=1;});
 p.on('exit',code=>{if(!stopping){stop();process.exitCode=code||1;}});
 return p;
}
async function ready(port,path) {
 for(let n=0;n<160;n++) {if(stopping)throw Error('Runtime child stopped');try{if((await fetch('http://127.0.0.1:'+port+path,{signal:AbortSignal.timeout(2000)})).status===200)return;}catch{ /* bounded startup retry */ }await new Promise(ok=>setTimeout(ok,250));}
 throw Error('Dedicated runtime readiness failed');
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
try {
 const api=await child('api');await ready(settings.apiPort,'/api/v1/ready');
 const web=await child('web');await ready(settings.webPort,'/api/v1/ready');
 await writeFile(settings.stateDirectory+'/running-profile.json',JSON.stringify({profile:'synthetic-isolated-sec2',controllerPid:process.pid,apiPid:api.pid,webPid:web.pid,release,settingsPath,startedAt:new Date().toISOString(),readyMs:performance.now()-started},null,2));
 console.log('Dedicated synthetic runtime ready');
} catch(error) {stop();process.exitCode=1;throw error;}
process.on('exit',()=>{for(const h of handles)void h.close();});
