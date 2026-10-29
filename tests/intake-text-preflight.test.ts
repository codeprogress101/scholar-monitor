import {describe,it,expect} from 'vitest';
import {hostname} from 'node:os';
import {preflightIntakeText} from '../scripts/intake-text-preflight.mjs';
const db=(name:string,populated=false,host=hostname())=>({query:async(sql:string)=>sql.includes('DATABASE()')?[[{name,hostname:host,port:3306}]]:sql.includes('COUNT')?[[{n:populated?1:0}]]:sql.includes('information_schema.TABLES')?[[{TABLE_NAME:'scholar_intake_text_events'}]]:[[]]});
describe('F56 target and partial-DDL guard',()=>{
 it('rejects primary, original and retained targets even when empty',async()=>{for(const name of ['ldss_primary_test_12676_61497616',`ldss_primary_test_${process.pid}_abcdef12`,'ldss_scholar_monitor_dev','ldss_registry_ui_test_41756_ded913bd'])await expect(preflightIntakeText(db(name))).rejects.toThrow();});
 it('requires fresh recovery for populated candidate copies and rejects wrong hosts',async()=>{await expect(preflightIntakeText(db(`ldss_intake_text_test_${process.pid}_abcdef12`,true))).rejects.toThrow(/recovery/);await expect(preflightIntakeText(db(`ldss_text_test_${process.pid}_abcdef12`,false,'other-host'))).rejects.toThrow();});
 it('stops a PID-owned empty schema with a committed DDL prefix',async()=>expect(preflightIntakeText(db(`ldss_text_test_${process.pid}_abcdef12`))).rejects.toThrow(/Partial F56/));
});
