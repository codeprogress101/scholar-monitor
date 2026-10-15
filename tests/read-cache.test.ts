import { describe, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { cachedReads, primeRead } from "../server/read-cache";
describe("transaction-local source cache", () => {
  it("invalidates bulk source rows on writes and preserves empty results", async () => {
    const execute = vi.fn(async () => [[{ revision: 2 }], []]);
    const read = cachedReads({ execute } as unknown as PoolConnection);
    const sql = "SELECT revision FROM evidence WHERE id=?";
    primeRead(read, sql, ["a"], [{ revision: 1 }]);
    primeRead(read, sql, ["absent"], []);
    expect((await read.execute(sql, ["a"]))[0]).toEqual([{ revision: 1 }]);
    expect((await read.execute(sql, ["absent"]))[0]).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
    await read.execute("UPDATE evidence SET revision=2");
    expect((await read.execute(sql, ["a"]))[0]).toEqual([{ revision: 2 }]);
  });
  it("does not leak mutated rows, another request's values, or pre-write evidence", async () => {
    let revision = 1;
    const execute = vi.fn(async () => [[{ revision }], []]);
    const connection = { execute, query: execute } as unknown as PoolConnection;
    const read = cachedReads(connection);
    const [first] = await read.execute("SELECT revision FROM evidence WHERE id=?", ["a"]);
    (first as { revision: number }[])[0].revision = 999;
    expect((await read.execute("SELECT revision FROM evidence WHERE id=?", ["a"]))[0]).toEqual([{ revision: 1 }]);
    expect(execute).toHaveBeenCalledTimes(1);
    revision = 2;
    expect((await cachedReads(connection).execute("SELECT revision FROM evidence WHERE id=?", ["a"]))[0]).toEqual([{ revision: 2 }]);
    await read.execute("UPDATE evidence SET revision=2 WHERE id=?", ["a"]);
    expect((await read.execute("SELECT revision FROM evidence WHERE id=?", ["a"]))[0]).toEqual([{ revision: 2 }]);
  });
  it("does not reuse a clock reading across a cutoff", async () => {
    const execute = vi.fn(async () => [[{ day: "cutoff" }], []]);
    const read = cachedReads({ execute } as unknown as PoolConnection);
    await read.execute("SELECT UTC_TIMESTAMP() AS day");
    await read.execute("SELECT UTC_TIMESTAMP() AS day");
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
