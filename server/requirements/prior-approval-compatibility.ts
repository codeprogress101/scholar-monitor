import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {digest} from '../auth/crypto.js';
import {indexedRead} from '../read-cache.js';

type Standing={id:string;version:number;status:string;operational_status:string|null;status_version:number;status_on:string|null};
type Snapshot={owner:RowDataPacket;standing:RowDataPacket[]};
/** Replace only one proven initial activation when comparing immutable evidence.
 * Every other byte of the authoritative snapshot must retain its original hash. */
export function initialActivationCandidate(saved:Snapshot,current:Snapshot,originalHash:string):Standing|null{
 if(digest(JSON.stringify(saved))!==originalHash||saved.standing.length!==current.standing.length)return null;
 const changed=current.standing.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(saved.standing[i]));
 if(changed.length!==1)return null;
 const next=changed[0],old=saved.standing.find(r=>r.id===next.id);
 if(!old||old.status!=='selected'||old.operational_status!==null||old.status_version!==0||old.status_on!==null||next.operational_status!=='active'||next.status_version!==1||!next.status_on)return null;
 if(JSON.stringify(next)!==JSON.stringify({...old,operational_status:'active',status_version:1,status_on:next.status_on}))return null;
 return digest(JSON.stringify({...current,standing:saved.standing}))===originalHash?next as Standing:null;
}

export async function compatiblePublishedActivation(db:PoolConnection,saved:Snapshot,current:Snapshot,originalHash:string,approvedAt:string){
 const candidate=initialActivationCandidate(saved,current,originalHash);if(!candidate)return null;
 const activation=await indexedRead(db,`prior-initial-activations:${current.owner.academic_year_id}`,candidate.id,async()=>{
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT a.scholarship_id,a.masterlist_id,r.scholar_id,r.academic_year_id,DATE_FORMAT(a.effective_on,'%Y-%m-%d') effective_on,DATE_FORMAT(a.activated_at,'%Y-%m-%dT%H:%i:%s.%fZ') activated_at
   FROM masterlist_activations a JOIN scholarship_records r ON r.id=a.scholarship_id WHERE r.academic_year_id=?`,[current.owner.academic_year_id]);
  return new Map(rows.map(r=>[String(r.scholarship_id),r]));
 });
 if(!activation||activation.scholar_id!==current.owner.scholar_id||activation.effective_on!==candidate.status_on||activation.activated_at<approvedAt)return null;
 const publication=await indexedRead(db,`prior-initial-publication-entry:${activation.masterlist_id}`,candidate.id,async()=>{
  const [[r]]=await db.execute<RowDataPacket[]>(`SELECT m.id,m.status,m.version,m.academic_year_id,p.snapshot,p.snapshot_hash,p.actor_id,DATE_FORMAT(p.effective_on,'%Y-%m-%d') effective_on,DATE_FORMAT(p.published_at,'%Y-%m-%dT%H:%i:%s.%fZ') published_at,
   e.actor_id workflow_actor,e.resulting_version,e.snapshot workflow_snapshot
   FROM masterlist_versions m JOIN masterlist_publications p ON p.masterlist_id=m.id
   JOIN masterlist_workflow_events e ON e.masterlist_id=m.id AND e.action='publish' AND e.from_status='approved' AND e.to_status='published'
   WHERE m.id=?`,[activation.masterlist_id]);
  if(!r)return new Map();
  const snapshot=typeof r.snapshot==='string'?JSON.parse(r.snapshot):r.snapshot;
  const workflow=typeof r.workflow_snapshot==='string'?JSON.parse(r.workflow_snapshot):r.workflow_snapshot;
  if(!['published','locked'].includes(r.status)||snapshot.masterlistId!==r.id||snapshot.academicYearId!==r.academic_year_id||snapshot.publicationVersion!==r.resulting_version||r.version<r.resulting_version||r.actor_id!==r.workflow_actor||digest(JSON.stringify(snapshot))!==r.snapshot_hash||digest(JSON.stringify(workflow))!==r.snapshot_hash)return new Map();
  // Validate the complete official proof once per projection. Clone only the
  // requested member and shared scalar metadata, never all published entries
  // for every scholar. indexedRead is invalidated by every write.
  const metadata={id:String(r.id),academicYearId:String(r.academic_year_id),effectiveOn:String(r.effective_on),publishedAt:String(r.published_at),snapshotHash:String(r.snapshot_hash)};
  return new Map<string,typeof metadata & {entry:{scholarId:string;snapshot:{scholarshipId:string;scholarshipVersion:number;personVersion:number}}}>(snapshot.entries.map((entry:{scholarId:string;snapshot:{scholarshipId:string;scholarshipVersion:number;personVersion:number}})=>[entry.snapshot.scholarshipId,{...metadata,entry}]));
 });
 if(!publication||publication.academicYearId!==current.owner.academic_year_id||publication.effectiveOn!==candidate.status_on||publication.publishedAt<approvedAt)return null;
 const entry=publication.entry;
 if(!entry||entry.scholarId!==current.owner.scholar_id||entry.snapshot.scholarshipId!==candidate.id||entry.snapshot.scholarshipVersion!==candidate.version||entry.snapshot.personVersion!==current.owner.person_version)return null;
 return{masterlistId:publication.id,publicationHash:publication.snapshotHash,effectiveOn:candidate.status_on!};
}
