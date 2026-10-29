import {lazy,Suspense,useState} from 'react';
import type {Session} from './auth-api';
const FinancialReports=lazy(()=>import('./FinancialReports'));
const OperationalReports=lazy(()=>import('./ReportsPage'));
export default function ReportsWorkspace({session,permissions}:{session:Session;permissions:string[]}){
 const can=permissions.includes('ovr.process'),[financial,setFinancial]=useState(true);
 return <><h1>Reports</h1><div className="d-flex gap-2 my-3" role="group" aria-label="Report workspace">{can&&<button className={`btn ${financial?'configuration-primary':'btn-outline-secondary'}`} aria-pressed={financial} onClick={()=>setFinancial(true)}>Payroll Reports</button>}<button className={`btn ${!financial?'configuration-primary':'btn-outline-secondary'}`} aria-pressed={!financial} onClick={()=>setFinancial(false)}>Operational Reports</button></div><Suspense fallback={<p role="status">Loading Reports…</p>}>{financial&&can?<FinancialReports session={session}/>:<OperationalReports/>}</Suspense></>;
}
