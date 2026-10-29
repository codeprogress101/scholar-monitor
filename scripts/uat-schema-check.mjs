import assert from 'node:assert/strict';
import {owned,save,folder} from './uat-environment.mjs';
const sections={
 columns:"SELECT TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,GENERATION_EXPRESSION,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME<>'_ldss_uat_owner' ORDER BY TABLE_NAME,ORDINAL_POSITION",
 indexes:"SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,INDEX_TYPE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME<>'_ldss_uat_owner' ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX",
 constraints:"SELECT TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME<>'_ldss_uat_owner' ORDER BY TABLE_NAME,CONSTRAINT_NAME",
 foreignKeys:"SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,ORDINAL_POSITION,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME<>'_ldss_uat_owner' ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION",
 checks:"SELECT TABLE_NAME,CONSTRAINT_NAME,CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME<>'_ldss_uat_owner' ORDER BY TABLE_NAME,CONSTRAINT_NAME"
};
const results=[];
for(const scenario of ['A','B','C','D','E','F']) {
 const {db,metadata}=await owned(scenario);
 try {
  const verified=[];
  for(const [section,sql] of Object.entries(sections)) {
   const [reference]=await db.execute(sql,['ldss_scholar_monitor_dev']),[fixture]=await db.execute(sql,[metadata.database]);
   assert.deepEqual(fixture,reference,`Application schema mismatch: ${scenario}/${section}`);verified.push({section,entries:fixture.length});
  }
  results.push({scenario,database:metadata.database,applicationMetadataMatchesAcceptedDevelopmentSchema:true,ownershipMarkerExcluded:true,verified});
 }finally{await db.end();}
}
await save(folder+'/schema-comparison.json',{at:new Date().toISOString(),readOnly:true,results});console.log(JSON.stringify(results.map(r=>({scenario:r.scenario,verified:r.verified}))));
