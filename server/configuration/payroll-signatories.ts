import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
export const SIGNATORY_CODE = "PAYROLL_SIGNATORIES";
export const signatorySchema = z.array(z.object({name:z.string().trim().min(1).max(80),title:z.string().trim().min(1).max(100)}).strict()).length(4);
export function parseSignatories(value: string) {
  try { return signatorySchema.parse(JSON.parse(value)); }
  catch { throw new AuthError(422,"INVALID_SIGNATORIES","Provide four ordered signatories, each with a name and designation."); }
}
export async function currentSignatories(db: PoolConnection) {
  const [[row]]=await db.execute<RowDataPacket[]>("SELECT version,setting_value FROM system_settings WHERE code=? AND archived_at IS NULL",[SIGNATORY_CODE]);
  if(!row) throw new AuthError(409,"SIGNATORIES_REQUIRED","Payroll signatory configuration is missing. Ask the Administrator to complete setup.");
  return {signatories:parseSignatories(row.setting_value),signatoryRevision:Number(row.version)};
}
