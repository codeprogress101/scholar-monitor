export type Health = {
  status: "ok";
  service: "ldss-api";
  release: string;
  checkpoint: string;
  database: "connected" | "unavailable" | "not_configured";
};

export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch("/api/v1/health", { signal, cache: "no-store" });
  if (!response.ok)
    throw new Error("The service did not respond successfully.");
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== "object" ||
    !("status" in body) ||
    body.status !== "ok" ||
    !("service" in body) ||
    body.service !== "ldss-api" ||
    !("release" in body) ||
    typeof body.release !== "string" ||
    !("checkpoint" in body) ||
    typeof body.checkpoint !== "string" ||
    !("database" in body) ||
    !["connected", "unavailable", "not_configured"].includes(
      String(body.database),
    )
  ) {
    throw new Error("The service returned an unexpected response.");
  }
  return body as Health;
}
