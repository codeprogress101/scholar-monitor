import { schemaManifest } from "./schema-manifest.js";
import { parseSignatories } from "./configuration/payroll-signatories.js";

export function schemaReady(rows: {version: string; checksum: string}[], settings: {code: string; setting_value: string}[]) {
  if (rows.length !== schemaManifest.length || new Set(rows.map(r => r.version)).size !== rows.length ||
      schemaManifest.some(m => !rows.some(r => r.version === m.version && r.checksum === m.checksum))) return false;
  try {
    const signatories = settings.find(s => s.code === "PAYROLL_SIGNATORIES");
    if (!signatories) return false;
    parseSignatories(signatories.setting_value);
    return true;
  } catch { return false; }
}
