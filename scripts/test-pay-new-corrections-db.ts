import 'dotenv/config';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {resolve} from 'node:path';import {mkdir,writeFile} from 'node:fs/promises';import mysql,{type RowDataPacket} from 'mysql2/promise';import type {LightMyRequestResponse} from 'fastify';import ExcelJS from 'exceljs';import {SIMPLE_COLUMNS,type ImportPreview,type ImportResult} from '../server/imports/model.js';import type {PriorBatchPreview} from '../server/requirements/prior-approval-service.js';import type {DocumentBatchPreview} from '../server/requirements/batch-model.js';import {schemaManifest} from '../server/schema-manifest.js';import {applyMigrations,grantAuthRuntime} from './migration-lib.mjs';import {buildApp} from '../server/app.js';import {loadConfig} from '../server/config.js';import {AuthService} from '../server/auth/service.js';import {newToken} from '../server/auth/crypto.js';import {AuthorizationService} from '../server/authorization/service.js';import {today} from '../server/scholars/validation.js';import type {ConfigRecord} from '../server/configuration/model.js';import type {RegistryEligibility} from '../server/scholars/registry-eligibility.js';import type {SubmissionWindowView} from '../server/payouts/submission-service.js';
assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_paynew_test_${suffix}`,
  runtimeUser = `ldss_test_${suffix}`,
  runtimePassword = newToken();
const browserPort=3026;
assert.ok(Number.isInteger(browserPort)&&browserPort===3026,"Use an explicit isolated test port from 3003 through 3010");
const origin = `http://127.0.0.1:${browserPort}`,
  password = "A long synthetic testing passphrase!";
const adminConfig = {
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: "root",
  password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
  timezone: "Z",
};
const admin = await mysql.createConnection(adminConfig);
let root: mysql.Pool | undefined,
  runtime: mysql.Pool | undefined,
  app: ReturnType<typeof buildApp> | undefined;
let createdDatabase = false,
  createdUser = false,
  passed = 0;
