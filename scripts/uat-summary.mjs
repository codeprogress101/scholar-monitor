import {readFile,writeFile} from 'node:fs/promises';
const folder='output/populated-uat-20261024',read=async f=>JSON.parse(await readFile(folder+'/'+f,'utf8'));
const rows=[];
for(const scenario of ['A','B','C','D','E','F']) {
 const meta=await read(scenario+'.json'),v=await read('verification-'+scenario+'.json');
 rows.push({scenario,database:v.database,runtimeUser:meta.runtimeUser,state:meta.state,scholars:v.scholars.total,uniqueIds:v.scholars.uniquePermanentIds,tableCount:v.tables.length,migrations:v.migrations.count,foreignKeys:v.integrity.foreignKeys,allocatedBytes:v.allocatedBytes,recording:v.recording??null,settlement:v.settlement,masterlists:v.masterlists});
}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const benchmark=[];
for(const file of ['benchmark.json','benchmark-pending.json']){
 const data=await read(file);for(const name of new Set(data.runs.map(r=>r.name))){const r=data.runs.filter(r=>r.name===name);benchmark.push({fixture:file.includes('pending')?'A Pending':'B Completed',name,samples:r.length,medianMs:median(r.map(s=>s.ms)),selects:[...new Set(r.map(s=>s.selects))],maxRssMiB:Math.max(...r.map(s=>s.sampledRss??s.sampledRssMax??s.after?.rss??0))/1048576,bytes:r[0].bytes});}
}
await writeFile(folder+'/summary.json',JSON.stringify({at:new Date().toISOString(),rows,benchmark},null,2));
console.log(JSON.stringify({rows,benchmark},null,2));
