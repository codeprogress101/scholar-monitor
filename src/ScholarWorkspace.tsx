import type { Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import ScholarsPage from "./ScholarsPage";
import ContinuingRostersPage from "./ContinuingRostersPage";

export default function ScholarWorkspace({ session, access }: { session: Session; access: Access | null }) {
  const roster = window.location.hash.startsWith("#continuing") || new URLSearchParams(window.location.hash.split("?")[1]).get("task") === "continuing";
  const profile = new URLSearchParams(window.location.hash.split("?")[1]).has("scholar");
  return <>
    {!profile && access?.permissions.some(p => p.code === "continuing.prepare") && <nav className="filter-pills" aria-label="Scholar registry tasks">
      <a className={!roster ? "btn configuration-primary" : "btn btn-outline-secondary"} aria-current={!roster ? "page" : undefined} href="#scholars">All scholars</a>
      <a className={roster ? "btn configuration-primary" : "btn btn-outline-secondary"} aria-current={roster ? "page" : undefined} href="#scholars?task=continuing">Continuing roster review</a>
    </nav>}
    {roster ? <ContinuingRostersPage session={session} /> : <ScholarsPage session={session} />}
  </>;
}