const pass = (name: string) => {
  passed++;
  console.log("PASS " + name);
};
try {
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  createdDatabase = true;
  await admin.changeUser({ database });
  assert.equal((await applyMigrations(admin)).length, schemaManifest.length);
  assert.deepEqual(await applyMigrations(admin), []);
  await admin.query(
    `CREATE USER ${admin.escape(runtimeUser)}@'localhost' IDENTIFIED BY ${admin.escape(runtimePassword)}`,
  );
  createdUser = true;
  await grantAuthRuntime(admin, database, runtimeUser);
  root = mysql.createPool({ ...adminConfig, database, connectionLimit: 4 });
  runtime = mysql.createPool({
    ...adminConfig,
    database,
    user: runtimeUser,
    password: runtimePassword,
    connectionLimit: 8,
  });
  const auth = new AuthService(root),
    roles = new AuthorizationService(root);
  const db = {
    pool: runtime,
    check: async () => "connected" as const,
    close: async () => {},
  };
  app = buildApp(
    loadConfig({ APP_ENV: "test", PORT: String(browserPort), APP_ORIGIN: origin,INDIVIDUAL_PAYMENTS_ENABLED:process.argv.includes('--individual-payments')||process.argv.includes('--omitted-historical')?'true':'false',OMITTED_PAYMENTS_ENABLED:process.argv.includes('--omitted-historical')?'true':'false',INDIVIDUAL_DOCUMENTS_ENABLED:process.argv.includes('--individual-documents')||process.argv.includes('--individual-settlement')?'true':'false',INDIVIDUAL_SETTLEMENT_ENABLED:process.argv.includes('--individual-settlement')?'true':'false' }),
    { database: db },
  );
  if(process.argv.includes("--prior-debug"))app.addHook("onError",(r,_reply,error,done)=>{if(r.url.includes("historical-setup")||r.url.includes("ovr-batches")||r.url.includes("document-batches/prior-approval"))console.error("Disposable prior-batch diagnostic:",error.code,error.message);done();});
  const accounts = new Map<
    string,
    { id: string; cookie: string; csrf: string }
  >();
  for (const role of [
    "system_admin",
    "staff",
    "coordinator",
    "unassigned",
  ] as const) {
    const email = role + "@example.invalid",
      id = await auth.createAccount(
        "Synthetic " + role,
        email,
        "test-operator",
      );
    const reset = await auth.issueReset(
      email,
      "test-operator",
      "Synthetic fixture activation",
    );
    await auth.resetPassword(reset, password, "127.0.0.1", randomUUID());
    if (role !== "unassigned")
      await roles.setRoles({
        email,
        roles: [role],
        expectedVersion: 2,
        requestId: randomUUID(),
        operator: "test-operator",
        reason: "Synthetic fixture role",
      });
    const response: LightMyRequestResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin, "content-type": "application/json" },
      payload: { email, password },
    });
    assert.equal(response.statusCode, 200);
    accounts.set(role, {
      id,
      cookie: String(response.headers["set-cookie"]).split(";")[0],
      csrf: response.json().csrfToken,
    });
  }
  const request = (
    role: string,
    url: string,
    body?: object,
    key: string = randomUUID(),
    method: "GET" | "POST" | "PATCH" = body ? "POST" : "GET",
  ) => {
    const account = accounts.get(role)!;
    return app!.inject({
      method,
      url,
      headers: {
        cookie: account.cookie,
        origin,
        "x-role": "coordinator",
        ...(body
          ? {
              "content-type": "application/json",
              "x-csrf-token": account.csrf,
              "idempotency-key": key,
            }
          : {}),
      },
      ...(body ? { payload: body } : {}),
    });
  };
  const expectError = (
    response: LightMyRequestResponse,
    status: number,
    code: string,
  ) => {
    assert.equal(response.statusCode, status, response.body);
    assert.equal(response.json().error.code, code);
  };
  const config = async (kind: string, fields: object) => {
    const response = await request(
      "system_admin",
      "/api/v1/configuration/" + kind,
      {
        action: "create",
        expectedVersion: 0,
        reason: "Synthetic scholar fixture",
        fields,
      },
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json<ConfigRecord>();
  };

  const day = today(),
    later = (n: number) =>
      new Date(Date.parse(day + "T00:00:00Z") + n * 86400000)
        .toISOString()
        .slice(0, 10);
  const year = await config("academic-years", {
    code: "IMPORT-YEAR",
    name: "Import year",
    startsOn: later(-60),
    endsOn: later(300),
  });
  const school = await config("schools", {
    code: "IMPORT-SCHOOL",
    name: "Import school",
  });
  await config("courses", { code: "IMPORT-COURSE", name: "Import course" });
  const ok = async <T>(promise: Promise<LightMyRequestResponse>) => {
    const r = await promise;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<T>();
  };
  await config('settings',{code:'LDSS_WORKING_ACADEMIC_YEAR',name:'Working year',valueType:'text',value:year.id});
  const semester=await config('semesters',{code:'NEW-FIRST',name:'New payroll first semester',academicYearId:year.id,startsOn:later(-20),endsOn:later(120)});
  await root.execute("UPDATE semesters SET term_kind='first' WHERE id=?",[semester.id]);
  const [[setting]]=await root.query<RowDataPacket[]>("SELECT version FROM system_settings WHERE code='LDSS_WORKING_ACADEMIC_YEAR'");
  const previous=await ok<{semesterId:string}>(request('system_admin','/api/v1/configuration/historical-calendar',{workingYearId:year.id,expectedWorkingYearVersion:year.version,expectedSettingVersion:setting.version,year:{code:'NEW-PRIOR-YEAR',name:'Prior evidence year',startsOn:later(-420),endsOn:later(-61)},semester:{code:'NEW-PRIOR-SECOND',name:'Prior covered semester',startsOn:later(-240),endsOn:later(-61),termKind:'second'},reason:'Reviewed synthetic prior coverage',reference:'TEST-NEW-COVERAGE',reviewed:true}));
  for(const [code,documentKind]of [['NEW-COR','enrollment'],['NEW-COG','grades']])await ok(request('system_admin','/api/v1/requirement-definitions',{action:'create',code,expectedVersion:0,reason:'Synthetic evidence policy',reference:'TEST-NEW',fields:{documentKind,name:code,instructions:'Synthetic physical paper',appliesTo:'semester',semesterId:semester.id,effectiveFrom:later(-20),effectiveUntil:null}}));
  const setupPath='/api/v1/continuing-rosters/00000000-0000-4000-8000-000000000001/semester-setup';
  const definitions=await ok<{definitions:{id:string;code:string}[];coverage:{sourceHash:string}|null}>(request('coordinator',setupPath+'?semesterId='+semester.id));
  const scope=await ok<{id:string}>(request('coordinator',setupPath,{semesterId:semester.id,expectedSemesterVersion:semester.version,policyDate:day,predecessorSemesterId:previous.semesterId,...(definitions.coverage?.sourceHash?{expectedCoverageHash:definitions.coverage.sourceHash}:{}),coverageReason:'Reviewed prior-semester documents',corDefinitionVersionId:definitions.definitions.find(d=>d.code==='NEW-COR')!.id,cogDefinitionVersionId:definitions.definitions.find(d=>d.code==='NEW-COG')!.id,issuer:'Synthetic committee',reference:'TEST-NEW',sourceReference:'Synthetic held documents',reviewed:true}));
  await ok(request('coordinator',setupPath+'/availability',{scopeId:scope.id,expectedRevision:1,mode:'enabled',expectedSemesterVersion:semester.version,expectedPredecessorVersion:1,...(definitions.coverage?.sourceHash?{expectedCoverageHash:definitions.coverage.sourceHash}:{}),reviewed:true}));
  const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('New cohort');sheet.addRow(SIMPLE_COLUMNS);
  const total=process.argv.includes('--quick')?25:835;for(let i=0;i<total;i++)sheet.addRow(['NewPayroll'+i,randomBytes(12).toString('hex'),'','',school.code,i===0?1:2,i%2?'Old':'New',i<380?'':'Import course']);
  const imported=await ok<ImportPreview>(request('coordinator','/api/v1/imports/stage',{fileName:'new-cohort.xlsx',base64:Buffer.from(await workbook.xlsx.writeBuffer()).toString('base64'),approvedSelection:{reference:'Synthetic source-backed selection',effectiveOn:day},receipts:{periodId:semester.id,cor:true,cog:true}}));
  assert.equal(imported.ready,true,JSON.stringify(imported.rows.filter(r=>r.errors.length).slice(0,1)));
  const confirmed=await ok<ImportResult>(request('coordinator',`/api/v1/imports/${imported.id}/confirm`,{hash:imported.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true}));assert.equal(confirmed.items.length,total);
  const docPreview=await ok<DocumentBatchPreview>(request('staff',`/api/v1/document-batches/preview?importId=${imported.id}&semesterId=${semester.id}`));
  const cors=docPreview.documents.filter(d=>d.kind==='cor');assert.equal(cors.length,total);
  await ok(request('staff','/api/v1/document-batches/verify',{importId:imported.id,semesterId:semester.id,scopeHash:docPreview.scopeHash,effectiveOn:day,reason:'Synthetic physical paper verification',reference:'TEST-NEW-PAPERS',ordinaryChecksConfirmed:true,deferredCourseChecksConfirmed:true,items:cors.map(d=>({id:d.id,version:d.version,contextHash:d.contextHash!}))}));
  const approvalPath=`/api/v1/document-batches/prior-approval-preview?importId=${imported.id}&semesterId=${semester.id}`;
  const approvalPreview=await ok<PriorBatchPreview>(request('coordinator',approvalPath));assert.ok(approvalPreview.members.every(m=>!m.issues.length));
  const approvalBody={importId:imported.id,semesterId:semester.id,scopeHash:approvalPreview.scopeHash,items:approvalPreview.members.map(m=>({id:m.id,sourceHash:m.sourceHash})),approvalOn:later(-1),deadlineOn:later(-1),sourceLocation:'Synthetic approved source packet',documentsPreviouslyVerified:true,academicEligibilityPreviouslyApproved:true,deadlineCompliancePreviouslyApproved:true,correctMistakenWaivers:false,reason:'Synthetic prior assessment held before publication',reference:'TEST-NEW-PRIOR'};
  for(const role of ['staff','system_admin','unassigned'])assert.equal((await request(role,'/api/v1/document-batches/prior-approval',approvalBody)).statusCode,403);
  const key=randomUUID();
  await root.query("CREATE TRIGGER fail_new_prior BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='documents.prior-batch-approval' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  assert.equal((await request('coordinator','/api/v1/document-batches/prior-approval',{...approvalBody,items:approvalBody.items.slice(0,2)})).statusCode,500);await root.query('DROP TRIGGER fail_new_prior');
  assert.equal(Number((await root.query<RowDataPacket[]>('SELECT COUNT(*) n FROM prior_batch_approvals'))[0][0].n),0);
  const priorResponses=await Promise.all([request('coordinator','/api/v1/document-batches/prior-approval',approvalBody,key),request('coordinator','/api/v1/document-batches/prior-approval',approvalBody,key)]);for(const r of priorResponses)assert.equal(r.statusCode,200,r.body);assert.deepEqual(priorResponses[0].json(),priorResponses[1].json());
  assert.equal((await request('coordinator','/api/v1/document-batches/prior-approval',{...approvalBody,reference:'Changed payload'},key)).statusCode,409);
  assert.equal((await ok<PriorBatchPreview>(request('coordinator',approvalPath))).members.filter(m=>m.approval?.valid).length,total);
  const [savedApproval]=await root.query<RowDataPacket[]>('SELECT * FROM prior_batch_members ORDER BY scholar_semester_id');
  pass('Ordered original approvals before publication, truthful document basis, role restrictions, audit rollback, concurrent exact retries and key conflict');
  const evidence={reason:'Synthetic reviewed official publication',reference:'TEST-NEW-MASTER'};
  const master=await ok<{id:string}>(request('staff','/api/v1/masterlists',{academicYearId:year.id,title:'Synthetic new-cohort official list',...evidence}));
  for(const [i,p]of confirmed.items.entries())await ok(request('staff',`/api/v1/masterlists/${master.id}/entries`,{action:'add',expectedVersion:i+1,scholarId:p.id,awardNumber:null,...evidence}));
  for(const [i,action]of ['submit-verification','submit-approval','approve','publish'].entries())await ok(request(i<2?'staff':'coordinator',`/api/v1/masterlists/${master.id}/${action}`,{expectedVersion:total+1+i,...evidence,...(action==='publish'?{effectiveOn:day}:{})}));
  const after=await ok<PriorBatchPreview>(request('coordinator',approvalPath));assert.equal(after.members.filter(m=>m.approval?.valid).length,total);
  assert.deepEqual((await root.query<RowDataPacket[]>('SELECT * FROM prior_batch_members ORDER BY scholar_semester_id'))[0],savedApproval);
  const member=after.members[0],scholar=member.scholarId,cog=member.documents.find(d=>d.kind==='cog')!;
  const compliance=await ok<{result:string;priorApproval:{valid:boolean};documents:{kind:string;verified:boolean;context:unknown}[]}>(request('staff',`/api/v1/scholars/${scholar}/semester-requirements/${semester.id}/compliance`));assert.equal(compliance.result,'compliant');assert.ok(compliance.priorApproval.valid);assert.ok(compliance.documents.find(d=>d.kind==='cog')?.verified);assert.equal(compliance.documents.find(d=>d.kind==='cog')?.context,null);
  const individual=await request('staff',`/api/v1/requirement-instances/${cog.id}/verification-context`);expectError(individual,409,'ACADEMIC_RECORD_REQUIRED');assert.match(individual.json().error.message,/NEW-PRIOR-YEAR/);
  assert.equal(Number((await root.query<RowDataPacket[]>("SELECT COUNT(*) n FROM requirement_workflow_events WHERE JSON_EXTRACT(details,'$.basis')='prior_batch_approval' AND JSON_EXTRACT(details,'$.verification') IS NOT NULL"))[0][0].n),0);
  pass('Same-year official initial activations preserve immutable approvals; prior attestation does not invent individual COG placement');
  const readMember=async()=>({approval:(await ok<{priorApproval:{valid:boolean}}>(request('staff',`/api/v1/scholars/${scholar}/semester-requirements/${semester.id}/compliance`))).priorApproval});
  const [[annual]]=await root.execute<RowDataPacket[]>('SELECT * FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?',[scholar,year.id]);
  async function probe(sql:string,args:(string|number|Date|null)[],restoreSql:string,restoreArgs:(string|number|Date|null)[]){await root!.execute(sql,args);assert.equal((await readMember()).approval?.valid,false);await root!.execute(restoreSql,restoreArgs);assert.equal((await readMember()).approval?.valid,true);}
  await probe("UPDATE scholarship_records SET operational_status='suspended' WHERE id=?",[annual.id],'UPDATE scholarship_records SET operational_status=? WHERE id=?',[annual.operational_status,annual.id]);
  await probe('UPDATE scholarship_records SET status_version=2 WHERE id=?',[annual.id],'UPDATE scholarship_records SET status_version=? WHERE id=?',[annual.status_version,annual.id]);
  const [[person]]=await root.execute<RowDataPacket[]>('SELECT first_name FROM scholars WHERE id=?',[scholar]);
  await probe("UPDATE scholars SET first_name='Changed source' WHERE id=?",[scholar],'UPDATE scholars SET first_name=? WHERE id=?',[person.first_name,scholar]);
  const [[academic]]=await root.execute<RowDataPacket[]>('SELECT * FROM academic_records WHERE scholar_id=? AND academic_year_id=?',[scholar,year.id]);
  await probe('UPDATE academic_records SET year_level=? WHERE id=?',[academic.year_level==='First year'?'Second year':'First year',academic.id],'UPDATE academic_records SET year_level=? WHERE id=?',[academic.year_level,academic.id]);
  const [[receipt]]=await root.execute<RowDataPacket[]>('SELECT received_on FROM requirement_receipts WHERE instance_id=?',[cog.id]);
  await probe('UPDATE requirement_receipts SET received_on=? WHERE instance_id=?',[later(-1),cog.id],'UPDATE requirement_receipts SET received_on=? WHERE instance_id=?',[receipt.received_on,cog.id]);
  const [[authority]]=await root.execute<RowDataPacket[]>('SELECT a.id,a.scope FROM workflow_authority_versions a JOIN prior_batch_approvals p ON p.authority_version_id=a.id LIMIT 1');
  await probe("UPDATE workflow_authority_versions SET scope=JSON_SET(scope,'$.semesterId',?) WHERE id=?",[randomUUID(),authority.id],'UPDATE workflow_authority_versions SET scope=? WHERE id=?',[typeof authority.scope==='string'?authority.scope:JSON.stringify(authority.scope),authority.id]);
  await probe('UPDATE masterlist_publications SET snapshot_hash=? WHERE masterlist_id=?',['0'.repeat(64),master.id],'UPDATE masterlist_publications SET snapshot_hash=SHA2(snapshot,256) WHERE masterlist_id=?',[master.id]);
  pass('Changed identity, academic placement, document receipt, adverse/subsequent standing, unavailable approval authority and corrupt official proof invalidate without renewing approval');
  const cycle=await ok<{id:string;version:number}>(request('system_admin','/api/v1/payout-cycles',{action:'create',code:'NEW-CYCLE',semesterId:semester.id,expectedSemesterVersion:semester.version,expectedVersion:0,fields:{name:'New ordinary payroll',targetDate:later(5),requirements:[]},...evidence}));
  await ok(request('coordinator',`/api/v1/payout-cycles/${cycle.id}/open`,{action:'open',expectedVersion:cycle.version,...evidence}));cycle.version++;
  // Reviewed historical setup is used only to establish the existing one-term exception.
  // It is a disposable fixture; no synthetic source is transferred to primary.
  const historical=await ok<{batchId:string}>(request('coordinator',`/api/v1/payout-cycles/${cycle.id}/historical-setup`,{expectedCycleVersion:cycle.version,expectedSemesterVersion:semester.version,expectedYearVersion:year.version,importId:imported.id,deadlineOn:later(-1),reportedReleaseOn:day,sourceLocation:'Synthetic original historical source',...evidence,reviewed:true}));
  // The historical import keeps its original approval and yesterday's attested deadline.
  const wrongHistorical=await ok<{managed:{items:{issues:{code:string}[]}[]}}>(request('staff',`/api/v1/ovr-batches/${historical.batchId}`));assert.ok(wrongHistorical.managed.items.every(i=>!i.issues.some(r=>r.code==='HISTORICAL_BATCH_APPROVAL_REQUIRED')));
  const windowsPath=`/api/v1/payout-cycles/${cycle.id}/submission-windows`;
  let windows=await ok<SubmissionWindowView>(request('coordinator',windowsPath));assert.ok(windows.newDraft.blockers.some(x=>x.includes('deadline')));
  const newWindow={expectedCycleVersion:cycle.version,expectedDeadlineRevision:windows.deadlines[0].revision,expectedSequence:1,opensOn:day,cutoffOn:day};
  expectError(await request('coordinator',windowsPath+'/open-window',newWindow),409,'REGULAR_PERIODS_INCOMPLETE');
  // Unfinalized historical source cannot satisfy P05; fresh ordinary semantics still require normal two-term mapping.
  const second=await config('semesters',{code:'NEW-SECOND',name:'New second semester',academicYearId:year.id,startsOn:later(121),endsOn:later(290)});
  await root.execute("UPDATE semesters SET term_kind='second' WHERE id=?",[second.id]);
  await ok(request('system_admin','/api/v1/requirement-definitions',{action:'create',code:'NEW-SECOND-PAYOUT',expectedVersion:0,reason:'Synthetic second-semester payout policy',reference:'TEST-SECOND',fields:{name:'Synthetic second-semester paper',instructions:'Held synthetic evidence',appliesTo:'payout',semesterId:second.id,effectiveFrom:later(121),effectiveUntil:null}}));
  const secondRequirements=await ok<{items:{id:string}[]}>(request('system_admin',`/api/v1/requirement-definitions/applicable?semesterId=${second.id}&appliesTo=payout&effectiveOn=${later(180)}`));
  const secondCycle=await ok<{id:string;version:number}>(request('system_admin','/api/v1/payout-cycles',{action:'create',code:'NEW-CYCLE-TWO',semesterId:second.id,expectedSemesterVersion:second.version,expectedVersion:0,fields:{name:'Second ordinary payroll',targetDate:later(180),requirements:secondRequirements.items.map(d=>({definitionVersionId:d.id,allowWaiver:false}))},...evidence}));
  await ok(request('coordinator',`/api/v1/payout-cycles/${secondCycle.id}/submission-windows/configure`,{expectedCycleVersion:secondCycle.version,termNumber:2,expectedSemesterVersion:second.version,expectedYearVersion:year.version,deadlineOn:later(180)}));
  windows=await ok<SubmissionWindowView>(request('coordinator',windowsPath));assert.ok(windows.newDraft.supportedConfiguration);assert.ok(windows.newDraft.blockers.some(x=>x.includes('deadline')));
  expectError(await request('coordinator',windowsPath+'/open-window',newWindow),422,'WINDOW_OUTSIDE_DEADLINE');
  for(const role of ['staff','system_admin','unassigned'])assert.equal((await request(role,windowsPath+'/open-window',newWindow)).statusCode,403);
  pass('Existing roles and expired deadline reject new drafts; unfinished historical setup cannot grant the one-term exception');
  // Explicit deadline extension is authorized only inside this owned fixture to exercise the existing future-window contract.
  await ok(request('coordinator',windowsPath+'/extend-semester',{expectedCycleVersion:cycle.version,expectedRevision:windows.deadlines[0].revision,deadlineOn:later(2),reason:'Synthetic disposable prospective-window acceptance'}));
  // A distinct confirmed import supplies the genuinely new cohort. Historical
  // owners above remain fenced by their existing omission-origin contract.
  const extraBook=new ExcelJS.Workbook(),extraSheet=extraBook.addWorksheet('Independent new scholar');extraSheet.addRow(SIMPLE_COLUMNS);extraSheet.addRow(['IndependentNew',randomBytes(12).toString('hex'),'','',school.code,2,'New','Import course']);
  const extraImport=await ok<ImportPreview>(request('coordinator','/api/v1/imports/stage',{fileName:'independent.xlsx',base64:Buffer.from(await extraBook.xlsx.writeBuffer()).toString('base64'),approvedSelection:{reference:'Independent source-backed selection',effectiveOn:day},receipts:{periodId:semester.id,cor:true,cog:true}}));
  const extra=await ok<ImportResult>(request('coordinator',`/api/v1/imports/${extraImport.id}/confirm`,{hash:extraImport.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true}));
  const extraPreview=await ok<PriorBatchPreview>(request('coordinator',`/api/v1/document-batches/prior-approval-preview?importId=${extraImport.id}&semesterId=${semester.id}`));
  await ok(request('coordinator','/api/v1/document-batches/prior-approval',{...approvalBody,importId:extraImport.id,scopeHash:extraPreview.scopeHash,items:extraPreview.members.map(m=>({id:m.id,sourceHash:m.sourceHash})),approvalOn:day,deadlineOn:day,reference:'TEST-INDEPENDENT-PRIOR'}));
  const extraMaster=await ok<{id:string}>(request('staff','/api/v1/masterlists',{academicYearId:year.id,title:'Independent new official list',...evidence}));
  await ok(request('staff',`/api/v1/masterlists/${extraMaster.id}/entries`,{action:'add',expectedVersion:1,scholarId:extra.items[0].id,awardNumber:null,...evidence}));
  for(const [i,action]of ['submit-verification','submit-approval','approve','publish'].entries())await ok(request(i<2?'staff':'coordinator',`/api/v1/masterlists/${extraMaster.id}/${action}`,{expectedVersion:2+i,...evidence,...(action==='publish'?{effectiveOn:day}:{})}));
  const noPayroll=await ok<RegistryEligibility>(request('staff',`/api/v1/scholars/eligibility?ids=${extra.items[0].id}&academicYearId=${year.id}&semesterId=${semester.id}`));assert.equal(noPayroll.items[0].payout?.status,'Not yet assigned to a new payroll');assert.equal(noPayroll.items[0].payout?.context?.batchId,null);assert.equal(noPayroll.items[0].payout?.eligible,false);
  const windowBody={...newWindow,expectedDeadlineRevision:windows.deadlines[0].revision+1},windowKey=randomUUID();
  await root.query("CREATE TRIGGER fail_new_window BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payroll.submission' AND NEW.action='open-window' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic window rollback'; END IF; END");
  const [[beforeFailure]]=await root.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM ovr_batches) batches,(SELECT COUNT(*) FROM payroll_submission_windows) windows,(SELECT COUNT(*) FROM payroll_submission_window_versions) versions');
  const failure=await request('coordinator',windowsPath+'/open-window',windowBody);
  const [[afterFailure]]=await root.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM ovr_batches) batches,(SELECT COUNT(*) FROM payroll_submission_windows) windows,(SELECT COUNT(*) FROM payroll_submission_window_versions) versions');assert.deepEqual(afterFailure,beforeFailure);
  await root.query('DROP TRIGGER fail_new_window');
  // The exact audit event name is checked below before any successful command.
  assert.equal(failure.statusCode,500,failure.body);
  const created=await Promise.all([request('coordinator',windowsPath+'/open-window',windowBody,windowKey),request('coordinator',windowsPath+'/open-window',windowBody,windowKey)]);for(const r of created)assert.equal(r.statusCode,200,r.body);assert.deepEqual(created[0].json(),created[1].json());
  const newBatch=created[0].json<{batchId?:string;id?:string}>(),batchId=newBatch.batchId??newBatch.id!;
  assert.equal((await request('coordinator',windowsPath+'/open-window',{...windowBody,cutoffOn:later(1)},windowKey)).statusCode,409);
  const detail=await ok<{managed:{items:{scholarshipId:string;issues:{code:string}[]}[];form:{rows:unknown[]}}}>(request('staff',`/api/v1/ovr-batches/${batchId}`));
  assert.ok(detail.managed.items.find(i=>i.scholarshipId===annual.id)!.issues.some(r=>r.code==='HISTORICAL_BATCH_APPROVAL_REQUIRED'));
  assert.equal(detail.managed.form.rows.length,1);
  const registry=await ok<RegistryEligibility>(request('staff',`/api/v1/scholars/eligibility?ids=${extra.items[0].id}&academicYearId=${year.id}&semesterId=${semester.id}`));assert.equal(registry.items[0].payout?.context?.batchId,batchId);assert.equal(registry.items[0].payout?.publishedActive,true);
  pass('Fresh ordinary draft uses its own timing and no unrelated historical source; existing window transaction rolls back, retries exactly and retains batch context');
  const originalOwners=new Set(savedApproval.map(r=>r.scholar_semester_id));assert.deepEqual((await root.query<RowDataPacket[]>('SELECT * FROM prior_batch_members ORDER BY scholar_semester_id'))[0].filter(r=>originalOwners.has(r.scholar_semester_id)),savedApproval);
  assert.equal(Number((await root.query<RowDataPacket[]>('SELECT COUNT(*) n FROM payment_records'))[0][0].n),0);
  const output=process.env.PAY_NEW_EVIDENCE_DIR;
  if(output){await mkdir(output,{recursive:true});await writeFile(resolve(output,'correction-integration.json'),JSON.stringify({passed:true,scenarios:passed,people:total,ownedDatabase:database,originalApprovalsExact:true,primaryNeverUsedForMutations:true},null,2));}
  if(process.argv.includes('--browser')){
   const fixture=buildApp(loadConfig({APP_ENV:'test',PORT:'3026',APP_ORIGIN:origin}),{database:db,clientRoot:resolve('dist/client')});let stop=()=>{};const done=new Promise<void>(r=>{stop=r;});fixture.get('/__fixture/stop',async()=>{setTimeout(stop,50);return{stopping:true};});await fixture.listen({host:'127.0.0.1',port:3026});if(output)await writeFile(resolve(output,'browser-fixture.json'),JSON.stringify({origin,scholarId:extra.items[0].id,historicalScholarId:scholar,yearId:year.id,semesterId:semester.id,cycleId:cycle.id,batchId},null,2));console.log('Owned PAY-NEW fixture ready');await done;await fixture.close();
  }
  console.log(`All ${passed} PAY-NEW correction groups passed.`);
}finally{
 if(app)await app.close();if(runtime)await runtime.end();if(root)await root.end();assert.match(database,/^ldss_paynew_test_\d+_[a-f0-9]{8}$/);assert.match(runtimeUser,/^ldss_test_\d+_[a-f0-9]{8}$/);if(createdUser)await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);if(createdDatabase)await admin.query(`DROP DATABASE \`${database}\``);await admin.end();
}
