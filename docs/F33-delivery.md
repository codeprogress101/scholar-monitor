# F33 — Error Contract and Validation UX

Implemented in v0.34.0. Next checkpoint: F34 security hardening and RLS review.

## API contract

Failures retain `{ error: { code, message, request_id, details? } }`. Existing domain statuses and codes remain unchanged: malformed input 400, authentication 401, permission 403, missing records 404, state/version conflict 409, validation 422, locked records 423, unexpected failures 500.

Schema validators now attach `details.issues`, each containing a field path, schema issue code and message. Array indexes remain zero-based in the API. Feedback is capped at 50 issues with a `truncated` indicator and 300-character issue messages. The details builder copies no submitted values or raw Zod objects and does not echo unsupported key names. Existing concise domain messages remain available for clients that do not render details.

Masterlist candidate failures additionally expose existing row issues under `details.issues`, while retaining the original `error.issues` alias for compatibility. OVR validation details continue to use their existing nested validation payload.

Unexpected/framework errors use fixed public messages rather than exception text. Malformed requests keep `INVALID_REQUEST`; size and format failures use `PAYLOAD_TOO_LARGE` (413) and `UNSUPPORTED_MEDIA_TYPE` (415). Unexpected failures remain `INTERNAL_ERROR` and explain that the result is uncertain. SQL messages and stack traces are never used as the public response.

## User feedback

The shared error notice is integrated into scholar registration/editing, receiving, configuration, masterlist and OVR draft forms. It shows readable field/row issue lists, uses one-based row labels, focuses and scrolls into view, and provides status-appropriate next steps. Request IDs and stable error codes appear under a collapsed support reference. It does not clear form inputs, create a new retry key or automatically repeat a command.

Both shared API clients preserve details and request IDs, including the legacy masterlist issue shape. Existing import row tables and other domain-specific error views remain intact. This adds shared presentation to the primary forms; it does not redesign every existing form.

## Validation

- `npm run check`: lint, **168 tests / 35 files**, type checking, production build and secrets scan passed. JSX test discovery/type checking now includes component rendering tests.
- New tests cover domain status/code preservation, field and indexed-row details, bounded payloads, credential-value exclusion, escaped rendering, recovery guidance, request-reference transport and safe unexpected-error responses.
- `npm run test:receiving-db`: all seven groups passed, including a new API assertion for the exact `items[0].expectedVersion` validation path and request ID.
- `npm run test:masterlists-db`: all nine groups passed; structured candidate failures retain compatibility.
- Scholar disposable fixture: all 16 scenarios passed.
- Browser presentation check used a synthetic intercepted 422 response in the disposable scholar fixture to verify field/row labels, support references and mobile width. Actual server validation was checked separately in database tests. Artifacts: `output/playwright/f33-validation.png`, `f33-mobile.png`.

No migration or new grants; 29 applied migrations remain unchanged. Personal accounts, activation files and demo records were not changed.

## Files

`server/validation-details.ts`, `server/error-response.ts`, schema validators and embedded validation guards, masterlist route response details, app error handling, `src/ErrorNotice.tsx`, `src/error-feedback.ts`, shared API clients and five form integrations, error-contract/rendering tests, receiving integration assertion, test configuration, release metadata and documentation.
