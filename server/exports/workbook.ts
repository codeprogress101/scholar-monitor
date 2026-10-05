import ExcelJS from "exceljs";
import { spreadsheetText } from "../imports/workbook.js";
export async function exportWorkbook(
  title: string,
  columns: string[],
  rows: string[][],
  metadata: Record<string, string>,
) {
  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet(title);
  sheet.addRow(columns);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((c) => {
    c.width = 28;
    c.numFmt = "@";
  });
  for (const row of rows) sheet.addRow(row.map(spreadsheetText));
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: columns.length },
  };
  const info = workbook.addWorksheet("Export information");
  info.columns = [
    { header: "Field", width: 30 },
    { header: "Value", width: 65 },
  ];
  for (const [key, value] of Object.entries(metadata))
    info.addRow([spreadsheetText(key), spreadsheetText(value)]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
