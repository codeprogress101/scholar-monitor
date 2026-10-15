import FocusedDialog from "./FocusedDialog";
import { receivingContextFromRoute, type ReceivingContext } from "./receiving-selection";
import NotificationDocument from "./NotificationDocument";
import RegistryEligibilityCell, { RegistryPeriodPicker, useRegistryEligibility } from "./RegistryEligibility";
import { newRecordYear } from "./academic-year-options";
import RoutineEvidence from "./RoutineEvidence";
import ContinuingBaseline from "./ContinuingBaseline";
import ErrorNotice from "./ErrorNotice";
import ScholarRequirements from "./ScholarRequirements";
import { scholarAddress, scholarSection } from "./scholar-navigation";
import ScholarImport from "./ScholarImport";
import ExcelExport from "./ExcelExport";
import ScholarTimeline from "./ScholarTimeline";
import AcademicPanel from "./AcademicPanel";
import ScholarAcademicSummary, { yearLevelLabel } from "./ScholarAcademicSummary";
import QualificationPanel from "./QualificationPanel";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { ApiError, type Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigRecord, ConfigList } from "../server/configuration/model";
import type {
  DuplicateCheck,
  ScholarDetail,
  ScholarFields,
  ScholarList,
  ScholarResult,
} from "../server/scholars/model";
import { configurationRequest as request } from "./configuration-api";
const blank: ScholarFields = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  birthDate: null,
  academicYearId: "",
  barangayId: null,
  contact: { email: "", phone: "", addressLine: "" },
};
async function choices(kind: string, signal: AbortSignal) {
  const rows: ConfigRecord[] = [];
  while (true) {
    const page = await request<ConfigList>(
      `configuration/${kind}?includeArchived=true&limit=100&offset=${rows.length}`,
      { signal },
    );
    rows.push(...page.items);
    if (rows.length >= page.total || !page.items.length) return rows;
  }
}
const message = (error: unknown) =>
  error instanceof ApiError
    ? error
    : "The result could not be confirmed. Refresh to check the latest record, or retry the same changes safely.";
