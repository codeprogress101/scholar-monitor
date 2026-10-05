import { ApiError } from "./auth-api";
import { useEffect, useRef } from "react";
import { errorFeedback } from "./error-feedback";
export default function ErrorNotice({ error }: { error: string | ApiError }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) {
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error]);
  if (!error) return null;
  const feedback = error instanceof ApiError ? errorFeedback(error) : null;
  return (
    <div ref={panel} tabIndex={-1} className="alert alert-danger" role="alert">
      <p className="mb-1">
        {typeof error === "string" ? error : error.message}
      </p>
      {!!feedback?.issues.length && (
        <ul className="mb-2">
          {feedback.issues.map((issue, i) => (
            <li key={i}>
              {issue.label && <strong>{issue.label}: </strong>}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      {feedback?.guidance && <p className="mb-0">{feedback.guidance}</p>}
      {error instanceof ApiError && error.requestId && (
        <details className="mt-2">
          <summary>Support reference</summary>
          <span className="text-break">
            {error.code} · {error.requestId}
          </span>
        </details>
      )}
    </div>
  );
}
