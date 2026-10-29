import type {PoolConnection,RowDataPacket} from "mysql2/promise";
import type {OvrDetail,OvrFinalization} from "./model.js";
import {cachedReads} from "../read-cache.js";
import {ovrHistory,ovrEntries,validateOvr} from "./service.js";
import {currentPayout} from "../payouts/service.js";
import {paymentRecords,reconcilePayments} from "./processing-state.js";
import {amendments,effectiveRoster} from "./amendment-state.js";
import {paymentCorrections} from "./payment-correction-state.js";
import {automaticDraft} from "./automatic-draft.js";
import {managedCandidates} from "./managed-payroll.js";
import {managedRelease} from "./managed-release.js";
import {claimDeadline,reprocessingQueue} from "./reprocessing.js";
import {treasuryEvidence,historicalReceipts} from "./treasury-state.js";
import {decodeStoredJson} from "../stored-json.js";
const decode=<T>(v:string|T):T=>decodeStoredJson<T>(v);
import {detailConnection,semesterPaymentRows,draftDeferrals} from "./detail-reads.js";
/** Caller must authorize and hold one consistent snapshot. Financial writes use their original command validation. */
export async function readCompleteOvrDetail(connection:PoolConnection,id:string):Promise<OvrDetail>{
        const db=cachedReads(connection);
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const history = await ovrHistory(db, id),
          batch = history[0],
          cycle = await currentPayout(db, batch.cycleId);
        const entries = await ovrEntries(db, id);
        const [frozen] = await db.execute<RowDataPacket[]>(
          "SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=? LOCK IN SHARE MODE",
          [id],
        );
        const payments = await paymentRecords(db, id);
        const effectiveFinalization = await effectiveRoster(db, id);
        const automatic = frozen.length ? null : await automaticDraft(db, batch, cycle);
        const effectiveEntries =
          effectiveFinalization?.snapshot.entries ?? entries;
        const semesterPayments = await semesterPaymentRows(db, effectiveEntries.map(e => e.scholarshipId), cycle.semesterId);
        const deferrals = [];
        const [annuals] = await db.execute<RowDataPacket[]>("SELECT r.id,s.first_name,s.last_name FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id WHERE r.academic_year_id=?", [cycle.academicYearId]);
        const decisions=await draftDeferrals(db,id,annuals.map(a=>String(a.id)));
        for (const a of annuals) { const d = decisions.get(a.id); if(d?.current) deferrals.push({scholarshipId:String(a.id),name:`${a.last_name}, ${a.first_name}`,reason:d.reason}); }
        return {
          semesterPayments,
          historicalReceipts: await historicalReceipts(db,id),
          treasuryEvidence: await treasuryEvidence(db,id),
          claimDeadline: await claimDeadline(db,cycle.semesterId),
          reprocessing: await reprocessingQueue(db,cycle),
          deferrals,
          payments,
          releases: frozen.length ? await managedRelease(await detailConnection(connection,cycle), id) : null,
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
          validation: await validateOvr(effectiveEntries.length ? await detailConnection(connection,cycle) : db, batch, cycle, effectiveEntries),
          canEdit:
            Boolean((await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?",[id]))[0].length) &&
            batch.state === "draft" &&
            cycle.state === "open" &&
            !cycle.periodUnavailable,
        };
}
