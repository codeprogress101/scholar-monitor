import assert from 'node:assert/strict';
import {registerHooks, createRequire} from 'node:module';
import {realpathSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, relative, isAbsolute} from 'node:path';

export const release = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const seen = new Set(), checked = new Map();
export function within(path) {
  const rel = relative(release, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
assert.equal(realpathSync(process.cwd()), release, 'Start in the dedicated release');
assert.ok(!process.env.NODE_PATH && !process.env.NODE_OPTIONS, 'External loaders are unavailable');
assert.equal(realpathSync(process.execPath), resolve(release, 'bin/node.exe'));
registerHooks({resolve(specifier, context, nextResolve) {
  const result = nextResolve(specifier, context);
  if (result.url.startsWith('node:')) return result;
  assert.ok(result.url.startsWith('file:'), 'Unexpected module protocol');
  const path = fileURLToPath(result.url);
  let actual = checked.get(path);
  if (!actual) { actual = realpathSync(path); checked.set(path, actual); }
  assert.ok(within(actual), 'Module resolved outside the dedicated release');
  seen.add(actual);
  return result;
}});
export function dependencyProof() {
  const require = createRequire(import.meta.url);
  const packages = ['fastify','zod','fast-uri','ajv/node_modules/fast-uri','vite','vitest','concurrently','shell-quote','source-map-js','mysql2'];
  return {pid:process.pid, node:process.execPath, cwd:process.cwd(), release,
    packages:packages.map(name=>{const path=resolve(release,'node_modules',name,'package.json');
      assert.ok(within(realpathSync(path))); const p=JSON.parse(readFileSync(path,'utf8'));
      return {name:p.name,version:p.version,manifest:path,loaded:[...seen,...Object.keys(require.cache)].some(x=>x.startsWith(resolve(release,'node_modules',name)+'\\'))};}),
    loadedPaths:[...new Set([...seen,...Object.keys(require.cache)])].sort(),
    parentResolutionBlocked:true};
}
