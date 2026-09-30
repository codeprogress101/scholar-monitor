import mysql from "mysql2/promise";
import { randomBytes, createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const envPath = new URL(".env", root);
const database = "ldss_scholar_monitor_dev";
const user = "ldss_monitor_local";
const migration = "20260929000000_f00_baseline.sql";
let connection;
try {
  if (process.env.APP_ENV && process.env.APP_ENV !== "development")
    throw new Error("Local setup requires development environment.");
  if (process.env.NODE_ENV === "production")
    throw new Error("Local setup cannot run in production.");
  if (existsSync(envPath))
    throw new Error(".env already exists; local setup will not overwrite it.");
  connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
    connectTimeout: 5000,
    multipleStatements: false,
  });
  const [databases] = await connection.execute(
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
    [database],
  );
  const [users] = await connection.execute(
    "SELECT User FROM mysql.user WHERE User = ?",
    [user],
  );
  if (databases.length || users.length)
    throw new Error(
      "The LDSS database or local user already exists; refusing to change it.",
    );
  const sql = await readFile(
    new URL(`db/migrations/${migration}`, root),
    "utf8",
  );
  const password = randomBytes(32).toString("hex");
  await connection.query(
    "CREATE DATABASE `ldss_scholar_monitor_dev` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  await connection.changeUser({ database });
  await connection.query(sql);
  await connection.execute(
    "INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)",
    [migration, createHash("sha256").update(sql).digest("hex")],
  );
  await connection.query(
    `CREATE USER 'ldss_monitor_local'@'localhost' IDENTIFIED BY ${connection.escape(password)}`,
  );
  await connection.query(
    "GRANT SELECT ON `ldss_scholar_monitor_dev`.`schema_migrations` TO 'ldss_monitor_local'@'localhost'",
  );
  const runtime = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user,
    password,
    database,
  });
  try {
    await runtime.query("SELECT version FROM schema_migrations LIMIT 1");
  } finally {
    await runtime.end();
  }
  const content = [
    "APP_ENV=development",
    "HOST=127.0.0.1",
    "PORT=3001",
    "LOG_LEVEL=info",
    "APP_ORIGIN=http://127.0.0.1:5173",
    "DB_HOST=127.0.0.1",
    "DB_PORT=3306",
    `DB_NAME=${database}`,
    `DB_USER=${user}`,
    `DB_PASSWORD=${password}`,
    "",
  ].join("\n");
  await writeFile(envPath, content, { flag: "wx", mode: 0o600 });
  console.log(
    `Created local database ${database}, baseline migration, and restricted runtime identity.`,
  );
  console.log(
    `Server credentials saved privately to ${fileURLToPath(envPath)}. No default application login exists.`,
  );
} catch (error) {
  if (error instanceof Error && !("code" in error))
    console.error(error.message);
  else
    console.error(
      "Local database setup failed. Check XAMPP MySQL and administrator access; credentials were not logged. Inspect any partial setup before retrying.",
    );
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
