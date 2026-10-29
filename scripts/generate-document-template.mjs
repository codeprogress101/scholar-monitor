import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const files=['server/payments/document-word.ts','server/payments/document-model.ts','server/payments/document-brand.ts','server/ovr/payroll-assets.ts'];
const docx=JSON.parse(await readFile(new URL('../node_modules/docx/package.json',import.meta.url),'utf8'));
const hash=createHash('sha256').update('individual-documents/v1\n'+docx.version+'\n');
for(const file of files)hash.update(file+'\n').update(await readFile(new URL('../'+file,import.meta.url)));
await writeFile(new URL('../server/payments/document-template-fingerprint.ts',import.meta.url),'// Generated from the renderer, field mapping, DOCX version and branding.\nexport const prototypeTemplateHash = '+JSON.stringify(hash.digest('hex'))+';\n');
