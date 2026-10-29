import { expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { cohortReads } from "../server/eligibility/cohort-reads.js";
import { legacyCohortReads } from "./fixtures/legacy-cohort-reads.js";
import { readFileSync } from "node:fs";
import {omissionSourceSql} from '../server/payments/omission-source';
const annualSql = "SELECT r.*,s.version AS person_version,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,i.human_id,DATE_FORMAT(r.status_effective_on,'%Y-%m-%d') AS status_on FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.id=? FOR UPDATE";
function fixture() {
  const execute = vi.fn(async (sql: string, _values?: unknown[]) => {
    void _values;
    return [sql.startsWith("SELECT r.*") ? [{ id: "a", scholar_id: "s" }] : [], []];
  });
  return { db: { execute } as unknown as PoolConnection, execute };
}
it("retains the existing unscoped payroll/Registry preload and per-ID results", async () => {
  const { db, execute } = fixture(); const reads = await cohortReads(db, "year", "semester", "cycle");
  expect(execute.mock.calls[0]).toEqual([annualSql.replace("r.id=?", "r.academic_year_id=?"), ["year"]]);
  const calls = execute.mock.calls.length;
  expect((await reads.execute(annualSql, ["a"]))[0]).toEqual([{ id: "a", scholar_id: "s" }]);
  expect(execute).toHaveBeenCalledTimes(calls);
});
it("bounds Home preload to explicit annual IDs and the requested academic year", async () => {
  const { db, execute } = fixture(); const reads = await cohortReads(db, "year", "semester", "cycle", ["a"]);
  expect(execute.mock.calls[0]).toEqual([annualSql.replace("r.id=?", "r.academic_year_id=? AND r.id IN (?)"), ["year", "a"]]);
  expect((await reads.execute(annualSql, ["a"]))[0]).toEqual([{ id: "a", scholar_id: "s" }]);
});
it("does not turn an empty explicit page into a full-year preload", async () => {
  const { db, execute } = fixture(); await cohortReads(db, "year", "semester", "cycle", []);
  expect(execute).not.toHaveBeenCalled();
});

it("skips only the eager eligibility histories for requirement reports, preserving live fallback", async () => {
  const { db, execute } = fixture();
  const reads = await cohortReads(db, "year", "semester", "cycle", ["a"], false);
  expect(execute.mock.calls.some(([sql]) => sql.includes("FROM payout_eligibility") || sql.includes("FROM eligibility_overrides"))).toBe(false);
  const count = execute.mock.calls.length;
  const sql = "SELECT * FROM payout_eligibility WHERE scholarship_id=?";
  await reads.execute(sql, ["a"]);
  expect(execute.mock.calls.length).toBe(count + 1);
  expect(execute.mock.calls.at(-1)).toEqual([sql,["a"]]);
});

const pointQueries = [...readFileSync(new URL("./fixtures/legacy-cohort-reads.ts", import.meta.url), "utf8").matchAll(/const (\w+Sql) = ("[^\n]+?");/g)]
  .map(m => ({ name: m[1], sql: JSON.parse(m[2]) as string }));

/** Deterministic raw-row oracle: populated/empty groups, multiple history rows,
 * nullable allocations and descending histories. Decisions remain in services.
 */
function largeFixture(count: number) {
  const ids = Array.from({ length: count }, (_, i) => `a${i}`);
  let version = 1;
  const execute = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (!sql.startsWith("SELECT")) { version++; return [{ affectedRows: 1 }, []]; }
    const selected = values.filter((v): v is string => typeof v === "string" && /^[as]\d+$/.test(v));
    const keys = selected.length ? [...new Set(selected)] : ids;
    const bulk = sql.includes(" IN (") || sql.includes("r.academic_year_id=?");
    const projection = sql.slice(0, sql.indexOf(" FROM "));
    if (sql.startsWith("SELECT r.*")) return [keys.filter(id => id.startsWith("a")).map(id => ({ id, scholar_id: id.replace("a", "s"), version })), []];
    const result: Record<string, unknown>[] = [];
    for (const key of keys) {
      // Every third key is a true empty source group.
      if (Number(key.slice(1)) % 3 === 0) continue;
      if (sql.includes("FROM masterlist_activations")) result.push({ ...(bulk ? { scholarship_id: key } : {}), masterlist_id: `master-${key}`, activation_date: "2026-08-01" });
      else if (sql.includes("FROM requirement_checklists")) result.push({ ...(bulk ? { scholarship_record_id: key } : {}), id: `check-${key}`, payout_version_id: "policy", policy_date: "2026-08-01" });
      else if (sql.includes("FROM semester_entitlements")) result.push({ ...(bulk ? { scholar_id: key } : {}), ...(bulk || projection.includes("e.id") ? { id: `allocation-${key}` } : {}), batch_id: null });
      else if (sql.includes("FROM scholar_semesters")) result.push({ id: `owner-${key}`, scholar_id: key, version });
      else if (sql.includes("FROM scholarship_records")) {
        for (const day of ["2026-09-01", "2026-08-01"]) result.push({ ...(bulk ? { scholar_id: key } : {}), status: "active", day });
      } else if (sql.includes("FROM payout_eligibility")) {
        // The original point reader takes 50, not 50 across the entire cohort.
        for (let revision = 55; revision > (bulk ? 0 : 5); revision--) result.push({ scholarship_id: key, revision, version });
      } else if (sql.includes("FROM eligibility_overrides")) {
        for (const sequence of [2, 1]) result.push({ ...(bulk ? { scholarship_id: key } : {}), snapshot: { key, sequence, version } });
      }
    }
    return [result, []];
  });
  const db = { execute, query: execute } as unknown as PoolConnection;
  const values = (name: string, id: string) => {
    const scholar = id.replace("a", "s");
    if (name === "checklistSql") return [id, "cycle"];
    if (name === "historySql" || name === "overridesSql") return ["cycle", id];
    if (["reserveSql", "allocationSql", "ownerSql"].includes(name)) return [scholar, "semester"];
    return [name === "standingSql" ? scholar : id];
  };
  return { ids, db, execute, values };
}

