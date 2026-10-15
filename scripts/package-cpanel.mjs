import { cp, mkdir, readFile, writeFile, access, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const target = resolve("output", `cpanel-${stamp}`);
await access("dist/server/app.js");
await access("dist/client/index.html");
await mkdir(target, { recursive: false });
await cp("dist", join(target, "dist"), { recursive: true });
await mkdir(join(target, "hosting"));
for (const file of ["start.mjs", "preflight.mjs", "grant-summary.mjs", "check-hosting.sh"]) {
  await cp(`deployment/cpanel/${file}`, join(target, "hosting", file));
}
await cp("deployment/cpanel/app.cjs", join(target, "app.js"));
await cp("deployment/cpanel/README.txt", join(target, "README.txt"));
await cp("LDSS_Codex_Function_by_Function_Implementation_Plan.md", join(target, "LDSS_Codex_Function_by_Function_Implementation_Plan.md"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
// CloudLinux supplies node_modules via its virtual environment. Install on Linux;
// never ship Windows dependencies or development database/configuration files.
pkg.type = "commonjs";
pkg.scripts = { start: "node app.js", "hosting:check": "node hosting/preflight.mjs" };
delete pkg.devDependencies;
delete lock.packages[""].devDependencies;
await writeFile(join(target, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
await writeFile(join(target, "package-lock.json"), JSON.stringify(lock, null, 2) + "\n");
await writeFile(join(target, "dist/server/package.json"), '{"type":"module"}\n');
const hashes = [];
async function inventory(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, item.name);
    if (item.isDirectory()) await inventory(path);
    else hashes.push({ file: path.slice(target.length + 1).replaceAll("\\", "/"), sha256: createHash("sha256").update(await readFile(path)).digest("hex") });
  }
}
await inventory(target);
await writeFile(join(target, "MANIFEST.json"), JSON.stringify({ release: pkg.version, createdAt: new Date().toISOString(), status: "hosting-candidate-not-verified-on-target", files: hashes }, null, 2) + "\n");
console.log(target);
