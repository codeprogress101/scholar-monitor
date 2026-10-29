import { useEffect, useRef, useState, type ReactNode } from "react";
import { configurationRequest } from "./configuration-api";
import { ApiError } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import type { OvrSections } from "../server/ovr/detail-model";

/** Closing a loaded disclosure keeps its forms mounted, including retry keys. */
export function PayrollDisclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [requested, setRequested] = useState(defaultOpen);
  return <details open={defaultOpen} onToggle={e => { if (e.currentTarget.open) setRequested(true); }}><summary>{title}</summary>{requested && children}</details>;
}
export default function PayrollDetailBoundary<K extends keyof OvrSections>({ batchId, section, title, children, onLoaded, refreshToken = 0, defaultOpen = false }: {
  batchId: string; section: K; title: string; children: (data: OvrSections[K]) => ReactNode; onLoaded?: (data: OvrSections[K]) => void; refreshToken?: number; defaultOpen?: boolean;
}) {
  const [requested, setRequested] = useState(defaultOpen), [data, setData] = useState<OvrSections[K] | null>(null),
    [failure, setFailure] = useState<{ key: string; error: string | ApiError } | null>(null), [settled, setSettled] = useState(""), [retry, setRetry] = useState(0);
  const requestKey = `${batchId}:${section}:${retry}:${refreshToken}`;
  const loading = requested && settled !== requestKey, error = failure?.key === requestKey ? failure.error : "";
  const callback = useRef(onLoaded);
  useEffect(() => { callback.current = onLoaded; }, [onLoaded]);
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    configurationRequest<OvrSections[K]>(`ovr-batches/${batchId}/sections/${section}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]) })
      .then(value => { if (!controller.signal.aborted) { setData(value); callback.current?.(value); } })
      .catch(e => { if (!controller.signal.aborted) setFailure({key: requestKey, error: e instanceof ApiError ? e : "Could not load this section. Retry to read current records."}); })
      .finally(() => { if (!controller.signal.aborted) setSettled(requestKey); });
    return () => controller.abort();
  }, [requested, batchId, section, requestKey]);
  return <details open={defaultOpen||undefined} id={`payroll-section-${section}`} onToggle={e => { if (e.currentTarget.open) setRequested(true); }}>
    <summary>{title}</summary>
    {loading && <p role="status">Loading {title.toLowerCase()}...</p>}
    <ErrorNotice error={error} />
    {!!error && <button type="button" className="btn btn-outline-secondary" onClick={() => setRetry(n => n + 1)}>Retry {title.toLowerCase()}</button>}
    {data && children(data)}
  </details>;
}
