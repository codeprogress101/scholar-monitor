import BackupStatus from "./BackupStatus";
import Notifications, { NotificationBell, useNotifications } from "./Notifications";
import { configurationRequest } from "./configuration-api";
import type { Access } from "../server/authorization/policy";
import { REPORTS } from "../server/reports/model";
import AuditPage from "./AuditPage";
import DashboardPage from "./DashboardPage";
import PayoutCyclesPage from "./PayoutCyclesPage";
import ReportsPage from "./ReportsPage";
import RequirementsPage from "./RequirementsPage";
import MasterlistsPage from "./MasterlistsPage";
import ScholarWorkspace from "./ScholarWorkspace";
import { routeChangeTracker } from "./scholar-navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  LayoutGrid,
  ListChecks,
  MapPin,
  Menu,
  Milestone,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { fetchHealth, type Health } from "./api";
import AccessPage from "./AccessPage";
import ConfigurationPage from "./ConfigurationPage";
import AdmissionReview from "./AdmissionReview";
import roadmap from "./roadmap.json";
import type { Session } from "./auth-api";

type Page =
  | "notifications"
  | "overview"
  | "roadmap"
  | "status"
  | "guide"
  | "access"
  | "configuration"
  | "scholars"
  | "admissions"
  | "masterlists"
  | "continuing"
  | "requirements"
  | "payouts"
  | "reports"
  | "dashboard"
  | "audit";
const navigation = [
  { id: "notifications" as const, label: "Notifications", icon: ListChecks },
  { id: "access" as const, label: "My access", icon: ShieldCheck },
  { id: "dashboard" as const, label: "Home", icon: LayoutGrid },
  { id: "overview" as const, label: "About the workspace", icon: LayoutGrid },
  { id: "scholars" as const, label: "Scholar registry", icon: Users },
  { id: "admissions" as const, label: "Admission review", icon: ClipboardCheck },
  { id: "continuing" as const, label: "Continuing scholars", icon: Users },
  {
    id: "masterlists" as const,
    label: "Masterlists",
    icon: ClipboardCheck,
  },
  {
    id: "requirements" as const,
    label: "Document policies",
    icon: FileCheck2,
  },
  { id: "payouts" as const, label: "Payroll", icon: Wallet },
  { id: "reports" as const, label: "Reports", icon: ListChecks },
  { id: "audit" as const, label: "Audit events", icon: ShieldCheck },
  { id: "configuration" as const, label: "Configuration", icon: Settings2 },
  { id: "roadmap" as const, label: "Implementation plan", icon: Milestone },
  { id: "status" as const, label: "System status", icon: Server },
  { id: "guide" as const, label: "Workspace guide", icon: BookOpen },
];
const modules = [
  {
    name: "Scholar registry",
    text: "One permanent identity. A complete academic journey.",
    icon: Users,
    range: "F04–F09",
  },
  {
    name: "Official masterlists",
    text: "Prepare, verify, and preserve each official version.",
    icon: ClipboardCheck,
    range: "F10–F12",
  },
  {
    name: "Requirements",
    text: "Track physical documents from receipt to verification.",
    icon: FileCheck2,
    range: "F13–F17",
  },
  {
    name: "Payout management",
    text: "Clear eligibility and accountable semester payouts.",
    icon: Wallet,
    range: "F18–F26",
  },
];

function initialPage(): Page {
  const hash = window.location.hash.slice(1).split("?")[0];
  if (hash === "continuing") return "scholars";
  return navigation.some((item) => item.id === hash)
    ? (hash as Page)
    : "dashboard";
}

