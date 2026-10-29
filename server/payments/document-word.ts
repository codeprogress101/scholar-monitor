import {AlignmentType,BorderStyle,Document,Footer,Header,HeightRule,ImageRun,Packer,Paragraph,Table,TableCell,TableLayoutType,TableRow,TextRun,VerticalAlign,WidthType} from 'docx';
import {digest} from '../auth/crypto.js';
import {daetLogo,ldssLogo} from '../ovr/payroll-assets.js';
import {maogmangLogo} from './document-brand.js';
import {prototypeTemplateHash} from './document-template-fingerprint.js';
import {documentMoney,pesoWords,type DocumentFields,type DocumentKind,type DocumentSource,type TemplateInfo} from './document-model.js';

export interface IndividualDocumentRenderer{
 readonly version:string;
 templates(source:'unclaimed'|'omitted'):TemplateInfo[];
 render(source:DocumentSource,fields:DocumentFields,templates:TemplateInfo[]):Promise<{kind:DocumentKind;content:Buffer}[]>;
}
const version='daet-individual-draft/v1',width=10800;
const draft='DRAFT - FOR SCHOLARSHIP OFFICE REVIEW - NOT AN APPROVED PAYMENT FORM';
const thin={style:BorderStyle.SINGLE,size:6,color:'000000'},none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
const noBorders={top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none};
const asset={seal:Buffer.from(daetLogo,'base64'),ldss:Buffer.from(ldssLogo,'base64'),maogmang:Buffer.from(maogmangLogo,'base64')};
const spec={page:{width:12240,height:15840,margin:720},font:'Arial',bodyHalfPoints:19,titleHalfPoints:24,border:'blue outer / black cell grid',mapping:'individual-stipend/v1',allowedFields:['payee','office','address','additionalExplanation'],draft,
 provenance:'User-supplied DV.pub and OBR.pub, inspected read-only in Publisher on 22 October 2026; earlier supplied screenshots. Samples are payroll-level references, not approved individual-payment forms.'};
