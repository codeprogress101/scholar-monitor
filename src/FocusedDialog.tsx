import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native modal: focus is contained by the browser and returned to its trigger. */
export default function FocusedDialog({ title, busy = false, onClose, children }: {
  title: string; busy?: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null), label = useId();
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  useEffect(() => {
    if (!busy) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const hash=window.location.hash;
    const retain=(event: Event)=>{event.stopImmediatePropagation();window.history.replaceState(null,"",hash);};
    window.addEventListener("popstate",retain,true);
    window.addEventListener("hashchange",retain,true);
    window.addEventListener("beforeunload", prevent);
    return () => {window.removeEventListener("beforeunload", prevent);window.removeEventListener("popstate",retain,true);window.removeEventListener("hashchange",retain,true);};
  }, [busy]);
  return <dialog ref={dialog} className="focused-dialog" aria-labelledby={label} data-pending-location={busy ? window.location.hash : undefined}
    onKeyDownCapture={event => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], summary, [tabindex]")]
        .filter(element => !element.matches(":disabled") && element.tabIndex >= 0 && element.checkVisibility());
      if (!controls.length) return;
      const current = controls.indexOf(document.activeElement as HTMLElement);
      const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus();
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header><h2 id={label}>{title}</h2><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>Close</button></header>
    {children}
  </dialog>;
}
