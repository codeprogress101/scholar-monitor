import {describe,it,expect} from "vitest";
import {receiptPreview} from "../server/imports/receipt-preview";
import type {ImportPreviewRow} from "../server/imports/model";
import {historicalCalendarSchema} from "../server/configuration/historical-calendar";
const row=(n:number,extra:Partial<ImportPreviewRow>={})=>({row:n,cells:{},errors:[],warnings:[],references:[],receipts:{periodId:"x",cor:true,cog:true},...extra} as ImportPreviewRow);
describe("import receipt presentation",()=>{
 it("aggregates one setup blocker while retaining affected row numbers",()=>{
  const issue={code:"SETUP_MISSING",message:"Enable semester documents"};
  expect(receiptPreview([row(2,{receiptIssue:issue}),row(3,{receiptIssue:issue})])).toEqual({receiptBlockers:[{...issue,rows:[2,3]}],receiptGroups:[]});
 });
 it("counts only explicitly reviewed exemptions, retaining different cohort coverage",()=>{
  const context={sourceHash:"x",cor:"Current",cog:"Previous"};
  expect(receiptPreview([row(2,{receiptContext:context}),row(3,{receiptContext:{...context,cogExempt:true}}),row(4,{receiptContext:{...context,cog:"Other approved predecessor"},receipts:{periodId:"x",cor:false,cog:true}})]).receiptGroups).toEqual([{cor:"Current",cog:"Previous",corCount:2,cogCount:1,exemptCount:1},{cor:"Current",cog:"Other approved predecessor",corCount:0,cogCount:1,exemptCount:0}]);
 });
 it("requires reviewed historical creation and explicit current calendar revisions",()=>{
  expect(historicalCalendarSchema.safeParse({reviewed:false}).success).toBe(false);
 });
});
