import {Search} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { OvrCandidatePage, OvrEntryPage, OvrHistoryRow } from "../server/ovr/detail-model";
import type { OvrService } from "../server/ovr/service";
import type { PayoutCycle } from "../server/payouts/model";
import { configurationRequest } from "./configuration-api";
import { ApiError } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import ScholarIssueAction from "./ScholarIssueAction";
type PaymentPage = Awaited<ReturnType<OvrService["paymentPage"]>>;
type Page = OvrCandidatePage | OvrEntryPage | PaymentPage | { items: OvrHistoryRow[]; total: number; offset: number; limit: number };
export default function PayrollPagedDetails({ batchId, cycle, mode,permissions }: { batchId: string; cycle: PayoutCycle; mode: "candidates" | "roster" | "payment-history" | "history";permissions:string[] }) {
  const [response, setResponse] = useState<{key: string; data: Page} | null>(null), [query, setQuery] = useState(""), [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0), [failure, setFailure] = useState<{key: string; error: string | ApiError} | null>(null), [settled, setSettled] = useState(""), [retry, setRetry] = useState(0);
  const limit = 25;
  const requestKey = `${batchId}:${mode}:${search}:${offset}:${retry}`;
  const data = response?.key === requestKey ? response.data : null, error = failure?.key === requestKey ? failure.error : "", loading = settled !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    configurationRequest<Page>(`ovr-batches/${batchId}/${mode}?offset=${offset}&limit=${limit}${search ? `&q=${encodeURIComponent(search)}` : ""}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]) })
      .then(value => { if (!controller.signal.aborted) setResponse({key: requestKey, data: value}); })
      .catch(e => { if (!controller.signal.aborted) setFailure({key: requestKey, error: e instanceof ApiError ? e : "Could not load this page. Retry to read current records."}); })
      .finally(() => { if (!controller.signal.aborted) setSettled(requestKey); });
    return () => controller.abort();
  }, [batchId, mode, search, offset, requestKey]);
  function find(e: FormEvent) { e.preventDefault(); setOffset(0); setSearch(query.trim()); }
  return <section aria-label={`Payroll ${mode}`} className="my-3">
    {(mode === "candidates" || mode === "roster") && <form onSubmit={find} className={mode === "roster" ? "u11-roster-search" : "d-flex gap-2"}><label>Find scholar<input className="form-control" value={query} maxLength={160} placeholder={mode === "roster" ? "Search scholar name or ID" : undefined} onChange={e => setQuery(e.target.value)} /></label><button className="btn btn-outline-secondary" disabled={loading} title={mode === "roster" ? "Search payroll scholars" : undefined} aria-label={mode === "roster" ? "Search payroll scholars" : undefined}>{mode === "roster" ? <Search size={18} aria-hidden="true"/> : "Search"}</button></form>}
    {loading && <p role="status">Loading {mode.replaceAll("-", " ")}...</p>}
    <ErrorNotice error={error} />{!!error && <button type="button" className="btn btn-outline-secondary" onClick={() => setRetry(n => n + 1)}>Retry page</button>}
    {data && <>
      <p role="status">{data.total ? `${offset + 1}–${Math.min(offset + limit, data.total)} of ${data.total}` : "No records"}{mode === "candidates" ? " annual records in scope. Open Complete batch review for overall counts, deferrals and submission." : " records."}</p>
      {mode === "candidates" && <div className="table-responsive"><table className="table"><thead><tr><th>Scholar</th><th>School / year</th><th>Current assessment</th></tr></thead><tbody>{(data as OvrCandidatePage).items.map(item => <tr key={item.scholarshipId}>
        <td><strong>{item.evidence.current.sources.scholarship.name}</strong><small className="d-block text-muted">{item.evidence.current.sources.scholarship.humanId}</small></td>
        <td>{item.row?.school ?? "Needs academic details"}<small className="d-block text-muted">{item.row ? `Year ${item.row.yearLevel} · ${item.row.course}` : ""}</small></td>
        <td>{item.deferred?.current ? "Deferred" : item.eligible ? "Included in draft" : item.pending ? "Needs review" : "Other / blocked"}
          {(item.issues.length > 0 || item.deferred?.current) && <details><summary>View reasons</summary>{item.deferred?.current && <p>{item.deferred.reason}</p>}<ul>{item.issues.map((issue, i) => <li key={i}>{issue.message}<ScholarIssueAction permissions={permissions} code={issue.code} scholarId={item.evidence.current.sources.scholarship.scholarId} yearId={cycle.academicYearId} semesterId={cycle.semesterId} payoutCycleId={cycle.id} /></li>)}</ul></details>}
        </td></tr>)}</tbody></table>{!(data as OvrCandidatePage).items.length && <p>No included candidate rows on this page. Complete batch review shows all current candidate outcomes.</p>}</div>}
      {mode === "roster" && <><p className="small">Checked frozen membership; payment outcomes are separate.</p><div className="table-responsive" role="region" aria-label="Saved payroll roster table" tabIndex={0}><table className="table u1-saved-roster"><thead><tr><th scope="col">Scholar</th><th scope="col">Permanent Scholar ID</th><th scope="col">Saved assessment</th></tr></thead><tbody>{(data as OvrEntryPage).entries.map(e=><tr key={e.scholarshipId}><td>{e.evidence.current.sources.scholarship.name}</td><td>{e.evidence.current.sources.scholarship.humanId}</td><td>{e.evidence.effective.label}{e.evidence.reprocessing&&<small className="d-block">Reprocessing from {e.evidence.reprocessing.sourceCode}</small>}</td></tr>)}</tbody></table></div></>}
      {mode === "payment-history" && <ul>{(data as PaymentPage).items.map(p => { const identity = (data as PaymentPage).identities.find(i => i.scholarshipId === p.scholarshipId); return <li key={p.id}><strong>{identity?.humanId ?? p.scholarshipId} — {identity?.name ?? "Scholar"}</strong>: {p.outcome === "paid" ? "Paid" : "Not paid"} {p.amount}, {p.effectiveOn ?? "Date not recorded"}. {p.unpaidReason?.replaceAll("_", " ")} · {p.reference}. {p.remarks}<small className="d-block text-muted">Recorded by {p.actorName} · {p.recordedAt}</small></li>; })}</ul>}
      {mode === "history" && <>{(data as {items:OvrHistoryRow[]}).items.map(h => <p key={h.revision}>Revision {h.revision}: {h.action}, {h.actorName}, {new Date(h.recordedAt).toLocaleString()}. {h.reason} ({h.reference}){h.entry && ` — ${h.entry.humanId}: ${h.entry.name}`}{h.validation && ` — Recorded validation: ${h.validation.valid ? "passed" : "issues found"}`}</p>)}</>}
      {data.total > limit && <nav className="d-flex gap-3" aria-label={`${mode} pages`}><button type="button" className="btn btn-outline-secondary" disabled={loading || offset === 0} onClick={() => setOffset(n => Math.max(0, n - limit))}>Previous</button><button type="button" className="btn btn-outline-secondary" disabled={loading || offset + limit >= data.total} onClick={() => setOffset(n => n + limit)}>Next</button></nav>}
    </>}
  </section>;
}

