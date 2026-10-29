import { describe, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { cachedReads, primeRead } from "../server/read-cache";
describe("transaction-local source cache", () => {
  it("matches structuredClone for flat MariaDB dates, nested evidence, aliases and unsupported values",async()=>{
    const stamp=new Date('2026-10-27T08:00:00Z'),shared={revision:1};
    for(const rows of [[{stamp,amount:'5000.00',empty:null,missing:undefined,big:1n}],[{nested:shared},{nested:shared}],[{buffer:Buffer.from('evidence')}],[shared,shared]]){
      const execute=vi.fn(async()=>[rows,[]]);const db=cachedReads({execute} as unknown as PoolConnection);
      const [first]=await db.execute('SELECT evidence');expect(first).toEqual(structuredClone(rows));expect(first).not.toBe(rows);
      if('stamp' in (first as object[])[0])expect((first as {stamp:Date}[])[0].stamp).not.toBe(stamp);
    }
    const execute=vi.fn(async()=>[[{unsupported:()=>null}],[]]),db=cachedReads({execute} as unknown as PoolConnection);
    await expect(db.execute('SELECT unsupported')).rejects.toThrow();
  });
  it("keeps nested preload and derived caches isolated and invalidates every layer on writes",async()=>{
    const execute=vi.fn(async()=>[[{nested:{revision:2}}],[]]);
    const inner=cachedReads({execute,query:execute} as unknown as PoolConnection),outer=cachedReads(inner),sql="SELECT source FROM evidence WHERE id=?";
    primeRead(inner,sql,["a"],[{nested:{revision:1}}]);
    const [first]=await outer.execute(sql,["a"]);(first as {nested:{revision:number}}[])[0].nested.revision=99;
    expect((await inner.execute(sql,["a"]))[0]).toEqual([{nested:{revision:1}}]);
    expect((await outer.execute(sql,["a"]))[0]).toEqual([{nested:{revision:1}}]);
    expect(execute).not.toHaveBeenCalled();
    await outer.query("UPDATE evidence SET revision=2");
    expect((await outer.execute(sql,["a"]))[0]).toEqual([{nested:{revision:2}}]);
    expect((await inner.execute(sql,["a"]))[0]).toEqual([{nested:{revision:2}}]);
    expect(execute).toHaveBeenCalledTimes(2);
  });
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
  it("keeps exact SQL, bindings and execute/query identity with grouped preload keys", async () => {
    const execute = vi.fn(async () => [[{ live: true }], []]);
    const read = cachedReads({ execute, query: execute } as unknown as PoolConnection);
    const sql = "SELECT revision FROM evidence WHERE id=? AND cycle_id=?";
    primeRead(read, sql, ["a", "cycle"], [{ revision: 1 }]);
    primeRead(read, sql, ["a", "other"], [{ revision: 2 }]);
    primeRead(read, "SELECT revision FROM evidence", [], []);
    expect((await read.execute(sql, ["a", "cycle"]))[0]).toEqual([{ revision: 1 }]);
    expect((await read.execute(sql, ["a", "other"]))[0]).toEqual([{ revision: 2 }]);
    expect((await read.execute("SELECT revision FROM evidence", []))[0]).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
    await read.query(sql, ["a", "cycle"]);
    await read.execute(sql, ["a,cycle"]);
    await read.execute(sql + " ", ["a", "cycle"]);
    await read.execute("SELECT revision FROM evidence");
    expect(execute).toHaveBeenCalledTimes(4);
    await read.query("UPDATE evidence SET revision=3");
    expect((await read.execute(sql, ["a", "cycle"]))[0]).toEqual([{ live: true }]);
  });
});
