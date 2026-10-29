import {suppliedTextScenarios} from './test-intake-supplied-text-db.js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import type {ImportPreview,ImportPreviewRow,ImportResult} from '../server/imports/model.js';
import type {RegistrationContext,RegistrationResult} from '../server/scholars/annual-intake-model.js';
import type {IdentityResolution} from '../server/imports/intake-binding.js';
import {digest} from '../server/auth/crypto.js';
import {encodeImportRows,decodeImportRows} from '../server/imports/storage.js';
import {validateConfirmedScope} from '../server/imports/confirmed-scope.js';
type Request=(role:string,url:string,body?:object,key?:string,method?:"GET"|"POST"|"PATCH")=>Promise<LightMyRequestResponse>;
type Workbook=(rows:(string|number)[][])=>Promise<{fileName:string;base64:string}>;
export async function bindingScenarios(request:Request,pool:Pool,workbook:Workbook,day:string,yearId:string,semesterId:string){
 if(process.argv.includes('--intake-text'))await suppliedTextScenarios(request,pool,workbook,day,yearId,semesterId);
 const ok=async<T>(p:Promise<LightMyRequestResponse>,status=200)=>{const r=await p;assert.equal(r.statusCode,status,r.body);return r.json<T>();};
 // Simulate a saved pre-A2.1 immutable preview without the newly displayed candidates.
 const legacyData=await workbook([['LegacyPreviewCompatibility','Nerissa','','','SIMPLE-SCHOOL',2,'New','Import course']]);
 const current=await ok<ImportPreview>(request('staff','/api/v1/imports/stage',legacyData));
 const legacyRows=current.rows.map(r=>{const copy={...r};delete copy.identityCandidates;delete copy.textReviewFormat;delete copy.suppliedTextTargets;return copy;}),legacyId=randomUUID(),legacyHash=digest(JSON.stringify(legacyRows));
 const [[storedCurrent]]=await pool.execute<RowDataPacket[]>('SELECT raw_rows FROM import_jobs WHERE id=?',[current.id]);const legacyRaw=decodeImportRows<ImportPreviewRow>(storedCurrent.raw_rows).map(r=>{const copy={...r};delete copy.textReviewFormat;delete copy.suppliedTextTargets;return copy;});
 await pool.execute('INSERT INTO import_jobs(id,actor_id,command_id,file_name,file_hash,raw_rows,preview,preview_hash,created_at) SELECT ?,actor_id,?,file_name,file_hash,?,?,?,UTC_TIMESTAMP(6) FROM import_jobs WHERE id=?',[legacyId,randomUUID(),encodeImportRows(legacyRaw),encodeImportRows(legacyRows),legacyHash,current.id]);
 const legacy=await ok<ImportResult>(request('staff',`/api/v1/imports/${legacyId}/confirm`,{hash:legacyHash,confirm:true}));assert.equal(legacy.format,undefined);assert.equal(legacy.items.length,1);
 console.log('PASS Saved legacy simple preview confirms without rewriting its stored JSON/hash');
 const context=await ok<RegistrationContext>(request('staff','/api/v1/scholar-registrations/context'));
 const register=async(name:string,classification:'new'|'continuing',placement={schoolId:null,courseId:null,yearLevel:null} as {schoolId:string|null;courseId:string|null;yearLevel:string|null})=>ok<RegistrationResult>(request('staff','/api/v1/scholar-registrations',{identity:{mode:'new',fields:{firstName:name,lastName:'BindingExample',middleName:'',suffix:'',birthDate:null,academicYearId:yearId,barangayId:null,contact:{email:'',phone:'',addressLine:''}}},workingContext:context.workingContext,annualIntake:{academicYearId:yearId,classification,sourceReference:'Fictional A2.1 registration evidence declared before import',initialPlacement:placement},reason:'Synthetic individually registered person'}),201);
 const a=await register('Marisol','new'),b=await register('Rodrigo','continuing');
 // A profile edit tests reuse of a genuine current version above the old hard-coded 1.
 const [[person]]=await pool.execute<RowDataPacket[]>('SELECT * FROM scholars WHERE id=?',[b.id]);
 assert.equal(person.version,1);
 await ok(request('staff',`/api/v1/scholars/${b.id}`,{expectedVersion:1,reason:'Synthetic contact update before later import',fields:{firstName:'Rodrigo',lastName:'BindingExample',middleName:'',suffix:'',birthDate:null,academicYearId:yearId,barangayId:null,contact:{email:'',phone:'09171234567',addressLine:''}}},randomUUID(),'PATCH'));
 const rows:(string|number)[][]=[['BindingExample','Marisol','','','SIMPLE-SCHOOL',2,'New',''],['BindingExample','Rodrigo','','','SIMPLE-SCHOOL',3,'Old',''],['BindingNew','Claudine','','','SIMPLE-SCHOOL',4,'Continuing','']];
 const payload={...await workbook(rows),receipts:{periodId:semesterId,cor:true,cog:true},approvedSelection:{reference:'Fictional approved A2.1 mixed list',effectiveOn:day}};
 const stage=(body:object)=>ok<ImportPreview>(request('coordinator','/api/v1/imports/stage',body));
 const preview=await stage(payload);assert.equal(preview.ready,false);assert.equal(preview.rows.filter(r=>r.warnings.length).length,2);
 const mappings=preview.rows.slice(0,2).map((r):IdentityResolution=>{const m=r.identityCandidates!.candidates.find(c=>c.id===(r.row===2?a.id:b.id))!;assert.ok(m.intake);return {format:'intake-match/v2',suppliedTextReview:{textRevision:0,textHash:null,school:{decision:'not_supplied'},course:{decision:'not_supplied'}},row:r.row,scholarId:m.id,expectedVersion:m.version,intakeId:m.intake.id,intakeRevision:m.intake.revision,intakeHash:m.intake.snapshotHash,duplicateSnapshot:r.identityCandidates!.snapshot,samePerson:true,reference:'Compared fictional permanent ID and identity packet'};});
 assert.equal(mappings[1].expectedVersion,2);
 for(const body of [{...payload,identityResolutions:[mappings[0],mappings[0]]},{...payload,identityResolutions:[{...mappings[0],row:999}]},{...payload,identityResolutions:[{...mappings[0],samePerson:false}]}])assert.equal((await request('coordinator','/api/v1/imports/stage',body)).statusCode,422);
 for(const role of ['staff','system_admin','unassigned'])assert.equal((await request(role,'/api/v1/imports/stage',{...payload,identityResolutions:mappings})).statusCode,403);
 for(const mapping of [{...mappings[0],intakeHash:'0'.repeat(64)},{...mappings[0],intakeId:randomUUID()},{...mappings[0],expectedVersion:999},{...mappings[0],duplicateSnapshot:'0'.repeat(64)}])assert.equal((await stage({...payload,identityResolutions:[mapping,mappings[1]]})).ready,false);
 const changedRows=structuredClone(rows);changedRows[0][6]='Continuing';assert.equal((await stage({...payload,...await workbook(changedRows),identityResolutions:mappings})).ready,false);
 const conflict=await register('Celestina','new',{schoolId:null,courseId:null,yearLevel:'5'});
 const conflictPayload={...await workbook([['BindingExample','Celestina','','','SIMPLE-SCHOOL',2,'New','Import course']]),approvedSelection:payload.approvedSelection};
 const cp=await stage(conflictPayload),cm=cp.rows[0].identityCandidates!.candidates.find(c=>c.id===conflict.id)!;
 assert.equal((await stage({...conflictPayload,identityResolutions:[{...mappings[0],scholarId:cm.id,expectedVersion:cm.version,intakeId:cm.intake!.id,intakeRevision:cm.intake!.revision,intakeHash:cm.intake!.snapshotHash,duplicateSnapshot:cp.rows[0].identityCandidates!.snapshot}]})).ready,false);
 const resolved=await stage({...payload,identityResolutions:mappings});assert.equal(resolved.ready,true,JSON.stringify(resolved.rows));
 const [[before]]=await pool.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM scholars) people,(SELECT COUNT(*) FROM academic_records) academics,(SELECT COUNT(*) FROM scholarship_records) annuals,(SELECT COUNT(*) FROM participations) participants,(SELECT COUNT(*) FROM import_intake_bindings) links');
 const [roots]=await pool.query<RowDataPacket[]>('SELECT * FROM scholar_intakes WHERE id IN (?,?)',[a.annualIntake.id,b.annualIntake.id]);
 const body={hash:resolved.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true};
 for(const [table,condition] of [['import_intake_bindings','TRUE'],['academic_records','TRUE'],['scholarship_records','TRUE'],['continuing_roster_decisions','TRUE'],['import_confirmations','TRUE'],['audit_logs',"NEW.event_type='scholars.import' AND NEW.action='confirm'"]] as const){
  await pool.query(`CREATE TRIGGER a21_forced_failure BEFORE INSERT ON ${table} FOR EACH ROW BEGIN IF ${condition} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic A2.1 rollback'; END IF; END`);
  try{assert.equal((await request('coordinator',`/api/v1/imports/${resolved.id}/confirm`,body)).statusCode,500);}finally{await pool.query('DROP TRIGGER a21_forced_failure');}
  const [[after]]=await pool.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM scholars) people,(SELECT COUNT(*) FROM academic_records) academics,(SELECT COUNT(*) FROM scholarship_records) annuals,(SELECT COUNT(*) FROM participations) participants,(SELECT COUNT(*) FROM import_intake_bindings) links');assert.deepEqual(after,before);
 }
 const key=randomUUID(),race=await Promise.all([request('coordinator',`/api/v1/imports/${resolved.id}/confirm`,body,key),request('coordinator',`/api/v1/imports/${resolved.id}/confirm`,body,key)]);
 const result=await ok<ImportResult>(Promise.resolve(race[0]));assert.deepEqual(await ok(Promise.resolve(race[1])),result);assert.equal(result.format,'bound-import/v2');assert.equal(result.items[0].id,a.id);assert.equal(result.items[1].id,b.id);assert.equal(result.items[1].scholarId,b.scholarId);assert.equal(result.items.filter(i=>i.source?.kind==='manual-binding').length,2);
 assert.deepEqual(await ok(request('coordinator',`/api/v1/imports/${resolved.id}/confirm`,body,key)),result);
 const [afterRoots]=await pool.query<RowDataPacket[]>('SELECT * FROM scholar_intakes WHERE id IN (?,?)',[a.annualIntake.id,b.annualIntake.id]);assert.deepEqual(afterRoots,roots);
 const [[afterPerson]]=await pool.execute<RowDataPacket[]>('SELECT version FROM scholars WHERE id=?',[b.id]);assert.equal(afterPerson.version,2);
 const another=await stage({...payload,identityResolutions:mappings});assert.equal(another.ready,false);
 const db=await pool.getConnection();try{await validateConfirmedScope(db,resolved.id,resolved.rows,result);for(const bad of [{...result,format:undefined}, {...result,items:result.items.slice(1)}, {...result,items:result.items.map((i,n)=>n?i:{...i,source:undefined})}])await assert.rejects(validateConfirmedScope(db,resolved.id,resolved.rows,bad),/source links/);}finally{db.release();}
 const db2=await pool.getConnection();try{const [links]=await db2.query<RowDataPacket[]>('SELECT * FROM import_intake_bindings WHERE import_job_id=?',[resolved.id]);assert.equal(links.length,2);await assert.rejects(db2.query('UPDATE import_intake_bindings SET binding_hash=binding_hash WHERE id=?',[links[0].id]),/immutable/);await assert.rejects(db2.query('DELETE FROM import_intake_bindings WHERE id=?',[links[0].id]),/immutable/);}finally{db2.release();}
 await ok(request('coordinator',`/api/v1/scholar-intakes/${a.annualIntake.id}/classification-corrections`,{expectedRevision:1,expectedSnapshotHash:a.annualIntake.snapshotHash,academicYearVersion:context.workingContext.academicYearVersion,classification:'continuing',sourceReference:'Fictional corrected annual source after import',reason:'Controlled correction retains original reviewed import pin',reviewed:true}));
 const check=await pool.getConnection();try{await validateConfirmedScope(check,resolved.id,resolved.rows,result);}finally{check.release();}
 const history=await ok<{items:unknown[];linkedImports:{items:unknown[]}}>(request('staff',`/api/v1/scholar-intakes/${a.annualIntake.id}/history`));assert.equal(history.items.length,2);assert.equal(history.linkedImports.items.length,1);
 console.log('PASS A2.1 manual New/Continuing, actual person version, mixed reuse, strict mappings, roles, conflicts, six rollback points, concurrent/lost-response retry, immutable roots and resolver failures');
 return {register,stage,payload,rows,result,preview:resolved,mappings};
}
