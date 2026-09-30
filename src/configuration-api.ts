import { ApiError } from "./auth-api";
export async function configurationRequest<T>(
  path: string,
  options?: {
    signal?: AbortSignal;
    method?: "POST" | "PATCH";
    body?: unknown;
    csrf?: string;
    key?: string;
  },
): Promise<T> {
  const response = await fetch("/api/v1/" + path, {
    method: options?.body === undefined ? "GET" : (options.method ?? "POST"),
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options?.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options?.csrf ? { "X-CSRF-Token": options.csrf } : {}),
      ...(options?.key ? { "Idempotency-Key": options.key } : {}),
    },
    ...(options?.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
    signal: options?.signal ?? AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      body?.error?.code ?? "UNAVAILABLE",
      body?.error?.message ?? "Configuration is unavailable. Please try again.",
    );
  if (!body) throw new Error("Unexpected service response.");
  return body as T;
}
