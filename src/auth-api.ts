export type User = { id: string; email: string; fullName: string };
export type Session = { user: User; csrfToken: string; expiresAt: string };
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function authRequest<T>(
  path: string,
  options?: { body?: unknown; csrf?: string },
): Promise<T> {
  const response = await fetch(`/api/v1/auth/${path}`, {
    method: options?.body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options?.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options?.csrf ? { "X-CSRF-Token": options.csrf } : {}),
    },
    ...(options?.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.code ?? "UNAVAILABLE",
      body?.error?.message ?? "The service is unavailable. Please try again.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
