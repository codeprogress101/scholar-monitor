import type {PoolConnection,RowDataPacket} from "mysql2/promise";
import type {OvrDetail,OvrFinalization} from "../../server/ovr/model.js";
import {cachedReads} from "../../server/read-cache.js";
import {ovrHistory,ovrEntries,validateOvr} from "../../server/ovr/service.js";
import {currentPayout} from "../../server/payouts/service.js";
import {paymentRecords,reconcilePayments} from "../../server/ovr/processing-state.js";
import {amendments,effectiveRoster} from "../../server/ovr/amendment-state.js";
import {paymentCorrections} from "../../server/ovr/payment-correction-state.js";
import {automaticDraft} from "../../server/ovr/automatic-draft.js";
import {managedCandidates} from "../../server/ovr/managed-payroll.js";
import {managedRelease} from "../../server/ovr/managed-release.js";
import {semesterClaim,draftDeferral,claimDeadline,reprocessingQueue} from "../../server/ovr/reprocessing.js";
import {treasuryEvidence,historicalReceipts} from "../../server/ovr/treasury-state.js";
import {decodeStoredJson} from "../../server/stored-json.js";
const decode=<T>(v:string|T):T=>decodeStoredJson<T>(v);
/** Frozen R03 complete reader, only imports redirected. Do not optimize this oracle. */
export async function legacyOvrDetail(connection:PoolConnection,id:string):Promise<OvrDetail>{
        const db=cachedReads(connection);
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const history = await ovrHistory(db, id),
          batch = history[0],
          cycle = await currentPayout(db, batch.cycleId),
          entries = await ovrEntries(db, id);
        const [frozen] = await db.execute<RowDataPacket[]>(
          "SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=? LOCK IN SHARE MODE",
          [id],
        );
        const payments = await paymentRecords(db, id);
        const effectiveFinalization = await effectiveRoster(db, id);
        const automatic = frozen.length ? null : await automaticDraft(db, batch, cycle);
        const effectiveEntries =
          effectiveFinalization?.snapshot.entries ?? entries;
        const semesterPayments=[];
        for(const entry of effectiveEntries){const claim=await semesterClaim(db,entry.scholarshipId,cycle.semesterId);semesterPayments.push({scholarshipId:entry.scholarshipId,paidBatchId:claim.paid?.batchId ?? null,paidCycleId:claim.paid?.cycleId ?? null,paymentId:claim.paid?.id ?? null,pendingCorrection:claim.pending.length>0});}
        const deferrals = [];
        const [annuals] = await db.execute<RowDataPacket[]>("SELECT r.id,s.first_name,s.last_name FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id WHERE r.academic_year_id=?", [cycle.academicYearId]);
        for (const a of annuals) { const d = await draftDeferral(db,id,a.id); if(d?.current) deferrals.push({scholarshipId:String(a.id),name:`${a.last_name}, ${a.first_name}`,reason:d.reason}); }
        return {
          semesterPayments,
          historicalReceipts: await historicalReceipts(db,id),
          treasuryEvidence: await treasuryEvidence(db,id),
          claimDeadline: await claimDeadline(db,cycle.semesterId),
          reprocessing: await reprocessingQueue(db,cycle),
          deferrals,
          payments,
          releases: frozen.length ? await managedRelease(db, id) : null,
          originalPayments: await paymentRecords(db, id, true),
          paymentCorrections: await paymentCorrections(db, id),
          amendments: await amendments(db, id),
          effectiveFinalization,
          reconciliation: reconcilePayments(
            effectiveFinalization?.snapshot ?? null,
            payments,
          ),
          batch,
          cycle,
          managed: frozen.length ? null : await managedCandidates(db, batch, cycle),
          automatic,
          entries: effectiveEntries,
          history,
          finalization: frozen.length
            ? {
                snapshot: decode<OvrFinalization>(frozen[0].snapshot),
                hash: frozen[0].snapshot_hash,
              }
            : null,
          validation: await validateOvr(db, batch, cycle, effectiveEntries),
          canEdit:
            Boolean((await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?",[id]))[0].length) &&
            batch.state === "draft" &&
            cycle.state === "open" &&
            !cycle.periodUnavailable,
        };
}
