import "dotenv/config";
import { fileURLToPath } from "node:url";
import { buildApp } from "../dist/server/app.js";
import { loadConfig } from "../dist/server/config.js";

const config = loadConfig(process.env);
if (!["staging", "production"].includes(config.APP_ENV)) {
  throw new Error("Hosted deployment requires staging or production configuration.");
}
const app = buildApp(config, {
  logger: true,
  clientRoot: fileURLToPath(new URL("../dist/client/", import.meta.url)),
});
if (globalThis.PhusionPassenger) {
  await app.ready();
  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen("passenger", () => {
      app.server.removeListener("error", reject);
      resolve();
    });
  });
} else {
  await app.listen({ host: config.HOST, port: config.PORT });
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => { void app.close().then(() => process.exit(0)); });
}
