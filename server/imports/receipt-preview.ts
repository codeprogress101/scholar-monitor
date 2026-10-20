import type { ImportPreview, ImportPreviewRow } from "./model.js";

/** Derive one configuration blocker per cause, without hiding workbook errors. */
export function receiptPreview(rows: ImportPreviewRow[]): Pick<ImportPreview, "receiptBlockers" | "receiptGroups"> {
  const blockers = new Map<string, { code: string; message: string; rows: number[] }>();
  const groups = new Map<string, { cor: string; cog: string; corCount: number; cogCount: number; exemptCount: number }>();
  for (const row of rows) {
    if (row.receiptIssue) {
      const key = `${row.receiptIssue.code}:${row.receiptIssue.message}`;
      const b = blockers.get(key) ?? { ...row.receiptIssue, rows: [] };
      b.rows.push(row.row); blockers.set(key, b);
    }
    if (row.receiptContext && row.receipts) {
      const c = row.receiptContext, key = `${c.cor}:${c.cog}`;
      const g = groups.get(key) ?? { cor: c.cor, cog: c.cog, corCount: 0, cogCount: 0, exemptCount: 0 };
      if (row.receipts.cor) g.corCount++;
      if (row.receipts.cog && !c.cogExempt) g.cogCount++;
      if (row.receipts.cog && c.cogExempt) g.exemptCount++;
      groups.set(key, g);
    }
  }
  return { receiptBlockers: [...blockers.values()], receiptGroups: [...groups.values()] };
}
