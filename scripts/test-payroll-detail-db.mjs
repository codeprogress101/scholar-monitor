import { spawn } from "node:child_process";
// Keep independent lifecycle fixtures independent: Treasury and reprocessing
// scenarios intentionally advance their own payrolls through different states.
for (const flags of [
  ["--treasury", "--registry-parity", "--candidate-parity", "--dashboard-parity"],
  ["--reprocessing"],
  ["--legacy-containment"],
]) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/test-eligibility-db.ts", "--main-payroll", ...flags, "--payroll-detail-parity"], { stdio:"inherit", windowsHide:true, shell:false });
    child.once("error", reject); child.once("close", resolve);
  });
  if (code !== 0) { process.exitCode = Number(code) || 1; break; }
}
