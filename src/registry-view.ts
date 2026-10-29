import type {ConfigRecord} from '../server/configuration/model';
export type RegistryYearMode='working'|'history';
export function registryPreferences(raw:string|null):Record<string,string>{
 try{const value:unknown=JSON.parse(raw??'{}');return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter((entry):entry is [string,string]=>typeof entry[1]==='string')):{};}catch{return {};}
}
export function registryYearMode(saved:Record<string,string>):RegistryYearMode {
 return saved.yearMode==='history'||(!saved.yearMode&&Boolean(saved.year))?'history':'working';
}
export function resolveRegistryYear(mode:RegistryYearMode,selected:string,years:ConfigRecord[]){
 if(mode==='history'){
  if(!selected)return {year:'',label:'All Years / Historical',error:''};
  const year=years.find(y=>y.id===selected);
  return year?{year:year.id,label:`${year.code} — ${year.name}`,error:''}:{year:'',label:'Historical academic year',error:'The saved academic year is unavailable. Choose an existing historical year or All Years.'};
 }
 const working=years.filter(y=>y.working===true&&!y.archived);
 return working.length===1?{year:working[0].id,label:`${working[0].code} — ${working[0].name}`,error:''}:{year:'',label:'Current working academic year',error:'The working academic year could not be determined. Refresh or choose All Years / Historical; no unfiltered list has been loaded.'};
}
