import type {ConfigRecord} from "../server/configuration/model";
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
export function placementLabel(item: ConfigRecord, items: ConfigRecord[]) {
  return items.filter(i => !i.archived && normalize(i.name) === normalize(item.name)).length > 1 ? `${item.name} [${item.code}]` : item.name;
}
export default function PlacementInput({id,label,value,items,onChange}:{id:string;label:string;value:string;items:ConfigRecord[];onChange:(value:string)=>void}) {
  return <><label className="form-label" htmlFor={id}>{label}</label><input id={id} className="form-control" list={`${id}-choices`} required maxLength={240} value={value} onChange={e=>onChange(e.target.value)} placeholder={`Type ${label.toLowerCase()}`}/><datalist id={`${id}-choices`}>{items.filter(i=>!i.archived).map(i=><option key={i.id} value={placementLabel(i,items)}/>)}</datalist></>;
}
export function placementValue(value:string,items:ConfigRecord[],kind:"school"|"course") {
  const matches=items.filter(i=>!i.archived && normalize(placementLabel(i,items))===normalize(value));
  return matches.length===1 ? {[`${kind}Id`]:matches[0].id} : {[`${kind}Id`]:"",[`${kind}Name`]:value.trim()};
}
