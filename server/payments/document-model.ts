import {z} from 'zod';
import {AuthError} from '../auth/service.js';

export type DocumentKind='OR'|'DV';
const text=(max:number)=>z.string().trim().max(max).refine(value=>Array.from(value).every(char=>{const code=char.codePointAt(0)!;return (code>=32||[9,10,13].includes(code))&&code!==127&&!(code>=0xd800&&code<=0xdfff)&&code%65536<65534;})).transform(value=>value.normalize('NFC'));
export const documentFields=z.object({payee:text(180).default(''),office:text(180).default(''),address:text(300).default(''),additionalExplanation:text(1200).default('')}).strict();
export type DocumentFields=z.infer<typeof documentFields>;
export const documentInput=z.object({transactionId:z.uuid(),sourceKind:z.enum(['unclaimed','omitted']),expectedRevision:z.number().int().nonnegative(),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),templateVersion:z.string().min(1).max(100),fields:documentFields}).strict();
export type DocumentInput=z.infer<typeof documentInput>;
export function parseDocumentInput(raw:unknown){const result=documentInput.safeParse(raw);if(!result.success)throw new AuthError(422,'VALIDATION_FAILED','Review the current transaction and use only the permitted document fields.');return result.data;}
export type DocumentSource={version:'individual-document-source/v1';transactionId:string;sourceKind:'unclaimed'|'omitted';reference:string;entitlementId:string;scholarId:string;scholarshipId:string;humanId:string;name:string;academicYear:string;semester:string;amountCentavos:number;currency:'PHP';sourceBatchId:string;batchCode:string;basis:object};
export type TemplateInfo={kind:DocumentKind;version:string;status:'draft';provenance:string;contentHash:string;allowedFields:string[];mapping:string;assumptions:string};
export type DocumentArtifact={kind:DocumentKind;revision:number;bytes:number;recordedAt:string;actor:string;template:TemplateInfo;current:boolean;lastDownloadedAt?:string|null};
export type DocumentDetail={transactionId:string;sourceKind:DocumentSource['sourceKind'];reference:string;humanId:string;name:string;academicYear:string;semester:string;amount:string;sourceBatch:string;sourceHash:string;revision:number;fields:DocumentFields;templates:TemplateInfo[];documents:DocumentArtifact[];blockers:string[];enabled:true};
export const MAX_DOCUMENT_BYTES=262144;

const underTwenty=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
function hundreds(value:number):string{if(value<20)return underTwenty[value];if(value<100)return ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'][Math.floor(value/10)]+(value%10?' '+underTwenty[value%10]:'');return underTwenty[Math.floor(value/100)]+' Hundred'+(value%100?' '+hundreds(value%100):'');}
function integerWords(value:number):string{if(value<1000)return hundreds(value);for(const [scale,label] of [[1_000_000_000,'Billion'],[1_000_000,'Million'],[1000,'Thousand']] as const)if(value>=scale)return integerWords(Math.floor(value/scale))+' '+label+(value%scale?' '+integerWords(value%scale):'');throw Error('Unsupported amount');}
export function pesoWords(centavos:number){if(!Number.isSafeInteger(centavos)||centavos<0||centavos>99_999_999_999)throw new AuthError(422,'DOCUMENT_AMOUNT_INVALID','An exact approved peso amount is required.');const pesos=Math.floor(centavos/100),cents=centavos%100;return integerWords(pesos)+(pesos===1?' Peso':' Pesos')+(cents?' and '+integerWords(cents)+(cents===1?' Centavo':' Centavos'):'')+' Only';}
export function documentMoney(centavos:number){pesoWords(centavos);return Math.floor(centavos/100).toLocaleString('en-US')+'.'+String(centavos%100).padStart(2,'0');}
