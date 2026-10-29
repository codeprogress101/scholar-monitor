import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function resumePriorBatch(...args:Parameters<typeof import('./test-prior-batch-scenarios.js').testPriorBatchApproval>) {
 let source=await readFile('scripts/test-prior-batch-scenarios.ts','utf8');
 const start=source.indexOf(' const master=');const end=source.indexOf(' console.log(`Prior-batch fixture:',start);assert.ok(start>0&&end>start);
 source=source.slice(0,start)+" const [[existingPublication]]=await pool.query<RowDataPacket[]>(\"SELECT COUNT(*) n FROM masterlist_publications WHERE JSON_LENGTH(snapshot,'$.entries')=835\");\n if(!Number(existingPublication.n)){\n"+source.slice(start,end)+' }\n'+source.slice(end);
 source=source.replaceAll('from "../server/','from "../../../server/').replaceAll('import("./','import("../../../scripts/').replaceAll("import('./","import('../../../scripts/");
 const file='output/populated-uat-20261024/private/prior-batch-resume.ts';await writeFile(file,source);
 const adapter=await import('../'+file);return adapter.testPriorBatchApproval(...args);
}
