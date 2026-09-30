import "dotenv/config";
import { parseArgs } from "node:util";
import { userInfo } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { z } from "zod";
import { AuthError, AuthService } from "../server/auth/service.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    name: { type: "string" },
    reason: { type: "string" },
    "private-link": { type: "boolean" },
  },
});
let pool: mysql.Pool | undefined;
try {
  if (
    process.env.APP_ENV !== "development" ||
    process.env.DB_NAME !== "ldss_scholar_monitor_dev" ||
    !["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? "")
  )
    throw new Error(
      "Account command requires the local LDSS development database.",
    );
  const email = z
    .email()
    .max(254)
    .regex(/^[\x20-\x7E]+$/)
    .parse(values.email?.trim().toLowerCase());
  const command = z
    .enum(["create", "reset", "disable", "enable"])
    .parse(positionals[0]);
  const name =
    command === "create"
      ? z.string().trim().min(2).max(160).parse(values.name)
      : "";
  const reason =
    command === "create"
      ? "Initial individual account activation"
      : z.string().trim().min(5).max(500).parse(values.reason);
  pool = mysql.createPool({
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: "root",
    password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
    database: process.env.DB_NAME,
    timezone: "Z",
    connectionLimit: 1,
  });
  const auth = new AuthService(pool);
  const operator = `local-os:${userInfo().username}`;
  if (command === "create") await auth.createAccount(name, email, operator);
  if (command === "create" || command === "reset") {
    const token = await auth.issueReset(email, operator, reason);
    const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:5173";
    const link = `${origin}/#reset-password?token=${token}`;
    if (values["private-link"]) {
      await mkdir("output", { recursive: true });
      await writeFile(
        "output/account-activation.txt",
        `LDSS account: ${email}\n\nOpen this private link to set your password (valid for 15 minutes, once only):\n${link}\n\nIf expired, generate a new link using:\nnpm run account -- reset --email ${email} --reason "Account owner requested password activation" --private-link\n`,
        { mode: 0o600 },
      );
      console.log(
        "Account ready for activation. Private link saved to output/account-activation.txt (not committed or served).",
      );
    } else
      console.log(
        `Private one-time link, valid for 15 minutes. Deliver only to the verified account owner:\n${link}`,
      );
  } else {
    await auth.setDisabled(email, command === "disable", operator, reason);
    console.log(
      `Account ${command === "disable" ? "disabled" : "enabled"}. Existing sessions remain revoked.`,
    );
  }
} catch (error) {
  if (error instanceof AuthError) console.error(error.message);
  else if (error instanceof z.ZodError)
    console.error(
      "Provide a valid command/email, full name for create, and a reason for reset/disable/enable.",
    );
  else
    console.error(
      "Account operation failed. Check local configuration and whether the account already exists. No credentials were logged.",
    );
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
