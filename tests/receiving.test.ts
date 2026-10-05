import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { parseBatchReceipt } from "../server/requirements/receipt-validation";
import { defaultReceivingPeriod } from "../src/receiving-selection";
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
  it("uses the current semester without an open payout; historical-only periods remain accessible", () => {
    expect(
      defaultReceivingPeriod([
        period("old", true, false),
        period("semester", false),
      ]),
    ).toBe("semester");
    expect(defaultReceivingPeriod([period("old", true, false)])).toBe("old");
    expect(defaultReceivingPeriod([])).toBe("");
  });
});
