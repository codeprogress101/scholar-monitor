// Read-only: no DDL, account creation, migration or credential output.
import mysql from "mysql2/promise";
import { summarizeGrants } from "./grant-summary.mjs";
let db;
let stage = "configuration";
try {
  const missing = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"].filter(name => !process.env[name]);
  if (missing.length) {
    console.error(`Missing settings: ${missing.join(", ")}`);
    throw new Error("Missing database configuration");
  }
  if (process.env.DB_NAME !== "iskotwfh_ldss_monitor") throw new Error("Unexpected target");
  stage = "connection";
  db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, connectTimeout: 10000,
  });
  stage = "database inspection";
  const [[server]] = await db.query("SELECT VERSION() AS version, DATABASE() AS target");
  const [[inventory]] = await db.query("SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema=DATABASE()");
  stage = "permission inspection";
  const [rows] = await db.query("SHOW GRANTS FOR CURRENT_USER");
  const grants = rows.map(row => String(Object.values(row)[0]));
  console.log(JSON.stringify({
    node: process.version, databaseVersion: server.version, target: server.target,
    existingTables: Number(inventory.tables),
    ...summarizeGrants(grants, process.env.DB_NAME),
    note: "Read-only inspection. Scoped grants and triggers still need verification; this is not deployment approval.",
  }, null, 2));
} catch (error) {
  const safeCodes = new Set(["ER_ACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ER_PARSE_ERROR", "ER_TABLEACCESS_DENIED_ERROR"]);
  const code = safeCodes.has(error?.code) ? error.code : "CHECK_FAILED";
  console.error(`Hosting check failed at ${stage}: ${code}. No changes were made.`);
  process.exitCode = 1;
} finally {
  if (db) await db.end();
}
