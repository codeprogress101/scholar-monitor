import {describe,it,expect} from 'vitest';
import {fingerprint,canonical} from '../server/graduation/commands';
import {loadConfig} from '../server/config';
import {authorizedMonitoringQuery} from '../server/graduation/monitoring-source';
describe('graduation exact-command isolation',()=>{
 it('canonicalizes object order but preserves material arrays, nulls and source codes',()=>{expect(fingerprint({input:{b:2,a:null},operation:'duration.create'})).toBe(fingerprint({operation:'duration.create',input:{a:null,b:2}}));expect(fingerprint({code:'C1'})).not.toBe(fingerprint({code:'c1'}));expect(canonical([2,1])).toEqual([2,1]);});
 it('keeps the new write gate default off without changing financial defaults',()=>{const config=loadConfig({});expect(config.GRADUATION_MONITORING_WRITES_ENABLED).toBeUndefined();expect(config.HISTORICAL_MULTIBATCH_ENABLED).toBeUndefined();expect(config.INDIVIDUAL_PAYMENTS_ENABLED).toBeUndefined();});
 it('keeps filter, ordering and limit on the outer SELECT while preserving regex dollars literally',()=>{const sql="WITH monitoring AS (SELECT '^[a-f-]{36}$' pattern)";const result=authorizedMonitoringQuery(sql,'SELECT * FROM monitoring WHERE pattern=? ORDER BY pattern LIMIT ? OFFSET ?');expect(result).toBe("SELECT * FROM ("+sql+' SELECT * FROM monitoring) graduation_projection WHERE pattern=? ORDER BY pattern LIMIT ? OFFSET ?');});
});
