import { describe, expect, it } from "vitest";
import { parseBatchPlacement, parseBatchVerification } from "../server/requirements/batch-validation.js";
import { batchResultUncertain, retainBatch, retainedBatch, hasPendingBatch } from "../src/batch-result.js";
import { ApiError } from "../src/auth-api.js";

const id = "00000000-0000-4000-8000-000000000001", other = "00000000-0000-4000-8000-000000000002";
const common = { importId: id, semesterId: other, scopeHash: "a".repeat(64), reason: "Reviewed physical documents", reference: "Paper batch 1" };
describe("document batch review contracts", () => {
  it("keeps the exact command in memory across workspace unmounts, isolated by actor", () => {
    const command = { path: "document-batches/verify", key: id, body: { importId: id, semesterId: other, items: [{ id }], ordinaryChecksConfirmed: true } };
    retainBatch(id, command);
    expect(hasPendingBatch(id)).toBe(true);
    expect(hasPendingBatch(other)).toBe(false);
    expect(retainedBatch(other)).toBeNull();
    const restored = retainedBatch(id)!;
    expect(restored).toEqual(command);
    restored.body.items.length = 0;
    expect(retainedBatch(id)).toEqual(command);
    retainBatch(id, null);
    expect(hasPendingBatch(id)).toBe(false);
  });
  it("retains uncertain payloads after retry access/validation failures", () => {
    expect(batchResultUncertain(new Error("Lost response"), false)).toBe(true);
    expect(batchResultUncertain(new ApiError(503, "UNAVAILABLE", "Unavailable"), false)).toBe(true);
    expect(batchResultUncertain(new ApiError(403, "PERMISSION_DENIED", "Denied"), false)).toBe(false);
    expect(batchResultUncertain(new ApiError(403, "PERMISSION_DENIED", "Denied"), true)).toBe(true);
    expect(batchResultUncertain(new ApiError(422, "VALIDATION_FAILED", "Changed contract"), true)).toBe(true);
    expect(batchResultUncertain(new ApiError(409, "IDEMPOTENCY_CONFLICT", "Another payload"), true)).toBe(true);
    expect(batchResultUncertain(new ApiError(409, "BATCH_SOURCE_CHANGED", "Source changed"), true)).toBe(false);
  });
  it("rejects duplicate selections, absent confirmations and forged verification payloads", () => {
    const item = { id, version: 1, contextHash: "b".repeat(64) };
    const input = { ...common, effectiveOn: "2026-01-01", items: [item], ordinaryChecksConfirmed: true, deferredCourseChecksConfirmed: false };
    expect(parseBatchVerification(input).items).toHaveLength(1);
    expect(() => parseBatchVerification({ ...input, items: [item, item] })).toThrow();
    expect(() => parseBatchVerification({ ...input, items: [{ ...item, checks: { placement: true } }] })).toThrow();
    expect(() => parseBatchVerification({ ...input, effectiveOn: "9999-01-01" })).toThrow();
    expect(() => parseBatchVerification({ ...input, ordinaryChecksConfirmed: undefined })).toThrow();
  });
  it("requires explicit historical review and preserves unknown year level as unknown", () => {
    const input = { ...common, coveredPlacementConfirmed: true, items: [{ id, sourceHash: "c".repeat(64), yearLevel: null }] };
    expect(parseBatchPlacement(input).items[0].yearLevel).toBeNull();
    expect(() => parseBatchPlacement({ ...input, coveredPlacementConfirmed: false })).toThrow();
    expect(() => parseBatchPlacement({ ...input, items: [{ ...input.items[0], schoolId: other }] })).toThrow();
  });
});
