import { expect, it } from "vitest";
import { encodeImportRows, decodeImportRows } from "../server/imports/storage";
it("reads legacy arrays and round-trips compressed 1500-row previews losslessly", () => {
  expect(decodeImportRows('[{"row":2}]')).toEqual([{ row: 2 }]);
  const rows = Array.from({ length: 1500 }, (_, i) => ({ row: i + 2, name: `Synthetic ${i}`, detail: "Academic placement ".repeat(40) }));
  const stored = encodeImportRows(rows);
  expect(JSON.parse(stored).encoding).toBe("ldss-import-gzip-v1");
  expect(Buffer.byteLength(stored)).toBeLessThan(400000);
  expect(decodeImportRows(stored)).toEqual(rows);
});
it("fails closed for unknown or corrupt stored encodings", () => {
  expect(() => decodeImportRows('{"encoding":"unknown","data":""}')).toThrow();
  expect(() => decodeImportRows('{"encoding":"ldss-import-gzip-v1","data":"invalid"}')).toThrow();
});
