import { daetLogo, ldssLogo } from "./payroll-assets.js";
export type PayrollRow = { reprocessingNote?: string; scholarshipId: string; scholarId: string; humanId: string; awardNumber: string; lastName: string; firstName: string; middleName: string; school: string; course: string; yearLevel: number; amountCentavos: number };
export const payrollSignatories = [
  { name: "ARIANNE ARIKA B. CARRANCEJA", title: "Chairman, Committee on Education" },
  { name: "ROSSANO C. VALENCIA", title: "Municipal Mayor" },
  { name: "RODANTE V. FORBES", title: "Municipal Treasurer" },
  { name: "WINDILIN H. BARBADO", title: "Disbursing Officer/Asst.Mun.Tres" },
];
export type PayrollForm = { signatoryRevision?: number; template: "daet-sample-v1"; year: string; term: number; batchNumber: number; rows: PayrollRow[]; signatories: typeof payrollSignatories };
export function payrollYear(value: string): number | null {
  const s = value.trim().toLowerCase().replace(/\s+/g, " ");
  const words = ["first", "second", "third", "fourth", "fifth"], roman = ["i", "ii", "iii", "iv", "v"];
  for (let n = 1; n <= 5; n++) if ([String(n), `${n}${["st", "nd", "rd", "th", "th"][n-1]}`, `year ${n}`, `${n} year`, `${n}${["st", "nd", "rd", "th", "th"][n-1]} year`, `${words[n-1]} year`, roman[n-1]].includes(s)) return n;
  return null;
}
const escape = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (n: number) => (n / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Reserve room for wrapped names and all four certification blocks. */
export function payrollPages(rows: PayrollRow[]) {
  const pages: PayrollRow[][] = [];
  let page: PayrollRow[] = [], lines = 0;
  for (const row of rows) {
    const cost = Math.max(1, ...[[[row.lastName, row.reprocessingNote].filter(Boolean).join(" "), 18], [row.firstName, 18], [row.middleName, 15], [row.school, 24]].map(([value, width]) => Math.ceil([...String(value)].reduce((sum, c) => sum + (/[MWmw@\u2e80-\uffff]/u.test(c) ? 2 : 1), 0) / Number(width))));
    if (page.length && (lines + cost > 20 || page.length === 20)) { pages.push(page); page = []; lines = 0; }
    page.push(row); lines += cost;
  }
  if (page.length) pages.push(page);
  return pages;
}
export function payrollLayout(form: PayrollForm) {
  let number = 0;
  return payrollPages(form.rows).map(rows => ({
    rows: rows.map(row => ({ ...row, printedAwardNumber: ++number })),
    total: rows.reduce((sum, row) => sum + row.amountCentavos, 0),
  }));
}
export const certificationText = [
  "CERTIFIED: Each person whose name appears on this roll is a grantee for LGU Scholarship program.",
  "APPROVED FOR PAYMENT:",
  "CERTIFIED: Each person whose name appears on this roll has been paid the amount stated opposite.",
  "CERTIFIED: Each person whose name appears on this roll has been paid the amount indicated opposite his/her name.",
];
export const payrollPeriod = (f: PayrollForm) => `${f.term === 1 ? "1ST" : "2ND"} SEMESTER AY ${f.year}`;
export const payrollMoney = money;
/** Presentation numbering never changes stored awards or frozen payment evidence. */
export function renderPayroll(form: PayrollForm, draft = false) {
  const groups = payrollLayout(form);
  const pages = groups.map(({ rows, total }, index) => `<section class="payroll-page">
    <header><img class="seal" alt="Municipality of Daet seal" src="data:image/png;base64,${daetLogo}"><img class="logo" alt="LGU Daet Scholars logo" src="data:image/png;base64,${ldssLogo}">Republic of the Philippines<br>Province of Camarines Norte<br><b>MUNICIPALITY OF DAET</b><h3>LGU DAET EXPANDED SCHOLARSHIP PROGRAM</h3>(Per Municipal Ordinance No. 327 Series of 2018)<br>MASTERLIST OF GRANTEES<br>${escape(payrollPeriod(form))} DEGREE COURSE<br>BATCH ${form.batchNumber}<h2>P A Y R O L L</h2>${draft ? '<aside>DRAFT — NOT FOR PAYMENT</aside>' : ''}</header>
<table class="roll"><colgroup><col style="width:6%"><col style="width:13%"><col style="width:13%"><col style="width:11%"><col style="width:17%">${'<col style="width:3%">'.repeat(5)}<col style="width:9%"><col style="width:16%"></colgroup><thead><tr><th rowspan="2">AWARD<br>NO</th><th colspan="3">NAME</th><th rowspan="2">SCHOOL</th><th colspan="5">CURRICULUM YEAR LEVEL</th><th rowspan="2">AMOUNT</th><th rowspan="2">SIGNATURE &amp;<br>DATE RECEIVED</th></tr><tr><th>LAST NAME</th><th>FIRST NAME</th><th>MIDDLE NAME</th>${['I','II','III','IV','V'].map(n=>`<th>${n}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="student"><td>${r.printedAwardNumber}</td><td>${escape(r.lastName)}${r.reprocessingNote ? `<br><small>${escape(r.reprocessingNote)}</small>` : ""}</td><td>${escape(r.firstName)}</td><td>${escape(r.middleName)}</td><td>${escape(r.school)}</td>${[1,2,3,4,5].map(n=>`<td class="year">${n===r.yearLevel?'✓':''}</td>`).join('')}<td class="amount">${money(r.amountCentavos)}</td><td></td></tr>`).join('')}<tr class="page-total"><td></td><td colspan="9">Page total — ${rows.length} ${rows.length===1?'student':'students'}</td><td class="amount">${money(total)}</td><td></td></tr></tbody></table>
${index===groups.length-1?`<div class="signatories">${form.signatories.map((s,i)=>`<div class="certification"><p>${escape(certificationText[i])}</p><div class="signature"><strong>${escape(s.name)}</strong><br>${escape(s.title)}</div></div>`).join('')}</div>`:''}
<footer>${escape(payrollPeriod(form))} / Batch ${form.batchNumber}<span>Page ${index+1} of ${groups.length}</span></footer></section>`);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${draft?'Draft ':''}Payroll - Batch ${form.batchNumber}</title><style>
@page{size:13in 8.5in;margin:.4in .5in}*{box-sizing:border-box}body{font:9pt Arial;margin:0;color:#000;background:white}.payroll-page{width:12in;min-height:7.7in;position:relative;padding-bottom:22pt;break-after:page}.payroll-page:last-child{break-after:auto}header{position:relative;text-align:center;line-height:1.05;font-size:8pt;min-height:92pt;padding-bottom:5pt}header img{position:absolute;top:3pt;object-fit:contain;height:55pt;width:55pt}header .seal{left:26%}header .logo{right:26%}h3{font-size:10pt;margin:3pt 0}h2{font-size:12pt;margin:4pt 0}aside{position:absolute;left:0;top:0;max-width:160pt;text-align:left;font-weight:bold;color:#a00;font-size:9pt}table{border-collapse:collapse;width:100%;table-layout:fixed}.roll th,.roll td{border:1px solid #000;padding:2pt;overflow-wrap:anywhere}.roll th{font-size:7pt}.roll td{height:14pt;padding:1pt 2pt;font-size:8.5pt;line-height:10pt}.roll tr{break-inside:avoid}.year{text-align:center}.amount{text-align:right}.page-total{font-weight:bold}.page-total td{border:0;border-top:1px solid #000;padding-top:4pt}.signatories{display:grid;grid-template-columns:1fr 1fr;gap:6pt 24pt;margin-top:6pt;break-inside:avoid;font-size:8pt;line-height:9pt}.certification p{margin:0;min-height:18pt}.signature{text-align:center;margin-top:12pt}.certification{border:0}footer{position:absolute;bottom:0;left:0;right:0;font-size:8pt}footer span{float:right}@media screen{body{background:#ddd;padding:20px}.payroll-page{background:white;margin:0 auto 20px;padding:12px 12px 30px;width:13in;min-height:8.5in}footer{left:12px;right:12px;bottom:10px}}@media print{.payroll-page{width:auto}}
</style>${pages.join('')}</html>`;
}
