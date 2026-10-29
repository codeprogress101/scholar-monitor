import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {resolve,sep} from 'node:path';
import {inventory} from './backup-lib.mjs';

/** Explicitly authorized primary-UAT upgrade. No general force/skip switch. */
async function reviewedLocalUat(connection,proof) {
  assert.equal(proof.authorization,'A1_A5_LOCALHOST_5173_20261024');
  assert.equal(proof.database,'ldss_scholar_monitor_dev');
  assert.equal(proof.runtimeIdentity,'ldss_monitor_local@localhost');
  assert.equal(proof.verified,true);
  assert.equal(proof.temporaryRestoreRemoved,true);
  assert.equal(process.env.APP_ENV,'development');
  assert.equal(process.env.DB_NAME,proof.database);
  assert.ok(['127.0.0.1','localhost'].includes(process.env.DB_HOST));
  const [[actual]]=await connection.query('SELECT DATABASE() name,@@hostname hostname,@@port port');
  assert.equal(actual.name,proof.database);assert.equal(actual.hostname.toLowerCase(),hostname().toLowerCase());
  assert.equal(actual.hostname,proof.serverHostname);assert.equal(actual.port,proof.port);
  const privateRoot=resolve('output/a1-a5-localhost-5173-20261024/private')+sep;
  for(const path of [proof.backupFile,proof.restoreReport])assert.ok(resolve(path).startsWith(privateRoot),'Recovery evidence must remain in the reviewed private task directory');
  const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest(await readFile(proof.backupFile)),proof.backupSha256);
  const reportBytes=await readFile(proof.restoreReport);assert.equal(digest(reportBytes),proof.restoreReportSha256);
  const report=JSON.parse(reportBytes.toString('utf8'));assert.equal(report.verified,true);assert.equal(report.retained,false);assert.equal(report.backupSha256,proof.backupSha256);
  assert.equal(digest(JSON.stringify(await inventory(connection))),proof.inventorySha256,'Database changed after verified backup; take a new reviewed backup before migration');
  return {database:actual.name,verifiedRestore:true};
}

/** Default: only new owned synthetic schemas. The separately authorized 5173
 * target requires pinned local identity and verified, unchanged backup evidence.
 * No retained fixture is admitted by that explicit exception.
 */
export async function preflightAnnualIntakes(connection,localUatReview) {
  const [[row]]=await connection.query('SELECT DATABASE() name');
  const review=localUatReview?await reviewedLocalUat(connection,localUatReview):null;
  if(!review)assert.match(row.name,new RegExp(`^ldss_[a-z0-9_]+_test_${process.pid}_[a-f0-9]{8}$`),'F53 requires an owned disposable schema or the explicit verified 5173 review; no implicit retained/development migration');
  const [[invalid]]=await connection.query(`SELECT COUNT(*) n FROM scholar_intakes i
    LEFT JOIN scholars s ON s.id=i.scholar_id LEFT JOIN academic_years y ON y.id=i.academic_year_id
    LEFT JOIN schools sc ON sc.id=i.school_id LEFT JOIN courses co ON co.id=i.course_id
    LEFT JOIN import_jobs j ON j.id=i.import_job_id LEFT JOIN users u ON u.id=i.actor_id
    WHERE s.id IS NULL OR y.id IS NULL OR sc.id IS NULL OR (i.course_id IS NOT NULL AND co.id IS NULL)
      OR j.id IS NULL OR u.id IS NULL OR i.source_row<2 OR i.year_level IS NULL
      OR CHAR_LENGTH(TRIM(i.year_level)) NOT BETWEEN 1 AND 60 OR i.classification NOT IN ('new','continuing')`);
  assert.equal(Number(invalid.n),0,'F53 legacy intake incompatibility: stop without modifying original rows');
  const [duplicates]=await connection.query('SELECT scholar_id,academic_year_id FROM scholar_intakes GROUP BY scholar_id,academic_year_id HAVING COUNT(*)>1');
  assert.equal(duplicates.length,0,'F53 person/year ownership conflict');
  const [triggers]=await connection.query("SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='scholar_intakes'");
  assert.ok(['scholar_intakes_no_update','scholar_intakes_no_delete'].every(n=>triggers.some(t=>t.name===n)),'Preserve immutable intake triggers');
  const [[count]]=await connection.query('SELECT COUNT(*) n FROM scholar_intakes');
  // Populated upgrades need an explicit recoverability checkpoint supplied by
  // the owned upgrade driver; fresh regressions have no intake data to recover.
  if(Number(count.n)>0&&!review) {
    const [[owner]]=await connection.query('SELECT recovery_verified FROM _ldss_annual_uat_owner WHERE id=1');
    assert.equal(owner?.recovery_verified,1,'Record and verify the owned upgrade recovery checkpoint before F53');
  }
  return {database:row.name,intakes:Number(count.n),compatible:true,...(review?{review}: {})};
}
