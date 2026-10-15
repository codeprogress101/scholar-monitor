import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";

/** Historical evidence remains readable. This is deliberately not an eligibility override. */
export async function requireNumberedPayroll(db: PoolConnection, batchId: string) {
  const [[mapped]] = await db.execute<RowDataPacket[]>(
    "SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?", [batchId],
  );
  if (!mapped) throw new AuthError(409, "LEGACY_PAYROLL_READ_ONLY",
    "Legacy payroll is read-only. Coordinator-reviewed conversion and reconciliation are required before further financial processing. Historical corrections remain available.");
}
