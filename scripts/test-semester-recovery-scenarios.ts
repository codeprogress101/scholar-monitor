import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { ConfigRecord } from "../server/configuration/model.js";
export async function testSemesterRecovery(input: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  base: string; setupPath: string; semester: ConfigRecord; previous: ConfigRecord; actor: string; scholar: string;
}) {
  const { admin, request, base, setupPath, semester, previous, actor, scholar } = input;
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  const options = (await ok(request("coordinator", setupPath))).json();
  const setup = options.setups.find((s: {current:boolean;semesterId:string}) => s.current && s.semesterId === semester.id);
  const common = {expectedSemesterVersion:semester.version,expectedPredecessorVersion:previous.version,reviewed:true,reason:"Synthetic operational pause"};
  const disabled = (await ok(request("coordinator", setupPath + "/availability", {...common,scopeId:setup.id,expectedRevision:setup.revision,mode:"disabled"}))).json();
  const body = {...common,scopeId:disabled.id,expectedRevision:disabled.revision,mode:"enabled",expectedRecordCount:1,reason:"Synthetic resume under unchanged policy"};
  const path = setupPath + "/recover";
  for(const role of ["staff","system_admin","unassigned"]) await error(request(role,path,body),403,"PERMISSION_DENIED");
  for(const override of [{reason:""},{reviewed:false},{expectedRecordCount:undefined},{mode:"disabled"}]) await error(request("coordinator",path,{...body,...override}),422,"VALIDATION_FAILED");
  await error(request("coordinator",path,{...body,expectedRecordCount:2}),409,"SEMESTER_RECOVERY_REVIEW_REQUIRED");
  await error(request("coordinator",path,{...body,expectedRevision:999}),409,"VERSION_CONFLICT");
  const list = async () => (await ok(request("staff",base))).json().items.find((c:{semesterId:string}) => c.semesterId === semester.id);
  assert.equal((await list()).periodUnavailable,true);
  const [[owner]] = await admin.execute<RowDataPacket[]>("SELECT * FROM scholar_semesters WHERE scholar_id=? AND semester_id=?",[scholar,semester.id]);
  const [revisionsBefore] = await admin.execute<RowDataPacket[]>("SELECT * FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision",[owner.id]);
  const [coverageBefore] = await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_coverage WHERE scholar_semester_id=? ORDER BY id",[owner.id]);
  const cogCoverage = coverageBefore.find((c) => c.document_kind === "cog")!;
  await admin.execute("UPDATE requirement_coverage SET coverage_semester_id=? WHERE id=?",[semester.id,cogCoverage.id]);
  try { await error(request("coordinator",path,body),409,"SEMESTER_RECOVERY_REVIEW_REQUIRED"); }
  finally { await admin.execute("UPDATE requirement_coverage SET coverage_semester_id=? WHERE id=?",[cogCoverage.coverage_semester_id,cogCoverage.id]); }
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?",[semester.id]);
  try { const locked=await request("coordinator",path,body); assert.ok([409,423].includes(locked.statusCode),locked.body); }
  finally { await admin.execute("UPDATE semesters SET locked_at=NULL WHERE id=?",[semester.id]); }
  const entitlement=randomUUID();
  await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))",[entitlement,owner.id,scholar,semester.id,actor]);
  try { await error(request("coordinator",path,body),409,"SEMESTER_RECOVERY_REVIEW_REQUIRED"); }
  finally { await admin.execute("DELETE FROM semester_entitlements WHERE id=?",[entitlement]); }
  const countPolicies=async()=> (await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM workflow_policy_versions"))[0][0].n;
  const beforeCount=await countPolicies(), key=randomUUID();
  await admin.query("CREATE TRIGGER reject_recovery_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.scope.recover' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator",path,body,key)).statusCode,500); }
  finally { await admin.query("DROP TRIGGER reject_recovery_audit"); }
  assert.equal(await countPolicies(),beforeCount); assert.equal((await list()).periodUnavailable,true);
  const secondKey=randomUUID(), races=await Promise.all([request("coordinator",path,body,key),request("reviewer",path,body,secondKey)]);
  assert.deepEqual(races.map((r)=>r.statusCode).sort(),[200,409]);
  const winner=races[0].statusCode===200?"coordinator":"reviewer", winningKey=winner==="coordinator"?key:secondKey;
  const recovered=(await ok(request(winner,path,body,winningKey))).json();
  await error(request(winner,path,{...body,reason:"Changed recovery reason"},winningKey),409,"IDEMPOTENCY_CONFLICT");
  assert.equal(await countPolicies(),beforeCount+1);
  const [[ownerAfter]]=await admin.execute<RowDataPacket[]>("SELECT * FROM scholar_semesters WHERE id=?",[owner.id]);
  assert.deepEqual(ownerAfter,owner);
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision",[owner.id]))[0],revisionsBefore);
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_coverage WHERE scholar_semester_id=? ORDER BY id",[owner.id]))[0],coverageBefore);
  assert.equal((await list()).periodUnavailable,false);
  assert.equal((await ok(request("staff",base+"/provision",{periodId:semester.id}))).json().created,false);
  assert.equal((await ok(request("staff",`${base}/${semester.id}/academic-context`))).json().blocker,null);
  const checklist=await list(), cor=checklist.items.find((d:{coverage:{kind:string}})=>d.coverage.kind==="cor"), cog=checklist.items.find((d:{coverage:{kind:string}})=>d.coverage.kind==="cog");
  await ok(request("staff",`/api/v1/requirement-checklists/${checklist.id}/receive`,{items:[{id:cor.id,expectedVersion:0}],receivedOn:"2026-10-07",physicalReference:null,storageLocation:null,remarks:null}));
  const received=await list();
  assert.equal(received.items.find((d:{id:string})=>d.id===cor.id).status,"submitted");
  assert.equal(received.items.find((d:{id:string})=>d.id===cog.id).status,"not_submitted");
  const paused=(await ok(request("coordinator",setupPath+"/availability",{...common,scopeId:recovered.id,expectedRevision:recovered.revision,mode:"disabled"}))).json();
  await error(request("staff",`/api/v1/requirement-checklists/${checklist.id}/receive`,{items:[{id:cog.id,expectedVersion:0}],receivedOn:"2026-10-07",physicalReference:null,storageLocation:null,remarks:null}),423,"SEMESTER_WORKFLOW_UNAVAILABLE");
  await ok(request("coordinator",path,{...body,scopeId:paused.id,expectedRevision:paused.revision}));
  assert.deepEqual(await list(),received);
  // Leave a used, disabled current setup available for the browser recovery walkthrough.
  const finalOptions=(await ok(request("coordinator",setupPath))).json();
  const current=finalOptions.setups.find((s:{current:boolean;semesterId:string})=>s.current&&s.semesterId===semester.id);
  await ok(request("coordinator",setupPath+"/availability",{...common,scopeId:current.id,expectedRevision:current.revision,mode:"disabled"}));
}
