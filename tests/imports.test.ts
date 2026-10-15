import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { normalizeIntakeStatus } from "../server/imports/normalization";
import { IMPORT_COLUMNS, SIMPLE_COLUMNS } from "../server/imports/model";
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
  it("recognizes full intake labels without guessing misspelled statuses", () => {
    expect(normalizeIntakeStatus(" OLD  SCHOLAR ")).toBe("old");
    expect(normalizeIntakeStatus("NEW SCHOLAR")).toBe("new");
    expect(normalizeIntakeStatus("Continuing Scholar")).toBe("continuing");
    expect(normalizeIntakeStatus("Old")).toBe("old");
    expect(normalizeIntakeStatus("OL SCHOLAR")).toBe("ol scholar");
  });
  it("round-trips a template with text identifiers and an Excel birth date", async () => {
    const w = new ExcelJS.Workbook();
    await w.xlsx.load(
      (await importTemplate(true)) as unknown as Parameters<typeof w.xlsx.load>[0],
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
        s.getCell("A1502").value = "too many";
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

it("accepts the eight headings on any sheet, whitespace/case and numeric levels", async () => {
 const w = new ExcelJS.Workbook(), s = w.addWorksheet("Official list");
 s.addRow(SIMPLE_COLUMNS.map(h => `  ${h.toUpperCase().replace(/ /g, "   ")}  `));
 s.addRow(["Dela Cruz", "Ana", "", "", "School A", 2, "Old", ""]);
 const rows = await parseWorkbook(Buffer.from(await w.xlsx.writeBuffer()));
 expect(rows[0].format).toBe("simple"); expect(rows[0].cells.yearLevel).toBe("2"); expect(rows[0].status).toBe("Old"); expect(rows[0].errors).toEqual([]);
});

it("ignores empty trailing column formatting but rejects unexpected values, formulas and links", async () => {
 const w = new ExcelJS.Workbook(), s = w.addWorksheet("Scholars");
 s.addRow([...SIMPLE_COLUMNS]);
 s.addRow(["Synthetic", "Person", "", "", "School", 1, "Old", "Course"]);
 s.getCell("Z2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
 expect(await parseWorkbook(Buffer.from(await w.xlsx.writeBuffer()))).toHaveLength(1);
 for (const value of ["Unexpected", { formula: "1+1", result: 2 }, { text: "Link", hyperlink: "https://example.invalid" }]) {
   s.getCell("I2").value = value;
   await expect(parseWorkbook(Buffer.from(await w.xlsx.writeBuffer()))).rejects.toThrow();
 }
 s.getCell("I2").value = null;
 s.getCell("Z2").value = "Unexpected";
 await expect(parseWorkbook(Buffer.from(await w.xlsx.writeBuffer()))).rejects.toThrow();
});

it("accepts exactly 1500 simple rows and rejects 1501", async () => {
 const w = new ExcelJS.Workbook(), s = w.addWorksheet("Roster"); s.addRow([...SIMPLE_COLUMNS]);
 for (let i=0; i<1500; i++) s.addRow([`Surname ${i}`, "Name", "", "", "School", 1, "New", ""]);
 expect(await parseWorkbook(Buffer.from(await w.xlsx.writeBuffer()))).toHaveLength(1500);
 s.addRow(["Overflow", "Name", "", "", "School", 1, "New", ""]);
 await expect(parseWorkbook(Buffer.from(await w.xlsx.writeBuffer()))).rejects.toThrow();
});
