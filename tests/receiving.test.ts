import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { parseBatchReceipt } from "../server/requirements/receipt-validation";
import { defaultReceivingPeriod, defaultReceivingYear, openReceivingPeriods, resolveReceivingPeriod } from "../src/receiving-selection";
import type { ReceivingPeriod } from "../server/requirements/instances-model";
const body = {
  items: [
    { id: randomUUID(), expectedVersion: 0 },
    { id: randomUUID(), expectedVersion: 0 },
  ],
  receivedOn: "2026-01-01",
  physicalReference: null,
  storageLocation: null,
  remarks: null,
};
const period = (
  id: string,
  payout: boolean,
  preferred = true,
): ReceivingPeriod => ({
  id,
  semesterId: "semester",
  semesterVersion: 1,
  payoutCycleId: payout ? id : null,
  payoutVersion: payout ? 1 : null,
  label: id,
  preferred,
  canProvision: preferred,
});
describe("simplified receiving", () => {
  it("excludes a historical period without redirecting its saved selection", () => {
    const options = [period("old", false, false), period("open", true)];
    expect(resolveReceivingPeriod(options, "old")).toBe("");
    expect(openReceivingPeriods(options).map(p => p.id)).toEqual(["open"]);
    expect(resolveReceivingPeriod(options, "")).toBe("open");
  });
  it("does not redirect a stale selection to the only or preferred period", () => {
    expect(resolveReceivingPeriod([period("new", true)], "removed")).toBe("");
    expect(resolveReceivingPeriod([], "removed")).toBe("");
    expect(resolveReceivingPeriod([period("one", true), period("two", true)], "")).toBe("");
  });
  it("accepts multiple receipts with optional custody fields", () =>
    expect(parseBatchReceipt(body)).toEqual(body));
  it("rejects duplicates, empty batches, invalid versions/dates and forged actors", () => {
    for (const extra of [
      { items: [] },
      { items: [body.items[0], body.items[0]] },
      { items: [{ ...body.items[0], expectedVersion: -1 }] },
      { receivedOn: "9999-01-01" },
      { actorId: randomUUID() },
      { receivedBy: "someone" },
      { status: "verified" },
    ])
      expect(() => parseBatchReceipt({ ...body, ...extra })).toThrow();
  });
  it("prefers the single open payout over semester and historical periods", () => {
    expect(
      defaultReceivingPeriod([
        period("semester", false),
        period("open", true),
        period("old", true, false),
      ]),
    ).toBe("open");
  });
  it("requires an explicit choice between multiple open payouts or current semesters", () => {
    expect(
      defaultReceivingPeriod([period("one", true), period("two", true)]),
    ).toBe("");
    expect(
      defaultReceivingPeriod([period("one", false), period("two", false)]),
    ).toBe("");
  });
  it("uses the current semester without an open payout; historical-only periods cannot receive", () => {
    expect(
      defaultReceivingPeriod([
        period("old", true, false),
        period("semester", false),
      ]),
    ).toBe("semester");
    expect(defaultReceivingPeriod([period("old", true, false)])).toBe("");
    expect(resolveReceivingPeriod([period("old", true, false)], "old")).toBe("");
    expect(defaultReceivingPeriod([])).toBe("");
  });
  it("keeps already-provisioned open semesters and excludes ended semesters even when payroll remains open", () => {
    const existing = { ...period("current", false), canProvision: false };
    const ended = { ...period("ended-payroll", true, false), canProvision: true };
    expect(openReceivingPeriods([ended, existing])).toEqual([existing]);
    expect(resolveReceivingPeriod([ended, existing], "")).toBe("current");
    expect(resolveReceivingPeriod([ended, existing], "current")).toBe("current");
  });
});

describe("current receiving year", () => {
  const year = (id: string, startsOn = "2026-06-01", endsOn = "2027-05-31") => ({ id, startsOn, endsOn, locked: false, archived: false });
  const records = [{ id: "annual-real", academicYearId: "real" }, { id: "annual-demo", academicYearId: "demo" }];
  it("resolves overlapping training and real calendars using the scholar's current registration context", () => {
    expect(defaultReceivingYear(records, [year("demo"), year("real")], "real", "2026-10-07")).toBe("annual-real");
    expect(defaultReceivingYear(records, [year("real"), year("demo")], "demo", "2026-10-07")).toBe("annual-demo");
    expect(defaultReceivingYear(records, [year("real"), year("demo")], "unknown", "2026-10-07")).toBe("");
  });
  it("uses the current year even when registration is from an earlier year", () => {
    expect(defaultReceivingYear(records, [year("real", "2025-06-01", "2026-05-31"), year("demo")], "real", "2026-10-07")).toBe("annual-demo");
  });
  it("does not substitute an earlier annual record when the current year has no record", () => {
    expect(defaultReceivingYear([records[0]], [year("real", "2025-06-01", "2026-05-31"), year("demo")], "real", "2026-10-07")).toBe("");
  });
  it("respects locked/archived years and inclusive date boundaries", () => {
    expect(defaultReceivingYear(records, [{ ...year("real"), locked: true }], "real", "2026-10-07")).toBe("");
    expect(defaultReceivingYear(records, [{ ...year("real"), archived: true }], "real", "2026-10-07")).toBe("");
    expect(defaultReceivingYear(records, [year("real")], "real", "2026-06-01")).toBe("annual-real");
    expect(defaultReceivingYear(records, [year("real")], "real", "2027-05-31")).toBe("annual-real");
    expect(defaultReceivingYear(records, [year("real")], "real", "2027-06-01")).toBe("");
  });
});
