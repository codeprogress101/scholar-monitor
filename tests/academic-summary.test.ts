import {it,expect} from "vitest";
import {yearLevelLabel} from "../src/ScholarAcademicSummary";
it("formats recognized year levels without discarding meaningful nonstandard labels",()=>{
 for(const value of ["4","Fourth year","4th Year"])expect(yearLevelLabel(value)).toBe("4th Year");
 expect(yearLevelLabel("Graduating - irregular")).toBe("Graduating - irregular");
 expect(yearLevelLabel(null)).toBe("Year level needed");
});
