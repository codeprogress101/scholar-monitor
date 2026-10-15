import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, join, basename, relative, isAbsolute, parse } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createBackup, restoreBackup, unseal, run } from './backup-lib.mjs';
import { Drive, atomicJson, readJson, validateConfig, withLock, digest, stageDesktopArchive } from './drive-backup-lib.mjs';

async function tokenRequest(c, body) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: c.googleClientId, client_secret: c.googleClientSecret, ...body }) });
  if (!r.ok) throw new Error('Google authorization failed or revoked; reconnect the office account.');
  return r.json();
}
async function connect(c) {
  const state = randomBytes(32).toString('hex'), verifier = randomBytes(48).toString('base64url');
  let redirect;
  const server = createServer();
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
  redirect = `http://127.0.0.1:${server.address().port}/callback`;
  try {
    const code = new Promise((ok, fail) => {
      const timer = setTimeout(() => fail(new Error('Google sign-in timed out.')), 300000);
      server.on('request', (req, res) => {
        const url = new URL(req.url, redirect);
        if (url.pathname !== '/callback' || url.searchParams.get('state') !== state) { res.writeHead(400); res.end('Invalid authorization callback.'); return; }
        clearTimeout(timer); res.setHeader('Content-Type', 'text/plain'); res.end('Authorization received. Return to the backup setup terminal.');
        if (url.searchParams.get('code')) ok(url.searchParams.get('code')); else fail(new Error('Office account authorization was declined.'));
      });
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: c.googleClientId, redirect_uri: redirect, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.file', access_type: 'offline', prompt: 'consent select_account', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
    console.log(`Open this URL on THIS computer and choose the dedicated office account:\n${url}`);
    const tokens = await tokenRequest(c, { grant_type: 'authorization_code', code: await code, redirect_uri: redirect, code_verifier: verifier });
    if (!tokens.refresh_token) throw new Error('Offline authorization was not granted.');
    const old = await readJson(join(c.directory, 'google.json'), {});
    const drive = new Drive(tokens.access_token);
    let folderId = old.folderId;
    if (folderId && !(await drive.metadata(folderId))) throw new Error('Existing backup folder is unavailable to this account. Reconnect the original account.');
    if (!folderId) {
      const r = await drive.request('https://www.googleapis.com/drive/v3/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'LDSS Backups', mimeType: 'application/vnd.google-apps.folder' }) });
      folderId = (await r.json()).id;
    }
    await atomicJson(join(c.directory, 'google.json'), { refreshToken: tokens.refresh_token, folderId });
    console.log('Office Drive connected. Existing files were not shared or deleted.');
  } finally { server.close(); }
}
export async function execute(command, configPath, file) {
  if (!configPath) throw new Error('Supply --config with the private absolute configuration path.');
  const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const c = validateConfig(await readJson(configPath), workspace);
  const configRelative = relative(workspace, resolve(configPath));
  if (!isAbsolute(configPath) || !(configRelative.startsWith('..') || isAbsolute(configRelative)) || resolve(configPath).toLowerCase().startsWith('c:\\xampp\\htdocs\\')) throw new Error('Configuration must be outside the web root.');
  if (c.mode === 'desktop') {
    const r = relative(resolve(c.syncDirectory), resolve(configPath));
    if (!(r.startsWith('..') || isAbsolute(r))) throw new Error('Private configuration cannot be inside the sync folder.');
  }
  await mkdir(c.directory, { recursive: true, mode: 0o700 });
  if (command === 'init') {
    if (process.platform === 'win32') {
      const principal = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
      for (const path of new Set([c.directory, dirname(c.keyFile), dirname(resolve(configPath)), dirname(c.statusFile)])) {
        if (dirname(resolve(path)) === parse(resolve(path)).root) throw new Error('Use dedicated nested private directories; refusing broad ACL changes.');
        await mkdir(path, { recursive: true });
        await run('icacls.exe', [path, '/inheritance:r', '/grant:r', `${principal}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F']);
      }
    }
    await mkdir(dirname(c.keyFile), { recursive: true, mode: 0o700 });
    await writeFile(c.keyFile, randomBytes(32), { flag: 'wx', mode: 0o600 });
    console.log('Recovery key created. Preserve a separate protected copy before activating backups.'); return;
  }
  return withLock(c.directory, async () => {
    if (command === 'connect') { if(c.mode === 'desktop') throw new Error('Sign in using Google Drive for desktop; OAuth setup is not required.'); return connect(c); }
    const key = await readFile(c.keyFile);
    if (key.length !== 32) throw new Error('Recovery key must be 32 bytes.');
    const manifestPath = join(c.directory, 'manifest.json');
    const state = await readJson(manifestPath, { database: c.database, environment: c.environment, items: [], lastRestore: null, error: null });
    if (state.database !== c.database || state.environment !== c.environment) throw new Error('Backup directory belongs to a different database/environment.');
    const save = () => atomicJson(manifestPath, state);
    const publish = async () => {
      const sorted = [...state.items].sort((a,b) => a.createdAt.localeCompare(b.createdAt));
      await mkdir(dirname(c.statusFile), { recursive: true, mode: 0o700 });
      await atomicJson(c.statusFile, { version: 1, mode: c.mode ?? 'api', lastStaged: state.items.filter(i => i.stagedAt).map(i => i.stagedAt).sort().at(-1) ?? null, database: c.database, environment: c.environment, checkedAt: new Date().toISOString(), lastBackup: sorted.at(-1)?.createdAt ?? null, lastUpload: sorted.filter(i => i.uploadedAt).map(i => i.uploadedAt).sort().at(-1) ?? null, pending: state.items.filter(i => c.mode === 'desktop' ? !i.stagedAt : !i.uploadedAt).length, lastRestore: c.mode === 'desktop' ? null : state.lastRestore, lastFileRestore: state.lastFileRestore ?? null, error: state.error });
    };
    try {
      // Recover fully written encrypted archives if the process stopped before manifest save.
      for (const name of await readdir(c.directory)) if (name.endsWith('.ldssbackup') && !state.items.some(i => i.name === name)) {
        const bytes = await readFile(join(c.directory, name));
        const payload = unseal(bytes, key, c.database);
        state.items.push({ id: randomUUID(), name, createdAt: payload.createdAt, sha256: digest(bytes) });
      }
      await save();
      const latest = Math.max(0, ...state.items.map(i => Date.parse(i.createdAt)));
      if (command === 'backup' || command === 'tick' && Date.now() - latest >= 4 * 3600000) {
        const connection = { host: '127.0.0.1', port: c.port, user: c.backupUser, password: c.backupPassword, database: c.database };
        const result = await createBackup(key, { connection, directory: c.directory, dumpTool: c.dumpTool, args: ['--no-defaults', '--host=127.0.0.1', `--port=${c.port}`, `--user=${c.backupUser}`, '--default-character-set=utf8mb4'] });
        const bytes = await readFile(result.file); unseal(bytes, key, c.database);
        state.items.push({ id: randomUUID(), name: basename(result.file), createdAt: result.createdAt, sha256: digest(bytes) });
        await save(); await publish();
      }
      if (!['tick', 'backup', 'retry', 'verify-drive'].includes(command)) throw new Error('Unknown backup command.');
      if (c.mode === 'desktop') {
        if (command === 'verify-drive') {
          if (!file || !isAbsolute(file)) throw new Error('Provide the absolute path of an archive downloaded from Drive web using --file.');
          const bytes = await readFile(file);
          unseal(bytes, key, c.database);
          if (!c.restoreUser || !c.restorePassword) throw new Error('Recovery administrator credentials required.');
          await restoreBackup(file, key, { context: { sourceDatabase: c.database, admin: { host: '127.0.0.1', port: c.port, user: c.restoreUser, password: c.restorePassword }, mysqlTool: c.mysqlTool, directory: c.directory } });
          // This is a file restore test: no API evidence proves its cloud provenance.
          state.lastFileRestore = new Date().toISOString();
        } else for (const item of state.items) {
          const previousStage = item.stagedAt;
          delete item.stagedAt;
          await stageDesktopArchive(join(c.directory, item.name), c.syncDirectory, item.sha256);
          item.stagedAt = previousStage;
          item.stagedAt ??= new Date().toISOString();
          await save();
        }
        state.error = null;
        return;
      }
      const auth = await readJson(join(c.directory, 'google.json'));
      const token = await tokenRequest(c, { grant_type: 'refresh_token', refresh_token: auth.refreshToken });
      const drive = new Drive(token.access_token);
      if (command === 'verify-drive') {
        const item = state.items.find(i => i.id === file && i.uploadedAt);
        if (!item) throw new Error('Select an uploaded backup ID from the private manifest.');
        const r = await drive.request(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.driveId)}?alt=media`);
        if (!r.ok) throw new Error('Drive backup not available for recovery.');
        const bytes = Buffer.from(await r.arrayBuffer());
        if (digest(bytes) !== item.sha256) throw new Error('Downloaded archive checksum mismatch.');
        unseal(bytes, key, c.database);
        const downloaded = join(c.directory, 'recovery-download.bin');
        await writeFile(downloaded, bytes, { mode: 0o600 });
        if (!c.restoreUser || !c.restorePassword) throw new Error('Dedicated local recovery administrator credentials required for disposable restore.');
        await restoreBackup(downloaded, key, { context: { sourceDatabase: c.database, admin: { host: '127.0.0.1', port: c.port, user: c.restoreUser, password: c.restorePassword }, mysqlTool: c.mysqlTool, directory: c.directory } });
        state.lastRestore = new Date().toISOString();
      } else for (const item of state.items.filter(i => !i.uploadedAt)) {
        const bytes = await readFile(join(c.directory, item.name));
        if (digest(bytes) !== item.sha256) throw new Error('Local archive checksum mismatch; upload stopped.');
        await drive.upload(bytes, item, auth.folderId, save);
        item.uploadedAt = new Date().toISOString(); item.session = null;
        await save(); await publish();
      }
      state.error = null;
    } catch (e) {
      // Never publish provider bodies, filesystem paths, SQL or credentials.
      state.error = e.message.startsWith('Google ') || e.message.startsWith('Remote ') ? e.message : 'Backup or recovery failed. Check private configuration, connectivity, disk space, archive limits and recovery access.';
      throw new Error(state.error, { cause: e });
    } finally { await save(); await publish(); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try { await execute(args[0], args[args.indexOf('--config') + 1], args.includes('--file') ? args[args.indexOf('--file') + 1] : args[args.indexOf('--id') + 1]); console.log('Backup command completed.'); }
  catch { console.error('Backup command failed. Check Administrator backup status and the private setup/runbook. No credentials or SQL are printed.'); process.exitCode = 1; }
}
