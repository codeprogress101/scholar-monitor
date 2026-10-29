export type PayrollWorkspace = "batches" | "recording" | "individual" | "reports";

/** Navigation state only. Neither URLs nor remembered context grant authority. */
export function payrollWorkspaceLinks(hash: string, remembered = "") {
  const current = new URLSearchParams(hash.split("?")[1]);
  const previous = new URLSearchParams(remembered.split("?")[1]);
  const params = new URLSearchParams();
  const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  for (const key of ["cycle", "batch"]) {
    const value = current.get(key) ?? (current.has("cycle") ? null : previous.get(key));
    if (value && uuid.test(value)) params.set(key, value);
  }
  if (!params.has("cycle")) params.delete("batch");
  const href = (route: string, view?: string) => {
    const next = new URLSearchParams(params);
    if (view) next.set("view", view);
    return `#${route}${next.size ? `?${next}` : ""}`;
  };
  const view = current.get("view");
  const active: PayrollWorkspace = hash.startsWith("#individual-payments") ? "individual"
    : view === "reports" ? "reports" : view === "recording" || view === "reconciliation" ? "recording" : "batches";
  return { active, links: [
    { id: "batches", label: "Payroll Batches", href: href("payouts") },
    { id: "recording", label: "Payment Recording", href: href("payouts", "recording") },
    { id: "individual", label: "Individual Payments", href: href("individual-payments") },
    { id: "reports", label: "Reports", href: href("payouts", "reports") },
  ] };
}
