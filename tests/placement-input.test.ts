import {expect,it} from "vitest";
import {placementLabel,placementValue} from "../src/PlacementInput";
import type {ConfigRecord} from "../server/configuration/model";
const item=(id:string,code:string,name:string):ConfigRecord=>({id,code,name,version:1,archived:false,locked:false,parentUnavailable:false,startsOn:null,endsOn:null,academicYearId:null,valueType:null,value:null});
it("distinguishes equal reference names and submits the selected identity",()=>{
 const items=[item("a","A","College"),item("b","B","College")];
 expect(placementLabel(items[0],items)).toBe("College [A]");
 expect(placementValue("College [B]",items,"school")).toEqual({schoolId:"b"});
 expect(placementValue("College",items,"school")).toEqual({schoolId:"",schoolName:"College"});
});
it("preserves unique names, typed additions and excludes archived references",()=>{
 const items=[item("a","A","College"),{...item("b","B","College"),archived:true}];
 expect(placementValue(" college ",items,"school")).toEqual({schoolId:"a"});
 expect(placementValue("New Course",items,"course")).toEqual({courseId:"",courseName:"New Course"});
});
