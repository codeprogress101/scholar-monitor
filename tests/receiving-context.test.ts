import {expect,it} from "vitest";
import {resolveReceivingContext,receivingContextFromRoute,selectedReceivingContext} from "../src/receiving-selection";
import type {ReceivingPeriod} from "../server/requirements/instances-model";
const period=(id:string,cycle:string|null,extra:Partial<ReceivingPeriod>={}):ReceivingPeriod=>({id,semesterId:"semester",academicYearId:"year",payoutCycleId:cycle,preferred:true,canProvision:true,semesterVersion:1,payoutVersion:1,label:id,...extra});
it("matches annual receiving by semantic cycle, not semester ID",()=>{
 const ps=[period("receiving-a","cycle-a"),period("receiving-b","cycle-b")];
 expect(resolveReceivingContext(ps,"",{academicYearId:"year",semesterId:"semester",payoutCycleId:"cycle-b"},"annual",false)).toBe("receiving-b");
 expect(resolveReceivingContext(ps,"",{semesterId:"semester"},"annual",false)).toBe("");
});
it("resolves roster and rollover semester-owned receiving independently of payroll cycle",()=>{
 expect(resolveReceivingContext([period("semester",null)],"",{academicYearId:"year",semesterId:"semester",payoutCycleId:"cycle"},"scholar",true)).toBe("semester");
 expect(resolveReceivingContext([period("semester",null)],"",{payoutCycleId:"cycle"},"annual",false)).toBe("");
});
it("does not fall back for closed periods, wrong owners, years or missing cycles",()=>{
 const ps=[period("a","cycle-a"),period("b","cycle-b",{preferred:false})];
 for(const context of [{annualId:"wrong",periodId:"a"},{periodId:"b"},{academicYearId:"past"},{payoutCycleId:"missing"},{semesterId:"missing"}]) expect(resolveReceivingContext(ps,"",context,"annual",false)).toBe("");
 expect(resolveReceivingContext(ps,"a",{periodId:"b"},"annual",false)).toBe("a");
});
it("round trips old bookmarks without confusing their owner/period IDs",()=>{
 const context=receivingContextFromRoute(new URLSearchParams("receivingYear=annual&period=receiving-a&academicYear=year"));
 expect(resolveReceivingContext([period("receiving-a","cycle")],"",context,"annual",false)).toBe("receiving-a");
 expect(receivingContextFromRoute(new URLSearchParams())).toBeUndefined();
});

it("keeps receiving year independent of the academic tab year on reload",()=>{
 const context=receivingContextFromRoute(new URLSearchParams("section=academic&academicYear=other&receivingAcademicYear=year&period=a&semester=semester&payrollCycle=cycle"));
 expect(resolveReceivingContext([period("a","cycle")],"",context,"annual",false)).toBe("a");
});
it("does not infer a semester from a cycle-only link for semester receiving",()=>{
 expect(resolveReceivingContext([period("semester",null)],"",{payoutCycleId:"cycle"},"scholar",true)).toBe("");
});

it("explicit semester choice discards stale link cycle and never writes a scholar as an annual ID",()=>{
 const p=period("semester",null),previous={semesterId:"semester",payoutCycleId:"missing"};
 expect(selectedReceivingContext("scholar","scholar",p,previous).payoutCycleId).toBe("missing");
 const chosen=selectedReceivingContext("scholar","scholar",p,previous,true);
 expect(chosen.payoutCycleId).toBeUndefined();
 expect(chosen.annualId).toBeUndefined();
 expect(resolveReceivingContext([p],"",chosen,"scholar",true)).toBe("semester");
 expect(selectedReceivingContext("annual","scholar",period("receiving","cycle"),previous,true)).toMatchObject({annualId:"annual",payoutCycleId:"cycle"});
});
