import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { configurationRequest } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import type { NoticePage, NoticePending, NoticePeriods } from "../server/notifications/service";
export const notificationRefresh = () => window.dispatchEvent(new Event("workflow-updated"));
function useNoticeResource<T>(userId: string, path: string, enabled = true, readEvents = false) {
  const [result, setResult] = useState<{ user: string; path: string; data: T | null; error: string; loading: boolean }>({ user: userId, path, data: null, error: "", loading: true });
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
        const data = await configurationRequest<T>(path, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!controller.signal.aborted) setResult({ user: userId, path, data, error: "", loading: false });
        retry = interval;
      } catch (error) {
        if (!controller.signal.aborted) setResult(old => ({ user: userId, path, data: error instanceof ApiError && [401,403].includes(error.status) ? null : old.user === userId && old.path === path ? old.data : null, error: "Updates unavailable. Refresh updates to retry.", loading: false }));
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
    window.addEventListener("notice-resource:" + path, refresh);
    if (readEvents) window.addEventListener("notification-read", refresh);
    return () => { controller.abort(); if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("workflow-updated", refresh); window.removeEventListener("notice-resource:" + path, refresh); window.removeEventListener("notification-read", refresh); };
  }, [userId, path, enabled, readEvents]);
  const current = enabled && result.user === userId && result.path === path;
  return { refresh: () => window.dispatchEvent(new Event("notice-resource:" + path)), data: current ? result.data : null, error: current ? result.error : "", loading: enabled && (!current || result.loading), update: (change: (data: T) => T) => setResult(old => old.user === userId && old.path === path && old.data ? { ...old, data: change(old.data) } : old) };
}
export const useNotificationCount = (userId: string, enabled = true) => useNoticeResource<{ unread: number }>(userId, "notifications/count", enabled, true);
export const useNotifications = (userId: string, query: string, enabled = true) => useNoticeResource<NoticePage>(userId, `notifications/page?${query}`, enabled);
export type NotificationFeed = ReturnType<typeof useNotifications>;
export function NotificationBell({ feed }: { feed: ReturnType<typeof useNotificationCount> }) {
  const label = feed.error ? "Notifications unavailable" : `Notifications${feed.data ? `: ${feed.data.unread} unread` : ", loading"}`;
  return <a className="notification-bell" href="#notifications" aria-label={label} title={label}>
    <Bell size={20} aria-hidden="true" />
    {feed.error ? <span className="notification-bell-state" aria-hidden="true">!</span> : feed.data && feed.data.unread > 0 ? <span className="notification-unread-badge" aria-hidden="true">{feed.data.unread > 99 ? "99+" : feed.data.unread}</span> : !feed.data ? <span className="notification-bell-state" aria-hidden="true">...</span> : null}
  </a>;
}
const label = (s: string) => ({ qualified: "Validated", applicant: "For validation", exam_passed: "For validation", "not-selected": "Not selected" }[s] ?? s).replaceAll("-", " ").replaceAll("_", " ");
export default function Notifications({ feed, session, compact = false, query, onQuery }: { feed: NotificationFeed; session: Session; compact?: boolean; query: string; onQuery?: (value: string) => void }) {
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState<string[]>([]);
  const pageFocus = useRef<"previous" | "next" | null>(null);
  const previousButton = useRef<HTMLButtonElement>(null), nextButton = useRef<HTMLButtonElement>(null);
  const params = new URLSearchParams(query), mode = params.get("mode") ?? "updates";
  const pending = useNoticeResource<NoticePending>(session.user.id, "notifications/pending");
  const periods = useNoticeResource<NoticePeriods>(session.user.id, `notifications/periods?mode=${mode}`);
  const change = (key: string, value: string) => { params.delete("offset"); if (value) params.set(key,value); else params.delete(key); onQuery?.(params.toString()); };
  async function mark(id: string, read: boolean) {
    setSaveError("");
    setSaving(old => [...old, id]);
    try {
      await configurationRequest(`notifications/${id}/read`, { body: { read }, csrf: session.csrfToken });
      feed.update(data => ({ ...data, items: data.items.map(n => n.id === id ? { ...n, read } : n) }));
      window.dispatchEvent(new Event("notification-read"));
      // Refresh this page only: fill unread-only gaps and settle overlapping polls.
      feed.refresh();
    } catch { setSaveError("Read status could not be confirmed. Refresh updates or retry the same action."); }
    finally { setSaving(old => old.filter(value => value !== id)); }
  }
  const data = feed.data;
  useEffect(() => {
    if (!data || !pageFocus.current) return;
    const requested = pageFocus.current === "previous" ? previousButton.current : nextButton.current;
    const alternate = pageFocus.current === "previous" ? nextButton.current : previousButton.current;
    (requested?.disabled ? alternate : requested)?.focus();
    pageFocus.current = null;
  }, [data]);
  return <section className={`card p-3 mb-3${compact ? " pending-actions-compact" : ""}`} aria-label={compact ? "Pending actions" : "Notifications and pending actions"}>
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2"><h2 className={compact ? "h5 mb-0" : undefined}>{compact ? `Pending actions${pending.data ? ` (${pending.data.pending})` : ""}` : "Notifications & pending actions"}</h2><button className={`btn btn-outline-secondary${compact ? " btn-sm" : ""}`} onClick={() => { setSaveError(""); notificationRefresh(); }}>Refresh updates</button></div>
    {!compact && <>
      <nav className="filter-pills" aria-label="Notification views"><button className={`btn ${mode === "updates" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => change("mode","updates")}>Updates</button><button className={`btn ${mode === "pending" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => change("mode","pending")}>Pending actions{pending.data ? ` (${pending.data.pending})` : ""}</button></nav>
      <div className="notification-filters d-flex flex-wrap gap-3 my-3">
        <label>Type<select className="form-select" value={params.get("type") ?? ""} onChange={e => change("type",e.target.value)}><option value="">All types</option>{["admission","account","export","academic","standing","masterlist","masterlist-amendment","roster","document","override","payroll","payroll-amendment","payment-correction","import"].map(t => <option key={t} value={t}>{label(t)}</option>)}</select></label>
        <label>Academic year<select className="form-select" value={params.get("year") ?? ""} onChange={e => change("year",e.target.value)}><option value="">All years</option>{periods.data?.years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}</select></label>
        <label>Semester<select className="form-select" value={params.get("semester") ?? ""} onChange={e => change("semester",e.target.value)}><option value="">All semesters</option>{periods.data?.semesters.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label>Read status<select className="form-select" value={params.get("unread") ?? "false"} disabled={mode === "pending"} onChange={e => change("unread",e.target.value)}><option value="false">All updates</option><option value="true">Unread only</option></select></label>
        <label>Per page<select className="form-select" value={params.get("limit") ?? "25"} onChange={e => change("limit",e.target.value)}>{[25,50,100].map(limit => <option key={limit}>{limit}</option>)}</select></label>
      </div>
    </>}
    {(pending.error || periods.error) && <p role="alert">{pending.error || periods.error} Pending counts or period filters may be unavailable.</p>}
    {feed.loading && <p role="status">Loading updates and outstanding work...</p>}
    {(feed.error || saveError) && <p role="alert" className="alert alert-warning">{saveError || feed.error}{feed.error && data ? " Showing previously loaded information; it may be out of date." : ""}</p>}
    {data && <>
      {mode === "pending" && <div className="d-flex flex-wrap gap-2 my-2">{pending.data?.groups.map(g => <span className="badge text-bg-light" key={g.type}>{label(g.type)}: {g.count}</span>)}</div>}
      {!data.items.length && !feed.error && <p>{mode === "pending" ? "No pending actions match these filters." : "No updates match these filters."}</p>}
      {(compact ? data.items.slice(0,3) : data.items).map(n => compact ? <article className="pending-action-row" key={n.id}>
        <div className="pending-action-description"><a className="pending-action-title" href={n.href}>{n.title}</a><small>{n.nextAction ? n.nextAction + " / " : n.action ? label(n.action) + " / " : ""}{[n.year,n.semester].filter(Boolean).join(" / ")}</small></div>
        <span className="badge text-bg-light">{label(n.state)}</span>
      </article> : <article className="border-bottom py-3" key={n.id}>
        <div className="d-flex flex-wrap justify-content-between gap-2"><strong>{n.title}</strong><span className="badge text-bg-light">{mode === "updates" && !n.read ? "Unread / " : ""}{label(n.state)}</span></div>
        <p className="mb-1">{n.nextAction ? n.nextAction + " / " : n.action ? label(n.action) + " / " : ""}{[n.year,n.semester].filter(Boolean).join(" / ")}</p>
        <small><time dateTime={n.occurredAt}>{new Date(n.occurredAt).toLocaleString()}</time>{n.revision ? ` / Current version ${n.revision}` : ""}</small>
        <details><summary>Reference</summary>{n.sourceId}</details>
        <div className="d-flex flex-wrap gap-2 mt-2"><a className="btn btn-sm btn-primary" href={n.href}>Open record</a>{mode === "updates" && <button className="btn btn-sm btn-outline-secondary" disabled={saving.includes(n.id)} onClick={() => void mark(n.id,!n.read)}>{n.read ? "Mark unread" : "Mark read"}</button>}</div>
      </article>)}
      {compact ? <a className="mt-2 small" href="#notifications?mode=pending">View all pending actions ({pending.data?.pending ?? "..."})</a> : <div className="d-flex align-items-center gap-2 mt-3"><button ref={previousButton} className="btn btn-outline-secondary" disabled={!data.offset} onClick={() => { pageFocus.current = "previous"; params.set("offset",String(Math.max(0,data.offset-data.limit))); onQuery?.(params.toString()); }}>Previous</button><span>{data.total} records</span><button ref={nextButton} className="btn btn-outline-secondary" disabled={data.offset+data.limit>=data.total} onClick={() => { pageFocus.current = "next"; params.set("offset",String(data.offset+data.limit)); onQuery?.(params.toString()); }}>Next</button></div>}
    </>}
  </section>;
}
