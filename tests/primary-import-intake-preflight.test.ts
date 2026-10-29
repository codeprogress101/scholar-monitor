import {describe,it,expect} from 'vitest';
import {preflightPrimaryImportBindings} from '../scripts/primary-import-intake-preflight.mjs';
describe('A2.1 AP1 primary scope',()=>{
 it('rejects an absent or unrelated authorization before any database access',async()=>{const db={query:()=>{throw Error('Must not access a target');}};for(const proof of [undefined,{authorization:'A6_2_AP5_PRIMARY_20261024'},{authorization:'A2_1_ISOLATED_20261025'}])await expect(preflightPrimaryImportBindings(db,proof)).rejects.toThrow();});
 it('rejects a different schema/runtime even with the correct operation label',async()=>{const db={query:()=>{throw Error('Must not access a target');}};for(const change of [{database:'ldss_scholar_monitor_dev'},{runtimeUser:'ldss_monitor_local'}])await expect(preflightPrimaryImportBindings(db,{authorization:'A2_1_AP1_PRIMARY_20261025',database:'ldss_primary_test_12676_61497616',runtimeUser:'ldss_primary_12676_61497616',pid:process.pid,...change})).rejects.toThrow();});
 it('rejects a proof from another process',async()=>{await expect(preflightPrimaryImportBindings({query:()=>{throw Error('Must not access');}},{authorization:'A2_1_AP1_PRIMARY_20261025',database:'ldss_primary_test_12676_61497616',runtimeUser:'ldss_primary_12676_61497616',pid:process.pid+1})).rejects.toThrow();});
});
