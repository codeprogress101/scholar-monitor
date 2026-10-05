import { useEffect, useState } from "react";
import type { Access } from "../server/authorization/policy";
import type { ScholarshipRecord } from "../server/qualification/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import ReceivingRequirements from "./ReceivingRequirements";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import { receivingToday } from "./receiving-selection";
async function currentYears(signal: AbortSignal) {
  const items: ConfigRecord[] = [];
  for (let offset = 0; ;) {
    const page = await request<ConfigList>(
      `configuration/academic-years?includeArchived=true&limit=100&offset=${offset}`,
      { signal },
    );
    items.push(...page.items);
    offset += page.items.length;
    if (offset >= page.total || !page.items.length) return items;
  }
}
export default function ScholarRequirements({
  scholarId,
  scholarLabel,
  session,
  access,
  onSetup,
  onAcademicSetup,
}: {
  scholarId: string;
  scholarLabel: string;
  session: Session;
  access: Access;
  onSetup: () => void;
  onAcademicSetup?: (yearId: string) => void;
}) {
  const [records, setRecords] = useState<ScholarshipRecord[] | null>(null),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    Promise.all([
      request<{ items: ScholarshipRecord[] }>(
        `scholars/${scholarId}/scholarships`,
        { signal: c.signal },
      ),
      currentYears(c.signal),
    ])
      .then(([r, years]) => {
        const current = r.items.filter((record) =>
          years.some(
            (y) =>
              y.id === record.academicYearId &&
              !y.locked &&
              !y.archived &&
              y.startsOn &&
              y.startsOn <= receivingToday() &&
              y.endsOn &&
              y.endsOn >= receivingToday(),
          ),
        );
        if (active) {
          setRecords(r.items);
          setSelected((previous) =>
            r.items.some((i) => i.id === previous)
              ? previous
              : current.length === 1
                ? current[0].id
                : r.items.length === 1
                  ? r.items[0].id
                  : "",
          );
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setRecords(null);
          setError(
            e instanceof ApiError
              ? e.message
              : "Could not load requirement years. Please retry.",
          );
        }
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [scholarId, reload]);
  const annual = records?.find((r) => r.id === selected);
  return (
    <section aria-label="Receive scholar requirements">
      <div className="d-flex justify-content-between flex-wrap gap-2">
        <h3>Receive requirements</h3>
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            setRecords(null);
            setError("");
            setReload((n) => n + 1);
          }}
        >
          Reload requirement years
        </button>
      </div>
      <p>Scholar: {scholarLabel}</p>
      <p>
        Select the documents physically received. Verification follows
        separately.
      </p>
      {error ? (
        <p role="alert" className="alert alert-danger">
          Requirements could not be loaded. {error} Use Reload requirement years
          to retry.
        </p>
      ) : !records ? (
        <p role="status">Loading requirement years...</p>
      ) : !records.length ? (
        <div className="alert alert-info">
          <h4>Set up this scholar's academic year first</h4>
          <p>
            The personal profile is saved, but no annual scholarship record
            exists yet. Add the relevant year in Scholarship records, then
            return here to receive its requirements. The registration year shown
            on the profile does not create this record automatically.
          </p>
          <button className="btn configuration-primary" onClick={onSetup}>
            Set up scholarship year
          </button>
        </div>
      ) : (
        <>
          <label className="form-label d-block">
            Requirements academic year
            <select
              className="form-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose academic year</option>
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.yearCode}
                  {r.periodUnavailable ? " (locked or archived)" : ""}
                </option>
              ))}
            </select>
          </label>
          {annual && (
            <ReceivingRequirements
              key={annual.id}
              id={annual.id}
              session={session}
              access={access}
              onAcademicSetup={() => onAcademicSetup?.(annual.academicYearId)}
            />
          )}
        </>
      )}
    </section>
  );
}