export function prototypeTemplate(kind:DocumentKind):TemplateInfo{return {kind,version,status:'draft',provenance:spec.provenance,contentHash:digest(JSON.stringify({prototypeTemplateHash,kind,spec})),allowedFields:spec.allowedFields,mapping:spec.mapping,assumptions:'Letter portrait confirmed from both Publisher files; Word table reconstruction, Arial typography and spacing are prototype adaptations. Sample payees, officials and accounting entries are not defaults.'};}
function p(text:string,bold=false,align:'left'|'center'|'right'='left',size=19,keepNext=false){return new Paragraph({alignment:align,keepNext:keepNext?true:undefined,spacing:{before:0,after:20,line:210},children:text.split('\n').map((line,index)=>new TextRun({text:line,break:index?1:0,bold:bold?true:undefined,font:'Arial',size,color:'000000'}))});}
type Cell={text?:string;width:number;span?:number;rowSpan?:number;bold?:boolean;align?:'left'|'center'|'right';children?:(Paragraph|Table)[];keepNext?:boolean};
function cell(c:Cell){return new TableCell({width:{size:c.width,type:WidthType.DXA},columnSpan:c.span,rowSpan:c.rowSpan,verticalAlign:VerticalAlign.CENTER,margins:{top:20,bottom:20,left:90,right:90},borders:{top:thin,bottom:thin,left:thin,right:thin},children:c.children??[p(c.text??'',c.bold,c.align,19,c.keepNext)]});}
function table(widths:number[],rows:{cells:Cell[];height?:number;header?:boolean}[]){return new Table({width:{size:width,type:WidthType.DXA},columnWidths:widths,layout:TableLayoutType.FIXED,rows:rows.map(row=>new TableRow({cantSplit:true,tableHeader:row.header,height:row.height?{value:row.height,rule:HeightRule.ATLEAST}:undefined,children:row.cells.map(cell)}))});}
const pair=(left:string,right:string,height=340)=>({cells:[{text:left,width:5400},{text:right,width:5400}],height});
function explanation(source:DocumentSource,fields:DocumentFields){return `Individual scholarship stipend for ${source.name} (${source.humanId}), ${source.semester}, ${source.academicYear}, under the LGU Daet Scholarship Program. Approved amount: PHP ${documentMoney(source.amountCentavos)} (${pesoWords(source.amountCentavos)}).\nPurpose: ${source.sourceKind==='unclaimed'?'Processing of the Unclaimed stipend from the original payroll.':'Coordinator-authorized processing of an eligible scholar omitted from the original payroll.'}${fields.additionalExplanation?'\n'+fields.additionalExplanation:''}`;}
function signatories(kind:DocumentKind){
 const certification=kind==='OR'?table([5400,5400],[{cells:[{text:'A. Certified',width:5400,keepNext:true},{text:'B. Certified',width:5400,keepNext:true}],height:300},
 {cells:[{text:'☐ Charges to appropriation/allotment necessary, lawful and under my direct supervision\n\n☐ Supporting documents valid, proper and legal',width:5400,keepNext:true},{text:'Existence to available appropriation',width:5400,align:'center',keepNext:true}],height:1100}]):table([5400,5400],[{cells:[{text:'A. Certified',width:5400,keepNext:true},{text:'B. Certified',width:5400,keepNext:true}],height:300},
 {cells:[{text:'☐ Allotment obligated for the purpose as indicated above\n\n☐ Supporting documents complete',width:5400,keepNext:true},{text:'Funds Available',width:5400,align:'center',keepNext:true}],height:900}]);
 const signatures=table([1400,4000,1400,4000],[
 {cells:[{text:'Signature',width:1400,keepNext:true},{width:4000,keepNext:true},{text:'Signature',width:1400,keepNext:true},{width:4000,keepNext:true}],height:300},
 {cells:[{text:'Printed Name',width:1400,keepNext:true},{width:4000,keepNext:true},{text:'Printed Name',width:1400,keepNext:true},{width:4000,keepNext:true}],height:350},
 {cells:[{text:'Position',width:1400,keepNext:true},{width:4000,keepNext:true},{text:'Position',width:1400,keepNext:true},{width:4000,keepNext:true}],height:400},
 {cells:[{text:'Date',width:1400},{width:4000},{text:'Date',width:1400},{width:4000}],height:350}]);
 return [certification,signatures];
}
function receivedPayment(){const received=new Table({width:{size:5220,type:WidthType.DXA},columnWidths:[1700,2100,1420],layout:TableLayoutType.FIXED,rows:[
 new TableRow({cantSplit:true,children:[cell({text:'Check No.',width:1700}),cell({text:'Bank Name',width:2100}),cell({text:'Date',width:1420})]}),
 new TableRow({cantSplit:true,height:{value:420,rule:HeightRule.ATLEAST},children:[cell({width:1700}),cell({width:2100}),cell({width:1420})]}),
 new TableRow({cantSplit:true,children:[cell({text:'Signature',width:1700}),cell({width:2100}),cell({text:'Date',width:1420})]}),
 new TableRow({cantSplit:true,height:{value:450,rule:HeightRule.ATLEAST},children:[cell({text:'Printed Name',width:1700}),cell({width:2100}),cell({width:1420})]})]});
 return table([5400,5400],[{...pair('C. Approved for Payment','D. Received Payment',320),cells:[{text:'C. Approved for Payment',width:5400,bold:true,keepNext:true},{text:'D. Received Payment',width:5400,bold:true,keepNext:true}]},
 {cells:[{width:5400,children:[p('Signature'),p(''),p('Printed Name'),p(''),p('Position')]},{width:5400,children:[received,p('',false,'left',1)]}]}]);}
