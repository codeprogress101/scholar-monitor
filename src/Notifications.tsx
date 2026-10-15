import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { configurationRequest } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import type { NoticeList } from "../server/notifications/service";
export const notificationRefresh = () => window.dispatchEvent(new Event("workflow-updated"));
export function useNotifications(userId: string, query: string, enabled = true) {
  const [result, setResult] = useState<{ user: string; query: string; data: NoticeList | null; error: string; loading: boolean }>({ user: userId, query, data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined, running = false, queued = false, retry = 45000;
    const interval = Math.max(30000, Math.min(60000, Number(import.meta.env.VITE_NOTIFICATION_POLL_MS) || 45000));
    async function refresh() {
      if (controller.signal.aborted || !enabled || document.hidden) return;
      if (running) { queued = true; return; }
      if (timer) clearTimeout(timer);
      running = true;
      try {
        const data = await configurationRequest<NoticeList>(`notifications?${query}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!controller.signal.aborted) setResult({ user: userId, query, data, error: "", loading: false });
        retry = interval;
      } catch (error) {
        if (!controller.signal.aborted) setResult(old => ({ user: userId, query, data: error instanceof ApiError && [401,403].includes(error.status) ? null : old.user === userId && old.query === query ? old.data : null, error: "Updates unavailable. Retry to check outstanding work.", loading: false }));
        retry = Math.min(retry * 2, 300000);
      } finally {
        running = false;
        if (queued && !controller.signal.aborted) { queued = false; void refresh(); }
        else if (!controller.signal.aborted && enabled && !document.hidden) timer = setTimeout(() => void refresh(), retry);
      }
    }
    function visible() { if (document.hidden) { if (timer) clearTimeout(timer); } else void refresh(); }
    void refresh();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("workflow-updated", refresh);
    return () => { controller.abort(); if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("workflow-updated", refresh); };
  }, [userId, query, enabled]);
  return enabled && result.user === userId && result.query === query ? result : { data: null, error: "", loading: true };
}
export type NotificationFeed = ReturnType<typeof useNotifications>;
const label = (s: string) => ({ qualified: "Validated", applicant: "For validation", exam_passed: "For validation", "not-selected": "Not selected" }[s] ?? s).replaceAll("-", " ").replaceAll("_", " ");
export function NotificationBell({ feed }: { feed: NotificationFeed }) {
  return <a className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" href="#notifications" aria-label={feed.error ? "Notifications unavailable" : `Notifications${feed.data ? `: ${feed.data.unread} unread` : ", loading"}`}><Bell size={18} /><span>{feed.error ? "!" : feed.data?.unread ?? "..."}</span><span className="d-none d-lg-inline">Notifications</span></a>;
}
export default function Notifications({ feed, session, compact = false, query, onQuery }: { feed: NotificationFeed; session: Session; compact?: boolean; query: string; onQuery?: (value: string) => void }) {
  const [saveError, setSaveError] = useState("");
  const params = new URLSearchParams(query), mode = params.get("mode") ?? "updates";
  const change = (key: string, value: string) => { params.delete("offset"); if (value) params.set(key,value); else params.delete(key); onQuery?.(params.toString()); };
  async function mark(id: string, read: boolean) {
    setSaveError("");
    try { await configurationRequest(`notifications/${id}/read`, { body: { read }, csrf: session.csrfToken }); notificationRefresh(); }
    catch { setSaveError("Read status was not saved. Please retry."); }
  }
  const data = feed.data;
  return <section className={`card p-3 mb-3${compact ? " pending-actions-compact" : ""}`} aria-label={compact ? "Pending actions" : "Notifications and pending actions"}>
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2"><h2 className={compact ? "h5 mb-0" : undefined}>{compact ? `Pending actions${data ? ` (${data.pending})` : ""}` : "Notifications & pending actions"}</h2><button className={`btn btn-outline-secondary${compact ? " btn-sm" : ""}`} onClick={notificationRefresh}>Refresh updates</button></div>
    {!compact && <>
      <nav className="filter-pills" aria-label="Notification views"><button className={`btn ${mode === "updates" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => change("mode","updates")}>Updates{data ? ` (${data.unread} unread)` : ""}</button><button className={`btn ${mode === "pending" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => change("mode","pending")}>Pending actions{data ? ` (${data.pending})` : ""}</button></nav>
      <div className="notification-filters d-flex flex-wrap gap-3 my-3">
        <label>Type<select className="form-select" value={params.get("type") ?? ""} onChange={e => change("type",e.target.value)}><option value="">All types</option>{["admission","account","export","academic","standing","masterlist","masterlist-amendment","roster","document","override","payroll","payroll-amendment","payment-correction","import"].map(t => <option key={t} value={t}>{label(t)}</option>)}</select></label>
        <label>Academic year<select className="form-select" value={params.get("year") ?? ""} onChange={e => change("year",e.target.value)}><option value="">All years</option>{data?.years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}</select></label>
        <label>Semester<select className="form-select" value={params.get("semester") ?? ""} onChange={e => change("semester",e.target.value)}><option value="">All semesters</option>{data?.semesters.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      </div>
    </>}
    {feed.loading && <p role="status">Loading updates and outstanding work...</p>}
    {(feed.error || saveError) && <p role="alert" className="alert alert-warning">{saveError || feed.error}{feed.error && data ? " Showing previously loaded information; it may be out of date." : ""}</p>}
    {data && <>
      {mode === "pending" && <div className="d-flex flex-wrap gap-2 my-2">{data.groups.map(g => <span className="badge text-bg-light" key={g.type}>{label(g.type)}: {g.count}</span>)}</div>}
      {!data.items.length && !feed.error && <p>{mode === "pending" ? "No pending actions match these filters." : "No updates match these filters."}</p>}
      {(compact ? data.items.slice(0,3) : data.items).map(n => compact ? <article className="pending-action-row" key={n.id}>
        <div className="pending-action-description"><a className="pending-action-title" href={n.href}>{n.title}</a><small>{n.action ? label(n.action) + " / " : ""}{[n.year,n.semester].filter(Boolean).join(" / ")}</small></div>
        <span className="badge text-bg-light">{label(n.state)}</span>
      </article> : <article className="border-bottom py-3" key={n.id}>
        <div className="d-flex flex-wrap justify-content-between gap-2"><strong>{n.title}</strong><span className="badge text-bg-light">{mode === "updates" && !n.read ? "Unread / " : ""}{label(n.state)}</span></div>
        <p className="mb-1">{n.action ? label(n.action) + " / " : ""}{[n.year,n.semester].filter(Boolean).join(" / ")}</p>
        <small><time dateTime={n.occurredAt}>{new Date(n.occurredAt).toLocaleString()}</time>{n.revision ? ` / Current version ${n.revision}` : ""}</small>
        <details><summary>Reference</summary>{n.sourceId}</details>
        <div className="d-flex flex-wrap gap-2 mt-2"><a className="btn btn-sm btn-primary" href={n.href}>Open record</a>{mode === "updates" && <button className="btn btn-sm btn-outline-secondary" onClick={() => void mark(n.id,!n.read)}>{n.read ? "Mark unread" : "Mark read"}</button>}</div>
      </article>)}
      {compact ? <a className="mt-2 small" href="#notifications?mode=pending">View all pending actions ({data.pending})</a> : <div className="d-flex align-items-center gap-2 mt-3"><button className="btn btn-outline-secondary" disabled={!data.offset} onClick={() => { params.set("offset",String(Math.max(0,data.offset-25))); onQuery?.(params.toString()); }}>Previous</button><span>{data.total} records</span><button className="btn btn-outline-secondary" disabled={data.offset+25>=data.total} onClick={() => { params.set("offset",String(data.offset+25)); onQuery?.(params.toString()); }}>Next</button></div>}
    </>}
  </section>;
}
