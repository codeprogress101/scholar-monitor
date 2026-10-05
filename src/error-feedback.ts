import { ApiError } from "./auth-api";
const fieldLabels: Record<string, string> = {
  fields: "",
  items: "",
  firstName: "First name",
  lastName: "Last name",
  birthDate: "Birth date",
  academicYearId: "Academic year",
  barangayId: "Barangay",
  receivedOn: "Received date",
  expectedVersion: "Record version",
  expectedRevision: "Record revision",
  physicalReference: "Physical reference",
  storageLocation: "Storage location",
};
export function errorFeedback(error: ApiError) {
  const details = error.details as
    { issues?: unknown; validation?: { issues?: unknown } } | undefined;
  const raw = details?.issues ?? details?.validation?.issues;
  const issues = Array.isArray(raw)
    ? raw.slice(0, 50).flatMap((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.message !== "string"
        )
          return [];
        const path = Array.isArray(item.path) ? item.path : [];
        const label = path
          .map((p: unknown) =>
            typeof p === "number"
              ? `row ${p + 1}`
              : typeof p === "string"
                ? (fieldLabels[p] ?? p.replace(/([a-z])([A-Z])/g, "$1 $2"))
                : "",
          )
          .filter(Boolean)
          .join(" / ");
        const record =
          typeof item.scholarshipId === "string"
            ? `Scholarship ${item.scholarshipId}`
            : typeof item.scholarId === "string"
              ? `Scholar ${item.scholarId}`
              : "";
        return [{ label: label || record, message: item.message }];
      })
    : [];
  const guidance =
    error.status === 401
      ? "Sign in again to continue."
      : error.status === 403
        ? "Your account cannot perform this action. Check My access."
        : error.status === 423
          ? "This record or period is locked. Refresh its status before continuing."
          : error.code === "IDEMPOTENCY_CONFLICT"
            ? "This retry key belongs to different changes. Review the current record before starting a new action."
            : error.status === 409
              ? "Refresh and review the latest record before trying again."
              : error.status === 422
                ? "Correct the indicated fields and submit again."
                : error.status >= 500
                  ? "The result could not be confirmed. Check the current record before retrying the same changes."
                  : "";
  return { issues, guidance };
}
