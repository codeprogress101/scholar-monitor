import { spawn } from "node:child_process";
import { resolve } from "node:path";

// Each suite creates and cleans up its own disposable MariaDB database.
// Run suites sequentially; races within each suite use concurrent requests.
const suites = [
  ["Scholar ID allocation and concurrent edits", "scripts/test-scholars-db.ts"],
  [
    "Independent approvals and stale versions",
    "scripts/test-academic-changes-db.ts",
  ],
  [
    "Checklist provisioning and atomic receiving",
    "scripts/test-receiving-db.ts",
  ],
  ["Import confirmation and durable retries", "scripts/test-import-db.ts"],
  [
    "Finalization, payments and corrections",
    "scripts/test-eligibility-db.ts",
    "--main-payroll",
    "--reprocessing",
  ],
  [
    "Roster amendment approval races",
    "scripts/test-eligibility-db.ts",
    "--main-payroll",
    "--legacy-containment",
  ],
];
for (const [label, ...args] of suites) {
  console.log(`F32: ${label}`);
  await new Promise((resolveRun, reject) => {
    const child = spawn(
      process.execPath,
      [resolve("node_modules/tsx/dist/cli.mjs"), ...args],
      { stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`${label} failed (${signal ?? code}).`)),
    );
  });
}
console.log(`F32: all ${suites.length} concurrency suites passed.`);
