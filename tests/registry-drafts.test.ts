import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import type { PayoutCycle } from "../server/payouts/model";
import type { OvrBatch } from "../server/ovr/model";
import type { ReprocessingItem } from "../server/ovr/reprocessing";
import { registryDrafts } from "../server/scholars/registry-drafts";
const source=vi.hoisted(()=>({view:vi.fn(),claim:vi.fn(),deferral:vi.fn(),academic:vi.fn(),issues:vi.fn()}));
vi.mock("../server/eligibility/service.js",()=>({eligibilityView:source.view}));
vi.mock("../server/ovr/reprocessing.js",()=>({semesterClaim:source.claim,draftDeferral:source.deferral}));
vi.mock("../server/academic/changes-service.js",()=>({academicCurrent:source.academic}));
vi.mock("../server/ovr/rules.js",()=>({ovrEligibilityIssues:source.issues}));
const cycle={id:"cycle",academicYearId:"year",semesterId:"semester",state:"open",periodUnavailable:false} as PayoutCycle;
const batch={id:"batch",state:"draft"} as OvrBatch;
const annual={id:"annual",scholar_id:"person",academic_id:"academic"};
function connection(managed=true,reserved:object[]=[]){
  const execute=vi.fn(async(sql:string,values:unknown[])=>{
    if(sql.includes("JOIN payroll_submission_window_versions"))return [managed?[{batch_id:"batch"}]:[]];
    if(sql.includes("FROM payroll_submission_windows"))return [[]];
    if(sql.includes("FROM semesters"))return [[{id:"semester"}]];
    if(sql.includes("FROM ovr_entries")){expect(sql).toContain("e.scholarship_id IN (?)");expect(values).toEqual(["cycle","batch","annual"]);return [reserved];}
    throw new Error("Unexpected Registry membership query");
  });return {db:{execute} as unknown as PoolConnection,execute};
}
beforeEach(()=>{vi.clearAllMocks();source.view.mockResolvedValue({});source.claim.mockResolvedValue({paid:null,pending:[]});source.deferral.mockResolvedValue(null);source.academic.mockResolvedValue({placement:{yearLevel:"2nd Year"}});source.issues.mockReturnValue([]);});
describe("Registry-only bounded draft inclusion",()=>{
 it("does no candidate work for empty selections and memoizes one selected assessment",async()=>{
  const {db,execute}=connection();const empty=registryDrafts(db,cycle,[],[batch],[],false);await empty.read();expect(execute).not.toHaveBeenCalled();
  const selected=registryDrafts(db,cycle,[annual],[batch],[],false);await selected.read();await selected.viewFor("annual","batch");expect(source.view).toHaveBeenCalledTimes(1);expect(source.view).toHaveBeenCalledWith(db,cycle,"annual","batch");expect(selected.destinations.get("annual")).toEqual([batch]);
 });
 it.each(["paid","pending","issues","deferred","expired"])("preserves the %s inclusion blocker",async reason=>{
  if(reason==="paid")source.claim.mockResolvedValue({paid:{},pending:[]});if(reason==="pending")source.claim.mockResolvedValue({paid:null,pending:[{}]});if(reason==="issues")source.issues.mockReturnValue([{code:"BLOCKED"}]);if(reason==="deferred")source.deferral.mockResolvedValue({current:true});
  const {db}=connection();const selected=registryDrafts(db,cycle,[annual],[batch],[],reason==="expired");await selected.read();expect(selected.destinations.size).toBe(0);if(reason==="deferred")expect(selected.deferred.get("annual")).toEqual([batch]);
 });
 it("keeps independent batch assessment contexts and multiple destinations",async()=>{
  const {db}=connection();const other={...batch,id:"other"};const selected=registryDrafts(db,cycle,[annual],[batch,other],[],false);await selected.read();expect(selected.destinations.get("annual")).toEqual([batch,other]);expect(source.view).toHaveBeenCalledTimes(2);
 });
 it("checks legacy automatic placement and bounded prior assignments",async()=>{
  const {db}=connection(false,[{batch_id:"other",scholarship_id:"annual",action:"remove"},{batch_id:"other",scholarship_id:"annual",action:"add"}]);
  const selected=registryDrafts(db,cycle,[annual],[batch],[],false);await selected.read();expect(selected.destinations.get("annual")).toEqual([batch]);expect(source.academic).toHaveBeenCalledWith(db,"academic");
  source.academic.mockResolvedValue({placement:{yearLevel:"unknown"}});const unsupported=registryDrafts(db,cycle,[annual],[batch],[],false);await unsupported.read();expect(unsupported.destinations.size).toBe(0);
 });
 it("does not grant automatic inclusion from a different batch's latest add",async()=>{
  const {db}=connection(false,[{batch_id:"other",scholarship_id:"annual",action:"add"}]);const selected=registryDrafts(db,cycle,[annual],[batch],[],false);await selected.read();expect(selected.destinations.size).toBe(0);expect(source.view).not.toHaveBeenCalled();
 });
 it("retains assigned reprocessing rows without treating unknown or reviewed rows as candidates",async()=>{
  source.issues.mockReturnValue([{code:"ORDINARY_ALLOCATION"}]);const {db}=connection();
  for(const status of ["assigned","review"]){const queue={scholarshipId:"annual",status,destinationBatchId:"batch",row:{}} as ReprocessingItem;const selected=registryDrafts(db,cycle,[annual],[batch],[queue],false);await selected.read();expect(selected.destinations.has("annual")).toBe(status==="assigned");}
 });
});
