import { useEffect, useRef, useState, type FormEvent } from "react";
import { receiptPreview } from "../server/imports/receipt-preview";
import ContinuingSemesterSetup from "./ContinuingSemesterSetup";
import { OFFICIAL_COHORT } from "../server/continuing/official-cohort";
import type { ImportPreview, ImportResult, ReferenceMapping } from "../server/imports/model";
import { MAX_IMPORT_ROWS } from "../server/imports/model";
import type { Access } from "../server/authorization/policy";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not confirm the result. Retry safely.";
export default function ScholarImport({
  session,
  onImported,
}: {
  session: Session;
  onImported: () => void;
}) {
  const [mappings, setMappings] = useState<ReferenceMapping[]>([]);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);
  const [approvalReference, setApprovalReference] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [canReceive,setCanReceive]=useState(false),[semesters,setSemesters]=useState<ConfigRecord[]>([]),[period,setPeriod]=useState("");
  const [cor,setCor]=useState(false),[cog,setCog]=useState(false),[courseConfirmed,setCourseConfirmed]=useState(false),[receiptsConfirmed,setReceiptsConfirmed]=useState(false),[uncertain,setUncertain]=useState(false);
  const pendingConfirm=useRef<{id:string;body:object;key:string}|null>(null);
  const importRoot=useRef<HTMLElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const stageKey = useRef(crypto.randomUUID()),
    confirmKey = useRef(crypto.randomUUID()),
    inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    request<Access>("me/permissions", { signal: controller.signal }).then(a => {setCanApprove(["scholarship.status.approve", "continuing.approve"].every(code => a.permissions.some(p => p.code === code)));setCanReceive(["requirements.receive","requirements.generate"].every(code=>a.permissions.some(p=>p.code===code)));}).catch(() => {});
    void (async()=>{const items:ConfigRecord[]=[];for(let offset=0;;){const result=await request<ConfigList>(`configuration/semesters?includeArchived=false&limit=100&offset=${offset}`,{signal:controller.signal});items.push(...result.items);offset+=result.items.length;if(!result.items.length||offset>=result.total)break;}if(!controller.signal.aborted)setSemesters(items.filter(s=>!s.locked&&!s.archived&&!s.parentUnavailable));})().catch(()=>{});
    return () => controller.abort();
  }, []);
  function invalidatePreview() {
    if(uncertain)return;
    setPreview(null); setConfirmed(false); setCourseConfirmed(false);setReceiptsConfirmed(false);stageKey.current = crypto.randomUUID();
  }
  useEffect(()=>{
    if(!uncertain&&!busy)return;
    const hash=window.location.hash;
    const retain=(e:Event)=>{e.stopImmediatePropagation();window.history.replaceState(null,"",hash);};
    const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
    const keepWorkspace=(e:Event)=>{const target=e.target;if(target instanceof Element && target.closest("a,button,input,select,textarea") && !importRoot.current?.contains(target)){e.preventDefault();e.stopImmediatePropagation();}};
    document.addEventListener("click",keepWorkspace,true);
    window.addEventListener("hashchange",retain,true);window.addEventListener("popstate",retain,true);window.addEventListener("beforeunload",unload);
    return()=>{document.removeEventListener("click",keepWorkspace,true);window.removeEventListener("hashchange",retain,true);window.removeEventListener("popstate",retain,true);window.removeEventListener("beforeunload",unload);};
  },[uncertain,busy]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.hash.split("?")[1]).get("importJob");
    if (!id) return;
    const controller = new AbortController();
    request<ImportPreview>(`imports/${id}`, { signal: controller.signal }).then(setPreview).catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, []);
  async function stage(e: FormEvent) {
    e.preventDefault();
    if (!file || inFlight.current || uncertain) return;
    if (file.size > 2 * 1024 * 1024 || !/\.xlsx$/i.test(file.name)) {
      setError("Choose an .xlsx workbook no larger than 2 MB.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setConfirmed(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("File could not be read"));
        reader.readAsDataURL(file);
      });
      const result = await request<ImportPreview>("imports/stage", {
        body: { fileName: file.name, base64, mappings, ...(alreadyApproved ? { approvedSelection: { reference: approvalReference, effectiveOn: approvalDate } } : {}),...(cor||cog?{receipts:{periodId:period,cor,cog}}:{}) },
        csrf: session.csrfToken,
        key: stageKey.current,
        signal: AbortSignal.timeout(180000),
      });
      setPreview(result);
      setCourseConfirmed(false);setReceiptsConfirmed(false);
      stageKey.current = crypto.randomUUID();
      confirmKey.current = crypto.randomUUID();
    } catch (e) {
      setError(message(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function confirm() {
    if (!preview || (!confirmed&&!pendingConfirm.current) || inFlight.current) return;
    pendingConfirm.current ??= {id:preview.id,body:{hash:preview.hash,confirm:true,...(courseConfirmed?{coursePendingConfirmed:true}:{}),...(receiptsConfirmed?{receiptsConfirmed:true}:{})},key:confirmKey.current};
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request<ImportResult>(
        `imports/${pendingConfirm.current.id}/confirm`,
        {
          body: pendingConfirm.current.body,
          csrf: session.csrfToken,
          key: pendingConfirm.current.key,
          signal: AbortSignal.timeout(180000),
        },
      );
      setPreview({ ...preview, result });
      pendingConfirm.current=null;setUncertain(false);
      onImported();
    } catch (e) {
      const unknown=!(e instanceof ApiError)||e.status>=500;setUncertain(unknown);if(!unknown)pendingConfirm.current=null;
      setError(message(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const receiptDetails = preview ? receiptPreview(preview.rows) : {receiptBlockers:[],receiptGroups:[]};
  const workbookErrors = preview?.rows.filter(r => r.errors.some(e => !r.receiptIssue || e !== `Document receipts: ${r.receiptIssue.message}`)).length ?? 0;
  return (
    <section ref={importRoot} className="card p-3 my-3" aria-label="Excel scholar import" data-pending-location={busy||uncertain?window.location.hash:undefined}>
      <h2>Import scholars from Excel</h2>
      <p>
        Upload, review, then confirm. Nothing enters the scholar registry until
        confirmation.
      </p>
      <p>
        <a href="/api/v1/imports/template" download>
          Download Excel template
        </a>{" "}
        · Up to {MAX_IMPORT_ROWS.toLocaleString("en-US")} rows / 2 MB.
      </p>
      <details className="mb-3">
        <summary>How to fill in the template</summary>
        <p>Use Last name, First name, Middle Name, Name Extension, School, Year Level, Status and Course. Status accepts New, Continuing or Old. Middle name, extension and course may be blank.</p>
        <p>The working academic year is chosen automatically. Type school and course names directly; existing names or codes are reused. New names are saved when you confirm. Approved-list imports can explicitly authorize Course pending. All other publication and payroll requirements still apply.</p>
        <p>Use one worksheet with up to {MAX_IMPORT_ROWS.toLocaleString("en-US")} scholars. The older template is also accepted. Resolve duplicate names before confirmation; no names are merged automatically.</p>
      </details>
      <form onSubmit={stage} className="d-flex flex-wrap align-items-end gap-3">
        <fieldset className="w-100" disabled={busy||uncertain}>
          <legend className="fs-6">Scholarship selection</legend>
          <label className="form-check">
            <input className="form-check-input" type="checkbox" disabled={!canApprove} checked={alreadyApproved} onChange={e => { setAlreadyApproved(e.target.checked);if(!e.target.checked){setCor(false);setCog(false);} invalidatePreview(); }} />
            This list is already approved for the working academic year — create Selected records
          </label>
          <p>{canApprove ? "Records your approval reference. Missing courses require an explicit Course pending exception. Publication and payment checks remain separate." : "A Coordinator can confirm an already-approved list."}</p>
          {alreadyApproved && <div className="d-flex flex-wrap gap-3">
            <label>Approval/list reference<input className="form-control" required minLength={3} maxLength={200} value={approvalReference} onChange={e => { setApprovalReference(e.target.value); invalidatePreview(); }} /></label>
            <label>Approval effective date<input className="form-control" type="date" required value={approvalDate} onChange={e => { setApprovalDate(e.target.value); invalidatePreview(); }} /></label>
          </div>}
        </fieldset>
        {alreadyApproved&&canReceive&&<fieldset className="w-100" disabled={busy||uncertain}><legend className="fs-6">Documents physically received</legend><label>Receiving semester<select className="form-select" value={period} required={cor||cog} onChange={e=>{setPeriod(e.target.value);setCor(false);setCog(false);invalidatePreview();}}><option value="">Choose semester</option>{semesters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="d-block"><input type="checkbox" checked={cor} onChange={e=>{setCor(e.target.checked);invalidatePreview();}}/> COR received for all applicable rows</label><label className="d-block"><input type="checkbox" checked={cog} onChange={e=>{setCog(e.target.checked);invalidatePreview();}}/> COG received for all applicable rows</label><small>Receipt only. Leave unchecked when documents were not received for every applicable scholar.</small></fieldset>}
        <label className="form-label flex-grow-1">
          Excel workbook
          <input
            className="form-control"
            type="file"
            accept=".xlsx"
            required
            disabled={busy||uncertain}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMappings([]);
              setCor(false);setCog(false);setCourseConfirmed(false);setReceiptsConfirmed(false);
              setPreview(null);
              setError("");
              setConfirmed(false);
              stageKey.current = crypto.randomUUID();
            }}
          />
        </label>
        <button
          className="btn configuration-primary mb-2"
          disabled={busy || uncertain || !file}
        >
          {busy ? "Working..." : "Review import"}
        </button>
      </form>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}{" "}
          {error.includes("Upload again")
            ? "Click Review import again to create a fresh preview."
            : ""}
        </p>
      )}
      {preview && (
        <>
          <h3>Review: {preview.fileName}</h3>
          {preview.workingYear && <p><strong>Working academic year: {preview.workingYear}</strong></p>}
          {preview.rows[0]?.approvedSelection && <p className="alert alert-info">Already-approved list: confirmation will mark {preview.rows.length} scholars Selected for {preview.workingYear}. Reference: {preview.rows[0].approvedSelection.reference}; effective date: {preview.rows[0].approvedSelection.effectiveOn}. This does not mark anyone Paid or publish a masterlist.</p>}
          {!!preview.rows.filter(r=>r.coursePending).length&&<label className="d-block my-2"><input type="checkbox" checked={courseConfirmed} disabled={busy||uncertain} onChange={e=>setCourseConfirmed(e.target.checked)}/> I authorize Course pending for the {preview.rows.filter(r=>r.coursePending).length} listed scholars; their courses will be completed from supporting documents.</label>}
          {!!receiptDetails.receiptBlockers?.length && <section className="alert alert-warning" aria-label="Document receiving setup"><strong>Document receiving is not ready.</strong>{receiptDetails.receiptBlockers.map(b=><p className="mb-1" key={`${b.code}:${b.message}`}>{b.message} ({b.rows.length} rows)</p>)}<p className="mb-1">Resolve semester setup, then review this file again. You do not need to edit Excel for this setup issue.</p>{canApprove ? <fieldset disabled={busy||uncertain}><ContinuingSemesterSetup compact batchId={OFFICIAL_COHORT} initialSemesterId={preview.rows[0]?.receipts?.periodId ?? ""} session={session} canConfigure onEnabled={invalidatePreview}/></fieldset> : <p className="mb-0">Ask the Coordinator to review and enable semester documents.</p>}</section>}
          {preview.rows[0]?.receipts&&<div className="my-2">{receiptDetails.receiptGroups?.map((g,i)=><p key={i}>COR: {g.cor} — {g.corCount} receipts. COG: {g.cog} — {g.cogCount} receipts.{g.exemptCount>0?` ${g.exemptCount} reviewed entrant exemptions.`:" No entrant exemption inferred from year level."}</p>)}<label><input type="checkbox" checked={receiptsConfirmed} disabled={busy||uncertain||!!receiptDetails.receiptBlockers?.length} onChange={e=>setReceiptsConfirmed(e.target.checked)}/> I confirm physical receipt of the selected documents for every applicable scholar.</label></div>}
          {!!preview.unresolved?.length && <section className="card p-3"><h4>Match references once</h4><p>Choose existing references, then click Review import again. Resolve ambiguous names by choosing the correct existing entry. New school/course names do not require Administrator setup.</p>{preview.unresolved.map(r => <label key={`${r.kind}:${r.supplied}`} className="form-label">{r.kind}: {r.supplied}<select className="form-select" disabled={busy||uncertain} value={mappings.find(m => m.kind === r.kind && m.supplied === r.supplied)?.id ?? ""} onChange={e => { setConfirmed(false); setMappings(old => [...old.filter(m => m.kind !== r.kind || m.supplied !== r.supplied), ...e.target.value ? [{ kind: r.kind, supplied: r.supplied, id: e.target.value }] : []]); }}><option value="">Choose reference</option>{r.choices.map(c => <option value={c.id} key={c.id}>{c.name} ({c.code})</option>)}</select></label>)}</section>}

          <p>
            {preview.rows.length} rows.{" "}
            {preview.ready
              ? preview.rows.some(r=>r.coursePending) ? "Workbook validation passed; Course pending confirmation required." : "All rows passed validation."
              : workbookErrors ? "Resolve the listed workbook errors before confirmation." : "Resolve the document setup blocker before confirmation."}
          </p>
          {!preview.result && <section aria-label="Confirm import" className="mb-3">
            {!preview.ready && (workbookErrors>0||preview.rows.some(r=>r.warnings.length)) && <div role="status" className="alert alert-warning">
              <strong>Import cannot be saved yet.</strong>{" "}
              {workbookErrors} rows have workbook errors;{" "}
              {preview.rows.filter(r => r.warnings.length).length} rows have duplicate warnings. A row may have both.
              {(workbookErrors>0||preview.rows.some(r=>r.warnings.length))&&<p className="mb-0">Correct flagged workbook information or resolve duplicate warnings, then review the import again.</p>}
            </div>}
            <label className="form-check my-2">
              <input className="form-check-input" type="checkbox" checked={issuesOnly} onChange={e => setIssuesOnly(e.target.checked)} />
              Show only rows with errors or duplicate warnings
            </label>
            <label className="form-check my-2">
              <input className="form-check-input" type="checkbox" checked={confirmed} disabled={busy || uncertain || !preview.ready} onChange={e => setConfirmed(e.target.checked)} />
              I reviewed every row and want to save this import.
            </label>
            <button className="btn configuration-primary" disabled={busy || !preview.ready || !confirmed || (preview.rows.some(r=>r.coursePending)&&!courseConfirmed) || (!!preview.rows[0]?.receipts&&!receiptsConfirmed)} onClick={() => void confirm()}>
              {uncertain?"Retry the same import":`Confirm import (${preview.rows.length} rows)`}
            </button>
          </section>}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Scholar</th>
                  <th>Action</th>
                  <th>Year / placement</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.filter(r => !issuesOnly || !!preview.result || r.errors.length || r.warnings.length).map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>
                      {r.existingName ||
                        `${r.cells.lastName}, ${r.cells.firstName}`}
                      <br />
                      {r.cells.scholarId}
                    </td>
                    <td>
                      {r.cells.scholarId
                        ? "Add academic record"
                        : r.coursePending ? "Create scholar + partial placement" : r.academic
                          ? "Create scholar + academic record"
                          : "Create scholar"}
                    </td>
                    <td>
                      {r.cells.academicYearCode}
                      <br />
                      {[
                        r.cells.schoolCode,
                        r.cells.courseCode,
                        r.cells.yearLevel,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </td>
                    <td>
                      {!r.errors.filter(m=>!r.receiptIssue || m!==`Document receipts: ${r.receiptIssue.message}`).length && !r.warnings.length ? (
                        r.receiptIssue ? "Workbook ready; receiving setup blocked" : "Ready"
                      ) : (
                        <ul>
                          {r.errors.filter(m=>!r.receiptIssue || m!==`Document receipts: ${r.receiptIssue.message}`).map((m, i) => (
                            <li className="text-danger" key={`e${i}`}>
                              {m}
                            </li>
                          ))}
                          {r.warnings.map((m, i) => (
                            <li key={`w${i}`}>{m}</li>
                          ))}
                        </ul>
                      )}
                      {r.notices?.map(n => <p key={n}>{n}</p>)}
                      {r.intake && <small>{r.approvedSelection ? "Selected after Coordinator confirms this import" : r.intake.classification === "new" ? "New - validation required" : "Continuing - roster review required"}</small>}
                      <details>
                        <summary>Row details</summary>
                        <dl>
                          {Object.entries(r.cells)
                            .filter(([, value]) => value)
                            .map(([key, value]) => (
                              <div key={key}>
                                <dt>{key}</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                        </dl>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.result ? (
            <div role="status" className="alert alert-success">
              <p>Import complete: {preview.result.items.length} rows saved.</p>
              {!!preview.result.coursePendingCount&&<p>{preview.result.coursePendingCount} courses pending completion.</p>}
              {!!preview.result.receivedCount&&<p>{preview.result.receivedCount} document receipts recorded. Verification remains separate.</p>}
              {!!preview.result.selectedCount && <p>{preview.result.selectedCount} annual records are Selected. Prepare and publish the masterlist separately.</p>}
              {preview.result.continuingRosterId && <p>{preview.result.selectedCount ? "Continuing baseline roster accepted with this Coordinator confirmation." : "Continuing roster is pending Coordinator review in Scholar registry / Continuing roster review."}</p>}
              <ul>
                {preview.result.items.map((r) => (
                  <li key={r.row}>
                    Row {r.row}: {r.scholarId}
                    {r.academicRecordId ? " — academic record saved" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
