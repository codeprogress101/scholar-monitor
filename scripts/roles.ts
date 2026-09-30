import "dotenv/config";
import { parseArgs } from "node:util";
import { userInfo } from "node:os";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { z } from "zod";
import { AuthError } from "../server/auth/service.js";
import { AuthorizationService } from "../server/authorization/service.js";
import { ROLE_CODES } from "../server/authorization/policy.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    roles: { type: "string" },
    reason: { type: "string" },
    "expected-version": { type: "string" },
    "request-id": { type: "string" },
  },
});
let pool: mysql.Pool | undefined;
try {
  if (
    process.env.APP_ENV !== "development" ||
    process.env.DB_NAME !== "ldss_scholar_monitor_dev" ||
    !["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? "")
  )
    throw new Error("Local development configuration required.");
  const command = z.enum(["show", "set"]).parse(positionals[0]);
  const email = z
    .email()
    .max(254)
    .regex(/^[\x20-\x7E]+$/)
    .parse(values.email?.trim().toLowerCase());
  pool = mysql.createPool({
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: "root",
    password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
    database: process.env.DB_NAME,
    timezone: "Z",
    connectionLimit: 1,
  });
  const service = new AuthorizationService(pool);
  if (command === "set") {
    const roleText = z.string().min(1).parse(values.roles);
    const roles =
      roleText === "none"
        ? []
        : roleText
            .split(",")
            .map((role) => z.enum(ROLE_CODES).parse(role.trim()));
    const expectedVersion = z.coerce
      .number()
      .int()
      .min(1)
      .parse(values["expected-version"]);
    const reason = z.string().trim().min(5).max(500).parse(values.reason);
    const requestId = z.uuid().parse(values["request-id"] ?? randomUUID());
    const result = await service.setRoles({
      email,
      roles,
      expectedVersion,
      reason,
      requestId,
      operator: `local-os:${userInfo().username}`,
    });
    console.log(
      `Role assignment ${result.replayed ? "already recorded" : "saved"}. Version ${result.version}; request ${requestId}.`,
    );
  }
  console.log(JSON.stringify(await service.inspectByEmail(email), null, 2));
} catch (error) {
  if (error instanceof AuthError) console.error(error.message);
  else if (error instanceof z.ZodError)
    console.error(
      'Use show --email, or set --email --roles staff,coordinator,system_admin (or none) --expected-version N --reason "...". Set replaces all active roles.',
    );
  else
    console.error(
      "Role command failed. Check the local configuration and migration state. No credentials were logged.",
    );
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
