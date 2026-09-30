import { useEffect, useState } from "react";
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
  LockKeyhole,
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
import ScholarsPage from "./ScholarsPage";
import roadmap from "./roadmap.json";
import type { Session } from "./auth-api";

type Page =
  | "overview"
  | "roadmap"
  | "status"
  | "guide"
  | "access"
  | "configuration"
  | "scholars";
const navigation = [
  { id: "access" as const, label: "My access", icon: ShieldCheck },
  { id: "overview" as const, label: "Overview", icon: LayoutGrid },
  { id: "scholars" as const, label: "Scholar registry", icon: Users },
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
    range: "F18–F25",
  },
];

function initialPage(): Page {
  const hash = window.location.hash.slice(1);
  return navigation.some((item) => item.id === hash)
    ? (hash as Page)
    : "overview";
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
  const [page, setPage] = useState<Page>(initialPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(true);
  const [failure, setFailure] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [phase, setPhase] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#main-content") return;
      setPage(initialPage());
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
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
        if (active) setChecking(false);
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
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="primary-navigation"
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <a href="#overview" className="brand">
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
          onClick={() => setMenuOpen(false)}
        >
          <X size={22} />
        </button>
        <div className="sidebar-rule" />
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav className="nav flex-column main-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
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
        <div className="nav-label modules-label">
          SCHOLARSHIP OPERATIONS <LockKeyhole size={12} />
        </div>
        <div className="future-nav">
          {modules
            .filter((item) => item.name !== "Scholar registry")
            .map(({ name, icon: Icon }) => (
              <a href="#roadmap" key={name}>
                <Icon size={18} strokeWidth={1.6} />
                <span>{name}</span>
                <ChevronRight size={13} />
              </a>
            ))}
          <div className="upcoming-note">Available in upcoming checkpoints</div>
        </div>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span className="small-dot" /> SCHOLAR REGISTRY <span>0.7</span>
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

      <div className="workspace-body">
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
            <span className="signed-in-name">{session.user.fullName}</span>
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
          {page === "access" && <AccessPage />}
          {page === "scholars" && <ScholarsPage session={session} />}
          {page === "configuration" && <ConfigurationPage session={session} />}
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
                  <strong>Annual qualification is ready</strong>
                  <span>
                    Record exam passage and Coordinator decisions for each
                    academic year, with a permanent qualification history.
                  </span>
                </div>
                <span className="soft-badge">F06 · Current checkpoint</span>
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
                        href={index === 0 ? "#scholars" : "#roadmap"}
                      >
                        <span className="module-icon">
                          <Icon size={23} strokeWidth={1.6} />
                        </span>
                        <span className="module-state">
                          {index === 0 ? "REGISTRY AVAILABLE" : "PLANNED"}
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
                    F00 through F05 are accepted. F06 adds annual qualification.
                    Later functions remain planned until implementation,
                    testing, and acceptance.
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
                    className={`roadmap-item ${item.id === "F06" ? "current" : ""}`}
                    key={item.id}
                  >
                    <span className="roadmap-id">{item.id}</span>
                    <div>
                      <span className="roadmap-phase">{item.phase}</span>
                      <h2>{item.title}</h2>
                    </div>
                    <span
                      className={`soft-badge ${item.id === "F06" ? "" : "neutral"}`}
                    >
                      {item.id === "F06"
                        ? "Current release"
                        : ["F00", "F01", "F02", "F03", "F04", "F05"].includes(
                              item.id,
                            )
                          ? "Accepted"
                          : "Planned"}
                    </span>
                    {item.id === "F06" ? (
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
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">WORKSPACE READINESS</div>
                  <h1>System status</h1>
                  <p>A live service check and a clear view of what is ready.</p>
                </div>
                <button
                  className="btn btn-outline-secondary quiet-button"
                  onClick={recheck}
                  disabled={checking}
                >
                  <RefreshCw size={16} className={checking ? "spin" : ""} />
                  {checking ? "Checking…" : "Check again"}
                </button>
              </div>
              <section
                className={`service-banner ${failure ? "service-failed" : ""}`}
                aria-live="polite"
              >
                <span className="service-banner-icon">
                  <Server size={27} />
                </span>
                <div>
                  <h2>{serviceLabel}</h2>
                  <p>
                    {checking
                      ? "Contacting the application service…"
                      : failure
                        ? "The API could not be reached. Start the server, then check again."
                        : "The application API is responding. This confirms service availability only."}
                  </p>
                </div>
                <span className={`status-dot ${failure ? "is-error" : ""}`} />
              </section>
              <div className="status-grid">
                <section className="info-panel">
                  <div className="panel-heading">
                    <Settings2 size={20} />
                    <h2>Readiness checklist</h2>
                  </div>
                  {[
                    {
                      title: "Application interface",
                      detail: "The workspace is loaded in your browser.",
                      state: "Available",
                    },
                    {
                      title: "Application service",
                      detail: "/api/v1/health",
                      state: checking
                        ? "Checking"
                        : failure
                          ? "Unavailable"
                          : "Connected",
                    },
                    {
                      title: "Individual accounts",
                      detail: "Authentication and secure sessions · F01",
                      state: "Available",
                    },
                    {
                      title: "Role permissions",
                      detail:
                        "Staff, Coordinator, and System Administrator · F02",
                      state: "Available",
                    },
                    {
                      title: "Scholar registry",
                      detail:
                        "Permanent IDs and scholar profiles for Staff and Coordinators · F04",
                      state: "Available",
                    },
                    {
                      title: "Reference configuration",
                      detail:
                        "Academic periods, shared lists, and program settings · F03",
                      state: "Available",
                    },
                    {
                      title: "XAMPP database",
                      detail: "MariaDB / MySQL - live connection check",
                      state: checking
                        ? "Checking"
                        : health?.database === "connected"
                          ? "Connected"
                          : health?.database === "unavailable"
                            ? "Unavailable"
                            : health?.database === "not_configured"
                              ? "Not configured"
                              : "Unknown",
                    },
                  ].map((item) => (
                    <div className="readiness-row" key={item.title}>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                      </div>
                      <span
                        className={`soft-badge ${["Available", "Connected"].includes(item.state) ? "" : "neutral"}`}
                      >
                        {item.state}
                      </span>
                    </div>
                  ))}
                </section>
                <section className="info-panel release-panel">
                  <div className="eyebrow">CURRENT DELIVERY</div>
                  <h2>Authentication & individual accounts</h2>
                  <p>
                    Individual accounts, server-managed sessions, and controlled
                    password recovery.
                  </p>
                  <dl>
                    <div>
                      <dt>Checkpoint</dt>
                      <dd>{health?.checkpoint ?? "F06"}</dd>
                    </div>
                    <div>
                      <dt>Release</dt>
                      <dd>{health?.release ?? "0.7.0"}</dd>
                    </div>
                    <div>
                      <dt>Record storage</dt>
                      <dd>Not yet enabled</dd>
                    </div>
                    <div>
                      <dt>Acceptance</dt>
                      <dd>Pending review</dd>
                    </div>
                  </dl>
                  <a href="#guide" className="text-link">
                    Read the setup guide <ArrowRight size={15} />
                  </a>
                </section>
              </div>
            </>
          )}

          {page === "guide" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">GET TO KNOW YOUR WORKSPACE</div>
                  <h1>Made for the work that matters.</h1>
                  <p>
                    A practical guide to this first release and the principles
                    behind it.
                  </p>
                </div>
              </div>
              <section className="guide-intro">
                <span className="module-icon">
                  <BookOpen size={27} />
                </span>
                <div>
                  <h2>Welcome to your individual workspace.</h2>
                  <p>
                    You can review your roles in My access, explore the
                    implementation plan, and check the application service.
                    Maintain shared lists in Configuration. Staff and
                    Coordinators can now manage the scholar registry.
                  </p>
                </div>
              </section>
              <div className="row g-4 guide-grid">
                {[
                  {
                    icon: Users,
                    title: "For the scholarship team",
                    text: "An internal workspace for Staff, Coordinators, and System Administrators. Scholarship approvals belong to the Coordinator; technical administration does not grant approval authority.",
                  },
                  {
                    icon: GraduationCap,
                    title: "One scholar. One lasting identity.",
                    text: "Each scholar will receive a permanent LDSS-YYYY-00001 ID. Course changes, school transfers, and new academic years will preserve that identity and its history.",
                  },
                  {
                    icon: FileCheck2,
                    title: "Physical documents, traceable decisions",
                    text: "COR and grades remain hard-copy requirements. The system will track receiving, verification, corrections, waivers, and physical storage references.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Official history is preserved",
                    text: "Locked masterlists and finalized payout batches will be immutable. Corrections use approved amendments, with an audit trail of the original and revised records.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <section className="col-md-6" key={title}>
                    <div className="guide-card">
                      <Icon size={24} strokeWidth={1.5} />
                      <h2>{title}</h2>
                      <p>{text}</p>
                    </div>
                  </section>
                ))}
              </div>
              <section className="info-panel setup-panel">
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
              </section>
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
          <span>F06 Annual qualification</span>
        </div>
      </div>
    </div>
  );
}
