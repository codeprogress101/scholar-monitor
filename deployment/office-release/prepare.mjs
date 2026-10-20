import assert from 'node:assert/strict';
import {cp,mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {filesIn,fingerprint,inside,sha} from './release-lib.mjs';

const workspace=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const release=resolve(process.argv[2]??'');
const productionRoot='C:/ProgramData/LDSSProduction';
const startup=JSON.parse((await readFile(resolve(productionRoot,'startup/startup.json'),'utf8')).replace(/^\uFEFF/,''));
const previousRelease=resolve(startup.App.WorkingDirectory);
assert(inside(productionRoot,previousRelease)&&previousRelease!==release,'A distinct installed release is required');
const {schemaManifest:previousMigrations}=await import(pathToFileURL(resolve(previousRelease,'dist/server/schema-manifest.js')));
assert(inside(productionRoot,release)&&/^release-\d{8}(?:-[a-z0-9-]+)?$/.test(release.split(/[\\/]/).at(-1)),'Explicit new production release path required');
await assert.rejects(stat(release),{code:'ENOENT'},'Never overwrite a staged release');
await mkdir(release,{recursive:false});
for(const path of ['dist','scripts','db/migrations','deployment/office-release','package.json','package-lock.json','LDSS_Codex_Function_by_Function_Implementation_Plan.md']) await cp(resolve(workspace,path),resolve(release,path),{recursive:true,errorOnExist:true,force:false});
const npm=resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
execFileSync(process.execPath,[npm,'ci','--omit=dev','--no-audit','--no-fund'],{cwd:release,stdio:'inherit',windowsHide:true});
const paths=await filesIn(release);
const files=await fingerprint(release,paths);
const manifest={createdAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:workspace}).toString().trim(),
  release,previousRelease,previousMigrationCount:previousMigrations.length,files,
  lockSha256:sha(await readFile(resolve(release,'package-lock.json'))),acceptance:'pending',sourceChanges:process.argv[3]??'Release changes identified by the bound acceptance source fingerprints and dated implementation report'};
await writeFile(resolve(release,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({release,files:files.length,manifestSha256:sha(await readFile(resolve(release,'release-manifest.json')))}));
