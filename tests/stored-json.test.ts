import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {encodeStoredJson,decodeStoredJson} from "../server/stored-json";
import {evidenceDocumentIds} from "../server/requirements/protected-document-evidence";
describe("Bounded immutable evidence storage",()=>{
 it("keeps existing small JSON byte-for-byte unchanged",()=>{const v={state:"draft",entries:[]};expect(encodeStoredJson(v)).toBe(JSON.stringify(v));expect(decodeStoredJson(JSON.stringify(v))).toEqual(v);});
 it("round-trips a large payroll while preserving SQL roster and protected references",()=>{const document=randomUUID(),policy=randomUUID();const evidence={current:{sources:{requirements:[{instanceId:document,definitionVersionId:policy}]}}};const entries=Array.from({length:835},()=>({scholarshipId:randomUUID(),evidence,notes:"School and course remain in the approved evidence. ".repeat(40)}));const v={entries,validation:{entries},state:"finalized"};const stored=encodeStoredJson(v),header=JSON.parse(stored);expect(Buffer.byteLength(stored)).toBeLessThan(800000);expect(header.entries.map((e:{scholarshipId:string})=>e.scholarshipId)).toEqual(entries.map(e=>e.scholarshipId));expect(header.references).toContain(policy);expect(decodeStoredJson(stored)).toEqual(v);expect(evidenceDocumentIds(encodeStoredJson({...evidence,notes:"a".repeat(400000)}))).toContain(document);});
 it("rejects damaged compressed evidence instead of returning partial approval data",()=>{const header=JSON.parse(encodeStoredJson({notes:"x".repeat(400000)}));header.sha256="0".repeat(64);expect(()=>decodeStoredJson(header)).toThrow("integrity");});
});
