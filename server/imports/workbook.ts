import ExcelJS from "exceljs";
import yauzl from "yauzl";
import { AuthError } from "../auth/service.js";
import { IMPORT_COLUMNS, SIMPLE_COLUMNS, MAX_IMPORT_ROWS, type ImportRow, type ImportColumn } from "./model.js";
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
      `Upload an .xlsx workbook of at most 2 MB and ${MAX_IMPORT_ROWS.toLocaleString("en-US")} data rows.`,
    );
  await inspectZip(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    throw invalid(
      "Could not read this workbook. Open it in Excel and Save As Excel Workbook (.xlsx), or copy its values into the supplied template.",
    );
  }
  if (workbook.worksheets.length !== 1)
    throw invalid(
      "Use one worksheet; remove additional sheets.",
    );
  const sheet = workbook.worksheets[0];
  // Excel can retain styles on otherwise empty trailing columns. Only actual
  // values determine the import width; formulas and links still count as data.
  let populatedColumns = 0;
  sheet.eachRow(row => row.eachCell((cell, column) => {
    if (cell.value !== null && cell.value !== undefined && cell.value !== "")
      populatedColumns = Math.max(populatedColumns, column);
  }));
  if (
    sheet.rowCount > MAX_IMPORT_ROWS + 1 ||
    populatedColumns > IMPORT_COLUMNS.length ||
    sheet.model.merges?.length
  )
    throw invalid(
      `Use the Scholars template without merged cells, at most ${MAX_IMPORT_ROWS.toLocaleString("en-US")} data rows and the supplied columns.`,
    );
  const normalize = (value: unknown) => typeof value === "string" ? value.replace(/\s+/g, "").toLowerCase() : "";
  const headings = Array.from({ length: populatedColumns }, (_, i) => normalize(sheet.getCell(1, i + 1).value));
  const simple = headings.length === SIMPLE_COLUMNS.length && SIMPLE_COLUMNS.every(h => headings.includes(normalize(h)));
  const expected = simple ? SIMPLE_COLUMNS : IMPORT_COLUMNS;
  if (headings.length !== expected.length || new Set(headings).size !== headings.length || !expected.every(h => headings.includes(normalize(h))))
    throw invalid("Use the eight-column scholar template or the existing legacy template.");
  const mapped: (ImportColumn | "status")[] = simple
    ? ["lastName", "firstName", "middleName", "suffix", "schoolCode", "yearLevel", "status", "courseCode"] : [...IMPORT_COLUMNS];
  const columns = expected.map((heading, i) => ({ column: mapped[i], index: headings.indexOf(normalize(heading)) + 1 }));
  const rows: ImportRow[] = [];
  for (let n = 2; n <= sheet.rowCount; n++) {
    const cells = Object.fromEntries(IMPORT_COLUMNS.map(c => [c, ""])) as Record<ImportColumn | "status", string>,
      errors: string[] = [];
    for (const { column, index } of columns) {
      const value = sheet.getCell(n, index).value;
      if (value === null || value === undefined) cells[column] = "";
      else if (
        value instanceof Date &&
        column === "birthDate" &&
        Number.isFinite(value.getTime())
      )
        cells[column] = value.toISOString().slice(0, 10);
      else if (column === "yearLevel" && typeof value === "number" && Number.isInteger(value)) cells[column] = String(value);
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
      rows.push({ row: n, cells, errors, ...(simple ? { format: "simple" as const, status: cells.status } : {}) });
  }
  if (!rows.length) throw invalid("The workbook contains no data rows.");
  return rows;
}
export const spreadsheetText = (value: string) =>
  /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
export async function importTemplate(legacy = false) {
  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet("Scholars");
  sheet.addRow((legacy ? IMPORT_COLUMNS : SIMPLE_COLUMNS).map(spreadsheetText));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).height = 30;
  sheet.getRow(1).eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF204F46" } }; });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: legacy ? IMPORT_COLUMNS.length : SIMPLE_COLUMNS.length } };
  sheet.columns.forEach((c) => {
    c.width = 23;
    c.numFmt = "@";
  });
  if (legacy) sheet.getColumn("F").numFmt = "yyyy-mm-dd";
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
