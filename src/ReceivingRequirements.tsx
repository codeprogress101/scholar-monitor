import ErrorNotice from "./ErrorNotice";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Access } from "../server/authorization/policy";
import type {
  ReceivingPeriod,
  RequirementChecklist,
} from "../server/requirements/instances-model";
import { REQUIREMENT_STATUS_LABELS } from "../server/requirements/workflow-model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import { defaultReceivingPeriod, receivingToday } from "./receiving-selection";
import RequirementWorkflow from "./RequirementWorkflow";
import RequirementWaiverForm from "./RequirementWaiverForm";

const message = (e: unknown) =>
  e instanceof ApiError
    ? e
    : "Could not confirm the result. Retry safely or refresh.";
export default function ReceivingRequirements({
  id,
  session,
  access,
  onAcademicSetup,
}: {
  id: string;
  session: Session;
  access: Access;
  onAcademicSetup?: () => void;
}) {
  const [periods, setPeriods] = useState<ReceivingPeriod[]>([]),
    [periodId, setPeriodId] = useState("");
  const [checklist, setChecklist] = useState<RequirementChecklist | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | ApiError>(""),
    [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0),
    [receivedOn, setDate] = useState(receivingToday),
    [reference, setReference] = useState(""),
    [storage, setStorage] = useState(""),
    [remarks, setRemarks] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false);
  const can = (permission: string) =>
    access.permissions.some((p) => p.code === permission);
  const canGenerate = can("requirements.generate"),
    canReceive = can("requirements.receive");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    async function load() {
      try {
        const options = await request<{ items: ReceivingPeriod[] }>(
          `scholarships/${id}/requirements/receiving-periods`,
          { signal: controller.signal },
        );
        const chosen =
          options.items.find((p) => p.id === periodId) ??
          options.items.find(
            (p) => p.id === defaultReceivingPeriod(options.items),
          );
        if (!active) return;
        setPeriods(options.items);
        // Selection is resolved without a second effect/request on the initial open.
        if (chosen?.canProvision && canGenerate)
          await request(`scholarships/${id}/requirements/provision`, {
            body: { periodId: chosen.id },
            csrf: session.csrfToken,
            key: crypto.randomUUID(),
            signal: controller.signal,
          });
        const data = chosen
          ? await request<{ items: RequirementChecklist[] }>(
              `scholarships/${id}/requirements`,
              { signal: controller.signal },
            )
          : { items: [] };
        if (active) {
          setChecklist(
            data.items.find(
              (c) =>
                c.semesterId === chosen?.semesterId &&
                c.payoutCycleId === chosen?.payoutCycleId,
            ) ?? null,
          );
          setError("");
        }
      } catch (e) {
        if (active) {
          setChecklist(null);
          setError(message(e));
        }
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [id, periodId, revision, canGenerate, session.csrfToken]);
  const chosenId = periodId || defaultReceivingPeriod(periods);
  function refresh() {
    setLoading(true);
    setError("");
    setSelected([]);
    setRevision((n) => n + 1);
  }
  async function receive(e: FormEvent) {
    e.preventDefault();
    if (!checklist || busy.current || !selected.length) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    const body = {
      items: checklist.items
        .filter((i) => selected.includes(i.id))
        .map((i) => ({ id: i.id, expectedVersion: i.version })),
      receivedOn,
      physicalReference: reference.trim() || null,
      storageLocation: storage.trim() || null,
      remarks: remarks.trim() || null,
    };
    const signature = JSON.stringify({ id: checklist.id, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    try {
      await request(`requirement-checklists/${checklist.id}/receive`, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setNotice(
        `${body.items.length} document(s) received as Submitted. Verification is a separate step.`,
      );
      refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section aria-label="Documents to receive">
      <div className="d-flex justify-content-between gap-2 align-items-center my-3">
        <h4>Requirements</h4>
        <button
          className="btn btn-outline-secondary"
          disabled={saving || loading}
          onClick={refresh}
        >
          Refresh requirements
        </button>
      </div>
      {periods.length > 1 ? (
        <label className="form-label d-block">
          Period
          <select
            className="form-select"
            value={chosenId}
            disabled={saving || loading}
            onChange={(e) => {
              setPeriodId(e.target.value);
              setChecklist(null);
              setSelected([]);
              setNotice("");
              setLoading(true);
            }}
          >
            <option value="" disabled>
              Choose period
            </option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      ) : periods.length === 1 ? (
        <p>Period: {periods[0].label}</p>
      ) : null}
      <ErrorNotice error={error} />
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Loading applicable requirements...</p>
      ) : error && !checklist ? null : !checklist ? (
        <p className="alert alert-info">
          {periods.length
            ? "Choose a period to view its requirements."
            : "No applicable receiving period is configured. Ask your administrator to configure semester requirements or an open payout cycle."}
        </p>
      ) : (
        <>
          {checklist.periodUnavailable && (
            <p className="alert alert-info">
              This period is closed or locked. Its documents and history are
              read only.
            </p>
          )}
          <form onSubmit={receive}>
            <fieldset
              disabled={saving || checklist.periodUnavailable || !canReceive}
            >
              <legend className="fs-6">
                Select documents physically received
              </legend>
              {checklist.items.map((i) => (
                <label
                  className="d-flex gap-3 align-items-center border-bottom py-3"
                  key={i.id}
                >
                  <input
                    className="form-check-input flex-shrink-0"
                    type="checkbox"
                    checked={selected.includes(i.id)}
                    disabled={i.status !== "not_submitted"}
                    onChange={(e) =>
                      setSelected((previous) =>
                        e.target.checked
                          ? [...previous, i.id]
                          : previous.filter((x) => x !== i.id),
                      )
                    }
                  />
                  <span className="flex-grow-1">
                    {i.name} ({i.code})
                  </span>
                  <span>{REQUIREMENT_STATUS_LABELS[i.status]}</span>
                </label>
              ))}
              {!checklist.periodUnavailable &&
                canReceive &&
                checklist.items.some((i) => i.status === "not_submitted") && (
                  <div className="row g-3 my-2">
                    <label className="col-md-6">
                      Date received
                      <input
                        className="form-control"
                        type="date"
                        required
                        max={receivingToday()}
                        value={receivedOn}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <div className="col-12">
                      <details>
                        <summary>Additional details (optional)</summary>
                        <div className="row g-3 mt-1">
                          <label className="col-md-6">
                            Physical reference (optional)
                            <input
                              className="form-control"
                              maxLength={300}
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                            />
                          </label>
                          <label className="col-md-6">
                            Storage location (optional)
                            <input
                              className="form-control"
                              maxLength={300}
                              value={storage}
                              onChange={(e) => setStorage(e.target.value)}
                            />
                          </label>
                          <label className="col-md-6">
                            Remarks (optional)
                            <textarea
                              className="form-control"
                              maxLength={1000}
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                            />
                          </label>
                        </div>
                      </details>
                    </div>
                    <div>
                      <button
                        className="btn configuration-primary"
                        disabled={!selected.length}
                      >
                        {saving
                          ? "Receiving..."
                          : "Receive Selected Requirements"}
                      </button>
                    </div>
                  </div>
                )}
            </fieldset>
          </form>
          <details className="mt-3">
            <summary>Verification, corrections and document history</summary>
            <p>
              Receiving does not verify documents or establish payout
              eligibility.
            </p>
            {checklist.items.map((i) => (
              <article className="border-top py-3" key={i.id}>
                <h5>
                  {i.name} ({i.code})
                </h5>
                <p>{i.instructions}</p>
                {i.receipt && (
                  <p>
                    Received {i.receipt.receivedOn} by {i.receipt.receiverName}.
                    Reference: {i.receipt.physicalReference || "Not recorded"}.
                    Storage: {i.receipt.storageLocation || "Not recorded"}.{" "}
                    {i.receipt.remarks}
                  </p>
                )}
                <RequirementWorkflow
                  instance={i}
                  session={session}
                  canVerify={can("requirements.verify")}
                  canReceive={canReceive}
                  disabled={saving}
                  closed={checklist.periodUnavailable}
                  onBusy={setSaving}
                  onChanged={refresh}
                  onAcademicSetup={onAcademicSetup}
                />
                <RequirementWaiverForm
                  instance={i}
                  session={session}
                  canWaive={can("requirements.waive") && !saving}
                  closed={checklist.periodUnavailable}
                  onBusy={setSaving}
                  onChanged={refresh}
                />
              </article>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
