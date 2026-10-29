import {mkdir,copyFile} from 'node:fs/promises';
const target=new URL('../dist/server/payments/report-assets/',import.meta.url);
await mkdir(target,{recursive:true});
for(const file of ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','OFL.txt'])await copyFile(new URL('../server/payments/report-assets/'+file,import.meta.url),new URL(file,target));
