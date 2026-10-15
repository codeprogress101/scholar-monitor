import { useRef, useState, type FormEvent } from "react";
import type { OvrDetail } from "../server/ovr/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import { receivingToday } from "./receiving-selection";

export default function TreasuryReconciliation({detail,session,permissions,onSaved}: {
  detail: OvrDetail; session: Session; permissions: string[]; onSaved: () => void;
}) {
  const [search,setSearch] = useState(""), [selected,setSelected] = useState(""),
    [error,setError] = useState(""), [saving,setSaving] = useState(false), [uncertain,setUncertain] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null), busy = useRef(false);
  const pending = useRef<{path: string; body: object; key: string} | null>(null);
  const evidence = detail.treasuryEvidence, members = detail.effectiveFinalization?.snapshot.entries ?? [];
  const selectedMember = members.find(m => m.scholarshipId === selected);
  const hits = search.trim() ? members.filter(m => {
    const s = m.evidence.current.sources.scholarship;
    return `${s.humanId} ${s.name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  }).slice(0,25) : [];
  const semesterClaim=(id:string)=>detail.semesterPayments?.find(p=>p.scholarshipId===id);
  const status = (id: string) => {
    if(semesterClaim(id)?.paidBatchId)return semesterClaim(id)?.paidBatchId===detail.batch.id ? "Paid" : "Paid this semester in another batch";
    if(semesterClaim(id)?.pendingCorrection)return "Needs review - pending semester payment correction";
    const p = detail.payments.find(p => p.scholarshipId === id);
    return p?.outcome === "paid" ? "Paid" : p?.unpaidReason === "did_not_claim" ? "Unclaimed" : "Unpaid";
  };
  async function send(path: string, body: object) {
    if (busy.current) return;
    if (!pending.current) pending.current = {path,body,key:crypto.randomUUID()};
    const command = pending.current;
    busy.current = true; setSaving(true); setError("");
    try {
      await request(command.path,{body:command.body,key:command.key,csrf:session.csrfToken});
      pending.current = null; setUncertain(false); setSelected(""); setSearch(""); onSaved(); searchRef.current?.focus();
    } catch (e) {
      // Retain the exact selected identity, body and key until the result is known.
      if (e instanceof ApiError && e.status < 500) { pending.current=null;setUncertain(false); } else setUncertain(true); setError(e instanceof Error ? e.message : "Result unknown. Retry the same confirmation.");
    } finally { busy.current = false; setSaving(false); }
  }
  function recordEvidence(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    void send(`ovr-batches/${detail.batch.id}/treasury-evidence`,{
      expectedRevision:evidence?.revision ?? 0, payrollReference:String(f.get("reference")),
      officeReceivedOn:String(f.get("receivedOn")), reason:evidence ? String(f.get("reason")) : "Signed Treasury payroll received by the scholarship office",
    });
  }
  function confirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selectedMember || !evidence) return;
    const f = new FormData(e.currentTarget);
    if(detail.claimDeadline?.expired) {
      void send(`ovr-batches/${detail.batch.id}/historical-receipts/request`,{expectedRevision:detail.batch.revision,scholarshipId:selectedMember.scholarshipId,evidenceRevision:evidence.revision,actualPaidOn:String(f.get("actualDate") ?? "") || null,beforeDeadlineEvidence:String(f.get("beforeDeadlineEvidence")),receiptConfirmed:f.get("confirmed") === "on"});return;
    }
    void send(`ovr-batches/${detail.batch.id}/payments`,{
      expectedRevision:detail.batch.revision, scholarshipId:selectedMember.scholarshipId,
      treasuryEvidenceRevision:evidence.revision, outcome:"paid",amount:"5000.00",
      effectiveOn:String(f.get("actualDate") ?? "") || null, receiptConfirmed:f.get("confirmed") === "on",
      reason:"Verified signed acknowledgment or valid Treasury confirmation",reference:evidence.payrollReference,remarks:"",
    });
  }
  if (!permissions.includes("ovr.process") || !detail.releases) return null;
  return <section aria-label="Treasury reconciliation" className="border-top py-3 my-3">
    <h4>Confirm Treasury payments</h4>
    {evidence && <p>Payroll reference: {evidence.payrollReference}. Received by the office: {evidence.officeReceivedOn}. Evidence revision {evidence.revision}.</p>}
    {(!evidence || permissions.includes("ovr.close")) && <details open={!evidence}><summary>{evidence ? "Correct Treasury evidence — Coordinator" : "Record Treasury payroll evidence"}</summary>
      <form onSubmit={recordEvidence}><fieldset disabled={saving || uncertain}>
        <label className="d-block">Treasury payroll reference<input className="form-control" name="reference" required minLength={3} maxLength={300} defaultValue={evidence?.payrollReference}/></label>
        <label className="d-block">Date received by scholarship office<input className="form-control" type="date" name="receivedOn" required max={receivingToday()} defaultValue={evidence?.officeReceivedOn}/></label>
        {evidence && <label className="d-block">Correction reason<input name="reason" required minLength={5} maxLength={500}/></label>}
        <button className="btn btn-primary mt-2">Save batch evidence</button>
      </fieldset></form></details>}
    <p>Batch totals: Paid: {detail.reconciliation.paid ?? 0}. Unpaid: {detail.reconciliation.unpaid ?? 0}. Unclaimed: {detail.reconciliation.unclaimed ?? 0}.</p>
    <label className="d-block">Search this payroll by Scholar ID or name<input id="treasury-search" ref={searchRef} className="form-control" value={search} disabled={saving || uncertain} onChange={e => {setSearch(e.target.value);setSelected("");}}/></label>
    <ul>{hits.map(m => {const s=m.evidence.current.sources.scholarship;return <li key={m.scholarshipId}><button type="button" className="btn btn-link" disabled={saving || uncertain} onClick={() => setSelected(m.scholarshipId)}>{s.humanId} — {s.name}</button> — {status(m.scholarshipId)}</li>;})}</ul>
    {search && !hits.length && <p>No matching frozen member.</p>}
    {hits.length === 25 && <p>Showing up to 25 matches. Refine your search.</p>}
    {selectedMember && <form key={selected} onSubmit={confirm}><fieldset disabled={saving || uncertain}>
      <p><strong>{selectedMember.evidence.current.sources.scholarship.humanId} — {selectedMember.evidence.current.sources.scholarship.name}</strong></p>
      <p>{detail.cycle.yearCode} / {detail.cycle.semesterCode} / {detail.cycle.name} — ₱5,000 — {status(selected)}</p>
      {semesterClaim(selected)?.paidBatchId && semesterClaim(selected)?.paidBatchId!==detail.batch.id ? <p>This semester stipend is already paid. <a href={`#payouts?${new URLSearchParams({cycle:semesterClaim(selected)!.paidCycleId!,batch:semesterClaim(selected)!.paidBatchId!})}`}>View payment</a></p> : detail.payments.some(p => p.scholarshipId === selected) ? <p>An outcome already exists. Use the controlled correction workflow.</p> : detail.claimDeadline?.expired ?
        <><p>Claim period ended. Submit evidence of actual receipt before expiry for Coordinator approval. This cannot authorize late collection.</p>
          <label className="d-block">Actual payment date, if documented<input type="date" name="actualDate" max={detail.claimDeadline.endsOn ?? undefined}/></label>
          <label className="d-block">Documentary evidence establishing receipt before expiry<textarea name="beforeDeadlineEvidence" required minLength={20} maxLength={1000}/></label>
          <label className="d-block"><input type="checkbox" name="confirmed" required/> I verified the Treasury record of receipt before the deadline.</label>
          <button disabled={!evidence} className="btn btn-primary">Submit historical receipt for review</button></> : <>
        <label className="d-block">Actual payment date (only if documented; otherwise leave blank)<input type="date" name="actualDate" max={evidence?.officeReceivedOn ?? receivingToday()}/></label>
        <label className="d-block my-2"><input type="checkbox" name="confirmed" required/> I verified this scholar's signed acknowledgment or valid Treasury confirmation of actual receipt.</label>
        <button className="btn btn-success" disabled={!evidence || detail.batch.state !== "processed"}>Mark as Paid</button>
      </>}
    </fieldset></form>}
    {detail.historicalReceipts?.map(receipt=><details key={receipt.id}><summary>Historical receipt: {receipt.state} - {members.find(m=>m.scholarshipId===receipt.scholarshipId)?.evidence.current.sources.scholarship.name}</summary><p>{receipt.beforeDeadlineEvidence}</p><p>Actual receipt date: {receipt.actualPaidOn ?? "Unknown"}</p>
      {receipt.state === "pending" && permissions.includes("payments.corrections.approve") && <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send(`ovr-batches/${detail.batch.id}/historical-receipts/${f.get("decision")}`,{expectedRevision:detail.batch.revision,receiptId:receipt.id,reason:String(f.get("reason")),verifiedBeforeDeadline:f.get("verified") === "on" ? true : undefined});}}><fieldset disabled={saving || uncertain}>
        <label>Decision<select name="decision"><option value="approve">Approve documented historical receipt</option><option value="reject">Reject request</option></select></label>
        <label className="d-block">Review reason<input name="reason" required minLength={5} maxLength={500}/></label>
        <label className="d-block"><input type="checkbox" name="verified"/> I verified documentary evidence of receipt before expiry. This does not authorize late collection.</label><button className="btn btn-primary">Record Coordinator decision</button>
      </fieldset></form>}
    </details>)}
    {error && <p role="alert">{error}</p>}
    {uncertain && <button type="button" disabled={saving} onClick={() => {if(pending.current)void send(pending.current.path,pending.current.body);}}>Retry the same command</button>}
  </section>;
}
