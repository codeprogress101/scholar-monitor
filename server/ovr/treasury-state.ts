import type { PoolConnection, RowDataPacket } from "mysql2/promise";
export type TreasuryEvidence = {revision: number; payrollReference: string; officeReceivedOn: string; actorId: string; recordedAt: string; reason: string};
export async function treasuryEvidence(db: PoolConnection, batchId: string): Promise<TreasuryEvidence | null> {
  const [[row]] = await db.execute<RowDataPacket[]>("SELECT *,DATE_FORMAT(office_received_on,'%Y-%m-%d') AS day,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS stamp FROM payroll_treasury_evidence WHERE batch_id=? ORDER BY revision DESC LIMIT 1", [batchId]);
  return row ? {revision: Number(row.revision), payrollReference: row.payroll_reference, officeReceivedOn: row.day, actorId: row.actor_id, recordedAt: row.stamp, reason: row.reason} : null;
}

export async function historicalReceipts(db: PoolConnection,batchId:string) {
  const [rows]=await db.execute<RowDataPacket[]>("SELECT h.snapshot FROM payroll_historical_receipts h WHERE h.batch_id=? AND NOT EXISTS(SELECT 1 FROM payroll_historical_receipts newer WHERE newer.id=h.id AND newer.version>h.version) ORDER BY h.recorded_at DESC",[batchId]);
  return rows.map(r=>(typeof r.snapshot === "string" ? JSON.parse(r.snapshot) : r.snapshot) as {id:string;scholarshipId:string;actualPaidOn:string|null;beforeDeadlineEvidence:string;state:string;version:number});
}
