import { testTreasury } from "./test-treasury-scenarios.js";
import { verifyReturnedPayroll } from "./test-payroll-reconciliation.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { OvrDetail } from "../server/ovr/model.js";
import { today } from "../server/scholars/validation.js";
type Request = (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
const error = async (p: Promise<LightMyRequestResponse>, code: string, status = 409) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code, r.body); };
export async function graduate(request: Request, annual: string, semester: string, admin?: Connection) {
  const view = (await ok(request("staff", `/api/v1/scholarships/${annual}/status`))).json();
  const r = (await ok(request("coordinator", `/api/v1/scholarships/${annual}/status/requests`, { expectedVersion: view.version, toStatus: "graduated", kind: "change", effectiveOn: today(), reasonCode: "GRADUATION", reason: "Synthetic confirmed graduation", reference: "TEST-GRAD" }))).json();
  const path = `/api/v1/status-requests/${r.requestId}/approve`, decision = { reason: "Reviewed final funded semester", reference: "TEST-GRAD-APPROVAL" };
  await error(request("coordinator", path, decision), "FINAL_SEMESTER_REQUIRED");
  await error(request("system_admin", path, { ...decision, finalSemesterId: semester }), "PERMISSION_DENIED", 403);
  await error(request("coordinator", path, { ...decision, finalSemesterId: randomUUID() }), "INVALID_FINAL_SEMESTER");
  if (admin) {
    await admin.query("CREATE TRIGGER reject_grad_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='scholarship.status' AND NEW.action='approve' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic graduation rollback'; END IF; END");
    try { assert.equal((await request("coordinator", path, { ...decision, finalSemesterId: semester })).statusCode, 500); } finally { await admin.query("DROP TRIGGER reject_grad_audit"); }
    const [[row]] = await admin.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM graduation_confirmations WHERE request_id=?", [r.requestId]); assert.equal(row.n, 0);
    assert.equal((await ok(request("staff", `/api/v1/scholarships/${annual}/status`))).json().status, view.status);
  }
  await ok(request("coordinator", path, { ...decision, finalSemesterId: semester }));
}
export async function testManagedRelease({ request, admin, runtime, batch, laterBatch, semester, people }: { request: Request; admin: Connection; runtime: Pool; batch: string; laterBatch: string; semester: string; people: { id: string; annual: string }[] }) {
  const path = `/api/v1/ovr-batches/${batch}`, day = today();
  const read = async () => (await ok(request("staff", path))).json<OvrDetail>();
  const command = async (action: string, extra: object = {}, role = "staff", key = randomUUID()) => request(role, `${path}/${action}`, { expectedRevision: (await read()).batch.revision, effectiveOn: day, reason: "Synthetic release workflow decision", reference: "TEST-RELEASE", ...extra }, key);
  // Restore only the synthetic identity mutation used to test frozen form independence.
  await admin.execute("UPDATE scholars SET first_name='Alexandra',version=version-1 WHERE id=?", [people[0].id]);
  const frozen = (await read()).finalization;
  assert.equal((await read()).releases!.length, 2);
  for (const p of [people[0],people[2]]) assert.equal((await read()).releases!.find(e => e.scholarshipId === p.annual)!.state, "approved_for_release");
  if(process.argv.includes("--payroll-reconciliation")){
    const o=(await ok(request("staff",path+"/reconciliation-summary"))).json();
    await ok(request("staff",path+"/reconciliation-commands",{action:"report",expectedRevision:o.summary.revision,expectedReconciliationRevision:o.reconciliationRevision,scholarshipId:people[0].annual,description:"Synthetic returned document discrepancy before processing"}));
    const report=(await ok(request("coordinator",path+"/discrepancies"))).json().items[0],current=(await ok(request("coordinator",path+"/reconciliation-summary"))).json();
    assert.equal(report.paymentId,null);
    await ok(request("coordinator",path+"/reconciliation-commands",{action:"dismiss",expectedRevision:current.summary.revision,expectedReconciliationRevision:current.reconciliationRevision,caseId:report.id,reason:"Pre-processing document matches; no payment correction needed"}));
  }
  await ok(command("submit", {}, "coordinator")); await ok(command("mark-processed"));
  if(process.argv.includes("--payment-recording")) {
    await (await import("./test-payment-recording.js")).testPaymentRecording({runtime,request,batch,admin,semester});return;
  }
  await error(command("payments",{scholarshipId:people[0].annual,outcome:"paid",amount:"5000.00",remarks:"",receiptConfirmed:true}),"TREASURY_EVIDENCE_REQUIRED");
  const treasury=(await ok(request("staff",path+"/treasury-evidence",{expectedRevision:0,payrollReference:"TREASURY-SYNTHETIC-001",officeReceivedOn:day,reason:"Synthetic signed payroll received"}))).json();
  if(process.argv.includes("--treasury")){await testTreasury({request,admin,runtime,batch,people});return;}
  const money = { treasuryEvidenceRevision:treasury.revision, scholarshipId: people[0].annual, outcome: "paid", amount: "5000.00", remarks: "Signed receipt", receiptConfirmed: true };
  await error(command("payments", { ...money, amount: "2500.00" }), "VALIDATION_FAILED", 422);
  await error(command("payments", { ...money, receiptConfirmed: undefined }), "ACTUAL_RECEIPT_CONFIRMATION_REQUIRED", 422);
  const compliance = `/api/v1/scholars/${people[0].id}/semester-requirements/${semester}/compliance`;
  const review = async (enrolled: boolean) => { const v = (await ok(request("staff", compliance))).json(); return { sourceHash: v.sourceHash, expectedRevision: v.revision, findings: { ...v.history[0].findings, enrolled }, reviewed: true, reason: "Synthetic post-finalization enrollment review" }; };
  await error(request("staff", compliance + "/allocated-review", await review(false)), "PERMISSION_DENIED", 403);
  await ok(request("coordinator", compliance + "/allocated-review", await review(false)));
  assert.equal((await read()).releases!.find(e => e.scholarshipId === people[0].annual)!.state, "withheld");
  await error(command("payments", money), "PAYROLL_ENTRY_WITHHELD");
  assert.deepEqual((await read()).finalization, frozen);
  const later = (await ok(request("staff", `/api/v1/ovr-batches/${laterBatch}`))).json<OvrDetail>();
  assert.equal(later.managed!.items.find(e => e.scholarshipId === people[0].annual)!.eligible, false);
  await ok(request("coordinator", compliance + "/allocated-review", await review(true)));
  const entry = () => read().then(d => d.releases!.find(e => e.scholarshipId === people[2].annual)!);
  await error(command("hold", { scholarshipId: people[2].annual, sourceHash: (await entry()).sourceHash }), "PERMISSION_DENIED", 403);
  await ok(command("hold", { scholarshipId: people[2].annual, sourceHash: (await entry()).sourceHash }, "coordinator"));
  if (process.argv.includes("--browser-release")) {
    const v = (await ok(request("staff", `/api/v1/scholarships/${people[1].annual}/status`))).json();
    await ok(request("staff", `/api/v1/scholarships/${people[1].annual}/status/requests`, { expectedVersion: v.version, toStatus: "graduated", kind: "change", effectiveOn: day, reasonCode: "GRADUATION", reason: "Synthetic graduation browser review", reference: "TEST-BROWSER" }));
    console.log("Synthetic release browser fixture: two unpaid members, Coordinator hold and pending graduation prepared; remaining API scenarios run without --browser-release.");
    return;
  }
  await error(command("payments", { ...money, scholarshipId: people[2].annual }), "PAYROLL_ENTRY_WITHHELD");
  await ok(command("payments", { scholarshipId: people[2].annual, outcome: "not_paid", unpaidReason: "did_not_claim", amount: "0.00", remarks: "Scholar has not yet claimed the stipend" }));
  assert.equal((await entry()).held, true);
  await error(command("release-hold", { scholarshipId: people[2].annual, sourceHash: "0".repeat(64) }, "coordinator"), "SOURCE_CHANGED");
  await ok(command("release-hold", { scholarshipId: people[2].annual, sourceHash: (await entry()).sourceHash }, "coordinator"));
  assert.equal((await entry()).state, "unclaimed");
  const before = await read(), paymentKey = randomUUID(), body = { expectedRevision: before.batch.revision, effectiveOn: day, reason: "Actual full stipend received", reference: "TEST-SIGNED-RECEIPT", ...money };
  await admin.query("CREATE TRIGGER reject_release_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.processing' AND NEW.action='record-payment' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic release rollback'; END IF; END");
  try { assert.equal((await request("staff", path + "/payments", body, paymentKey)).statusCode, 500); } finally { await admin.query("DROP TRIGGER reject_release_audit"); }
  assert.equal((await read()).payments.some(p => p.scholarshipId === people[0].annual), false);
  const [[links]] = await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM entitlement_release_links"); assert.equal(links.n, 0);
  const other = randomUUID(), race = await Promise.all([request("staff", path + "/payments", body, paymentKey), request("staff", path + "/payments", body, other)]);
  assert.deepEqual(race.map(r => r.statusCode).sort(), [200,409]);
  await ok(request("staff", path + "/payments", body, race[0].statusCode === 200 ? paymentKey : other));
  // Payment alone never graduates the scholar; explicit graduation after payment archives once.
  assert.equal((await ok(request("staff", `/api/v1/scholars/${people[0].id}`))).json().graduation, null);
  await graduate(request, people[0].annual, semester);
  assert.equal((await ok(request("staff", `/api/v1/scholars/${people[0].id}`))).json().graduation.archived, true);
  assert.equal((await ok(request("staff", `/api/v1/scholars/${people[2].id}`))).json().graduation.archived, false);
  const registryPaid = (await ok(request("staff", `/api/v1/scholars/eligibility?ids=${people[0].id}&periodId=${(await read()).cycle.id}`))).json();
  assert.equal(registryPaid.items[0].payment, "Paid");
  assert.equal(registryPaid.items[0].inclusion, "Paid this semester");
  assert.equal(registryPaid.items[0].eligible, true);
  assert.equal(registryPaid.items[0].academicBasis,"payroll_approval");
  console.log("PASS Registry displays paid graduate and existing payroll membership separately from eligibility");
  // Reconciled unclaimed entitlement survives closure/locking and can be
  // claimed only by a separately approved correction with unchanged evidence.
  await verifyReturnedPayroll(request,batch);
  await ok(command("close", { reconciled: true }, "coordinator"));
  if (process.argv.includes("--reprocessing")) {
    const targetPath=`/api/v1/ovr-batches/${laterBatch}`;
    const targetRead=async()=> (await ok(request("staff",targetPath))).json<OvrDetail>();
    let target=await targetRead();
    assert.ok(target.managed!.form.rows.some(r=>r.scholarshipId === people[2].annual && r.reprocessingNote));
    // Move only this owned synthetic window's cutoff into the past for approval testing.
    await admin.execute("UPDATE payroll_submission_window_versions SET opens_on=DATE_SUB(?,INTERVAL 2 DAY),cutoff_on=DATE_SUB(?,INTERVAL 1 DAY) WHERE batch_id=?",[day,day,laterBatch]);
    target=await targetRead();
    await ok(request("coordinator",targetPath+"/defer",{expectedRevision:target.batch.revision,expectedSourceHash:target.managed!.sourceHash,scholarshipId:people[1].annual,reason:"Synthetic later batch deferral"}));
    if(process.argv.includes("--browser")) {console.log("Reprocessing browser fixture: source closed, one unclaimed retry ready in later draft.");return;}
    for(const action of ["submit-review","finalize"]) {
      target=await targetRead();
      await ok(request("coordinator",`${targetPath}/${action}`,{expectedRevision:target.batch.revision,expectedSourceHash:target.managed!.sourceHash,reason:"Synthetic reprocessing approval",reference:"REPROCESS-TEST"}));
    }
    target=await targetRead();
    assert.equal(target.releases!.length,1);
    const [[count]]=await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM semester_entitlements");assert.equal(count.n,2,"Retry must reuse the original entitlement");
    const targetTreasury=(await ok(request("staff",targetPath+"/treasury-evidence",{expectedRevision:0,payrollReference:"TREASURY-REPROCESS-001",officeReceivedOn:day,reason:"Synthetic reprocessing signed payroll received"}))).json();
    for(const action of ["submit","mark-processed","payments","close"]) {
      target=await targetRead();
      if(action === "payments") {
        const originalPayment=(await read()).payments.find(p=>p.scholarshipId === people[2].annual)!;
        const correction={expectedRevision:(await read()).batch.revision,paymentId:originalPayment.id,outcome:"paid",amount:"5000.00",effectiveOn:day,remarks:"Synthetic earlier receipt evidence",reason:"Competing historical receipt",reference:"RACE-CORRECTION"};
        await ok(request("staff",path+"/payment-corrections/request",correction));
        const pendingDetail=await read();
        assert.equal((await targetRead()).reprocessing!.find(q=>q.paymentId === originalPayment.id)!.status,"processed");
        const paymentBody={treasuryEvidenceRevision:targetTreasury.revision,expectedRevision:target.batch.revision,effectiveOn:day,reason:"Competing actual receipt",reference:"RACE-PAYMENT",scholarshipId:people[2].annual,outcome:"paid",amount:"5000.00",remarks:"Competing actual receipt",receiptConfirmed:true};
        const pendingAttempt=await request("staff",targetPath+"/payments",paymentBody);
        assert.equal(pendingAttempt.json().error.code,"PAYMENT_CORRECTION_PENDING");
        const competing=await Promise.all([
          request("coordinator",path+"/payment-corrections/approve",{expectedRevision:pendingDetail.batch.revision,correctionId:pendingDetail.paymentCorrections[0].id,reason:"Synthetic evidence independently verified",reference:"RACE-APPROVED"}),
          request("staff",targetPath+"/payments",paymentBody)
        ]);
        assert.equal(competing[0].statusCode,200,competing[0].body);
        assert.equal(competing[1].statusCode,409,competing[1].body);
        assert.ok(["STIPEND_ALREADY_PAID","PAYMENT_CORRECTION_PENDING"].includes(competing[1].json().error.code));
        assert.equal((await targetRead()).payments.length,0);
        // Correct the deliberately mistaken synthetic evidence; no real receipt occurred.
        await ok(request("staff",path+"/payment-corrections/request",{...correction,expectedRevision:(await read()).batch.revision,outcome:"not_paid",unpaidReason:"did_not_claim",amount:"0.00",remarks:"Verified synthetic ledger confirms no money received"}));
        const reversal=await read();
        await ok(request("coordinator",path+"/payment-corrections/approve",{expectedRevision:reversal.batch.revision,correctionId:reversal.paymentCorrections[0].id,reason:"No receipt independently verified",reference:"FALSE-PAID-VERIFIED"}));
        assert.equal((await targetRead()).reprocessing!.find(q=>q.paymentId === originalPayment.id)!.reasons.length,0);
        console.log("PASS cross-batch correction approval versus payment: pending blocks release, one winner, false-Paid reversal retains entitlement and permits release");
      }
      if(action==="close")await verifyReturnedPayroll(request,laterBatch);
      await ok(request(["submit","close"].includes(action)?"coordinator":"staff",`${targetPath}/${action}`,{expectedRevision:target.batch.revision,effectiveOn:day,reason:"Synthetic reprocessing payment",reference:"REPROCESS-RECEIPT",...(action === "payments" ? {treasuryEvidenceRevision:targetTreasury.revision,scholarshipId:people[2].annual,outcome:"paid",amount:"5000.00",remarks:"Actual synthetic receipt",receiptConfirmed:true} : {}),...(action === "close" ? {reconciled:true} : {})}));
    }
    assert.equal((await read()).payments.find(p=>p.scholarshipId === people[2].annual)!.outcome,"not_paid");
    assert.equal((await targetRead()).payments[0].amount,"5000.00");
    assert.deepEqual((await read()).finalization,frozen);
    const original=(await read()).payments.find(p=>p.scholarshipId === people[2].annual)!;
    await error(request("staff",path+"/payment-corrections/request",{expectedRevision:(await read()).batch.revision,paymentId:original.id,outcome:"paid",amount:"5000.00",effectiveOn:day,remarks:"Conflicting original correction",reason:"Synthetic duplicate correction",reference:"DUPLICATE-TEST"}),"STIPEND_ALREADY_PAID");
    console.log("PASS Managed reprocessing reuses entitlement, approval, payment, immutable source and duplicate correction rejection");
    return;
  }
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", [semester]);
  const closure = (await read()).batch.closure;
  await ok(command("hold", { scholarshipId: people[2].annual, sourceHash: (await entry()).sourceHash }, "coordinator"));
  const original = (await read()).payments.find(p => p.scholarshipId === people[2].annual)!;
  const correctionPath = path + "/payment-corrections/";
  const correction = { expectedRevision: (await read()).batch.revision, paymentId: original.id, outcome: "paid", amount: "5000.00", effectiveOn: day, remarks: "Signed actual receipt after unclaimed outcome", reason: "Record actual claim with approved evidence", reference: "TEST-CLAIM" };
  await error(request("staff", correctionPath + "correct", correction), "PAYMENT_CORRECTION_APPROVAL_REQUIRED", 423);
  await error(request("staff", correctionPath + "request", correction), "PAYROLL_ENTRY_WITHHELD");
  await error(command("release-hold", { scholarshipId: people[2].annual, sourceHash: (await entry()).sourceHash }), "PERMISSION_DENIED", 403);
  await ok(command("release-hold", { scholarshipId: people[2].annual, sourceHash: (await entry()).sourceHash }, "coordinator"));
  assert.equal((await read()).batch.state, "closed"); assert.deepEqual((await read()).batch.closure, closure);
  correction.expectedRevision = (await read()).batch.revision;
  await ok(request("staff", correctionPath + "request", correction));
  let d = await read(); const pending = d.paymentCorrections.find(c => c.state === "pending")!;
  assert.equal(d.payments.find(p => p.id === original.id)!.outcome, "not_paid");
  await ok(request("coordinator", correctionPath + "approve", { expectedRevision: d.batch.revision, correctionId: pending.id, reason: "Actual full receipt independently checked", reference: "TEST-CLAIM-APPROVED" }));
  d = await read(); assert.equal(d.originalPayments.find(p => p.id === original.id)!.outcome, "not_paid"); assert.equal(d.reconciliation.paidTotal, "10000.00");
  assert.equal((await ok(request("staff", `/api/v1/scholars/${people[2].id}`))).json().graduation.archived, true);
  const current = (await ok(request("staff", "/api/v1/scholars?q=Payroll"))).json();
  assert.ok(current.items.every((p: {id:string}) => p.id !== people[0].id && p.id !== people[2].id));
  const archived = (await ok(request("staff", "/api/v1/scholars?q=Payroll&scope=graduated"))).json(); assert.equal(archived.total, 2);
  await error(request("staff", `/api/v1/scholars/${people[0].id}/scholarships`, { academicYearId: randomUUID(), expectedVersion: 0, effectiveOn: day }), "GRADUATE_RENEWAL_BLOCKED");
  assert.deepEqual((await read()).finalization, frozen);
  for (const table of ["graduation_confirmations", "entitlement_release_links"]) for (const verb of ["UPDATE", "DELETE"]) await assert.rejects(runtime.query(verb === "UPDATE" ? `UPDATE ${table} SET actor_id=actor_id WHERE 1=0` : `DELETE FROM ${table} WHERE 1=0`));
  await graduate(request, people[1].annual, semester);
  const noEntitlement = (await ok(request("staff", `/api/v1/scholars/${people[1].id}`))).json().graduation;
  assert.equal(noEntitlement.archived, false);
  assert.match(noEntitlement.label, /no approved final stipend/);
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT id FROM semester_entitlements WHERE scholar_id=?", [people[1].id]))[0].length, 0);
  console.log("PASS Managed release: fixed full receipt, post-finalization blockers, immutable snapshots, held allocations, roles, unclaimed/approved claim, audit rollback, concurrent retry, graduation before/after receipt, no invented pending entitlement, searchable archive and renewal guard");
}
