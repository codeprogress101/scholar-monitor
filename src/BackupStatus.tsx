import { useEffect, useState } from "react";
import { configurationRequest } from "./configuration-api";
type Status = { configured: boolean; mode?: "api" | "desktop"; lastStaged?: string | null; lastFileRestore?: string | null; message?: string; checkedAt?: string; lastBackup?: string | null; lastUpload?: string | null; lastRestore?: string | null; pending?: number; error?: string | null; stale?: boolean };
export default function BackupStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  const [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    configurationRequest<Status>("admin/backup-status", { signal: controller.signal }).then(value => { setStatus(value); setError(false); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [revision]);
  const date = (value?: string | null) => value ? new Date(value).toLocaleString("en-PH", {timeZone:"Asia/Manila"}) : "Not yet completed";
  return <section className="admin-backup" aria-label="Backup status">
    <div className="d-flex justify-content-between align-items-center"><h2>Google Drive backups</h2><button className="btn btn-outline-secondary" onClick={() => refresh(n => n + 1)}>Refresh backups</button></div>
    {error ? <p role="alert">Unable to refresh backup status. Previously displayed information may be outdated.</p> : !status ? <p>Checking backups...</p> : null}
    {status && !status.configured ? <p>{status.message}</p> : status ? <>
      <dl className="admin-facts"><div><dt>Backup created</dt><dd>{date(status.lastBackup)}</dd></div><div><dt>{status.mode === "desktop" ? "Copied to sync folder" : "Upload confirmed"}</dt><dd>{date(status.mode === "desktop" ? status.lastStaged : status.lastUpload)}</dd></div><div><dt>{status.mode === "desktop" ? "Archive restore tested" : "Restore verified"}</dt><dd>{date(status.mode === "desktop" ? status.lastFileRestore : status.lastRestore)}</dd></div><div><dt>{status.mode === "desktop" ? "Awaiting local copy" : "Awaiting upload"}</dt><dd>{status.pending ?? "Not reported"}</dd></div></dl>
      {status.stale && <p role="alert">The backup task has not reported within the past hour. Check that the host computer and scheduled task are running.</p>}
      {status.error && <p role="alert">{status.error}</p>}
      {status.mode === "desktop" && <p>Awaiting Drive sync confirmation. Check Google Drive for desktop and Drive in your browser. A local copy does not confirm cloud upload.</p>}
      {status.mode !== "desktop" && !status.lastRestore && <p>Drive recovery is not ready until a downloaded backup has passed a restore rehearsal.</p>}
      <small>Last checked: {date(status.checkedAt)} (Manila). Backups run every four hours; pending copies or uploads retry every 30 minutes while the host is running.</small>
    </> : null}
  </section>;
}
