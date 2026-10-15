import { AlignmentType, BorderStyle, Document, Footer, Header, HeightRule, LineRuleType, ImageRun, Packer, PageBreak, PageNumber, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType } from "docx";
import { daetLogo, ldssLogo } from "./payroll-assets.js";
import { certificationText, payrollLayout, payrollMoney, payrollPeriod, type PayrollForm } from "./payroll-form.js";

const widths = [1037,2246,2246,1901,2938,518,518,518,518,518,1555,2767];
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const p = (text: string, bold = false, center = false) => new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: 0, after: 0, line: 200, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text, bold, size: 17, font: "Arial" })] });
function cell(text: string, width: number, bold = false, span = 1, align: "left" | "center" | "right" = "left", borderless = false, rowSpan = 1) {
  return new TableCell({ width: { size: width, type: WidthType.DXA }, columnSpan: span, rowSpan, verticalAlign: VerticalAlign.CENTER, margins: { top: 20, bottom: 20, left: 45, right: 45 }, ...(borderless ? { borders: noBorders } : {}), children: [new Paragraph({ alignment: align, spacing: { before: 0, after: 0, line: 200, lineRule: LineRuleType.EXACT }, children: text.split("\n").map((line,index) => new TextRun({ text:line, break:index ? 1 : 0, bold, font:"Arial", size:bold || index ? 14 : 17 })) })] });
}
export async function renderPayrollWord(form: PayrollForm, draft = false): Promise<Buffer> {
  const groups = payrollLayout(form);
  const image = (data: string, alignment: "left" | "right") => new Paragraph({ alignment, children: [new ImageRun({ type: "png", data: Buffer.from(data,"base64"), transformation: { width: 70, height: 70 } })] });
  const header = new Header({ children: [new Table({ width: { size: 17280, type: WidthType.DXA }, columnWidths: [5760,5760,5760], borders: noBorders, rows: [new TableRow({ children: [
    new TableCell({ borders: noBorders, verticalAlign: VerticalAlign.TOP, children: [image(daetLogo,"right")] }),
    new TableCell({ borders: noBorders, children: [p("Republic of the Philippines",false,true),p("Province of Camarines Norte",false,true),p("MUNICIPALITY OF DAET",true,true),p("LGU DAET EXPANDED SCHOLARSHIP PROGRAM",true,true),p("(Per Municipal Ordinance No. 327 Series of 2018)",false,true),p("MASTERLIST OF GRANTEES",false,true),p(`${payrollPeriod(form)} DEGREE COURSE`,false,true),p(`BATCH ${form.batchNumber}`,false,true),p("P A Y R O L L",true,true),...(draft?[p("DRAFT \u2014 NOT FOR PAYMENT",true,true)]:[])] }),
    new TableCell({ borders: noBorders, verticalAlign: VerticalAlign.TOP, children: [image(ldssLogo,"left")] }),
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
      tableRows.push(new TableRow({ cantSplit:true,height:{value:230,rule:HeightRule.ATLEAST},children:values.map((v,i)=>cell(v,widths[i],false,1,i===10?"right":i>=5&&i<=9?"center":"left")) }));
    }
    tableRows.push(new TableRow({ cantSplit:true, children:[cell("",widths[0],false,1,"left",true),cell(`Page total \u2014 ${rows.length} ${rows.length===1?"student":"students"}`,widths.slice(1,10).reduce((a,b)=>a+b,0),true,9,"left",true),cell(payrollMoney(total),widths[10],true,1,"right",true),cell("",widths[11],false,1,"left",true)] }));
    children.push(new Table({ width:{size:17280,type:WidthType.DXA},columnWidths:widths,rows:tableRows }));
    if(index===groups.length-1) {
      children.push(new Paragraph({spacing:{before:0,after:0,line:80,lineRule:LineRuleType.EXACT}}));
      children.push(new Table({ width:{size:17280,type:WidthType.DXA},columnWidths:[8640,8640],borders:noBorders,rows:[0,2].map(start=>new TableRow({cantSplit:true,children:[start,start+1].map(i=>new TableCell({borders:noBorders,margins:{top:60,bottom:80,left:180,right:180},children:[p(certificationText[i]),new Paragraph({spacing:{before:240,after:0,line:200,lineRule:LineRuleType.EXACT},alignment:AlignmentType.CENTER,children:[new TextRun({text:form.signatories[i].name,bold:true,size:16})]}),p(form.signatories[i].title,false,true)]}))})) }));
    }
  });
  return Packer.toBuffer(new Document({ creator:"LDSS Scholarship Monitor", title:`${draft?'Draft ':''}Payroll - Batch ${form.batchNumber}`, styles:{default:{document:{run:{font:"Arial",size:17},paragraph:{spacing:{after:0}}}}},sections:[{properties:{page:{size:{width:12240,height:18720,orientation:PageOrientation.LANDSCAPE},margin:{top:2440,bottom:650,left:720,right:720,header:300,footer:300}}},headers:{default:header},footers:{default:footer},children}] }));
}
