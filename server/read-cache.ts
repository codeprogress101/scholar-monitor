import type { PoolConnection } from "mysql2/promise";
const primed = new WeakMap<PoolConnection, Map<string, unknown>>();
export function primeRead(db: PoolConnection, sql: string, values: unknown[], rows: unknown) {
  primed.get(db)?.set(JSON.stringify(["execute", sql, values]), rows);
}

/** Request-local memoization inside a guarded mutation or consistent read snapshot.
 * Never retained across requests; every write clears all memoized reads.
 * This removes repeated policy/publication reads within a cohort assessment.
 */
export function cachedReads(connection: PoolConnection): PoolConnection {
  const cache = new Map<string, Promise<unknown>>();
  const prepared = new Map<string, unknown>();
  const proxy = new Proxy(connection, {
    get(target, property) {
      if (property !== "execute" && property !== "query") {
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (sql: string, values?: unknown[]) => {
        const invoke = () => (target[property] as (sql: string, values?: unknown[]) => Promise<[unknown, unknown]>).call(target, sql, values);
        if (typeof sql !== "string" || !/^\s*SELECT\b/i.test(sql)) {
          cache.clear();
          prepared.clear();
          return invoke();
        }
        if (/UTC_TIMESTAMP|NOW\(/i.test(sql)) return invoke();
        const key = JSON.stringify([property, sql, values]);
        if (prepared.has(key)) return [structuredClone(prepared.get(key)), []];
        let value = cache.get(key);
        if (!value) {
          if (cache.size >= 512) cache.delete(cache.keys().next().value!);
          value = invoke(); cache.set(key, value);
        }
        // Query rows can be enriched by a caller. Never share its mutations.
        const result = await value as [unknown, unknown];
        return [structuredClone(result[0]), result[1]];
      };
    },
  });
  primed.set(proxy, prepared);
  return proxy;
}
