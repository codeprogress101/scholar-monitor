import { useEffect, useState } from "react";
import { configurationRequest as request } from "./configuration-api";
export default function ContinuingBaseline({ scholarId }: { scholarId: string }) {
  const [accepted, setAccepted] = useState(false), [error, setError] = useState(false), [rolled, setRolled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    request<{ rollover?: { scholarshipId: string } | null; baseline: { participationId: string } | null }>(`scholars/${scholarId}/continuing-baseline`, { signal: controller.signal })
      .then((v) => { setAccepted(Boolean(v.baseline)); setRolled(Boolean(v.rollover)); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [scholarId]);
  if (error) return <p role="alert">Continuing-scholar baseline could not be loaded. Reopen the profile to retry.</p>;
  if (rolled) return <aside className="next-step"><strong>Continuing scholar - rolled over from the previous academic year.</strong><p>Confirm current school, course and year level from the new COR. Admission does not need to be repeated; official masterlist publication and semester compliance are still required for payroll.</p></aside>;
  return accepted ? <aside className="next-step"><strong>Continuing scholar — admission already accepted.</strong><p>Submit COR and COG for the open semester. You do not need to repeat admission.</p><details><summary>Earlier records</summary><p>Old admission documents and previous course changes were not supplied with the roster. This is historical information, not a request to resubmit them. Semester compliance and payroll eligibility are checked separately.</p></details></aside> : null;
}
