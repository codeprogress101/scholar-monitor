import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {fileURLToPath} from 'node:url';
import {spreadsheetText} from '../imports/workbook.js';
import {reportMoney,selectFinancialRows,reportSections,type FinancialReport,type ReportRow} from './report-model.js';
export const sectionLabel=(v:string)=>({paid:'Paid',unclaimed:'Unclaimed',pending:'Pending',needs_review:'Withheld / Review — requires resolution',omitted:'Omitted — source payroll reference only'}[v]??v);
export const financialColumns=['Scholar ID','Full name','School','Course','Year level','Approved stipend (PHP)','Payroll Paid (PHP)','Original payroll outcome','Effective payroll outcome','Actual payroll payment date','Later individual settlement','Individual Paid attempts (PHP)','Individual settlement date','Current entitlement settlement','LDSS individual reference'];
export function financialCells(r:ReportRow):string[]{return [r.humanId,r.name,r.school,r.course,r.yearLevel===null?'Not recorded':String(r.yearLevel),reportMoney(r.amountCentavos),reportMoney(r.payrollPaidCentavos),sectionLabel(r.originalOutcome),sectionLabel(r.payrollOutcome),r.payrollPaidOn??'',r.laterStatus,r.laterStatus==='Not included in original closure'?'':reportMoney(r.laterPaidCentavos),r.laterPaidOn??'',r.settlement,r.references.join('; ')];}
export function reportNotes(report:FinancialReport,outcome:string){const p=report.payrollTotals,s=report.settlementTotals;return [
 'Republic of the Philippines • Municipality of Daet',
 `${report.batchCode} — ${report.batchName}`,`${report.academicYear} • ${report.semester}`,
 `Generated: ${new Date(report.generatedAt).toLocaleString('en-GB',{timeZone:'Asia/Manila',hour12:false})} Philippine time`,
 `Filter: ${outcome==='all'?'Complete Report':outcome==='paid'?'Paid Only':'Unclaimed Only'}. Search applies to preview only; downloads include the complete selected outcome.`,
 ...(report.closure?[`Original closure: ${report.closure.recordedAt} • ${report.closure.actorName}`,report.closure.verification]:[]),
 `Payroll batch: ${p.count} scholars; approved PHP ${reportMoney(p.approvedCentavos)}; payroll Paid PHP ${reportMoney(p.paidCentavos)}; Unclaimed entitlement PHP ${reportMoney(p.unclaimedCentavos)}; Pending PHP ${reportMoney(p.pendingCentavos)}; Withheld / Review PHP ${reportMoney(p.reviewCentavos)}.`,
 ...(s?[`Current ${report.basis==='settlement'?'linked individual':'payroll roster'} entitlement scope: ${s.entitlements} unique benefits; approved PHP ${reportMoney(s.approvedCentavos)}; ${s.paidEntitlements} with effective Paid evidence / PHP ${reportMoney(s.paidCentavos)}; outstanding PHP ${reportMoney(s.outstandingCentavos)}; ${s.paidAttempts} Paid attempts; ${s.conflicts} conflicts. These are separate from payroll batch totals.`]:[]),...report.notices];}
