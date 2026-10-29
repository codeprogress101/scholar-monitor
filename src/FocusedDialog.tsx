import {OperationProgress,type OperationFeedback} from "./ActionProgress";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native modal: focus is contained by the browser and returned to its trigger. */
export default function FocusedDialog({ title, busy = false, onClose, children, className = "", progress }: {
  title: string; busy?: boolean; onClose: () => void; children?: ReactNode; className?: string; progress?:OperationFeedback;
}) {
  const dialog = useRef<HTMLDialogElement>(null), label = useId();
  const progressReturn=useRef<HTMLElement|null>(null);
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
  const progressing=Boolean(progress&&(progress.pending||progress.uncertain));
  useEffect(()=>{
    const element=dialog.current;if(!element)return;
    if(progressing&&document.activeElement instanceof HTMLElement&&!document.activeElement.closest(".operation-progress"))progressReturn.current=document.activeElement;
    const frame=requestAnimationFrame(()=>{
      if(progressing)element.querySelector<HTMLElement>(".operation-progress-status")?.focus();
      else if(progressReturn.current){
        const target=progressReturn.current;progressReturn.current=null;
        if(target.isConnected&&!target.matches(":disabled"))target.focus();
        else element.querySelector<HTMLElement>("button:not(:disabled),input:not(:disabled),[tabindex='-1']")?.focus();
      }
    });return()=>cancelAnimationFrame(frame);
  },[progressing,progress?.pending]);
  return <dialog ref={dialog} className={`focused-dialog ${className} ${progressing?"operation-progress-dialog":""}`} aria-labelledby={label} data-pending-location={busy ? window.location.hash : undefined}
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
    <header><h2 id={label}>{title}</h2><button type="button" hidden={progressing} className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>Close</button></header>
    {progressing&&progress&&<OperationProgress {...progress}/>}
    {progress?<div hidden={progressing}>{children}</div>:children}
  </dialog>;
}
