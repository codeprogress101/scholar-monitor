import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { IMPORT_COLUMNS } from "../server/imports/model";
import {
  importTemplate,
  parseWorkbook,
  spreadsheetText,
  MAX_IMPORT_BYTES,
} from "../server/imports/workbook";
async function workbook(
  edit: (w: ExcelJS.Workbook, s: ExcelJS.Worksheet) => void,
) {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("Scholars");
  s.addRow([...IMPORT_COLUMNS]);
  edit(w, s);
  return Buffer.from(await w.xlsx.writeBuffer());
}
describe("F27 Excel parsing", () => {
  it("round-trips a template with text identifiers and an Excel birth date", async () => {
    const w = new ExcelJS.Workbook();
    await w.xlsx.load(
      (await importTemplate()) as unknown as Parameters<typeof w.xlsx.load>[0],
    );
    w.worksheets[0].addRow([
      "",
      "Ana",
      "",
      "Test",
      "",
      new Date("2005-02-03T00:00:00Z"),
      "AY2026",
      "",
      "",
      "09170000000",
    ]);
    const rows = await parseWorkbook(Buffer.from(await w.xlsx.writeBuffer()));
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].cells.birthDate).toBe("2005-02-03");
    expect(rows[0].cells.phone).toBe("09170000000");
  });
  it("reports formula, hyperlink and numeric identifier cells rather than trusting cached results", async () => {
    const rows = await parseWorkbook(
      await workbook((_w, s) => {
        s.addRow([
          { formula: "1+1", result: 2 },
          { text: "External", hyperlink: "https://example.invalid" },
          null,
          "Test",
          null,
          null,
          "AY",
          null,
          null,
          9170000000,
        ]);
      }),
    );
    expect(rows[0].errors).toHaveLength(3);
    expect(rows[0].cells.scholarId).toBe("");
  });
  it("rejects malformed files and compressed upload limits", async () => {
    await expect(parseWorkbook(Buffer.from("not xlsx"))).rejects.toThrow();
    await expect(
      parseWorkbook(Buffer.alloc(MAX_IMPORT_BYTES + 1)),
    ).rejects.toThrow();
  });
  it("rejects wrong headings, merged cells, extra sheets and excessive rows", async () => {
    for (const edit of [
      (_w: ExcelJS.Workbook, s: ExcelJS.Worksheet) => {
        s.getCell("A1").value = "wrong";
      },
      (w: ExcelJS.Workbook) => {
        w.addWorksheet("Hidden", { state: "hidden" });
      },
      (_w: ExcelJS.Workbook, s: ExcelJS.Worksheet) => {
        s.mergeCells("A2:B2");
      },
      (_w: ExcelJS.Workbook, s: ExcelJS.Worksheet) => {
        s.getCell("A202").value = "too many";
      },
    ])
      await expect(parseWorkbook(await workbook(edit))).rejects.toThrow();
  });
  it("limits expanded archive size before Excel parsing", async () => {
    const large = await workbook((_w, s) => {
      s.getCell("B2").value = "x".repeat(11 * 1024 * 1024);
    });
    expect(large.length).toBeLessThan(MAX_IMPORT_BYTES);
    await expect(parseWorkbook(large)).rejects.toThrow();
  });
  it("rejects empty worksheets and preserves actual row numbers", async () => {
    await expect(parseWorkbook(await importTemplate())).rejects.toThrow(
      "no data rows",
    );
    const rows = await parseWorkbook(
      await workbook((_w, s) => {
        s.getCell("B5").value = "Ana";
      }),
    );
    expect(rows[0].row).toBe(5);
  });
  it("neutralizes spreadsheet formula prefixes in generated text", () => {
    for (const text of ["=SUM(A1)", "+cmd", "-cmd", "@function", "  =1"])
      expect(spreadsheetText(text)).toBe("'" + text);
    expect(spreadsheetText("firstName")).toBe("firstName");
  });
});
