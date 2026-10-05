import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import ErrorNotice from "../src/ErrorNotice";
import { ApiError, authRequest } from "../src/auth-api";
import { configurationRequest } from "../src/configuration-api";
import { validationDetails } from "../server/validation-details";
import { parseBatchReceipt } from "../server/requirements/receipt-validation";
import { AuthError } from "../server/auth/service";
import { publicFailure } from "../server/error-response";
afterEach(() => vi.unstubAllGlobals());
it("preserves indexed field paths without submitted values", () => {
  try {
    parseBatchReceipt({
      items: [{ id: "secret-invalid-id", expectedVersion: -1 }],
      receivedOn: "bad",
      physicalReference: null,
      storageLocation: null,
      remarks: null,
    });
    throw new Error("accepted");
  } catch (e) {
    expect(e).toBeInstanceOf(AuthError);
    const error = e as AuthError;
    expect(error).toMatchObject({ status: 422, code: "VALIDATION_FAILED" });
    expect(error.details).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ["items", 0, "expectedVersion"] }),
      ]),
    });
    expect(JSON.stringify(error.details)).not.toContain("secret-invalid-id");
  }
});
it("bounds details and omits unrecognized key names", () => {
  const result = z
    .array(z.object({}).strict())
    .safeParse(Array.from({ length: 60 }, () => ({ privateKey: "hidden" })));
  if (result.success) throw new Error("accepted");
  const detail = validationDetails(result.error);
  expect(detail.issues).toHaveLength(50);
  expect(detail.truncated).toBe(true);
  expect(JSON.stringify(detail)).not.toContain("privateKey");
});
it("renders field/row errors, safe text, recovery and request reference", () => {
  const html = renderToStaticMarkup(
    <ErrorNotice
      error={
        new ApiError(
          422,
          "VALIDATION_FAILED",
          "Review fields",
          {
            issues: [
              {
                path: ["items", 1, "receivedOn"],
                message: "<script>invalid</script>",
              },
            ],
          },
          "request-33",
        )
      }
    />,
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("row 2");
  expect(html).toContain("Received date");
  expect(html).toContain("request-33");
  expect(html).toContain("Correct the indicated fields");
  expect(html).not.toContain("<script>");
});
it("preserves request IDs and legacy row details in both clients", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "CANDIDATE_INVALID",
              message: "Review candidate",
              request_id: "trace-33",
              issues: [
                { scholarId: "scholar", message: "Missing academic record" },
              ],
            },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
    ),
  );
  for (const call of [
    () => configurationRequest("masterlists"),
    () => authRequest("login"),
  ])
    await expect(call()).rejects.toMatchObject({
      requestId: "trace-33",
      details: {
        issues: [{ scholarId: "scholar", message: "Missing academic record" }],
      },
    });
});
it("never uses private framework or database messages", () => {
  for (const statusCode of [400, 413, 415, 500, NaN, 999]) {
    const result = publicFailure({
      statusCode,
      message: "password=hidden",
      stack: "private trace",
    });
    expect(JSON.stringify(result)).not.toMatch(/hidden|private trace/);
    expect(result.status).toBe(
      statusCode === 400 || statusCode === 413 || statusCode === 415
        ? statusCode
        : 500,
    );
  }
});
