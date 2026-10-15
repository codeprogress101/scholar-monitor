import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { payrollSignatories, payrollLayout, payrollPages, payrollYear, renderPayroll, type PayrollForm } from "../server/ovr/payroll-form";
import { renderPayrollWord } from "../server/ovr/payroll-word";
const makeForm = (count:number):PayrollForm => ({template:"daet-sample-v1",year:"2026-2027",term:1,batchNumber:2,signatories:payrollSignatories,rows:Array.from({length:count},(_,i)=>({scholarshipId:String(i),scholarId:String(i),humanId:`PRIVATE-ID-${i}`,awardNumber:`STORED-${i}`,lastName:'Surname',firstName:`Student ${i+1}`,middleName:"",school:"School & College",course:"Degree",yearLevel:2,amountCentavos:500000}))});
describe("payroll presentation and Word export",()=>{
  for(const count of [1,20,21,40,41]) it(`${count} students have continuous numbers, totals and one signature section`,async()=>{
    const form=makeForm(count),before=structuredClone(form),pages=payrollLayout(form),html=renderPayroll(form);
    expect(pages.length).toBe(Math.ceil(count/20));expect(pages.flatMap(p=>p.rows.map(r=>r.printedAwardNumber))).toEqual(Array.from({length:count},(_,i)=>i+1));
    expect(pages.every(p=>p.rows.length<=20 && p.total===p.rows.length*500000)).toBe(true);
    expect(html.match(/class="student"/g)).toHaveLength(count);expect(html.match(/class="signatories"/g)).toHaveLength(1);expect(html).not.toContain('STORED-');expect(html).not.toContain('PRIVATE-ID');
    expect(html).toContain(`Page ${pages.length} of ${pages.length}`);expect(html.match(/class="page-total"/g)).toHaveLength(pages.length);
    const zip=await JSZip.loadAsync(await renderPayrollWord(form));const xml=await zip.file('word/document.xml')!.async('string');const header=await zip.file('word/header1.xml')!.async('string');const footer=await zip.file('word/footer1.xml')!.async('string');
    expect(xml).not.toContain('STORED-');expect(xml.match(/ARIANNE ARIKA/g)).toHaveLength(1);expect(xml.match(/Page total/g)).toHaveLength(pages.length);expect(xml).toContain('w:w="18720"');expect(xml).toContain('w:h="12240"');expect(header).toContain('MUNICIPALITY OF DAET');expect(header.match(/<w:drawing>/g)).toHaveLength(2);expect(footer).toContain('PAGE');expect(footer).toContain('NUMPAGES');expect(form).toEqual(before);
  });
  it("retains reprocessing provenance without counting a second stipend",async()=>{
    const form=makeForm(21);for(const row of form.rows) row.reprocessingNote="Reprocessing from BATCH-001";
    const pages=payrollLayout(form);expect(pages.every(p=>p.rows.length<=20)).toBe(true);
    expect(pages.reduce((n,p)=>n+p.total,0)).toBe(21*500000);
    expect(pages.flatMap(p=>p.rows.map(r=>r.printedAwardNumber))).toEqual(Array.from({length:21},(_,i)=>i+1));
    expect(renderPayroll(form).match(/Reprocessing from BATCH-001/g)).toHaveLength(21);
    const zip=await JSZip.loadAsync(await renderPayrollWord(form));const xml=await zip.file("word/document.xml")!.async("string");
    expect(xml.match(/Reprocessing from BATCH-001/g)).toHaveLength(21);expect(xml).toContain("<w:br/>");
  });
  it("escapes names and marks both draft formats",async()=>{
    const form=makeForm(1);form.rows[0].lastName='<script>';
    expect(renderPayroll(form,true)).toContain('&lt;script&gt;');expect(renderPayroll(form,true)).toContain('NOT FOR PAYMENT');expect(renderPayroll(form)).not.toContain('NOT FOR PAYMENT');
    const zip=await JSZip.loadAsync(await renderPayrollWord(form,true));expect(await zip.file('word/header1.xml')!.async('string')).toContain('NOT FOR PAYMENT');expect(await zip.file('word/document.xml')!.async('string')).toContain('&lt;script&gt;');
  });
  it("reserves space for long names without changing stored rows",()=>{
    const form=makeForm(41);const long=form.rows.map(r=>({...r,lastName:"A very long surname needing several lines",school:"Synthetic University with a long formal school name"}));
    const pages=payrollPages(long);expect(pages.length).toBeGreaterThan(3);expect(pages.flat()).toEqual(long);expect(pages.every(p=>p.length<=20)).toBe(true);
  });
  it("maps recorded year levels without guessing unsupported values",()=>{
    for(const s of ["II","2","2nd year","Second year","Year 2"]) expect(payrollYear(s)).toBe(2);
    for(const s of ["Unknown","Graduate","6","Year 2 or 3"]) expect(payrollYear(s)).toBeNull();
  });
});
