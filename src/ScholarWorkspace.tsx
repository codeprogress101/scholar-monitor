import type { Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import ScholarsPage from "./ScholarsPage";
import ContinuingRostersPage from "./ContinuingRostersPage";
import GraduationMonitoring from "./GraduationMonitoring";

export default function ScholarWorkspace({ session, access }: { session: Session; access: Access | null }) {
  const roster = window.location.hash.startsWith("#continuing") || new URLSearchParams(window.location.hash.split("?")[1]).get("task") === "continuing";
  const profile = new URLSearchParams(window.location.hash.split("?")[1]).has("scholar");
  const graduation = new URLSearchParams(window.location.hash.split("?")[1]).get("task") === "graduation";
  return <>
    {!profile && access?.permissions.some(p => p.code === "scholars.read") && <nav className="filter-pills" aria-label="Scholar registry tasks">
      <a className={!roster&&!graduation ? "btn configuration-primary" : "btn btn-outline-secondary"} aria-current={!roster&&!graduation ? "page" : undefined} href="#scholars">All Scholars</a>
      {access.permissions.some(p=>p.code==='continuing.prepare')&&<a className={roster ? "btn configuration-primary" : "btn btn-outline-secondary"} aria-current={roster ? "page" : undefined} href="#scholars?task=continuing">Continuing Roster</a>}
      <a className={graduation ? "btn configuration-primary" : "btn btn-outline-secondary"} aria-current={graduation ? "page" : undefined} href="#scholars?task=graduation">Graduation Monitoring</a>
    </nav>}
    {graduation&&!profile ? <GraduationMonitoring access={access} session={session}/> : roster ? <ContinuingRostersPage session={session} /> : <ScholarsPage session={session} />}
  </>;
}
