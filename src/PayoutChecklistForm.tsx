import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { PayoutCycle } from "../server/payouts/model";
import type { ConfigRecord } from "../server/configuration/model";
import type {
  RequirementChecklist,
  GenerationResult,
} from "../server/requirements/instances-model";
export default function PayoutChecklistForm({
  id,
  yearId,
  session,
  semesters,
  items,
  disabled,
  onBusy,
  onChanged,
}: {
  id: string;
  yearId: string;
  session: Session;
  semesters: ConfigRecord[];
  items: RequirementChecklist[];
  disabled: boolean;
  onBusy: (b: boolean) => void;
  onChanged: () => void;
}) {
  const [cycles, setCycles] = useState<PayoutCycle[]>([]),
    [selectedId, setSelectedId] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    void (async () => {
      try {
        const all: PayoutCycle[] = [];
        for (let offset = 0; ;) {
          const r = await request<{ items: PayoutCycle[]; total: number }>(
            `payout-cycles?limit=100&offset=${offset}`,
            { signal: c.signal },
          );
          all.push(...r.items);
          offset += r.items.length;
          if (offset >= r.total || !r.items.length) break;
        }
        if (active)
          setCycles(
            all.filter(
              (p) =>
                p.academicYearId === yearId &&
                p.state === "open" &&
                !p.periodUnavailable,
            ),
          );
      } catch (e) {
        if (active)
          setError(
            e instanceof ApiError
              ? e.message
              : "Could not load payout cycles. Refresh checklists to retry.",
          );
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [yearId]);
  const selected = cycles.find((c) => c.id === selectedId),
    existing = items.some((i) => i.payoutCycleId === selectedId);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected || busy.current) return;
    const semester = semesters.find((s) => s.id === selected.semesterId);
    if (!semester) return;
    busy.current = true;
    onBusy(true);
    setError("");
    const body = {
        semesterId: selected.semesterId,
        expectedSemesterVersion: semester.version,
        payoutCycleId: selected.id,
        expectedPayoutVersion: selected.version,
        reason,
        reference,
      },
      signature = JSON.stringify({ id, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    let success = false;
    try {
      await request<GenerationResult>(
        `scholarships/${id}/requirements/generate`,
        { body, csrf: session.csrfToken, key: pending.current.key },
      );
      pending.current = null;
      success = true;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Generation could not be confirmed. Retry safely or refresh.",
      );
    } finally {
      busy.current = false;
      onBusy(false);
    }
    if (success) onChanged();
  }
  return (
    <form
      onSubmit={submit}
      className="border rounded p-3 my-3"
      aria-label="Generate payout checklist"
    >
      <h4>Payout checklist</h4>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading open payout cycles...</p>
      ) : (
        <fieldset disabled={disabled}>
          <label className="form-label d-block">
            Checklist payout cycle
            <select
              className="form-select"
              required
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select an open cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} ({c.targetDate})
                </option>
              ))}
            </select>
          </label>
          {!cycles.length && (
            <p>No open payout cycles for this academic year.</p>
          )}
          {selected && (
            <p>
              Uses the cycle's frozen requirement versions and waiver rules,
              effective on {selected.targetDate}.
            </p>
          )}
          {existing ? (
            <p>This payout already has a checklist below.</p>
          ) : (
            <>
              <label className="form-label d-block">
                Payout checklist reason
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
                Payout checklist reference
                <input
                  className="form-control"
                  required
                  minLength={3}
                  maxLength={300}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <button
                className="btn configuration-primary"
                disabled={!selected}
              >
                Generate payout checklist
              </button>
            </>
          )}
        </fieldset>
      )}
    </form>
  );
}
