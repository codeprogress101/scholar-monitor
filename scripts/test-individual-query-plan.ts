import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {individualSourcesSql} from '../server/payments/individual-reads.js';

/** Paired P07 regression: identical predicates/results, different join driving
 * order. Does not refresh statistics, change schema, or mutate financial rows. */
export async function testIndividualQueryPlan(db:Pick<Pool,'query'>,total:number){
 const [[name]]=await db.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(name.name,/^ldss_(?:f19|import)_test_\d+_[a-f\d]{8}$/);
 const previous=individualSourcesSql.replace('FROM scholarship_records paid_annual STRAIGHT_JOIN payment_records p ON p.scholarship_id=paid_annual.id STRAIGHT_JOIN payout_cycles paid_cycle','FROM payment_records p JOIN scholarship_records paid_annual ON paid_annual.id=p.scholarship_id JOIN payout_cycles paid_cycle');
 assert.notEqual(previous,individualSourcesSql);
 const scope="effective_outcome='not_paid' AND unpaid_reason='did_not_claim' AND paid_elsewhere=0",runs:{variant:string;ms:number;rows:number}[]=[];
 let expected:RowDataPacket[]|undefined;const analyses:object[]=[];
 for(const [variant,source] of [['previous-plan',previous],['scholar-first-plan',individualSourcesSql]]){
  const sql=`SELECT * FROM (${source}) src WHERE ${scope} ORDER BY human_id,payment_id`;
  for(let n=0;n<3;n++){const begin=performance.now(),[rows]=await db.query<RowDataPacket[]>(sql);runs.push({variant,ms:performance.now()-begin,rows:rows.length});if(expected)assert.deepEqual(rows,expected);else expected=rows;}
  const [plan]=await db.query<RowDataPacket[]>('ANALYZE FORMAT=JSON '+sql);analyses.push({variant,plan:JSON.parse(plan[0].ANALYZE)});
 }
 const folder='output/p07-settlement-20261022';await mkdir(folder,{recursive:true});await writeFile(`${folder}/paired-queue-plan-${total}.json`,JSON.stringify({at:new Date().toISOString(),total,runs,analyses,identicalResults:true,statisticsNotRefreshed:true,noSchemaOrFinancialMutation:true},null,2));
 console.log(`PASS P07 paired ${total}-scholar Unclaimed query plans: complete result/ordering parity with no statistics or financial changes`);
}
