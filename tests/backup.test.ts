import { describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { seal, unseal } from "../scripts/backup-lib.mjs";

const payload = () => ({ version: 1, database: "ldss_scholar_monitor_dev",
  sql: "SELECT 'private scholarship history';",
  sqlHash: createHash("sha256").update("SELECT 'private scholarship history';").digest("hex"),
  inventory: { tables: [] } });

describe("encrypted recovery archive", () => {
  it("round-trips authenticated content without plaintext exposure and uses fresh nonces", () => {
    const key = randomBytes(32);
    const first = seal(payload(), key);
    expect(unseal(first, key)).toEqual(payload());
    expect(first.includes(Buffer.from("private scholarship history"))).toBe(false);
    expect(first.equals(seal(payload(), key))).toBe(false);
  });
  it("rejects a wrong key, truncation and tampering before SQL execution", () => {
    const key = randomBytes(32);
    const bytes = seal(payload(), key);
    expect(() => unseal(bytes, randomBytes(32))).toThrow("authentication");
    expect(() => unseal(bytes.subarray(0, 20), key)).toThrow();
    for (const index of [0, 8, 20, bytes.length - 1]) {
      const changed = Buffer.from(bytes);
      changed[index] ^= 1;
      expect(() => unseal(changed, key)).toThrow();
    }
  });
  it("rejects unsupported versions, databases and mismatched SQL digests", () => {
    const key = randomBytes(32);
    for (const change of [{ version: 2 }, { database: "production" }, { sql: "modified" }])
      expect(() => unseal(seal({ ...payload(), ...change }, key), key)).toThrow();
  });
});
