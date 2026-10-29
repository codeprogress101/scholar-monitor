import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const folder='output/populated-uat-20261024',files=['output/main-payroll/synthetic-official-payroll.html','output/main-payroll/synthetic-draft-payroll.html','output/main-payroll/synthetic-official-payroll.docx'];
const sha=v=>createHash('sha256').update(v).digest('hex');
if(process.argv[2]==='before') {
 await mkdir(folder+'/previous-fixture-artifacts',{recursive:true});const rows=[];
 for(const [i,file] of files.entries()){try{const b=await readFile(file),copy=folder+'/previous-fixture-artifacts/'+i;await writeFile(copy,b,{flag:'wx'});rows.push({file,copy,sha256:sha(b)});}catch(e){if(e.code!=='ENOENT')throw e;}}
 await writeFile(folder+'/previous-fixture-artifacts.json',JSON.stringify(rows,null,2));
}else {
 const rows=JSON.parse(await readFile(folder+'/previous-fixture-artifacts.json','utf8'));
 for(const row of rows){const b=await readFile(row.copy);assert.equal(sha(b),row.sha256);await writeFile(row.file,b);assert.equal(sha(await readFile(row.file)),row.sha256);}
 console.log(JSON.stringify({restoredExact:rows.length}));
}
