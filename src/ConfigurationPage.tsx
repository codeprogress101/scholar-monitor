import FocusedDialog from "./FocusedDialog";
import { readAdminView, useAdminView } from "./admin-view-state";
import SignatoryFields from "./SignatoryFields";
import RoutineEvidence from "./RoutineEvidence";
import WorkingCalendar from "./WorkingCalendar";
import ErrorNotice from "./ErrorNotice";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import {
  CONFIG_KINDS,
  CONFIG_LABELS,
  isPeriod,
  type ConfigKind,
  type ConfigRecord,
  type ConfigList,
  type ConfigFields,
  type ConfigCommand,
} from "../server/configuration/model";
import { configurationRequest as request } from "./configuration-api";

const SETUP_KINDS = CONFIG_KINDS.filter(kind=>kind!=="schools" && kind!=="courses");
type Editor = { action: ConfigCommand["action"]; record?: ConfigRecord };
const blank: ConfigFields = {
  code: "",
  name: "",
  startsOn: "",
  endsOn: "",
  academicYearId: "",
  termKind: null,
  valueType: "text",
  value: "",
};
async function allYears(signal: AbortSignal) {
  const rows: ConfigRecord[] = [];
  let offset = 0;
  while (true) {
    const page = await request<ConfigList>(
      `configuration/academic-years?includeArchived=true&limit=100&offset=${offset}`,
      { signal },
    );
    rows.push(...page.items);
    offset += page.items.length;
    if (offset >= page.total || !page.items.length) return rows;
  }
}
export default function ConfigurationPage({ session }: { session: Session }) {
  const viewKey = `admin-configuration:${session.user.id}`;
  const [saved] = useState(() => {
    const stored = readAdminView(viewKey, {category:"academic-years", query:"", archived:false, offset:0});
    const category = new URLSearchParams(window.location.hash.split("?")[1]).get("category");
    return category && category !== stored.category ? {...stored, query:"", offset:0} : stored;
  });
  const [kind, setKind] = useState<ConfigKind>(() => {
    const category = new URLSearchParams(window.location.hash.split("?")[1]).get("category") ?? saved.category;
    return SETUP_KINDS.find(value => value === category) ?? "academic-years";
  });
  const [list, setList] = useState<ConfigList | null>(null);
  const [years, setYears] = useState<ConfigRecord[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [includeArchived, setIncludeArchived] = useState<boolean>(saved.archived);
  const [search, setSearch] = useState(saved.query),
    [query, setQuery] = useState(saved.query);
  const [offset, setOffset] = useState(saved.offset),
    [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | ApiError>(""),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [fields, setFields] = useState<ConfigFields>(blank),
    [reason, setReason] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const busy = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  useAdminView(viewKey, {category:kind, query, archived:includeArchived, offset}, !loading);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    Promise.all([
      request<Access>("me/permissions", { signal: controller.signal }),
      request<ConfigList>(
        `configuration/${kind}?includeArchived=${includeArchived}&q=${encodeURIComponent(query)}&offset=${offset}`,
        { signal: controller.signal },
      ),
      isPeriod(kind) ? allYears(controller.signal) : Promise.resolve([]),
    ])
      .then(([access, data, parents]) => {
        if (!active) return;
        setCanManage(
          access.permissions.some(
            (permission) => permission.code === "configuration.manage",
          ),
        );
        setList(data);
        setYears(parents);
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof ApiError
              ? failure
              : "Could not load configuration. Refresh to try again.",
          );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [kind, includeArchived, query, offset, revision]);
  function resetView() {
    setEditor(null);
    setError("");
    setNotice("");
    setLoading(true);
    setList(null);
    setCanManage(false);
  }
  function refresh() {
    resetView();
    setRevision((value) => value + 1);
  }
  function open(action: Editor["action"], row?: ConfigRecord) {
    setFields(
      row
        ? {
            code: row.code,
            name: row.name,
            startsOn: row.startsOn ?? "",
            endsOn: row.endsOn ?? "",
            academicYearId: row.academicYearId ?? "",
            termKind: row.termKind ?? null,
            valueType: row.valueType ?? "text",
            value: row.value ?? "",
          }
        : { ...blank, academicYearId: years.find(y => y.working && !y.locked && !y.archived)?.id ?? "" },
    );
    setReason("");
    setError("");
    setNotice("");
    pending.current = null;
    setUncertain(false);
    setEditor({ action, record: row });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy.current) return;
    const data: ConfigFields = { code: fields.code, name: fields.name };
    if (isPeriod(kind)) {
      data.startsOn = fields.startsOn;
      data.endsOn = fields.endsOn;
    }
    if (kind === "semesters") { data.academicYearId = fields.academicYearId; data.termKind = fields.termKind; }
    if (kind === "settings") {
      data.valueType = fields.valueType;
      data.value = fields.value;
    }
    const body: ConfigCommand = {
      action: editor.action,
      expectedVersion: editor.record?.version ?? 0,
      reason,
      ...(["create", "update"].includes(editor.action) ? { fields: data } : {}),
    };
    const path = `configuration/${kind}${editor.record ? "/" + editor.record.id : ""}`;
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request<ConfigRecord>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      setUncertain(false);
      setEditor(null);
      setNotice(`${result.name} saved.`);
      setLoading(true);
      setRevision((value) => value + 1);
      pending.current = null;
    } catch (failure) {
      setUncertain(!(failure instanceof ApiError) || failure.status >= 500);
      setError(
        failure instanceof ApiError
          ? failure
          : "The result could not be confirmed. Retry the same changes to safely check the result, without changing or closing this form.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function change(field: keyof ConfigFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }
  const editing = editor && ["create", "update"].includes(editor.action);
  return (
    <section className="admin-workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PROGRAM FOUNDATION</div>
          <h1>System configuration</h1>
          <p>
            Maintain the shared lists and academic periods used across scholar
            records.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary quiet-button"
          disabled={saving || loading}
          onClick={refresh}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="configuration-tabs" aria-label="Reference categories">
        {SETUP_KINDS.map((item) => (
          <button
            className={item === kind ? "selected" : ""}
            aria-pressed={item === kind}
            disabled={saving}
            key={item}
            onClick={() => {
              if (kind === item) return;
              resetView();
              setKind(item);
              setOffset(0);
              setQuery("");
              setSearch("");
              window.history.replaceState(null, "", `#configuration?category=${item}`);
            }}
          >
            {CONFIG_LABELS[item]}
          </button>
        ))}
      </div>
      {kind === "academic-years" && !loading && <WorkingCalendar session={session} years={years} canManage={canManage} revision={revision} onReady={setCalendarReady} onSaved={refresh} />}
      <p className="small">{kind === "academic-years" ? "Use one working academic year for both semesters. Earlier years stay available for historical records." : kind === "semesters" ? "Create the first and second semesters under the same academic year, with dates inside that year." : kind === "schools" || kind === "courses" ? "Add each choice once. Staff selects it when recording a scholar's academic details." : "Maintain the shared choices used by the workspace."}</p>
      <div className="configuration-toolbar">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            resetView();
            setQuery(search);
            setOffset(0);
            setRevision((value) => value + 1);
          }}
          className="configuration-search"
        >
          <label htmlFor="reference-search" className="visually-hidden">
            Search references
          </label>
          <input
            id="reference-search"
            className="form-control"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code or name"
            maxLength={160}
            disabled={saving}
          />
          <button
            className="btn btn-outline-secondary"
            disabled={saving}
            aria-label="Search references"
          >
            <Search size={18} />
          </button>
        </form>
        <label className="configuration-archive-toggle">
          <input
            type="checkbox"
            checked={includeArchived}
            disabled={saving}
            onChange={(event) => {
              resetView();
              setIncludeArchived(event.target.checked);
              setOffset(0);
            }}
          />{" "}
          Include archived
        </label>
        {canManage && (
          <button
            className="btn configuration-primary"
            disabled={saving || loading || (kind === "academic-years" && !calendarReady)}
            onClick={() => open("create")}
          >
            <Plus size={17} />
            {kind === "academic-years" ? "Add academic year" : "Add record"}
          </button>
        )}
      </div>
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      <ErrorNotice error={error} />
      {!loading && list && !canManage && (
        <div className="notice">
          <Settings2 size={20} />
          <div>
            <strong>Read-only access</strong>
            <span>
              System Administrators maintain these lists. Archived entries
              remain available for historical records.
            </span>
          </div>
        </div>
      )}
      {kind === "settings" && (
        <p className="configuration-hint">
          Program settings are readable by staff. Use them for program options
          and dates. They do not change login or database configuration.
        </p>
      )}
      {editor && (
        <FocusedDialog title={editor.action === "create" ? `Add ${kind === "academic-years" ? "academic year" : kind === "semesters" ? "semester" : "record"}` : `${editor.action === "update" ? "Edit" : editor.action[0].toUpperCase()+editor.action.slice(1)} ${editor.record?.name ?? "record"}`} busy={saving || uncertain} onClose={() => setEditor(null)}>
          <ErrorNotice error={error} />
          {!editing && (
            <p>
              <strong>
                {editor.record?.code} · {editor.record?.name}
              </strong>
            </p>
          )}
          {editor.action === "archive" && (
            <p>
              Archiving removes this entry from active choices and preserves it
              for historical records.
            </p>
          )}
          {editor.action === "restore" && (
            <p>Restore this entry to active choices.</p>
          )}
          {editor.action === "lock" && (
            <div className="alert alert-warning">
              Locking prevents changes to this period. Locking an academic year
              also prevents changes to its semesters. This screen cannot undo a
              lock.
            </div>
          )}
          <form id="configuration-editor-form" onSubmit={save}>
            <fieldset disabled={saving || uncertain}>
              <div className="row g-3">
                {editing && (
                  <>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="config-code">
                        Code
                      </label>
                      <input
                        id="config-code"
                        className="form-control"
                        required
                        maxLength={60}
                        pattern="[A-Za-z0-9][A-Za-z0-9._\-]*"
                        value={fields.code}
                        disabled={editor.action === "update"}
                        onChange={(event) => change("code", event.target.value)}
                      />
                      <small className="configuration-hint">
                        Permanent, unique within this list.
                      </small>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label" htmlFor="config-name">
                        Name
                      </label>
                      <input
                        id="config-name"
                        className="form-control"
                        required
                        minLength={2}
                        maxLength={160}
                        value={fields.name}
                        onChange={(event) => change("name", event.target.value)}
                      />
                    </div>
                    {kind === "semesters" && (
                      <div className="col-12">
                        <label className="form-label" htmlFor="config-year">
                          Academic year
                        </label>
                        <select
                          id="config-year"
                          className="form-select"
                          required
                          disabled={editor.action === "update"}
                          value={fields.academicYearId}
                          onChange={(event) =>
                            change("academicYearId", event.target.value)
                          }
                        >
                          <option value="">Select an academic year</option>
                          {years
                            .filter(
                              (year) =>
                                (year.working !== false && !year.archived && !year.locked) ||
                                year.id === fields.academicYearId,
                            )
                            .map((year) => (
                              <option key={year.id} value={year.id}>
                                {year.code} · {year.name} ({year.startsOn} to{" "}
                                {year.endsOn})
                              </option>
                            ))}
                        </select>
                        <small className="configuration-hint">
                          Create an unlocked academic year first. Semester dates
                          must fit within it.
                        </small>
                      </div>
                    )}
                    {kind === "semesters" && <label className="col-md-6 form-label">Semester identity<select className="form-select" value={fields.termKind ?? ""} onChange={event => setFields(f => ({ ...f, termKind: (event.target.value || null) as ConfigFields["termKind"] }))}><option value="">Needs review</option><option value="first">First semester</option><option value="second">Second semester</option><option value="other">Summer / other</option></select></label>}
                    {isPeriod(kind) && (
                      <>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="config-start">
                            Start date
                          </label>
                          <input
                            id="config-start"
                            type="date"
                            className="form-control"
                            required
                            min="1900-01-01"
                            max="9999-12-31"
                            value={fields.startsOn}
                            onChange={(event) =>
                              change("startsOn", event.target.value)
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="config-end">
                            End date
                          </label>
                          <input
                            id="config-end"
                            type="date"
                            className="form-control"
                            required
                            min={fields.startsOn || "1900-01-01"}
                            max="9999-12-31"
                            value={fields.endsOn}
                            onChange={(event) =>
                              change("endsOn", event.target.value)
                            }
                          />
                        </div>
                      </>
                    )}
                    {kind === "settings" && fields.code === "PAYROLL_SIGNATORIES" && <SignatoryFields value={fields.value ?? ""} onChange={value=>change("value",value)} />}
                    {kind === "settings" && fields.code !== "PAYROLL_SIGNATORIES" && (
                      <>
                        <div className="col-md-4">
                          <label className="form-label" htmlFor="config-type">
                            Value type
                          </label>
                          <select
                            id="config-type"
                            className="form-select"
                            value={fields.valueType}
                            onChange={(event) => {
                              change("valueType", event.target.value);
                              change("value", "");
                            }}
                          >
                            <option value="text">Text</option>
                            <option value="date">Date</option>
                          </select>
                        </div>
                        <div className="col-md-8">
                          <label className="form-label" htmlFor="config-value">
                            Value
                          </label>
                          <input
                            id="config-value"
                            className="form-control"
                            type={fields.valueType === "date" ? "date" : "text"}
                            min={
                              fields.valueType === "date"
                                ? "1900-01-01"
                                : undefined
                            }
                            max={
                              fields.valueType === "date"
                                ? "9999-12-31"
                                : undefined
                            }
                            maxLength={1000}
                            required
                            value={fields.value}
                            onChange={(event) =>
                              change("value", event.target.value)
                            }
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
                <RoutineEvidence routine={editor.action === "create" || editor.action === "update"}><div className="col-12">
                  <label className="form-label" htmlFor="config-reason">
                    Reason for change
                  </label>
                  <input
                    id="config-reason"
                    className="form-control"
                    required
                    minLength={5}
                    maxLength={500}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain why this change is needed"
                  />
                </div></RoutineEvidence>
              </div>
              <div className="configuration-form-actions">
                <button className="btn configuration-primary" type="submit">
                  {saving
                    ? "Saving…"
                    : editor.action === "lock"
                      ? "Lock period"
                      : editor.action === "archive" ? "Archive record" : editor.action === "restore" ? "Restore record" : editor.action === "create" ? "Add record" : "Save changes"}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
          {uncertain && <div role="alert"><p>Result unconfirmed. Retry the same action before leaving.</p><button form="configuration-editor-form" className="btn configuration-primary" disabled={saving}>Retry the same action</button></div>}
        </FocusedDialog>
      )}
      {loading && (
        <p role="status">Loading {CONFIG_LABELS[kind].toLowerCase()}…</p>
      )}
      {list && (
        <section
          className="info-panel configuration-list"
          aria-label={CONFIG_LABELS[kind]}
        >
          <div className="section-heading">
            <h2>{CONFIG_LABELS[kind]}</h2>
            <span className="soft-badge neutral">{list.total} records</span>
          </div>
          {!list.items.length ? (
            <div className="empty-state">
              <Settings2 size={30} />
              <h3>{query ? "No matching records" : "No records yet"}</h3>
              <p>
                {query
                  ? "Try a different search or include archived records."
                  : canManage
                    ? "Add the reference data your program uses to get started."
                    : "Your System Administrator can add records to this list."}
              </p>
            </div>
          ) : (
            <div className="configuration-table-wrap">
              <table className="table configuration-table">
                <thead>
                  <tr>
                    <th>Code & name</th>
                    <th>
                      {isPeriod(kind)
                        ? "Dates"
                        : kind === "settings"
                          ? "Value"
                          : "Reference"}
                    </th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.code}</strong>
                        <span>{row.name}</span>
                        {row.academicYearId && (
                          <small>
                            {
                              years.find(
                                (year) => year.id === row.academicYearId,
                              )?.name
                            }
                          </small>
                        )}
                      </td>
                      <td>
                        {isPeriod(kind) ? (
                          <>
                            {row.startsOn}
                            <span>to {row.endsOn}</span>
                          </>
                        ) : kind === "settings" ? (
                          row.code === "PAYROLL_SIGNATORIES" ? "Four payroll certification names and designations" : row.value
                        ) : row.archived ? (
                          "Retained for history"
                        ) : (
                          "Active reference"
                        )}
                      </td>
                      <td>
                        <span className="soft-badge neutral">
                          {row.locked
                            ? "Locked"
                            : row.archived
                              ? "Archived"
                              : row.working ? "Working year" : row.working === false ? "Other year / history" : "Active"}
                        </span>
                        {row.parentUnavailable && (
                          <small>Academic year unavailable</small>
                        )}
                      </td>
                      {canManage && (
                        <td>
                          <div className="configuration-row-actions">
                            {!row.locked && !row.parentUnavailable && (
                              <>
                                {!row.archived && (
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={saving}
                                    onClick={() => open("update", row)}
                                    aria-label={`Edit ${row.code}`}
                                  >
                                    <Pencil size={14} />
                                    Edit
                                  </button>
                                )}
                                {row.code !== "PAYROLL_SIGNATORIES" && <button
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={saving}
                                  onClick={() =>
                                    open(
                                      row.archived ? "restore" : "archive",
                                      row,
                                    )
                                  }
                                  aria-label={`${row.archived ? "Restore" : "Archive"} ${row.code}`}
                                >
                                  <Archive size={14} />
                                  {row.archived ? "Restore" : "Archive"}
                                </button>}
                                {isPeriod(kind) && !row.archived && (
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={saving}
                                    onClick={() => open("lock", row)}
                                    aria-label={`Lock ${row.code}`}
                                  >
                                    <LockKeyhole size={14} />
                                    Lock
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="configuration-pagination">
            <span>
              {list.total
                ? `${offset + 1}–${offset + list.items.length} of ${list.total}`
                : "0 records"}
            </span>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={saving || offset === 0}
              onClick={() => {
                resetView();
                setOffset(Math.max(0, offset - list.limit));
              }}
            >
              Previous
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={saving || offset + list.limit >= list.total}
              onClick={() => {
                resetView();
                setOffset(offset + list.limit);
              }}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
