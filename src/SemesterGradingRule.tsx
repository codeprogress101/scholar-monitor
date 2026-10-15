import { useState, type FormEvent } from "react";
import { nativeGradingRule, type GradingRule } from "../server/continuing/compliance-engine";
import type { GradingReplacementContext, GradingRecoveryContext } from "../server/continuing/grading-policy";

export default function SemesterGradingRule({ school, busy, onSave, replacement, recovery }: { school: string; busy: boolean; onSave: (body: object) => Promise<void>; replacement?: GradingReplacementContext; recovery?: GradingRecoveryContext }) {
  const [kind, setKind] = useState(replacement?.policy.kind ?? "native"), [rule, setRule] = useState<GradingRule>({ ...(replacement?.policy.rule ?? nativeGradingRule) });
  const [issuer, setIssuer] = useState(replacement?.policy.issuer ?? ""), [authority, setAuthority] = useState(replacement?.policy.authorityReference ?? ""), [source, setSource] = useState(replacement?.policy.sourceReference ?? ""), [reviewed, setReviewed] = useState(false), [reason, setReason] = useState("");
  const [authorityUntil, setAuthorityUntil] = useState(recovery ? replacement?.policy.authorityUntil ?? "" : "");
  async function save(e: FormEvent) {
    e.preventDefault();
    await onSave({ kind, rule: kind === "native" ? null : rule, issuer, authorityReference: authority, sourceReference: source, reviewed,
      ...(recovery ? { reason, impactHash: recovery.impactHash, academicOnly: recovery.ended, authorityUntil: authorityUntil || null } : replacement ? { reason, expectedPolicyId: replacement.policy.id, expectedRevision: replacement.policy.revision, impactHash: replacement.impactHash } : {}) });
  }
  return <details className="border rounded p-3 my-2" open={replacement ? true : undefined}><summary>Coordinator: {recovery ? "recover grading rule" : replacement ? "replace grading rule" : "record grading rule once"} for {school}</summary>
    <p>This rule is reused for scholars from this school in this roster and receiving semester. Record only an approved scale; unknown equivalencies remain for review.</p>
    {replacement && <><p>{replacement.recordCount} semester record(s) checked; {replacement.reviewedCount} scholar(s) have reviews using this school's policy. Those assessments will require re-review. Previous rules and reviews remain in history.</p>{replacement.blocker && <p className="alert alert-warning">{replacement.blocker}</p>}</>}
    <form onSubmit={save} aria-label="School grading rule"><fieldset disabled={busy || Boolean(replacement?.blocker)}>
      <label className="form-label d-block">Grading scale<select className="form-select" value={kind} onChange={(e) => setKind(e.target.value as "native" | "equivalent")}><option value="native">1.00 best; average at most 2.50</option><option value="equivalent">Approved school equivalent</option></select></label>
      {kind === "native" ? <p>Range 1–5, lower is better, inclusive threshold 2.50. Up to four decimal places; no rounding.</p> : <div className="row g-2">
        <label className="col-md-6">Scale name<input required maxLength={150} className="form-control" value={rule.label} onChange={(e) => setRule({ ...rule, label: e.target.value })} /></label>
        <label className="col-md-6">Better grades are<select className="form-select" value={rule.direction} onChange={(e) => setRule({ ...rule, direction: e.target.value as GradingRule["direction"] })}><option value="lower">Lower numbers</option><option value="higher">Higher numbers</option></select></label>
        {([['minimum', 'Minimum value'], ['maximum', 'Maximum value'], ['threshold', 'Inclusive passing threshold']] as const).map(([key, label]) => <label className="col-md-4" key={key}>{label}<input required inputMode="decimal" className="form-control" value={rule[key]} onChange={(e) => setRule({ ...rule, [key]: e.target.value })} /></label>)}
        <label className="col-md-4">Allowed decimal places<select className="form-select" value={rule.precision} onChange={(e) => setRule({ ...rule, precision: Number(e.target.value) })}>{[0, 1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
      </div>}
      <label className="form-label d-block">Issuing authority<input required minLength={3} maxLength={200} className="form-control" value={issuer} onChange={(e) => setIssuer(e.target.value)} /></label>
      <label className="form-label d-block">Authority reference<input required minLength={3} maxLength={300} className="form-control" value={authority} onChange={(e) => setAuthority(e.target.value)} /></label>
      <label className="form-label d-block">Approved rule / equivalency source<input required minLength={3} maxLength={500} className="form-control" value={source} onChange={(e) => setSource(e.target.value)} /></label>
      {recovery && <label className="form-label d-block">Authority valid through (leave blank only if no expiry)<input type="date" className="form-control" value={authorityUntil} onChange={(e) => setAuthorityUntil(e.target.value)} /></label>}
      {replacement && <label className="form-label d-block">{recovery ? "Reason for policy recovery" : "Reason for replacing this rule"}<input required minLength={5} maxLength={500} className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
      <label className="d-block my-2"><input type="checkbox" required checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> {recovery ? `I reviewed all affected policies and records. The stated authority currently authorizes this rule for the covered semester.${recovery.ended ? " This does not authorize late payment." : ""}` : replacement ? "I reviewed the affected records and authorize this replacement using the approved source and authority." : "I reviewed the authority and school grading rule for this semester."}</label>
      <button className="btn configuration-primary">{recovery ? "Save recovered rule" : replacement ? "Save replacement rule" : "Record grading rule"}</button>
    </fieldset></form>
  </details>;
}
