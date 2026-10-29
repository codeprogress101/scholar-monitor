import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, statfs, writeFile, rename, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { BACKUP_LIMITS, createBackup, run, unseal } from "../scripts/backup-lib.mjs";

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, statfs: vi.fn(), writeFile: vi.fn(actual.writeFile), rename: vi.fn(actual.rename) };
});

afterEach(() => vi.restoreAllMocks());

describe("bounded backup capacity", () => {
  it("keeps independent SQL, archive, envelope and row limits", () => {
    expect(BACKUP_LIMITS).toEqual({
      sqlBytes: 128 * 1024 * 1024,
      archiveBytes: 96 * 1024 * 1024,
      payloadBytes: 192 * 1024 * 1024,
      rowsPerTable: 100000,
    });
    expect(Object.isFrozen(BACKUP_LIMITS)).toBe(true);
  });

  it("rejects an oversized archive before authentication or restoration", () => {
    const bytes = Buffer.alloc(BACKUP_LIMITS.archiveBytes + 1);
    expect(() => unseal(bytes, randomBytes(32))).toThrow("format or size");
  });

  it("checks storage before opening the database or taking source locks", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ldss-space-rejection-"));
    const connect = vi.spyOn(mysql, "createConnection");
    vi.mocked(statfs).mockResolvedValue({ bavail: 1n, bsize: 4096n } as Awaited<ReturnType<typeof statfs>>);
    try {
      await expect(createBackup(randomBytes(32), { directory })).rejects.toThrow("Insufficient backup storage");
      expect(connect).not.toHaveBeenCalled();
    } finally { await rm(directory, { recursive: true }); }
  });

  it("does not accept partial output from an interrupted database tool", async () => {
    await expect(run(process.execPath, ["-e", "process.stdout.write('partial'); process.exitCode=1"], { limit: 100 }))
      .rejects.toThrow("raw SQL and credentials withheld");
  });

  it("removes an interrupted archive write without publishing a final filename", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ldss-write-failure-"));
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const connection = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT DATABASE()")) return [[{ name: "backup_fixture" }]];
        if (sql.includes("information_schema.ROUTINES")) return [[{ n: 0 }]];
        if (sql.includes("SELECT TABLE_NAME AS name FROM")) return [[{ name: "roles" }]];
        return [[]];
      }),
      end: vi.fn(),
    };
    vi.spyOn(mysql, "createConnection").mockResolvedValue(connection as unknown as Awaited<ReturnType<typeof mysql.createConnection>>);
    vi.mocked(statfs).mockResolvedValue({ bavail: BigInt(BACKUP_LIMITS.archiveBytes), bsize: 1n } as Awaited<ReturnType<typeof statfs>>);
    vi.mocked(writeFile).mockImplementation(async (path, data, options) => {
      await actual.writeFile(path, data, options);
      throw Object.assign(new Error("simulated disk exhaustion"), { code: "ENOSPC" });
    });
    try {
      await expect(createBackup(randomBytes(32), {
        connection: { database: "backup_fixture" }, directory,
        dumpTool: process.execPath, args: ["-e", "process.stdout.write('SELECT 1;')", "--"],
      })).rejects.toMatchObject({ code: "ENOSPC" });
      expect(rename).not.toHaveBeenCalled();
      expect(await readdir(directory)).toEqual([]);
      expect(connection.query).toHaveBeenCalledWith("UNLOCK TABLES");
      expect(connection.end).toHaveBeenCalled();
    } finally {
      vi.mocked(writeFile).mockImplementation(actual.writeFile);
      await rm(directory, { recursive: true });
    }
  });

  it("rejects streaming output above the caller's bound", async () => {
    await expect(run(process.execPath, ["-e", "process.stdout.write('x'.repeat(1024))"], { limit: 100 }))
      .rejects.toThrow("size limit");
  });

  it("accepts output exactly at the caller's bound", async () => {
    const output = await run(process.execPath, ["-e", "process.stdout.write('x'.repeat(100))"], { limit: 100 });
    expect(output.length).toBe(100);
  });
});
