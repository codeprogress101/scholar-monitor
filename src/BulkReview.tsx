import type { BulkJob } from "./bulk-commands";
import { useEffect, useId, useRef } from "react";

export default function BulkReview({ jobs, busy, title, context, onRun, onClose, modal = false }: {
  jobs: BulkJob[]; busy: boolean; title: string; context?: string; onRun: () => void; onClose: () => void; modal?: boolean;
}) {
  const saved = jobs.filter(job => job.saved).length;
  const panel = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!modal) {
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: "start" });
      return;
    }
    const trigger = document.activeElement;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected) {
          const target = trigger.matches(":disabled") ? trigger.closest<HTMLElement>(".candidate-selection-bar") : trigger;
          target?.focus({ preventScroll: true });
        }
      });
    };
  }, [modal]);
  const content = <section ref={panel} tabIndex={-1} className={modal ? "bulk-review-content" : "border rounded p-3 my-3"} aria-label="Review selected records">
    <h3 id={titleId} className="h5">{title}</h3>
    {context && <p><strong>{context}</strong></p>}
    <p>Review these {jobs.length} records before confirming. Each record is saved separately.</p>
    <ul className="bulk-review-records">{jobs.map(job => <li key={job.id}>{job.label} — {job.saved ? "Saved" : job.error ? "Needs review" : "Pending"}{job.error && <p role="alert">{job.error}</p>}</li>)}</ul>
    <div className="bulk-review-actions">
    <p role="status">{saved} of {jobs.length} saved{busy ? " · Saving…" : ""}</p>
    {saved < jobs.length && <button className="btn configuration-primary me-2" disabled={busy} onClick={onRun}>{jobs.some(job => job.error) ? "Retry remaining records" : "Confirm selected records"}</button>}
    <button className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>{saved || jobs.some(job => job.error) ? "Close and refresh" : "Cancel"}</button>
    {jobs.some(job => job.error) && <p className="small mt-2">Stopped at the first problem. Saved records remain saved. If a record changed, close and refresh before selecting it again.</p>}
    </div>
  </section>;
  return modal ? <dialog ref={dialog} className="bulk-review-dialog" aria-labelledby={titleId}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0], last = buttons.at(-1);
      if (!first) { event.preventDefault(); panel.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>{content}</dialog> : content;
}