export default function App({
  session,
  onLogout,
  signingOut,
}: {
  session: Session;
  onLogout: () => void;
  signingOut: boolean;
}) {
  const [access, setAccess] = useState<Access | null>(null);
  useEffect(() => { const controller = new AbortController(); configurationRequest<Access>("me/permissions", { signal: controller.signal }).then(setAccess).catch(() => {}); return () => controller.abort(); }, []);
  const can = (permission: string) => access?.permissions.some(p => p.code === permission) ?? false;
  const daily = ["dashboard", ...(can("scholars.read") ? ["scholars", "admissions"] : []), ...(can("ovr.prepare") ? ["payouts"] : []), ...(can("masterlists.prepare") ? ["masterlists"] : []), ...(Object.values(REPORTS).some(report => can(report.permission)) ? ["reports"] : [])];
  const tools = ["access", ...(can("configuration.read") ? ["requirements", "configuration"] : []), ...(can("audit.view_all") || can("audit.view_limited") ? ["audit"] : []), "status", "roadmap", "overview", ...(can("configuration.manage") && !can("ovr.prepare") ? ["payouts"] : [])];
  const [page, setPage] = useState<Page>(initialPage);
  const [locationHash, setLocationHash] = useState(window.location.hash);
  const routeTracker = useRef(routeChangeTracker(window.location.hash));
  const notificationQuery = page === "dashboard" ? "mode=pending" : page === "notifications" ? (locationHash.split("?")[1] || "mode=updates") : "mode=updates";
  const notificationFeed = useNotifications(session.user.id, notificationQuery, !signingOut);
  useEffect(() => {
    const id = new URLSearchParams(locationHash.split("?")[1]).get("request");
    if (!id) return;
    function focusRequest() {
      const target = document.getElementById(`request-${id}`);
      if (!target) return false;
      let parent: HTMLElement | null = target;
      while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
      target.tabIndex = -1; target.focus({preventScroll:true}); target.scrollIntoView({block:"center"});
      return true;
    }
    if (focusRequest()) return;
    const observer = new MutationObserver(() => { if (focusRequest()) observer.disconnect(); });
    observer.observe(document.body,{childList:true,subtree:true});
    return () => observer.disconnect();
  }, [locationHash]);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 650);
  function closeNavigation() {
    setMenuOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".mobile-toggle")?.focus());
  }
  useEffect(() => {
    const resize = () => { setIsMobile(window.innerWidth <= 650); if (window.innerWidth > 650) setMenuOpen(false); };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") closeNavigation(); };
    if (menuOpen) {
      window.addEventListener("keydown", close);
      document.querySelector<HTMLAnchorElement>("#primary-navigation a")?.focus();
    }
    return () => { window.removeEventListener("keydown", close); };
  }, [menuOpen]);
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(true);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);
  const [failure, setFailure] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [phase, setPhase] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const routeChanged = routeTracker.current;
    const onHash = () => {
      // Window hash listeners can run before a modal's listener. Preserve an
      // unresolved command before changing the route or remounting its owner.
      const pendingLocation = document.querySelector<HTMLElement>("[data-pending-location]")?.dataset.pendingLocation;
      if (pendingLocation !== undefined) {
        window.history.replaceState(null, "", pendingLocation);
        return;
      }
      if (!routeChanged(window.location.hash)) return;
      setLocationHash(window.location.hash);
      // Profiles remember their context with replaceState, which emits no
      // hashchange. A real navigation must still reset the destination screen.
      setNavigationRevision((value) => value + 1);
      setPage(initialPage());
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let active = true;
    fetchHealth(controller.signal)
      .then((data) => {
        if (active) {
          setHealth(data);
          setFailure(false);
        }
      })
      .catch(() => {
        if (active) {
          setHealth(null);
          setFailure(true);
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) { setChecking(false); setHealthCheckedAt(new Date().toISOString()); }
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [refresh]);

  function recheck() {
    setChecking(true);
    setFailure(false);
    setRefresh((value) => value + 1);
  }
  const serviceLabel = checking
    ? "Checking service"
    : failure
      ? "Service unavailable"
      : "Service connected";
  const filtered = roadmap.filter(
    (item) =>
      (phase === "all" || item.phase === phase) &&
      `${item.id} ${item.title}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeNavigation}
        />
      )}
      <aside
        id="primary-navigation"
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
        inert={isMobile && !menuOpen}
      >
        <a href="#dashboard" className="brand">
          <span className="brand-mark">
            <GraduationCap size={29} strokeWidth={1.5} />
          </span>
          <span>
            LDSS<span className="brand-subtitle">SCHOLARSHIP MONITOR</span>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={closeNavigation}
        >
          <X size={22} />
        </button>
        <div className="sidebar-rule" />
        <div className="nav-label">DAILY WORK</div>
        <nav className="nav flex-column main-nav">
          {navigation.filter(item => daily.includes(item.id)).map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              onClick={() => setMenuOpen(false)}
              href={`#${id}`}
              className={`nav-link ${page === id ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {page === id && <span className="active-dot" />}
            </a>
          ))}
        </nav>
        <a className={`nav-link help-link ${page === "guide" ? "active" : ""}`} href="#guide" aria-current={page === "guide" ? "page" : undefined}><BookOpen size={18} /> Help & workflow guide</a>
        <details className="nav-tools" open={tools.includes(page) ? true : undefined}>
          <summary>Setup & administration</summary>
          <nav className="nav flex-column main-nav" aria-label="Setup and administration">
            {navigation.filter(item => tools.includes(item.id)).map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className={`nav-link ${page === id ? "active" : ""}`} aria-current={page === id ? "page" : undefined}><Icon size={18} /><span>{label}</span></a>)}
          </nav>
        </details>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span className="small-dot" /> SCHOLARSHIP WORKSPACE
          </div>
          <div className="municipality">
            <span className="municipality-icon">
              <MapPin size={18} />
            </span>
            <div>
              Municipality of Daet<small>Camarines Norte, Philippines</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace-body" inert={menuOpen}>
        <header className="topbar">
          <div className="breadcrumb-row">
            <button
              className="mobile-toggle icon-button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={23} />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={14} />
            <span>{navigation.find((item) => item.id === page)?.label}</span>
          </div>
          <div className="topbar-right">
            <NotificationBell feed={notificationFeed} />
            <span className="signed-in-name">{session.user.fullName}{access && <small className="d-block">{access.roles.map(role => role.label).join(" · ") || "No role assigned"}</small>}</span>
            <div className="topbar-divider" />
            <button
              className="sign-out-button"
              onClick={onLogout}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          {page === "access" && <AccessPage session={session} />}
            {page === "masterlists" && <MasterlistsPage key={`${locationHash}-${navigationRevision}`} session={session} />}
          {page === "scholars" && <ScholarWorkspace key={`scholars-${navigationRevision}-${locationHash}`} session={session} access={access} />}
          {page === "admissions" && <AdmissionReview key={`admissions-${navigationRevision}-${locationHash}`} session={session} />}
          {page === "audit" && <AuditPage session={session} />}
          {page === "dashboard" && <DashboardPage />}
          {page === "notifications" && <Notifications feed={notificationFeed} session={session} query={notificationQuery} onQuery={q => { window.location.hash = "notifications?" + q; }} />}
          {page === "reports" && <ReportsPage key={`reports-${navigationRevision}-${locationHash}`} />}
          {page === "payouts" && <PayoutCyclesPage session={session} />}
          {page === "requirements" && <RequirementsPage session={session} />}
          {page === "configuration" && <ConfigurationPage key={`configuration-${navigationRevision}`} session={session} />}
          {page === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    LGU-DAET EXPANDED SCHOLARSHIP PROGRAM
                  </div>
                  <h1>A workspace for brighter futures.</h1>
                  <p>
                    Every scholar’s journey deserves a clear, reliable record.
                  </p>
                </div>
                <a
                  className="btn btn-outline-secondary quiet-button"
                  href="#guide"
                >
                  <BookOpen size={16} /> Workspace guide
                </a>
              </div>

              <section
                className="welcome-panel"
                aria-labelledby="welcome-title"
              >
                <div className="welcome-content">
                  <div className="welcome-kicker">
                    <span /> BUILT AROUND YOUR SCHOLARS
                  </div>
                  <h2 id="welcome-title">
                    Better records.
                    <br />
                    Stronger support.
                  </h2>
                  <p>
                    A shared home for the people, documents, and decisions
                    behind Daet’s scholarship program.
                  </p>
                  <a href="#status" className="btn welcome-button">
                    View setup status <ArrowRight size={17} />
                  </a>
                  <div className="welcome-footnote">
                    <ShieldCheck size={15} /> Designed for accountable
                    scholarship administration
                  </div>
                </div>
                <div className="journey-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-star star-one">✦</div>
                  <div className="art-star star-two">✧</div>
                  <div className="art-dots" />
                  <div className="scholar-card">
                    <div className="scholar-card-top">
                      <span className="mini-seal">
                        <GraduationCap size={22} />
                      </span>
                      <span>
                        LGU-DAET<span>SCHOLARSHIP PROGRAM</span>
                      </span>
                      <span className="card-year">LDSS</span>
                    </div>
                    <div className="scholar-art-avatar">
                      <GraduationCap size={43} strokeWidth={1.3} />
                    </div>
                    <div className="art-line long" />
                    <div className="art-line short" />
                    <div className="card-record">
                      <span className="record-icon">
                        <Check size={15} />
                      </span>
                      Every journey matters.
                    </div>
                  </div>
                  <div className="floating-tag">
                    <span>
                      <HeartHandshake size={20} />
                    </span>
                    <div>
                      Opportunity, supported.
                      <small>From first entry to graduation</small>
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="foundation-strip"
                aria-label="Current implementation checkpoint"
              >
                <div className="checkpoint-icon">
                  <CheckCheck size={22} />
                </div>
                <div className="checkpoint-copy">
                  <strong>Scholar profile timelines are ready</strong>
                  <span>
                    Submit payout rosters for review and freeze validated
                    membership with Coordinator finalization.
                  </span>
                </div>
                <span className="soft-badge">F26 · Current checkpoint</span>
                <a href="#roadmap" aria-label="Explore the implementation plan">
                  <ArrowRight size={21} />
                </a>
              </section>

              <section
                className="modules-section"
                aria-labelledby="modules-title"
              >
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">ONE CONNECTED WORKFLOW</div>
                    <h2 id="modules-title">
                      The essentials, brought together.
                    </h2>
                  </div>
                  <a href="#roadmap" className="text-link">
                    Explore the plan <ArrowRight size={15} />
                  </a>
                </div>
                <div className="row g-3">
                  {modules.map(({ name, text, icon: Icon, range }, index) => (
                    <div className="col-sm-6 col-xl-3" key={name}>
                      <a
                        className={`module-card module-${index}`}
                        href={
                          index === 0
                            ? "#scholars"
                            : index === 1
                              ? "#masterlists"
                              : index === 2
                                ? "#requirements"
                                : "#payouts"
                        }
                      >
                        <span className="module-icon">
                          <Icon size={23} strokeWidth={1.6} />
                        </span>
                        <span className="module-state">
                          {index < 3 ? "AVAILABLE" : "CYCLES AVAILABLE"}
                        </span>
                        <h3>{name}</h3>
                        <p>{text}</p>
                        <div className="module-footer">
                          <span>{range}</span>
                          <ArrowRight size={16} />
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              <div className="row g-4 bottom-panels">
                <section className="col-lg-7">
                  <div className="info-panel">
                    <div className="panel-heading">
                      <span className="subtle-icon">
                        <ListChecks size={20} />
                      </span>
                      <h2>A thoughtful start.</h2>
                      <span className="soft-badge neutral">Getting ready</span>
                    </div>
                    <div className="step-row">
                      <span className="step-number done">
                        <Check size={15} />
                      </span>
                      <div>
                        <h3>Establish the workspace</h3>
                        <p>
                          Application structure and a connected service layer.
                        </p>
                      </div>
                      <span className="step-label">This release</span>
                    </div>
                    <div className="step-row">
                      <span className="step-number">02</span>
                      <div>
                        <h3>Use individual account access</h3>
                        <p>
                          Your identity is checked on every authenticated
                          request.
                        </p>
                      </div>
                      <span className="step-label">This release</span>
                    </div>
                    <div className="step-row">
                      <span className="step-number">03</span>
                      <div>
                        <h3>Use the scholar registry</h3>
                        <p>Permanent Scholar IDs and authoritative records.</p>
                      </div>
                      <span className="step-label">This release</span>
                    </div>
                  </div>
                </section>
                <section className="col-lg-5">
                  <div className="principles-panel">
                    <div className="principle-icon">
                      <ShieldCheck size={26} strokeWidth={1.4} />
                    </div>
                    <div className="eyebrow">TRUST IN EVERY RECORD</div>
                    <h2>History stays. Accountability grows.</h2>
                    <p>
                      Permanent identities, preserved history, and explicit
                      approvals are at the heart of this workspace.
                    </p>
                    <a href="#guide" className="text-link">
                      Our working principles <ArrowRight size={15} />
                    </a>
                  </div>
                </section>
              </div>
            </>
          )}

          {page === "roadmap" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SMALL STEPS. SOUND FOUNDATIONS.</div>
                  <h1>Implementation plan</h1>
                  <p>
                    37 checkpoints, each with its own rules, tests, and
                    acceptance gate.
                  </p>
                </div>
                <a
                  className="btn btn-outline-secondary quiet-button"
                  href="/api/v1/implementation-plan"
                  download
                >
                  <ArrowDownToLine size={16} /> Download plan
                </a>
              </div>
              <div className="notice">
                <ShieldCheck size={21} />
                <div>
                  <strong>One function at a time.</strong>
                  <span>
                    F00 through F35 are accepted. F36 prepares acceptance
                    testing and production release checks. Later functions
                    remain planned until implementation, testing, and
                    acceptance.
                  </span>
                </div>
              </div>
              <div className="roadmap-toolbar">
                <div>
                  <label htmlFor="search" className="form-label">
                    Find a checkpoint
                  </label>
                  <input
                    id="search"
                    className="form-control"
                    placeholder="Search by name or ID…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="phase" className="form-label">
                    Phase
                  </label>
                  <select
                    id="phase"
                    className="form-select"
                    value={phase}
                    onChange={(event) => setPhase(event.target.value)}
                  >
                    <option value="all">All phases</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Scholar records">Scholar records</option>
                    <option value="Official records">Official records</option>
                    <option value="Payouts">Payouts</option>
                    <option value="Operations">Operations</option>
                    <option value="Assurance">Assurance</option>
                  </select>
                </div>
                <span className="result-count" aria-live="polite">
                  {filtered.length} checkpoints
                </span>
              </div>
              <div className="roadmap-list">
                {filtered.map((item) => (
                  <article
                    className={`roadmap-item ${item.id === "F36" ? "current" : ""}`}
                    key={item.id}
                  >
                    <span className="roadmap-id">{item.id}</span>
                    <div>
                      <span className="roadmap-phase">{item.phase}</span>
                      <h2>{item.title}</h2>
                    </div>
                    <span
                      className={`soft-badge ${item.id === "F36" ? "" : "neutral"}`}
                    >
                      {item.id === "F36"
                        ? "Current release"
                        : [
                              "F00",
                              "F01",
                              "F02",
                              "F03",
                              "F04",
                              "F05",
                              "F06",
                              "F07",
                              "F08",
                              "F09",
                              "F10",
                              "F11",
                              "F12",
                              "F13",
                              "F14",
                              "F15",
                              "F16",
                              "F17",
                              "F18",
                              "F19",
                              "F20",
                              "F21",
                              "F22",
                              "F23",
                              "F24",
                              "F25",
                              "F26",
                              "F27",
                              "F28",
                              "F29",
                              "F30",
                              "F31",
                              "F32",
                              "F33",
                              "F34",
                              "F35",
                            ].includes(item.id)
                          ? "Accepted"
                          : "Planned"}
                    </span>
                    {item.id === "F36" ? (
                      <Check size={17} />
                    ) : (
                      <Circle size={12} />
                    )}
                  </article>
                ))}
                {filtered.length === 0 && (
                  <div className="empty-state">
                    <ListChecks size={32} />
                    <h2>No matching checkpoints</h2>
                    <p>Try a different name, ID, or phase.</p>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setQuery("");
                        setPhase("all");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {page === "status" && (
            <section className="admin-workspace">
              <div className="page-heading"><div><h1>System status</h1><p>Live checks for this installation.</p></div><button className="btn configuration-primary" onClick={recheck} disabled={checking}><RefreshCw size={16} className={checking ? "spin" : ""}/>{checking ? "Checking..." : "Check again"}</button></div>
              <dl className="admin-facts">
                <div><dt>Application service</dt><dd><strong>{checking ? "Checking" : failure ? "Unavailable" : health ? "Connected" : "Not checked"}</strong></dd></div>
                <div><dt>Database connection</dt><dd><strong>{checking ? "Checking" : failure ? "Not confirmed" : health?.database === "connected" ? "Connected" : health?.database === "unavailable" ? "Unavailable" : health?.database === "not_configured" ? "Not configured" : "Unknown"}</strong></dd></div>
              </dl>
              {failure && <p role="alert" className="alert alert-danger">The service check failed. Check that the application server is running, then try again.</p>}
              {healthCheckedAt && <p className="text-muted">Last check: {new Date(healthCheckedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})} (Manila)</p>}
              <p className="text-muted">Connection checks do not establish deployment readiness or office acceptance.</p>
              {can("roles.manage") && <BackupStatus />}
              <details className="secondary-details"><summary>Technical details</summary>
                <dl className="admin-facts"><div><dt>Release</dt><dd>{health?.release ?? "Not reported"}</dd></div><div><dt>Checkpoint</dt><dd>{health?.checkpoint ?? "Not reported"}</dd></div></dl>
                <pre className="admin-technical">{health ? JSON.stringify(health,null,2) : "No service response available."}</pre>
                <a href="#guide">Setup guide</a>
              </details>
            </section>
          )}

          {page === "guide" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">GET TO KNOW DAILY WORK</div>
                  <h1>How to use the workspace</h1>
                  <p>
                    Start with a scholar, then follow the next action shown.
                  </p>
                </div>
              </div>
              {can("scholars.read") && <nav className="task-grid" aria-label="Workflow shortcuts">
                <a href="#scholars?task=receive"><strong>1. Receive documents</strong><span>Search for a scholar, select the semester, and tick the documents received.</span></a>
                <a href="#scholars?task=receive"><strong>2. Review the scholar</strong><span>Verify COR and COG, check school and year level, then record academic findings.</span></a>
                <a href="#payouts"><strong>3. Prepare payroll</strong><span>Open the semester and batch. Review blocked cases, preview, then submit after cutoff.</span></a>
              </nav>}
              <p className="next-step">Staff records and reviews documents. The Coordinator handles authorized approvals. System Administrators manage accounts and setup.</p>
              <div className="row g-4 guide-grid">
                {[
                  { icon: Users, title: "1. Find or register a scholar", text: "Search the registry first. For a new person, enter their name and current academic year. Contact details can be added later.", href: "#scholars", link: "Open scholar registry" },
                  { icon: GraduationCap, title: "2. Validate admission and prepare the masterlist", text: "Staff validates the prior qualification of new applicants; the Coordinator selects them. Continuing scholars use an accepted roster. Add eligible scholars to the annual masterlist, then complete its review and publication.", href: "#admissions", link: "Open admission review" },
                  { icon: FileCheck2, title: "3. Receive and verify documents", text: "Open the scholar, then Receive requirements. Use the open semester, record COR and COG separately, verify the papers, and review academic findings. School, course and year level come from Academic records.", href: "#scholars?task=receive", link: "Receive documents" },
                  { icon: Wallet, title: "4. Review and release payroll", text: "Open Payroll, choose the semester and batch. Eligible scholars appear automatically. Resolve missing records, preview the payroll, then follow the available approval and release actions. Printing does not record a payment.", href: "#payouts", link: "Open payroll" },
                  { icon: RefreshCw, title: "Corrections and changes", text: "Use document correction for replacement papers, Academic records for school/course/year changes, and Scholarship records for standing or graduation. Required decisions preserve the original history.", href: "#scholars", link: "Find a scholar" },
                  { icon: ListChecks, title: "Progress and history", text: "Home shows current work. Reports summarize the selected semester. History sections contain earlier receipts and decisions. Staff prepare records; Coordinators make authorized scholarship decisions.", href: "#reports", link: "Open reports" },
                ].map(({ icon: Icon, title, text, href, link }) => (
                  <section className="col-md-6" key={title}><div className="guide-card">
                    <Icon size={24} strokeWidth={1.5} /><h2>{title}</h2><p>{text}</p><a href={href}>{link}</a>
                  </div></section>
                ))}
              </div>
              {can("configuration.manage") && <details className="secondary-details"><summary>Technical installation guide</summary><section className="info-panel setup-panel">
                <h2>Run this workspace locally</h2>
                <p>
                  Start MySQL in XAMPP. From the project folder, use Node.js
                  22.12 or newer:
                </p>
                <pre>
                  <code>
                    npm ci{"\n"}npm run setup:local{"\n"}npm run db:migrate
                    {"\n"}npm run dev
                  </code>
                </pre>
                <p>
                  Run setup only once on a fresh installation; it creates a
                  dedicated local database. Open{" "}
                  <a href="http://127.0.0.1:5173">http://127.0.0.1:5173</a>.
                  Development runs the interface and API together. See the
                  repository README for environment configuration and
                  verification commands.
                </p>
                <a href="#status" className="text-link">
                  Check the service connection <ArrowRight size={15} />
                </a>
              </section></details>}
            </>
          )}

          <footer className="workspace-footer">
            <span>LGU-Daet Expanded Scholarship Program</span>
            <span>
              <ShieldCheck size={13} /> Purpose-built for public service.
            </span>
          </footer>
        </main>
        <div className="service-footer">
          <span
            className={`small-dot ${failure ? "is-error" : checking ? "is-pending" : ""}`}
          />
          <span role="status">{serviceLabel}</span>
          <span>·</span>
          <a href="#guide">Help & workflow guide</a>
        </div>
      </div>
    </div>
  );
}
