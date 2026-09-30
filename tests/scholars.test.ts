import { describe, expect, it } from "vitest";
import {
  parseScholarInput,
  parseScholarQuery,
} from "../server/scholars/validation.js";
const fields = {
  firstName: " María ",
  lastName: "Dela Cruz",
  academicYearId: "12345678-1234-4234-8234-123456789012",
  contact: {},
};
const body = { expectedVersion: 0, reason: "Initial verified entry", fields };
describe("scholar input boundary", () => {
  it("preserves Unicode names, trims spaces and distinguishes unknown birth dates", () => {
    const result = parseScholarInput(body, true);
    expect(result.fields.firstName).toBe("María");
    expect(result.fields.birthDate).toBeNull();
    expect(result.fields.contact).toEqual({
      email: "",
      phone: "",
      addressLine: "",
    });
  });
  it.each(["humanId", "scholarId", "entryYear", "id"])(
    "rejects browser-supplied permanent identity %s",
    (key) => {
      expect(() =>
        parseScholarInput(
          { ...body, fields: { ...fields, [key]: "forged" } },
          true,
        ),
      ).toThrow();
    },
  );
  it.each(["2026-02-30", "9999-01-01", "1899-01-01"])(
    "rejects invalid or future birth date %s",
    (birthDate) => {
      expect(() =>
        parseScholarInput({ ...body, fields: { ...fields, birthDate } }, true),
      ).toThrow();
    },
  );
  it("rejects malformed references, contacts, control characters, and absent reasons", () => {
    expect(() =>
      parseScholarInput(
        { ...body, fields: { ...fields, academicYearId: "bad" } },
        true,
      ),
    ).toThrow();
    expect(() =>
      parseScholarInput(
        { ...body, fields: { ...fields, contact: { email: "invalid" } } },
        true,
      ),
    ).toThrow();
    expect(() =>
      parseScholarInput(
        { ...body, fields: { ...fields, firstName: "A\u0000B" } },
        true,
      ),
    ).toThrow();
    expect(() => parseScholarInput({ ...body, reason: "" }, true)).toThrow();
  });
  it("requires optimistic versions for updates and bounded searches", () => {
    expect(() => parseScholarInput(body, false)).toThrow();
    expect(() => parseScholarQuery({ limit: 1000 })).toThrow();
    expect(() =>
      parseScholarQuery({ email: "private@example.invalid" }),
    ).toThrow();
  });
});
