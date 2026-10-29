import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AuthorizationService } from "../server/authorization/service";
import { MasterlistConflictRemovalService } from "../server/masterlists/conflict-removal-service";
import MasterlistConflictTable from "../src/MasterlistConflictTable";

describe("Conflict removal boundary", () => {
  const boundary = () => {
    const authorization = { withPermission: vi.fn(), readSnapshot: vi.fn() };
    return { authorization, service: new MasterlistConflictRemovalService(authorization as unknown as AuthorizationService) };
  };
  it.each([
    {mode:"selected",ids:Array.from({length:201},()=>randomUUID()).join(",")},
    {mode:"selected",ids:""},
    {mode:"all",ids:randomUUID()},
  ])("rejects invalid selection before database access: $mode", query => {
    const {service,authorization} = boundary();
    expect(()=>service.review(randomUUID(),randomUUID(),query)).toThrow();
    expect(authorization.readSnapshot).not.toHaveBeenCalled();
  });
  it("rejects duplicate selected members before database access",()=>{
    const {service,authorization} = boundary(), id=randomUUID();
    expect(()=>service.review(randomUUID(),randomUUID(),{mode:"selected",ids:id+","+id})).toThrow();
    expect(authorization.readSnapshot).not.toHaveBeenCalled();
  });
  it("rejects missing explicit confirmation before write authorization",()=>{
    const {service,authorization}=boundary();
    expect(()=>service.remove(randomUUID(),randomUUID(),randomUUID(),{expectedVersion:1,expectedRemovals:1,expectedRemaining:0,selection:{mode:"all",scholarIds:[]},fingerprint:"0".repeat(64),confirm:false,reason:"Reviewed evidence",reference:"Test reference"},randomUUID())).toThrow();
    expect(authorization.withPermission).not.toHaveBeenCalled();
  });
});

it("renders explicit checked state, identity and the existing individual action",()=>{
  const id=randomUUID(), page={applicable:true,draftId:randomUUID(),yearCode:"FICTIONAL",total:1,offset:0,limit:25,items:[{scholarId:id,humanId:"2026-001",name:"<Fictional scholar>",official:null,reason:"Standing review"}]};
  const props={page,offset:0,disabled:false,onNavigateOfficial:()=>{},changePage:()=>{},onReviewRemoval:()=>{}};
  const empty=renderToStaticMarkup(<MasterlistConflictTable {...props} selection={{selected:[],toggle:()=>{},busy:false}}/>);
  expect(empty).not.toContain('checked=""');
  expect(empty).toContain('aria-label="Select conflict 2026-001"');
  expect(empty).toContain("&lt;Fictional scholar&gt;");
  expect(empty).toContain("Review draft removal");
  const chosen=renderToStaticMarkup(<MasterlistConflictTable {...props} selection={{selected:[id],toggle:()=>{},busy:false}}/>);
  expect(chosen).toContain('checked=""');
  const readOnly=renderToStaticMarkup(<MasterlistConflictTable {...props} onReviewRemoval={undefined}/>);
  expect(readOnly).not.toContain('type="checkbox"');
  expect(readOnly).not.toContain("Review draft removal");
});
