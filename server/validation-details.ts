import type { z } from "zod";
// Keep only public schema feedback, never submitted values or the full Zod error.
export function validationDetails(error: z.ZodError) {
  return {
    issues: error.issues.slice(0, 50).map((issue) => ({
      path: issue.path.filter(
        (part): part is string | number =>
          typeof part === "string" || typeof part === "number",
      ),
      code: issue.code,
      message:
        issue.code === "unrecognized_keys"
          ? "Remove unsupported fields."
          : issue.message.slice(0, 300),
    })),
    truncated: error.issues.length > 50,
  };
}
