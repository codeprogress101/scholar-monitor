import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createBackup, loadKey, restoreBackup } from "./backup-lib.mjs";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function filesIn(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}
async function fingerprint(paths) {
  return Promise.all(paths.map(async (file) => ({ file: file.replaceAll("\\", "/"), sha256: sha(await readFile(file)) })));
}
async function releaseInputs() {
  return ["package.json", "package-lock.json", "index.html", ".htaccess", "vite.config.ts", "eslint.config.js",
    ...(await readdir(".")).filter((name) => /^tsconfig.*\.json$/.test(name)),
    ...await filesIn("src"), ...await filesIn("server"), ...await filesIn("scripts"),
    ...await filesIn("tests"), ...await filesIn("db/migrations")].sort();
}
const evidenceDirectory = process.env.LDSS_UAT_OUTPUT ?? "output/uat";
await mkdir(evidenceDirectory, { recursive: true });
const reportFile = join(evidenceDirectory, "F36-report.json");
const packageInfo = JSON.parse(await readFile("package.json", "utf8"));
const report = { release: packageInfo.version, startedAt: new Date().toISOString(),
  status: "running", productionAuthorized: false, coordinatorSignoff: "pending",
  technicalOwnerSignoff: "pending", suites: [] };
await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");
try {
  const sources = await fingerprint(await releaseInputs());
  const key = await loadKey();
  report.backup = await createBackup(key);
  report.restore = await restoreBackup(report.backup.file, key);
  const suites = ["check", "test:db", ...Object.keys(packageInfo.scripts).filter((name) => /^test:.*-db$/.test(name))];
  for (const name of suites) {
    console.log(`F36 running ${name}`);
    const started = Date.now();
    const log = [];
    const code = await new Promise((resolveRun, reject) => {
      const child = spawn(process.execPath, [process.env.npm_execpath, "run", name], {
        windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (chunk) => log.push(chunk));
      child.stderr.on("data", (chunk) => log.push(chunk));
      child.once("error", reject);
      child.once("close", (exitCode) => resolveRun(exitCode));
    });
    const logFile = resolve(evidenceDirectory, `${name.replaceAll(":", "-")}.log`);
    await writeFile(logFile, Buffer.concat(log));
    report.suites.push({ name, passed: code === 0, elapsedSeconds: (Date.now() - started) / 1000, logFile });
    if (code !== 0) throw new Error(`Acceptance suite ${name} failed. Review its local log.`);
  }
  if (JSON.stringify(sources) !== JSON.stringify(await fingerprint(await releaseInputs())))
    throw new Error("Release inputs changed during acceptance tests; rerun the gate.");
  report.sourceFiles = sources;
  report.migrations = sources.filter(({ file }) => /^db\/migrations\/\d.*\.sql$/.test(file));
  report.artifacts = await fingerprint(await filesIn("dist"));
  report.status = "automated_passed_awaiting_signoff";
  console.log(`F36: ${suites.length} suites passed. Coordinator and technical-owner sign-off still required.`);
} catch (error) {
  report.status = "failed";
  // Do not serialize database/tool exceptions that may contain private SQL.
  console.error(error.code ? "Acceptance gate failed; database/file details withheld." : error.message);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");
  await writeFile(join(evidenceDirectory, `F36-${Date.now()}.json`), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(`Acceptance evidence: ${reportFile}`);
}
