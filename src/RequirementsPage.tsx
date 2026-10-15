import FocusedDialog from "./FocusedDialog";
import { readAdminView, useAdminView } from "./admin-view-state";
import { StatusBadge } from "./WorkspaceUI";
import RoutineEvidence from "./RoutineEvidence";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import type {
  RequirementVersion,
  RequirementList,
} from "../server/requirements/model";
import { configurationRequest as request } from "./configuration-api";
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not complete the request. Refresh or retry.";
const blank = {
  code: "",
  name: "",
  instructions: "",
  documentKind: "",
  appliesTo: "semester",
  semesterId: "",
  effectiveFrom: "",
  effectiveUntil: "",
};
type Editor = {
  action: "create" | "revise" | "archive";
  version?: RequirementVersion;
};
async function semesters(signal: AbortSignal) {
  const all: ConfigRecord[] = [];
  for (let offset = 0; ;) {
    const result = await request<ConfigList>(
      `configuration/semesters?includeArchived=true&limit=100&offset=${offset}`,
      { signal },
    );
    all.push(...result.items);
    offset += result.items.length;
    if (offset >= result.total || !result.items.length) return all;
  }
}
export default function RequirementsPage({ session }: { session: Session }) {
  const viewKey = `admin-policies:${session.user.id}`;
  const [saved] = useState(() => readAdminView(viewKey, {query:"", offset:0}));
  const [list, setList] = useState<RequirementList | null>(null),
    [parents, setParents] = useState<ConfigRecord[]>([]),
    [manage, setManage] = useState(false);
  const [offset, setOffset] = useState(saved.offset),
    [query, setQuery] = useState(saved.query),
    [search, setSearch] = useState(saved.query),
    [reload, setReload] = useState(0);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<RequirementVersion[] | null>(null),
    [editor, setEditor] = useState<Editor | null>(null),
    [fields, setFields] = useState(blank),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const [context, setContext] = useState({
      semesterId: "",
      appliesTo: "semester",
      effectiveOn: "",
    }),
    [preview, setPreview] = useState<RequirementVersion[] | null>(null);
  const [uncertain, setUncertain] = useState(false);
  useAdminView(viewKey, {query, offset}, !loading);
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    const c = new AbortController();
    const timeout = window.setTimeout(() => c.abort(), 15000);
    let active = true;
    Promise.all([
      request<Access>("me/permissions", { signal: c.signal }),
      request<RequirementList>(
        `requirement-definitions?q=${encodeURIComponent(query)}&offset=${offset}`,
        { signal: c.signal },
      ),
      semesters(c.signal),
    ])
      .then(([access, data, refs]) => {
        if (active) {
          setManage(
            access.permissions.some((p) => p.code === "configuration.manage"),
          );
          setList(data);
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
  }, [offset, query, reload]);
  function refresh() {
    setLoading(true);
    setHistory(null);
    setPreview(null);
    setEditor(null);
    setError("");
    setReload((n) => n + 1);
  }
  function open(action: Editor["action"], version?: RequirementVersion) {
    setEditor({ action, version });
    setFields(
      version
        ? {
            code: version.code,
            name: version.name,
            instructions: version.instructions,
            documentKind: version.documentKind ?? "",
            appliesTo: version.appliesTo,
            semesterId: version.semesterId ?? "",
            effectiveFrom: "",
            effectiveUntil: "",
          }
        : blank,
    );
    setReason("");
    setReference("");
    setError("");
    setNotice("");
    pending.current = null;
    setUncertain(false);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editor || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    const { action, version } = editor;
    const body = {
      action,
      expectedVersion: version?.revision ?? 0,
      reason,
      reference,
      ...(action === "create" ? { code: fields.code } : {}),
      ...(action === "archive"
        ? { effectiveFrom: fields.effectiveFrom }
        : {
            fields: {
              name: fields.name,
              instructions: fields.instructions,
              documentKind: fields.documentKind || null,
              appliesTo: fields.appliesTo,
              semesterId: fields.semesterId || null,
              effectiveFrom: fields.effectiveFrom,
              effectiveUntil: fields.effectiveUntil || null,
            },
          }),
    };
    const path =
      "requirement-definitions" + (version ? "/" + version.definitionId : "");
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await request<RequirementVersion>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      setUncertain(false);
      refresh();
      setNotice(
        `Saved ${result.code} version ${result.revision}, effective ${result.effectiveFrom}. Earlier versions remain unchanged.`,
      );
      pending.current = null;
    } catch (e) {
      setUncertain(!(e instanceof ApiError) || e.status >= 500);
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function inspect(v: RequirementVersion) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setHistory(null);
    try {
      const r = await request<{ items: RequirementVersion[] }>(
        `requirement-definitions/${v.definitionId}`,
      );
      setHistory(r.items);
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function resolve(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setPreview(null);
    try {
      const r = await request<{ items: RequirementVersion[] }>(
        "requirement-definitions/applicable?" + new URLSearchParams(context),
      );
      setPreview(r.items);
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const field = (
    key: keyof typeof blank,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className="form-label d-block" key={key}>
      {label}
      <input
        className="form-control"
        type={type}
        required={required}
        maxLength={key === "code" ? 40 : 160}
        value={fields[key]}
        onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
      />
    </label>
  );
  const options = parents.map((p) => (
    <option
      key={p.id}
      value={p.id}
      disabled={p.archived || p.locked || p.parentUnavailable}
    >
      {p.code} - {p.name}
      {p.archived || p.locked || p.parentUnavailable ? " (unavailable)" : ""}
    </option>
  ));
  return (
    <section
      className="configuration-page admin-workspace"
      aria-label="Requirement definitions"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">PHYSICAL DOCUMENT POLICY</span>
          <h1>Document policies</h1>
          <p>
            Set which documents are required for each semester.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={refresh}
        >
          Refresh
        </button>
      </div>
      {error && (
        <div role="alert" className="alert alert-danger">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="alert alert-success">
          {notice}
        </div>
      )}
      {!loading && list && !manage && (
        <p className="muted-line">View only. An administrator manages these policies. To receive documents, <a className="text-decoration-underline" href="#scholars?task=receive">find a scholar</a>.</p>
      )}
      <div className="configuration-toolbar">
        <form
          className="configuration-search"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setQuery(search);
            setOffset(0);
            setReload((n) => n + 1);
            setHistory(null);
            setEditor(null);
          }}
        >
          <input
            aria-label="Search requirements"
            className="form-control"
            maxLength={160}
            value={search}
            disabled={saving}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or name"
          />
          <button className="btn btn-outline-secondary" disabled={saving}>
            Search
          </button>
        </form>
        {manage && (
          <button
            className="btn configuration-primary"
            disabled={loading || saving}
            onClick={() => open("create")}
          >
            Create policy
          </button>
        )}
      </div>
      {editor && (
        <FocusedDialog title={editor.action === "create" ? "Create policy" : editor.action === "archive" ? "Archive policy" : "Revise policy"} busy={saving || uncertain} onClose={()=>setEditor(null)}>
        {error && <p role="alert" className="alert alert-danger">{error}</p>}
        <form id="policy-editor-form"
          className="card p-3 my-3"
          onSubmit={save}
          aria-label="Requirement editor"
        >
          <p>
            Start dates are inclusive; end dates are exclusive. A newer version
            supersedes the earlier one from its start date, even if its scope
            changes.{" "}
            {editor.version &&
              `Choose a date after ${editor.version.effectiveFrom}, no earlier than today.`}
          </p>
          {editor.action === "archive" && <p role="alert">This ends active use from the effective date. Earlier policy versions and recorded evidence are retained.</p>}
          <fieldset disabled={saving || uncertain}>
            {editor.action === "create" && field("code", "Requirement code")}
            {editor.action !== "archive" && (
              <>
                {field("name", "Requirement name")}
                <label className="form-label d-block">Document kind<select className="form-select" value={fields.documentKind} required onChange={e => setFields({ ...fields, documentKind: e.target.value })}><option value="">Choose kind</option><option value="enrollment">Enrollment (COR / enrollment certificate)</option><option value="grades">Grades (COG)</option><option value="other">Other requirement</option></select></label>
                <label className="form-label d-block">
                  Hard-copy instructions
                  <textarea
                    className="form-control"
                    required
                    maxLength={2000}
                    value={fields.instructions}
                    onChange={(e) =>
                      setFields({ ...fields, instructions: e.target.value })
                    }
                  />
                </label>
                <label className="form-label d-block">
                  Required for
                  <select
                    className="form-select"
                    value={fields.appliesTo}
                    onChange={(e) =>
                      setFields({ ...fields, appliesTo: e.target.value })
                    }
                  >
                    <option value="semester">Semester documents (receiving and payout)</option>
                    <option value="payout">Separate payout obligation</option>
                  </select>
                </label>
                <label className="form-label d-block">
                  Required for semester
                  <select
                    className="form-select"
                    value={fields.semesterId}
                    onChange={(e) =>
                      setFields({ ...fields, semesterId: e.target.value })
                    }
                  >
                    <option value="">All semesters</option>
                    {options}
                  </select>
                </label>
              </>
            )}
            {field("effectiveFrom", "Effective from", "date")}
            {editor.action !== "archive" &&
              field(
                "effectiveUntil",
                "Effective until (exclusive, optional)",
                "date",
                false,
              )}
            <RoutineEvidence routine={editor.action !== "archive"}><label className="form-label d-block">
              Policy change reason
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
              Policy reference
              <input
                className="form-control"
                required
                minLength={3}
                maxLength={300}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label></RoutineEvidence>
            <button className="btn configuration-primary" type="submit">
              {editor.action === "archive" ? "Archive policy" : editor.action === "create" ? "Create policy" : "Save policy version"}
            </button>{" "}
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => setEditor(null)}
            >
              Cancel
            </button>
          </fieldset>
        </form>
        {uncertain && <div role="alert"><p>Result unconfirmed. Retry the same action before leaving.</p><button form="policy-editor-form" className="btn configuration-primary" disabled={saving}>Retry the same action</button></div>}
        </FocusedDialog>
      )}
      {loading && !list ? (
        <p role="status">Loading definitions...</p>
      ) : (
        list && (
          <>
            <p>
              Latest saved policies. Earlier versions remain in History.
            </p>
            {!list.items.length && (
              <p>
                No matching definitions. No requirement policy is seeded
                automatically.
              </p>
            )}
            <div className="table-responsive" role="region" aria-label="Document policies" tabIndex={0}><table className="table admin-table"><thead><tr><th>Document</th><th>Applies to</th><th>Effective dates</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {list.items.map(v => <tr key={v.id}>
              <td><strong>{v.name}</strong><small>{v.code}</small><details><summary>Instructions</summary><p style={{whiteSpace:"pre-wrap"}}>{v.instructions}</p></details></td>
              <td><small>{v.documentKind === "enrollment" ? "Enrollment" : v.documentKind === "grades" ? "Grades" : v.documentKind === "other" ? "Other requirement" : "Document kind needs review"}</small>{v.semesterCode ?? "All semesters"}<small>{v.appliesTo === "semester" ? "Receiving and payout" : "Separate payout obligation"}</small></td>
              <td>{v.effectiveFrom}<small>{v.effectiveUntil ? `Until ${v.effectiveUntil} (exclusive)` : "No explicit end"}</small></td>
              <td><StatusBadge tone={v.active ? "neutral" : "warning"}>{v.active ? "Enabled" : "Archived"}</StatusBadge></td>
              <td><div className="admin-row-actions">{manage && <button className="btn btn-sm configuration-primary" disabled={saving} onClick={()=>open("revise",v)}>{v.active ? "Revise policy" : "Restore policy"}</button>}
              <button className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={()=>void inspect(v)}>History</button>
              {manage && v.active && <button className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={()=>open("archive",v)}>Archive</button>}</div></td>
            </tr>)}
            </tbody></table></div>
            <div className="d-flex gap-2 align-items-center" hidden={list.total <= 25}>
              <button
                className="btn btn-outline-secondary"
                disabled={saving || offset === 0}
                onClick={() => {
                  setLoading(true);
                  setOffset(Math.max(0, offset - 25));
                }}
              >
                Previous
              </button>
              <span>{list.total} definitions</span>
              <button
                className="btn btn-outline-secondary"
                disabled={saving || offset + 25 >= list.total}
                onClick={() => {
                  setLoading(true);
                  setOffset(offset + 25);
                }}
              >
                Next
              </button>
            </div>
          </>
        )
      )}
      {history && (
        <FocusedDialog title={`Policy history${history[0] ? " - " + history[0].code : ""}`} onClose={()=>setHistory(null)}>
          <p>
            Stored versions never change. The next version's start date
            supersedes this version's availability.
          </p>
          {history.map((v) => (
            <article className="border-top py-3" key={v.id}>
              <h3 className="h5">
                Version {v.revision} - {v.name}
              </h3>
              <p>
                {v.active ? "Enabled" : "Archived"} - {v.effectiveFrom} to{" "}
                {v.effectiveUntil ?? "no explicit end"} (end exclusive)
                <br />
                {v.appliesTo} - {v.semesterCode ?? "All semesters"}
              </p>
              <p style={{ overflowWrap: "anywhere" }}>{v.instructions}</p>
              <p>
                Recorded by {v.actorName} -{" "}
                {new Date(v.createdAt).toLocaleString()}
                <br />
                {v.reason}
                <br />
                Reference: {v.reference}
              </p>
            </article>
          ))}
        </FocusedDialog>
      )}
      {list && (
        <details className="secondary-details"><summary>Check which policies apply</summary><form
          className="card p-3 my-4"
          aria-label="Requirement applicability preview"
          onSubmit={resolve}
        >
          <h2>Preview applicable requirements</h2>
          <p>
            Preview the document policy for a semester and date.
          </p>
          <fieldset disabled={saving}>
            <label className="form-label d-block">
              Preview semester
              <select
                className="form-select"
                required
                value={context.semesterId}
                onChange={(e) => {
                  setPreview(null);
                  setContext({ ...context, semesterId: e.target.value });
                }}
              >
                <option value="">Select semester</option>
                {options}
              </select>
            </label>
            <label className="form-label d-block">
              Preview purpose
              <select
                className="form-select"
                value={context.appliesTo}
                onChange={(e) => {
                  setPreview(null);
                  setContext({ ...context, appliesTo: e.target.value });
                }}
              >
                <option value="semester">Semester</option>
                <option value="payout">Payout</option>
              </select>
            </label>
            <label className="form-label d-block">
              Policy effective date
              <input
                type="date"
                className="form-control"
                required
                value={context.effectiveOn}
                onChange={(e) => {
                  setPreview(null);
                  setContext({ ...context, effectiveOn: e.target.value });
                }}
              />
            </label>
            <button className="btn configuration-primary">
              Preview requirements
            </button>
          </fieldset>
          {preview && (
            <div role="status" className="mt-3">
              {preview.length ? (
                preview.map((v) => (
                  <p key={v.id}>
                    {v.code} - {v.name}, version {v.revision}
                    <br />
                    {v.instructions}
                  </p>
                ))
              ) : (
                <p>No definitions apply to this context.</p>
              )}
            </div>
          )}
        </form></details>
      )}
    </section>
  );
}
