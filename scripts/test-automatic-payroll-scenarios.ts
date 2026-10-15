import assert from "node:assert/strict";
import JSZip from "jszip";
import type { Connection } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { OvrBatch, OvrDetail } from "../server/ovr/model.js";

export async function testAutomaticPayroll(c: { admin: Connection; cycleId: string; cycleVersion: number; annualId: string; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse> }) {
  const ok = async <T>(p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r.json<T>(); };
  const evidence = { reason: "Synthetic automatic payroll review", reference: "AUTO-TEST" };
  const create = (code: string) => ok<OvrBatch>(c.request("staff", `/api/v1/payout-cycles/${c.cycleId}/ovr-batches`, { ...evidence, code, name: code, expectedRevision: 0, expectedCycleVersion: c.cycleVersion }));
  let batch = await create("AUTO-DRAFT");
  const path = `/api/v1/ovr-batches/${batch.id}`;
  const read = () => ok<OvrDetail>(c.request("staff", path));
  let d = await read();
  assert.equal(d.entries.length, 0, "Reading must not write membership");
  assert.deepEqual(d.automatic?.entries.map(e => e.scholarshipId), [c.annualId]);
  assert.equal(d.automatic.form.rows[0].amountCentavos, 500000);
  const preview = await c.request("staff", `${path}/payroll-form?draft=true`);
  assert.equal(preview.statusCode, 200, preview.body);
  assert.ok(preview.body.includes("DRAFT") && preview.body.includes("5,000.00"));
  const word = await c.request("staff", `${path}/payroll-form?draft=true&format=docx`);
  assert.equal(word.statusCode,200);
  assert.match(String(word.headers["content-type"]),/wordprocessingml/);
  assert.match(String(word.headers["content-disposition"]),/attachment/);
  const zip=await JSZip.loadAsync(word.rawPayload);
  assert.match(await zip.file("word/header1.xml")!.async("string"),/NOT FOR PAYMENT/);
  assert.equal((await c.request("system_admin",`${path}/payroll-form?draft=true&format=docx`)).statusCode,403);
  assert.equal((await c.request("staff",`${path}/payroll-form?format=invalid`)).statusCode,422);
  assert.equal((await read()).entries.length,0);
  const command = (action: string, hash = d.automatic!.sourceHash, role = "coordinator") => c.request(role, `${path}/${action}`, { ...evidence, expectedRevision: batch.revision, expectedSourceHash: hash });
  assert.equal((await command("submit-review", "0".repeat(64))).statusCode, 409);
  await c.admin.query("CREATE TRIGGER fail_auto_payroll BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.draft' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END");
  try { assert.equal((await command("submit-review")).statusCode, 500); }
  finally { await c.admin.query("DROP TRIGGER fail_auto_payroll"); }
  assert.equal((await read()).entries.length, 0);
  batch = await ok<OvrBatch>(command("submit-review"));
  d = await read();
  assert.equal(d.entries.length, 1, "Submission saves automatic membership without manual Add");
  assert.equal((await command("finalize", d.automatic!.sourceHash, "staff")).statusCode, 403);
  const scholarId = d.entries[0].evidence.current.sources.scholarship.scholarId;
  batch=await ok<OvrBatch>(command("return-to-draft"));
  batch=await ok<OvrBatch>(c.request("coordinator",path+"/defer",{...evidence,expectedRevision:batch.revision,scholarshipId:c.annualId}));
  await c.admin.execute("UPDATE scholars SET version=version+1 WHERE id=?",[scholarId]);
  assert.equal((await read()).automatic!.entries.length,0,"Evidence changes cannot cancel deferral");
  await c.admin.execute("UPDATE scholars SET version=version-1 WHERE id=?",[scholarId]);
  const alternative=await create("DEFERRED-DESTINATION");
  const alt=await ok<OvrDetail>(c.request("staff",`/api/v1/ovr-batches/${alternative.id}`));
  assert.equal(alt.automatic!.entries.length,1,"Deferral releases old saved draft membership for a later batch");
  await ok<OvrBatch>(c.request("coordinator",`/api/v1/ovr-batches/${alternative.id}/defer`,{...evidence,expectedRevision:alternative.revision,scholarshipId:c.annualId}));
  batch=await ok<OvrBatch>(c.request("coordinator",path+"/restore",{...evidence,expectedRevision:batch.revision,scholarshipId:c.annualId}));
  d=await read();batch=await ok<OvrBatch>(command("submit-review"));d=await read();

  await c.admin.execute("UPDATE scholars SET version=version+1 WHERE id=?", [scholarId]);
  d = await read();
  const stale = await command("finalize");
  assert.equal(stale.statusCode, 409);
  assert.equal(stale.json().error.code, "PAYROLL_REVIEW_STALE");
  batch = await ok<OvrBatch>(command("return-to-draft"));
  d = await read();
  batch = await ok<OvrBatch>(command("submit-review"));
  d = await read();
  batch = await ok<OvrBatch>(command("finalize"));
  d = await read();
  assert.equal(d.finalization?.snapshot.legacyPayrollForm?.rows.length, 1);
  assert.equal(d.automatic, null);
  assert.equal(d.payments.length, 0, "Approval and preview never record payment");
  const official = await c.request("staff", `${path}/payroll-form`);
  assert.equal(official.statusCode, 200);
  assert.ok(!official.body.includes("NOT FOR PAYMENT"));
  const officialWord=await c.request("staff",`${path}/payroll-form?format=docx`);
  assert.equal(officialWord.statusCode,200);
  const frozenZip=await JSZip.loadAsync(officialWord.rawPayload);
  assert.doesNotMatch(await frozenZip.file("word/header1.xml")!.async("string"),/NOT FOR PAYMENT/);
  const [audit]=await c.admin.query("SELECT details FROM audit_logs WHERE event_type='payroll.export' AND entity_id=? AND JSON_UNQUOTE(JSON_EXTRACT(details,'$.format'))='docx'",[batch.id]);
  assert.equal((audit as unknown[]).length,2);
  assert.equal((await read()).payments.length,0);
  const other = await create("AUTO-SECOND");
  const second = await ok<OvrDetail>(c.request("staff", `/api/v1/ovr-batches/${other.id}`));
  assert.equal(second.automatic?.form.rows.length, 0, "Already assigned scholar cannot enter a second batch");
  assert.deepEqual((await read()).finalization, d.finalization);
  const day = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  async function process(target: OvrBatch, outcome: "paid" | "not_paid", unpaidReason: "did_not_claim" | "review" = "did_not_claim") {
    const url=`/api/v1/ovr-batches/${target.id}`;
    for (const action of ["submit","mark-processed","payments","close"]) {
      const body={...evidence,expectedRevision:target.revision,effectiveOn:day,
        ...(action === "payments" ? {scholarshipId:c.annualId,outcome,amount:outcome === "paid" ? "5000.00" : "0.00",remarks:unpaidReason === "review" ? "Synthetic review required" : "",...(outcome === "not_paid" ? {unpaidReason} : {receiptConfirmed:true})} : {}),
        ...(action === "close" ? {reconciled:true} : {})};
      if(action === "payments" && outcome === "paid") {
        const [semRows]=await c.admin.query("SELECT starts_on,ends_on FROM semesters WHERE id=?",[source.cycle.semesterId]);
        await c.admin.execute("UPDATE semesters SET starts_on=DATE_SUB(?,INTERVAL 2 DAY),ends_on=DATE_SUB(?,INTERVAL 1 DAY) WHERE id=?",[day,day,source.cycle.semesterId]);
        try {
          const expired=await c.request("staff",`${url}/${action}`,body);
          assert.equal(expired.statusCode,409,expired.body);assert.equal(expired.json().error.code,"CLAIM_PERIOD_ENDED");
        } finally {await c.admin.execute("UPDATE semesters SET starts_on=?,ends_on=? WHERE id=?",[(semRows as {starts_on:Date;ends_on:Date}[])[0].starts_on,(semRows as {ends_on:Date}[])[0].ends_on,source.cycle.semesterId]);}
      }
      const role=["submit","close"].includes(action) ? "coordinator" : "staff";
      if(action === "close" && outcome === "not_paid") {
        const [beforeQueue]=await c.admin.query("SELECT COUNT(*) AS n FROM payroll_reprocessing");
        await c.admin.query("CREATE TRIGGER reject_retry_close BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.processing' AND NEW.action='close' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic queue rollback'; END IF; END");
        try {assert.equal((await c.request(role,`${url}/${action}`,body)).statusCode,500);} finally {await c.admin.query("DROP TRIGGER reject_retry_close");}
        assert.deepEqual((await c.admin.query("SELECT COUNT(*) AS n FROM payroll_reprocessing"))[0],beforeQueue);
      }
      if(action === "close" || action === "payments") {
        const keys=[crypto.randomUUID(),crypto.randomUUID()];
        const results=await Promise.all(keys.map(key=>c.request(role,`${url}/${action}`,body,key)));
        assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,action === "close" ? 423 : 409]);
        const winner=results.findIndex(r=>r.statusCode === 200);
        target=await ok<OvrBatch>(c.request(role,`${url}/${action}`,body,keys[winner]));
      } else target=await ok<OvrBatch>(c.request(role,`${url}/${action}`,body));
    }
    return target;
  }
  batch=await process(batch,"not_paid","review");
  assert.equal((await read()).reprocessing!.length,0,"Review-required outcomes are not inferred to be unclaimed");
  // Seed a historical generic Not paid record only in this owned synthetic database.
  await c.admin.execute("UPDATE payment_records SET unpaid_reason=NULL WHERE batch_id=?",[batch.id]);
  const historical=(await read()).payments[0];assert.equal(historical.unpaidReason,null);
  const classification={expectedRevision:batch.revision,paymentId:historical.id,unpaidReason:"did_not_claim",reason:"Coordinator confirmed no collection"};
  for(const role of ["staff","system_admin"]) assert.equal((await c.request(role,path+"/classify-unpaid",classification)).statusCode,403);
  const classificationKey=crypto.randomUUID();
  batch=await ok<OvrBatch>(c.request("coordinator",path+"/classify-unpaid",classification,classificationKey));
  assert.deepEqual(await ok<OvrBatch>(c.request("coordinator",path+"/classify-unpaid",classification,classificationKey)),batch);
  assert.equal((await read()).originalPayments[0].unpaidReason,null,"Classification does not rewrite the historical payment");
  const source=await read();
  assert.equal(source.payments[0].unpaidReason,"did_not_claim");
  assert.equal(source.reprocessing?.[0].status,"assigned");
  let retry=await ok<OvrDetail>(c.request("staff",`/api/v1/ovr-batches/${other.id}`));
  assert.equal(retry.automatic?.entries.length,1,JSON.stringify(retry.reprocessing));
  const retryPath=`/api/v1/ovr-batches/${other.id}`;
  let retryBatch=retry.batch;
  const deferral={...evidence,expectedRevision:retryBatch.revision,scholarshipId:c.annualId};
  assert.equal((await c.request("staff",`${retryPath}/defer`,deferral)).statusCode,403);
  retryBatch=await ok<OvrBatch>(c.request("coordinator",`${retryPath}/defer`,deferral));
  retry=await ok<OvrDetail>(c.request("staff",retryPath));assert.equal(retry.automatic?.entries.length,0);
  retryBatch=await ok<OvrBatch>(c.request("coordinator",`${retryPath}/restore`,{...evidence,expectedRevision:retryBatch.revision,scholarshipId:c.annualId}));
  for(const action of ["submit-review","finalize"]) {
    retry=await ok<OvrDetail>(c.request("staff",retryPath));
    retryBatch=await ok<OvrBatch>(c.request("coordinator",`${retryPath}/${action}`,{...evidence,expectedRevision:retryBatch.revision,expectedSourceHash:retry.automatic!.sourceHash}));
  }
  await process(retryBatch,"not_paid");
  let history=await read();
  assert.equal(history.reprocessing!.filter(q=>q.status === "queued").length,1,"No draft retains queue");
  const third=await create("AUTO-THIRD"),fourth=await create("AUTO-FOURTH");
  history=await read();const queued=history.reprocessing!.find(q=>q.status === "queued")!;
  assert.ok(queued);assert.equal(queued.destinations.length,2,"Multiple drafts require explicit selection");
  const assignBody={expectedRevision:1,expectedQueueRevision:queued.revision,reprocessingId:queued.id,reason:"Synthetic destination selection"};
  assert.equal((await c.request("staff",`/api/v1/ovr-batches/${third.id}/assign-reprocessing`,assignBody)).statusCode,403);
  const assignments=await Promise.all([third,fourth].map(b=>c.request("coordinator",`/api/v1/ovr-batches/${b.id}/assign-reprocessing`,assignBody)));
  assert.deepEqual(assignments.map(r=>r.statusCode).sort(),[200,409]);
  const selected=assignments[0].statusCode === 200 ? third : fourth;
  const finalPath=`/api/v1/ovr-batches/${selected.id}`;
  let finalDetail=await ok<OvrDetail>(c.request("staff",finalPath));
  for(const action of ["submit-review","finalize"]) {
    await ok<OvrBatch>(c.request("coordinator",`${finalPath}/${action}`,{...evidence,expectedRevision:finalDetail.batch.revision,expectedSourceHash:finalDetail.automatic!.sourceHash}));
    finalDetail=await ok<OvrDetail>(c.request("staff",finalPath));
  }
  await process(finalDetail.batch,"paid");
  assert.equal((await ok<OvrDetail>(c.request("staff",finalPath))).payments[0].amount,"5000.00");
  const original=(await read()).payments[0];
  const duplicate=await c.request("staff",path+"/payment-corrections/request",{...evidence,expectedRevision:(await read()).batch.revision,paymentId:original.id,outcome:"paid",amount:"5000.00",effectiveOn:day,remarks:"Synthetic duplicate correction"});
  assert.equal(duplicate.statusCode,409);assert.equal(duplicate.json().error.code,"STIPEND_ALREADY_PAID");
  assert.equal((await read()).payments[0].outcome,"not_paid","Original outcome retained");
  assert.deepEqual((await read()).finalization,source.finalization,"Original official form retained");
  assert.equal((await ok<OvrDetail>(c.request("staff",retryPath))).payments[0].outcome,"not_paid");
  // A verified false-Paid reversal preserves the original record and reopens only this entitlement.
  let paidDetail=await ok<OvrDetail>(c.request("staff",finalPath));
  const falsePaid={...evidence,expectedRevision:paidDetail.batch.revision,paymentId:paidDetail.payments[0].id,outcome:"not_paid",unpaidReason:"did_not_claim",amount:"0.00",effectiveOn:day,remarks:"Verified receipt register: no money was received"};
  assert.equal((await c.request("staff",finalPath+"/payment-corrections/correct",falsePaid)).statusCode,423);
  await ok<OvrBatch>(c.request("staff",finalPath+"/payment-corrections/request",falsePaid));
  paidDetail=await ok<OvrDetail>(c.request("staff",finalPath));
  assert.equal(paidDetail.payments[0].outcome,"paid","Pending reversal is not a new entitlement");
  const approval={...evidence,expectedRevision:paidDetail.batch.revision,correctionId:paidDetail.paymentCorrections[0].id};
  const approvalKey=crypto.randomUUID();
  await c.admin.query("CREATE TRIGGER reject_false_paid BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payment.correction' AND NEW.action='approve' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try {assert.equal((await c.request("coordinator",finalPath+"/payment-corrections/approve",approval,approvalKey)).statusCode,500);}
  finally {await c.admin.query("DROP TRIGGER reject_false_paid");}
  assert.equal((await ok<OvrDetail>(c.request("staff",finalPath))).payments[0].outcome,"paid");
  const approved=await ok<OvrBatch>(c.request("coordinator",finalPath+"/payment-corrections/approve",approval,approvalKey));
  assert.deepEqual(await ok<OvrBatch>(c.request("coordinator",finalPath+"/payment-corrections/approve",approval,approvalKey)),approved);
  const reversed=await ok<OvrDetail>(c.request("staff",finalPath));
  assert.equal(reversed.payments[0].outcome,"not_paid");
  assert.equal(reversed.originalPayments[0].outcome,"paid");
  const remaining=selected.id === third.id ? fourth : third;
  const remainingPath=`/api/v1/ovr-batches/${remaining.id}`;
  let reopened=await ok<OvrDetail>(c.request("staff",remainingPath));
  assert.equal(reopened.automatic?.form.rows.length,1,"Verified no-receipt reversal permits the original stipend to be processed again");
  for(const action of ["submit-review","finalize"]) {
    await ok<OvrBatch>(c.request("coordinator",remainingPath+"/"+action,{...evidence,expectedRevision:reopened.batch.revision,expectedSourceHash:reopened.automatic!.sourceHash}));
    reopened=await ok<OvrDetail>(c.request("staff",remainingPath));
  }
  await process(reopened.batch,"paid");
  const effective=await Promise.all([path,retryPath,finalPath,remainingPath].map(url=>ok<OvrDetail>(c.request("staff",url))));
  assert.equal(effective.flatMap(d=>d.payments).filter(p=>p.outcome === "paid").length,1,"Exactly one effective stipend across all linked attempts");
  console.log("PASS false-Paid reversal: approval, rollback, idempotency, immutable history and exactly one effective stipend after reprocessing");
  // Restore this synthetic identity version so the enclosing eligibility fixture remains current.
  await c.admin.execute("UPDATE scholars SET version=version-1 WHERE id=?", [scholarId]);
  console.log("PASS automatic payroll: live inclusion, preview, read-only projection, stale protection, audit rollback, same-Coordinator approval, duplicate exclusion and immutable unpaid finalization");
}
