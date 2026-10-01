import MasterlistAmendments from "./MasterlistAmendments";
import MasterlistWorkflow from "./MasterlistWorkflow";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import type {
  DraftCandidate,
  DraftDetail,
  Masterlist,
} from "../server/masterlists/model";
type Page<T> = { items: T[]; total: number; offset: number; limit: number };
const failure = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Result unconfirmed. Refresh the draft or retry the same command safely.";
export default function MasterlistsPage({ session }: { session: Session }) {
  const [access, setAccess] = useState<Access | null>(null),
    [years, setYears] = useState<ConfigRecord[]>([]),
    [list, setList] = useState<Page<Masterlist> | null>(null),
    [detail, setDetail] = useState<DraftDetail | null>(null),
    [candidates, setCandidates] = useState<Page<DraftCandidate> | null>(null);
  const [selected, setSelected] = useState(""),
    [revision, setRevision] = useState(0),
    [offset, setOffset] = useState(0),
    [candidateOffset, setCandidateOffset] = useState(0),
    [q, setQ] = useState(""),
    [search, setSearch] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [detailLoading, setDetailLoading] = useState(false),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState<null | {
    action: "create" | "add" | "remove" | "refresh";
    scholarId: string;
    name: string;
  }>(null);
  const [fields, setFields] = useState({
    title: "",
    academicYearId: "",
    awardNumber: "",
    reason: "",
    reference: "",
  });
  const formElement = useRef<HTMLFormElement>(null);
  const [review, setReview] = useState<DraftCandidate | null>(null);
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false);
  const allowed = access?.permissions.some(
    (p) => p.code === "masterlists.prepare",
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      const a = await request<Access>("me/permissions", {
        signal: controller.signal,
      });
      if (!active) return;
      setAccess(a);
      if (!a.permissions.some((p) => p.code === "masterlists.prepare")) return;
      const records: ConfigRecord[] = [];
      while (true) {
        const page = await request<ConfigList>(
          `configuration/academic-years?includeArchived=true&limit=100&offset=${records.length}`,
          { signal: controller.signal },
        );
        records.push(...page.items);
        if (records.length >= page.total || !page.items.length) break;
      }
      const drafts = await request<Page<Masterlist>>(
        `masterlists?offset=${offset}`,
        { signal: controller.signal },
      );
      if (active) {
        setYears(records);
        setList(drafts);
      }
    })()
      .catch((e) => {
        if (active) setError(failure(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [offset, revision]);
  useEffect(() => {
    if (!selected || !allowed) return;
    let active = true;
    const controller = new AbortController();
    Promise.all([
      request<DraftDetail>(`masterlists/${selected}`, {
        signal: controller.signal,
      }),
      request<Page<DraftCandidate>>(
        `masterlists/${selected}/candidates?q=${encodeURIComponent(q)}&offset=${candidateOffset}`,
        { signal: controller.signal },
      ),
    ])
      .then(([d, c]) => {
        if (active) {
          setDetail(d);
          setCandidates(c);
        }
      })
      .catch((e) => {
        if (active) setError(failure(e));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selected, allowed, revision, q, candidateOffset]);
  useEffect(() => {
    if (!form) return;
    formElement.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (form.action !== "refresh") return;
    let active = true;
    const controller = new AbortController();
    request<Page<DraftCandidate>>(
      `masterlists/${selected}/candidates?q=${encodeURIComponent(form.name)}`,
      { signal: controller.signal },
    )
      .then((page) => {
        if (active)
          setReview(
            page.items.find((c) => c.scholarId === form.scholarId) ?? null,
          );
      })
      .catch((e) => {
        if (active) setError(failure(e));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [form, selected]);
  function refresh() {
    setError("");
    setForm(null);
    setLoading(true);
    if (selected) setDetailLoading(true);
    setRevision((n) => n + 1);
  }
  function openForm(
    action: "create" | "add" | "remove" | "refresh",
    scholarId = "",
    name = "",
    awardNumber = "",
  ) {
    setReview(null);
    setForm({ action, scholarId, name });
    setFields({
      title: "",
      academicYearId: "",
      awardNumber,
      reason: "",
      reference: "",
    });
    setError("");
    setNotice("");
    pending.current = null;
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || busy.current) return;
    const body =
      form.action === "create"
        ? {
            title: fields.title,
            academicYearId: fields.academicYearId,
            reason: fields.reason,
            reference: fields.reference,
          }
        : {
            action: form.action,
            expectedVersion: detail!.version,
            scholarId: form.scholarId,
            awardNumber:
              form.action === "remove"
                ? null
                : fields.awardNumber.trim() || null,
            reason: fields.reason,
            reference: fields.reference,
          };
    const path =
        form.action === "create"
          ? "masterlists"
          : `masterlists/${selected}/entries`,
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ id: string; version: number }>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setForm(null);
      setSelected(result.id);
      setDetailLoading(true);
      setLoading(true);
      setRevision((n) => n + 1);
      setNotice(
        "Draft saved. Candidate counts and validation have been refreshed.",
      );
    } catch (e) {
      setError(failure(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const disabled = loading || detailLoading || saving;
  return (
    <section className="scholars-page">
      <div className="section-heading">
        <div>
          <h1>Masterlists</h1>
          <p>
            Prepare and verify candidates, then approve, publish and lock the
            official list.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary"
          disabled={disabled}
          onClick={refresh}
        >
          Refresh drafts
        </button>
      </div>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {loading && <p role="status">Loading drafts...</p>}
      {access && !allowed && (
        <p className="alert alert-info">
          Masterlist preparation is available to Staff and Coordinators. Your
          account does not have this permission.
        </p>
      )}
      {allowed && (
        <>
          <button
            className="btn configuration-primary mb-3"
            disabled={
              disabled || !!form || !years.some((y) => !y.archived && !y.locked)
            }
            onClick={() => openForm("create")}
          >
            Create masterlist draft
          </button>
          {!years.some((y) => !y.archived && !y.locked) && !loading && (
            <p>
              Configure an active, unlocked academic year before creating a
              draft.
            </p>
          )}
          {form && (
            <form
              ref={formElement}
              className="border rounded p-3 mb-3"
              onSubmit={submit}
            >
              <fieldset disabled={disabled}>
                <legend className="h5">
                  {form.action === "create"
                    ? "Create masterlist draft"
                    : `${form.action[0].toUpperCase() + form.action.slice(1)} candidate: ${form.name}`}
                </legend>
                {form.action === "create" && (
                  <>
                    <label className="form-label" htmlFor="draft-title">
                      Draft title
                    </label>
                    <input
                      className="form-control mb-3"
                      id="draft-title"
                      required
                      maxLength={160}
                      value={fields.title}
                      onChange={(e) =>
                        setFields({ ...fields, title: e.target.value })
                      }
                    />
                    <label className="form-label" htmlFor="draft-year">
                      Draft academic year
                    </label>
                    <select
                      className="form-select mb-3"
                      id="draft-year"
                      required
                      value={fields.academicYearId}
                      onChange={(e) =>
                        setFields({ ...fields, academicYearId: e.target.value })
                      }
                    >
                      <option value="">Select academic year</option>
                      {years
                        .filter((y) => !y.archived && !y.locked)
                        .map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.code} - {y.name}
                          </option>
                        ))}
                    </select>
                  </>
                )}
                {(form.action === "add" || form.action === "refresh") && (
                  <>
                    <p>
                      Save the current authoritative personal, selection and
                      academic information in this draft. Earlier audit history
                      is retained.
                    </p>
                    <label className="form-label" htmlFor="draft-award">
                      Award number (optional in draft)
                    </label>
                    <input
                      className="form-control mb-3"
                      id="draft-award"
                      maxLength={60}
                      value={fields.awardNumber}
                      onChange={(e) =>
                        setFields({ ...fields, awardNumber: e.target.value })
                      }
                    />
                    <p>
                      Separate from the permanent Scholar ID. Leave blank when
                      not assigned.
                    </p>
                  </>
                )}
                {form.action === "refresh" &&
                  (review ? (
                    <div className="alert alert-info">
                      <strong>Current source for review</strong>
                      {review.snapshot ? (
                        <p>
                          {review.snapshot.name} -{" "}
                          {review.snapshot.placement.school.name} -{" "}
                          {review.snapshot.placement.course.name} -{" "}
                          {review.snapshot.placement.yearLevel}
                        </p>
                      ) : (
                        <ul>
                          {review.issues.map((i) => (
                            <li key={i.code}>{i.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p role="status">
                      Loading current candidate information...
                    </p>
                  ))}
                {form.action === "remove" && (
                  <p>
                    Remove this candidate from the draft count. Removal remains
                    in the audit history.
                  </p>
                )}
                {(
                  [
                    {
                      key: "reason",
                      label: "Draft change reason",
                      min: 5,
                      max: 500,
                    },
                    {
                      key: "reference",
                      label: "Physical-record reference",
                      min: 3,
                      max: 300,
                    },
                  ] as const
                ).map(({ key, label, min, max }) => (
                  <div key={key} className="mb-3">
                    <label className="form-label" htmlFor={`draft-${key}`}>
                      {label}
                    </label>
                    <input
                      className="form-control"
                      id={`draft-${key}`}
                      required
                      minLength={min}
                      maxLength={max}
                      value={fields[key]}
                      onChange={(e) =>
                        setFields({ ...fields, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
                <div className="d-flex gap-2">
                  <button
                    className="btn configuration-primary"
                    type="submit"
                    disabled={
                      form.action === "refresh" &&
                      (!review || review.issues.length > 0)
                    }
                  >
                    {saving ? "Saving..." : "Save draft command"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setForm(null)}
                  >
                    Cancel draft command
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          <h2 className="h4">Saved drafts</h2>
          {!loading && !list?.items.length && <p>No drafts on this page.</p>}
          {list?.items.map((d) => (
            <article className="border rounded p-3 mb-2" key={d.id}>
              <h3 className="h5">{d.title}</h3>
              <p>
                {d.yearCode} · {d.status} · {d.count}{" "}
                {d.count === 1 ? "candidate" : "candidates"} · Revision{" "}
                {d.version}
              </p>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={disabled || !!form}
                onClick={() => {
                  setSelected(d.id);
                  setDetail(null);
                  setDetailLoading(true);
                  setCandidateOffset(0);
                  setQ("");
                  setSearch("");
                  setRevision((n) => n + 1);
                  setError("");
                  setNotice("");
                }}
              >
                Open {d.title}
              </button>
            </article>
          ))}
          {list && (
            <div className="d-flex gap-2 my-3">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={disabled || !!form || offset === 0}
                onClick={() => {
                  setLoading(true);
                  setOffset((n) => Math.max(0, n - 25));
                }}
              >
                Previous drafts
              </button>
              <span>{list.total} drafts</span>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={disabled || !!form || offset + 25 >= list.total}
                onClick={() => {
                  setLoading(true);
                  setOffset((n) => n + 25);
                }}
              >
                Next drafts
              </button>
            </div>
          )}
          {detailLoading && <p role="status">Loading draft validation...</p>}
          {detail && (
            <div className="border-top mt-4 pt-4">
              <h2>{detail.title}</h2>
              <p>
                {detail.yearCode} · {detail.status.replaceAll("_", " ")} -
                Revision {detail.version} ·{" "}
                <strong>
                  {detail.count}{" "}
                  {detail.count === 1 ? "candidate" : "candidates"}
                </strong>
              </p>
              {["published", "locked"].includes(detail.status) && (
                <MasterlistAmendments
                  key={detail.id + "-amendments"}
                  detail={detail}
                  session={session}
                  access={access!}
                  onOpen={(id) => {
                    setSelected(id);
                    setDetail(null);
                    setForm(null);
                    setDetailLoading(true);
                    setCandidateOffset(0);
                    setQ("");
                    setSearch("");
                    setRevision((n) => n + 1);
                    setError("");
                    setNotice("");
                  }}
                />
              )}
              <MasterlistWorkflow
                key={detail.id}
                id={detail.id}
                version={detail.version}
                session={session}
                access={access!}
                disabled={disabled || !!form}
                onChanged={refresh}
              />
              <div
                className={`alert ${detail.validation.valid ? "alert-success" : "alert-warning"}`}
              >
                <strong>
                  {detail.validation.valid
                    ? detail.status === "published" ||
                      detail.status === "locked"
                      ? "Current source comparison passed"
                      : "Masterlist validation passed"
                    : detail.status === "published" ||
                        detail.status === "locked"
                      ? "Current sources differ; official snapshot remains unchanged"
                      : "Masterlist needs attention"}
                </strong>
                {!!detail.validation.issues.length && (
                  <ul className="mb-0">
                    {detail.validation.issues.map((i, n) => (
                      <li key={n}>
                        {i.scholarId
                          ? `${detail.entries.find((e) => e.scholarId === i.scholarId)?.snapshot.humanId ?? "Candidate"}: `
                          : ""}
                        {i.message} <small>({i.code})</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {detail.unavailable && (
                <p>Editing is blocked for this draft or academic year.</p>
              )}
              <h3 className="h5">Masterlist entries</h3>
              {detail.entries.map((e) => (
                <article className="border rounded p-3 mb-2" key={e.id}>
                  <h4 className="h6">
                    {e.snapshot.humanId} · {e.snapshot.name}
                  </h4>
                  <p>
                    {e.snapshot.placement.school.name} ·{" "}
                    {e.snapshot.placement.course.name} ·{" "}
                    {e.snapshot.placement.yearLevel}
                    <br />
                    Award number: {e.awardNumber ?? "Not assigned"}
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={disabled || !!form || detail.unavailable}
                      onClick={() =>
                        openForm(
                          "refresh",
                          e.scholarId,
                          e.snapshot.humanId,
                          e.awardNumber ?? "",
                        )
                      }
                    >
                      Review / refresh {e.snapshot.humanId}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={disabled || !!form || detail.unavailable}
                      onClick={() =>
                        openForm("remove", e.scholarId, e.snapshot.humanId)
                      }
                    >
                      Remove {e.snapshot.humanId}
                    </button>
                  </div>
                </article>
              ))}
              <h3 className="h5 mt-4">Find candidates</h3>
              <p>
                Candidates must have Selected scholarship status and complete
                academic data for {detail.yearCode}.
              </p>
              <form
                className="d-flex flex-wrap gap-2 mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setDetailLoading(true);
                  setQ(search.trim());
                  setCandidateOffset(0);
                  setRevision((n) => n + 1);
                }}
              >
                <label htmlFor="candidate-search" className="visually-hidden">
                  Candidate name or Scholar ID
                </label>
                <input
                  className="form-control"
                  id="candidate-search"
                  placeholder="Name or Scholar ID"
                  maxLength={100}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className="btn btn-outline-secondary"
                  disabled={disabled || !!form}
                >
                  Search candidates
                </button>
              </form>
              {candidates?.items.map((c) => (
                <article className="border rounded p-3 mb-2" key={c.scholarId}>
                  <h4 className="h6">
                    {c.humanId ?? "Missing Scholar ID"} · {c.name}
                  </h4>
                  {c.issues.length > 0 ? (
                    <ul>
                      {c.issues.map((i) => (
                        <li key={i.code}>
                          {i.message} <small>({i.code})</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      {c.snapshot!.placement.school.name} ·{" "}
                      {c.snapshot!.placement.course.name} ·{" "}
                      {c.snapshot!.placement.yearLevel}
                    </p>
                  )}
                  <button
                    className="btn btn-sm configuration-primary"
                    disabled={
                      disabled ||
                      !!form ||
                      detail.unavailable ||
                      !!c.issues.length ||
                      detail.entries.some((e) => e.scholarId === c.scholarId)
                    }
                    onClick={() =>
                      openForm("add", c.scholarId, c.humanId ?? c.name)
                    }
                  >
                    {detail.entries.some((e) => e.scholarId === c.scholarId)
                      ? "Already included"
                      : `Add ${c.humanId}`}
                  </button>
                </article>
              ))}
              {candidates && (
                <div className="d-flex flex-wrap gap-2 my-3">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={disabled || !!form || candidateOffset === 0}
                    onClick={() => {
                      setDetailLoading(true);
                      setCandidateOffset((n) => Math.max(0, n - 25));
                    }}
                  >
                    Previous candidates
                  </button>
                  <span>{candidates.total} search results</span>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={
                      disabled ||
                      !!form ||
                      candidateOffset + 25 >= candidates.total
                    }
                    onClick={() => {
                      setDetailLoading(true);
                      setCandidateOffset((n) => n + 25);
                    }}
                  >
                    Next candidates
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
