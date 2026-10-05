import EligibilityPanel from "./EligibilityPanel";
import PayoutChecklistForm from "./PayoutChecklistForm";
import RequirementWaiverForm from "./RequirementWaiverForm";
import RequirementWorkflow from "./RequirementWorkflow";
import { REQUIREMENT_STATUS_LABELS } from "../server/requirements/workflow-model";
import RequirementReceiptForm from "./RequirementReceiptForm";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import type {
  RequirementChecklist,
  GenerationResult,
} from "../server/requirements/instances-model";
import { configurationRequest as request } from "./configuration-api";
const errorMessage = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not confirm the result. Retry the same command safely or refresh.";
async function semesterChoices(yearId: string, signal: AbortSignal) {
  const items: ConfigRecord[] = [];
  for (let offset = 0; ;) {
    const r = await request<ConfigList>(
      `configuration/semesters?includeArchived=true&limit=100&offset=${offset}`,
      { signal },
    );
    items.push(...r.items.filter((i) => i.academicYearId === yearId));
    offset += r.items.length;
    if (offset >= r.total || !r.items.length) return items;
  }
}
export default function RequirementInstances({
  id,
  yearId,
  session,
  access,
  focused = false,
}: {
  id: string;
  yearId: string;
  session: Session;
  access: Access;
  focused?: boolean;
}) {
  const [items, setItems] = useState<RequirementChecklist[]>([]),
    [semesters, setSemesters] = useState<ConfigRecord[]>([]),
    [semesterId, setSemesterId] = useState("");
  const [checklistId, setChecklistId] = useState("");
  const [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const canVerify = access.permissions.some(
    (p) => p.code === "requirements.verify",
  );
  const canWaive = access.permissions.some(
    (p) => p.code === "requirements.waive",
  );
  const canReceive = access.permissions.some(
    (p) => p.code === "requirements.receive",
  );
  const canGenerate = access.permissions.some(
    (p) => p.code === "requirements.generate",
  );
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    Promise.all([
      request<{ items: RequirementChecklist[] }>(
        `scholarships/${id}/requirements`,
        { signal: c.signal },
      ),
      semesterChoices(yearId, c.signal),
    ])
      .then(([data, choices]) => {
        if (active) {
          setItems(data.items);
          setSemesters(choices);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [id, yearId, revision]);
  const selected = semesters.find((s) => s.id === semesterId),
    existing = items.find(
      (i) => i.semesterId === semesterId && !i.payoutCycleId,
    );
  function refresh() {
    setLoading(true);
    setError("");
    setRevision((n) => n + 1);
  }
  async function generate(e: FormEvent) {
    e.preventDefault();
    if (!selected || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    const body = {
      semesterId: selected.id,
      expectedSemesterVersion: selected.version,
      reason,
      reference,
    };
    const signature = JSON.stringify({ id, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await request<GenerationResult>(
        `scholarships/${id}/requirements/generate`,
        { body, csrf: session.csrfToken, key: pending.current.key },
      );
      setNotice(
        result.created
          ? `Generated ${result.count} requirements, all Not Submitted.`
          : "This semester already has a checklist. Its original policy versions are preserved.",
      );
      pending.current = null;
      setReason("");
      setReference("");
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      className="card p-3 my-3"
      aria-label="Scholar requirement checklists"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="d-flex gap-2 justify-content-between flex-wrap">
        <h3>{focused ? "Documents to receive" : "Requirement checklists"}</h3>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={refresh}
        >
          Refresh checklists
        </button>
      </div>
      {focused ? (
        <p>
          Select the semester or payout checklist, then find the document below.
          Record receipt first; verification is a separate step.
        </p>
      ) : (
        <p>
          Generate once from semester policies effective on the semester start
          date. Existing checklists keep their original policy versions. This
          does not confirm document receipt or payout eligibility.
        </p>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {loading ? (
        <p role="status">Loading requirement checklists...</p>
      ) : (
        <>
          <details open={!items.length} className="my-3">
            <summary>Create a semester or payout checklist</summary>
            {canGenerate && (
              <PayoutChecklistForm
                key={`payout-${revision}`}
                id={id}
                yearId={yearId}
                session={session}
                semesters={semesters}
                items={items}
                disabled={saving}
                onBusy={setSaving}
                onChanged={() => {
                  setNotice(
                    "Payout checklist generated with its frozen policy.",
                  );
                  refresh();
                }}
              />
            )}
            {canGenerate && (
              <form
                onSubmit={generate}
                aria-label="Generate semester checklist"
              >
                <fieldset disabled={saving}>
                  <label className="form-label d-block">
                    Checklist semester
                    <select
                      className="form-select"
                      required
                      value={semesterId}
                      onChange={(e) => {
                        setSemesterId(e.target.value);
                        setNotice("");
                      }}
                    >
                      <option value="">Select semester</option>
                      {semesters.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={
                            s.archived || s.locked || s.parentUnavailable
                          }
                        >
                          {s.code} - {s.name}
                          {s.archived || s.locked || s.parentUnavailable
                            ? " (unavailable)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selected && (
                    <p>
                      Policy date: {selected.startsOn}.{" "}
                      {existing
                        ? "An existing checklist is shown below."
                        : "Only semester definitions applicable on this date will be included."}
                    </p>
                  )}
                  {!existing && (
                    <>
                      <label className="form-label d-block">
                        Generation reason
                        <input
                          className="form-control"
                          required
                          minLength={5}
                          maxLength={500}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                      <label className="form-label d-block">
                        Generation reference
                        <input
                          className="form-control"
                          required
                          minLength={3}
                          maxLength={300}
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                        />
                      </label>
                      <button
                        className="btn configuration-primary"
                        disabled={
                          !selected ||
                          selected.archived ||
                          selected.locked ||
                          selected.parentUnavailable
                        }
                      >
                        {saving
                          ? "Generating..."
                          : "Generate semester checklist"}
                      </button>
                    </>
                  )}
                </fieldset>
              </form>
            )}
          </details>
          {!items.length && (
            <p className="mt-3">
              No requirement checklists generated for this annual record.
            </p>
          )}
          {focused && items.length > 0 && (
            <label className="form-label d-block">
              Semester or payout checklist
              <select
                className="form-select"
                value={checklistId || (items.length === 1 ? items[0].id : "")}
                onChange={(e) => setChecklistId(e.target.value)}
                disabled={saving}
              >
                <option value="">Choose checklist</option>
                {items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.payoutCode
                      ? `Payout: ${c.payoutCode}`
                      : `Semester: ${c.semesterCode}`}{" "}
                    - {c.semesterName}
                    {c.periodUnavailable ? " (closed)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {items
            .filter(
              (c) =>
                !focused ||
                c.id ===
                  (checklistId || (items.length === 1 ? items[0].id : "")),
            )
            .map((c) => (
              <article
                key={c.id}
                className="border-top mt-3 pt-3"
                aria-label={`Checklist ${c.payoutCode ?? c.semesterCode}`}
              >
                <h4>
                  {c.payoutCode ? `${c.payoutCode} / ` : ""}
                  {c.semesterCode} - {c.semesterName}
                </h4>
                <details>
                  <summary>Checklist details and history</summary>
                  <p>
                    {c.yearCode} - {c.yearName}
                    <br />
                    Policy date: {c.policyDate} (
                    {c.payoutCycleId
                      ? "captured payout target"
                      : "captured semester start"}
                    ){c.payoutState ? ` - cycle ${c.payoutState}` : ""}
                    {c.periodUnavailable ? " - period closed" : ""}
                  </p>
                  <p>
                    Generated by {c.actorName} on{" "}
                    {new Date(c.createdAt).toLocaleString()}
                    <br />
                    {c.reason}
                    <br />
                    Reference: {c.reference}
                  </p>
                </details>
                {c.payoutCycleId && !focused && (
                  <EligibilityPanel
                    key={`eligibility-${c.id}-${revision}`}
                    id={id}
                    cycleId={c.payoutCycleId}
                    session={session}
                    permissions={access.permissions.map((p) => p.code)}
                    canCalculate={access.permissions.some(
                      (p) => p.code === "eligibility.calculate",
                    )}
                  />
                )}
                <ul className="ps-3">
                  {c.items.map((i) => (
                    <li key={i.id} className="mb-3">
                      <strong>
                        {i.code} - {i.name}
                      </strong>
                      <div>
                        {!focused && <>Policy version {i.revision} - </>}
                        {REQUIREMENT_STATUS_LABELS[i.status]}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>
                        {i.instructions}
                      </div>
                      {c.payoutCycleId && (
                        <p className="small">
                          {i.allowWaiver
                            ? "This payout accepts a recorded waiver."
                            : "This payout requires verification; a waiver will not satisfy its policy."}{" "}
                          {i.satisfiesPayoutRequirement
                            ? "Requirement satisfied for this cycle."
                            : "Requirement not yet satisfied for this cycle."}{" "}
                          Full eligibility is evaluated separately.
                        </p>
                      )}
                      <RequirementWaiverForm
                        instance={i}
                        session={session}
                        canWaive={canWaive && !saving}
                        closed={c.periodUnavailable}
                        onBusy={setSaving}
                        onChanged={() => {
                          setNotice("Requirement waiver recorded.");
                          refresh();
                        }}
                      />
                      <RequirementWorkflow
                        instance={i}
                        session={session}
                        canVerify={canVerify}
                        canReceive={canReceive}
                        disabled={saving}
                        closed={c.periodUnavailable}
                        onBusy={setSaving}
                        onChanged={() => {
                          setNotice(
                            "Requirement decision recorded; history is preserved.",
                          );
                          refresh();
                        }}
                      />
                      <RequirementReceiptForm
                        instance={i}
                        session={session}
                        canReceive={canReceive && !saving}
                        closed={c.periodUnavailable}
                        onBusy={setSaving}
                        onReceived={() => {
                          setNotice(
                            "Physical receipt recorded. The requirement is Submitted; verification is a separate step.",
                          );
                          refresh();
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
        </>
      )}
      <p className="small text-muted mt-3 mb-0">
        Hard copies only. Receipt records custody; verification is a separate
        step. Payout-specific checklists connect when payout periods are
        available.
      </p>
    </section>
  );
}
