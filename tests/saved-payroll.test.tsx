import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SavedPayrollTable from "../src/SavedPayrollTable";
import type { OvrDetail } from "../server/ovr/model";

describe("saved payroll presentation", () => {
  it("shows frozen membership and corrected payment outcomes, not today's changed eligibility", () => {
    const entry = { scholarshipId: "a", evidence: { current: { sources: { scholarship: { name: "Historical Scholar", humanId: "LDSS-2025-00001" } } } } };
    const detail = { batch: { state: "closed" }, effectiveFinalization: { snapshot: { entries: [entry] } },
      entries: [], validation: { issues: [{ message: "Current source changed" }] },
      reconciliation: { paidTotal: "5000.00" }, payments: [{ scholarshipId: "a", outcome: "paid", amount: "5000.00", effectiveOn: "2025-10-01" }] } as unknown as OvrDetail;
    const html = renderToStaticMarkup(<SavedPayrollTable detail={detail} />);
    expect(html).toContain("Historical Scholar"); expect(html).toContain("2025-10-01");
    expect(html).toContain("Paid"); expect(html).not.toContain("Current source changed");
    expect(html).toContain("<table");
  });
});