function asFields(row: ScholarDetail): ScholarFields {
  return {
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    suffix: row.suffix,
    birthDate: row.birthDate,
    academicYearId: row.academicYearId,
    barangayId: row.barangayId,
    contact: { ...row.contact },
  };
}
export default function ScholarsPage({ session }: { session: Session }) {
  const [route] = useState(() => new URLSearchParams(window.location.hash.split("?")[1] ?? ""));
  const requestedScholar = route.get("scholar");
  const receivingTask = route.get("task") === "receive" || route.get("section") === "requirements";
  const requestedSection = scholarSection(route);
  const [showImport, setShowImport] = useState(route.has("importJob"));
  const [access, setAccess] = useState<Access | null>(null);
  const [list, setList] = useState<ScholarList | null>(null);
  const [years, setYears] = useState<ConfigRecord[]>([]),
    [barangays, setBarangays] = useState<ConfigRecord[]>([]);
  const [savedRegistry] = useState(() => { try { return JSON.parse(sessionStorage.getItem("registry-view") ?? "{}") as Record<string, string>; } catch { return {}; } });
  const [exportOpen,setExportOpen]=useState(false), [exportYear,setExportYear]=useState("");
  const [classification,setClassification]=useState(savedRegistry.classification ?? "all");
  const [pageSize,setPageSize]=useState([25,50,100].includes(Number(savedRegistry.pageSize))?Number(savedRegistry.pageSize):25);
  const [semesterChoice,setSemesterChoice]=useState(savedRegistry.semester ?? "");
  const [registryScope, setRegistryScope] = useState(savedRegistry.scope ?? "current");
  const [sort, setSort] = useState(savedRegistry.sort ?? "name"), [direction, setDirection] = useState(savedRegistry.direction ?? "asc");
  const [payrollPeriod, setPayrollPeriod] = useState(savedRegistry.period ?? "");

  const [query, setQuery] = useState(savedRegistry.q ?? ""),
    [search, setSearch] = useState(savedRegistry.q ?? ""),
    [yearFilter, setYearFilter] = useState(savedRegistry.year ?? "");
  const [offset, setOffset] = useState(Number(savedRegistry.offset) || 0),
    [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | ApiError>(""),
    [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<ScholarDetail | null>(null),
    [editing, setEditing] = useState(false);
  const [profileSection, setProfileSection] = useState("overview");
  const [academicYearChoice, setAcademicYearChoice] = useState(route.get("academicYear") ?? "");
  const [academicRevision, setAcademicRevision] = useState(0);
  const [receivingContexts, setReceivingContexts] = useState<Record<string, ReceivingContext>>(() => {
    const context = receivingContextFromRoute(route);
    return requestedScholar && context ? { [requestedScholar]: context } : {};
  });
  function showSection(section: string, yearId = academicYearChoice) {
    setProfileSection(section);
    if (profile && section === "requirements" && yearId && receivingContexts[profile.id]?.academicYearId !== yearId) setReceivingContexts(old=>({...old,[profile.id]:{academicYearId:yearId}}));
    if (profile) {
      const params = new URLSearchParams(scholarAddress(profile.id, section, yearId).split("?")[1]);
      const context = receivingContexts[profile.id];
      if (context) for (const [key, value] of Object.entries({receivingYear: context.annualId, period: context.periodId, receivingAcademicYear: context.academicYearId, semester: context.semesterId, payrollCycle: context.payoutCycleId})) if (value) params.set(key, value);
      window.history.replaceState(null, "", `#scholars?${params}`);
    }
  }
  const rememberReceiving = useCallback((scholarId: string, context: ReceivingContext) => {
    if(context.academicYearId) setAcademicYearChoice(context.academicYearId);
    setReceivingContexts(previous => JSON.stringify(previous[scholarId]) === JSON.stringify(context) ? previous : { ...previous, [scholarId]: context });
    const params = new URLSearchParams({ scholar: scholarId, section: "requirements" });
    for (const [key, value] of Object.entries({receivingYear: context.annualId, period: context.periodId, academicYear: context.academicYearId, semester: context.semesterId, payrollCycle: context.payoutCycleId})) if (value) params.set(key, value);
    window.history.replaceState(null, "", `#scholars?${params}`);
  }, []);
  useEffect(() => { sessionStorage.setItem("registry-view", JSON.stringify({ scope: registryScope, q: query, year: yearFilter, sort, direction, period: payrollPeriod, classification, pageSize:String(pageSize), semester:semesterChoice, offset: String(offset) })); }, [registryScope, query, yearFilter, sort, direction, payrollPeriod, offset, classification, pageSize, semesterChoice]);
  const eligibility = useRegistryEligibility(profile ? profile.id : list?.items.map(r => r.id).join(",") ?? "", payrollPeriod, revision, !!access?.permissions.some(p => p.code === "scholars.read"), profile ? academicYearChoice || newRecordYear(years,[],"",profile.academicYearId) : yearFilter, profile ? receivingContexts[profile.id]?.semesterId ?? semesterChoice : semesterChoice);
  const [fields, setFields] = useState<ScholarFields>(blank),
    [reason, setReason] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck | null>(
    null,
  );
  const [confirmedSeparate, setConfirmedSeparate] = useState(false);
  const [duplicateReason, setDuplicateReason] = useState("");
  const reviewPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (duplicateCheck?.total) reviewPanel.current?.focus();
  }, [duplicateCheck]);
  function clearReview() {
    setDuplicateCheck(null);
    setConfirmedSeparate(false);
    setDuplicateReason("");
  }
  const busy = useRef(false),
    generation = useRef(0);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const restoreRegistryPosition = useRef(true);
  const invalidateOpen = useCallback(() => {
    generation.current++;
  }, []);
  const allowed = (code: string) =>
    access?.permissions.some((permission) => permission.code === code);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    (async () => {
      const permissions = await request<Access>("me/permissions", {
        signal: controller.signal,
      });
      if (!active) return;
      setAccess(permissions);
      if (
        !permissions.permissions.some(
          (permission) => permission.code === "scholars.read",
        )
      )
        return;
      const [data, yearChoices, barangayChoices] = await Promise.all([
        request<ScholarList>(
          `scholars?sort=${sort}&direction=${direction}&scope=${registryScope}&q=${encodeURIComponent(query)}&offset=${offset}&limit=${pageSize}&classification=${classification}${yearFilter ? "&scholarshipYearId=" + yearFilter : ""}`,
          { signal: controller.signal },
        ),
        choices("academic-years", controller.signal),
        choices("barangays", controller.signal),
      ]);
      if (!active) return;
      setList(data);
      setYears(yearChoices);
      setBarangays(barangayChoices);
    })()
      .catch((failure: unknown) => {
        if (active) setError(message(failure));
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
      invalidateOpen();
    };
  }, [query, offset, yearFilter, revision, invalidateOpen, registryScope, sort, direction, classification, pageSize]);
  useEffect(() => {
    if (editing || profile) {
      panel.current?.scrollIntoView({ behavior: "instant", block: "start" });
      panel.current?.focus({ preventScroll: true });
    }
  }, [editing, profile]);
  useEffect(() => {
    if (!requestedScholar) return;
    const controller = new AbortController();
    request<ScholarDetail>(`scholars/${encodeURIComponent(requestedScholar)}${route.get("academicYear")?`?contextAcademicYearId=${route.get("academicYear")}`:""}`, { signal: controller.signal }).then(row => {
      if (!controller.signal.aborted) { setProfile(row); setProfileSection(requestedSection); }
    }).catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, [requestedScholar, requestedSection, route]);
  useEffect(() => {
    if (loading || profile || requestedScholar || eligibility.loading || (!eligibility.data && !eligibility.error) || !restoreRegistryPosition.current) return;
    const frame = requestAnimationFrame(() => {
      restoreRegistryPosition.current = false;
      const target = sessionStorage.getItem("registry-focus");
      if (target) [...document.querySelectorAll<HTMLButtonElement>("[data-registry-action]")]
        .find(button => button.dataset.registryAction === target)?.focus({ preventScroll: true });
      window.scrollTo({ top: Number(sessionStorage.getItem("registry-scroll")) || 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, profile, requestedScholar, eligibility.loading, eligibility.data, eligibility.error]);
  function closeProfile() {
    if (document.querySelector("dialog[open][data-pending-location]")) return;
    generation.current++;
    setOpening(false);
    setProfile(null);
    setEditing(false);
    if (window.location.hash !== "#scholars") {
      window.history.pushState(null, "", "#scholars");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }
  function reset() {
    generation.current++;
    setError("");
    setNotice("");
    setProfile(null);
    setEditing(false);
    setOpening(false);
    setLoading(true);
    setList(null);
  }
  async function open(id: string, section = receivingTask ? "requirements" : "overview") {
    sessionStorage.setItem("registry-scroll",String(window.scrollY));
    sessionStorage.setItem("registry-focus", `${id}:${section === "requirements" ? "receive" : "view"}`);
    const token = ++generation.current;
    setOpening(true);
    setError("");
    setNotice("");
    setEditing(false);
    try {
      const row = await request<ScholarDetail>("scholars/" + id + (yearFilter?`?contextAcademicYearId=${yearFilter}`:""));
      if (generation.current === token) {
        setProfile(row);
        setAcademicYearChoice(yearFilter);
        if(yearFilter) setReceivingContexts(old=>({...old,[id]:{academicYearId:yearFilter}}));
        setProfileSection(section);
        window.history.pushState(null, "", scholarAddress(row.id, section, yearFilter));
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    } catch (failure) {
      if (generation.current === token) setError(message(failure));
    } finally {
      if (generation.current === token) setOpening(false);
    }
  }
  function edit(row: ScholarDetail | null) {
    setProfile(row);
    setFields(row ? asFields(row) : { ...blank, academicYearId: newRecordYear(years, [], "", "") });
    clearReview();
    setReason("");
    setError("");
    setNotice("");
    pending.current = null;
    setEditing(true);
  }
  function field<K extends keyof ScholarFields>(
    key: K,
    value: ScholarFields[K],
  ) {
    setFields((current) => ({ ...current, [key]: value }));
    clearReview();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    const path = profile ? "scholars/" + profile.id : "scholars";
    const body = {
      expectedVersion: profile?.version ?? 0,
      reason,
      fields,
      ...(!profile && duplicateCheck?.total && confirmedSeparate
        ? {
            duplicateResolution: {
              snapshot: duplicateCheck.snapshot,
              decision: "create_separate",
              reason: duplicateReason,
            },
          }
        : {}),
    };
    const signature = JSON.stringify({ path, body });
    const retry = pending.current?.signature === signature;
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (!profile && !retry && !duplicateCheck?.total) {
        const check = await request<DuplicateCheck>(
          "scholars/duplicate-check",
          { body: { fields }, csrf: session.csrfToken },
        );
        setDuplicateCheck(check);
        if (check.total) return;
      }
      if (
        !profile &&
        duplicateCheck?.total &&
        (!confirmedSeparate ||
          duplicateReason.trim().length < 10 ||
          duplicateCheck.total > 100)
      ) {
        setError(
          "Review the matches and explain why this is a separate person, or cancel.",
        );
        return;
      }
      if (!retry) pending.current = { signature, key: crypto.randomUUID() };
      const result = await request<ScholarResult>(path, {
        method: profile ? "PATCH" : "POST",
        body,
        csrf: session.csrfToken,
        key: pending.current!.key,
      });
      setEditing(false);
      setNotice(`${result.scholarId} saved.`);
      pending.current = null;
      // Refresh the profile independently: a read failure must never invite a second create.
      setProfile(null);
      setOpening(true);
      try {
        setProfile(await request<ScholarDetail>("scholars/" + result.id));
      } catch {
        setError(
          "The scholar was saved. Refresh the registry to open the profile.",
        );
      } finally {
        setOpening(false);
      }
      setLoading(true);
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(message(failure));
      if (
        failure instanceof ApiError &&
        ["DUPLICATE_REVIEW_REQUIRED", "DUPLICATE_REVIEW_LIMIT"].includes(
          failure.code,
        )
      ) {
        pending.current = null;
        clearReview();
        try {
          setDuplicateCheck(
            await request<DuplicateCheck>("scholars/duplicate-check", {
              body: { fields },
              csrf: session.csrfToken,
            }),
          );
        } catch (reviewFailure) {
          setError(message(reviewFailure));
        }
      }
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const availableYears = years.filter((year) => year.working !== false && !year.archived && !year.locked);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SCHOLAR RECORDS</div>
          <h1>Scholar registry</h1>
          <p>{receivingTask ? "Find a scholar to receive or review their documents." : "Find a scholar to view records or receive documents."}</p>
        </div>
        <button
          className="btn btn-outline-secondary quiet-button"
          disabled={loading || saving}
          onClick={() => {
            reset();
            setRevision((value) => value + 1);
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <ErrorNotice error={error} />
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {loading && <p role="status">Loading scholar registry…</p>}
      {!loading && access && !allowed("scholars.read") && (
        <div className="info-panel scholar-restricted">
          <ShieldCheck size={30} />
          <h2>Scholar access requires an operational role</h2>
          <p>
            Staff and Coordinators can view and maintain scholar records. Your
            current role does not include this access.
          </p>
          <a href="#access" className="text-link">
            Review my permissions
          </a>
        </div>
      )}
      {allowed("scholars.read") && (
        <>
          <div className="configuration-toolbar scholar-registry-toolbar" hidden={!!profile || editing}>
            <form
              className="configuration-search"
              onSubmit={(event) => {
                event.preventDefault();
                reset();
                setQuery(search);
                setOffset(0);
                setRevision((value) => value + 1);
              }}
            >
              <label className="visually-hidden" htmlFor="scholar-search">
                Search scholars
              </label>
              <input
                id="scholar-search"
                className="form-control"
                value={search}
                disabled={saving}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or Scholar ID"
                maxLength={160}
              />
              <button
                className="btn btn-outline-secondary"
                disabled={saving}
                aria-label="Search scholars"
              >
                <Search size={18} />
              </button>
            </form>
            <label className="scholar-year-filter">Classification<select className="form-select" aria-label="Classification" value={classification} onChange={e=>{setClassification(e.target.value);setOffset(0);}}><option value="all">All</option><option value="new">New</option><option value="continuing">Continuing</option><option value="unknown">Not recorded</option></select></label>
            {allowed("scholars.export") && <button className="btn btn-outline-secondary" onClick={()=>setExportOpen(true)}>Export</button>}
            <label className="scholar-year-filter">Sort by<select className="form-select" value={sort} onChange={e => { setSort(e.target.value); setOffset(0); }}>{[["name", "Name"], ["scholarId", "Scholar ID"], ["school", "School"], ["yearLevel", "Year Level"], ["classification", "New / Continuing"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="scholar-year-filter">Direction<select className="form-select" value={direction} onChange={e => { setDirection(e.target.value); setOffset(0); }}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
            <label className="scholar-year-filter"><span className="visually-hidden">Registry view</span><select className="form-select" value={registryScope} onChange={e => { setRegistryScope(e.target.value); setOffset(0); }}><option value="current">Current scholars</option><option value="graduated">Graduated / Archived</option><option value="all">All records</option></select></label>
            <label className="scholar-year-filter scholar-year-filter--year">
              <span className="visually-hidden">Filter scholarship year</span>
              <select
                className="form-select"
                value={yearFilter}
                disabled={saving}
                onChange={(event) => {
                  reset();
                  setYearFilter(event.target.value);
                  setPayrollPeriod("");setSemesterChoice("");
                  setOffset(0);
                }}
              >
                <option value="">All scholarship years</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.code}
                  </option>
                ))}
              </select>
            </label>
            {allowed("scholars.create") && (
              <button
                className="btn configuration-primary"
                disabled={
                  loading || saving || opening || !availableYears.length
                }
                onClick={() => edit(null)}
              >
                <Plus size={17} />
                Add scholar
              </button>
            )}
            {allowed("scholars.create") && (
              <button
                className="btn btn-outline-secondary"
                disabled={saving || opening}
                onClick={() => setShowImport((v) => !v)}
              >
                {showImport ? "Close import" : "Import Excel"}
              </button>
            )}
          </div>
          {showImport && !profile && !editing && allowed("scholars.create") && (
            <ScholarImport
              session={session}
              onImported={() => setRevision((n) => n + 1)}
            />
          )}
          {exportOpen && <FocusedDialog title="Export registry" onClose={()=>setExportOpen(false)}><p>This existing export uses registration year, independently of the scholarship-year view.</p><label>Registration year<select className="form-select" value={exportYear} onChange={e=>setExportYear(e.target.value)}><option value="">Choose registration year</option>{years.map(y=><option key={y.id} value={y.id}>{y.code}</option>)}</select></label><ExcelExport kind="scholars" session={session} academicYearId={exportYear||undefined} yearLabel={years.find(y=>y.id===exportYear)?.code} q={query}/></FocusedDialog>}
          {!loading && !availableYears.length && (
            <div className="notice">
              <GraduationCap size={22} />
              <div>
                <strong>An active academic year is needed.</strong>
                <span>
                  A System Administrator must add an unlocked academic year in
                  Configuration before new scholars can be entered.
                </span>
              </div>
            </div>
          )}
          {opening && <p role="status">Opening scholar profile…</p>}
          {(editing || profile) && (
            <div
              className="info-panel scholar-profile"
              ref={panel}
              tabIndex={-1}
            >
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    {profile?.scholarId ?? "NEW SCHOLAR"}
                  </div>
                  <h2>
                    {editing
                      ? profile
                        ? "Edit scholar"
                        : "Add scholar"
                      : profile?.displayName}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close scholar profile"
                  disabled={saving}
                  onClick={closeProfile}
                >
                  <X size={20} />
                </button>
              </div>
              {editing ? (
                <form onSubmit={save}>
                  <fieldset disabled={saving}>
                    <div className="row g-3">
                      {(
                        [
                          "firstName",
                          "middleName",
                          "lastName",
                          "suffix",
                        ] as const
                      ).map((key) => (
                        <div
                          className={
                            key === "suffix"
                              ? "col-md-2"
                              : key === "middleName"
                                ? "col-md-3"
                                : key === "firstName"
                                  ? "col-md-3"
                                  : "col-md-4"
                          }
                          key={key}
                        >
                          <label
                            className="form-label"
                            htmlFor={"scholar-" + key}
                          >
                            {
                              {
                                firstName: "First name",
                                middleName: "Middle name (optional)",
                                lastName: "Last name",
                                suffix: "Suffix (optional)",
                              }[key]
                            }
                          </label>
                          <input
                            id={"scholar-" + key}
                            className="form-control"
                            required={key === "firstName" || key === "lastName"}
                            maxLength={key === "suffix" ? 30 : 100}
                            value={fields[key]}
                            onChange={(event) => field(key, event.target.value)}
                          />
                        </div>
                      ))}
                      <div className="col-md-4">
                        <label className="form-label" htmlFor="scholar-year">
                          Registration academic year
                        </label>
                        <select
                          id="scholar-year"
                          className="form-select"
                          required
                          value={fields.academicYearId}
                          onChange={(event) =>
                            field("academicYearId", event.target.value)
                          }
                        >
                          <option value="">Select academic year</option>
                          {years
                            .filter(
                              (year) =>
                                (year.working !== false && !year.archived && !year.locked) ||
                                year.id === fields.academicYearId,
                            )
                            .map((year) => (
                              <option key={year.id} value={year.id}>
                                {year.code} · {year.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <details className="col-12" open={Boolean(profile)}><summary>Personal and contact details (optional)</summary><div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label" htmlFor="scholar-birth">
                          Birth date (optional)
                        </label>
                        <input
                          id="scholar-birth"
                          className="form-control"
                          type="date"
                          min="1900-01-01"
                          value={fields.birthDate ?? ""}
                          onChange={(event) =>
                            field("birthDate", event.target.value || null)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label
                          className="form-label"
                          htmlFor="scholar-barangay"
                        >
                          Barangay (optional)
                        </label>
                        <select
                          id="scholar-barangay"
                          className="form-select"
                          value={fields.barangayId ?? ""}
                          onChange={(event) =>
                            field("barangayId", event.target.value || null)
                          }
                        >
                          <option value="">Not recorded</option>
                          {barangays
                            .filter(
                              (barangay) =>
                                !barangay.archived ||
                                barangay.id === fields.barangayId,
                            )
                            .map((barangay) => (
                              <option key={barangay.id} value={barangay.id}>
                                {barangay.name}
                                {barangay.archived ? " (archived)" : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="scholar-email">
                          Email (optional)
                        </label>
                        <input
                          id="scholar-email"
                          className="form-control"
                          type="email"
                          maxLength={254}
                          value={fields.contact.email}
                          onChange={(event) =>
                            field("contact", {
                              ...fields.contact,
                              email: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="scholar-phone">
                          Phone (optional)
                        </label>
                        <input
                          id="scholar-phone"
                          className="form-control"
                          type="tel"
                          maxLength={40}
                          value={fields.contact.phone}
                          onChange={(event) =>
                            field("contact", {
                              ...fields.contact,
                              phone: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label" htmlFor="scholar-address">
                          Street / address details (optional)
                        </label>
                        <input
                          id="scholar-address"
                          className="form-control"
                          maxLength={300}
                          value={fields.contact.addressLine}
                          onChange={(event) =>
                            field("contact", {
                              ...fields.contact,
                              addressLine: event.target.value,
                            })
                          }
                        />
                      </div>
                      </div></details>
                      <RoutineEvidence ><div className="col-12">
                        <label className="form-label" htmlFor="scholar-reason">
                          Reason for change
                        </label>
                        <input
                          id="scholar-reason"
                          className="form-control"
                          required
                          minLength={5}
                          maxLength={500}
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                        />
                      </div></RoutineEvidence>
                    </div>
                    <p className="configuration-hint scholar-id-hint">
                      {profile
                        ? "The permanent Scholar ID and first-entry year stay unchanged when this record is edited."
                        : "The Scholar ID is assigned when saved. Its year comes from the selected academic year’s start date. Possible matches are checked before creation. A warning needs explicit review; records are never merged automatically."}
                    </p>
                    {!profile && duplicateCheck && duplicateCheck.total > 0 && (
                      <div
                        className="alert alert-warning mt-3"
                        ref={reviewPanel}
                        tabIndex={-1}
                        role="region"
                        aria-label="Possible duplicate scholars"
                      >
                        <h3>
                          Review possible matches ({duplicateCheck.total})
                        </h3>
                        <p>
                          A matching name or shared contact does not prove these
                          are the same person. Open an existing profile to
                          cancel this entry, or explain why a separate record is
                          needed.
                        </p>
                        <ul className="list-unstyled">
                          {duplicateCheck.candidates.map((candidate) => (
                            <li
                              key={candidate.id}
                              className="border-bottom py-3"
                            >
                              <strong>{candidate.displayName}</strong> -{" "}
                              {candidate.scholarId}
                              <div>
                                {candidate.likelihood === "likely"
                                  ? "Likely match"
                                  : "Possible match"}
                                : {candidate.reasons.join("; ")}
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary mt-2"
                                onClick={() => open(candidate.id)}
                              >
                                Cancel entry and open {candidate.scholarId}
                              </button>
                            </li>
                          ))}
                        </ul>
                        {duplicateCheck.total > 100 ? (
                          <p>
                            Too many matches to resolve here. Check the entered
                            details and contact the Coordinator.
                          </p>
                        ) : (
                          <>
                            <label
                              className="form-label"
                              htmlFor="duplicate-reason"
                            >
                              Why is this a separate person?
                            </label>
                            <textarea
                              id="duplicate-reason"
                              className="form-control"
                              minLength={10}
                              maxLength={500}
                              required
                              value={duplicateReason}
                              onChange={(event) =>
                                setDuplicateReason(event.target.value)
                              }
                            />
                            <label className="d-flex gap-2 mt-3">
                              <input
                                type="checkbox"
                                required
                                checked={confirmedSeparate}
                                onChange={(event) =>
                                  setConfirmedSeparate(event.target.checked)
                                }
                              />
                              <span>
                                I reviewed all listed matches and confirm this
                                is a separate person.
                              </span>
                            </label>
                            <p className="mt-2 mb-0">
                              Your decision and reason will be recorded in the
                              audit history.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                    <div className="configuration-form-actions">
                      <button
                        className="btn configuration-primary"
                        type="submit"
                      >
                        {saving
                          ? "Checking / saving..."
                          : profile
                            ? "Save scholar"
                            : duplicateCheck?.total
                              ? "Create separate scholar"
                              : "Check and create scholar"}
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                profile && (
                  <>
                    <div className="scholar-profile-meta">
                      <span className="soft-badge">
                        First entry · {profile.entryYear}
                      </span>
                      <span className="soft-badge neutral">
                        {profile.academicYear.code}
                      </span>
                    </div>
                    {profile.periodUnavailable && (
                      <div className="notice">
                        <ShieldCheck size={20} />
                        <div>
                          <strong>Registration period unavailable</strong>
                          <span>
                            This profile is readable. Editing is blocked because
                            its academic year is locked or archived.
                          </span>
                        </div>
                      </div>
                    )}
                    {profile.graduation && <p className="alert alert-info">{profile.graduation.label}{profile.graduation.semesterName && ` · ${profile.graduation.semesterName}`}</p>}
                    <ContinuingBaseline key={`baseline-${profile.id}`} scholarId={profile.id} />
                    {<ScholarAcademicSummary
                      key={`academic-summary-${profile.id}`}
                      scholarId={profile.id}
                      suppliedPlacement={profile.placement ?? undefined}
                      years={years}
                      academicYearId={academicYearChoice || newRecordYear(years, [], "", profile.academicYearId) || undefined}
                      refreshKey={`${profile.version}-${academicRevision}`}
                      onEdit={(yearId) => { setAcademicYearChoice(yearId); showSection("academic", yearId); }}
                    />}
                    <nav
                      aria-label="Scholar profile sections"
                      className="d-flex flex-wrap gap-2 my-3 profile-tabs"
                    >
                      {[
                        ["overview", "Overview"],
                        ["requirements", "Documents"],
                        ["academic", "Academic records"],
                        ["scholarship", "Scholarship"],
                        ["timeline", "History"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={profileSection === value}
                          className={`btn ${profileSection === value ? "configuration-primary" : "btn-outline-secondary"}`}
                          onClick={() => showSection(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>
                    {profileSection === "overview" && (
                      <>
                        <div className="profile-status-grid">
                         <section><h3>Requirements</h3><p><RegistryEligibilityCell state={eligibility} scholarId={profile.id} mode="requirements" /></p><button className="btn configuration-primary" onClick={() => showSection("requirements")}>Receive documents</button></section>
                         <section><h3>Academic assessment</h3><RegistryEligibilityCell state={eligibility} scholarId={profile.id} /></section>
                         <section><h3>Payout</h3><RegistryEligibilityCell state={eligibility} scholarId={profile.id} mode="payout" /></section>
                        </div>
                        <dl className="scholar-detail-grid">
                          {[
                            ["Birth date", profile.birthDate],
                            ["Barangay", profile.barangay?.name],
                            ["Email", profile.contact.email],
                            ["Phone", profile.contact.phone],
                            ["Address details", profile.contact.addressLine],
                            [
                              "Registration academic year",
                              profile.academicYear.name,
                            ],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>{value || "Not recorded"}</dd>
                            </div>
                          ))}
                        </dl>
                      </>
                    )}
                    {profileSection === "requirements" && access && (
                      route.get("document") ? <NotificationDocument scholarId={profile.id} instanceId={route.get("document")!} session={session} access={access} /> : <ScholarRequirements
                        key={`receiving-${profile.id}`}
                        scholarId={profile.id}
                        scholarLabel={`${profile.scholarId} - ${profile.displayName}`}
                        registrationYearId={profile.academicYearId}
                        session={session}
                        access={access}
                        savedContext={receivingContexts[profile.id]}
                        onContextChange={rememberReceiving}
                        onSetup={() => showSection("scholarship")}
                        onAcademicSetup={(yearId) => { setAcademicYearChoice(yearId); showSection("academic", yearId); }}
                      />
                    )}
                    {profileSection === "timeline" && (
                      <ScholarTimeline
                        key={`timeline-${profile.id}-${profile.version}`}
                        scholarId={profile.id}
                      />
                    )}
                    {profileSection === "academic" && access && (
                      <AcademicPanel
                        key={"academic-" + profile.id}
                        scholarId={profile.id}
                        session={session}
                        access={access}
                        years={years}
                        initialYearId={academicYearChoice || newRecordYear(years, [], "", profile.academicYearId)}
                        registrationYearId={profile.academicYearId}
                        onSaved={() => setAcademicRevision((value) => value + 1)}
                      />
                    )}
                    {profileSection === "scholarship" && access && (
                      <QualificationPanel
                        graduated={Boolean(profile.graduation)}
                        showRequirements={false}
                        key={`qualification-${profile.id}`}
                        scholarId={profile.id}
                        session={session}
                        access={access}
                        years={years}
                        initialYearId={academicYearChoice || newRecordYear(years, [], "", profile.academicYearId)}
                        registrationYearId={profile.academicYearId}
                        onYearChange={(yearId) => { setAcademicYearChoice(yearId); const next = scholarAddress(profile.id, "scholarship", yearId); const current = new URLSearchParams(window.location.hash.split("?")[1]); window.history.replaceState(null, "", next + (current.get("request") && current.get("academicYear") === yearId ? `&request=${current.get("request")}&version=${current.get("version") ?? ""}` : "")); }}
                      />
                    )}
                    <div className="configuration-form-actions">
                      {profileSection === "overview" &&
                        allowed("scholars.update") && (
                          <button
                            className="btn configuration-primary"
                            disabled={
                              saving || opening || profile.periodUnavailable
                            }
                            onClick={() => edit(profile)}
                          >
                            <Pencil size={16} />
                            Edit scholar
                          </button>
                        )}
                      <button
                        className="btn btn-outline-secondary quiet-button"
                        onClick={closeProfile}
                      >
                        <ArrowLeft size={16} />
                        Back to registry
                      </button>
                      {receivingContexts[profile.id]?.payoutCycleId && <a className="btn btn-outline-secondary" href={sessionStorage.getItem(`payroll-return-${receivingContexts[profile.id].payoutCycleId}`)?.startsWith("#payouts?") ? sessionStorage.getItem(`payroll-return-${receivingContexts[profile.id].payoutCycleId}`)! : `#payouts?${new URLSearchParams({cycle:receivingContexts[profile.id].payoutCycleId!})}`}>Return to payroll</a>}
                    </div>
                  </>
                )
              )}
            </div>
          )}
          {!loading && list && !profile && !editing && (
            <section hidden={!!profile || editing}
              className="info-panel configuration-list"
              aria-label="Scholar search results"
            >
              <div className="section-heading">
                <h2>Scholars</h2>
                <span className="soft-badge neutral">
                  {list.total} {list.total === 1 ? "record" : "records"}
                </span>
              </div>
              {!list.items.length ? (
                <div className="empty-state">
                  <GraduationCap size={32} />
                  <h3>
                    {query || yearFilter
                      ? "No matching scholars"
                      : "No scholars yet"}
                  </h3>
                  <p>
                    {query || yearFilter
                      ? "Try a different name, Scholar ID, or academic year."
                      : "Create the first scholar after your academic year is configured."}
                  </p>
                </div>
              ) : (
                <><div className="registry-period-toolbar"><label>Requirements semester<select className="form-select" value={semesterChoice || eligibility.data?.semesterId || ""} onChange={e=>{setSemesterChoice(e.target.value);setPayrollPeriod("");}}><option value="">Choose semester</option>{eligibility.data?.semesters?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                  <RegistryPeriodPicker state={eligibility} value={payrollPeriod} onChange={setPayrollPeriod} />
                  </div><div className="registry-table-scroll" role="region" aria-label="Scholar registry" tabIndex={0}><table className="table configuration-table registry-table">
                    <thead>
                      <tr>
                        <th>Scholar ID</th>
                        <th>Scholar name</th>
                        <th>School / Year</th>
                        <th>Classification</th>
                        <th>Requirements</th><th>Payout</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.items.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.scholarId}</strong>
                          </td>
                          <td><span className="registry-truncate" tabIndex={0} title={row.displayName}>{row.displayName}</span>{row.graduation && <small className="d-block">{row.graduation.label}</small>}</td>
                          <td><span className="registry-truncate" tabIndex={0} title={row.placement?.school ?? "Not recorded"}>{row.placement?.school ?? "Not recorded"}</span><small>{yearLevelLabel(row.placement?.yearLevel)}{row.placement?.provisional ? " · Provisional" : ""}</small></td>
                          <td>{row.placement?.classification === "continuing" ? "Continuing" : row.placement?.classification === "new" ? "New" : "Not recorded"}</td>
                          <td><RegistryEligibilityCell state={eligibility} scholarId={row.id} mode="requirements" /></td><td><RegistryEligibilityCell state={eligibility} scholarId={row.id} mode="payout" /></td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              disabled={saving || opening}
                              onClick={() => open(row.id)}
                              aria-label={"Open " + row.scholarId}
                              data-registry-action={`${row.id}:view`}
                            >
                              View
                            </button>
                            {allowed("requirements.receive") && <button className="btn btn-sm btn-outline-secondary" aria-label="Receive documents" data-registry-action={`${row.id}:receive`} disabled={saving || opening} onClick={() => open(row.id,"requirements")}>Receive</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></>
              )}
              <div className="configuration-pagination"><label>Rows<select aria-label="Rows per page" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setOffset(0);}}>{[25,50,100].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
                <span>
                  {list.total
                    ? `${offset + 1}–${offset + list.items.length} of ${list.total}`
                    : "0 records"}
                </span>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={saving || offset === 0}
                  onClick={() => {
                    reset();
                    setOffset(Math.max(0, offset - list.limit));
                  }}
                >
                  Previous
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={saving || offset + list.limit >= list.total}
                  onClick={() => {
                    reset();
                    setOffset(offset + list.limit);
                  }}
                >
                  Next
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
