import type {RecordingRow} from "../server/payments/recording-model";

type Props={outcome:RecordingRow["outcome"];reviewLabel?:"Withheld / Review"};
const labels={paid:"Paid",pending:"Pending",unclaimed:"Unclaimed",needs_review:"Needs resolution"} as const;
/** A payment outcome label only; no workflow state or action is inferred. */
export default function PaymentStatusBadge({outcome,reviewLabel}:Props){
 const label=outcome==="needs_review"&&reviewLabel?reviewLabel:labels[outcome];
 return <span className={`payment-status-badge payment-status-badge--${outcome}`} aria-label={`Payment outcome: ${label}`}>{label}</span>;
}
