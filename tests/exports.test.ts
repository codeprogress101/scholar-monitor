import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import {
  parseAuditExport,
  parseScholarExport,
} from "../server/exports/validation";
import { exportWorkbook } from "../server/exports/workbook";
describe("F28 scoped exports", () => {
  it("requires a registration year and rejects arbitrary columns or identities", () => {
    expect(parseScholarExport({ academicYearId: randomUUID() }).q).toBe("");
    for (const body of [
      {},
      { academicYearId: randomUUID(), columns: ["email"] },
      { academicYearId: randomUUID(), actorId: randomUUID() },
      { academicYearId: "invalid" },
    ])
      expect(() => parseScholarExport(body)).toThrow();
  });
  it("accepts exactly 31 inclusive days and rejects invalid, reversed or future periods", () => {
    expect(parseAuditExport({ from: "2026-01-01", to: "2026-01-31" })).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    for (const body of [
      { from: "2026-01-01", to: "2026-02-01" },
      { from: "2026-01-02", to: "2026-01-01" },
      { from: "2026-02-30", to: "2026-02-30" },
      { from: "9999-01-01", to: "9999-01-01" },
      { from: "2026-01-01", to: "2026-01-02", includeDetails: true },
    ])
      expect(() => parseAuditExport(body)).toThrow();
  });
  it("exports formula-like data and scope metadata as inert text", async () => {
    const bytes = await exportWorkbook(
      "Test",
      ["Value"],
      [["=1+1"], ["+cmd"], ["-cmd"], ["@SUM(A1)"], ["\t=1"]],
      { Scope: "=HYPERLINK(1)" },
    );
    const w = new ExcelJS.Workbook();
    await w.xlsx.load(bytes as unknown as Parameters<typeof w.xlsx.load>[0]);
    for (let row = 2; row <= 6; row++) {
      const c = w.getWorksheet("Test")!.getCell(row, 1);
      expect(typeof c.value).toBe("string");
      expect(String(c.value)).toMatch(/^'/);
      expect(c.formula).toBeUndefined();
    }
    expect(w.getWorksheet("Export information")!.getCell("B2").value).toBe(
      "'=HYPERLINK(1)",
    );
  });
});
