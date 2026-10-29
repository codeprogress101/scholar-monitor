import {describe,it,expect,vi,afterEach} from 'vitest';
import {preflightAnnualIntakes} from '../scripts/annual-intake-preflight.mjs';
const proof={authorization:'A1_A5_LOCALHOST_5173_20261024',database:'ldss_scholar_monitor_dev',runtimeIdentity:'ldss_monitor_local@localhost',verified:true,temporaryRestoreRemoved:true};
afterEach(()=>vi.unstubAllEnvs());
describe('F53 target and recovery authorization',()=>{
 it('does not implicitly admit the configured development database',async()=>{
  const query=vi.fn(async()=>[[{name:'ldss_scholar_monitor_dev'}]]);
  await expect(preflightAnnualIntakes({query})).rejects.toThrow(/explicit verified 5173/);expect(query).toHaveBeenCalledTimes(1);
 });
 it('retains default ownership/compatibility checks for new disposable schemas',async()=>{
  const query=async(sql:string)=>{
   if(sql==='SELECT DATABASE() name')return [[{name:`ldss_regression_test_${process.pid}_1234abcd`}]];
   if(sql.includes('TRIGGER_NAME'))return [[{name:'scholar_intakes_no_update'},{name:'scholar_intakes_no_delete'}]];
   if(sql.startsWith('SELECT scholar_id'))return [[]];
   return [[{n:0}]];
  };
  await expect(preflightAnnualIntakes({query})).resolves.toMatchObject({compatible:true,intakes:0});
 });
 it.each([{authorization:'force'},{database:'ldss_other_uat'},{runtimeIdentity:'root@localhost'},{verified:false},{temporaryRestoreRemoved:false}])('rejects a mismatched or incomplete review %j',async patch=>{
  const query=vi.fn(async()=>[[{name:'ldss_scholar_monitor_dev'}]]);
  await expect(preflightAnnualIntakes({query},{...proof,...patch})).rejects.toThrow();expect(query).toHaveBeenCalledTimes(1);
 });
 it('rejects a review on a different server before reading recovery evidence or issuing DDL',async()=>{
  vi.stubEnv('APP_ENV','development');vi.stubEnv('DB_NAME','ldss_scholar_monitor_dev');vi.stubEnv('DB_HOST','127.0.0.1');
  const query=vi.fn(async(sql:string)=>sql==='SELECT DATABASE() name'?[[{name:'ldss_scholar_monitor_dev'}]]:[[{name:'ldss_scholar_monitor_dev',hostname:'unapproved-server',port:3306}]]);
  await expect(preflightAnnualIntakes({query},proof)).rejects.toThrow();expect(query).toHaveBeenCalledTimes(2);
 });
});
