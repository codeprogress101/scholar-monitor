const labels = ["Grantee certification", "Approval for payment", "Treasurer certification", "Disbursing officer certification"];
export default function SignatoryFields({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  let rows:{name:string;title:string}[];
  try { rows=JSON.parse(value); if(!Array.isArray(rows)||rows.length!==4) throw new Error(); }
  catch { rows=labels.map(()=>({name:"",title:""})); }
  function update(index:number,field:"name"|"title",text:string){onChange(JSON.stringify(rows.map((r,i)=>i===index?{...r,[field]:text}:r)));}
  return <div className="col-12"><p>Changes apply to drafts. Finalized payrolls retain their original signatories.</p>{rows.map((row,i)=><fieldset key={i} className="border rounded p-2 mb-2"><legend className="fs-6">{labels[i]}</legend><label className="form-label d-block">Name<input className="form-control" required maxLength={80} value={row.name} onChange={e=>update(i,"name",e.target.value)}/></label><label className="form-label d-block">Designation<input className="form-control" required maxLength={100} value={row.title} onChange={e=>update(i,"title",e.target.value)}/></label></fieldset>)}</div>;
}
