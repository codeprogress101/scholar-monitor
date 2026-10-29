import type {RowDataPacket} from 'mysql2/promise';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {session} from './uat-session.js';
import {folder,save} from './uat-environment.mjs';
const scenario=process.argv[2],c=await session(scenario);
const ident=(s:string)=>{assert.match(s,/^[a-zA-Z0-9_]+$/);return '`'+s+'`';};
try {
 const report:Record<string,unknown>&{tables?:{name:string;count:number}[];authorization?:object[]}={at:new Date().toISOString(),database:c.database,scenario,syntheticOnly:true};
 const [migrations]=await c.admin.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations ORDER BY version');
 const names=(await readdir('db/migrations')).filter(n=>/^\d{14}_f\d{2}_[a-z_]+\.sql$/.test(n)).sort();assert.equal(migrations.length,names.length);
 for(const row of migrations)assert.equal(row.checksum,createHash('sha256').update(await readFile('db/migrations/'+row.version)).digest('hex'));
 report.migrations={count:names.length,allChecksumsMatch:true};
 const [[checks]]=await c.admin.query<RowDataPacket[]>('SELECT @@foreign_key_checks fk,@@check_constraint_checks ck');assert.equal(Number(checks.fk),1);assert.equal(Number(checks.ck),1);
 const [fks]=await c.admin.query<RowDataPacket[]>("SELECT TABLE_NAME t,CONSTRAINT_NAME c,COLUMN_NAME col,REFERENCED_TABLE_NAME parent,REFERENCED_COLUMN_NAME parent_col,ORDINAL_POSITION pos FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY t,c,pos");
 const groups=new Map<string,RowDataPacket[]>();for(const fk of fks){const key=fk.t+'/'+fk.c;if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(fk);}
 const integrity=[];
 for(const [constraint,cols] of groups) {
  const f=cols[0],join=cols.map(k=>`p.${ident(k.parent_col)}=c.${ident(k.col)}`).join(' AND '),nonnull=cols.map(k=>`c.${ident(k.col)} IS NOT NULL`).join(' AND ');
  const [[r]]=await c.admin.query<RowDataPacket[]>(`SELECT COUNT(*) n FROM ${ident(f.t)} c WHERE ${nonnull} AND NOT EXISTS(SELECT 1 FROM ${ident(f.parent)} p WHERE ${join})`);assert.equal(Number(r.n),0,constraint);integrity.push(constraint);
 }
 report.integrity={foreignKeys:groups.size,orphans:0,foreignKeyAndCheckEnforcement:true};
 const [tables]=await c.admin.query<RowDataPacket[]>("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
 report.tables=[];for(const {name} of tables){const [[r]]=await c.admin.query<RowDataPacket[]>(`SELECT COUNT(*) n FROM ${ident(name)}`);report.tables.push({name,count:Number(r.n)});}
 const [[people]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM scholars');const [[ids]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n,COUNT(DISTINCT human_id) distinct_ids FROM scholar_identifiers');assert.equal(people.n,ids.n);assert.equal(ids.n,ids.distinct_ids);report.scholars={total:Number(people.n),uniquePermanentIds:Number(ids.distinct_ids)};
 const [years]=await c.admin.query<RowDataPacket[]>('SELECT code,starts_on,ends_on FROM academic_years ORDER BY starts_on');const [semesters]=await c.admin.query<RowDataPacket[]>('SELECT code,academic_year_id,term_kind,starts_on,ends_on FROM semesters ORDER BY starts_on');report.calendar={years,semesters};
 const [masterlists]=await c.admin.query<RowDataPacket[]>('SELECT status,COUNT(*) n FROM masterlist_versions GROUP BY status');report.masterlists=masterlists;
 const [indexRows]=await c.admin.query<RowDataPacket[]>("SELECT TABLE_NAME table_name,INDEX_NAME index_name,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) columns_text,NON_UNIQUE non_unique FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() GROUP BY TABLE_NAME,INDEX_NAME,NON_UNIQUE ORDER BY TABLE_NAME,INDEX_NAME");report.indexes={count:indexRows.length,unique:indexRows.filter(r=>!r.non_unique).length};
 const [[size]]=await c.admin.query<RowDataPacket[]>('SELECT SUM(DATA_LENGTH+INDEX_LENGTH) bytes FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');report.allocatedBytes=Number(size.bytes);
 const api=async<T=unknown>(role:string,path:string)=>{const r=await c.request(role,path);assert.equal(r.statusCode,200,r.body.slice(0,600));return r.json<T>();};
 const base='/api/v1/ovr-batches/'+c.metadata.batchId;
 if(scenario!=='F') {
  const recording=await api<import('../server/payments/recording-model.js').RecordingSummary>('staff',base+'/payment-summary');assert.equal(recording.total,835);assert.equal(recording.totalAmount,'4175000.00');
  const expected=scenario==='A'?[0,0,835]:scenario==='E'?[826,9,0]:[825,10,0];assert.deepEqual([recording.paid,recording.unclaimed,recording.pending],expected);report.recording=recording;
  const recon=await api('staff',base+'/reconciliation-summary');report.reconciliation=recon;
  if(['D','E'].includes(scenario)) {
   const original=await api<import('../server/payments/report-model.js').ReportPage>('staff',base+'/financial-report?basis=original');assert.equal(original.payrollTotals.paidCentavos,412500000);assert.equal(original.payrollTotals.unclaimedCentavos,5000000);
   const [[closure]]=await c.admin.query<RowDataPacket[]>("SELECT COUNT(*) n,MIN(snapshot_hash) hash FROM payroll_reconciliation_events WHERE batch_id=? AND kind='closed'",[c.metadata.batchId]);assert.equal(Number(closure.n),1);assert.equal(closure.hash,c.metadata.originalClosureHash);report.originalClosure={count:1,hashUnchanged:true,original825Paid10Unclaimed:true};
  }
 }
 const settlement=await api<import('../server/payments/report-model.js').ReportPage&{settlementTotals:import('../server/payments/report-model.js').SettlementTotals}>('staff',base+'/financial-report?basis=settlement');assert.equal(settlement.settlementTotals.conflicts,0);assert.equal(settlement.settlementTotals.paidAttempts,settlement.settlementTotals.paidEntitlements);report.settlement=settlement.settlementTotals;
 report.authorization=[];
 for(const [role,path,status] of [['system_admin',base+'/payment-summary',403],['unassigned','/api/v1/scholars',403]]) {
  const r=await c.request(String(role),String(path));assert.equal(r.statusCode,status);report.authorization.push({role,path,status});
 }
 const close=await c.request('staff',base+'/reconciliation-commands',{action:'close',expectedRevision:1,expectedReconciliationRevision:0,sourceHash:'0'.repeat(64),effectiveOn:'2026-10-24',reviewed:true});assert.equal(close.statusCode,403);report.authorization.push({role:'staff',action:'close',status:403});
 for(const sql of ['DELETE FROM payment_records WHERE 1=0','UPDATE audit_logs SET id=id WHERE 1=0','DELETE FROM payroll_closure_members WHERE 1=0'])await assert.rejects(c.runtime.query(sql));
 const [global]=await c.admin.query<RowDataPacket[]>('SELECT PRIVILEGE_TYPE p FROM information_schema.USER_PRIVILEGES WHERE GRANTEE=?',["'"+c.metadata.runtimeUser+"'@'localhost'"]);assert.ok(global.every(r=>r.p==='USAGE'));
 const [other]=await c.admin.query<RowDataPacket[]>('SELECT TABLE_SCHEMA s FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA<>?',["'"+c.metadata.runtimeUser+"'@'localhost'",c.database]);assert.equal(other.length,0);
 report.runtime={noGlobalPrivileges:true,noOtherSchemaTablePrivileges:true,protectedHistoryMutationsDenied:true};
 await save(`${folder}/verification-${scenario}.json`,report);
 console.log(JSON.stringify({scenario,database:c.database,scholars:report.scholars,migrations:report.migrations,integrity:report.integrity,recording:report.recording,settlement:report.settlement,allocatedBytes:report.allocatedBytes}));
} finally {await c.close();}
