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
  await connection.query(`GRANT SELECT ON ${table("notification_events")} TO ${identity}`);
  await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table("notification_reads")} TO ${identity}`);
  await connection.query(`GRANT SELECT ON ${table("scholar_profile_audit")} TO ${identity}`);
  await connection.query(`GRANT SELECT ON ${table("export_audit_metadata")} TO ${identity}`);
  await connection.query(`GRANT SELECT ON ${table("audit_event_view")} TO ${identity}`);
  await connection.query(`GRANT SELECT ON ${table("graduation_record_corrections")} TO ${identity}`);
  for (const name of ["scholar_semesters", "scholar_semester_revisions", "requirement_coverage", "workflow_scope_versions", "semester_review_events", "semester_entitlements"])
    await connection.query(`GRANT SELECT ON ${table(name)} TO ${identity}`);
  for (const name of [
    "prior_batch_approvals", "prior_batch_members", "prior_batch_documents", "prior_batch_waiver_corrections", "historical_payout_setups",
    "payroll_legacy_conversions",
    "placement_policy_reviews",
    "payroll_treasury_evidence",
    "payroll_treasury_confirmations",
    "payroll_historical_receipts",
    "regular_payout_periods",
    "semester_submission_versions",
    "payroll_submission_windows",
    "payroll_submission_window_versions",
    "requirement_document_evidence",
    "requirement_timing_decisions",
    "payroll_deferrals",
    "payroll_unpaid_classifications",
    "payroll_draft_deferrals",
    "payroll_reprocessing",
    "payroll_reprocessing_events",
    "payroll_reprocessing_attempts",
    "payroll_allocations",
    "graduation_confirmations",
    "entitlement_release_links",
    "semester_entitlement_events",
    "semester_entitlements",
    "continuing_roster_batches",
    "continuing_roster_entries",
    "continuing_roster_decisions",
    "participations",
    "participation_events",
    "workflow_authority_versions",
    "workflow_commands",
    "semester_review_events",
    "workflow_policy_versions",
    "scholar_semesters",
    "scholar_semester_revisions",
    "semester_document_reconciliations",
    "entrant_grading_card_reviews",
    "requirement_coverage",
    "workflow_scope_versions",
    "scholar_intakes",
    "course_pending_exceptions",
    "course_pending_events",
    "import_jobs",
    "import_confirmations",
    "ovr_amendments",
    "payment_corrections",
    "payment_records",
    "ovr_finalizations",
    "ovr_batches",
    "ovr_batch_events",
    "ovr_entries",
    "ovr_commands",
    "eligibility_overrides",
    "eligibility_override_events",
    "eligibility_override_commands",
    "payout_eligibility",
    "payout_eligibility_commands",
    "payout_cycles",
    "payout_cycle_versions",
    "payout_requirements",
    "payout_cycle_commands",
    "requirement_waivers",
    "requirement_waiver_commands",
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
    "masterlist_revisions",
    "masterlist_addition_events",
    "masterlist_consolidations",
    "masterlist_consolidation_links",
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
    const periodColumns = columns + (name === "semesters" ? ", term_kind" : "");
    await connection.query(
      `GRANT UPDATE (${periodColumns}) ON ${table(name)} TO ${identity}`,
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

/** Bring an owned restore to the notification schema before rehearsing older migrations.
 * The working database is deliberately not upgraded by these regression tests. */
export async function prepareRestoredNotificationSchema(connection) {
  const assert = (await import("node:assert/strict")).default;
  const [[identity]] = await connection.query("SELECT DATABASE() AS db");
  assert.match(identity.db, /^ldss_restore_\d+_[a-f0-9]{8}$/);
  const upgrades = ["20261008040000_f37_notifications.sql","20261009010000_f36_unclaimed_reprocessing.sql","20261010020000_f38_treasury_reconciliation.sql","20261010030000_f38_placement_policy_reviews.sql","20261010040000_f38_legacy_conversion.sql"];
  const [existing] = await connection.query("SELECT version FROM schema_migrations");
  const pending = upgrades.filter(m=>!existing.some(e=>e.version === m));
  if (!pending.length) return;
  const { inventory } = await import("./backup-lib.mjs");
  const before = await inventory(connection);
  const oldColumns = before.columns.filter(c=>c.TABLE_NAME === "payment_records").map(c=>c.COLUMN_NAME);
  for(const column of oldColumns) assert.match(column,/^[a-z_]+$/);
  const paymentSql=`SELECT ${oldColumns.map(c=>"`"+c+"`").join(",")} FROM payment_records ORDER BY id`;
  const [originalPayments] = await connection.query({sql:paymentSql,rowsAsArray:true,dateStrings:true});
  assert.deepEqual(await applyMigrations(connection), pending);
  const after = await inventory(connection);
  for (const table of before.tables.filter(t => !["schema_migrations","payment_records"].includes(t.name)))
    assert.deepEqual(after.tables.find(t => t.name === table.name), table, `Additive upgrade preserves ${table.name}`);
  assert.deepEqual((await connection.query({sql:paymentSql,rowsAsArray:true,dateStrings:true}))[0],originalPayments,"Every original payment field survives migration unchanged");
  for (const table of after.tables.filter(t=>!before.tables.some(b=>b.name === t.name))) assert.equal(table.count,0);
  assert.deepEqual(await applyMigrations(connection), []);
}
