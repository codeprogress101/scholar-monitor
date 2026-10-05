// Untrusted framework/database failures never supply client-facing message text.
export function publicFailure(error: unknown) {
  const value =
    error !== null && typeof error === "object"
      ? (error as { statusCode?: unknown })
      : {};
  const status =
    typeof value.statusCode === "number" &&
    Number.isInteger(value.statusCode) &&
    value.statusCode >= 400 &&
    value.statusCode < 500
      ? value.statusCode
      : 500;
  const known: Record<number, [string, string]> = {
    400: [
      "INVALID_REQUEST",
      "The request is malformed. Refresh and try again.",
    ],
    413: [
      "PAYLOAD_TOO_LARGE",
      "The request exceeds the allowed size. Reduce the upload or number of records.",
    ],
    415: ["UNSUPPORTED_MEDIA_TYPE", "This request uses an unsupported format."],
    500: [
      "INTERNAL_ERROR",
      "The result could not be confirmed. Check the current record before retrying the same changes.",
    ],
  };
  const [code, message] = known[status] ?? [
    "INVALID_REQUEST",
    "The request could not be processed.",
  ];
  return { status, code, message };
}
