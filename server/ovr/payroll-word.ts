import { AlignmentType, BorderStyle, Document, Footer, Header, HeightRule, LineRuleType, ImageRun, Packer, PageBreak, PageNumber, PageOrientation, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from "docx";
import { daetLogo, ldssLogo } from "./payroll-assets.js";
import { certificationText, currentPayrollTemplate, payrollColumnWidths, payrollLayout, payrollMoney, payrollPeriod, type PayrollForm } from "./payroll-form.js";

const legacyWidths = [1037,2246,2246,1901,2938,518,518,518,518,518,1555,2767];
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const paragraph = (text: string, bold = false, center = false, compact = false) => new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: 0, after: 0, line: compact ? 150 : 200, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text, bold, size: compact ? 14 : 17, font: "Arial" })] });
function tableCell(text: string, width: number, bold = false, span = 1, align: "left" | "center" | "right" = "left", borderless = false, rowSpan = 1, compact = false) {
  return new TableCell({ width: { size: width, type: WidthType.DXA }, columnSpan: span, rowSpan, verticalAlign: VerticalAlign.CENTER, margins: { top: compact ? 10 : 20, bottom: compact ? 10 : 20, left: 45, right: 45 }, ...(borderless ? { borders: noBorders } : {}), children: [new Paragraph({ alignment: align, spacing: { before: 0, after: 0, line: compact ? 170 : 200, lineRule: LineRuleType.EXACT }, children: text.split("\n").map((line,index) => new TextRun({ text:line, break:index ? 1 : 0, bold, font:"Arial", size:bold || index ? 14 : compact ? 16 : 17 })) })] });
}
export async function renderPayrollWord(form: PayrollForm, draft = false): Promise<Buffer> {
  const compact = form.template === currentPayrollTemplate;
  const widths = compact ? payrollColumnWidths.map(w=>Math.round(w*172.8)) : [...legacyWidths];
  widths[widths.length-1] += 17280-widths.reduce((sum,w)=>sum+w,0);
  const p = (text: string, bold = false, center = false) => paragraph(text, bold, center, compact);
  const cell = (text: string, width: number, bold = false, span = 1, align: "left" | "center" | "right" = "left", borderless = false, rowSpan = 1) => tableCell(text, width, bold, span, align, borderless, rowSpan, compact);
  const headerMargins = compact ? { margins: { top: 0, bottom: 0, left: 0, right: 0 } } : {};
  const groups = payrollLayout(form);
  const image = (data: string, alignment: "left" | "right") => new Paragraph({ alignment, children: [new ImageRun({ type: "png", data: Buffer.from(data,"base64"), transformation: { width: 70, height: 70 } })] });
  const header = new Header({ children: [new Table({ width: { size: 17280, type: WidthType.DXA }, columnWidths: [5760,5760,5760], borders: noBorders, rows: [new TableRow({ children: [
    new TableCell({ borders: noBorders, ...headerMargins, verticalAlign: VerticalAlign.TOP, children: [image(daetLogo,"right")] }),
    new TableCell({ borders: noBorders, ...headerMargins, children: [p("Republic of the Philippines",false,true),p("Province of Camarines Norte",false,true),p("MUNICIPALITY OF DAET",true,true),p("LGU DAET EXPANDED SCHOLARSHIP PROGRAM",true,true),p("(Per Municipal Ordinance No. 327 Series of 2018)",false,true),p("MASTERLIST OF GRANTEES",false,true),p(`${payrollPeriod(form)} DEGREE COURSE`,false,true),p(`BATCH ${form.batchNumber}`,false,true),p("P A Y R O L L",true,true),...(draft?[p("DRAFT \u2014 NOT FOR PAYMENT",true,true)]:[])] }),
    new TableCell({ borders: noBorders, ...headerMargins, verticalAlign: VerticalAlign.TOP, children: [image(ldssLogo,"left")] }),
  ] })] })] });
  const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${payrollPeriod(form)} / Batch ${form.batchNumber}     Page `, size: 16 }),new TextRun({ children: [PageNumber.CURRENT], size:16 }),new TextRun({ text:" of ",size:16 }),new TextRun({ children:[PageNumber.TOTAL_PAGES],size:16 })] })] });
  const children: (Paragraph | Table)[] = [];
  groups.forEach(({ rows, total }, index) => {
    if(index) children.push(new Paragraph({ spacing:{before:0,after:0,line:1},children:[new PageBreak()] }));
    const tableRows = [new TableRow({ tableHeader:true,cantSplit:true,children:[
      cell("AWARD NO",widths[0],true,1,"center",false,2),cell("NAME",widths.slice(1,4).reduce((a,b)=>a+b,0),true,3,"center"),cell("SCHOOL",widths[4],true,1,"center",false,2),cell("CURRICULUM YEAR LEVEL",widths.slice(5,10).reduce((a,b)=>a+b,0),true,5,"center"),cell("AMOUNT",widths[10],true,1,"center",false,2),cell("SIGNATURE & DATE RECEIVED",widths[11],true,1,"center",false,2)
    ] }),new TableRow({tableHeader:true,cantSplit:true,children:[...['LAST NAME','FIRST NAME','MIDDLE NAME'].map((v,i)=>cell(v,widths[i+1],true,1,"center")),...['I','II','III','IV','V'].map((v,i)=>cell(v,widths[i+5],true,1,"center"))]})];
    for(const r of rows) {
      const values = [String(r.printedAwardNumber),[r.lastName,r.reprocessingNote].filter(Boolean).join("\n"),r.firstName,r.middleName,r.school,...[1,2,3,4,5].map(n=>r.yearLevel===n?"\u2713":""),payrollMoney(r.amountCentavos),""];
      tableRows.push(new TableRow({ cantSplit:true,height:{value:compact ? 280 : 230,rule:HeightRule.ATLEAST},children:values.map((v,i)=>cell(v,widths[i],false,1,i===10?"right":i>=5&&i<=9?"center":"left")) }));
    }
    tableRows.push(new TableRow({ cantSplit:true, children:[cell("",widths[0],false,1,"left",true),cell(`Page total \u2014 ${rows.length} ${rows.length===1?"student":"students"}`,widths.slice(1,10).reduce((a,b)=>a+b,0),true,9,"left",true),cell(payrollMoney(total),widths[10],true,1,"right",true),cell("",widths[11],false,1,"left",true)] }));
    children.push(new Table({ width:{size:17280,type:WidthType.DXA},columnWidths:widths,...(compact ? {layout:TableLayoutType.FIXED} : {}),rows:tableRows }));
    if(index===groups.length-1) {
      children.push(new Paragraph({spacing:{before:0,after:0,line:80,lineRule:LineRuleType.EXACT}}));
      children.push(new Table({ width:{size:17280,type:WidthType.DXA},columnWidths:[8640,8640],borders:noBorders,rows:[0,2].map(start=>new TableRow({cantSplit:true,children:[start,start+1].map(i=>new TableCell({borders:noBorders,margins:{top:compact ? 40 : 60,bottom:compact ? 40 : 80,left:180,right:180},children:[p(certificationText[i]),new Paragraph({spacing:{before:compact ? 120 : 240,after:0,line:compact ? 170 : 200,lineRule:LineRuleType.EXACT},alignment:AlignmentType.CENTER,children:[new TextRun({text:form.signatories[i].name,bold:true,size:16})]}),p(form.signatories[i].title,false,true)]}))})) }));
    }
  });
  return Packer.toBuffer(new Document({ creator:"LDSS Scholarship Monitor", title:`${draft?'Draft ':''}Payroll - Batch ${form.batchNumber}`, styles:{default:{document:{run:{font:"Arial",size:17},paragraph:{spacing:{after:0}}}}},sections:[{properties:{page:{size:{width:12240,height:18720,orientation:PageOrientation.LANDSCAPE},margin:{top:compact ? 1880 : 2440,bottom:compact ? 500 : 650,left:720,right:720,header:300,footer:300}}},headers:{default:header},footers:{default:footer},children}] }));
}
