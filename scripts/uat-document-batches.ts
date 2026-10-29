// Supply the coverage hash now required by the accepted recovery service.
// Keep the historical fixture's assertions intact in a task-local adapter.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function testDocumentBatches(...args:Parameters<typeof import('./test-document-batch-scenarios.js').testDocumentBatches>) {
 const source=await readFile('scripts/test-document-batch-scenarios.ts','utf8');
 const needle='expectedRecordCount: Number(owners.n),';
 assert.equal(source.split(needle).length-1,1);
 const replacement="expectedRecordCount: Number(owners.n), expectedCoverageHash: (await ok<any>(request('coordinator', setupPath+'?semesterId='+semesterId))).coverage.sourceHash,";
 const text=source.replace(needle,replacement).replaceAll('from "../server/','from "../../../server/');
 const file='output/populated-uat-20261024/private/document-batch-adapter.ts';await writeFile(file,text);
 const adapter=await import('../'+file);return adapter.testDocumentBatches(...args);
}
