import {describe,it,expect,vi} from "vitest";
import {candidatePage} from "../server/ovr/detail-reads";
import type {PoolConnection} from "mysql2/promise";
import {renderToStaticMarkup} from "react-dom/server";
import PayrollDraftRoster from "../src/PayrollDraftRoster";
import type {OvrSummary} from "../server/ovr/detail-model";
import type {Session} from "../src/auth-api";
describe("Bounded draft roster read",()=>{
 it.each([null,[],"invalid",{view:"anything"},{view:"included",limit:101},{view:"excluded",offset:-1},{view:"included",q:"a".repeat(161)},{view:"included",skipValidation:true}])("rejects an invalid read before touching database: %j",async raw=>{const execute=vi.fn(),query=vi.fn();await expect(candidatePage({execute,query} as unknown as PoolConnection,"draft",raw)).rejects.toThrow();expect(execute).not.toHaveBeenCalled();expect(query).not.toHaveBeenCalled();});
 it("shows a paged included roster and explicit exclusion entry without a whole-cohort table",()=>{const markup=renderToStaticMarkup(<PayrollDraftRoster detail={{batch:{id:"draft",revision:2},cycle:{yearCode:"YEAR",semesterCode:"TERM"}} as OvrSummary} session={{user:{id:"person"}} as Session} permissions={[]} onReview={()=>{}} onSaved={()=>{}} onBusyChange={()=>{}} primaryAction={<button disabled>Submit Payroll for review</button>}/>);expect(markup).toContain("Included scholars");expect(markup).toContain("Review Excluded Scholars");expect(markup).toContain("loading 25 scholars");expect(markup).not.toContain("Candidate pages");expect(markup).not.toContain("Other / blocked (1000)");});
});
