import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {suppliedTextScalar,registrationV2Schema,registrationSchema,canonicalIntakeValue} from '../server/scholars/annual-intake-validation';
import type {PoolConnection} from 'mysql2/promise';
import {textStates,validateTextTransition,textHash} from '../server/scholars/intake-text-source';
import {absentText} from '../server/scholars/intake-text-model';
import {textReviewConflict,type IdentityResolutionV2} from '../server/imports/intake-binding';
import type {ImportPreviewRow} from '../server/imports/model';
const year=randomUUID(),base={identity:{mode:'new',fields:{firstName:'Fictional',lastName:'Text',middleName:'',suffix:'',birthDate:null,academicYearId:year,barangayId:null,contact:{email:'',phone:'',addressLine:''}}},workingContext:{settingId:randomUUID(),settingVersion:1,academicYearVersion:1},annualIntake:{academicYearId:year,classification:'new',sourceReference:'Declared fictional packet',initialPlacement:{schoolId:null,courseId:null,yearLevel:null}},reason:'Synthetic registration'};
describe('Supplied wording is a separate exact source',()=>{
 it.each([undefined,null,'','   ','\u00a0'])('keeps unknown %j NULL',value=>expect(suppliedTextScalar.parse(value)).toBeNull());
 it.each(['CNSC','BSIT',' OLLCF ','Camarines Norte State College','e\u0301','é','😀'.repeat(300)])('preserves exact wording %s',value=>expect(suppliedTextScalar.parse(value)).toBe(value));
 it.each(['a'.repeat(301),'😀'.repeat(301),'\t','School\nCourse','\u202eCNSC','\u2066School','\ud800',1,{},false])('rejects invalid input',value=>expect(suppliedTextScalar.safeParse(value).success).toBe(false));
 it('versions new registration without accepting text or fake IDs in the old lane',()=>{
  const v2={...base,format:'scholar-registration/v2',annualIntake:{...base.annualIntake,suppliedText:{schoolText:'CNSC',courseText:'BSIT'}}};expect(registrationV2Schema.parse(v2).annualIntake.suppliedText.schoolText).toBe('CNSC');expect(registrationSchema.safeParse(v2).success).toBe(false);expect(registrationV2Schema.safeParse({...v2,annualIntake:{...v2.annualIntake,initialPlacement:{schoolId:randomUUID(),courseId:null,yearLevel:null}}}).success).toBe(false);expect(registrationSchema.parse(base)).toEqual(base);
 });
 it('fills NULL only and preserves clear-to-unknown as a new correction',()=>{const before={revision:1,snapshotHash:'a'.repeat(64),schoolText:'CNSC',courseText:null};expect(validateTextTransition(before,{schoolText:'CNSC',courseText:'BSIT'},'completed')).toBe(true);expect(validateTextTransition(before,{schoolText:'Full name',courseText:null},'completed')).toBe(false);expect(validateTextTransition(before,{schoolText:null,courseText:null},'corrected')).toBe(true);expect(validateTextTransition(before,before,'corrected')).toBe(false);expect(validateTextTransition(absentText(),{schoolText:null,courseText:null},'registered')).toBe(true);});
 it('hashes key order consistently without conflating text spelling or Unicode forms',()=>{expect(textHash({a:1,b:'CNSC'})).toBe(textHash({b:'CNSC',a:1}));expect(textHash({s:'CNSC'})).not.toBe(textHash({s:'cnsc'}));expect(textHash({s:'é'})).not.toBe(textHash({s:'e\u0301'}));expect(canonicalIntakeValue(base)).toEqual(canonicalIntakeValue(structuredClone(base)));});
 it('requires a pinned row-specific correspondence for abbreviations',()=>{
  const review:IdentityResolutionV2={format:'intake-match/v2',row:2,scholarId:randomUUID(),expectedVersion:1,intakeId:randomUUID(),intakeRevision:1,intakeHash:'a'.repeat(64),duplicateSnapshot:'b'.repeat(64),samePerson:true,reference:'Actual fictional identity packet',suppliedTextReview:{textRevision:1,textHash:'c'.repeat(64),school:{decision:'literal_same'},course:{decision:'not_supplied'}}};
  const row={identityResolution:review,cells:{schoolCode:'Camarines Norte State College',courseCode:''}} as ImportPreviewRow,state={revision:1,snapshotHash:'c'.repeat(64),schoolText:'CNSC',courseText:null};expect(textReviewConflict(row,state)).toContain('difference');review.suppliedTextReview.school={decision:'reviewed_correspondence',reviewed:true,sourceReference:'Fictional issuer packet',reason:'Specific same-person school wording reviewed'};expect(textReviewConflict(row,state)).toBeNull();expect(textReviewConflict(row,{...state,revision:2})).toContain('changed');
 });
});

describe('Bounded supplied-text metadata',()=>{
 it('uses two set reads per 1500 owners, not one query per person',async()=>{let calls=0;const ids=Array.from({length:1501},()=>randomUUID());const db={execute:async(sql:string,args:unknown[])=>{calls++;return [sql.includes('FROM scholar_intakes')?args.map(id=>({id,scholar_id:id,academic_year_id:year,origin_kind:'manual',supplied_details:'{"format":"manual-intake/v1"}'})):[]];}} as unknown as PoolConnection;const states=await textStates(db,ids);expect(states.size).toBe(1501);expect(calls).toBe(4);expect([...states.values()].every(v=>v.state.revision===0)).toBe(true);});
});

describe('New supplied-text source formats fail closed',()=>{
 it.each(['null','{"format":"future"}','{"format":"manual-intake/v2"}'])('does not reinterpret a malformed marker as legacy absence',async supplied_details=>{const id=randomUUID(),db={execute:async(sql:string)=>[sql.includes('FROM scholar_intakes')?[{id,scholar_id:randomUUID(),academic_year_id:year,origin_kind:'manual',supplied_details}]:[]]} as unknown as PoolConnection;await expect(textStates(db,[id])).rejects.toThrow(/controlled investigation/);});
});
