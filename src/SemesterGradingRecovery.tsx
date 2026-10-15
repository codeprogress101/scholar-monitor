import { useRef, useState } from "react";
import type { GradingRecoveryContext } from "../server/continuing/grading-policy";
import { configurationRequest as request } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import SemesterGradingRule from "./SemesterGradingRule";

export default function SemesterGradingRecovery({ path, school, session, onSaved, onBusy }: { path: string; school: string; session: Session; onSaved: () => void; onBusy: (busy: boolean) => void }) {
  const [context, setContext] = useState<GradingRecoveryContext | null>(null), [selected, setSelected] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>("");
  const saving = useRef(false), pending = useRef<{ signature: string; key: string } | null>(null);
  async function load() {
    if (saving.current) return;
    saving.current = true; setBusy(true); onBusy(true); setError(""); setContext(null); setSelected("");
    try { setContext(await request<GradingRecoveryContext>(path + "/grading-rule/recovery-context")); }
    catch (e) { setError(e instanceof ApiError ? e : "Could not load recovery context."); }
    finally { saving.current = false; setBusy(false); onBusy(false); }
  }
  async function save(body: object) {
    if (saving.current) return;
    saving.current = true; setBusy(true); onBusy(true); setError("");
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      await request(path + "/grading-rule/recover", { body, csrf: session.csrfToken, key: pending.current.key });
      pending.current = null; setContext(null); onSaved();
    } catch (e) { setError(e instanceof ApiError ? e : "Could not confirm recovery. Retry safely or reload affected records."); }
    finally { saving.current = false; setBusy(false); onBusy(false); }
  }
  const seed = context?.policies.find((p) => p.id === selected);
  return <details className="my-2"><summary>Coordinator: recover unavailable grading policy</summary>
    <p>Review the expired or conflicting rules and record the currently authorized rule. All previous versions remain in history; affected assessments require re-review.</p>
    <button className="btn btn-outline-secondary" disabled={busy} onClick={() => void load()}>Review policy recovery</button>
    <ErrorNotice error={error} />
    {context && <>
      <ul>{context.policies.map((p, i) => <li key={p.id}>Rule {i + 1}: {p.rule.label}, threshold {p.rule.threshold}. Coverage: {p.effectiveFrom} to {p.effectiveUntil ?? "no expiry"}. Authority: {p.issuer}, {p.authorityReference}; valid through {p.authorityUntil ?? "no expiry"}. Source: {p.sourceReference}.</li>)}</ul>
      {context.blocker && <p className="alert alert-warning">{context.blocker}</p>}
      <label className="form-label d-block">Rule to use as a starting point<select className="form-select" disabled={busy || Boolean(context.blocker)} value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose after reviewing the history</option>{context.policies.map((p, i) => <option key={p.id} value={p.id}>Rule {i + 1}: {p.rule.label}, threshold {p.rule.threshold}</option>)}</select></label>
      {seed && <SemesterGradingRule key={`${context.impactHash}:${seed.id}`} school={school} busy={busy} replacement={{ ...context, policy: seed }} recovery={context} onSave={save} />}
    </>}
  </details>;
}
