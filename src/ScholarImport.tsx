import CommandProgressDialog from "./CommandProgressDialog";
import {ActionButton} from "./ActionProgress";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {pendingPrior,retainPriorCommand} from "./prior-command";
import type {IdentityResolutionV2} from "../server/imports/intake-binding";
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
type DraftDecision={decision:'not_supplied'|'literal_same'|'reviewed_correspondence';sourceReference?:string;reason?:string;reviewed?:boolean};
function initialDecision(manual:string|null,excel:string):DraftDecision {return manual===null?{decision:'not_supplied'}:manual===excel?{decision:'literal_same'}:{decision:'reviewed_correspondence',reviewed:false,sourceReference:'',reason:''};}
export default function ScholarImport({
  session,
  onImported,
}: {
  session: Session;
  onImported: () => void;
}) {
  const [confirming,setConfirming]=useState(false);
  const [recoveredResult,setRecoveredResult]=useState<ImportResult|null>(null);
  const namespace=`ldss-import-command:${session.user.id}`;
  const [saved]=useState(()=>{try{const raw=sessionStorage.getItem(namespace);if(!raw)return null;const v=JSON.parse(raw) as {id:string;body:object;key:string};if(!/^[a-f0-9-]{36}$/.test(v.id)||!/^[a-f0-9-]{36}$/.test(v.key)||!v.body)return null;const foreign=pendingPrior(session.user.id);if(foreign&&(foreign.path!==`imports/${v.id}/confirm`||foreign.key!==v.key))return null;retainPriorCommand(session.user.id,{path:`imports/${v.id}/confirm`,key:v.key,body:v.body as Record<string,unknown>,route:'scholars'});return v;}catch{return null;}});
  const foreignCommand=pendingPrior(session.user.id);
  const foreign=Boolean(foreignCommand&&foreignCommand.path!==`imports/${saved?.id??previewId()}/confirm`);
  function previewId(){return new URLSearchParams(window.location.hash.split("?")[1]).get("importJob")??"";}
  const [identityResolutions,setIdentityResolutions]=useState<(Omit<IdentityResolutionV2,'samePerson'|'suppliedTextReview'>&{samePerson:boolean;suppliedTextReview:{textRevision:number;textHash:string|null;school:DraftDecision;course:DraftDecision}})[]>([]);
  const [matchesChanged,setMatchesChanged]=useState(false);
  const [mappings, setMappings] = useState<ReferenceMapping[]>([]);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);
  const [approvalReference, setApprovalReference] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [canReceive,setCanReceive]=useState(false),[semesters,setSemesters]=useState<ConfigRecord[]>([]),[period,setPeriod]=useState("");
  const [cor,setCor]=useState(false),[cog,setCog]=useState(false),[courseConfirmed,setCourseConfirmed]=useState(false),[receiptsConfirmed,setReceiptsConfirmed]=useState(false),[uncertain,setUncertain]=useState(Boolean(saved));
  const pendingConfirm=useRef<{id:string;body:object;key:string}|null>(saved);
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
    setIdentityResolutions([]);setMatchesChanged(false);
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
    const id = saved?.id??new URLSearchParams(window.location.hash.split("?")[1]).get("importJob");
    if (!id) return;
    const controller = new AbortController();
    request<ImportPreview>(`imports/${id}`, { signal: controller.signal }).then(setPreview).catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, [saved]);
  async function stage(e: FormEvent) {
    e.preventDefault();
    if (!file || inFlight.current || uncertain || pendingPrior(session.user.id)) return;
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
        body: { fileName: file.name, base64, mappings, ...(identityResolutions.length?{identityResolutions}:{}), ...(alreadyApproved ? { approvedSelection: { reference: approvalReference, effectiveOn: approvalDate } } : {}),...(cor||cog?{receipts:{periodId:period,cor,cog}}:{}) },
        csrf: session.csrfToken,
        key: stageKey.current,
        signal: AbortSignal.timeout(180000),
      });
      setPreview(result);setMatchesChanged(false);
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
    if ((!preview&&!pendingConfirm.current) || matchesChanged || (!confirmed&&!pendingConfirm.current) || inFlight.current || (!pendingConfirm.current&&pendingPrior(session.user.id))) return;
    pendingConfirm.current ??= {id:preview!.id,body:{hash:preview!.hash,confirm:true,...(courseConfirmed?{coursePendingConfirmed:true}:{}),...(receiptsConfirmed?{receiptsConfirmed:true}:{})},key:confirmKey.current};
    const retained=pendingConfirm.current;
    try{sessionStorage.setItem(namespace,JSON.stringify(retained));}catch{pendingConfirm.current=null;setError('Safe reload recovery is unavailable. Keep this page open and retry storage before confirming.');return;}
    retainPriorCommand(session.user.id,{path:`imports/${retained.id}/confirm`,key:retained.key,body:retained.body as Record<string,unknown>,route:'scholars'});
    window.history.replaceState(null,'',`#scholars?importJob=${retained.id}`);
    inFlight.current = true;
    setBusy(true);setConfirming(true);
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
      if(preview)setPreview({ ...preview, result });else setRecoveredResult(result);
      pendingConfirm.current=null;setUncertain(false);sessionStorage.removeItem(namespace);retainPriorCommand(session.user.id,null);
      onImported();
    } catch (e) {
      const unknown=!(e instanceof ApiError)||e.status>=500||["IDEMPOTENCY_CONFLICT","IMPORT_BINDING_INVALID"].includes(e.code);setUncertain(unknown);if(!unknown){pendingConfirm.current=null;sessionStorage.removeItem(namespace);retainPriorCommand(session.user.id,null);}
      setError(message(e));
    } finally {
      inFlight.current = false;
      setBusy(false);setConfirming(false);
    }
  }
  const receiptDetails = preview ? receiptPreview(preview.rows) : {receiptBlockers:[],receiptGroups:[]};
  const workbookErrors = preview?.rows.filter(r => r.errors.some(e => !r.receiptIssue || e !== `Document receipts: ${r.receiptIssue.message}`)).length ?? 0;
  return (
    <section ref={importRoot} className="card p-3 my-3" aria-label="Excel scholar import" data-pending-location={busy||uncertain?window.location.hash:undefined}>
      <CommandProgressDialog operation="Confirming Excel import" identity={`${preview?.fileName??"Saved import"} / ${preview?.id??saved?.id??""}`} count={preview?.rows.length} unit="rows" pending={confirming} uncertain={uncertain} error={error} retry={()=>void confirm()} retryLabel="Retry saved import"/>
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
        <fieldset className="w-100" disabled={busy||uncertain||foreign}>
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
        {alreadyApproved&&canReceive&&<fieldset className="w-100" disabled={busy||uncertain||foreign}><legend className="fs-6">Documents physically received</legend><label>Receiving semester<select className="form-select" value={period} required={cor||cog} onChange={e=>{setPeriod(e.target.value);setCor(false);setCog(false);invalidatePreview();}}><option value="">Choose semester</option>{semesters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="d-block"><input type="checkbox" checked={cor} onChange={e=>{setCor(e.target.checked);invalidatePreview();}}/> COR received for all applicable rows</label><label className="d-block"><input type="checkbox" checked={cog} onChange={e=>{setCog(e.target.checked);invalidatePreview();}}/> COG received for all applicable rows</label><small>Receipt only. Leave unchecked when documents were not received for every applicable scholar.</small></fieldset>}
        <label className="form-label flex-grow-1">
          Excel workbook
          <input
            className="form-control"
            type="file"
            accept=".xlsx"
            required
            disabled={busy||uncertain||foreign}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMappings([]);setIdentityResolutions([]);setMatchesChanged(false);
              setCor(false);setCog(false);setCourseConfirmed(false);setReceiptsConfirmed(false);
              setPreview(null);
              setError("");
              setConfirmed(false);
              stageKey.current = crypto.randomUUID();
            }}
          />
        </label>
        <ActionButton pending={busy} activeLabel="Reviewing import..."
          className="btn configuration-primary mb-2"
          disabled={busy || uncertain || foreign || !file}
        >
          Review import
        </ActionButton>
      </form>
      {foreign&&<p role="alert">Resolve your retained command in its existing workspace before starting another import.</p>}
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}{" "}
          {error.includes("Upload again")
            ? "Click Review import again to create a fresh preview."
            : ""}
        </p>
      )}
      {uncertain&&<div role="status" className="alert alert-warning">The import response is uncertain. Retry the saved command; no new mapping or confirmation key will be sent. <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={()=>void confirm()}>Retry saved import</button></div>}
      {recoveredResult&&<p role="status">Saved import confirmed: {recoveredResult.items.length} rows. Reload its history to read details; do not import again.</p>}
      {preview && (
        <>
          <h3>Review: {preview.fileName}</h3>
          {preview.workingYear && <p><strong>Working academic year: {preview.workingYear}</strong></p>}
          {preview.rows[0]?.approvedSelection && <p className="alert alert-info">Already-approved list: confirmation will mark {preview.rows.length} scholars Selected for {preview.workingYear}. Reference: {preview.rows[0].approvedSelection.reference}; effective date: {preview.rows[0].approvedSelection.effectiveOn}. This does not mark anyone Paid or publish a masterlist.</p>}
          {!!preview.rows.filter(r=>r.coursePending).length&&<label className="d-block my-2"><input type="checkbox" checked={courseConfirmed} disabled={busy||uncertain||foreign} onChange={e=>setCourseConfirmed(e.target.checked)}/> I authorize Course pending for the {preview.rows.filter(r=>r.coursePending).length} listed scholars; their courses will be completed from supporting documents.</label>}
          {!!receiptDetails.receiptBlockers?.length && <section className="alert alert-warning" aria-label="Document receiving setup"><strong>Document receiving is not ready.</strong>{receiptDetails.receiptBlockers.map(b=><p className="mb-1" key={`${b.code}:${b.message}`}>{b.message} ({b.rows.length} rows)</p>)}<p className="mb-1">Resolve semester setup, then review this file again. You do not need to edit Excel for this setup issue.</p>{canApprove ? <fieldset disabled={busy||uncertain||foreign}><ContinuingSemesterSetup compact batchId={OFFICIAL_COHORT} initialSemesterId={preview.rows[0]?.receipts?.periodId ?? ""} session={session} canConfigure onEnabled={invalidatePreview}/></fieldset> : <p className="mb-0">Ask the Coordinator to review and enable semester documents.</p>}</section>}
          {preview.rows[0]?.receipts&&<div className="my-2">{receiptDetails.receiptGroups?.map((g,i)=><p key={i}>COR: {g.cor} — {g.corCount} receipts. COG: {g.cog} — {g.cogCount} receipts.{g.exemptCount>0?` ${g.exemptCount} reviewed entrant exemptions.`:" No entrant exemption inferred from year level."}</p>)}<label><input type="checkbox" checked={receiptsConfirmed} disabled={busy||uncertain||!!receiptDetails.receiptBlockers?.length} onChange={e=>setReceiptsConfirmed(e.target.checked)}/> I confirm physical receipt of the selected documents for every applicable scholar.</label></div>}
          {!!preview.unresolved?.length && <section className="card p-3"><h4>Match references once</h4><p>Choose existing references, then click Review import again. Resolve ambiguous names by choosing the correct existing entry. New school/course names do not require Administrator setup.</p>{preview.unresolved.map(r => <label key={`${r.kind}:${r.supplied}`} className="form-label">{r.kind}: {r.supplied}<select className="form-select" disabled={busy||uncertain||foreign} value={mappings.find(m => m.kind === r.kind && m.supplied === r.supplied)?.id ?? ""} onChange={e => { setConfirmed(false); setMappings(old => [...old.filter(m => m.kind !== r.kind || m.supplied !== r.supplied), ...e.target.value ? [{ kind: r.kind, supplied: r.supplied, id: e.target.value }] : []]); }}><option value="">Choose reference</option>{r.choices.map(c => <option value={c.id} key={c.id}>{c.name} ({c.code})</option>)}</select></label>)}</section>}

          <dl className="d-flex flex-wrap gap-3" aria-label="Import row counts">
            {[['New scholars',preview.rows.filter(r=>!r.existingId&&!r.identityCandidates?.total).length],['Existing scholars',preview.rows.filter(r=>r.identityResolution&&r.existingId).length],['Unresolved matches',preview.rows.filter(r=>r.identityCandidates?.total&&!r.identityResolution).length],['Ready rows',preview.rows.filter(r=>!r.errors.length&&!r.warnings.length).length],['Rows requiring correction',preview.rows.filter(r=>r.errors.length||r.warnings.length).length]].map(([label,count])=><div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
          </dl>
          {preview.rows.some(r=>r.identityCandidates?.total)&&!preview.result&&<section aria-label="Resolve existing scholars" className="card p-3 my-2"><h4>Resolve matches</h4><p>Compare permanent IDs and office identity evidence. Matching preserves the original manual intake. Only a Coordinator can stage and confirm an approved list; Staff can review candidates here.</p>
            {preview.rows.filter(r=>r.identityCandidates?.total).map(r=><fieldset key={r.row} disabled={busy||uncertain||foreign}><legend className="fs-6">Row {r.row}: {r.cells.lastName}, {r.cells.firstName}</legend>
              {r.identityCandidates!.total>100?<p>More than 100 candidates. Resolve identity in the Registry before importing.</p>:<>
              <label className="d-block">Existing person for row {r.row}<select className="form-select" value={identityResolutions.find(x=>x.row===r.row)?.scholarId??''} onChange={e=>{const candidate=r.identityCandidates!.candidates.find(x=>x.id===e.target.value);setConfirmed(false);setMatchesChanged(true);setIdentityResolutions(old=>[...old.filter(x=>x.row!==r.row),...(candidate?.intake?[{format:'intake-match/v2' as const,suppliedTextReview:{textRevision:candidate.suppliedText?.revision??0,textHash:candidate.suppliedText?.snapshotHash??null,school:initialDecision(candidate.suppliedText?.schoolText??null,r.cells.schoolCode),course:initialDecision(candidate.suppliedText?.courseText??null,r.cells.courseCode)},row:r.row,scholarId:candidate.id,expectedVersion:candidate.version,intakeId:candidate.intake.id,intakeRevision:candidate.intake.revision,intakeHash:candidate.intake.snapshotHash,duplicateSnapshot:r.identityCandidates!.snapshot,samePerson:false,reference:''}]:[])]);}}><option value="">Choose after identity review</option>{r.identityCandidates!.candidates.map(m=><option value={m.id} key={m.id} disabled={!m.intake||m.intake.sourceKind!=='manual'}>{m.scholarId} — {m.displayName}{!m.intake||m.intake.sourceKind!=='manual'?' — no matching manual intake':''}</option>)}</select></label>
              {identityResolutions.some(x=>x.row===r.row)&&<><label className="d-block my-2">Identity evidence reference for row {r.row}<input className="form-control" minLength={3} maxLength={300} value={identityResolutions.find(x=>x.row===r.row)!.reference} onChange={e=>{setMatchesChanged(true);setConfirmed(false);setIdentityResolutions(old=>old.map(x=>x.row===r.row?{...x,reference:e.target.value}:x));}}/></label><label className="d-block"><input type="checkbox" checked={identityResolutions.find(x=>x.row===r.row)!.samePerson} onChange={e=>{setIdentityResolutions(old=>old.map(x=>x.row===r.row?{...x,samePerson:e.target.checked}:x));setMatchesChanged(true);setConfirmed(false);}}/> I confirmed this is the same person using their permanent ID and office evidence.</label>{(['school','course'] as const).map(key=>{const match=identityResolutions.find(x=>x.row===r.row)!,candidate=r.identityCandidates!.candidates.find(c=>c.id===match.scholarId),manual=key==='school'?candidate?.suppliedText?.schoolText:candidate?.suppliedText?.courseText,excel=key==='school'?r.cells.schoolCode:r.cells.courseCode,decision=match.suppliedTextReview[key],target=r.suppliedTextTargets?.[key];const edit=(patch:Partial<DraftDecision>)=>{setMatchesChanged(true);setConfirmed(false);setIdentityResolutions(old=>old.map(x=>x.row===r.row?{...x,suppliedTextReview:{...x.suppliedTextReview,[key]:{...x.suppliedTextReview[key],...patch}}}:x));};return <section className="border rounded p-2 my-2" key={key} aria-label={`${key} wording review for row ${r.row}`}><p className="intake-supplied-wording"><strong>{key==='school'?'School':'Course'}:</strong> Supplied: {manual??'Not supplied'}; Excel: {excel||'Not supplied'}.</p><p className="text-break">Import target: {target?.kind==='existing_reference'?`${target.name??target.code??'Existing reference'}; ID ${target.id}; version ${target.version}`:target?.kind==='named_reference'?`${target.name} ? resolved by the existing academic workflow at confirmation`:'Course pending ? separate exception confirmation required'}</p>{decision.decision==='reviewed_correspondence'?<><p>Different wording needs actual evidence. This review applies to this row only.</p><label className="d-block">Correspondence source for {key}, row {r.row}<input className="form-control" minLength={3} maxLength={300} value={decision.sourceReference??''} onChange={e=>edit({sourceReference:e.target.value})}/></label><label className="d-block">Correspondence reason for {key}, row {r.row}<input className="form-control" minLength={5} maxLength={500} value={decision.reason??''} onChange={e=>edit({reason:e.target.value})}/></label><label className="d-block my-2"><input type="checkbox" checked={decision.reviewed??false} onChange={e=>edit({reviewed:e.target.checked})}/> I reviewed the source and this row's proposed {key}; this is not a general equivalence.</label></>:<p>{decision.decision==='literal_same'?'Same wording; identity and academic checks still apply.':'No manual wording supplied; import checks still apply.'}</p>}</section>;})}</>}
              </>}
            </fieldset>)}
            <p>{matchesChanged||!preview.ready?"Click Review import again to create a new immutable preview.":"These reviewed matches belong to this preview. Confirm below when every row is correct."} Known placement/classification conflicts and established academic or participation records remain blocked.</p>
          </section>}
          {matchesChanged&&<p role="status">Match choices changed. Review import again before confirmation.</p>}
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
              <input className="form-check-input" type="checkbox" checked={confirmed} disabled={busy || uncertain || matchesChanged || !preview.ready} onChange={e => setConfirmed(e.target.checked)} />
              I reviewed every row and want to save this import.
            </label>
            <button className="btn configuration-primary" disabled={busy || matchesChanged || !preview.ready || (!confirmed&&!uncertain) || (preview.rows.some(r=>r.coursePending)&&!courseConfirmed) || (!!preview.rows[0]?.receipts&&!receiptsConfirmed)} onClick={() => void confirm()}>
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
                      {r.existingHumanId??r.cells.scholarId}
                    </td>
                    <td>
                      {r.identityResolution ? "Reuse existing scholar + link import source" : r.cells.scholarId
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
                      {r.intake && <small className="d-block">{r.approvedSelection ? "Selected after Coordinator confirms this import" : r.intake.classification === "new" ? "New - validation required" : "Continuing - roster review required"}</small>}
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
