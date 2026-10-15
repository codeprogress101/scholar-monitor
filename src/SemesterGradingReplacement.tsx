import { useRef, useState } from "react";
import type { GradingReplacementContext } from "../server/continuing/grading-policy";
import { configurationRequest as request } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import SemesterGradingRule from "./SemesterGradingRule";

export default function SemesterGradingReplacement({ path, school, session, onSaved, onBusy }: { path: string; school: string; session: Session; onSaved: () => void; onBusy: (busy: boolean) => void }) {
  const [context, setContext] = useState<GradingReplacementContext | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>("");
  const saving = useRef(false), pending = useRef<{ signature: string; key: string } | null>(null);
  async function load() {
    if (saving.current) return;
    saving.current = true; setBusy(true); onBusy(true); setError(""); setContext(null);
    try { setContext(await request<GradingReplacementContext>(path + "/grading-rule/replacement-context")); }
    catch (e) { setError(e instanceof ApiError ? e : "Could not load the affected records."); }
    finally { saving.current = false; setBusy(false); onBusy(false); }
  }
  async function save(body: object) {
    if (saving.current) return;
    saving.current = true; setBusy(true); onBusy(true); setError("");
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      await request(path + "/grading-rule/replace", { body, csrf: session.csrfToken, key: pending.current.key });
      pending.current = null; setContext(null); onSaved();
    } catch (e) { setError(e instanceof ApiError ? e : "Could not confirm the result. Retry safely or reload affected records."); }
    finally { saving.current = false; setBusy(false); onBusy(false); }
  }
  return <details className="my-2"><summary>Coordinator: change the approved grading rule</summary>
    <p>Changes apply to this school, roster and receiving semester. Affected assessments must be reviewed again.</p>
    <button className="btn btn-outline-secondary" disabled={busy} onClick={() => void load()}>{context ? "Reload affected records" : "Review affected records"}</button>
    <ErrorNotice error={error} />
    {context && <SemesterGradingRule key={context.impactHash} school={school} busy={busy} replacement={context} onSave={save} />}
  </details>;
}
