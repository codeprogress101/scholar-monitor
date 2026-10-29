import {createHash,randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseId,parseKey} from '../configuration/validation.js';
import {parseRequirementList} from '../requirements/validation.js';
import {cachedReads} from '../read-cache.js';
import {decodeStoredJson} from '../stored-json.js';
import {documentHeader,preparedDocumentSource,type DocumentReviewServices} from './document-source.js';
import {documentFields,documentMoney,MAX_DOCUMENT_BYTES,parseDocumentInput,type DocumentDetail,type DocumentFields,type DocumentInput,type DocumentKind,type DocumentSource,type TemplateInfo} from './document-model.js';
import {prototypeDocuments,type IndividualDocumentRenderer} from './document-word.js';
const bytesHash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');

async function audit(db:PoolConnection,id:string,actor:string,action:string,requestId:string,details:object){
 await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'individual.document','individual_document_versions',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),id,action,actor,requestId,action==='generated'?'Draft Word documents prepared; no payment recorded.':'Current draft Word document downloaded; no payment recorded.',JSON.stringify(details)]);
}
async function versions(db:PoolConnection,id:string){
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT v.transaction_id,v.document_kind,v.revision,v.generation_id,v.source_kind,v.source_hash,v.source,v.template,v.fields,v.document_hash,v.content_bytes,v.recorded_at,u.full_name
 FROM individual_document_versions v JOIN users u ON u.id=v.actor_id WHERE v.transaction_id=? AND NOT EXISTS(SELECT 1 FROM individual_document_versions n WHERE n.transaction_id=v.transaction_id AND n.document_kind=v.document_kind AND n.revision>v.revision) ORDER BY v.document_kind`,[id]);return rows;
}
function revision(rows:RowDataPacket[],kind:DocumentSource['sourceKind']){
 if(!rows.length)return 0;
 const kinds=kind==='omitted'?['DV','OR']:['DV'];
 if(rows.length!==kinds.length||rows.some(r=>!kinds.includes(r.document_kind)||Number(r.revision)!==Number(rows[0].revision)||r.generation_id!==rows[0].generation_id))throw new AuthError(409,'DOCUMENT_EVIDENCE_INVALID','Preserve the current document history for technical review.');
 return Number(rows[0].revision);
}
type Pin={source:DocumentSource;hash:string;revision:number;templates:TemplateInfo[];previousFields:DocumentFields};
export class IndividualDocumentService{
 constructor(private authorization:AuthorizationService,private reviews:DocumentReviewServices,private enabled=false,private renderer:IndividualDocumentRenderer=prototypeDocuments){}
 availability(actor:string){return this.authorization.readSnapshot(actor,'ovr.process',async()=>({enabled:this.enabled,draft:true}));}
 private active(){if(!this.enabled)throw new AuthError(423,'INDIVIDUAL_DOCUMENTS_DISABLED','Draft document generation awaits compatibility verification and explicit activation.');}
 private templates(kind:DocumentSource['sourceKind']){const templates=this.renderer.templates(kind),kinds=kind==='omitted'?['OR','DV']:['DV'];if(templates.some(t=>t.status!=='draft'||t.version!==this.renderer.version||!kinds.includes(t.kind))||templates.length!==kinds.length||new Set(templates.map(t=>t.kind)).size!==kinds.length)throw new AuthError(409,'DOCUMENT_TEMPLATE_UNAVAILABLE','An allowed draft template is required. Official use awaits office approval.');return templates;}
 async detail(actor:string,rawId:unknown):Promise<DocumentDetail>{
  this.active();const id=parseId(rawId);
  return this.authorization.readSnapshot(actor,'ovr.process',async connection=>{
   const db=cachedReads(connection),header=await documentHeader(db,id),rows=await versions(db,id),current=revision(rows,header.source_kind),blockers:string[]=[];
   let sourceHash='';try{sourceHash=(await preparedDocumentSource(db,id,this.reviews,header)).hash;}catch(e){if(!(e instanceof AuthError)||![409,423].includes(e.status))throw e;blockers.push(e.message);}
   const fields=documentFields.parse(rows.length?decodeStoredJson(rows[0].fields):{});
   const [downloads]=await db.execute<RowDataPacket[]>(`SELECT occurred_at,details FROM audit_event_view WHERE entity_type='individual_document_versions' AND entity_id=? AND action='downloaded' ORDER BY occurred_at DESC LIMIT 25`,[id]);
   const templates=this.templates(header.source_kind);
   return {enabled:true,transactionId:id,sourceKind:header.source_kind,reference:header.internal_reference,humanId:header.human_id,name:header.name,academicYear:header.academic_year,semester:header.semester,amount:documentMoney(Number(header.amount_centavos)),sourceBatch:header.batch_code,sourceHash,revision:current,fields,templates,blockers,
    documents:rows.map(r=>{const last=downloads.find(d=>{const data=decodeStoredJson<{kind:string;revision:number}>(d.details);return data.kind===r.document_kind&&data.revision===Number(r.revision);}),template=decodeStoredJson<TemplateInfo>(r.template);return {kind:r.document_kind as DocumentKind,revision:Number(r.revision),bytes:Number(r.content_bytes),recordedAt:new Date(r.recorded_at).toISOString(),actor:r.full_name,template,current:Boolean(sourceHash)&&r.source_hash===sourceHash&&templates.some(t=>t.kind===r.document_kind&&t.contentHash===template.contentHash),lastDownloadedAt:last?new Date(last.occurred_at).toISOString():null};})};
  });
 }
 history(actor:string,rawId:unknown,raw:unknown){
  this.active();const id=parseId(rawId),q=parseRequirementList(raw);
  return this.authorization.readSnapshot(actor,'ovr.process',async db=>{
   await documentHeader(db,id);
   const [[count]]=await db.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM individual_document_versions WHERE transaction_id=?',[id]);
   const [rows]=await db.execute<RowDataPacket[]>(`SELECT v.document_kind,v.revision,v.content_bytes,v.recorded_at,v.template,v.fields,u.full_name FROM individual_document_versions v JOIN users u ON u.id=v.actor_id WHERE v.transaction_id=? ORDER BY v.revision DESC,v.document_kind LIMIT ${q.limit} OFFSET ${q.offset}`,[id]);
   return {items:rows.map(r=>({kind:r.document_kind,revision:Number(r.revision),bytes:Number(r.content_bytes),recordedAt:new Date(r.recorded_at).toISOString(),actor:r.full_name,template:decodeStoredJson<TemplateInfo>(r.template),fields:decodeStoredJson<DocumentFields>(r.fields)})),total:Number(count.n),offset:q.offset,limit:q.limit};
  });
 }
 private async replay(db:PoolConnection,actor:string,key:string,hash:string){const [[retry]]=await db.execute<RowDataPacket[]>('SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);if(!retry)return null;if(retry.payload_hash!==hash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','Retry the exact saved document request.');return decodeStoredJson<Record<string,unknown>>(retry.result);}
 private async pin(db:PoolConnection,input:DocumentInput):Promise<Pin>{
  const header=await documentHeader(db,input.transactionId);
  await db.execute('SELECT id FROM semester_entitlements WHERE id=? FOR UPDATE',[header.entitlement_id]);
  let reviewed;try{reviewed=await preparedDocumentSource(db,input.transactionId,this.reviews,header);}catch(e){if(e instanceof AuthError&&e.status===409)throw new AuthError(409,'DOCUMENT_UNAVAILABLE',e.message,e.details);throw e;}
  const rows=await versions(db,input.transactionId),current=revision(rows,header.source_kind);
  if(input.sourceKind!==reviewed.source.sourceKind)throw new AuthError(409,'DOCUMENT_SOURCE_CHANGED','The document route changed. Review this transaction.');
  if(input.sourceHash!==reviewed.hash)throw new AuthError(409,'DOCUMENT_SOURCE_CHANGED','Transaction or financial sources changed. Review before preparing documents.');
  if(input.expectedRevision!==current)throw new AuthError(409,'DOCUMENT_CHANGED','A newer document is already available. Review it before regenerating.');
  if(input.templateVersion!==this.renderer.version)throw new AuthError(409,'DOCUMENT_TEMPLATE_CHANGED','The draft template changed. Reload the document review.');
  return {...reviewed,revision:current,templates:this.templates(reviewed.source.sourceKind),previousFields:documentFields.parse(rows.length?decodeStoredJson(rows[0].fields):{})};
 }
 async generate(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string){
  this.active();const id=parseId(rawId),key=parseKey(rawKey),input=parseDocumentInput(raw);
  if(input.transactionId!==id)throw new AuthError(422,'VALIDATION_FAILED','Choose the current transaction.');
  const payloadHash=digest(JSON.stringify({version:'individual-documents/v1',input}));
  const first=await this.authorization.withPermission(actor,'ovr.process',async connection=>{const db=cachedReads(connection),retry=await this.replay(db,actor,key,payloadHash);return retry?{retry,pin:null}:{retry:null,pin:await this.pin(db,input)};});
  if(first.retry)return first.retry;
  const initial=first.pin!;
  // Deliberately outside a pooled SQL transaction. No file is published here.
  const files=await this.renderer.render(initial.source,input.fields,initial.templates);
  if(files.length!==initial.templates.length||new Set(files.map(f=>f.kind)).size!==files.length||files.some(f=>!initial.templates.some(t=>t.kind===f.kind)||!Buffer.isBuffer(f.content)||!f.content.length||f.content.length>MAX_DOCUMENT_BYTES||f.content.subarray(0,4).toString('hex')!=='504b0304'))throw new AuthError(422,'DOCUMENT_RENDER_INVALID','The draft could not be safely prepared. The previous files remain current.');
  return this.authorization.withPermission(actor,'ovr.process',async connection=>{
   const db=cachedReads(connection),retry=await this.replay(db,actor,key,payloadHash);if(retry)return retry;
   const current=await this.pin(db,input);
   if(current.hash!==initial.hash||JSON.stringify(current.templates)!==JSON.stringify(initial.templates))throw new AuthError(409,'DOCUMENT_TEMPLATE_CHANGED','The reviewed source or template changed during rendering. Review and try again.');
   const next=current.revision+1,generationId=randomUUID(),artifacts=[];
   for(const file of files){
    const hash=bytesHash(file.content),template=current.templates.find(t=>t.kind===file.kind)!;
    await db.execute('INSERT INTO individual_document_versions(transaction_id,document_kind,revision,generation_id,source_kind,source_hash,source,template,fields,document_hash,content_bytes,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[id,file.kind,next,generationId,input.sourceKind,current.hash,JSON.stringify(current.source),JSON.stringify(template),JSON.stringify(input.fields),hash,file.content.length,actor]);
    if(current.revision===0)await db.execute('INSERT INTO individual_document_contents(transaction_id,document_kind,revision,document_hash,content_base64) VALUES(?,?,?,?,?)',[id,file.kind,next,hash,file.content.toString('base64')]);
    else{const [updated]=await db.execute<ResultSetHeader>('UPDATE individual_document_contents SET revision=?,document_hash=?,content_base64=? WHERE transaction_id=? AND document_kind=?',[next,hash,file.content.toString('base64'),id,file.kind]);if(updated.affectedRows!==1)throw new AuthError(409,'DOCUMENT_EVIDENCE_INVALID','Preserve the current document pointers for technical review.');}
    artifacts.push({kind:file.kind,bytes:file.content.length});
   }
   const result={transactionId:id,revision:next,status:'Document Ready',draft:true,documents:artifacts};
   await audit(db,id,actor,'generated',requestId,{key,generationId,sourceHash:current.hash,previousRevision:current.revision,revision:next,previousFields:current.previousFields,fields:input.fields,templates:current.templates,documents:artifacts});
   await db.execute('INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)',[actor,key,payloadHash,JSON.stringify(result)]);return result;
  });
 }
 download(actor:string,rawId:unknown,kind:DocumentKind,requestId:string){
  this.active();const id=parseId(rawId);
  return this.authorization.withPermission(actor,'ovr.process',async connection=>{
   const db=cachedReads(connection),reviewed=await preparedDocumentSource(db,id,this.reviews);
   const [[r]]=await db.execute<RowDataPacket[]>(`SELECT c.revision,c.document_hash,c.content_base64,v.source_hash,v.template,v.content_bytes FROM individual_document_contents c JOIN individual_document_versions v ON v.transaction_id=c.transaction_id AND v.document_kind=c.document_kind AND v.revision=c.revision AND v.document_hash=c.document_hash WHERE c.transaction_id=? AND c.document_kind=?`,[id,kind]);
   if(!r)throw new AuthError(404,'DOCUMENT_NOT_READY','Prepare this document before downloading Word.');
   const template=decodeStoredJson<TemplateInfo>(r.template),current=this.templates(reviewed.source.sourceKind).find(t=>t.kind===kind);
   if(r.source_hash!==reviewed.hash||!current||current.contentHash!==template.contentHash||current.version!==template.version)throw new AuthError(409,'DOCUMENT_SOURCE_CHANGED','The draft source or template changed. Review and regenerate before downloading.');
   const content=Buffer.from(r.content_base64,'base64');
   if(content.length!==Number(r.content_bytes)||content.length>MAX_DOCUMENT_BYTES||bytesHash(content)!==r.document_hash||content.subarray(0,4).toString('hex')!=='504b0304')throw new AuthError(409,'DOCUMENT_EVIDENCE_INVALID','Preserve this document for technical review.');
   await audit(db,id,actor,'downloaded',requestId,{kind,revision:Number(r.revision),hash:r.document_hash,bytes:content.length,draft:true});
   return {content,filename:`DRAFT-${kind}-${id}-v${r.revision}.docx`};
  });
 }
}
