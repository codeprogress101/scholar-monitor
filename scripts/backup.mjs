import "dotenv/config";
import { parseArgs } from "node:util";
import { initializeKey, loadKey, createBackup, restoreBackup } from "./backup-lib.mjs";

try {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    file: { type: "string" }, keep: { type: "boolean", default: false },
  } });
  if (positionals.length !== 1 || !["init-key", "create", "verify"].includes(positionals[0]) ||
      (positionals[0] !== "verify" && (values.file || values.keep)))
    throw new Error("Usage: npm run backup -- init-key | create | verify --file PATH [--keep]");
  if (positionals[0] === "init-key") {
    console.log(`Private key created: ${await initializeKey()}. Preserve a separate secure recovery copy.`);
  } else {
    const key = await loadKey();
    if (positionals[0] === "create") console.log(JSON.stringify(await createBackup(key), null, 2));
    else {
      if (!values.file) throw new Error("verify requires --file PATH");
      console.log(JSON.stringify(await restoreBackup(values.file, key, { keep: values.keep }), null, 2));
    }
  }
} catch {
  console.error("Backup operation failed. Check command options, private key, local database/tool availability and documented limits. No credentials or SQL are printed.");
  process.exitCode = 1;
}
