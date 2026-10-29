import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, stat, statfs, unlink, rename } from "node:fs/promises";
import { homedir, userInfo } from "node:os";
import { join, resolve } from "node:path";
import mysql from "mysql2/promise";
import { localAdmin } from "./migration-lib.mjs";

const MAGIC = Buffer.from("LDSSB001");
// BACKUP-1: the measured 81.6 MiB UAT dump needs bounded growth headroom.
// Retain the existing archive, decoded-envelope and per-table row ceilings.
const MAX_SQL = 128 * 1024 * 1024;
const MAX_ARCHIVE = 96 * 1024 * 1024;
const MAX_PAYLOAD = 192 * 1024 * 1024;
const MAX_ROWS = 100000;
export const BACKUP_LIMITS = Object.freeze({
  sqlBytes: MAX_SQL, archiveBytes: MAX_ARCHIVE,
  payloadBytes: MAX_PAYLOAD, rowsPerTable: MAX_ROWS,
});
export const keyPath = join(homedir(), ".ldss-backup", "key.bin");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const identifier = (value) => {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error("Invalid database identifier.");
  return `\`${value}\``;
};

export function seal(payload, key) {
  if (typeof payload.sql !== "string" || Buffer.byteLength(payload.sql) > MAX_SQL)
    throw new Error("Backup SQL exceeds its size limit.");
  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json) > MAX_PAYLOAD)
    throw new Error("Backup payload exceeds its size limit.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(gzipSync(json)), cipher.final()]);
  const archive = Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), encrypted]);
  if (archive.length > MAX_ARCHIVE) throw new Error("Backup exceeds size limit.");
  return archive;
}

export function unseal(bytes, key, expectedDatabase = "ldss_scholar_monitor_dev") {
  if (bytes.length < 37 || bytes.length > MAX_ARCHIVE || !bytes.subarray(0, 8).equals(MAGIC))
    throw new Error("Invalid backup format or size.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(8, 20));
    decipher.setAAD(MAGIC);
    decipher.setAuthTag(bytes.subarray(20, 36));
    // Authenticate the complete ciphertext before parsing or running any SQL.
    const compressed = Buffer.concat([decipher.update(bytes.subarray(36)), decipher.final()]);
    const payload = JSON.parse(gunzipSync(compressed, { maxOutputLength: MAX_PAYLOAD }).toString("utf8"));
    if (payload.version !== 1 || payload.database !== expectedDatabase ||
        typeof payload.sql !== "string" || Buffer.byteLength(payload.sql) > MAX_SQL ||
        hash(payload.sql) !== payload.sqlHash || !payload.inventory?.tables)
      throw new Error("Invalid payload");
    return payload;
  } catch {
    throw new Error("Backup authentication or payload validation failed; no restore attempted.");
  }
}

export function run(executable, args, { input, password = "", limit = MAX_SQL } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      shell: false,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP, TMP: process.env.TMP, MYSQL_PWD: password },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks = [];
    let size = 0;
    let failed = false;
    const fail = () => {
      if (failed) return;
      failed = true;
      child.kill();
      reject(new Error("Backup database tool failed, timed out or exceeded its size limit; raw SQL and credentials withheld."));
    };
    const timer = setTimeout(fail, 120_000);
    child.on("error", fail);
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) fail();
      else chunks.push(chunk);
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failed) return;
      if (code !== 0) fail();
      else resolveRun(Buffer.concat(chunks));
    });
    child.stdin.end(input);
  });
}

