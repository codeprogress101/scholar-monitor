import {spawn} from 'node:child_process';
for(const mode of [[],['--settlement-races']]){
 const child=spawn(process.execPath,['--expose-gc','--import','tsx','scripts/test-eligibility-db.ts','--main-payroll','--payment-recording','--individual-payments','--browser-release','--individual-settlement',...mode],{stdio:'inherit',windowsHide:true});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});if(code!==0){process.exitCode=code??1;break;}
}
