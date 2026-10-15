import { expect, it } from "vitest";
import { routeChangeTracker, scholarAddress, scholarSection } from "../src/scholar-navigation";
import { newRecordYear } from "../src/academic-year-options";
import type { ConfigRecord } from "../server/configuration/model";
const year = (id: string, overrides: Partial<ConfigRecord> = {}): ConfigRecord => ({ id, code: id, name: id, version: 1, locked: false, archived: false, startsOn: "2026-06-01", endsOn: "2027-05-31", parentUnavailable: false, academicYearId: null, valueType: null, value: null, ...overrides });

it("handles Back and Forward once when both history events report the same URL", () => {
  const profile = scholarAddress("person", "requirements", "year");
  const changed = routeChangeTracker(profile);
  expect(changed("#scholars")).toBe(true);
  expect(changed("#scholars")).toBe(false);
  expect(changed(profile)).toBe(true);
  expect(changed(profile)).toBe(false);
  expect(changed("#scholars")).toBe(true);
});
it("ignores skip links without swallowing the next genuine navigation", () => {
  const changed = routeChangeTracker("#scholars");
  expect(changed("#main-content")).toBe(false);
  expect(changed("#scholars")).toBe(false);
  expect(changed(scholarAddress("person", "overview"))).toBe(true);
});

it("restores the selected scholar tab and year instead of returning to receiving", () => {
  for (const section of ["scholarship", "academic", "requirements", "timeline", "overview"]) {
    const params = new URLSearchParams(scholarAddress("person", section, "year").split("?")[1]);
    expect(scholarSection(params)).toBe(section);
    expect(params.get("academicYear")).toBe("year");
  }
  expect(scholarSection(new URLSearchParams("section=unknown"))).toBe("overview");
  expect(scholarSection(new URLSearchParams("task=receive"))).toBe("requirements");
});
it("never prefills an already-used or unavailable year in a new record form", () => {
  const years = [year("real"), year("demo")];
  expect(newRecordYear(years, ["real"], "real", "real", "2026-10-07")).toBe("");
  expect(newRecordYear(years, [], "demo", "real", "2026-10-07")).toBe("demo");
  expect(newRecordYear(years, [], "", "real", "2026-10-07")).toBe("real");
  expect(newRecordYear([year("real", {locked: true})], [], "real", "real", "2026-10-07")).toBe("");
  expect(newRecordYear(years, [], "deleted", "real", "2026-10-07")).toBe("");
});
it("uses the designated working year and excludes other calendars from new record defaults", () => {
  const years = [year("real", { working: true }), year("demo", { working: false })];
  expect(newRecordYear(years, [], "", "demo", "2026-10-07")).toBe("real");
  expect(newRecordYear(years, [], "demo", "demo", "2026-10-07")).toBe("");
  expect(newRecordYear(years, ["real"], "", "demo", "2026-10-07")).toBe("");
});
