import ExcelJS from "exceljs";
import { SIMPLE_COLUMNS } from "../server/imports/model.js";
import { testUnusedPlaceholderEvidence, testFrozenPlaceholderEvidence } from "./test-unused-placeholder-scenarios.js";
import { testSharedDocuments } from "./test-shared-documents-scenarios.js";
import { testSnapshot } from "./test-snapshot-scenarios.js";
import { testProfile } from "./test-profile-scenarios.js";
import { testReports } from "./test-report-scenarios.js";
import { testLegacyContainment } from "./test-legacy-containment-scenarios.js";
import { digest } from "../server/auth/crypto.js";
import {assertNoPaidClaim} from "../server/ovr/reprocessing.js";
import {paymentRecords} from "../server/ovr/processing-state.js";
import JSZip from "jszip";
import { graduate, testManagedRelease } from "./test-managed-release-scenarios.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import type { Connection, Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { OFFICIAL_COHORT } from "../server/continuing/official-cohort.js";
import { today } from "../server/scholars/validation.js";
import type { OvrDetail } from "../server/ovr/model.js";
import type { RequirementChecklist } from "../server/requirements/instances-model.js";
import type { VerificationContext } from "../server/requirements/workflow-model.js";

export async function testMainPayroll({ admin, runtime, request }: { admin: Connection; runtime: Pool; actor: string; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse> }) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const day = today(), offset = (n: number) => new Date(Date.parse(day + "T00:00:00Z") + n*86400000).toISOString().slice(0,10);
  const config = async (kind: string, fields: object) => (await ok(request("system_admin", `/api/v1/configuration/${kind}`, { action: "create", expectedVersion: 0, fields }))).json();
  const year = await config("academic-years", { code: "AY2026-PAYROLL", name: "Synthetic payroll year", startsOn: offset(-200), endsOn: offset(200) });
  const terms = [await config("semesters", { code: "PAY-TERM1", name: "First semester", academicYearId: year.id, startsOn: offset(-190), endsOn: offset(-31) }), await config("semesters", { code: "PAY-TERM2", name: "Second semester", academicYearId: year.id, startsOn: offset(-20), endsOn: offset(100) })];
  const school = await config("schools", { code: "PAY-COLLEGE", name: "Synthetic Payroll College" }), course = await config("courses", { code: "PAY-DEGREE", name: "Synthetic Degree" });
  const definitions: string[] = [];
  for (const code of ["PAY-COR", "PAY-COG"]) definitions.push((await ok(request("system_admin", "/api/v1/requirement-definitions", { action: "create", code, expectedVersion: 0, fields: { documentKind: code.endsWith("COR") ? "enrollment" : "grades", name: code, instructions: "Synthetic covered semester document", appliesTo: "semester", semesterId: null, effectiveFrom: offset(-200), effectiveUntil: null } }))).json().id);
  const cycles = [];
  for (const [n, term] of terms.entries()) {
    let c = (await ok(request("system_admin", "/api/v1/payout-cycles", { action: "create", code: `MAIN-PAY-${n+1}`, semesterId: term.id, expectedSemesterVersion: 1, expectedVersion: 0, fields: { name: `Main payroll ${n+1}`, targetDate: day, requirements: definitions.map(definitionVersionId => ({ definitionVersionId, allowWaiver: false })) } }))).json();
    c = (await ok(request("coordinator", `/api/v1/payout-cycles/${c.id}/open`, { action: "open", expectedVersion: c.version }))).json(); cycles.push(c);
    await ok(request("coordinator", `/api/v1/payout-cycles/${c.id}/submission-windows/configure`, { expectedCycleVersion: c.version, termNumber: n+1, expectedSemesterVersion: 1, expectedYearVersion: 1, deadlineOn: offset(60) }));
  }
  const cycle = cycles[1], semester = terms[1];
  const setupPath = `/api/v1/continuing-rosters/${OFFICIAL_COHORT}/semester-setup`;
  const options = (await ok(request("coordinator", setupPath + `?semesterId=${semester.id}`))).json();
  await ok(request("coordinator", setupPath, { semesterId: semester.id, expectedSemesterVersion: 1, predecessorSemesterId: terms[0].id, expectedCoverageHash: options.coverage.sourceHash, corDefinitionVersionId: definitions[0], cogDefinitionVersionId: definitions[1], issuer: "Synthetic Scholarship Coordinator", reference: "SYNTHETIC-AUTH", sourceReference: "Synthetic degree semester policy", reviewed: true }));
  const setup = (await ok(request("coordinator", setupPath))).json().setups[0];
  await ok(request("coordinator", setupPath + "/availability", { scopeId: setup.id, expectedRevision: 1, mode: "enabled", expectedSemesterVersion: 1, expectedPredecessorVersion: 1, expectedCoverageHash: options.coverage.sourceHash, reviewed: true }));
  const coursePendingMode=process.argv.includes("--course-pending");
  if(coursePendingMode) await config("settings",{code:"LDSS_WORKING_ACADEMIC_YEAR",name:"Working academic year",valueType:"text",value:year.id});
  const people: { id: string; annual: string }[] = [];
  for (const firstName of ["Alexandra", "Beatrice", "Carlos"]) {
    if(coursePendingMode && firstName==="Alexandra") {
      const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet("Approved import");sheet.addRow([...SIMPLE_COLUMNS]);sheet.addRow(["Payroll Alexandra","Alexandra","","",school.code,"Second year","New",""]);
      const staged=(await ok(request("coordinator","/api/v1/imports/stage",{fileName:"pending-payroll.xlsx",base64:Buffer.from(await workbook.xlsx.writeBuffer()).toString("base64"),approvedSelection:{reference:"Synthetic approved Batch 1 course pending",effectiveOn:day}}))).json();
      assert.equal(staged.ready,true,JSON.stringify(staged.rows));
      const saved=(await ok(request("coordinator",`/api/v1/imports/${staged.id}/confirm`,{hash:staged.hash,confirm:true,coursePendingConfirmed:true}))).json();
      const [[annual]]=await admin.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE scholar_id=?",[saved.items[0].id]);people.push({id:saved.items[0].id,annual:annual.id});continue;
    }
    const p = (await ok(request("staff", "/api/v1/scholars", { expectedVersion: 0, fields: { firstName, lastName: "Payroll " + firstName, academicYearId: year.id, contact: {} } }))).json();
    await ok(request("staff", `/api/v1/scholars/${p.id}/academic-records`, { academicYearId: year.id, schoolId: school.id, courseId: course.id, yearLevel: "Second year" }));
    if (firstName === "Carlos") {
      const roster = (await ok(request("staff", "/api/v1/continuing-rosters", { sourceReference: "Synthetic reviewed continuing payroll roster", entries: [{ scholarId: p.id, version: 1, sourceRow: 1, originalName: "Carlos Payroll Carlos" }] }))).json();
      await ok(request("coordinator", `/api/v1/continuing-rosters/${roster.id}/decision`, { expectedRevision: 0, decision: "accepted", effectiveOn: day, issuer: "Synthetic committee", reference: "TEST-CONTINUING", reviewed: true }));
      people.push({ id: p.id, annual: "" });
    } else {
      const a = (await ok(request("staff", `/api/v1/scholars/${p.id}/scholarships`, { academicYearId: year.id, expectedVersion: 0, effectiveOn: day }))).json();
      await ok(request("staff", `/api/v1/scholarships/${a.id}/qualification/validate`, { expectedVersion: 1, effectiveOn: day, priorQualificationConfirmed: true }));
      await ok(request("coordinator", `/api/v1/scholarships/${a.id}/qualification/select`, { expectedVersion: 2, effectiveOn: day }));
      people.push({ id: p.id, annual: a.id });
    }
  }
  // Continuing admission alone permits custody; no annual or publication is invented.
  await ok(request("staff", `/api/v1/scholars/${people[2].id}/semester-requirements/provision`, { periodId: semester.id }));
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE scholar_id=?", [people[2].id]))[0].length, 0);
  const master = (await ok(request("staff", "/api/v1/masterlists", { academicYearId: year.id, title: "Synthetic approved payroll scholars" }))).json();
  for (const [i,p] of people.entries()) await ok(request("staff", `/api/v1/masterlists/${master.id}/entries`, { action: "add", expectedVersion: i+1, scholarId: p.id, awardNumber: null }));
  const [[continuingAnnual]] = await admin.execute<RowDataPacket[]>("SELECT id,status FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?", [people[2].id, year.id]);
  people[2].annual = continuingAnnual.id; assert.equal(continuingAnnual.status, "continuing");
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT id FROM qualification_events WHERE scholarship_id=?", [continuingAnnual.id]))[0].length, 0);
  // Prepare this competing draft before official activation; graduation must still remove its saved membership.
  const renewalDraft = (await ok(request("coordinator", "/api/v1/masterlists", {academicYearId:year.id,title:"Synthetic renewal draft for graduate removal"}))).json();
  await ok(request("coordinator", `/api/v1/masterlists/${renewalDraft.id}/entries`, {action:"add",expectedVersion:renewalDraft.version,scholarId:people[2].id,awardNumber:null}));
  const list = async (id: string) => (await ok(request("staff", `/api/v1/scholars/${id}/semester-requirements`))).json<{items:RequirementChecklist[]}>().items[0];
  // Empty old-format rows are preserved, but cannot return as live obligations after allocation.
  const emptyAnnualChecklist=randomUUID(), emptyAnnualIds=[randomUUID(),randomUUID()];
  const [[emptyTemplate]]=await admin.execute<RowDataPacket[]>("SELECT c.id FROM requirement_checklists c JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id WHERE ss.scholar_id=? AND ss.semester_id=?",[people[2].id,semester.id]);
  await admin.execute(`INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) SELECT ?,?,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,'Synthetic unused annual placeholders','TEST-EMPTY-LIFECYCLE',actor_id,actor_name,created_at FROM requirement_checklists WHERE id=?`,[emptyAnnualChecklist,people[0].annual,emptyTemplate.id]);
  for(let n=0;n<2;n++) await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",[emptyAnnualIds[n],emptyAnnualChecklist,definitions[n]]);
  const emptySourcePath=`/api/v1/scholars/${people[0].id}/semester-requirements/${semester.id}/shared-documents`;
  const assertUnusedAnnualProtected=async(allowLocked=false)=>{
    const view=(await ok(request('staff',emptySourcePath))).json();
    assert.ok(emptyAnnualIds.every(id=>view.unusedPlaceholderIds.includes(id)),'Unused annual placeholders stay excluded');
    assert.equal(view.unresolved.length,0,'Allocation cannot resurrect empty historical requirements');
    for(const id of emptyAnnualIds){
      const response=await request('staff',`/api/v1/requirement-instances/${id}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null});
      if(allowLocked && response.statusCode===423) assert.equal(response.json().error.code,'RECORD_LOCKED');
      else {assert.equal(response.statusCode,409,response.body);assert.equal(response.json().error.code,'DOCUMENT_SOURCE_REPLACED');}
    }
    const [[receipts]]=await admin.execute<RowDataPacket[]>('SELECT COUNT(*) AS n FROM requirement_receipts WHERE instance_id IN (?,?)',emptyAnnualIds);
    assert.equal(receipts.n,0,'Obsolete IDs never gain receipts');
  };
  for (const p of people) {
    const availability = (await ok(request("staff", `/api/v1/scholars/${p.id}/semester-receiving-availability`))).json();
    assert.equal(availability.supported, true);
    assert.equal(availability.memberships.find((m: { academicYearId: string }) => m.academicYearId === year.id).published, false);
    assert.ok(availability.semesterYears.includes(year.id));
    const path = `/api/v1/scholars/${p.id}/semester-requirements`;
    const provision = (await ok(request("staff", path + "/provision", { periodId: semester.id }))).json();
    assert.equal((await ok(request("staff", path + "/provision", { periodId: semester.id }))).json().id, provision.id);
    const a = (await ok(request("staff", `${path}/${semester.id}/academic-context`))).json();
    await ok(request("staff", `${path}/${semester.id}/academic-context`, { expectedRevision: a.revision, academicRecordId: a.current.id, expectedAcademicVersion: a.current.version, category: "degree" }));
    assert.equal((await list(p.id)).items.length, 2);
  }
  const wp = `/api/v1/payout-cycles/${cycle.id}/submission-windows`;
  const batch1 = (await ok(request("coordinator", wp + "/open-window", { expectedCycleVersion: cycle.version, expectedDeadlineRevision: 1, expectedSequence: 0, opensOn: day, cutoffOn: day }))).json().id;
  // Advance the isolated fixture's window history to a passed cutoff. No local records are changed.
  await admin.execute("UPDATE payroll_submission_window_versions SET opens_on=?,cutoff_on=? WHERE batch_id=?", [offset(-5),offset(-1),batch1]);
  let retryOriginalReceipt: (()=>Promise<LightMyRequestResponse>) | undefined;
  let originalReceiptResult: unknown;
  const receive = async(p: typeof people[number], cog: boolean) => {
    const c = await list(p.id), items = c.items.filter(i => i.version === 0 && (cog || i.code === "PAY-COR"));
    const receiptBody={ items: items.map(i => ({id:i.id,expectedVersion:0,...(i.code === "PAY-COR" ? {documentType:"certificate_of_enrollment"} : {})})), receivedOn: offset(-2), physicalReference:null, storageLocation:null, remarks:null };
    const receiptKey=randomUUID();
    const retry=()=>request("staff", `/api/v1/requirement-checklists/${c.id}/receive`,receiptBody,receiptKey);
    const receiptResult=await ok(retry());
    if(p===people[0]){retryOriginalReceipt=retry;originalReceiptResult=receiptResult.json();}

    // Simulate custody encoded before the historical cutoff; verification below occurs today.
    for (const i of items) await admin.execute("UPDATE requirement_receipts SET recorded_at=? WHERE instance_id=?", [offset(-2)+" 02:00:00",i.id]);
  };
  const verify = async(p: typeof people[number], cog: boolean) => {
    for (const item of (await list(p.id)).items.filter(i => i.status === "submitted" && (cog || i.code === "PAY-COR"))) {
      const path = `/api/v1/requirement-instances/${item.id}`;
      await ok(request("staff", path + "/send-for-verification", { action:"send-for-verification", expectedVersion:item.version, effectiveOn:day, remarks:null }));
      const context = (await ok(request("staff", path + "/verification-context"))).json<VerificationContext>();
      const { scholarId,scholarVersion,academicYearId,semesterId,schoolId,courseId,academicVersion,definitionVersionId,coverageId,semesterRevision,predecessorSourceHash } = context;
      await ok(request("staff", path + "/verify", { action:"verify", expectedVersion:item.version+1,effectiveOn:day,remarks:null,document:{scholarId,scholarVersion,academicYearId,semesterId,schoolId,courseId,academicVersion,definitionVersionId,coverageId,semesterRevision,...(context.coursePending?{coursePendingId:context.coursePending.id,coursePendingRevision:context.coursePending.revision}:{}),...(predecessorSourceHash ? {predecessorSourceHash}: {})},...(context.coursePending?{attestation:"course-comparison-deferred"}:{}),checks:{identity:true,period:true,placement:!context.coursePending,applicability:true,validity:true} }));
    }
  };
  const compliance = async(p: typeof people[number]) => {
    const path = `/api/v1/scholars/${p.id}/semester-requirements/${semester.id}/compliance`;
    let v = (await ok(request("staff",path))).json();
    if (!v.gradingRule) { await ok(request("coordinator",path+"/grading-rule",{sourceHash:v.sourceHash,kind:"native",rule:null,issuer:"Synthetic authorized Coordinator",authorityReference:"SYNTHETIC-GRADE",sourceReference:"Synthetic native 1-best scale",reviewed:true})); v=(await ok(request("staff",path))).json(); }
    await ok(request("staff",path,{sourceHash:v.sourceHash,expectedRevision:v.revision,findings:{average:"2.50",enrolled:true,fullLoad:true,hasFailed:false,hasDropped:false,hasIncomplete:false},reviewed:true}));
  };
  const [[emptyOwner]]=await admin.execute<RowDataPacket[]>('SELECT id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?',[people[0].id,semester.id]);
  await testUnusedPlaceholderEvidence({admin,request,scholar:people[0].id,semester:semester.id,ownerId:emptyOwner.id,instanceId:emptyAnnualIds[0],batchId:batch1,wrongSemesterId:terms[0].id,day});
  await assertUnusedAnnualProtected();
  await receive(people[0],true); await receive(people[1],false); await receive(people[2],true);
  await verify(people[0],true); await verify(people[1],false); await verify(people[2],true);
  await compliance(people[0]); await compliance(people[2]);
  const read = async(id=batch1) => (await ok(request("staff",`/api/v1/ovr-batches/${id}`))).json<OvrDetail>();
  if(!coursePendingMode) await config("settings", { code: "LDSS_WORKING_ACADEMIC_YEAR", name: "Working academic year", valueType: "text", value: year.id });
  const registryEligibility = async () => (await ok(request("staff", `/api/v1/scholars/eligibility?ids=${people.map(p => p.id).join(",")}&periodId=${cycle.id}`))).json<import("../server/scholars/registry-eligibility.js").RegistryEligibility>();
  const unpublished = await read();
  const unpublishedRegistry = await registryEligibility();
  assert.equal(unpublishedRegistry.periodId, cycle.id);
  assert.ok(unpublishedRegistry.items.every(i => !i.eligible));
  assert.ok(unpublished.managed!.items.every(i => !i.eligible));
  for (const [i,action] of ["submit-verification", "submit-approval", "approve", "publish"].entries()) await ok(request(i < 2 ? "staff" : "coordinator", `/api/v1/masterlists/${master.id}/${action}`, { expectedVersion: people.length+1+i, ...(action === "publish" ? { effectiveOn: day } : {}) }));
  const published = (await ok(request("staff", `/api/v1/scholars/${people[0].id}/semester-receiving-availability`))).json();
  assert.equal(published.memberships.find((m: { academicYearId: string }) => m.academicYearId === year.id).published, true);
  console.log("PASS Receiving before publication: selected and accepted continuing scholars receive and verify COR/COG, retain records, but cannot enter payroll until official publication");
  const signatorySetting=(await ok(request("system_admin","/api/v1/configuration/settings?q=PAYROLL_SIGNATORIES"))).json().items[0];
  const signatories=JSON.parse(signatorySetting.value); signatories[0].name="SYNTHETIC CURRENT SIGNATORY";
  const signatoryCommand={action:"update",expectedVersion:signatorySetting.version,reason:"Synthetic signatory update",fields:{code:signatorySetting.code,name:signatorySetting.name,valueType:"text",value:JSON.stringify(signatories)}};
  const oldHash=(await read()).managed!.sourceHash;
  for(const role of ["staff","coordinator"]) assert.equal((await request(role,`/api/v1/configuration/settings/${signatorySetting.id}`,signatoryCommand)).statusCode,403);
  const signatoryKey=randomUUID();
  await ok(request("system_admin",`/api/v1/configuration/settings/${signatorySetting.id}`,signatoryCommand,signatoryKey));
  await ok(request("system_admin",`/api/v1/configuration/settings/${signatorySetting.id}`,signatoryCommand,signatoryKey));
  assert.equal((await request("system_admin",`/api/v1/configuration/settings/${signatorySetting.id}`,signatoryCommand)).statusCode,409);
  assert.notEqual((await read()).managed!.sourceHash,oldHash);
  assert.equal((await read()).managed!.form.signatoryRevision,2);
  const payload = (d:OvrDetail) => ({expectedRevision:d.batch.revision,expectedSourceHash:d.managed!.sourceHash});
  let d = await read();
  assert.equal(d.managed!.items.find(i=>i.scholarshipId===people[0].annual)!.eligible,true,JSON.stringify(d.managed!.items));
  assert.equal(d.managed!.items.find(i=>i.scholarshipId===people[1].annual)!.eligible,false);
  const registryPublished = await registryEligibility();
  for (const p of people) assert.equal(registryPublished.items.find(i => i.scholarId === p.id)!.eligible, d.managed!.items.find(i => i.scholarshipId === p.annual)!.eligible);
  assert.equal(registryPublished.items.find(i => i.scholarId === people[0].id)!.inclusion, "Included in draft");
  assert.equal(registryPublished.items.find(i=>i.scholarId===people[0].id)!.requirements!.status,"complete");
  assert.notEqual(registryPublished.items.find(i=>i.scholarId===people[1].id)!.requirements!.status,"complete");
  assert.equal(registryPublished.items.find(i=>i.scholarId===people[0].id)!.payment,null);
  const semesterOnly=(await ok(request("staff",`/api/v1/scholars/eligibility?ids=${people.map(p=>p.id).join(",")}&semesterId=${semester.id}&academicYearId=${year.id}`))).json<import("../server/scholars/registry-eligibility.js").RegistryEligibility>();
  assert.equal(semesterOnly.items.length,people.length);assert.equal(semesterOnly.items.find(i=>i.scholarId===people[0].id)!.requirements!.status,"complete");

  console.log("PASS Registry eligibility agrees with managed Payroll for published, unpublished and missing-document scholars");
  assert.equal(d.managed!.pendingCount,1); assert.equal(d.managed!.form.rows.length,2);
  assert.equal((await request("staff",`/api/v1/ovr-batches/${batch1}/submit-review`,payload(d))).json().error.code,"PENDING_TIMELY_SUBMISSIONS");
  const defer={...payload(d),scholarshipId:people[1].annual,reason:"Missing COG; review for a later batch",reference:"Synthetic Coordinator deferral"};
  assert.equal((await request("staff",`/api/v1/ovr-batches/${batch1}/defer`,defer)).statusCode,403);
  await ok(request("coordinator",`/api/v1/ovr-batches/${batch1}/defer`,defer));
  console.log("PASS Main payroll A/B/F: separate enrollment/COG receipt and Staff verification, current compliance, automatic eligibility, missing COG, on-time receipt verified after cutoff, explicit Coordinator deferral");
  await graduate(request, people[2].annual, semester.id, admin);
  const [[removedGraduate]] = await admin.execute<RowDataPacket[]>("SELECT e.removed_at,m.version FROM masterlist_entries e JOIN masterlist_versions m ON m.id=e.masterlist_id WHERE e.masterlist_id=? AND e.scholar_id=?",[renewalDraft.id,people[2].id]);
  assert.ok(removedGraduate.removed_at); assert.equal(removedGraduate.version,3);
  assert.equal((await request("coordinator", `/api/v1/masterlists/${renewalDraft.id}/entries`, {action:"add",expectedVersion:3,scholarId:people[2].id,awardNumber:null})).statusCode,422);
  console.log("PASS Sole Coordinator graduation approval removes draft membership, blocks re-addition, preserves published membership and final-stipend eligibility");

  d=await read(); assert.equal(d.managed!.items.find(i => i.scholarshipId === people[2].annual)!.eligible, true); const preview=await ok(request("staff",`/api/v1/ovr-batches/${batch1}/payroll-form?draft=true`)); assert.match(preview.body,/DRAFT/);
  await ok(request("coordinator",`/api/v1/ovr-batches/${batch1}/submit-review`,payload(d)));
  d=await read();
  signatories[1].title="Synthetic updated designation";
  await ok(request("system_admin",`/api/v1/configuration/settings/${signatorySetting.id}`,{...signatoryCommand,expectedVersion:2,fields:{...signatoryCommand.fields,value:JSON.stringify(signatories)}}));
  assert.equal((await request("coordinator",`/api/v1/ovr-batches/${batch1}/finalize`,payload(d))).statusCode,409,"Changing signatories invalidates submitted review evidence");
  await ok(request("coordinator",`/api/v1/ovr-batches/${batch1}/return-to-draft`,{...payload(await read()),reason:"Signatory revision requires renewed review",reference:"SIGNATORY-REVIEW"}));
  await ok(request("coordinator",`/api/v1/ovr-batches/${batch1}/submit-review`,payload(await read())));
  d=await read(); const finalize=payload(d), key=randomUUID();
  for(const role of ["staff","system_admin","unassigned"]) assert.equal((await request(role,`/api/v1/ovr-batches/${batch1}/finalize`,finalize)).statusCode,403);
  assert.equal((await request("coordinator",`/api/v1/ovr-batches/${batch1}/finalize`,{...finalize,expectedSourceHash:"0".repeat(64)})).statusCode,409);
  await admin.query("CREATE TRIGGER reject_main_payroll BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.draft' AND NEW.action='finalize' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic finalization rollback'; END IF; END");
  try { assert.equal((await request("coordinator",`/api/v1/ovr-batches/${batch1}/finalize`,finalize,key)).statusCode,500); } finally { await admin.query("DROP TRIGGER reject_main_payroll"); }
  const counts=async()=>{const [[r]]=await admin.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM payroll_allocations) AS allocations,(SELECT COUNT(*) FROM semester_entitlements) AS entitlements,(SELECT COUNT(*) FROM ovr_finalizations WHERE batch_id='"+batch1+"') AS frozen");return {...r};};
  assert.deepEqual(await counts(),{allocations:0,entitlements:0,frozen:0});
  const otherKey=randomUUID();
  const race=await Promise.all([request("coordinator",`/api/v1/ovr-batches/${batch1}/finalize`,finalize,key),request("coordinator",`/api/v1/ovr-batches/${batch1}/finalize`,finalize,otherKey)]);
  assert.deepEqual(race.map(r=>r.statusCode).sort(),[200,409]);
  await ok(request("coordinator",`/api/v1/ovr-batches/${batch1}/finalize`,finalize,race[0].statusCode===200?key:otherKey));
  assert.deepEqual(await counts(),{allocations:2,entitlements:2,frozen:1});
  const [[frozenBeforeObsoleteAttempts]]=await admin.execute<RowDataPacket[]>('SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[batch1]);
  await assertUnusedAnnualProtected();
  assert.ok(retryOriginalReceipt);assert.deepEqual((await ok(retryOriginalReceipt())).json(),originalReceiptResult,'Completed receipt retry returns original result after payroll finalization');
  const [[frozenAfterObsoleteAttempts]]=await admin.execute<RowDataPacket[]>('SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[batch1]);
  assert.deepEqual(frozenAfterObsoleteAttempts,frozenBeforeObsoleteAttempts,'Obsolete document attempts cannot change frozen payroll');
  await testFrozenPlaceholderEvidence({admin,request,batch:batch1,annual:people[0].annual,sourcePath:emptySourcePath,ids:emptyAnnualIds});
  console.log('PASS unused annual lifecycle: exclusion persists through real finalization, obsolete receipt IDs reject, frozen evidence unchanged');

  const form=await ok(request("staff",`/api/v1/ovr-batches/${batch1}/payroll-form`));assert.doesNotMatch(form.body,/DRAFT/);assert.match(form.body,/SYNTHETIC CURRENT SIGNATORY/);assert.match(form.body,/10,000.00/);
  const wordForm=await ok(request("staff",`/api/v1/ovr-batches/${batch1}/payroll-form?format=docx`));assert.match(String(wordForm.headers["content-type"]),/wordprocessingml/);assert.equal(wordForm.rawPayload.subarray(0,2).toString(),"PK");
  await mkdir("output/main-payroll",{recursive:true});await writeFile("output/main-payroll/synthetic-official-payroll.html",form.body);await writeFile("output/main-payroll/synthetic-draft-payroll.html",preview.body);
  const frozen=(await read()).finalization;
  const wordZip=await JSZip.loadAsync(wordForm.rawPayload);
  assert.match(await wordZip.file("word/document.xml")!.async("string"),/SYNTHETIC CURRENT SIGNATORY/);
  await writeFile("output/main-payroll/synthetic-official-payroll.docx",wordForm.rawPayload);
  signatories[0].name="SYNTHETIC FUTURE SIGNATORY";
  await ok(request("system_admin",`/api/v1/configuration/settings/${signatorySetting.id}`,{...signatoryCommand,expectedVersion:3,fields:{...signatoryCommand.fields,value:JSON.stringify(signatories)}}));
  assert.match(form.body,/SYNTHETIC CURRENT SIGNATORY/);

  await admin.execute("UPDATE scholars SET first_name='Synthetic changed after finalization',version=version+1 WHERE id=?",[people[0].id]);
  assert.equal((await ok(request("staff",`/api/v1/ovr-batches/${batch1}/payroll-form`))).body,form.body);
  assert.deepEqual((await read()).finalization,frozen);
  console.log("PASS Main payroll C/H: multi-member frozen form, sample signatories/totals, permissions, stale hashes, atomic rollback, concurrent finalization, retry and profile-independent export");
  // Construct a legacy snapshot only in the owned disposable database, then restore it.
  const [[storedLegacy]]=await admin.execute<RowDataPacket[]>("SELECT snapshot FROM ovr_finalizations WHERE batch_id=?",[batch1]);
  const originalSnapshot=typeof storedLegacy.snapshot === "string" ? storedLegacy.snapshot : JSON.stringify(storedLegacy.snapshot);
  const legacy=JSON.parse(originalSnapshot);delete legacy.payrollForm.signatories;delete legacy.payrollForm.signatoryRevision;
  try {
    await admin.execute("UPDATE ovr_finalizations SET snapshot=?,snapshot_hash=? WHERE batch_id=?",[JSON.stringify(legacy),digest(JSON.stringify(legacy)),batch1]);
    const oldExport=await ok(request("staff",`/api/v1/ovr-batches/${batch1}/payroll-form`));
    assert.match(oldExport.body,/ARIANNE ARIKA B. CARRANCEJA/);
    assert.doesNotMatch(oldExport.body,/SYNTHETIC FUTURE SIGNATORY/);
  } finally {await admin.execute("UPDATE ovr_finalizations SET snapshot=?,snapshot_hash=? WHERE batch_id=?",[originalSnapshot,digest(originalSnapshot),batch1]);}
  const batch2=(await ok(request("coordinator",wp+"/open-window",{expectedCycleVersion:cycle.version,expectedDeadlineRevision:1,expectedSequence:1,opensOn:day,cutoffOn:offset(5)}))).json().id;
  await receive(people[1],true); await verify(people[1],true); await compliance(people[1]);
  const later=await read(batch2);
  assert.equal(later.managed!.form.rows.length,1);assert.equal(later.managed!.form.rows[0].scholarshipId,people[1].annual);
  assert.equal(later.managed!.items.find(i=>i.scholarshipId===people[0].annual)!.eligible,false);
  assert.equal((await read()).finalization!.snapshot.entries.some(i=>i.scholarshipId===people[1].annual),false);
  const [[allocation]]=await admin.query<RowDataPacket[]>("SELECT * FROM semester_entitlements LIMIT 1");
  await assert.rejects(admin.query("INSERT INTO semester_entitlements SET ?",[{...allocation,id:randomUUID()}]),(e:{code?:string})=>e.code==="ER_DUP_ENTRY");
  const wrongTerm=(await ok(request("staff",`/api/v1/payout-cycles/${cycles[0].id}/scholarships/${people[1].annual}/eligibility`))).json();assert.equal(wrongTerm.current.eligible,false);assert.ok(wrongTerm.current.reasons.some((r:{code:string})=>r.code==="SEMESTER_NOT_PREPARED"));
  const [[payments]]=await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payment_records WHERE cycle_id=?",[cycle.id]);assert.equal(payments.n,0);
  for(const table of ["payroll_allocations","payroll_deferrals","semester_entitlements","semester_entitlement_events"]) for(const action of ["UPDATE","DELETE"]) await assert.rejects(runtime.query(action === "UPDATE" ? `UPDATE ${table} SET actor_id=actor_id WHERE 1=0` : `DELETE FROM ${table} WHERE 1=0`),(e:{code?:string})=>e.code==="ER_TABLEACCESS_DENIED_ERROR");
  console.log("PASS Main payroll D/E/G: later completion appears only in Batch 002, same-semester documents reused, unique ordinary allocation, other-semester evidence isolated, export creates no payment, append-only grants");
  if(process.argv.includes('--omitted-payments')){await (await import('./test-omission-payments.js')).testOmissionPayments({request,admin,runtime,source:batch1,destination:batch2,cycle,semester:semester.id,people});return;}
  if(process.argv.includes("--legacy-containment"))await testLegacyContainment({request,admin,batch:batch1,destination:batch2});
  else await testManagedRelease({ request, admin, runtime, batch: batch1, laterBatch: batch2, semester: semester.id, people });
  await assertUnusedAnnualProtected(true);
  assert.ok(retryOriginalReceipt);assert.deepEqual((await ok(retryOriginalReceipt())).json(),originalReceiptResult,'Completed receipt retry remains stable after payment/release events');
  console.log('PASS unused annual post-release lifecycle: payment/hold history cannot revive obsolete receiving');
  if(process.argv.includes("--browser-release"))return;
  const modernContext={request,admin,runtime,path:`/api/v1/payout-cycles/${cycle.id}/scholarships/${people[0].annual}/eligibility`,cycleId:cycle.id,cycleVersion:cycle.version,annualId:people[0].annual,view:async()=>(await ok(request("staff",`/api/v1/payout-cycles/${cycle.id}/scholarships/${people[0].annual}/eligibility`))).json()};
  if(process.argv.includes("--profile-current"))await testProfile(modernContext,batch1);
  if(process.argv.includes("--reports"))await testReports(modernContext);
  const scopeConnection=await runtime.getConnection();
  try {
    // The original Paid row can have an authorized later correction. Assert
    // duplicate prevention against the current canonical Paid outcome instead.
    const [batchRows]=await admin.execute<RowDataPacket[]>("SELECT id FROM ovr_batches WHERE cycle_id=? ORDER BY id",[cycle.id]);
    let paidIdentity:string|undefined;
    for(const b of batchRows){paidIdentity??=(await paymentRecords(scopeConnection,String(b.id))).find(p=>p.outcome==="paid")?.scholarshipId;}
    assert.ok(paidIdentity);
    await assert.rejects(assertNoPaidClaim(scopeConnection,paidIdentity,semester.id),(e:{code?:string})=>e.code === "STIPEND_ALREADY_PAID");
    await assertNoPaidClaim(scopeConnection,paidIdentity,terms[0].id);
    console.log("PASS paid claim scope: another semester retains an independent entitlement; own eligibility remains required");
  } finally {scopeConnection.release();}
  if(process.argv.includes("--snapshot-performance"))await testSnapshot({admin,runtime,request,cycleId:cycle.id,annualId:people[0].annual,batch:batch1});
  if(process.argv.includes("--treasury")){
    await ok(request("coordinator",`/api/v1/payout-cycles/${cycle.id}/lock`,{action:"lock",expectedVersion:cycle.version,reason:"Synthetic historical Registry verification",reference:"TEST-HISTORY"}));
    const historical=await registryEligibility();assert.equal(historical.periodId,cycle.id);assert.equal(historical.items.find(i=>i.scholarId===people[0].id)!.payment,"Paid");assert.ok(historical.items.find(i=>i.scholarId===people[0].id)!.links!.some(l=>l.label==="View payment"));
    console.log("PASS locked-period Registry preserves effective Paid history and payment navigation");
  }
  if(coursePendingMode) {
    const [[paid]]=await admin.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payment_records WHERE scholarship_id=? AND outcome='paid'",[people[0].annual]);assert.equal(paid.n,1);
    const final=await read();assert.ok(JSON.stringify(final.finalization).includes("Course pending"));
    console.log("PASS approved course-pending lifecycle: Selected import, covered COR/COG with deferred course checks, independent academic compliance, official publication, finalized payroll, one actual claim and preserved frozen evidence");
    const [[frozenBefore]]=await admin.execute<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=?",[batch1]);
    const [paymentsBefore]=await admin.execute<RowDataPacket[]>("SELECT * FROM payment_records WHERE batch_id=? ORDER BY id",[batch1]);
    const beforeCompletionHash=(await read(batch2)).managed!.sourceHash;
    const masterDetail=(await ok(request("staff",`/api/v1/masterlists/${master.id}`))).json();
    const locked=(await ok(request("coordinator",`/api/v1/masterlists/${master.id}/lock`,{expectedVersion:masterDetail.version}))).json();
    const completion=(await ok(request("staff",`/api/v1/masterlists/${master.id}/amendments`,{expectedVersion:locked.version,scholarId:people[0].id,kind:"course_completion",courseId:course.id,effectiveOn:day,reason:"Course established from supplied original COR",reference:"TEST-COMPLETE-COURSE"}))).json();
    await ok(request("coordinator",`/api/v1/masterlist-amendments/${completion.amendmentId}/approve`,{reason:"Reviewed previously unknown course",reference:"TEST-COMPLETE-APPROVAL"}));
    await ok(request("coordinator",`/api/v1/masterlist-amendments/${completion.amendmentId}/publish`,{reason:"Publish reviewed course completion",reference:"TEST-COMPLETE-PUBLICATION"}));
    const [[frozenAfter]]=await admin.execute<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=?",[batch1]);assert.deepEqual(frozenAfter,frozenBefore);
    const [paymentsAfter]=await admin.execute<RowDataPacket[]>("SELECT * FROM payment_records WHERE batch_id=? ORDER BY id",[batch1]);assert.deepEqual(paymentsAfter,paymentsBefore);
    assert.notEqual((await read(batch2)).managed!.sourceHash,beforeCompletionHash);
    console.log("PASS post-payment course completion preserves frozen payroll and payment rows while invalidating unfrozen source evidence");
  }
  // Restore the isolated legacy fixture calendar mode for subsequent scenario groups.
  await admin.query("UPDATE system_settings SET archived_at=UTC_TIMESTAMP(6) WHERE code='LDSS_WORKING_ACADEMIC_YEAR'");
  if(process.argv.includes("--shared-documents")) await testSharedDocuments({admin,request});
  await writeFile("output/main-payroll/A-H-results.json",JSON.stringify({passed:true,checkedAt:new Date().toISOString(),synthetic:true,productionReady:false,tests:["A","B","C","D","E","F","G","H"]},null,2));
}
