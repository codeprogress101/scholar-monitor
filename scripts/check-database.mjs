import "dotenv/config";
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

let connection;
try {
  assert.equal(
    process.env.APP_ENV,
    "development",
    "Database checks require the local development configuration",
  );
  assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
  assert.equal(process.env.DB_USER, "ldss_monitor_local");
  connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 3000,
  });
  const [rows] = await connection.query(
    "SELECT version, checksum FROM schema_migrations",
  );
  assert.equal(rows.length, 16);
  for (const row of rows) {
    assert.match(row.version, /^\d{14}_f\d{2}_[a-z_]+\.sql$/);
    const sql = await readFile(
      new URL(`../db/migrations/${row.version}`, import.meta.url),
      "utf8",
    );
    assert.equal(row.checksum, createHash("sha256").update(sql).digest("hex"));
  }
  // EXPLAIN checks privileges without executing DML or changing schema/data.
  await assert.rejects(
    connection.query("EXPLAIN DELETE FROM schema_migrations WHERE 1 = 0"),
    (error) => error.code === "ER_TABLEACCESS_DENIED_ERROR",
  );
  await assert.rejects(
    connection.query("SELECT User FROM mysql.user LIMIT 1"),
    (error) =>
      ["ER_TABLEACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR"].includes(
        error.code,
      ),
  );
  const [grants] = await connection.query("SHOW GRANTS");
  const grantText = grants.map((row) => Object.values(row)[0]).join("\n");
  assert.match(grantText, /GRANT SELECT ON/);
  assert.doesNotMatch(
    grantText,
    /GRANT (?:ALL|CREATE|ALTER|DROP|DELETE)|WITH GRANT OPTION/,
  );
  for (const sql of [
    "EXPLAIN UPDATE requirement_workflow_events SET to_status=to_status WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_workflow_events WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_workflow_commands WHERE 1=0",
    "EXPLAIN UPDATE requirement_receipts SET storage_location=storage_location WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_receipts WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_receipt_commands WHERE 1=0",
    "EXPLAIN UPDATE requirement_checklists SET policy_date=policy_date WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_checklists WHERE 1=0",
    "EXPLAIN UPDATE requirement_instances SET definition_version_id=definition_version_id WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_instances WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_generation_commands WHERE 1=0",
    "EXPLAIN UPDATE requirement_definitions SET code=code WHERE 1=0",
    "EXPLAIN UPDATE requirement_definition_versions SET name=name WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_definition_versions WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_definition_commands WHERE 1=0",
    "EXPLAIN UPDATE masterlist_amendments SET reason=reason WHERE 1=0",
    "EXPLAIN DELETE FROM masterlist_amendment_decisions WHERE 1=0",
    "EXPLAIN UPDATE masterlist_amendment_versions SET revision=revision WHERE 1=0",
    "EXPLAIN DELETE FROM masterlist_amendment_commands WHERE 1=0",
    "EXPLAIN DELETE FROM masterlist_entries WHERE 1=0",
    "EXPLAIN UPDATE masterlist_publications SET snapshot=snapshot WHERE 1=0",
    "EXPLAIN DELETE FROM masterlist_workflow_events WHERE 1=0",
    "EXPLAIN DELETE FROM masterlist_activations WHERE 1=0",
    "EXPLAIN UPDATE masterlist_entries SET scholar_id=scholar_id WHERE 1=0",
    "EXPLAIN UPDATE masterlist_commands SET resulting_version=resulting_version WHERE 1=0",
    "EXPLAIN UPDATE academic_changes SET remarks=remarks WHERE 1=0",
    "EXPLAIN DELETE FROM academic_changes WHERE 1=0",
    "EXPLAIN UPDATE academic_change_decisions SET reason=reason WHERE 1=0",
    "EXPLAIN DELETE FROM academic_change_decisions WHERE 1=0",
    "EXPLAIN UPDATE academic_change_commands SET outcome=outcome WHERE 1=0",
    "EXPLAIN UPDATE academic_records SET year_level=year_level WHERE 1=0",
    "EXPLAIN DELETE FROM academic_records WHERE 1=0",
    "EXPLAIN UPDATE academic_commands SET payload_hash=payload_hash WHERE 1=0",
    "EXPLAIN UPDATE status_change_requests SET reason=reason WHERE 1=0",
    "EXPLAIN DELETE FROM status_change_decisions WHERE 1=0",
    "EXPLAIN UPDATE status_change_commands SET outcome=outcome WHERE 1=0",
    "EXPLAIN DELETE FROM scholarship_records WHERE 1=0",
    "EXPLAIN UPDATE scholarship_records SET academic_year_id=academic_year_id WHERE 1=0",
    "EXPLAIN UPDATE qualification_events SET reason=reason WHERE 1=0",
    "EXPLAIN DELETE FROM qualification_events WHERE 1=0",
    "EXPLAIN UPDATE qualification_commands SET resulting_version=resulting_version WHERE 1=0",
    "EXPLAIN DELETE FROM users WHERE 1=0",
    "EXPLAIN DELETE FROM scholars WHERE 1=0",
    "EXPLAIN UPDATE scholar_identifiers SET entry_year=entry_year WHERE 1=0",
    "EXPLAIN UPDATE scholar_commands SET resulting_version=resulting_version WHERE 1=0",
    "EXPLAIN DELETE FROM schools WHERE 1=0",
    "EXPLAIN UPDATE schools SET code=code WHERE 1=0",
    "EXPLAIN UPDATE configuration_commands SET result=result WHERE 1=0",
    "EXPLAIN UPDATE users SET disabled_at=NULL WHERE 1=0",
    "EXPLAIN UPDATE audit_logs SET action=action WHERE 1=0",
    "EXPLAIN DELETE FROM audit_logs WHERE 1=0",
    "EXPLAIN UPDATE user_roles SET revoked_at=NULL WHERE 1=0",
    "EXPLAIN DELETE FROM role_permissions WHERE 1=0",
    "EXPLAIN UPDATE permissions SET label=label WHERE 1=0",
  ])
    await assert.rejects(connection.query(sql));
  console.log(
    "Database checks passed: connection, all migration checksums, protected identity/audit/role/metadata writes, denied system-table access, and restricted grants.",
  );
} catch {
  console.error(
    "Database verification failed. Check local setup and restricted grants; credentials and server errors were withheld.",
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
