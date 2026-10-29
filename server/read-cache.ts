import type { PoolConnection } from "mysql2/promise";
import {isSnapshotConnection} from "./authorization/read-snapshot.js";
// Keep SQL once per projection, rather than repeating the full statement in
// every preloaded row key. Binding arrays still have exact JSON identity.
type PreparedReads = Map<string, Map<string | undefined, unknown>>;
const primed = new WeakMap<PoolConnection, PreparedReads>();
const computed = new WeakMap<PoolConnection,Map<string,Promise<unknown>>>();
type ReadResult = [unknown, unknown];
type ReadMethod = "execute" | "query";
// An enclosing cache can consume another cache's private result directly. Only
// the outer public boundary clones rows; callers never receive these objects.
const privateReads = new WeakMap<PoolConnection, (method: ReadMethod, sql: string, values?: unknown[]) => Promise<ReadResult>>();
const sources = new WeakMap<PoolConnection,PoolConnection>();
export function isSnapshotRead(connection: PoolConnection): boolean {
  return isSnapshotConnection(connection) || (sources.has(connection) && isSnapshotRead(sources.get(connection)!));
}
/** Internal adapter handoff only. The adapter must not mutate these rows and
 * must retain a public cachedReads boundary before returning them to callers. */
export function readCacheSource(connection: PoolConnection, method: ReadMethod, sql: string, values?: unknown[]): Promise<ReadResult> {
  const read=privateReads.get(connection);
  return read ? read(method,sql,values) : (connection[method] as (sql:string,values?:unknown[])=>Promise<ReadResult>).call(connection,sql,values);
}
/** MariaDB's flat scalar/date rows need independent rows and dates, not a
 * general graph transfer. Unusual/nested/aliased values keep structuredClone. */
function cloneRows(value: unknown): unknown {
  if (!Array.isArray(value) || Object.keys(value).length!==value.length) return structuredClone(value);
  const seen=new Set<object>(),result:Record<string,unknown>[]=[];
  for(const row of value){
    if(!row || Object.getPrototypeOf(row)!==Object.prototype || seen.has(row))return structuredClone(value);
    seen.add(row);const copy:Record<string,unknown>={};
    for(const key of Object.keys(row)){
      const descriptor=Object.getOwnPropertyDescriptor(row,key)!;
      if(!('value' in descriptor))return structuredClone(value);
      const field=descriptor.value;
      if(typeof field==='function' || typeof field==='symbol')return structuredClone(value);
      if(field!==null && typeof field==='object'){
        if(!(field instanceof Date) || Object.getPrototypeOf(field)!==Date.prototype || seen.has(field))return structuredClone(value);
        seen.add(field);
      }
      Object.defineProperty(copy,key,{value:field instanceof Date?new Date(field.getTime()):field,writable:true,enumerable:true,configurable:true});
    }
    result.push(copy);
  }
  return result;
}
/** Keep a shared immutable index in this transaction; clone only its selected
 * value, not an entire official snapshot for every scholar. Writes invalidate it
 * through the same derived cache as computedRead. Without a scoped cache, read
 * fresh each time rather than retaining state on a pooled connection.
 */
export async function indexedRead<T>(db:PoolConnection,key:string,id:string,read:()=>Promise<Map<string,T>>,fallbackId?:string):Promise<T | undefined>{
 const select=(index:Map<string,T>)=>structuredClone(index.has(id)?index.get(id):fallbackId===undefined?undefined:index.get(fallbackId));
 const cache=computed.get(db);
 if(!cache)return select(await read());
 let value=cache.get(key);
 if(!value){if(cache.size>=4096)cache.delete(cache.keys().next().value!);value=read();cache.set(key,value);}
 return select(await value as Map<string,T>);
}
export async function computedRead<T>(db:PoolConnection,key:string,read:()=>Promise<T>):Promise<T>{
 const cache=computed.get(db);if(!cache)return read();
 let value=cache.get(key);if(!value){if(cache.size>=4096)cache.delete(cache.keys().next().value!);value=read();cache.set(key,value);}
 return structuredClone(await value) as T;
}
export function primeRead(db: PoolConnection, sql: string, values: unknown[], rows: unknown) {
  const prepared = primed.get(db);
  if (!prepared) return;
  let bindings = prepared.get(sql);
  if (!bindings) { bindings = new Map(); prepared.set(sql, bindings); }
  bindings.set(JSON.stringify(values), rows);
}

/** Request-local memoization inside a guarded mutation or consistent read snapshot.
 * Never retained across requests; every write clears all memoized reads.
 * This removes repeated policy/publication reads within a cohort assessment.
 */
export function cachedReads(connection: PoolConnection): PoolConnection {
  const cache = new Map<string, Promise<unknown>>();
  const prepared: PreparedReads = new Map();
  const derived = new Map<string,Promise<unknown>>();
  const read = async (property: ReadMethod, sql: string, values?: unknown[]): Promise<ReadResult> => {
    const invoke = () => privateReads.has(connection)
      ? privateReads.get(connection)!(property, sql, values)
      : (connection[property] as (sql: string, values?: unknown[]) => Promise<ReadResult>).call(connection, sql, values);
    if (typeof sql !== "string" || !/^\s*SELECT\b/i.test(sql)) {
      cache.clear(); prepared.clear(); derived.clear();
      return invoke();
    }
    if (/UTC_TIMESTAMP|NOW\(/i.test(sql)) return invoke();
    const bindings = property === "execute" ? prepared.get(sql) : undefined;
    if (bindings) {
      const key = JSON.stringify(values);
      if (bindings.has(key)) return [bindings.get(key), []];
    }
    const key = JSON.stringify([property, sql, values]);
    let value = cache.get(key);
    if (!value) {
      if (cache.size >= 512) cache.delete(cache.keys().next().value!);
      value = invoke(); cache.set(key, value);
    }
    return await value as ReadResult;
  };
  const proxy = new Proxy(connection, {
    get(target, property) {
      if (property !== "execute" && property !== "query") {
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (sql: string, values?: unknown[]) => {
        const result = await read(property, sql, values);
        // Keep the same write/clock passthrough and isolated public SELECT rows.
        if (typeof sql !== "string" || !/^\s*SELECT\b/i.test(sql) || /UTC_TIMESTAMP|NOW\(/i.test(sql)) return result;
        return [cloneRows(result[0]), result[1]];
      };
    },
  });
  primed.set(proxy, prepared);
  computed.set(proxy,derived);
  privateReads.set(proxy,read);
  sources.set(proxy,connection);
  return proxy;
}
