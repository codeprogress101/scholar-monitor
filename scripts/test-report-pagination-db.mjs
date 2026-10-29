import { spawn } from "node:child_process";
// Independent fixtures: overrides and reprocessing intentionally change different
// source histories. Compare reports throughout each lifecycle, never merge them.
for (const flags of [
  ["--main-payroll", "--reports", "--treasury"],
  ["--overrides"],
  ["--main-payroll", "--reprocessing"],
]) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/test-eligibility-db.ts", ...flags, "--report-pagination"], { stdio: "inherit", windowsHide: true, shell: false });
    child.once("error", reject); child.once("close", resolve);
  });
  if (code !== 0) { process.exitCode = Number(code) || 1; break; }
}