for (const size of [500, 1000, 1001, 1201]) it(`preserves every point projection and bounded source queries for ${size} annuals`, async () => {
  const f = largeFixture(size), old = largeFixture(size);
  const reads = await cohortReads(f.db, "year", "semester", "cycle", [...f.ids, f.ids[0]]);
  const oracle = await legacyCohortReads(old.db, "year", "semester", "cycle", old.ids);
  const calls = f.execute.mock.calls.length;
  // One additional immutable omission-source query per <=200-key page.
  expect(calls).toBe(Math.ceil(size / 200) * 9);
  for (const [sql, values] of f.execute.mock.calls) {
    const keyCount = values!.filter(v => typeof v === "string" && /^[as]\d+$/.test(v)).length;
    expect(keyCount).toBeGreaterThan(0);
    expect(keyCount).toBeLessThanOrEqual(200);
    expect(sql).toMatch(/(?:FOR UPDATE|LOCK IN SHARE MODE)$/);
  }
  for (const id of f.ids) for (const q of pointQueries) {
    expect((await reads.execute(q.sql, f.values(q.name, id)))[0]).toEqual((await oracle.execute(q.sql, old.values(q.name, id)))[0]);
  }
  for(const id of f.ids)expect((await reads.execute(omissionSourceSql,[id.replace('a','s'),'semester']))[0]).toEqual([]);
  expect(f.execute).toHaveBeenCalledTimes(calls);
});

it("retains unscoped discovery while chunking its sources above the former cutoff", async () => {
  const f = largeFixture(1001);
  const reads = await cohortReads(f.db, "year", "semester", "cycle");
  expect(f.execute.mock.calls[0]).toEqual([annualSql.replace("r.id=?", "r.academic_year_id=?"), ["year"]]);
  expect(f.execute.mock.calls.length).toBe(1 + 6 * 8);
  const calls = f.execute.mock.calls.length;
  expect((await reads.execute(annualSql, ["a1000"]))[0]).toEqual([{ id: "a1000", scholar_id: "s1000", version: 1 }]);
  expect(f.execute).toHaveBeenCalledTimes(calls);
});

it("invalidates populated and empty preloads after a write and isolates caller mutations and requests", async () => {
  const f = largeFixture(1001), reads = await cohortReads(f.db, "year", "semester", "cycle", f.ids);
  const [rows] = await reads.execute(annualSql, ["a1000"]);
  (rows as { version: number }[])[0].version = 99;
  expect((await reads.execute(annualSql, ["a1000"]))[0]).toEqual([{ id: "a1000", scholar_id: "s1000", version: 1 }]);
  await reads.execute("UPDATE scholarship_records SET version=version+1 WHERE id=?", ["a1000"]);
  const calls = f.execute.mock.calls.length;
  expect((await reads.execute(annualSql, ["a1000"]))[0]).toEqual([{ id: "a1000", scholar_id: "s1000", version: 2 }]);
  await reads.execute(pointQueries.find(q => q.name === "activationSql")!.sql, ["a0"]);
  expect(f.execute.mock.calls.length).toBe(calls + 2);
  const next = await cohortReads(f.db, "year", "semester", "cycle", ["a1000"]);
  expect((await next.execute(annualSql, ["a1000"]))[0]).toEqual([{ id: "a1000", scholar_id: "s1000", version: 2 }]);
});
