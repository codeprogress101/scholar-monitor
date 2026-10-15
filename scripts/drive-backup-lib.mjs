import { readFile, writeFile, rename, mkdir, stat, copyFile, unlink, realpath } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve, relative, isAbsolute, join, basename } from 'node:path';
import { createHash } from 'node:crypto';

export const digest = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
export async function atomicJson(path, value) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, path);
}
export function validateConfig(c, workspace = process.cwd()) {
  const outside = p => typeof p === 'string' && isAbsolute(p) && !/["\r\n]/.test(p) && (() => {
    // Default XAMPP web root plus any explicitly declared alternative public root.
    return [workspace, 'C:/xampp/htdocs', ...(c.webRoot ? [c.webRoot] : [])].every(root => { const r = relative(resolve(root), resolve(p)); return r.startsWith('..') || isAbsolute(r); });
  })();
  if (!['production', 'staging', 'test'].includes(c.environment) ||
      !/^[a-zA-Z0-9_]+$/.test(c.database ?? '') || c.database === 'ldss_scholar_monitor_dev' ||
      !c.backupUser || c.backupUser === 'root' || !c.backupPassword ||
      !Number.isInteger(c.port) || c.port < 1 || c.port > 65535 ||
      !outside(c.directory) || !outside(c.keyFile) || !outside(c.statusFile) ||
      !isAbsolute(c.dumpTool ?? '') || !isAbsolute(c.mysqlTool ?? '') ||
      !['desktop', 'api'].includes(c.mode ?? 'api') ||
      ((c.mode ?? 'api') === 'api' && (!c.googleClientId || !c.googleClientSecret || c.googlePublishingStatus !== 'production' || c.googleClientId.startsWith('REPLACE'))) ||
      (c.mode === 'desktop' && (!outside(c.syncDirectory) || [c.directory, c.keyFile, c.statusFile].some(p => { const r = relative(resolve(c.syncDirectory), resolve(p)); return !(r.startsWith('..') || isAbsolute(r)); }) || resolve(c.directory) === resolve(c.syncDirectory))) ||
      c.backupPassword.startsWith('REPLACE'))
    throw new Error('Invalid backup configuration; check required fields and private absolute paths.');
  return c;
}
export async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e; }
}
export async function withLock(directory, work) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  // Windows named pipes avoid TCP port reservations and release on process exit.
  const canonical = await realpath(directory);
  const identity = digest(process.platform === 'win32' ? canonical.toLowerCase() : canonical);
  const endpoint = process.platform === 'win32'
    ? { path: String.raw`\\.\pipe\ldss-backup-${identity}`, exclusive: true }
    : { host: '127.0.0.1', port: 49152 + parseInt(identity.slice(0, 6), 16) % 15000, exclusive: true };
  const lock = createServer(socket => socket.destroy());
  try { await new Promise((ok, fail) => { lock.once('error', fail); lock.listen(endpoint, ok); }); }
  catch (e) { throw new Error(`Backup runner is locked or its local lock endpoint is unavailable (${e.code ?? 'unknown'}). Check for another runner and the backup operator permissions.`, { cause: e }); }
  try { return await work(); }
  finally { await new Promise(ok => lock.close(ok)); }
}
export class Drive {
  constructor(token, fetcher = fetch) { this.token = token; this.fetcher = fetcher; }
  async request(url, options = {}) {
    const response = await this.fetcher(url, { ...options, signal: AbortSignal.timeout(120000), headers: { Authorization: `Bearer ${this.token}`, ...options.headers } });
    if (!response.ok && response.status !== 308 && response.status !== 404 && response.status !== 410)
      throw new Error(response.status === 401 ? 'Google authorization expired or revoked; reconnect the office account.' : response.status === 403 ? 'Google denied upload. Check account storage quota and folder permissions.' : `Google upload unavailable (HTTP ${response.status}); retained locally for retry.`);
    return response;
  }
  async metadata(id) {
    const r = await this.request(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,size,md5Checksum,trashed`);
    return r.status === 404 ? null : r.json();
  }
  async upload(bytes, item, folderId, save) {
    if (!item.driveId) {
      const r = await this.request('https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive');
      item.driveId = (await r.json()).ids[0];
      await save(); // Persist the reserved ID before creating anything remotely.
    }
    const existing = await this.metadata(item.driveId);
    if (existing && !existing.trashed) {
      if (Number(existing.size) !== bytes.length || existing.md5Checksum !== digest(bytes, 'md5')) throw new Error('Remote backup checksum mismatch; recovery not verified.');
      return;
    }
    if (existing?.trashed) throw new Error('Backup was moved to Google Drive trash; restore it before retrying.');
    let offset = 0;
    if (item.session) {
      if (!item.session.startsWith('https://www.googleapis.com/')) throw new Error('Invalid Google upload session.');
      const probe = await this.request(item.session, { method: 'PUT', headers: { 'Content-Range': `bytes */${bytes.length}`, 'Content-Length': '0' } });
      if (probe.status === 404 || probe.status === 410) item.session = null;
      else if (probe.status === 308) offset = Number(probe.headers.get('range')?.split('-')[1] ?? -1) + 1;
      else { const m = await this.metadata(item.driveId); if (m?.md5Checksum === digest(bytes, 'md5')) return; throw new Error('Remote upload verification failed.'); }
    }
    if (!item.session) {
      const r = await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'application/octet-stream', 'X-Upload-Content-Length': String(bytes.length) }, body: JSON.stringify({ id: item.driveId, name: item.name, parents: [folderId], appProperties: { backupId: item.id, sha256: item.sha256 } }) });
      item.session = r.headers.get('location');
      if (!item.session?.startsWith('https://www.googleapis.com/')) throw new Error('Invalid Google upload session.');
      await save();
    }
    while (offset < bytes.length) {
      const end = Math.min(offset + 8 * 1024 * 1024, bytes.length);
      const r = await this.request(item.session, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'Content-Range': `bytes ${offset}-${end - 1}/${bytes.length}` }, body: bytes.subarray(offset, end) });
      const next = r.status === 308 ? Number(r.headers.get('range')?.split('-')[1] ?? -1) + 1 : end;
      if (r.status === 404 || r.status === 410) { item.session = null; await save(); throw new Error('Google upload session expired; retry pending.'); }
      if (!Number.isInteger(next) || next <= offset || next > bytes.length) throw new Error('Upload made no progress; retry pending.');
      offset = next;
    }
    const m = await this.metadata(item.driveId);
    if (!m || Number(m.size) !== bytes.length || m.md5Checksum !== digest(bytes, 'md5')) throw new Error('Remote backup checksum mismatch; retained locally.');
  }
}

// Only encrypted archive bytes enter the sync folder. Private queue/key/config stay separate.
export async function stageDesktopArchive(source, syncDirectory, expectedHash) {
  if (!(await stat(syncDirectory)).isDirectory()) throw new Error('Drive sync destination is unavailable.');
  const name = basename(source);
  if (!name.endsWith('.ldssbackup')) throw new Error('Only encrypted backup archives may be staged.');
  const bytes = await readFile(source);
  if (digest(bytes) !== expectedHash) throw new Error('Local archive checksum mismatch.');
  const target = join(syncDirectory, name);
  try {
    if (digest(await readFile(target)) !== expectedHash) throw new Error('Existing staged backup checksum mismatch.');
    return target;
  } catch(e) { if(e.code !== 'ENOENT') throw e; }
  const temporary = target + '.partial';
  try {
    await copyFile(source, temporary);
    if (digest(await readFile(temporary)) !== expectedHash) throw new Error('Staged archive checksum mismatch.');
    await rename(temporary, target);
  } finally { await unlink(temporary).catch(() => {}); }
  return target;
}
