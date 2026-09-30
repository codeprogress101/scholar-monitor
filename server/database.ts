import mysql from "mysql2/promise";
import type { AppConfig } from "./config.js";

export type DatabaseStatus = "connected" | "unavailable" | "not_configured";
export type Database = {
  pool?: mysql.Pool;
  check: () => Promise<DatabaseStatus>;
  close: () => Promise<void>;
};

export function createDatabase(config: AppConfig): Database {
  if (!config.DB_USER)
    return {
      check: async () => "not_configured",
      close: async () => {},
    };
  const pool = mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    connectionLimit: 4,
    waitForConnections: false,
    connectTimeout: 3000,
    multipleStatements: false,
    timezone: "Z",
    charset: "utf8mb4",
  });
  return {
    pool,
    async check() {
      try {
        const [rows] = await pool.query<mysql.RowDataPacket[]>({
          sql: "SELECT version FROM schema_migrations WHERE version='20260930060000_f06_qualification.sql'",
          timeout: 3000,
        });
        return rows.length === 1 ? "connected" : "unavailable";
      } catch {
        return "unavailable";
      }
    },
    close: () => pool.end(),
  };
}
