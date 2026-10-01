import { describe, it, expect } from "vitest";
import {
  parseDraft,
  parseEntry,
  parsePage,
} from "../server/masterlists/validation.js";
const id = "00000000-0000-4000-8000-000000000001",
  evidence = { reason: "Verified draft records", reference: "Register 01" };
describe("masterlist inputs", () => {
  it("requires an academic year and attributed evidence; cannot supply official status or counts", () => {
    const body = { academicYearId: id, title: "Draft 2026", ...evidence };
    expect(parseDraft(body).title).toBe("Draft 2026");
    for (const patch of [
      { status: "published" },
      { count: 769 },
      { academicYearId: "" },
      { reason: "" },
      { title: "" },
    ])
      expect(() => parseDraft({ ...body, ...patch })).toThrow();
  });
  it("requires optimistic versions and separates optional award numbers from scholar identity", () => {
    const body = {
      action: "add",
      expectedVersion: 1,
      scholarId: id,
      awardNumber: null,
      ...evidence,
    };
    expect(parseEntry(body).awardNumber).toBeNull();
    for (const patch of [
      { expectedVersion: 0 },
      { snapshot: {} },
      { action: "publish" },
      { awardNumber: "" },
      { scholarId: "LDSS-2026-00001" },
    ])
      expect(() => parseEntry({ ...body, ...patch })).toThrow();
  });
  it("bounds candidate searches and pagination", () => {
    expect(parsePage({})).toEqual({ q: "", limit: 25, offset: 0 });
    for (const query of [
      { limit: 101 },
      { offset: -1 },
      { q: "x".repeat(101) },
      { count: 769 },
    ])
      expect(() => parsePage(query)).toThrow();
  });
});
