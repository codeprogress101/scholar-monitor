import ExcelJS from "exceljs";
import yauzl from "yauzl";
import { AuthError } from "../auth/service.js";
import { IMPORT_COLUMNS, type ImportRow, type ImportColumn } from "./model.js";
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const invalid = (message: string) =>
  new AuthError(422, "INVALID_WORKBOOK", message);
// Inspect and decompress bounded entries before handing the archive to ExcelJS.
async function inspectZip(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (error, zip) => {
        if (error || !zip)
          return reject(invalid("Upload a valid .xlsx workbook."));
        let size = 0,
          count = 0;
        const names = new Set<string>();
        const fail = () => {
          zip.close();
          reject(
            invalid(
              "Workbook is oversized, encrypted, or contains unsupported content.",
            ),
          );
        };
        zip.on("error", fail);
        zip.on("end", resolve);
        zip.on("entry", (entry: yauzl.Entry) => {
          if (
            ++count > 100 ||
            (size += entry.uncompressedSize) > 10 * 1024 * 1024 ||
            names.has(entry.fileName) ||
            entry.generalPurposeBitFlag & 1 ||
            /vbaProject|externalLinks|embeddings/i.test(entry.fileName)
          )
            return fail();
          names.add(entry.fileName);
          if (entry.fileName.endsWith("/")) return zip.readEntry();
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail();
            let bytes = 0;
            stream.on("data", (chunk: Buffer) => {
              bytes += chunk.length;
              if (bytes > entry.uncompressedSize || bytes > 10 * 1024 * 1024) {
                stream.destroy();
                fail();
              }
            });
            stream.on("error", fail);
            stream.on("end", () => zip.readEntry());
          });
        });
        zip.readEntry();
      },
    );
  });
}
export async function parseWorkbook(buffer: Buffer): Promise<ImportRow[]> {
  if (!buffer.length || buffer.length > MAX_IMPORT_BYTES)
    throw invalid(
      "Upload an .xlsx workbook of at most 2 MB and 200 data rows.",
    );
  await inspectZip(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    throw invalid(
      "Could not read this workbook. Use the supplied .xlsx template.",
    );
  }
  if (workbook.worksheets.length !== 1)
    throw invalid(
      "Use one worksheet named Scholars; remove additional sheets.",
    );
  const sheet = workbook.worksheets[0];
  if (
    sheet.name !== "Scholars" ||
    sheet.rowCount > 201 ||
    sheet.columnCount > IMPORT_COLUMNS.length ||
    sheet.model.merges?.length
  )
    throw invalid(
      "Use the Scholars template without merged cells, at most 200 data rows and the supplied columns.",
    );
  IMPORT_COLUMNS.forEach((column, i) => {
    if (sheet.getCell(1, i + 1).value !== column)
      throw invalid(
        "Column headings must match the supplied template exactly.",
      );
  });
  const rows: ImportRow[] = [];
  for (let n = 2; n <= sheet.rowCount; n++) {
    const cells = {} as Record<ImportColumn, string>,
      errors: string[] = [];
    for (const [i, column] of IMPORT_COLUMNS.entries()) {
      const value = sheet.getCell(n, i + 1).value;
      if (value === null || value === undefined) cells[column] = "";
      else if (
        value instanceof Date &&
        column === "birthDate" &&
        Number.isFinite(value.getTime())
      )
        cells[column] = value.toISOString().slice(0, 10);
      else if (typeof value === "string") cells[column] = value.trim();
      else {
        cells[column] = "";
        errors.push(
          `${column}: use plain text${column === "birthDate" ? " or an Excel date" : ""}; formulas, links and numeric identifiers are not accepted.`,
        );
      }
      if (cells[column].length > 1000) {
        cells[column] = cells[column].slice(0, 1000);
        errors.push(`${column}: value is too long.`);
      }
    }
    if (errors.length || Object.values(cells).some(Boolean))
      rows.push({ row: n, cells, errors });
  }
  if (!rows.length) throw invalid("The workbook contains no data rows.");
  return rows;
}
export const spreadsheetText = (value: string) =>
  /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
export async function importTemplate() {
  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet("Scholars");
  sheet.addRow(IMPORT_COLUMNS.map(spreadsheetText));
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((c) => {
    c.width = 23;
    c.numFmt = "@";
  });
  sheet.getColumn("F").numFmt = "yyyy-mm-dd";
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
