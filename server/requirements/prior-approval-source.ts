import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { digest } from "../auth/crypto.js";
import { available, scopeRows } from "../continuing/semester-receiving.js";
import { scopeAcceptsOwner } from "../continuing/scope-access.js";
import { today } from "../scholars/validation.js";
import {unresolvedFindings,type RecordingCorrection} from "../continuing/finding-corrections.js";
import {computedRead} from "../read-cache.js";
import {compatiblePublishedActivation} from './prior-approval-compatibility.js';

export const decodePrior = <T>(v: string | T): T => typeof v === "string" ? JSON.parse(v) as T : v;
export type PriorApproval = {
 id: string; revision: number; importId: string; ownerId: string; semesterId: string;
 authorityId: string; reviewId: string; sourceHash: string; reference: string; sourceLocation: string;
 approvalOn: string | null; deadlineOn: string; recordedAt: string; actorName: string;
 valid: boolean; issue: string | null;
 activationCompatibility?: {masterlistId:string;publicationHash:string;effectiveOn:string};
};

/** Raw authoritative evidence only. Never reads its own derived approval/state,
 * and excludes financial allocations so finalization cannot invalidate itself. */
export async function priorMemberSource(db: PoolConnection, ownerId: string) {
 return computedRead(db,`prior-source:${ownerId}`,()=>readPriorMemberSource(db,ownerId));
}
async function readPriorMemberSource(db: PoolConnection, ownerId: string) {
 const [[owner]] = await db.execute<RowDataPacket[]>(`SELECT ss.*,p.version AS person_version,ident.human_id,
 CONCAT_WS(' ',p.last_name,p.first_name,NULLIF(p.middle_name,'')) AS name,
 s.version AS semester_version,s.academic_year_id,s.term_kind,s.locked_at,s.archived_at,
 DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends,
 y.version AS year_version,y.locked_at AS year_locked,y.archived_at AS year_archived,
 w.cohort_code,w.policy_version_id,
 (SELECT action FROM participation_events WHERE participation_id=ss.participation_id ORDER BY revision DESC LIMIT 1) participation_action
 FROM scholar_semesters ss JOIN scholars p ON p.id=ss.scholar_id JOIN scholar_identifiers ident ON ident.scholar_id=p.id
 JOIN semesters s ON s.id=ss.semester_id JOIN academic_years y ON y.id=s.academic_year_id
 JOIN workflow_scope_versions w ON w.id=ss.scope_version_id WHERE ss.id=?`, [ownerId]);
 if (!owner) return null;
 const scopes = await scopeRows(db, owner.cohort_code), scope = scopes.find(s => s.semester_id === owner.semester_id);
 const [[revision]] = await db.execute<RowDataPacket[]>("SELECT * FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1", [ownerId]);
 const [docs] = await db.execute<RowDataPacket[]>(`SELECT i.id,i.definition_version_id,c.scholar_semester_id,c.semester_version,c.policy_date,
 v.document_kind AS policy_kind,v.applies_to,v.semester_id AS policy_semester,v.effective_from,v.effective_until,v.active,
 cov.id AS coverage_id,cov.document_kind,cov.coverage_semester_id,covered.version AS coverage_version,covered.name AS coverage_name,
 DATE_FORMAT(covered.starts_on,'%Y-%m-%d') AS coverage_start,DATE_FORMAT(covered.ends_on,'%Y-%m-%d') AS coverage_end,
 (SELECT MAX(version) FROM requirement_workflow_events WHERE instance_id=i.id AND JSON_EXTRACT(details,'$.priorBatchApproval') IS NULL) event_version,
 (SELECT to_status FROM requirement_workflow_events WHERE instance_id=i.id AND JSON_EXTRACT(details,'$.priorBatchApproval') IS NULL ORDER BY version DESC LIMIT 1) event_status,
 r.id AS receipt_id,DATE_FORMAT(r.received_on,'%Y-%m-%d') AS received_on,
 waiver.id AS waiver_id,waiver.version AS waiver_version
 FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id
 JOIN requirement_definition_versions v ON v.id=i.definition_version_id
 LEFT JOIN requirement_coverage cov ON cov.requirement_instance_id=i.id AND NOT EXISTS(SELECT 1 FROM requirement_coverage n WHERE n.requirement_instance_id=i.id AND n.revision>cov.revision)
 LEFT JOIN semesters covered ON covered.id=cov.coverage_semester_id
 LEFT JOIN requirement_receipts r ON r.instance_id=i.id LEFT JOIN requirement_waivers waiver ON waiver.instance_id=i.id
 WHERE c.scholar_semester_id=? ORDER BY i.id`, [ownerId]);
 const [academic] = await db.execute<RowDataPacket[]>("SELECT * FROM academic_records WHERE scholar_id=? ORDER BY academic_year_id,id", [owner.scholar_id]);
 const [changes] = await db.execute<RowDataPacket[]>("SELECT c.* FROM academic_changes c JOIN academic_records a ON a.id=c.academic_record_id WHERE a.scholar_id=? ORDER BY c.id", [owner.scholar_id]);
 const [reviews] = await db.execute<RowDataPacket[]>("SELECT * FROM semester_review_events WHERE scholar_semester_id=? AND JSON_EXTRACT(source_snapshot,'$.priorBatchApproval') IS NULL ORDER BY revision DESC", [ownerId]);
 const [standing] = await db.execute<RowDataPacket[]>("SELECT id,version,status,operational_status,status_version,DATE_FORMAT(status_effective_on,'%Y-%m-%d') status_on FROM scholarship_records WHERE scholar_id=? ORDER BY academic_year_id,id", [owner.scholar_id]);
 const [events] = await db.execute<RowDataPacket[]>("SELECT e.* FROM requirement_workflow_events e JOIN requirement_instances i ON i.id=e.instance_id JOIN requirement_checklists c ON c.id=i.checklist_id WHERE c.scholar_semester_id=? AND JSON_EXTRACT(e.details,'$.priorBatchApproval') IS NULL ORDER BY e.instance_id,e.version", [ownerId]);
 const [otherEvidence] = await db.execute<RowDataPacket[]>(`SELECT i.id,i.definition_version_id,i.status,r.id AS receipt_id,w.id AS waiver_id,
 (SELECT MAX(version) FROM requirement_workflow_events e WHERE e.instance_id=i.id) event_version
 FROM requirement_checklists c JOIN requirement_instances i ON i.checklist_id=c.id
 LEFT JOIN scholarship_records annual ON annual.id=c.scholarship_record_id LEFT JOIN requirement_receipts r ON r.instance_id=i.id
 LEFT JOIN requirement_waivers w ON w.instance_id=i.id
 WHERE annual.scholar_id=? AND c.semester_id=? ORDER BY i.id`, [owner.scholar_id, owner.semester_id]);
 const [bindings] = await db.execute<RowDataPacket[]>("SELECT * FROM semester_document_reconciliations WHERE scholar_semester_id=? ORDER BY legacy_instance_id,revision", [ownerId]);
 const [entrant] = await db.execute<RowDataPacket[]>("SELECT e.* FROM entrant_grading_card_reviews e JOIN requirement_instances i ON i.id=e.instance_id JOIN requirement_checklists c ON c.id=i.checklist_id WHERE c.scholar_semester_id=? ORDER BY e.instance_id,e.revision", [ownerId]);
 const snapshot = { owner, scope: scope ? { id: scope.id, mode: scope.mode, policy: scope.policy_version_id, rules: scope.rules, semesterVersion: scope.semester_version } : null, revision, docs, academic, changes, reviews, standing, events, otherEvidence, bindings, entrant };
 const issues: string[] = [];
 if (!scope || !revision || !available(scope, false) || !scopeAcceptsOwner(scope, owner.scope_version_id) || owner.participation_action !== "accepted" || owner.locked_at || owner.archived_at || owner.year_locked || owner.year_archived) issues.push("The approved semester setup or participation is unavailable. Review configuration first.");
 if (scope && scope.starts > today()) issues.push("The receiving semester has not started.");
 if (docs.length !== 2 || !docs.some(d => d.document_kind === "cor") || !docs.some(d => d.document_kind === "cog")) issues.push("Separate authoritative COR and COG requirements are required.");
 for (const d of docs) {
  if (d.policy_kind !== (d.document_kind==="cor"?"enrollment":"grades") || !["cor", "cog"].includes(d.document_kind) || d.applies_to !== "semester" || (d.policy_semester && d.policy_semester !== owner.semester_id) || !d.coverage_id) issues.push("Explicit compatible semester policies and document coverage are required.");
  if (!d.active || d.semester_version !== owner.semester_version) issues.push("The pinned policy or receiving calendar needs review.");
  if ((d.document_kind === "cor" && d.coverage_semester_id !== owner.semester_id) || (d.document_kind === "cog" && (d.coverage_semester_id !== revision?.predecessor_semester_id || String(d.coverage_end).slice(0,10) >= owner.starts))) issues.push("Document coverage conflicts with the approved receiving/predecessor mapping.");
  if (["for_correction", "rejected", "resubmitted"].includes(d.event_status)) issues.push("A document has an unresolved correction, rejection or replacement awaiting verification.");
  const exception = entrant.filter(e => e.instance_id === d.id).at(-1);
  const excepted = d.document_kind === "cog" && exception?.decision === "approved" && decodePrior<{mode?:string}>(exception.evidence).mode === "initial_requirements";
  if (!d.receipt_id && !excepted) issues.push("Receive the applicable documents before recording their prior verification.");
 }
 const adverse=unresolvedFindings(reviews.map(r=>({id:r.id,revision:r.revision,findings:{hasFailed:r.has_failed===null?null:Boolean(r.has_failed),hasDropped:r.has_dropped===null?null:Boolean(r.has_dropped)},correction:decodePrior<{correction?:RecordingCorrection}>(r.source_snapshot).correction??null})));
 if (adverse.length || reviews[0]?.result === "noncompliant" || reviews[0]?.has_incomplete) issues.push("Recorded adverse academic findings require the existing controlled review; batch approval cannot override them.");
 if (revision && (revision.enrolled === 0 || revision.full_load === 0 || revision.program_category === "non_degree")) issues.push("Recorded enrollment, load or program findings conflict with degree-stipend approval.");
 const datedStanding=standing.filter(r=>r.operational_status),latestStanding=datedStanding.map(r=>r.status_on as string).filter(Boolean).sort().at(-1);
 if (datedStanding.some(r=>!r.status_on||r.status_on>today())||datedStanding.filter(r=>r.status_on===latestStanding).some(r=>!["active","graduated"].includes(r.operational_status))) issues.push("An existing scholarship hold or adverse standing requires review.");
 return { owner, revision, scope, docs, snapshot, hash: digest(JSON.stringify(snapshot)), issues: [...new Set(issues)] };
}