export async function initializeKey() {
  const directory = join(homedir(), ".ldss-backup");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (process.platform === "win32") {
    const principal = process.env.USERDOMAIN
      ? `${process.env.USERDOMAIN}\\${userInfo().username}` : userInfo().username;
    await run("icacls.exe", [directory, "/inheritance:r", "/grant:r", `${principal}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F"]);
  }
  // Exclusive creation: never silently rotate a key and strand older backups.
  await writeFile(keyPath, randomBytes(32), { flag: "wx", mode: 0o600 });
  return keyPath;
}

export async function loadKey() {
  const key = await readFile(keyPath);
  if (key.length !== 32) throw new Error("Backup key must contain exactly 32 bytes.");
  return key;
}

export async function inventory(db) {
  const [[{ name }]] = await db.query("SELECT DATABASE() AS name");
  const select = async (sql) => (await db.query(sql, [name]))[0];
  const tables = await select("SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  for (const table of tables) {
    if (table.engine !== "InnoDB") throw new Error("Backup supports InnoDB tables only.");
    // Logical values, including generated columns and full datetime precision,
    // avoid storage-format differences in MariaDB's CHECKSUM TABLE.
    const [rows] = await db.query({ sql: `SELECT * FROM ${identifier(table.name)} LIMIT ${MAX_ROWS + 1}`,
      rowsAsArray: true, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true });
    if (rows.length > MAX_ROWS) throw new Error("Local recovery tooling supports at most 100000 rows per table.");
    table.count = rows.length;
    table.checksum = hash(rows.map((row) => hash(JSON.stringify(row))).sort().join("\n"));
  }
  const columns = await select("SELECT TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,GENERATION_EXPRESSION,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,ORDINAL_POSITION");
  const indexes = await select("SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,INDEX_TYPE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX");
  const constraints = await select("SELECT TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? ORDER BY TABLE_NAME,CONSTRAINT_NAME");
  const foreignKeys = await select("SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,ORDINAL_POSITION,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=? ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION");
  const rules = await select("SELECT TABLE_NAME,CONSTRAINT_NAME,UPDATE_RULE,DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? ORDER BY TABLE_NAME,CONSTRAINT_NAME");
  const checks = await select("SELECT TABLE_NAME,CONSTRAINT_NAME,CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? ORDER BY TABLE_NAME,CONSTRAINT_NAME");
  const triggers = await select("SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT,SQL_MODE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? ORDER BY TRIGGER_NAME");
  const views = await select("SELECT TABLE_NAME,VIEW_DEFINITION,CHECK_OPTION,SECURITY_TYPE FROM information_schema.VIEWS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME");
  for (const view of views) {
    // Check each restored view actually executes with its restored definer.
    await db.query(`SELECT * FROM ${identifier(view.TABLE_NAME)} LIMIT 0`);
    view.VIEW_DEFINITION = view.VIEW_DEFINITION.replaceAll(`${identifier(name)}.`, "");
  }
  return { tables, columns, indexes, constraints, foreignKeys, rules, checks, triggers, views };
}

const clientArgs = (user) => ["--no-defaults", "--host=127.0.0.1", `--port=${Number(process.env.DB_PORT ?? 3306)}`, `--user=${user}`, "--default-character-set=utf8mb4"];

async function requireArchiveSpace(directory) {
  await mkdir(directory, { recursive: true });
  const space = await statfs(directory, { bigint: true });
  // Reserve a complete bounded archive before taking source locks. The final
  // write can still fail (quota/concurrent use); its partial file is removed.
  if (space.bavail * space.bsize < BigInt(MAX_ARCHIVE))
    throw new Error("Insufficient backup storage for the bounded archive.");
}

export async function createBackup(key, context) {
  await requireArchiveSpace(context?.directory ?? "output/backups");
  const db = context ? await mysql.createConnection(context.connection) : await localAdmin();
  const source = context?.connection.database ?? "ldss_scholar_monitor_dev";
  let locked = false;
  try {
    await db.query("SET SESSION lock_wait_timeout=10");
    // Counts, schema and dump must describe precisely the same state.
    // This local administrative operation briefly pauses writes server-wide.
    if (context) {
      // Production backup credentials need only source-schema privileges, not
      // a global RELOAD grant or a server-wide pause affecting other databases.
      const [tables] = await db.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME");
      if (!tables.length) throw new Error("Source database is empty.");
      await db.query(`LOCK TABLES ${tables.map(t => `${identifier(t.name)} READ`).join(', ')}`);
    } else await db.query("FLUSH TABLES WITH READ LOCK");
    locked = true;
    const [[{ n }]] = await db.query("SELECT (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE()) + (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE()) AS n");
    if (Number(n)) throw new Error("Unexpected routines/events require a reviewed backup format upgrade.");
    const state = await inventory(db);
    const sql = (await run(context?.dumpTool ?? "C:/xampp/mysql/bin/mysqldump.exe", [
      ...(context ? context.args : clientArgs("root")), "--single-transaction", "--quick", "--skip-lock-tables",
      "--skip-add-locks", "--hex-blob", "--triggers", "--skip-comments",
      source,
    ], { password: context?.connection.password ?? process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "" })).toString("utf8");
    const payload = { version: 1, database: source, createdAt: new Date().toISOString(),
      sqlHash: hash(sql), sql, inventory: state };
    await db.query("UNLOCK TABLES");
    locked = false;
    const encrypted = seal(payload, key);
    unseal(encrypted, key, source);
    await mkdir(context?.directory ?? "output/backups", { recursive: true });
    const file = resolve(context?.directory ?? "output/backups", `ldss-${Date.now()}-${randomBytes(4).toString("hex")}.ldssbackup`);
    try {
      await writeFile(`${file}.partial`, encrypted, { flag: "wx", mode: 0o600 });
      await rename(`${file}.partial`, file);
    } catch (error) {
      if (error.code !== "EEXIST") await unlink(`${file}.partial`).catch(() => {});
      throw error;
    }
    return { file, createdAt: payload.createdAt, tables: state.tables.length,
      bytes: encrypted.length, sqlBytes: Buffer.byteLength(sql) };
  } finally {
    if (locked) await db.query("UNLOCK TABLES").catch(() => {});
    await db.end();
  }
}

export async function restoreBackup(file, key, { keep = false, context } = {}) {
  if ((await stat(file)).size > MAX_ARCHIVE) throw new Error("Backup exceeds size limit.");
  const archive = await readFile(file);
  const payload = unseal(archive, key, context?.sourceDatabase);
  const db = context ? await mysql.createConnection(context.admin) : await localAdmin(); // Default development guard retained.
  const suffix = `${Date.now()}_${randomBytes(4).toString("hex")}`;
  const target = `ldss_restore_${suffix}`;
  const username = `ldss_r_${randomBytes(8).toString("hex")}`;
  const password = randomBytes(32).toString("base64url");
  const account = `${db.escape(username)}@'localhost'`;
  let created = false;
  let userCreated = false;
  let verified = false;
  const started = Date.now();
  try {
    await db.query(`CREATE DATABASE ${identifier(target)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    await db.query(`CREATE USER ${account} IDENTIFIED BY ${db.escape(password)}`);
    userCreated = true;
    await db.query(`GRANT ALL PRIVILEGES ON ${identifier(target)}.* TO ${account}`);
    // Rebind only dump metadata definers, never INSERT values. Restore executes
    // as a disposable account with no access to the source or other databases.
    const sql = payload.sql.replace(/^\/\*!\d{5}[^\r\n]*$/gm, (line) =>
      line.replace(/DEFINER=`(?:[^`]|``)*`@`(?:[^`]|``)*`/g, "DEFINER=CURRENT_USER"));
    await run(context?.mysqlTool ?? "C:/xampp/mysql/bin/mysql.exe", [...(context ? ["--no-defaults", "--host=127.0.0.1", `--port=${context.admin.port}`, `--user=${username}`, "--default-character-set=utf8mb4"] : clientArgs(username)), "--binary-mode", "--local-infile=0", target], { input: sql, password });
    const restored = await mysql.createConnection({ host: "127.0.0.1", port: context?.admin.port ?? Number(process.env.DB_PORT ?? 3306),
      user: username, password, database: target });
    let state;
    try {
      state = await inventory(restored);
      await verifyConstraints(restored);
    } finally { await restored.end(); }
    const differences = Object.keys(state).filter((section) => JSON.stringify(state[section]) !== JSON.stringify(payload.inventory[section]));
    if (differences.length)
      throw new Error(`Restored inventory differs (${differences.join(", ")}; tables: ${state.tables.filter((table, index) => JSON.stringify(table) !== JSON.stringify(payload.inventory.tables[index])).map((table) => table.name).join(", ")}); recovery not verified.`);
    verified = true;
    const report = { version: 1, verifiedAt: new Date().toISOString(), backupCreatedAt: payload.createdAt,
      backupSha256: hash(archive), target, retained: keep, definerAccount: keep ? username : null,
      elapsedSeconds: (Date.now() - started) / 1000, tables: state.tables.map(({ name, count }) => ({ name, count })),
      checks: ["all table counts and checksums", "columns and indexes", "foreign keys and check constraints",
        "trigger definitions", "view definitions and execution", "unique, foreign-key and check rejection probes"], verified: true };
    await mkdir(context?.directory ?? "output/backups", { recursive: true });
    const reportFile = resolve(context?.directory ?? "output/backups", `restore-${suffix}.json`);
    await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return { target, reportFile, elapsedSeconds: report.elapsedSeconds, retained: keep };
  } finally {
    // Only names created by this invocation are ever removed. Live DB is never a target.
    try {
      if (!keep || !verified) {
        if (created) await db.query(`DROP DATABASE ${identifier(target)}`);
        if (userCreated) await db.query(`DROP USER ${account}`);
      }
    } finally { await db.end(); }
  }
}

async function verifyConstraints(db) {
  const reject = async (sql, expected) => {
    try { await db.query(sql); } catch (error) {
      if (error.errno === expected) return;
      throw new Error("Restored constraint probe failed unexpectedly.", { cause: error });
    }
    throw new Error("Restored database accepted a constraint violation.");
  };
  await db.beginTransaction();
  try {
    // Fixed synthetic values only; always rolled back, even on an unexpected success.
    await reject("INSERT INTO roles SELECT * FROM roles LIMIT 1", 1062);
    await reject("INSERT INTO user_roles(id,user_id,role_code,granted_at) VALUES(UUID(),UUID(),'missing_test_role',UTC_TIMESTAMP(6))", 1452);
    await reject("INSERT INTO user_roles(id,user_id,role_code,granted_at,revoked_at) VALUES(UUID(),UUID(),'staff','2026-01-02','2026-01-01')", 4025);
  } finally { await db.rollback(); }
}
