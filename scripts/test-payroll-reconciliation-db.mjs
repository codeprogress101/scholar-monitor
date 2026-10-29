import {spawn} from 'node:child_process';
for(const extra of [[],['--p03-override']]){
 const code=await new Promise((done,reject)=>{const child=spawn(process.execPath,['--expose-gc','--import','tsx','scripts/test-eligibility-db.ts','--main-payroll','--payment-recording','--payroll-reconciliation',...extra],{stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',done);});
 if(code!==0){process.exitCode=1;break;}
}
