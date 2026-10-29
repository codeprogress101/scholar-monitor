import {useContext} from "react";
import type {OvrSummary} from "../server/ovr/detail-model";
import type {DraftReview} from "./PayrollDraftRoster";
import {PayrollTimingContext,payrollSteps,payrollTiming,payoutTarget,payrollNextAction} from "./payroll-progress";

export default function PayrollProgress({detail,permissions,review}:{detail:OvrSummary;permissions:string[];review?:DraftReview|null}){
  const context=useContext(PayrollTimingContext),steps=payrollSteps(detail.batch.state);
  const timing=context.unavailable?null:payrollTiming(context.data,detail.batch.id,detail.cycle.id);
  const current=review?.batchRevision===detail.batch.revision?review:null;
  const reached=current&&timing&&current.cutoffOn===context.data?.windows.find(w=>w.batchId===detail.batch.id)?.cutoffOn&&(current.cutoffPolicy??"whole_day_v1")===(context.data?.windows.find(w=>w.batchId===detail.batch.id)?.cutoffPolicy??"whole_day_v1")&&(current.cutoffPolicy==="whole_day_v1"||!current.cutoffPolicy||current.cutoffAtUtc===context.data?.windows.find(w=>w.batchId===detail.batch.id)?.cutoffAtUtc)?current.cutoffReached:timing?.cutoffReached??null;
  const available=!detail.cycle.periodUnavailable&&detail.cycle.state==="open";
  const blocker=detail.batch.state==="draft"?current?.reviewBlocker:current?.finalizeBlocker;
  return <section className="pay-flow-progress" aria-label="Payroll progress">
    <h2>Payroll progress</h2>
    {steps?<ol className="pay-flow-steps" aria-label={`${detail.batch.code} workflow`}>{steps.map(step=><li key={step.stage} aria-current={step.status==="Current"?"step":undefined} data-status={step.status}><strong>{step.label}</strong><span>{step.status}</span></li>)}</ol>:<p role="status">Workflow status unavailable.</p>}
    <p className="pay-flow-next"><strong>Next:</strong> {payrollNextAction(detail.batch.state,permissions,available,reached,timing?.normalFinalization??null,blocker)}</p>
    <dl className="pay-flow-timing">
      <div><dt>Batch submission cutoff</dt><dd>{timing?.cutoff??(context.loading?"Loading cutoff…":"Unavailable — review submission windows.")}</dd></div>
      <div><dt>Normal finalization available from</dt><dd>{timing?.normalFinalization??"Unavailable"}</dd></div>
      <div><dt>Semester final submission deadline</dt><dd>{timing?.finalDeadline??"Unavailable"}</dd></div>
      <div><dt>Planned payout target</dt><dd>{payoutTarget(detail.cycle.targetDate)??"Unavailable"}</dd></div>
    </dl>
    <p className="pay-flow-note">Philippine Standard Time (UTC+8). Review does not freeze the roster. Processing does not record payment; actual outcomes remain separate in Payment Recording.</p>
  </section>;
}
