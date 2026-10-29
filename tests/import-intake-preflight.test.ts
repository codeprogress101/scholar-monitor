import {describe,it,expect} from 'vitest';
import {preflightImportBindings} from '../scripts/import-intake-preflight.mjs';
import {hostname} from 'node:os';
const db=(name:string,partial=false,count=0)=>({query:async(sql:string)=>[sql.includes('DATABASE() name')?[{name,hostname:hostname(),port:3306}]:sql.includes('information_schema.TABLES')?(partial?[{TABLE_NAME:'import_intake_bindings'}]:[]):[{n:count}],[]]});
describe('F55 owned-target preflight',()=>{
 it('rejects primary, original, reference and wrong-process schemas',async()=>{for(const name of ['ldss_primary_test_12676_61497616','ldss_scholar_monitor_dev','ldss_hmulti_test_33804_f28b9d67',`ldss_import_test_${process.pid+1}_1234abcd`])await expect(preflightImportBindings(db(name))).rejects.toThrow(/PID-owned/);});
 it('accepts only a fresh current-process schema',async()=>{expect((await preflightImportBindings(db(`ldss_import_test_${process.pid}_1234abcd`))).verified).toBe(true);});
 it('stops on partial DDL or populated schemas without fresh recovery',async()=>{const name=`ldss_import_test_${process.pid}_1234abcd`;await expect(preflightImportBindings(db(name,true))).rejects.toThrow(/Partial/);await expect(preflightImportBindings(db(name,false,1))).rejects.toThrow(/checkpoint/);});
});
