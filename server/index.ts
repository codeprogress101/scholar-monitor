import "dotenv/config";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

try {
  const config = loadConfig(process.env);
  const compiled = import.meta.url.endsWith(".js");
  const app = buildApp(config, {
    logger: true,
    ...(compiled
      ? { clientRoot: fileURLToPath(new URL("../client/", import.meta.url)) }
      : {}),
  });
  await app.listen({ host: config.HOST, port: config.PORT });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void app.close().then(() => process.exit(0));
    });
  }
} catch (error) {
  // Configuration errors contain field names only. No connection strings are logged.
  console.error(
    error instanceof Error ? error.message : "Unable to start LDSS",
  );
  process.exitCode = 1;
}
