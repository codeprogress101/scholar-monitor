import { gzipSync, gunzipSync } from "node:zlib";
import { AuthError } from "../auth/service.js";

// Keep append-only previews within small MariaDB packet limits without changing
// shared database settings. Old plain JSON arrays remain readable.
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
export function encodeImportRows(rows: unknown[]): string {
  const json = JSON.stringify(rows);
  if (Buffer.byteLength(json) > MAX_EXPANDED_BYTES)
    throw new AuthError(422, "IMPORT_TOO_LARGE", "This import contains too much detail. Split it into smaller workbooks.");
  const encoded = json.length < 128000 ? json : JSON.stringify({
    encoding: "ldss-import-gzip-v1",
    data: gzipSync(json).toString("base64"),
  });
  if (Buffer.byteLength(encoded) > 400000)
    throw new AuthError(422, "IMPORT_TOO_LARGE", "This import contains too much detail. Split it into smaller workbooks.");
  return encoded;
}
export function decodeImportRows<T>(stored: string): T[] {
  const value = JSON.parse(stored);
  if (Array.isArray(value)) return value as T[];
  if (value?.encoding !== "ldss-import-gzip-v1" || typeof value.data !== "string")
    throw new Error("Unsupported stored import format");
  const rows = JSON.parse(gunzipSync(Buffer.from(value.data, "base64"), { maxOutputLength: MAX_EXPANDED_BYTES }).toString("utf8"));
  if (!Array.isArray(rows)) throw new Error("Invalid stored import rows");
  return rows as T[];
}
