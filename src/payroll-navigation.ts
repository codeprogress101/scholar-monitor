const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function payrollSelection(key: "cycle" | "batch") {
  const value = new URLSearchParams(window.location.hash.split("?")[1]).get(key);
  return value && uuid.test(value) ? value : null;
}
export function rememberPayroll(cycle: string | null, batch: string | null = null) {
  const params = new URLSearchParams();
  const previous = new URLSearchParams(window.location.hash.split("?")[1]);
  if (previous.get("cycle") === cycle && (!batch || previous.get("batch") === batch)) for (const key of ["request", "version", "view", "annual", "recovery"]) { const value=previous.get(key); if(value) params.set(key,value); }
  if (cycle) params.set("cycle", cycle);
  if (cycle && batch) params.set("batch", batch);
  window.history.replaceState(null, "", `#payouts${params.size ? "?" + params.toString() : ""}`);
  window.dispatchEvent(new Event("payroll-location-changed"));
}
