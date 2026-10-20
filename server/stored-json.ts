import {gzipSync,gunzipSync,brotliCompressSync,brotliDecompressSync,constants} from "node:zlib";
import {createHash} from "node:crypto";
const encoding="ldss-evidence-gzip-v1",brotliEncoding="ldss-evidence-brotli-v1",maxExpanded=64*1024*1024;
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
/** Bounded storage for large immutable payroll evidence. Public models remain
 * fully expanded; existing plain JSON and its hashes are unchanged. */
export function encodeStoredJson(value:unknown):string{
 const json=JSON.stringify(value);
 if(Buffer.byteLength(json)<=350000)return json;
 if(Buffer.byteLength(json)>maxExpanded)throw new Error("Evidence exceeds the supported expanded storage limit; split the reviewed payroll into smaller batches.");
 const references=new Set<string>();
 const visit=(v:unknown,key="")=>{if(typeof v==="string"&&uuid.test(v)&&/policy|definition/i.test(key))references.add(v);else if(Array.isArray(v))v.forEach(item=>visit(item,key));else if(object(v))Object.entries(v).forEach(([k,item])=>visit(item,k));};visit(value);
 const roster=(v:unknown)=>Array.isArray(v)?v.map(item=>object(item)?{scholarshipId:item.scholarshipId,scholarId:item.scholarId}:{}):undefined;
 // Keep SQL notification membership and protected-reference searches explicit.
 const header:Record<string,unknown>={};
 if(object(value)){
  for(const [key,v] of Object.entries(value))if(v===null||["string","number","boolean"].includes(typeof v))header[key]=v;
  if(Array.isArray(value.entries))header.entries=roster(value.entries);
  for(const key of ["before","after","proposed"]){const v=value[key];if(object(v)&&Array.isArray(v.entries))header[key]={entries:roster(v.entries)};}
 }
 const envelope={...header,encoding,sha256:sha(json),references:[...references].sort(),data:gzipSync(json).toString("base64")};
 let stored=JSON.stringify(envelope);
 if(Buffer.byteLength(stored)>800000){envelope.encoding=brotliEncoding;envelope.data=brotliCompressSync(json,{params:{[constants.BROTLI_PARAM_QUALITY]:4,[constants.BROTLI_PARAM_LGWIN]:24}}).toString("base64");stored=JSON.stringify(envelope);}
 if(Buffer.byteLength(stored)>800000)throw new Error("Compressed evidence exceeds the safe database packet budget; use smaller reviewed payroll batches.");
 return stored;
}
export function decodeStoredJson<T=unknown>(raw:unknown):T{
 const value:unknown=typeof raw==="string"?JSON.parse(raw):raw;
 if(!object(value)||![encoding,brotliEncoding].includes(String(value.encoding)))return value as T;
 if(typeof value.data!=="string"||typeof value.sha256!=="string")throw new Error("Stored evidence envelope is incomplete.");
 const bytes=Buffer.from(value.data,"base64"),options={maxOutputLength:maxExpanded};
 const json=(value.encoding===encoding?gunzipSync(bytes,options):brotliDecompressSync(bytes,options)).toString("utf8");
 if(sha(json)!==value.sha256)throw new Error("Stored evidence integrity check failed.");
 return JSON.parse(json) as T;
}
