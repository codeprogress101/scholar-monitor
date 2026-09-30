import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { parse } from "dotenv";

const root = process.cwd();
const excluded = new Set([
  "node_modules",
  ".git",
  "output",
  ".playwright-cli",
  "coverage",
]);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".html",
  ".css",
  ".sql",
  ".md",
  ".example",
]);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      excluded.has(entry.name) ||
      entry.name === ".env" ||
      (entry.name.startsWith(".env.") && !entry.name.endsWith(".example"))
    )
      continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (textExtensions.has(extname(entry.name))) files.push(path);
  }
}
await walk(root);
const localEnv = existsSync(".env")
  ? parse(await readFile(".env", "utf8"))
  : {};
const secrets = Object.entries(localEnv)
  .filter(
    ([key, value]) =>
      /PASSWORD|SECRET|TOKEN|KEY/.test(key) && value.length >= 12,
  )
  .map(([, value]) => value);
let failures = 0;
for (const file of files) {
  const content = await readFile(file, "utf8");
  const leakedLocal = secrets.some((value) => content.includes(value));
  const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
    content,
  );
  const privilegedJwt = content
    .match(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)
    ?.some((token) => {
      try {
        return (
          JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
            .role === "service_role"
        );
      } catch {
        return false;
      }
    });
  if (leakedLocal || privateKey || privilegedJwt) {
    console.error(
      `Potential secret in ${relative(root, file)} (value withheld)`,
    );
    failures++;
  }
}
if (!existsSync("dist/client/index.html")) {
  console.error("Build the frontend before scanning the bundle.");
  failures++;
}
if (failures) process.exitCode = 1;
else
  console.log(
    `Secret scan passed for ${files.length} source/build files; local credentials absent from repository artifacts and frontend bundle.`,
  );
