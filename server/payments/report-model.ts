import {z} from 'zod';
import {AuthError} from '../auth/service.js';
export const reportBasis=z.enum(['auto','provisional','original','updated','settlement']);
export const reportQuery=z.object({basis:reportBasis.default('auto'),outcome:z.enum(['all','paid','unclaimed']).default('all'),q:z.string().trim().max(150).default(''),offset:z.coerce.number().int().min(0).max(100000).default(0),limit:z.coerce.number().int().min(1).max(100).default(25)}).strict();
export const reportExport=z.object({basis:reportBasis,outcome:z.enum(['all','paid','unclaimed']),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),format:z.enum(['xlsx','pdf'])}).strict();
export type ReportBasis=Exclude<z.infer<typeof reportBasis>,'auto'>;
export type ReportRow={key:string;entitlementId:string;scholarshipId:string;humanId:string;name:string;lastName:string;firstName:string;school:string;course:string;yearLevel:number|null;academicYear:string;semester:string;batchCode:string;member:boolean;amountCentavos:number;originalOutcome:string;payrollOutcome:string;payrollPaidOn:string|null;payrollPaidCentavos:number;laterStatus:string;laterPaidOn:string|null;laterPaidCentavos:number;settlement:string;references:string[];conflict:boolean};
export type ReportSection={outcome:string;count:number;approvedCentavos:number;paidCentavos:number;laterPaidCentavos:number};
export type SettlementTotals={entitlements:number;approvedCentavos:number;paidEntitlements:number;paidCentavos:number;outstandingCentavos:number;paidAttempts:number;conflicts:number};
export type FinancialReport={basis:ReportBasis;title:string;sourceHash:string;sourceRevision:{batch:number;closureId:string|null};batchId:string;batchCode:string;batchName:string;academicYear:string;semester:string;generatedAt:string;closure:{recordedAt:string;actorName:string;verification:string}|null;available:ReportBasis[];notices:string[];rows:ReportRow[];sections:ReportSection[];settlementTotals:SettlementTotals|null;payrollTotals:{count:number;approvedCentavos:number;paidCentavos:number;unclaimedCentavos:number;pendingCentavos:number;reviewCentavos:number};};
export type ReportPage=Omit<FinancialReport,'rows'>&{items:ReportRow[];total:number;offset:number;limit:number};
export function parseReport<T>(schema:z.ZodType<T>,raw:unknown):T{const p=schema.safeParse(raw);if(!p.success)throw new AuthError(422,'VALIDATION_FAILED','Choose an available report, outcome filter and valid page.');return p.data;}
/** Exact decimal conversion; financial arithmetic never uses binary fractions. */
export function reportCents(raw:unknown){const m=/^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(raw));if(!m)throw new AuthError(409,'REPORT_EVIDENCE_INVALID','A recorded financial amount needs technical review.');const n=Number(m[1])*100+Number((m[2]??'').padEnd(2,'0'));if(!Number.isSafeInteger(n))throw new AuthError(409,'REPORT_EVIDENCE_INVALID','A financial total exceeds the supported range.');return n;}
export const reportMoney=(n:number)=>`${Math.floor(n/100).toLocaleString('en-PH')}.${String(n%100).padStart(2,'0')}`;
export const reportTitle:Record<ReportBasis,string>={provisional:'Provisional Reconciliation',original:'Original Reconciliation',updated:'Updated Reconciliation',settlement:'Individual Payment Settlement Information'};
export const outcomeOrder=['paid','unclaimed','pending','needs_review','omitted'];
export function reportRows(rows:ReportRow[],outcome:string,q=''){
 const search=q.toLocaleLowerCase();return rows.filter(r=>(outcome==='all'||r.payrollOutcome===outcome)&&(!search||`${r.name} ${r.humanId}`.toLocaleLowerCase().includes(search))).sort((a,b)=>(outcomeOrder.indexOf(a.payrollOutcome)-outcomeOrder.indexOf(b.payrollOutcome))||a.lastName.localeCompare(b.lastName,'en',{sensitivity:'base'})||a.firstName.localeCompare(b.firstName,'en',{sensitivity:'base'})||a.humanId.localeCompare(b.humanId)||a.key.localeCompare(b.key));
}
export function selectFinancialRows(report:Pick<FinancialReport,'basis'|'rows'>,outcome:string,q=''){return reportRows(report.basis==='settlement'&&outcome==='paid'?report.rows.filter(r=>r.settlement==='Paid'):report.rows,report.basis==='settlement'&&outcome==='paid'?'all':outcome,q);}
export function reportSections(rows:ReportRow[]):ReportSection[]{return outcomeOrder.map(outcome=>{const selected=rows.filter(r=>r.payrollOutcome===outcome);return {outcome,count:selected.length,approvedCentavos:selected.reduce((n,r)=>n+r.amountCentavos,0),paidCentavos:selected.reduce((n,r)=>n+(r.member?r.payrollPaidCentavos:0),0),laterPaidCentavos:selected.reduce((n,r)=>n+r.laterPaidCentavos,0)};}).filter(s=>s.count>0);}
export function uniqueSettlement(rows:ReportRow[],attempts:Map<string,{paid:number;amount:number}>):SettlementTotals{
 const entitlements=new Map(rows.map(r=>[r.entitlementId,r.amountCentavos]));let paid=0,paidAmount=0,approved=0,paidAttempts=0,conflicts=0;
 for(const [id,amount] of entitlements){approved+=amount;const source=attempts.get(id);if(source?.paid){paid++;paidAmount+=amount;paidAttempts+=source.paid;if(source.paid!==1||source.amount!==amount)conflicts++;}}
 return {entitlements:entitlements.size,approvedCentavos:approved,paidEntitlements:paid,paidCentavos:paidAmount,outstandingCentavos:approved-paidAmount,paidAttempts,conflicts};
}