function body(kind:DocumentKind,source:DocumentSource,fields:DocumentFields):(Paragraph|Table)[]{
 const title=table([8400,2400],[{cells:[{text:kind==='OR'?'OBLIGATION REQUEST':'DISBURSEMENT VOUCHER',width:8400,bold:true,align:'center'},{text:'No.',width:2400,bold:true}],height:400},{cells:[{width:8400},{width:2400}],height:280}]);
 if(kind==='OR')return [title,table([2000,8800],['PAYEE','OFFICE','ADDRESS'].map((label,index)=>({cells:[{text:label,width:2000,bold:true,align:'center'},{text:[fields.payee,fields.office,fields.address][index],width:8800}],height:340}))),
 table([1800,5100,1050,1250,1600],[{cells:[{text:'RESPONSIBILITY\nCENTER',width:1800,bold:true,align:'center'},{text:'PARTICULARS',width:5100,bold:true,align:'center'},{text:'F.P.P.',width:1050,align:'center'},{text:'Account\nCode',width:1250,align:'center'},{text:'Amount',width:1600,align:'center'}],height:600},
 {cells:[{text:explanation(source,fields),width:6900,span:2},{width:1050},{width:1250},{text:documentMoney(source.amountCentavos),width:1600,bold:true,align:'center'}],height:4500},
 {cells:[{text:'TOTAL    '+pesoWords(source.amountCentavos),width:9200,span:4,bold:true},{text:documentMoney(source.amountCentavos),width:1600,bold:true,align:'right'}],height:350}]),...signatories('OR')];
 return [title,table([1700,9100],[{cells:[{text:'Mode of Payment',width:1700,bold:true},{text:'☐ Check       ☐ Cash       ☐ Others',width:9100}],height:600}]),
 table([1700,4300,2400,2400],[{cells:[{text:'Payee',width:1700,bold:true,align:'center'},{text:fields.payee,width:4300,bold:true},{text:'TIN/employee No.\n',width:2400,align:'center'},{text:'Obligation Request No.\n',width:2400,align:'center'}],height:680},
 {cells:[{text:'Address',width:1700,bold:true,rowSpan:2},{text:fields.address,width:4300,rowSpan:2},{text:'Responsibility Center\n',width:4800,span:2,align:'center'}],height:400},
 {cells:[{text:'Office/Unit/Project\n'+fields.office,width:2400,align:'center'},{text:'Code\n',width:2400,align:'center'}],height:400}]),
 table([8400,2400],[{cells:[{text:'EXPLANATION',width:8400,align:'center'},{text:'AMOUNT',width:2400,align:'center'}],height:310},{cells:[{text:explanation(source,fields),width:8400},{text:documentMoney(source.amountCentavos),width:2400,bold:true,align:'center'}],height:2300}]),...signatories('DV'),receivedPayment()];
}
export async function renderIndividualWord(kind:DocumentKind,source:DocumentSource,fields:DocumentFields):Promise<Buffer>{
 const image=(bytes:Buffer,w:number,h:number)=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:0,before:0},children:[new ImageRun({type:'png',data:bytes,transformation:{width:w,height:h},altText:{name:'LGU Daet branding',title:'LGU Daet branding',description:'Existing municipality or scholarship program logo'}})]});
 const header=new Header({children:[p(draft,true,'center',16),new Table({width:{size:width,type:WidthType.DXA},columnWidths:[2500,1600,3300,1500,1900],borders:noBorders,layout:TableLayoutType.FIXED,rows:[new TableRow({children:[
 new TableCell({borders:noBorders,children:[p('')]}),new TableCell({borders:noBorders,verticalAlign:VerticalAlign.CENTER,children:[image(asset.seal,66,66)]}),new TableCell({borders:noBorders,verticalAlign:VerticalAlign.CENTER,children:[p('Republic of the Philippines',false,'center',19),p('Province of Camarines Norte',false,'center',19),p('MUNICIPALITY OF DAET',true,'center',19)]}),new TableCell({borders:noBorders,verticalAlign:VerticalAlign.CENTER,children:[image(asset.ldss,64,61.12)]}),new TableCell({borders:noBorders,verticalAlign:VerticalAlign.TOP,children:[image(asset.maogmang,95,50.5875)]})]})]})]});
 const footer=new Footer({children:[p(draft,true,'center',16),p(`LDSS internal reference: ${source.reference} | Source payroll: ${source.batchCode}`,false,'center',13)]});
 const border={style:BorderStyle.SINGLE,size:12,color:'254E83',space:16};
 return Packer.toBuffer(new Document({creator:'LDSS Scholarship Monitor',title:`Draft ${kind==='OR'?'Obligation Request':'Disbursement Voucher'} - Individual Scholarship Stipend`,description:'Draft prototype pending Scholarship Office approval; not an approved payment form.',styles:{default:{document:{run:{font:'Arial',size:19,color:'000000'},paragraph:{spacing:{before:0,after:0}}}}},sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:2350,bottom:1050,left:720,right:720,header:500,footer:400},borders:{pageBorderTop:border,pageBorderBottom:border,pageBorderLeft:border,pageBorderRight:border}}},headers:{default:header},footers:{default:footer},children:body(kind,source,fields)}]}));
}
export const prototypeDocuments:IndividualDocumentRenderer={version,templates:source=>(source==='omitted'?['OR','DV']:['DV']).map(kind=>prototypeTemplate(kind as DocumentKind)),render:async(source,fields,templates)=>Promise.all(templates.map(async template=>({kind:template.kind,content:await renderIndividualWord(template.kind,source,fields)})))};
