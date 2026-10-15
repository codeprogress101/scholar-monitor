import { expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { graduationFor, preventGraduateRenewal, annualOperationalStatus } from "../server/status/graduation";

it("an explicit historical no-stipend correction supersedes the mistaken funding link without inventing receipt", async () => {
  const execute = vi.fn().mockResolvedValue([[{ scholar_id: "graduate", request_id: "original", semester_id: "wrong-first-semester", semester_name: "First semester", no_outstanding_stipend: 1, graduated_before_year: "AY2026-2027" }]]);
  const db = { execute } as unknown as PoolConnection;
  expect(await graduationFor(db, "graduate")).toMatchObject({ requestId: "original", semesterId: null, semesterName: null, archived: true, label: "Graduated before AY2026-2027 — Archived; no stipend due" });
  expect(execute).toHaveBeenCalledTimes(1);
  await expect(preventGraduateRenewal(db, "graduate", "wrong-first-semester")).rejects.toMatchObject({ code: "GRADUATE_RENEWAL_BLOCKED" });
  await expect(preventGraduateRenewal(db, "graduate")).rejects.toMatchObject({ code: "GRADUATE_RENEWAL_BLOCKED" });
});

it("counts a corrected graduate in the matching annual record, preserving historical annual statuses", () => {
  const graduate = { scholarshipId: "current-year-record", requestId: "original", semesterId: null, semesterName: null, archived: true, label: "Graduated" };
  expect(annualOperationalStatus("current-year-record", "active", graduate)).toBe("graduated");
  expect(annualOperationalStatus("previous-year-record", "active", graduate)).toBe("active");
  expect(annualOperationalStatus("other-scholar", "active")).toBe("active");
  expect(annualOperationalStatus("other-scholar", null)).toBeNull();
});
