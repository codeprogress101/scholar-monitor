import { readFile, stat } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
const timestamp = z.string().datetime().nullable();
const statusSchema = z.object({ version: z.literal(1), mode: z.enum(["api", "desktop"]).default("api"), lastStaged: timestamp.optional(), lastFileRestore: timestamp.optional(), database: z.string(), environment: z.string(), checkedAt: z.string().datetime(), lastBackup: timestamp, lastUpload: timestamp, lastRestore: timestamp, pending: z.number().int().nonnegative(), error: z.string().max(300).nullable() });
export async function backupStatus(path: string | undefined, database: string, environment: string) {
  if (!path) return { configured: false as const, message: "Google Drive backups have not been configured for this application." };
  try {
    if ((await stat(path)).size > 16384) throw new Error("Invalid status size");
    const data = statusSchema.parse(JSON.parse(await readFile(path, "utf8")));
    if (data.database !== database || data.environment !== environment) throw new Error("Different backup target");
    return { configured: true as const, mode: data.mode, lastStaged: data.lastStaged, lastFileRestore: data.lastFileRestore, checkedAt: data.checkedAt, lastBackup: data.lastBackup, lastUpload: data.lastUpload, lastRestore: data.lastRestore, pending: data.pending, error: data.error, stale: Date.now() - Date.parse(data.checkedAt) > 3600000 };
  } catch { return { configured: false as const, message: "Backup status is unavailable or does not match this database. Ask the system operator to check the backup task." }; }
}
export function registerBackupStatus(app: FastifyInstance, path: string | undefined, database: string, environment: string) {
  app.get("/api/v1/admin/backup-status", { config: { permission: "roles.manage" } }, async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    return backupStatus(path, database, environment);
  });
}
