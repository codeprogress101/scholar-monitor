import type {PayrollOverview} from "../server/dashboard/overview";
import PaymentStatusBadge from "./PaymentStatusBadge";

export const outcomeKeys=["paid","pending","unclaimed","needsReview"] as const;
export const outcomeColors={paid:"#14532d",pending:"#cbd1d8",unclaimed:"#854d0e",needsReview:"#991b1b"};
const badgeOutcome={paid:"paid",pending:"pending",unclaimed:"unclaimed",needsReview:"needs_review"} as const;
export function outcomeShare(count:number,total:number){return total>0?count/total:0;}
export const recordingLink=(batch:{cycleId:string;batchId:string})=>`#payouts?cycle=${batch.cycleId}&batch=${batch.batchId}&view=recording`;
export function OutcomeCounts({counts}:{counts:PayrollOverview["totals"]}){
 return <dl className="d1-outcome-counts">{outcomeKeys.map(key=><div key={key} className={`d1-count d1-count--${key}`}><dt><PaymentStatusBadge outcome={badgeOutcome[key]}/></dt><dd>{counts[key].toLocaleString()}</dd></div>)}</dl>;
}
export default function DashboardCharts({data}:{data:PayrollOverview}){
 return <section className="d1-panel d12-finance" aria-labelledby="d12-payments-title" data-payment-overview-ready="true">
  <header><div><p className="d1-overline">Selected year &amp; semester</p><h2 id="d12-payments-title">Payment status</h2></div><a href="#payouts">Open Payroll</a></header>
  <p className="d12-finance-total"><strong>{data.totals.total.toLocaleString()}</strong> finalized payroll rows</p>
  <OutcomeCounts counts={data.totals}/>
  {!data.batches.length&&<p className="d1-empty">No finalized numbered payrolls in this period.</p>}
  <details className="d1-scope"><summary>Payment scope &amp; batch records</summary><p>{data.scope}</p>{data.batches.length>0&&<ul>{data.batches.map(batch=><li key={batch.batchId}><a href={recordingLink(batch)}>{batch.code} / {batch.name}</a> / {batch.total.toLocaleString()} rows</li>)}</ul>}</details>
 </section>;
}
