import type {RowDataPacket} from 'mysql2/promise';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {session} from './uat-session.js';
import {folder,save} from './uat-environment.mjs';
const c=await session('B'),results:{file:string;format:string;worksheets?:number;formulas?:number;all835IdsExactlyOnce?:boolean;validOoxml?:boolean;draftMarking?:boolean;officialApproval?:boolean}[]=[];
try {
 const [ids]=await c.admin.query<RowDataPacket[]>('SELECT i.human_id FROM payroll_allocations p JOIN scholarship_records r ON r.id=p.scholarship_id JOIN scholar_identifiers i ON i.scholar_id=r.scholar_id WHERE p.batch_id=?',[c.metadata.batchId]);assert.equal(ids.length,835);
 for(const file of await readdir(folder+'/exports')) {
  if(file.endsWith('.xlsx')) {
   const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await readFile(folder+'/exports/'+file) as unknown as ExcelJS.Buffer);const values:string[]=[];let formulas=0;
   workbook.eachSheet(sheet=>sheet.eachRow(row=>row.eachCell(cell=>{if(cell.type===ExcelJS.ValueType.Formula)formulas++;values.push(String(cell.value??''));})));assert.equal(formulas,0);
   if(file==='B-provisional.xlsx')for(const {human_id} of ids)assert.equal(values.filter(v=>v===human_id).length,1,human_id);
   results.push({file,format:'xlsx',worksheets:workbook.worksheets.length,formulas,all835IdsExactlyOnce:file==='B-provisional.xlsx'?true:undefined});
  }
  if(file.endsWith('.docx')) {
   const zip=await JSZip.loadAsync(await readFile(folder+'/exports/'+file));assert.ok(zip.file('[Content_Types].xml'));assert.ok(zip.file('word/document.xml'));
   const xml=(await Promise.all(Object.values(zip.files).filter(f=>/^word\/.*\.xml$/.test(f.name)).map(f=>f.async('string')))).join('\n');
   assert.ok(xml.includes('DRAFT'),'Prototype must retain draft marking');assert.ok(!xml.includes('vbaProject'));
   results.push({file,format:'docx',validOoxml:true,draftMarking:true,officialApproval:false});
  }
 }
 await save(folder+'/export-structure-verification.json',{at:new Date().toISOString(),results});console.log(JSON.stringify({workbooks:results.filter(r=>r.format==='xlsx').length,documents:results.filter(r=>r.format==='docx').length,standard835IdsExactlyOnce:true}));
}finally{await c.close();}
