import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { Drive, digest, validateConfig, withLock, stageDesktopArchive } from "../scripts/drive-backup-lib.mjs";
import { unseal, seal } from "../scripts/backup-lib.mjs";
import { backupStatus } from "../server/backup-status";

describe("Drive backups", () => {
  it("requires explicit production target and private paths without weakening legacy validation", () => {
    const key = randomBytes(32), sql = "SELECT 1";
    const bytes = seal({ version: 1, database: "office_production", sql, sqlHash: createHash("sha256").update(sql).digest("hex"), inventory: { tables: [] } }, key);
    expect(() => unseal(bytes, key)).toThrow();
    expect(unseal(bytes, key, "office_production").database).toBe("office_production");
    expect(() => unseal(bytes, randomBytes(32), "office_production")).toThrow();
    expect(() => validateConfig({ environment: "production", database: "ldss_scholar_monitor_dev" })).toThrow();
  });
  it("prevents overlapping backup runners and releases lock after failure", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ldss-lock-"));
    try {
      await withLock(dir, async () => { await expect(withLock(dir, async () => {})).rejects.toThrow("locked"); });
      await expect(withLock(dir, async () => { throw new Error("disk full"); })).rejects.toThrow("disk full");
      await withLock(dir, async () => {});
    } finally { await rm(dir, { recursive: true }); }
  });
  it("excludes a separate process and recovers after its forced exit", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ldss-process-lock-"));
    const moduleUrl = new URL("../scripts/drive-backup-lib.mjs", import.meta.url).href;
    const child = spawn(process.execPath, ["--input-type=module", "-e",
      `import {withLock} from ${JSON.stringify(moduleUrl)}; await withLock(process.argv[1], async()=>{process.send('locked'); await new Promise(()=>{});});`, dir],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe", "ipc"] });
    const exited = once(child, "exit");
    try {
      await Promise.race([once(child, "message"), exited.then(() => { throw new Error("Lock child exited before acquisition"); })]);
      await expect(withLock(dir, async () => { throw new Error("Overlap permitted"); })).rejects.toThrow("locked");
      // Different backup directories remain independent.
      const other = await mkdtemp(join(tmpdir(), "ldss-other-lock-"));
      try { await withLock(other, async () => {}); } finally { await rm(other, { recursive: true }); }
      child.kill(); await exited;
      await withLock(dir, async () => {});
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill();
      await exited;
      await rm(dir, { recursive: true });
    }
  }, 15000);
  it("resumes interrupted transfers with the persisted file ID and verifies content", async () => {
    const bytes = Buffer.from("encrypted synthetic bytes");
    const item = { id: "test", name: "test.ldssbackup", sha256: digest(bytes), driveId: "reserved", session: "https://www.googleapis.com/upload/session" };
    const calls: string[] = [];
    let uploaded = false;
    const mock: typeof fetch = async (input, options) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/files/')) return uploaded ? Response.json({ id: "reserved", size: String(bytes.length), md5Checksum: digest(bytes, "md5") }) : new Response(null, { status: 404 });
      const headers = options!.headers as Record<string,string>;
      if (headers['Content-Range'].startsWith('bytes */')) return new Response(null, { status: 308, headers: { Range: 'bytes=0-4' } });
      expect(headers['Content-Range']).toBe(`bytes 5-${bytes.length - 1}/${bytes.length}`);
      uploaded = true; return Response.json({ id: "reserved" });
    };
    const drive = new Drive("synthetic", mock);
    await drive.upload(bytes, item, "folder", async () => {});
    await drive.upload(bytes, item, "folder", async () => {});
    expect(calls.filter(c => c.includes('/upload/'))).toHaveLength(2);
  });
  it("persists generated ID before upload and verifies an already committed retry", async () => {
    const bytes = Buffer.from('archive');
    const item = { id: 'id', name: 'dated.ldssbackup', sha256: digest(bytes) };
    let saved = 0, uploaded = false;
    const drive = new Drive('synthetic', async input => {
      const url = String(input);
      if (url.includes('generateIds')) return Response.json({ ids: ['reserved'] });
      if (url.includes('/files/reserved')) return uploaded ? Response.json({ size: bytes.length, md5Checksum: digest(bytes, 'md5') }) : new Response(null, { status: 404 });
      if (url.includes('uploadType')) { expect(saved).toBe(1); return new Response(null, { headers: { location: 'https://www.googleapis.com/upload/session' } }); }
      expect(saved).toBe(2); uploaded = true; return Response.json({ id: 'reserved' });
    });
    await drive.upload(bytes, item, 'folder', async () => { saved++; });
    await drive.upload(bytes, item, 'folder', async () => { saved++; });
    expect(saved).toBe(2);
  });
  it.each([401,403,500])("reports provider failure %s without provider body or credentials", async status => {
    const drive = new Drive("private-token", async () => new Response("secret response", { status }));
    await expect(drive.request('https://www.googleapis.com/drive/v3/files')).rejects.toThrow(/Google/);
    try { await drive.request('https://www.googleapis.com/drive/v3/files'); } catch (e) { expect(String(e)).not.toContain('secret response'); expect(String(e)).not.toContain('private-token'); }
  });
  it("does not mark offline or corrupted uploads successful", async () => {
    const item = { id: 'id', name: 'file', sha256: '', driveId: 'existing' };
    await expect(new Drive('token', async () => { throw new Error('offline'); }).upload(Buffer.from('a'), item, 'folder', async () => {})).rejects.toThrow('offline');
    await expect(new Drive('token', async () => Response.json({ size: 1, md5Checksum: 'wrong' })).upload(Buffer.from('a'), item, 'folder', async () => {})).rejects.toThrow('checksum');
  });
  it("publishes only matching sanitized status and detects stale reports", async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ldss-status-'));
    try {
      const path = join(dir,'status.json');
      await writeFile(path, JSON.stringify({ version:1,database:'production',environment:'production',checkedAt:'2026-01-01T00:00:00.000Z',lastBackup:null,lastUpload:null,lastRestore:null,pending:2,error:null,refreshToken:'never expose' }));
      const result = await backupStatus(path,'production','production');
      expect(result).toMatchObject({ configured:true,pending:2,stale:true });
      expect(JSON.stringify(result)).not.toContain('never expose');
      expect(await backupStatus(path,'other','production')).toMatchObject({ configured:false });
    } finally { await rm(dir,{recursive:true}); }
  });
});

