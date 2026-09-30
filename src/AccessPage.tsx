import { useEffect, useState } from "react";
import { Check, RefreshCw, ShieldCheck } from "lucide-react";
import { ApiError } from "./auth-api";
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
export default function AccessPage() {
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
  const groups = [
    ...new Set(access?.permissions.map((permission) => permission.category)),
  ];
  return (
    <>
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
          <div className="notice access-notice">
            <ShieldCheck size={21} />
            <div>
              <strong>Permissions follow your role.</strong>
              <span>
                Scholarship approvals require a Coordinator assignment.
                Capabilities below become available as their modules are
                implemented.
              </span>
            </div>
          </div>
          <div className="row g-4">
            {groups.map((group) => (
              <section className="col-md-6" key={group}>
                <div className="info-panel access-group">
                  <h2>{group}</h2>
                  <ul>
                    {access.permissions
                      .filter((permission) => permission.category === group)
                      .map((permission) => (
                        <li key={permission.code}>
                          <Check size={16} />
                          <span>{permission.label}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>
          {catalog && (
            <section
              className="info-panel access-catalog"
              aria-labelledby="role-directory"
            >
              <div className="eyebrow">ADMINISTRATION</div>
              <h2 id="role-directory">Role directory</h2>
              <p>
                Review the authority assigned to each role. Account and role
                changes currently use the local administration commands.
              </p>
              <div className="row g-4">
                {catalog.roles.map((role) => (
                  <div className="col-lg-4" key={role.code}>
                    <h3>{role.label}</h3>
                    <p>{role.description}</p>
                    <ul>
                      {catalog.permissions
                        .filter((permission) =>
                          catalog.grants.some(
                            (grant) =>
                              grant.role === role.code &&
                              grant.permission === permission.code,
                          ),
                        )
                        .map((permission) => (
                          <li key={permission.code}>{permission.label}</li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
