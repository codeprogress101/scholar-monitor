import type {OperationFeedback} from "./ActionProgress";
import { useEffect, useRef, useState } from "react";
import MasterlistConflictTable from "./MasterlistConflictTable";
import MasterlistConflictRemoval from "./MasterlistConflictRemoval";
import type { Session } from "./auth-api";
import type { ConflictRemovalResult } from "../server/masterlists/conflict-removal-model";
import FocusedDialog from "./FocusedDialog";
import { configurationRequest as request } from "./configuration-api";
import type { ActivationConflictPage } from "../server/masterlists/selection-model";

export default function MasterlistConflicts({ id, count, disabled, session, onPending, onRemoved, onReviewRemoval }: { id: string; count: number; disabled: boolean; session: Session; onPending: (value: boolean) => void; onRemoved: (value: ConflictRemovalResult) => void; onReviewRemoval?: (member: ActivationConflictPage["items"][number], trigger: HTMLButtonElement) => void }) {
  const [open, setOpen] = useState(false), [offset, setOffset] = useState(0), [page, setPage] = useState<ActivationConflictPage | null>(null), [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [progress,setProgress]=useState<OperationFeedback|null>(null);
  function pendingChanged(value: boolean) { setPending(value); onPending(value); }
  const removalFrame = useRef<number | null>(null), reviewTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => () => {
    if (removalFrame.current !== null) cancelAnimationFrame(removalFrame.current);
  }, []);
  function reviewRemoval(member: ActivationConflictPage["items"][number]) {
    const trigger = reviewTrigger.current;
    setOpen(false);
    // Open after the closing dialog restores focus; cancel if this list unmounts.
    removalFrame.current = requestAnimationFrame(() => {
      removalFrame.current = null;
      if (trigger?.isConnected) onReviewRemoval?.(member, trigger);
    });
  }
  useEffect(() => {
    if (!open) return;
    let active = true; const controller = new AbortController();
    request<ActivationConflictPage>(`masterlists/${id}/activation-conflicts?offset=${offset}&limit=25`, { signal: controller.signal })
      .then(value => { if (active) setPage(value); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Unable to load activation conflicts."); });
    return () => { active = false; controller.abort(); };
  }, [id, offset, open]);
  function changePage(value: number) { setError(""); setOffset(value); }

  return <>
    <div className="ml-conflict-summary"><span>{count ? `${count.toLocaleString()} activation or standing ${count === 1 ? "blocker" : "blockers"}. Existing membership is unchanged.` : "Review existing activation references before the next step."}</span><button ref={reviewTrigger} type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={() => { if (removalFrame.current !== null) return; setPage(null); changePage(0); setOpen(true); }}>Review Conflicts{count ? ` (${count.toLocaleString()})` : ""}</button></div>
    {open && <FocusedDialog progress={progress??undefined} title="Review Conflicts" busy={pending} onClose={() => setOpen(false)} className="ml-selection-dialog">
      {error ? <p role="alert" className="alert alert-danger">{error}</p> : !page ? <p role="status">Loading activation conflicts...</p> : <>
        <p><strong>{page.total.toLocaleString()} conflicts · {page.yearCode}</strong></p>
        <p>Existing official activations stay unchanged. Removing a member from this unpublished draft does not delete their scholar or annual scholarship record.</p>
        {onReviewRemoval ? <MasterlistConflictRemoval onProgress={setProgress} id={id} page={page} session={session} onPending={pendingChanged} onRemoved={result => { setOpen(false); onRemoved(result); }} table={{ page, offset, disabled, onReviewRemoval: reviewRemoval, onNavigateOfficial: () => setOpen(false), changePage }} /> : <><p>Membership changes require an editable, unlocked Draft. A Coordinator must use Return to Draft for a list in review or approval. Published records retain their amendment rules.</p><MasterlistConflictTable page={page} offset={offset} disabled={disabled} onNavigateOfficial={() => setOpen(false)} changePage={changePage} /></>}

      </>}
    </FocusedDialog>}
  </>;
}