it('stages archives idempotently, repairs missing copies and rejects corruption', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ldss-desktop-'));
  try {
    const sync = join(dir, 'sync'); await mkdir(sync);
    const source = join(dir, 'backup.ldssbackup');
    const bytes = randomBytes(100);
    await writeFile(source, bytes);
    const target = await stageDesktopArchive(source, sync, digest(bytes));
    expect(await readFile(target)).toEqual(bytes);
    await stageDesktopArchive(source, sync, digest(bytes));
    await unlink(target);
    await stageDesktopArchive(source, sync, digest(bytes));
    await writeFile(target, 'corrupt');
    await expect(stageDesktopArchive(source, sync, digest(bytes))).rejects.toThrow('checksum');
    await expect(stageDesktopArchive(source, join(dir, 'missing'), digest(bytes))).rejects.toThrow();
    expect(await readFile(source)).toEqual(bytes);
  } finally { await rm(dir, {recursive:true}); }
});

it('accepts desktop configuration without OAuth and rejects synced private keys', () => {
  const root = join(tmpdir(), 'ldss-config-fixture');
  const config = { mode:'desktop', environment:'production', database:'office_prod', port:3306, backupUser:'backup', backupPassword:'synthetic', directory:join(root,'private'), keyFile:join(root,'keys','key.bin'), statusFile:join(root,'status','status.json'), dumpTool:join(root,'dump.exe'), mysqlTool:join(root,'mysql.exe'), syncDirectory:join(root,'sync') };
  expect(validateConfig(config)).toEqual(config);
  expect(() => validateConfig({...config, keyFile:join(config.syncDirectory,'key.bin')})).toThrow();
});