export async function reconciliationExcel(report:FinancialReport,outcome:string){
 const workbook=new ExcelJS.Workbook();workbook.creator='LDSS Scholarship Office';workbook.created=new Date(report.generatedAt);
 // OOXML paperSize 8 is A3; ExcelJS's public enum omits that valid value.
 const sheet=workbook.addWorksheet('Reconciliation',{pageSetup:{paperSize:8 as ExcelJS.PaperSize,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
 sheet.columns=financialColumns.map((_,i)=>({width:[20,28,25,18,8,16,16,16,16,15,22,18,15,18,25][i]}));
 const banner=(value:string,bold=false)=>{const row=sheet.addRow([spreadsheetText(value)]);sheet.mergeCells(row.number,1,row.number,financialColumns.length);row.font={bold,size:bold?13:10};row.alignment={wrapText:true,vertical:'top'};row.height=Math.max(20,Math.ceil(value.length/160)*15);};
 banner(report.title,true);for(const note of reportNotes(report,outcome))banner(note);sheet.addRow([]);
 const headers=sheet.addRow(financialColumns);headers.font={bold:true};headers.alignment={wrapText:true,vertical:'top'};headers.height=32;
 sheet.views=[{state:'frozen',ySplit:headers.number}];sheet.pageSetup.printTitlesRow=`${headers.number}:${headers.number}`;
 const rows=selectFinancialRows(report,outcome);
 for(const section of reportSections(rows)){
  banner(sectionLabel(section.outcome),true);
  for(const r of rows.filter(r=>r.payrollOutcome===section.outcome)){const values=financialCells(r).map(spreadsheetText);const row=sheet.addRow(values);row.font={size:10};for(const [index,cents] of [[6,r.amountCentavos],[7,r.payrollPaidCentavos],...(report.basis==='original'?[]:[[12,r.laterPaidCentavos]])]){row.getCell(index).value=cents/100;row.getCell(index).numFmt='"PHP "#,##0.00';}row.alignment={wrapText:true,vertical:'top'};row.height=Math.max(30,...values.map((s,i)=>Math.ceil(s.length/Math.max(5,Number(sheet.columns[i].width)-3))*14));}
  banner(`${sectionLabel(section.outcome)} subtotal: ${section.count} scholars • approved PHP ${reportMoney(section.approvedCentavos)} • payroll Paid PHP ${reportMoney(section.paidCentavos)}${report.basis==='original'?'':` • later individual Paid attempts PHP ${reportMoney(section.laterPaidCentavos)} (separate)`}`,true);
 }
 banner(`Selected report totals: ${rows.length} rows • approved PHP ${reportMoney(rows.reduce((n,r)=>n+r.amountCentavos,0))} • payroll Paid PHP ${reportMoney(rows.reduce((n,r)=>n+r.payrollPaidCentavos,0))}`,true);
 sheet.headerFooter.oddFooter='LDSS financial reconciliation | Page &P of &N';
 return Buffer.from(await workbook.xlsx.writeBuffer());
}
/** Direct Node PDF, no browser/Office process, remote HTML or template execution.
 * Measured wrapped lines paginate in full, including pathological long cells. */
export async function reconciliationPdf(report:FinancialReport,outcome:string):Promise<Buffer>{
 const doc=new PDFDocument({size:'A3',layout:'landscape',margin:28,bufferPages:true,info:{Title:report.title,Author:'LDSS Scholarship Office',CreationDate:new Date(report.generatedAt)}}),buffers:Buffer[]=[];
 doc.registerFont('Report',fileURLToPath(new URL('./report-assets/NotoSans-Regular.ttf',import.meta.url)));doc.registerFont('ReportBold',fileURLToPath(new URL('./report-assets/NotoSans-Bold.ttf',import.meta.url)));
 const done=new Promise<Buffer>((resolve,reject)=>{doc.on('data',(b:Buffer)=>buffers.push(b));doc.on('end',()=>resolve(Buffer.concat(buffers)));doc.on('error',reject);});
 const widths=[86,122,112,82,33,68,67,66,66,70,91,67,70,73,61],left=28,bottom=doc.page.height-55,lineHeight=11;let y=28;
 function wrapped(value:string,width:number,size=8.5){doc.font('Report').fontSize(size);const lines:string[]=[];for(const paragraph of value.split(/\r?\n/)){let line='';for(const token of paragraph.match(/\S+\s*|\s+/gu)??[]){if(line&&doc.widthOfString(line+token)>width){lines.push(line.trimEnd());line='';}for(const char of (line?token:token.trimStart())){if(line&&doc.widthOfString(line+char)>width){lines.push(line.trimEnd());line='';}line+=char;}}lines.push(line.trimEnd());}return lines;}
 function heading(continued=false){doc.fillColor('#153e35').font('ReportBold').fontSize(14).text(report.title+(continued?' (continued)':''),left,28,{width:1134});doc.font('Report').fontSize(9).fillColor('#222').text(`${report.batchCode} • ${report.academicYear} • ${report.semester} | ${new Date(report.generatedAt).toLocaleString('en-GB',{timeZone:'Asia/Manila',hour12:false})} Philippine time`,left,49,{width:1134});y=70;}
 function headers(){let x=left;const h=42;doc.rect(left,y,1134,h).fill('#e8efeb');for(let i=0;i<widths.length;i++){doc.fillColor('#111').font('ReportBold').fontSize(8).text(financialColumns[i],x+4,y+5,{width:widths[i]-8});x+=widths[i];}y+=h;}
 function next(){doc.addPage();heading(true);headers();}
 function paragraph(text:string,bold=false){doc.font(bold?'ReportBold':'Report').fontSize(9);const lines=wrapped(text,1124,9);for(const line of lines){if(y+14>bottom)next();doc.font(bold?'ReportBold':'Report').fontSize(9).fillColor('#222').text(line,left+4,y,{width:1124,lineBreak:false});y+=13;}y+=4;}
 heading();for(const text of reportNotes(report,outcome))paragraph(text);if(y+50>bottom)next();else headers();
 const rows=selectFinancialRows(report,outcome);
 for(const section of reportSections(rows)){
  if(y+40>bottom)next();paragraph(sectionLabel(section.outcome),true);
  for(const row of rows.filter(r=>r.payrollOutcome===section.outcome)){
   const cells=financialCells(row).map((v,i)=>wrapped(v,widths[i]-8)),lineCount=Math.max(...cells.map(v=>v.length));let offset=0;
   if(lineCount*lineHeight+8<=bottom-112&&y+lineCount*lineHeight+8>bottom)next();
   while(offset<lineCount){if(y+lineHeight+8>bottom)next();const take=Math.min(lineCount-offset,Math.floor((bottom-y-8)/lineHeight)),height=take*lineHeight+8;let x=left;
    for(let i=0;i<cells.length;i++){doc.rect(x,y,widths[i],height).lineWidth(0.3).strokeColor('#a9b3ad').stroke();doc.font('Report').fontSize(8.5).fillColor('#111');for(let j=0;j<take;j++){const line=cells[i][offset+j];if(line)doc.text(line,x+4,y+4+j*lineHeight,{width:widths[i]-8,lineBreak:false});}x+=widths[i];}y+=height;offset+=take;if(offset<lineCount)next();
   }
  }
  paragraph(`${sectionLabel(section.outcome)} subtotal: ${section.count} scholars | approved PHP ${reportMoney(section.approvedCentavos)} | payroll Paid PHP ${reportMoney(section.paidCentavos)}${report.basis==='original'?'':` | later individual Paid attempts PHP ${reportMoney(section.laterPaidCentavos)} (separate)`}`,true);
 }
 paragraph(`Selected report totals: ${rows.length} rows | approved PHP ${reportMoney(rows.reduce((n,r)=>n+r.amountCentavos,0))} | payroll Paid PHP ${reportMoney(rows.reduce((n,r)=>n+r.payrollPaidCentavos,0))}`,true);
 const range=doc.bufferedPageRange();for(let page=0;page<range.count;page++){doc.switchToPage(page);doc.font('Report').fontSize(8).fillColor('#444').text(`LDSS financial reconciliation | Page ${page+1} of ${range.count}`,left,doc.page.height-40,{width:1134,align:'right',lineBreak:false});}doc.end();return done;
}
