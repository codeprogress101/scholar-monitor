import type { PoolConnection } from "mysql2/promise";
const snapshots = new WeakSet<PoolConnection>();
export const isSnapshotConnection = (connection: PoolConnection) => snapshots.has(connection);

/** Only use inside a database READ ONLY, consistent-snapshot transaction.
 * Shared projection helpers contain mutation-era row locks. Convert those reads
 * to snapshot reads here; neither SQL writes nor transaction control are exposed.
 */
export function snapshotConnection(connection: PoolConnection): PoolConnection {
  const snapshot = new Proxy(connection,{
    get(target,property){
      if(property === "query" || property === "execute")return (sql:string,values?:unknown[])=>{
        if(typeof sql !== "string" || !/^\s*SELECT\b/i.test(sql) || /;\s*\S/.test(sql))throw new Error("Snapshot projections may only read data.");
        const statement=sql.replace(/\s+FOR UPDATE\b/gi,"").replace(/\s+LOCK IN SHARE MODE\b/gi,"");
        return (target[property] as (sql:string,values?:unknown[])=>Promise<unknown>).call(target,statement,values);
      };
      if(["beginTransaction","commit","rollback","release","changeUser","end"].includes(String(property)))return ()=>{throw new Error("Snapshot transaction lifecycle is owned by authorization.");};
      const value=Reflect.get(target,property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  snapshots.add(snapshot);
  return snapshot;
}
