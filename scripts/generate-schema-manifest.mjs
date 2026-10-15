import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../db/migrations/", import.meta.url);
const files = (await readdir(root)).filter(n => /^\d{14}_f\d{2}_[a-z_]+\.sql$/.test(n)).sort();
const manifest = await Promise.all(files.map(async version => ({version,
  checksum: createHash("sha256").update(await readFile(new URL(version, root), "utf8")).digest("hex")
})));
await writeFile(new URL("../server/schema-manifest.ts", import.meta.url),
  "// Generated from release migration inputs. Do not edit by hand.\nexport const schemaManifest = " + JSON.stringify(manifest, null, 2) + " as const;\n");
