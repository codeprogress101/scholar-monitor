export const SCHOLAR_SECTIONS = ["overview", "requirements", "academic", "scholarship", "timeline"] as const;
export function scholarSection(params: URLSearchParams) {
  const section = params.get("section");
  return SCHOLAR_SECTIONS.find(value => value === section) ?? (params.get("task") === "receive" ? "requirements" : "overview");
}
export function scholarAddress(scholarId: string, section: string, yearId = "") {
  const params = new URLSearchParams({ scholar: scholarId, section });
  if (yearId) params.set("academicYear", yearId);
  return `#scholars?${params}`;
}

/** A history traversal can emit both popstate and hashchange. Handle its URL once. */
export function routeChangeTracker(initialHash: string) {
  let handled = initialHash;
  return (hash: string) => {
    if (hash === "#main-content" || hash === handled) return false;
    handled = hash;
    return true;
  };
}
