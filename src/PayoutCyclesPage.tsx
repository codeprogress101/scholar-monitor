import RoutineEvidence from "./RoutineEvidence";
import OvrDrafts from "./OvrDrafts";
import EligibilityReport from "./EligibilityReport";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigRecord, ConfigList } from "../server/configuration/model";
import type { RequirementVersion } from "../server/requirements/model";
import type { PayoutCycle } from "../server/payouts/model";
import { configurationRequest as request } from "./configuration-api";
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not confirm the result. Retry the same command safely or refresh.";
type Editor = {
  action: "create" | "configure" | "open" | "lock" | "close";
  cycle?: PayoutCycle;
};
async function allSemesters(signal: AbortSignal) {
  const items: ConfigRecord[] = [];
  for (let offset = 0; ;) {
    const r = await request<ConfigList>(
      `configuration/semesters?includeArchived=true&limit=100&offset=${offset}`,
      { signal },
    );
    items.push(...r.items);
    offset += r.items.length;
    if (offset >= r.total || !r.items.length) return items;
  }
}
export default function PayoutCyclesPage({ session }: { session: Session }) {
  const [ovrCycle, setOvrCycle] = useState<string | null>(null);
  const [reportCycle, setReportCycle] = useState<string | null>(null);
  const [data, setData] = useState<{ items: PayoutCycle[]; total: number }>({
      items: [],
      total: 0,
    }),
    [parents, setParents] = useState<ConfigRecord[]>([]),
    [permissions, setPermissions] = useState<string[]>([]);
  const [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [history, setHistory] = useState<PayoutCycle[] | null>(null);
  const [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [semesterId, setSemesterId] = useState(""),
    [date, setDate] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const [choices, setChoices] = useState<RequirementVersion[] | null>(null),
    [selected, setSelected] = useState<Record<string, boolean>>({});
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null),
    panel = useRef<HTMLFormElement>(null);
  const manage = permissions.includes("configuration.manage"),
    operate = permissions.includes("payouts.operate");
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    Promise.all([
      request<Access>("me/permissions", { signal: c.signal }),
      request<{ items: PayoutCycle[]; total: number }>(
        `payout-cycles?limit=25&offset=${offset}`,
        { signal: c.signal },
      ),
      allSemesters(c.signal),
    ])
      .then(([access, list, refs]) => {
        if (active) {
          setPermissions(access.permissions.map((p) => p.code));
          setData(list);
          setParents(refs);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      c.abort();
    };
  }, [offset, reload]);
  useEffect(() => {
    if (editor) {
      panel.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      panel.current?.focus({ preventScroll: true });
    }
  }, [editor]);
  function refresh() {
    setLoading(true);
    setEditor(null);
    setHistory(null);
    setError("");
    setReload((n) => n + 1);
  }
  function edit(action: Editor["action"], cycle?: PayoutCycle) {
    setEditor({ action, cycle });
    setCode(cycle?.code ?? "");
    setName(cycle?.name ?? "");
    setSemesterId(cycle?.semesterId ?? "");
    setDate(cycle?.targetDate ?? "");
    setSelected(
      Object.fromEntries(
        cycle?.requirements.map((r) => [
          r.definitionVersionId,
          r.allowWaiver,
        ]) ?? [],
      ),
    );
    setChoices(null);
    setReason("");
    setReference("");
    setError("");
    pending.current = null;
  }
  async function loadChoices() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const r = await request<{ items: RequirementVersion[] }>(
        `requirement-definitions/applicable?semesterId=${encodeURIComponent(semesterId)}&appliesTo=payout&effectiveOn=${encodeURIComponent(date)}`,
      );
      setChoices(r.items);
      setSelected((old) =>
        Object.fromEntries(
          Object.entries(old).filter(([id]) =>
            r.items.some((i) => i.id === id),
          ),
        ),
      );
    } catch (e) {
      setChoices(null);
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function inspect(cycle: PayoutCycle) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      setHistory(
        (
          await request<{ items: PayoutCycle[] }>(
            `payout-cycles/${cycle.id}/history`,
          )
        ).items,
      );
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editor || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    const { action, cycle } = editor;
    const body = {
      action,
      expectedVersion: cycle?.version ?? 0,
      reason,
      reference,
      ...(action === "create"
        ? {
            code,
            semesterId,
            expectedSemesterVersion: parents.find((s) => s.id === semesterId)!
              .version,
          }
        : {}),
      ...(["create", "configure"].includes(action)
        ? {
            fields: {
              name,
              targetDate: date,
              requirements: Object.entries(selected).map(
                ([definitionVersionId, allowWaiver]) => ({
                  definitionVersionId,
                  allowWaiver,
                }),
              ),
            },
          }
        : {}),
    };
    const path = cycle
        ? `payout-cycles/${cycle.id}/${action}`
        : "payout-cycles",
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await request<PayoutCycle>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      refresh();
      setNotice(`${result.code}: ${result.state}, revision ${result.version}.`);
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      className="configuration-page"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="d-flex justify-content-between gap-2 flex-wrap">
        <h1>Payout cycles</h1>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={refresh}
        >
          Refresh payout cycles
        </button>
      </div>
      <p>
        Configure each semester payout date and its document requirements.
        Opening a cycle freezes its policy; locking or closing it stops document
        changes.
      </p>
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
      {manage && (
        <button
          className="btn configuration-primary mb-3"
          disabled={loading || saving}
          onClick={() => edit("create")}
        >
          Create payout cycle
        </button>
      )}
      {editor && (
        <form
          ref={panel}
          tabIndex={-1}
          className="card p-3 mb-3"
          aria-label="Payout cycle command"
          onSubmit={submit}
        >
          <h2>
            {editor.action === "create"
              ? "Create payout cycle"
              : `${editor.action} ${editor.cycle!.code}`}
          </h2>
          <fieldset disabled={saving}>
            {editor.action === "create" && (
              <>
                <label className="form-label d-block">
                  Cycle code
                  <input
                    className="form-control"
                    required
                    minLength={2}
                    maxLength={60}
                    pattern={"[A-Z0-9][A-Z0-9_\\-]*"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <label className="form-label d-block">
                  Cycle semester
                  <select
                    className="form-select"
                    required
                    value={semesterId}
                    onChange={(e) => {
                      setSemesterId(e.target.value);
                      setChoices(null);
                      setSelected({});
                    }}
                  >
                    <option value="">Select semester</option>
                    {parents.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={s.locked || s.archived || s.parentUnavailable}
                      >
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {["create", "configure"].includes(editor.action) ? (
              <>
                <label className="form-label d-block">
                  Cycle name
                  <input
                    className="form-control"
                    required
                    minLength={2}
                    maxLength={160}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="form-label d-block">
                  Payout target date
                  <input
                    className="form-control"
                    type="date"
                    required
                    min="1900-01-01"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setChoices(null);
                      setSelected({});
                    }}
                  />
                </label>
                <button
                  className="btn btn-outline-secondary mb-3"
                  type="button"
                  disabled={!semesterId || !date}
                  onClick={() => void loadChoices()}
                >
                  Load applicable payout requirements
                </button>
                {choices !== null && (
                  <>
                    <p>
                      Select required documents and whether a recorded waiver
                      can satisfy each one.
                    </p>
                    {!choices.length && (
                      <p>
                        No payout definitions apply. Configure them in
                        Requirement definitions first.
                      </p>
                    )}
                    {choices.map((r) => (
                      <div className="border rounded p-2 mb-2" key={r.id}>
                        <label className="d-block">
                          <input
                            type="checkbox"
                            checked={r.id in selected}
                            onChange={(e) =>
                              setSelected((old) => {
                                const next = { ...old };
                                if (e.target.checked) next[r.id] = true;
                                else delete next[r.id];
                                return next;
                              })
                            }
                          />{" "}
                          Require {r.code} - {r.name} (v{r.revision})
                        </label>
                        {r.id in selected && (
                          <label className="d-block">
                            <input
                              type="checkbox"
                              checked={selected[r.id]}
                              onChange={(e) =>
                                setSelected((old) => ({
                                  ...old,
                                  [r.id]: e.target.checked,
                                }))
                              }
                            />{" "}
                            Accept waiver for {r.code}
                          </label>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <p>
                  {editor.cycle!.yearCode} / {editor.cycle!.semesterCode} -
                  target {editor.cycle!.targetDate}
                </p>
                <p>
                  {editor.action === "open"
                    ? "Opening freezes the target date and requirement versions. Requirements are rechecked against current policy before opening."
                    : "This action stops new document changes. Existing documents and decisions remain readable; there is no reopen action."}
                </p>
              </>
            )}
            <RoutineEvidence ><label className="form-label d-block">
              Cycle command reason
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
              Cycle authority reference
              <input
                className="form-control"
                required
                minLength={3}
                maxLength={300}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label></RoutineEvidence>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn configuration-primary"
                disabled={
                  ["create", "configure"].includes(editor.action) &&
                  (!choices || !Object.keys(selected).length)
                }
              >
                Save payout cycle command
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setEditor(null)}
              >
                Cancel cycle command
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {loading ? (
        <p role="status">Loading payout cycles...</p>
      ) : (
        <>
          {!data.items.length && <p>No payout cycles configured.</p>}
          {data.items.map((c) => (
            <PayoutCycleCard
              key={c.id}
              cycle={c}
              manage={manage}
              operate={operate}
              saving={saving}
              onInspect={inspect}
              onEdit={edit}
              onOvr={
                permissions.includes("ovr.prepare")
                  ? () => setOvrCycle(c.id)
                  : undefined
              }
              onReport={
                permissions.includes("scholars.read")
                  ? () => setReportCycle(c.id)
                  : undefined
              }
            />
          ))}
          <div className="d-flex gap-3 align-items-center">
            <button
              className="btn btn-outline-secondary"
              disabled={!offset || saving}
              onClick={() => {
                setOffset((n) => Math.max(0, n - 25));
                refresh();
              }}
            >
              Previous cycles
            </button>
            <span>{data.total} cycles</span>
            <button
              className="btn btn-outline-secondary"
              disabled={offset + 25 >= data.total || saving}
              onClick={() => {
                setOffset((n) => n + 25);
                refresh();
              }}
            >
              Next cycles
            </button>
          </div>
        </>
      )}
      {ovrCycle && (
        <OvrDrafts
          key={`${ovrCycle}-${reload}`}
          cycleId={ovrCycle}
          session={session}
          permissions={permissions}
        />
      )}
      {reportCycle && (
        <EligibilityReport
          key={`${reportCycle}-${reload}`}
          cycleId={reportCycle}
          session={session}
          canCalculate={permissions.includes("eligibility.calculate")}
          permissions={permissions}
        />
      )}
      {history && (
        <section className="card p-3 mt-3" aria-label="Payout cycle history">
          <h2>History: {history[0]?.code}</h2>
          {history.map((v) => (
            <div className="border-top py-2" key={v.versionId}>
              <strong>
                Revision {v.version}: {v.action} - {v.state}
              </strong>
              <p>
                {v.name} - target {v.targetDate}
                <br />
                {v.actorName} - {new Date(v.recordedAt).toLocaleString()}
                <br />
                {v.reason}
                <br />
                Reference: {v.reference}
              </p>
              <ul>
                {v.requirements.map((r) => (
                  <li key={r.definitionVersionId}>
                    {r.code} v{r.revision} -{" "}
                    {r.allowWaiver ? "waivers accepted" : "waivers excluded"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}

function PayoutCycleCard({
  cycle: c,
  manage,
  operate,
  saving,
  onInspect,
  onEdit,
  onReport,
  onOvr,
}: {
  cycle: PayoutCycle;
  manage: boolean;
  operate: boolean;
  saving: boolean;
  onInspect: (c: PayoutCycle) => Promise<void>;
  onReport?: () => void;
  onOvr?: () => void;
  onEdit: (action: Editor["action"], c: PayoutCycle) => void;
}) {
  return (
    <article
      className="card p-3 mb-3"
      key={c.id}
      aria-label={`Payout ${c.code}`}
    >
      <h2>
        {c.code} - {c.name}
      </h2>
      <p>
        {c.yearCode} / {c.semesterCode}
        <br />
        Target: {c.targetDate} - <strong>{c.state}</strong> - revision{" "}
        {c.version}
        {c.periodUnavailable ? " (period unavailable)" : ""}
      </p>
      <ul>
        {c.requirements.map((r) => (
          <li key={r.definitionVersionId}>
            {r.code} - {r.name} (v{r.revision});{" "}
            {r.allowWaiver
              ? "waivers accepted"
              : "verification required; waivers excluded"}
          </li>
        ))}
      </ul>
      <div className="d-flex gap-2 flex-wrap">
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={() => void onInspect(c)}
        >
          History {c.code}
        </button>
        {onOvr && (
          <button
            className="btn btn-outline-secondary"
            disabled={saving}
            onClick={onOvr}
          >
            OVR drafts {c.code}
          </button>
        )}
        {onReport && (
          <button
            className="btn btn-outline-secondary"
            disabled={saving}
            onClick={onReport}
          >
            Eligibility {c.code}
          </button>
        )}
        {manage && c.state === "draft" && !c.periodUnavailable && (
          <button
            className="btn btn-outline-secondary"
            disabled={saving}
            onClick={() => onEdit("configure", c)}
          >
            Configure {c.code}
          </button>
        )}
        {operate &&
          (c.state === "draft" && !c.periodUnavailable
            ? ["open"]
            : c.state === "open"
              ? ["lock", "close"]
              : c.state === "locked"
                ? ["close"]
                : []
          ).map((a) => (
            <button
              key={a}
              className="btn btn-outline-secondary"
              disabled={saving}
              onClick={() => onEdit(a as Editor["action"], c)}
            >
              {a} {c.code}
            </button>
          ))}
      </div>
    </article>
  );
}
