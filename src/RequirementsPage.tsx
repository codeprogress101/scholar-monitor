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
  const [list, setList] = useState<RequirementList | null>(null),
    [parents, setParents] = useState<ConfigRecord[]>([]),
    [manage, setManage] = useState(false);
  const [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
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
  const editorPanel = useRef<HTMLFormElement>(null);
  const historyPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (editor) {
      editorPanel.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      editorPanel.current?.focus({ preventScroll: true });
    }
  }, [editor]);
  useEffect(() => {
    if (history) {
      historyPanel.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      historyPanel.current?.focus({ preventScroll: true });
    }
  }, [history]);
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
    setList(null);
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
      refresh();
      setNotice(
        `Saved ${result.code} version ${result.revision}, effective ${result.effectiveFrom}. Earlier versions remain unchanged.`,
      );
      pending.current = null;
    } catch (e) {
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
      className="configuration-page"
      aria-label="Requirement definitions"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">PHYSICAL DOCUMENT POLICY</span>
          <h1>Requirement definitions</h1>
          <p>
            Configure hard-copy requirements for semesters or payouts. Each
            change preserves the earlier policy.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={refresh}
        >
          Refresh definitions
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
        <p className="notice">
          Read-only access. System Administrators configure requirement policy.
        </p>
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
            Add requirement definition
          </button>
        )}
      </div>
      {editor && (
        <form
          className="card p-3 my-3"
          onSubmit={save}
          aria-label="Requirement editor"
          ref={editorPanel}
          tabIndex={-1}
        >
          <h2>
            {editor.action === "create"
              ? "New definition"
              : editor.action === "archive"
                ? "Archive definition"
                : "New policy version"}
            {editor.version ? ` - ${editor.version.code}` : ""}
          </h2>
          <p>
            Start dates are inclusive; end dates are exclusive. A newer version
            supersedes the earlier one from its start date, even if its scope
            changes.{" "}
            {editor.version &&
              `Choose a date after ${editor.version.effectiveFrom}, no earlier than today.`}
          </p>
          <fieldset disabled={saving}>
            {editor.action === "create" && field("code", "Requirement code")}
            {editor.action !== "archive" && (
              <>
                {field("name", "Requirement name")}
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
                    <option value="semester">Each semester</option>
                    <option value="payout">Each payout</option>
                  </select>
                </label>
                <label className="form-label d-block">
                  Semester scope
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
            <label className="form-label d-block">
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
            </label>
            <button className="btn configuration-primary" type="submit">
              Save policy version
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
      )}
      {loading ? (
        <p role="status">Loading definitions...</p>
      ) : (
        list && (
          <>
            <p>
              Latest recorded versions, including future and archived policies.
              Use the preview below to check a particular date.
            </p>
            {!list.items.length && (
              <p>
                No matching definitions. No requirement policy is seeded
                automatically.
              </p>
            )}
            {list.items.map((v) => (
              <article className="card p-3 mb-3" key={v.id}>
                <h2 className="h5">
                  {v.code} - {v.name}
                </h2>
                <p>
                  Version {v.revision} - {v.active ? "Enabled" : "Archived"}{" "}
                  from {v.effectiveFrom}
                  {v.effectiveUntil
                    ? ` until ${v.effectiveUntil} (exclusive)`
                    : ""}
                  <br />
                  {v.appliesTo === "semester"
                    ? "Each semester"
                    : "Each payout"}{" "}
                  - {v.semesterCode ?? "All semesters"}
                </p>
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {v.instructions}
                </p>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={saving}
                    onClick={() => void inspect(v)}
                  >
                    History: {v.code}
                  </button>
                  {manage && (
                    <>
                      <button
                        className="btn btn-outline-secondary"
                        disabled={saving}
                        onClick={() => open("revise", v)}
                      >
                        {v.active ? "Revise" : "Restore"}: {v.code}
                      </button>
                      {v.active && (
                        <button
                          className="btn btn-outline-secondary"
                          disabled={saving}
                          onClick={() => open("archive", v)}
                        >
                          Archive: {v.code}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
            <div className="d-flex gap-2 align-items-center">
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
        <section
          className="card p-3 my-3"
          aria-label="Requirement version history"
          ref={historyPanel}
          tabIndex={-1}
        >
          <h2>Version history - {history[0].code}</h2>
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
        </section>
      )}
      {list && (
        <form
          className="card p-3 my-4"
          aria-label="Requirement applicability preview"
          onSubmit={resolve}
        >
          <h2>Preview applicable requirements</h2>
          <p>
            Check policy for an open semester and date. This preview does not
            generate scholar obligations or assess payout eligibility.
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
        </form>
      )}
    </section>
  );
}