export async function priorApprovalForOwner(db: PoolConnection, ownerId: string): Promise<PriorApproval | null> {
 return computedRead(db,`prior-approval:${ownerId}`,()=>readPriorApprovalForOwner(db,ownerId));
}
async function readPriorApprovalForOwner(db: PoolConnection, ownerId: string):Promise<PriorApproval|null> {
 const [[r]] = await db.execute<RowDataPacket[]>(`SELECT a.*,m.source_hash,m.review_event_id,m.snapshot approved_snapshot,u.full_name,authority.scope approval_scope,
 DATE_FORMAT(authority.valid_from,'%Y-%m-%d') authority_starts,DATE_FORMAT(authority.valid_until,'%Y-%m-%d') authority_ends,
 DATE_FORMAT(a.approval_on,'%Y-%m-%d') AS approval_date,DATE_FORMAT(a.deadline_on,'%Y-%m-%d') AS deadline_date,
 DATE_FORMAT(a.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded
 FROM prior_batch_members m JOIN prior_batch_approvals a ON a.id=m.approval_id JOIN users u ON u.id=a.actor_id JOIN workflow_authority_versions authority ON authority.id=a.authority_version_id
 WHERE m.scholar_semester_id=? ORDER BY a.recorded_at DESC,a.revision DESC LIMIT 1`, [ownerId]);
 if (!r) return null;
 const current = await priorMemberSource(db, ownerId);
 const authority=decodePrior<{purpose?:string;importId?:string;semesterId?:string}>(r.approval_scope);
 const authorityAvailable=r.authority_starts<=today()&&(!r.authority_ends||r.authority_ends>=today())&&authority.purpose==='prior_batch_approval'&&authority.importId===r.import_job_id&&authority.semesterId===r.semester_id;
 const compatibility=current&&current.hash!==r.source_hash&&!current.issues.length?await compatiblePublishedActivation(db,decodePrior(r.approved_snapshot),current.snapshot,r.source_hash,r.recorded):null;
 const issue = !authorityAvailable?'The recorded prior-batch authority is unavailable; Coordinator source review is required.':!current || (current.hash !== r.source_hash&&!compatibility) ? "The prior batch approval is stale because its authoritative sources changed. Review this batch again." : current.issues[0] ?? null;
 return { id:r.id, revision:r.revision, importId:r.import_job_id, ownerId, semesterId:r.semester_id, authorityId:r.authority_version_id, reviewId:r.review_event_id, sourceHash:r.source_hash, reference:r.reference_text, sourceLocation:r.source_location, approvalOn:r.approval_date, deadlineOn:r.deadline_date, recordedAt:r.recorded, actorName:r.full_name, valid:!issue, issue,...(compatibility?{activationCompatibility:compatibility}:{}) };
}

export async function priorApprovalForDocument(db: PoolConnection, instanceId: string) {
 const [[r]] = await db.execute<RowDataPacket[]>(`SELECT d.approval_id,d.scholar_semester_id,d.decision_version,d.retained_individual FROM prior_batch_documents d JOIN prior_batch_approvals a ON a.id=d.approval_id WHERE d.instance_id=? ORDER BY a.recorded_at DESC,a.revision DESC LIMIT 1`, [instanceId]);
 if (!r) return null;
 const approval = await priorApprovalForOwner(db, r.scholar_semester_id);
 return approval ? { ...approval,valid:approval.valid&&approval.id===r.approval_id, decisionVersion:Number(r.decision_version), retainedIndividual:Boolean(r.retained_individual) } : null;
}
