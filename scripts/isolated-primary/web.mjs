import {dependencyProof, release} from './guard.mjs';
import {readFile, writeFile} from 'node:fs/promises';
const settings=JSON.parse(await readFile(process.argv[2],'utf8'));
const {createServer}=await import('vite');
const server=await createServer({root:release,server:{host:'127.0.0.1',port:settings.webPort,strictPort:true,proxy:{'/api':'http://127.0.0.1:'+settings.apiPort}}});
await server.listen();
await writeFile(settings.stateDirectory+'/web-proof.json',JSON.stringify({...dependencyProof(),ready:true,port:settings.webPort},null,2));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{void server.close().then(()=>process.exit(0));});
