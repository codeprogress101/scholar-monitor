import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";

export async function localAdmin() {
  if (
    process.env.APP_ENV !== "development" ||
    process.env.DB_NAME !== "ldss_scholar_monitor_dev" ||
    !["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? "")
  )
    throw new Error(
      "This command only operates on the configured local LDSS development database.",
    );
  return mysql.createConnection({
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: "root",
    password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
    database: process.env.DB_NAME,
    connectTimeout: 5000,
    timezone: "Z",
    multipleStatements: false,
  });
}

export async function applyMigrations(connection) {
  const [lock] = await connection.query(
    "SELECT GET_LOCK(CONCAT(DATABASE(), ':migrations'), 10) AS acquired",
  );
  if (lock[0].acquired !== 1)
    throw new Error("Could not acquire the database migration lock.");
  try {
    await connection.query("SET time_zone = '+00:00'");
    let existing = [];
    try {
      [existing] = await connection.query(
        "SELECT version, checksum FROM schema_migrations",
      );
    } catch (error) {
      if (error.code !== "ER_NO_SUCH_TABLE") throw error;
    }
    const folder = new URL("../db/migrations/", import.meta.url);
    const names = (await readdir(folder))
      .filter((name) => /^\d{14}_f\d{2}_[a-z_]+\.sql$/.test(name))
      .sort();
    const migrations = await Promise.all(
      names.map(async (version) => {
        const sql = await readFile(new URL(version, folder), "utf8");
        return {
          version,
          sql,
          checksum: createHash("sha256").update(sql).digest("hex"),
        };
      }),
    );
    // Verify every existing checksum before any new DDL is attempted.
    for (const applied of existing) {
      if (
        migrations.find((entry) => entry.version === applied.version)
          ?.checksum !== applied.checksum
      )
        throw new Error(
          "Migration history differs from repository files; no changes applied.",
        );
    }
    const appliedNow = [];
    for (const migration of migrations) {
      if (existing.some((entry) => entry.version === migration.version))
        continue;
      for (const statement of migration.sql.split(
        /\r?\n-- statement-break\r?\n/,
      ))
        if (statement.trim()) await connection.query(statement);
      await connection.execute(
        "INSERT INTO schema_migrations (version,checksum,applied_at) VALUES (?,?,UTC_TIMESTAMP(6))",
        [migration.version, migration.checksum],
      );
      appliedNow.push(migration.version);
    }
    return appliedNow;
  } finally {
    await connection.query(
      "SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':migrations'))",
    );
  }
}

export async function grantAuthRuntime(connection, database, user) {
  if (!/^[a-zA-Z0-9_]+$/.test(database) || !/^[a-zA-Z0-9_]+$/.test(user))
    throw new Error("Invalid database identity.");
  const table = (name) => `\`${database}\`.\`${name}\``;
  const identity = `${connection.escape(user)}@'localhost'`;
  for (const name of [
    "requirement_workflow_events",
    "requirement_workflow_commands",
    "requirement_receipts",
    "requirement_receipt_commands",
    "requirement_checklists",
    "requirement_instances",
    "requirement_generation_commands",
    "requirement_definitions",
    "requirement_definition_versions",
    "requirement_definition_commands",
    "masterlist_amendments",
    "masterlist_amendment_decisions",
    "masterlist_amendment_versions",
    "masterlist_amendment_commands",
    "masterlist_workflow_events",
    "masterlist_publications",
    "masterlist_activations",
    "masterlist_versions",
    "masterlist_entries",
    "masterlist_commands",
    "academic_changes",
    "academic_change_decisions",
    "academic_change_commands",
    "academic_records",
    "academic_commands",
    "status_change_requests",
    "status_change_decisions",
    "status_change_commands",
    "scholarship_records",
    "qualification_events",
    "qualification_commands",
  ]) {
    await connection.query(
      `GRANT SELECT, INSERT ON ${table(name)} TO ${identity}`,
    );
  }
  await connection.query(
    `GRANT UPDATE (status,version,updated_at) ON ${table("masterlist_versions")} TO ${identity}`,
  );
  await connection.query(
    `GRANT UPDATE (snapshot,award_number,removed_at,updated_at) ON ${table("masterlist_entries")} TO ${identity}`,
  );
  await connection.query(
    `GRANT UPDATE (status,version,last_effective_on,operational_status,status_version,status_effective_on,updated_at) ON ${table("scholarship_records")} TO ${identity}`,
  );
  for (const name of [
    "scholars",
    "scholar_identifiers",
    "scholar_contacts",
    "scholar_commands",
    "scholar_id_sequences",
  ]) {
    await connection.query(
      `GRANT SELECT, INSERT ON ${table(name)} TO ${identity}`,
    );
  }
  await connection.query(
    `GRANT UPDATE (first_name,middle_name,last_name,suffix,birth_date,academic_year_id,barangay_id,version,updated_at) ON ${table("scholars")} TO ${identity}`,
  );
  await connection.query(
    `GRANT UPDATE (email,phone,address_line) ON ${table("scholar_contacts")} TO ${identity}`,
  );
  await connection.query(
    `GRANT UPDATE (last_number) ON ${table("scholar_id_sequences")} TO ${identity}`,
  );
  for (const name of [
    "academic_years",
    "semesters",
    "barangays",
    "schools",
    "courses",
    "system_settings",
  ]) {
    await connection.query(
      `GRANT SELECT, INSERT ON ${table(name)} TO ${identity}`,
    );
    const columns =
      "name, version, archived_at, updated_at" +
      (["academic_years", "semesters"].includes(name)
        ? ", starts_on, ends_on, locked_at"
        : name === "system_settings"
          ? ", value_type, setting_value"
          : "");
    await connection.query(
      `GRANT UPDATE (${columns}) ON ${table(name)} TO ${identity}`,
    );
  }
  await connection.query(
    `GRANT SELECT ON ${table("configuration_guard")} TO ${identity}`,
  );
  await connection.query(
    `GRANT SELECT, INSERT ON ${table("configuration_commands")} TO ${identity}`,
  );
  for (const [permission, name] of [
    ["SELECT", "schema_migrations"],
    ["SELECT", "roles"],
    ["SELECT", "permissions"],
    ["SELECT", "role_permissions"],
    ["SELECT", "user_roles"],
    ["SELECT", "users"],
    ["UPDATE (password_hash, version, updated_at)", "users"],
    ["SELECT, INSERT", "auth_sessions"],
    ["UPDATE (last_seen_at, revoked_at)", "auth_sessions"],
    ["SELECT", "password_resets"],
    ["UPDATE (consumed_at)", "password_resets"],
    ["SELECT, INSERT, UPDATE", "auth_rate_limits"],
    ["INSERT", "audit_logs"],
  ])
    await connection.query(
      `GRANT ${permission} ON ${table(name)} TO ${identity}`,
    );
}
