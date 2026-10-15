import { readAdminView, useAdminView } from "./admin-view-state";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { ApiError, type Session } from "./auth-api";
import type {
  Access,
  Permission,
  Role,
  RoleCode,
  PermissionCode,
} from "../server/authorization/policy";

type Catalog = {
  roles: Role[];
  permissions: Permission[];
  grants: { role: RoleCode; permission: PermissionCode }[];
};
async function readAccess<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      body?.error?.code ?? "UNAVAILABLE",
      body?.error?.message ?? "Access details are unavailable. Try again.",
    );
  return body;
}
export default function AccessPage({ session }: { session: Session }) {
  const viewKey = `admin-access:${session.user.id}`;
  const [query, setQuery] = useState(() => readAdminView(viewKey,{query:""}).query);
  const [access, setAccess] = useState<Access | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    readAccess<Access>("me/permissions", controller.signal)
      .then(async (current) => {
        if (!active) return;
        setAccess(current);
        if (
          current.permissions.some(
            (permission) => permission.code === "roles.manage",
          )
        ) {
          const roles = await readAccess<Catalog>(
            "admin/role-catalog",
            controller.signal,
          );
          if (active) setCatalog(roles);
        }
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof ApiError
              ? failure.message
              : "Access details could not be loaded. Try again.",
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
  }, [refresh]);
  function reload() {
    setLoading(true);
    setAccess(null);
    setCatalog(null);
    setError("");
    setRefresh((value) => value + 1);
  }
  useAdminView(viewKey, {query}, !loading);
  const permissions = access?.permissions.filter(p => `${p.label} ${p.category} ${p.code}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  return (
    <section className="admin-workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <h1>My access</h1>
          <p>Your assigned roles and the actions they authorize.</p>
        </div>
        <button
          className="btn btn-outline-secondary quiet-button"
          onClick={reload}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh access
        </button>
      </div>
      {loading && <p role="status">Loading your permissions…</p>}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {access && (
        <>
          <section
            className="info-panel access-summary"
            aria-labelledby="assigned-roles"
          >
            <ShieldCheck size={28} />
            <div>
              <h2 id="assigned-roles">Assigned roles</h2>
              <div className="access-role-list">
                {access.roles.map((role) => (
                  <span className="soft-badge" key={role.code}>
                    {role.label}
                  </span>
                ))}
              </div>
              {access.roles.length ? (
                access.roles.map((role) => (
                  <p key={role.code}>{role.description}</p>
                ))
              ) : (
                <p>
                  No role is assigned. Ask your system administrator to arrange
                  access.
                </p>
              )}
            </div>
          </section>
          <p className="text-muted">Account and role changes use local administration commands.</p>
          <section aria-label="Your permissions">
            <label className="admin-search">Search permissions<input type="search" className="form-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find an action or category" /></label>
            <p role="status">{permissions.length} permitted actions</p>
            <div className="table-responsive"><table className="table admin-table"><thead><tr><th>Action</th><th>Category</th></tr></thead><tbody>{permissions.map(p=><tr key={p.code}><td>{p.label.replace(/\bOVR\b/g,"Payroll")}</td><td>{p.category}</td></tr>)}</tbody></table></div>
            {!permissions.length && <p>No permissions match this search.</p>}
          </section>
          {catalog && (
            <details className="secondary-details access-catalog">
              <summary>Role directory</summary>
              <p>
                Review the authority assigned to each role. Account and role
                changes currently use the local administration commands.
              </p>
              <div className="row g-4">
                {catalog.roles.map((role) => (
                  <div className="col-lg-4" key={role.code}>
                    <h3>{role.label}</h3>
                    <p>{role.description}</p>
                    <details><summary>Allowed actions</summary><ul>
                      {catalog.permissions
                        .filter((permission) =>
                          catalog.grants.some(
                            (grant) =>
                              grant.role === role.code &&
                              grant.permission === permission.code,
                          ),
                        )
                        .map((permission) => (
                          <li key={permission.code}>{permission.label.replace(/\bOVR\b/g, "Payroll")}</li>
                        ))}
                    </ul></details>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
