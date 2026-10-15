import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';
// Working directory comes from the reviewed installed release task.
const folder=pathToFileURL(process.cwd().replaceAll('\\','/')+'/dist/server/');
let database;
try {
 const [{loadConfig},{createDatabase}]=await Promise.all([import(new URL('config.js',folder)),import(new URL('database.js',folder))]);
 const env=parseEnv(await readFile('C:/ProgramData/LDSSProduction/production.env','utf8'));
 if(env.APP_ENV!=='production'||env.DB_HOST!=='127.0.0.1'||env.DB_NAME!=='ldss_scholar_monitor_production')throw Error('Unexpected target');
 database=createDatabase(loadConfig(env));
 process.exitCode=(await database.check())==='connected'?0:1;
}catch{process.exitCode=1;}finally{if(database)await database.close().catch(()=>{});}
