import type { OvrBatch } from "../ovr/model.js";
import { digest } from "../auth/crypto.js";
import { AuthError } from "../auth/service.js";

/** Child events keep all lifecycle metadata and reference the immutable prior
 * validation instead of copying its cohort graph into every payment event. */
export function compactPaymentEvent(batch: OvrBatch, base: OvrBatch): OvrBatch {
  const { validation, entry: _entry, ...metadata } = batch;
  void _entry;
  return {...metadata, processingEvidence: base.processingEvidence ?? {
    version: "payment-processing/v1", baseRevision: base.revision,
    validationHash: digest(JSON.stringify(validation ?? null)),
  }};
}
export function hydratePaymentEvents(history: OvrBatch[]): OvrBatch[] {
  const byRevision=new Map(history.map(b=>[b.revision,b]));
  const hashes=new Map<number,string>();
  return history.map((batch,index)=>{
    const source=batch.processingEvidence;
    if(!source) return batch;
    const base=byRevision.get(source.baseRevision);
    if(base&&!hashes.has(base.revision))hashes.set(base.revision,digest(JSON.stringify(base.validation??null)));
    if(source.version!=="payment-processing/v1" || !base || base.processingEvidence || source.baseRevision>=batch.revision ||
      hashes.get(base.revision)!==source.validationHash)
      throw new AuthError(409,"OVR_SNAPSHOT_MISMATCH","Payment processing evidence could not be verified. Preserve its history and request technical review.");
    // Current lifecycle commands need the complete current validation. Historical
    // compact children expose their immutable reference; expanding it 1,200
    // times in a compatibility HTTP response would multiply the cohort graph.
    return index===0 ? {...batch,...(base.validation ? {validation:base.validation} : {})} : batch;
  });
}
