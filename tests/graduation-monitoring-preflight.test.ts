import {describe,it,expect} from 'vitest';
import {preflightGraduationMonitoring} from '../scripts/graduation-monitoring-preflight.mjs';
import {hostname} from 'node:os';
const owned=`ldss_graduation_test_${process.pid}_1234abcd`;
const db=(name:string,partial=false,populated=false)=>({query:async(sql:string)=>{
 if(sql.includes('DATABASE() name'))return [[{name,hostname:hostname(),port:3306}]];
 if(sql.includes('information_schema.TABLES'))return [partial?[{name:'graduation_commands'}]:[]];
 if(sql.includes('COUNT(*) n FROM scholars'))return [[{n:populated?1000:0}]];
 if(sql.includes('FROM permissions'))return [[]];throw new Error('Unexpected query');
}});
describe('F54 owned-target/recovery boundary',()=>{
 it.each(['ldss_primary_test_12676_61497616','ldss_scholar_monitor_dev','ldss_hmulti_test_33804_f28b9d67'])('rejects retained target %s',async name=>{await expect(preflightGraduationMonitoring(db(name))).rejects.toThrow(/PID-owned/);});
 it('allows a fresh owned regression and requires fresh populated recovery proof',async()=>{await expect(preflightGraduationMonitoring(db(owned))).resolves.toMatchObject({verified:true,populatedRecovery:false});await expect(preflightGraduationMonitoring(db(owned,false,true))).rejects.toThrow(/recovery proof/);});
 it('stops unexplained partial DDL before any retry',async()=>{await expect(preflightGraduationMonitoring(db(owned,true))).rejects.toThrow(/Partial F54/);});
 it('does not admit a primary target with a missing or differently scoped AP5 proof',async()=>{await expect(preflightGraduationMonitoring(db('ldss_primary_test_12676_61497616'),{authorization:'OTHER'})).rejects.toThrow(/PID-owned/);await expect(preflightGraduationMonitoring(db('ldss_scholar_monitor_dev'),{authorization:'A6_2_AP5_PRIMARY_20261024',database:'ldss_scholar_monitor_dev'})).rejects.toThrow();});
});
