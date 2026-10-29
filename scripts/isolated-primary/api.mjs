import {dependencyProof, release} from './guard.mjs';
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const settings=JSON.parse(await readFile(process.argv[2],'utf8'));
const {loadConfig}=await import(pathToFileURL(resolve(release,'dist/server/config.js')));
const {createDatabase}=await import(pathToFileURL(resolve(release,'dist/server/database.js')));
const {buildApp}=await import(pathToFileURL(resolve(release,'dist/server/app.js')));
const config=loadConfig(settings.environment);
assert.equal(config.HOST,'127.0.0.1');
assert.equal(config.DB_NAME,settings.database);
assert.equal(config.DB_USER,settings.runtimeUser);
assert.equal(config.APP_ORIGIN,settings.origin);
assert.equal(config.PORT,settings.apiPort);
assert.ok(settings.mode==='primary'||settings.mode==='owned-rehearsal');
if(settings.mode==='primary') {
  assert.equal(config.DB_NAME,'ldss_primary_test_12676_61497616');
  assert.equal(config.DB_USER,'ldss_primary_12676_61497616');
  assert.equal(config.APP_ORIGIN,'http://127.0.0.1:5173');
  assert.equal(config.PORT,3001);
} else {
  assert.match(config.DB_NAME,/^ldss_restore_\d+_[a-f0-9]{8}$/);
  assert.match(config.DB_USER,/^ldss_sec2_[a-f0-9]{12}$/);
  assert.equal(config.PORT,3026);
  assert.equal(config.APP_ORIGIN,'http://127.0.0.1:3028');
}
const database=createDatabase(config);
try {
  const [[identity]]=await database.pool.query('SELECT DATABASE() name,CURRENT_USER() account,@@hostname hostname');
  assert.deepEqual(identity,{name:settings.database,account:settings.runtimeUser+'@localhost',hostname:settings.hostname});
  const [[schema]]=await database.pool.query('SELECT COUNT(*) count FROM schema_migrations');
  assert.equal(schema.count,67);
  const app=buildApp(config,{database,logger:true});
  assert.equal((await app.inject({method:'GET',url:'/api/v1/ready'})).statusCode,200);
  await app.listen({host:'127.0.0.1',port:settings.apiPort});
  await writeFile(settings.stateDirectory+'/api-proof.json',JSON.stringify({...dependencyProof(),identity,ready:true},null,2));
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{void app.close().then(()=>process.exit(0));});
} catch(error) { await database.close(); throw error; }
