import {describe,it,expect} from 'vitest';
import {initialActivationCandidate,compatiblePublishedActivation} from '../server/requirements/prior-approval-compatibility';
import {digest} from '../server/auth/crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';

const saved=()=>({owner:{scholar_id:'person',academic_year_id:'year',person_version:1} as RowDataPacket,standing:[{id:'annual',version:3,status:'selected',operational_status:null,status_version:0,status_on:null} as RowDataPacket],docs:[{id:'paper',received_on:'2026-10-26'}],academic:[{school:'original'}]});
const active=()=>({...saved(),standing:[{...saved().standing[0],operational_status:'active',status_version:1,status_on:'2026-10-26'} as RowDataPacket]});
describe('Initial publication compatibility is only a candidate for official proof',()=>{
 it('recognizes only the exact initial selected-to-active delta without changing the original',()=>{const old=saved(),before=JSON.stringify(old);expect(initialActivationCandidate(old,active(),digest(before))?.id).toBe('annual');expect(JSON.stringify(old)).toBe(before);});
 it.each(['suspended','terminated','graduated'])('rejects standing %s',status=>{const now=active();now.standing[0].operational_status=status;expect(initialActivationCandidate(saved(),now,digest(JSON.stringify(saved())))).toBeNull();});
 it('rejects subsequent standing versions, qualification and unselected changes',()=>{for(const mutate of [(n:ReturnType<typeof active>)=>{n.standing[0].status_version=2;},(n:ReturnType<typeof active>)=>{n.standing[0].version=4;},(n:ReturnType<typeof active>)=>{n.standing[0].status='validated';}]){const now=active();mutate(now);expect(initialActivationCandidate(saved(),now,digest(JSON.stringify(saved())))).toBeNull();}});
 it('preserves freshness for independent document, placement and identity changes',()=>{for(const mutate of [(n:ReturnType<typeof active>)=>{n.docs[0].received_on='2026-10-25';},(n:ReturnType<typeof active>)=>{n.academic[0].school='changed';},(n:ReturnType<typeof active>)=>{n.owner.person_version=2;}]){const now=active();mutate(now);expect(initialActivationCandidate(saved(),now,digest(JSON.stringify(saved())))).toBeNull();}});
 it('rejects altered original evidence and additional annual rows',()=>{expect(initialActivationCandidate(saved(),active(),'0'.repeat(64))).toBeNull();const now=active();now.standing.push({...now.standing[0],id:'other'});expect(initialActivationCandidate(saved(),now,digest(JSON.stringify(saved())))).toBeNull();});
});

describe('Authoritative publication proof',()=>{
 const publication=()=>({masterlistId:'official',academicYearId:'year',publicationVersion:5,entries:[{scholarId:'person',snapshot:{scholarshipId:'annual',scholarshipVersion:3,personVersion:1}}]});
 function connection(activationChanges:Record<string,unknown>={},publicationChanges:Record<string,unknown>={},missing=false){
  const snapshot=publication(),encoded=JSON.stringify(snapshot);
  return{execute:async(sql:string)=>{
   if(sql.includes('FROM masterlist_activations'))return[[...(missing?[]:[{scholarship_id:'annual',masterlist_id:'official',scholar_id:'person',academic_year_id:'year',effective_on:'2026-10-26',activated_at:'2026-10-26T02:00:00.000000Z',...activationChanges}])]];
   return[[{id:'official',status:'published',version:5,academic_year_id:'year',snapshot:encoded,snapshot_hash:digest(encoded),actor_id:'coordinator',effective_on:'2026-10-26',published_at:'2026-10-26T02:00:00.000000Z',workflow_actor:'coordinator',resulting_version:5,workflow_snapshot:encoded,...publicationChanges}]];
  }} as unknown as PoolConnection;
 }
 const review=(db:PoolConnection)=>compatiblePublishedActivation(db,saved(),active(),digest(JSON.stringify(saved())),'2026-10-26T01:00:00.000000Z');
 it('requires a matching actual activation and authenticated publication snapshot',async()=>{expect(await review(connection())).toEqual({masterlistId:'official',publicationHash:digest(JSON.stringify(publication())),effectiveOn:'2026-10-26'});expect(await review(connection({}, {},true))).toBeNull();});
 it.each([{scholar_id:'foreign'},{effective_on:'2026-10-25'},{activated_at:'2026-10-25T01:00:00.000000Z'}])('rejects changed activation linkage %j',async change=>expect(await review(connection(change))).toBeNull());
 it.each([{academic_year_id:'other-year'},{status:'draft'},{snapshot_hash:'0'.repeat(64)},{workflow_actor:'other-actor'},{resulting_version:4},{published_at:'2026-10-25T01:00:00.000000Z'}])('rejects missing or inconsistent official proof %j',async change=>expect(await review(connection({},change))).toBeNull());
 it('rejects a genuine but unrelated official member snapshot',async()=>{const other=publication();other.entries[0].snapshot.scholarshipId='other-annual';const encoded=JSON.stringify(other);expect(await review(connection({},{snapshot:encoded,workflow_snapshot:encoded,snapshot_hash:digest(encoded)}))).toBeNull();});
});
