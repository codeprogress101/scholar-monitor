import {expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {ConfigRecord} from '../server/configuration/model';
import {resolveRegistryYear,registryYearMode,registryPreferences} from '../src/registry-view';
import {parseScholarQuery} from '../server/scholars/validation';
const id=randomUUID(),other=randomUUID();
const year={id,code:'N',name:'Working',working:true,archived:false,locked:false} as ConfigRecord;
it('opens the explicit working year without a legacy date/ID-year fallback',()=>{
 expect(registryPreferences('null')).toEqual({});expect(registryPreferences('{broken')).toEqual({});expect(registryPreferences('{"q":"Ana","year":1}')).toEqual({q:'Ana'});
 expect(registryYearMode({})).toBe('working');expect(registryYearMode({year:''})).toBe('working');
 expect(resolveRegistryYear('working','',[year]).year).toBe(id);
 for(const years of [[],[{...year,working:undefined}],[year,{...year,id:other}],[{...year,archived:true}]])expect(resolveRegistryYear('working','',years).error).not.toBe('');
});
it('retains explicit All/Historical and detects stale historical preferences',()=>{
 expect(registryYearMode({year:id})).toBe('history');expect(registryYearMode({yearMode:'history',year:''})).toBe('history');
 expect(resolveRegistryYear('history','',[year])).toEqual({year:'',label:'All Years / Historical',error:''});
 expect(resolveRegistryYear('history',id,[{...year,locked:true,archived:true}]).year).toBe(id);
 expect(resolveRegistryYear('history',other,[year]).error).not.toBe('');
});
it('resolves a changed working year without creating or reclassifying an annual record',()=>{
 const next={...year,id:other,code:'N+1'};
 expect(resolveRegistryYear('working','',[{...year,working:false},next]).year).toBe(other);
 expect(resolveRegistryYear('history',id,[{...year,working:false},next]).year).toBe(id);
});
it('strictly separates B1 membership from legacy annual selectors and bounds pages',()=>{
 expect(parseScholarQuery({registryYearId:id,schoolId:other,limit:'100'}).registryYearId).toBe(id);
 for(const q of [{registryYearId:id,associatedYearId:id},{registryYearId:id,academicYearId:id},{registryYearId:id,scholarshipYearId:id},{registryYearId:id,contextAcademicYearId:other},{registryYearId:id,limit:101},{registryYearId:'unknown'},{schoolId:'not-an-id'}])expect(()=>parseScholarQuery(q)).toThrow();
 expect(parseScholarQuery({associatedYearId:id}).associatedYearId).toBe(id);
});
