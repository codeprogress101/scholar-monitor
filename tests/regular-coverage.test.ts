import { describe, expect, it } from "vitest";
import { resolveRegularCoverage, type CoverageYear, type CoverageTerm, type CoverageMapping } from "../server/continuing/regular-coverage.js";

const years: CoverageYear[] = [
  { id: "y1", version: 1, starts: "2025-01-01", ends: "2025-12-31" },
  { id: "y2", version: 1, starts: "2026-01-01", ends: "2026-12-31" },
];
const terms: CoverageTerm[] = years.flatMap((y) => [
  { id: `${y.id}-1`, name: `${y.id} first`, yearId: y.id, version: 1, starts: y.starts, ends: `${y.starts.slice(0, 4)}-06-30` },
  { id: `${y.id}-2`, name: `${y.id} second`, yearId: y.id, version: 1, starts: `${y.starts.slice(0, 4)}-07-01`, ends: y.ends },
]);
const mappings: CoverageMapping[] = terms.map((t) => ({ cycleId: t.id, semesterId: t.id, yearId: t.yearId, term: Number(t.id.slice(-1)), semesterVersion: 1, yearVersion: 1 }));
const resolve = (id = "y2-2", t = terms, y = years, m = mappings) => resolveRegularCoverage(id, t, y, m);

describe("regular semester predecessor", () => {
  it("uses regular term identity within and across years", () => {
    expect(resolve()?.predecessorId).toBe("y2-1");
    expect(resolve("y2-1")?.predecessorId).toBe("y1-2");
  });
  it("does not invent regular identities for legacy periods", () => {
    expect(resolve("y2-2", terms, years, [])).toBeNull();
  });
  it("requires the mapped predecessor, not an arbitrary earlier term", () => {
    expect(() => resolve("y2-2", terms, years, mappings.filter((m) => m.semesterId !== "y2-1"))).toThrow("Map the immediately preceding");
    expect(() => resolve("y1-1")).toThrow("preceding academic year");
  });
  it("rejects stale mappings and periods outside their academic year", () => {
    expect(() => resolve("y2-2", terms.map((t) => t.id === "y2-1" ? { ...t, version: 2 } : t))).toThrow();
    expect(() => resolve("y2-2", terms, years.map((y) => y.id === "y2" ? { ...y, version: 2 } : y))).toThrow();
    expect(() => resolve("y2-2", terms.map((t) => t.id === "y2-1" ? { ...t, starts: "2024-01-01" } : t))).toThrow();
  });
  it("does not choose between overlapping or intervening calendars", () => {
    expect(() => resolve("y2-2", [...terms, { ...terms[2], id: "summer", name: "Summer", starts: "2026-05-01", ends: "2026-06-29" }])).toThrow("overlaps or intervenes");
    expect(() => resolve("y2-1", terms, [...years, { ...years[0], id: "overlap", ends: "2026-03-31" }])).toThrow("years overlap");
    expect(() => resolve("y2-1", terms, [...years, { ...years[0], id: "duplicate" }])).toThrow("unambiguous");
  });
  it("does not skip a nearer academic year with missing regular mappings", () => {
    const shifted = terms.map((t) => t.yearId === "y1" ? { ...t, starts: t.starts.replace("2025", "2023"), ends: t.ends.replace("2025", "2023") } : t);
    expect(() => resolve("y2-1", shifted, [{ ...years[0], starts: "2023-01-01", ends: "2023-12-31" }, { id: "unmapped", version: 1, starts: "2024-01-01", ends: "2024-12-31" }, years[1]])).toThrow("Map the immediately preceding");
  });
  it("requires review of gaps in the configured annual calendar", () => {
    const shifted = terms.map((t) => t.yearId === "y1" ? { ...t, starts: t.starts.replace("2025", "2023"), ends: t.ends.replace("2025", "2023") } : t);
    expect(() => resolve("y2-1", shifted, [{ ...years[0], starts: "2023-01-01", ends: "2023-12-31" }, years[1]])).toThrow("not consecutive");
  });
  it("pins relevant evidence without unrelated future-calendar churn", () => {
    const initial = resolve();
    expect(resolve("y2-2", [...terms, { ...terms[3], id: "future", starts: "2030-01-01", ends: "2030-06-30" }])).toEqual(initial);
    expect(resolve("y2-2", terms.map((t) => t.id === "y2-1" ? { ...t, name: "Changed evidence" } : t))?.sourceHash).not.toBe(initial?.sourceHash);
  });
});


describe("calendar identities independent of payroll", () => {
 const calendar = terms.map(t => ({...t, termKind: t.id.endsWith("1") ? "first" as const : "second" as const}));
 it("resolves within and across academic years without any payout cycle", () => {
  expect(resolveRegularCoverage("y2-1",calendar,years,[])?.predecessorId).toBe("y1-2");
  expect(resolveRegularCoverage("y2-2",calendar,years,[])?.predecessorId).toBe("y2-1");
 });
 it("blocks disagreement and explicit irregular calendars", () => {
  expect(()=>resolveRegularCoverage("y2-2",calendar,years,mappings.map(m=>({...m,term:1})))).toThrow("conflicts");
  expect(()=>resolveRegularCoverage("y2-2",calendar.map(t=>t.id==='y2-2'?{...t,termKind:'other'}:t),years,[])).toThrow();
 });
});
