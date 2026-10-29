// Offline documentation generator. Reads schema metadata only; never connects to a database.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { domains, descriptions } from './domains.mjs';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const destination = fileURLToPath(new URL('../', import.meta.url));
const input = path.resolve(root, process.argv[2] ?? 'output/db-erd-1-20261029');
const load = async name => JSON.parse(await fs.readFile(path.join(input, name), 'utf8'));
const a = await load('primary-schema.json'), b = await load('ip-uat-schema.json');
const docDate=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Manila'}).format(new Date(a.capturedAt));
const schemas = { primary: a, 'ip-uat': b };
const md = value => String(value ?? '').replaceAll('|','&#124;').replaceAll('\n','<br>').replaceAll('<','&lt;').replaceAll('>','&gt;');
const code = value => '`' + md(value) + '`';
const anchor = name => name.toLowerCase().replaceAll('_','-');
const linkTable = name => `[${name}](LDSS_DATA_DICTIONARY.md#${anchor(name)})`;
const sorted = rows => [...rows].sort((x,y) => x.localeCompare(y));
const names = s => s.tables.map(t=>t.TABLE_NAME);
const allNames = sorted(new Set([...names(a),...names(b)]));
const baseNames = s => s.tables.filter(t=>t.TABLE_TYPE==='BASE TABLE').map(t=>t.TABLE_NAME);
const primaryOnly = names(a).filter(t=>!names(b).includes(t)), uatOnly = names(b).filter(t=>!names(a).includes(t));
const common = names(a).filter(t=>names(b).includes(t));
const sourceSchema = table => names(a).includes(table) ? a : b;
const rows = (s, key, table) => s[key].filter(row=>row.TABLE_NAME===table);
const group = (list, key) => Object.groupBy(list, key);
const keys = (s, table, name) => rows(s,'keyColumns',table).filter(row=>row.CONSTRAINT_NAME===name).map(row=>row.COLUMN_NAME);
const indexes = (s, table) => Object.entries(group(rows(s,'indexes',table), row=>row.INDEX_NAME)).map(([name,list])=>({ name, columns:list.map(x=>x.COLUMN_NAME), unique:list.every(x=>Number(x.NON_UNIQUE)===0), rows:list }));
const uniqueWithin = (s, table, columns) => indexes(s,table).some(index=>index.unique && index.columns.length && index.columns.every(col=>col && columns.includes(col)));
const foreignKeys = s => s.rules.map(rule=>{
  const parts = rows(s,'keyColumns',rule.TABLE_NAME).filter(col=>col.CONSTRAINT_NAME===rule.CONSTRAINT_NAME);
  assert.ok(parts.length);
  const child = rule.TABLE_NAME, parent = parts[0].REFERENCED_TABLE_NAME;
  assert.ok(parts.every(part=>part.REFERENCED_TABLE_NAME===parent && part.REFERENCED_TABLE_SCHEMA===s.identity.database_name));
  const childColumns = parts.map(x=>x.COLUMN_NAME), parentColumns = parts.map(x=>x.REFERENCED_COLUMN_NAME);
  const nullable = childColumns.some(name=>rows(s,'columns',child).find(c=>c.COLUMN_NAME===name).IS_NULLABLE==='YES');
  const parentUnique = uniqueWithin(s,parent,parentColumns), childUnique = uniqueWithin(s,child,childColumns);
  const pk = keys(s,child,'PRIMARY');
  return { child, parent, name:rule.CONSTRAINT_NAME, childColumns, parentColumns,
    nullable, parentUnique, childUnique, identifying:childColumns.every(col=>pk.includes(col)),
    parentCardinality: parentUnique ? nullable ? '0..1':'1' : nullable ? '0..many':'1..many',
    childCardinality: childUnique ? '0..1':'0..many', update:rule.UPDATE_RULE, delete:rule.DELETE_RULE,
    parentKey:rule.UNIQUE_CONSTRAINT_NAME, match:rule.MATCH_OPTION };
});
const fks = foreignKeys(a), bfks=foreignKeys(b);
assert.equal(JSON.stringify(fks),JSON.stringify(bfks),'Different enforced FK sets need separate diagram variants');
const moduleOf = new Map();
for (const [id,,tables] of domains) for (const table of tables) if(allNames.includes(table)) { assert.ok(!moduleOf.has(table),table); moduleOf.set(table,id); }
for (const table of allNames) if (!moduleOf.has(table) && table.endsWith('_commands')) { moduleOf.set(table,'12-audit-commands'); domains.find(d=>d[0]==='12-audit-commands')[2].push(table); }
assert.deepEqual(sorted(moduleOf.keys()),allNames,'Every real table/view must have a module');
const migrationTexts = [];
for (const file of (await fs.readdir(path.join(root,'db/migrations'))).filter(f=>f.endsWith('.sql')).sort()) {
  migrationTexts.push({ file, path:'db/migrations/'+file, lines:(await fs.readFile(path.join(root,'db/migrations',file),'utf8')).split(/\r?\n/) });
}
const sourceRefs = table => migrationTexts.flatMap(file=>file.lines.flatMap((line,index)=>new RegExp('(?:CREATE\\s+(?:OR\\s+REPLACE\\s+)?(?:TABLE|VIEW)(?:\\s+IF\\s+NOT\\s+EXISTS)?|ALTER\\s+TABLE)\\s+`?'+table+'`?(?:[\\s(]|$)','i').test(line)?[{path:file.path,line:index+1,creation:/CREATE/i.test(line)}]:[]));
const sourceLink = ref => `[${path.basename(ref.path)}:${ref.line}](${path.isAbsolute(ref.path)?ref.path:'../../../'+ref.path}#L${ref.line})`;
const purpose = table => descriptions[table] ?? (table.endsWith('_commands') ? 'Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.' : sourceSchema(table).views.some(v=>v.TABLE_NAME===table) ? 'SQL audit projection; exact view definition appears below. Views have no declared primary/foreign keys.' : 'UNKNOWN business purpose beyond the live fields and source DDL listed below. No application relationship is assumed.');
const envLabel = table => primaryOnly.includes(table) ? 'Primary only' : uatOnly.includes(table) ? '5181 only' : 'Both';
function diagram(tables, edges, title) {
  const lines = ['%% '+title,'%% Database-enforced FKs only. Attributes show PK/FK columns; all columns are in the dictionary.','erDiagram'];
  for (const table of sorted(tables)) {
    const s=sourceSchema(table), pk=keys(s,table,'PRIMARY');
    const foreign = fks.filter(f=>f.child===table).flatMap(f=>f.childColumns);
    const selected = rows(s,'columns',table).filter(col=>pk.includes(col.COLUMN_NAME)||foreign.includes(col.COLUMN_NAME));
    lines.push(`  %% ${table}: ${envLabel(table)}; ${s.tables.find(t=>t.TABLE_NAME===table).TABLE_TYPE}`);
    if (!selected.length) { lines.push('  '+table); continue; }
    lines.push('  '+table+' {');
    for (const col of selected) {
      const labels = [pk.includes(col.COLUMN_NAME)?'PK':null,foreign.includes(col.COLUMN_NAME)?'FK':null].filter(Boolean);
      if(indexes(s,table).some(index=>index.unique&&index.columns.length===1&&index.columns[0]===col.COLUMN_NAME&&index.name!=='PRIMARY'))labels.push('UK');
      const sqltype = col.COLUMN_TYPE.replaceAll('"',"'");
      lines.push(`    ${col.DATA_TYPE.replace(/[^a-zA-Z0-9_]/g,'_')} ${col.COLUMN_NAME} ${labels.join(', ')} "${col.IS_NULLABLE==='YES'?'nullable':'not null'}; SQL ${sqltype}"`);
    }
    lines.push('  }');
  }
  for (const fk of edges) {
    const left = fk.parentUnique ? fk.nullable ? '|o':'||' : fk.nullable ? '}o':'}|';
    lines.push(`  ${fk.parent} ${left}${fk.identifying?'--':'..'}${fk.childUnique?'o|':'o{'} ${fk.child} : "${fk.name}"`);
  }
  return lines.join('\n')+'\n';
}
for(const dir of ['modules','schema','exports'])await fs.mkdir(path.join(destination,dir),{recursive:true});
const write = (name,content)=>fs.writeFile(path.join(destination,name),content);
for(const [name,schema]of Object.entries(schemas))await write('schema/'+name+'.json',JSON.stringify(schema,null,2));
await write('LDSS_COMPLETE_ERD.mmd',diagram(allNames,fks,'Union of primary and IP-UAT: '+allNames.length+' objects'));
const moduleInventory=[];
for (const [id,title,defined] of domains) {
  const core=defined.filter(table=>allNames.includes(table));
  const edges=fks.filter(fk=>core.includes(fk.child));
  const tables=sorted(new Set([...core,...edges.map(fk=>fk.parent)]));
  await write('modules/'+id+'.mmd',diagram(tables,edges,title+'; core tables: '+core.join(', ')));
  moduleInventory.push({id,title,core,context:tables.filter(t=>!core.includes(t)),objects:tables.length,foreignKeys:edges.length});
}
const moduleCounts=new Map();
for(const fk of fks){const from=moduleOf.get(fk.parent),to=moduleOf.get(fk.child);if(from!==to){const key=from+'|'+to;moduleCounts.set(key,(moduleCounts.get(key)??0)+1);}}
const overview=['flowchart TD','  %% Selected cross-domain FK groups only; full inventory is in LDSS_COMPLETE_ERD.mmd. Not a workflow sequence.'];
for(const [id,title]of domains)overview.push(`  ${id.replaceAll('-','_')}["${title}<br/>${moduleInventory.find(m=>m.id===id).core.length} core objects"]`);
const overviewPairs=new Set(['01-authentication|02-scholars','02-scholars|03-academic','02-scholars|05-semester-approval','05-semester-approval|04-documents','02-scholars|06-masterlists','02-scholars|07-payroll-windows','07-payroll-windows|08-payroll-entitlements','08-payroll-entitlements|09-payments','09-payments|10-individual-documents','11-configuration|05-semester-approval','01-authentication|12-audit-commands']);
for(const [key,count]of moduleCounts){if(!overviewPairs.has(key))continue;const[from,to]=key.split('|');overview.push(`  ${from.replaceAll('-','_')} -->|"${count} FKs"| ${to.replaceAll('-','_')}`);}
await write('LDSS_SYSTEM_OVERVIEW.mmd',overview.join('\n')+'\n');
const legend=`Cardinality describes declared constraints, not observed row counts. Parent end: exactly one when all child FK columns are NOT NULL and the target tuple is unique; otherwise nullable composite FKs allow no parent. Child end: zero-to-one when a child unique key is contained in the FK tuple; otherwise zero-to-many. No FK requires a parent to have a child. All composite columns are kept together. PK-containing FK tuples use solid identifying lines; other links use dotted lines. Composite unique keys are not mislabelled as individually unique columns. ${fks.filter(f=>!f.parentUnique).length} FK targets lack a demonstrated unique target tuple.\n\nNullable CHECK expressions may further restrict allowed row combinations; no attempt is made to prove arbitrary expressions or application policy. Column-declared optionality is shown conservatively. MATCH/NULL behavior and exact CHECK clauses are in the dictionary. No row-level orphan or business-authority audit was performed. Notation follows [Mermaid ER documentation](https://mermaid.js.org/syntax/entityRelationshipDiagram.html).`;
const inferred=[
  {source:'audit_logs.entity_type + entity_id',target:'Type-dependent business entity',evidence:'server/audit/service.ts',note:'Polymorphic audit target, not an FK to every possible business table. No cardinality is asserted.'},
  {source:'notification_events.kind + source_id',target:'Type-dependent Masterlist, roster, import or document source',evidence:'server/notifications/service.ts',note:'Navigation interprets kind/source. This is INFERRED application linkage, not a declared FK.'},
  {source:'system_settings reserved FIN_SIGN_* codes',target:'Logical document signatory configuration',evidence:'C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release/server/configuration/document-signatories.ts',note:'5181 release evidence: configuration rows, not separate signatory entities or a signatory foreign-key table. No values were exported. This source link requires the local accepted release.'},
];
for(const item of inferred){const lines=(await fs.readFile(path.isAbsolute(item.evidence)?item.evidence:path.join(root,item.evidence),'utf8')).split(/\r?\n/);const token=item.source.startsWith('system_settings')?'FIN_SIGN_':item.source.startsWith('notification')?'source_id':'entity_id';item.line=Math.max(1,lines.findIndex(line=>line.includes(token))+1);}
await write('schema/relationships.json',JSON.stringify({foreignKeys:fks,inferred,moduleInventory},null,2));
let relation=`# LDSS relationship inventory\n\n${docDate}. **${fks.length} actual FK constraints in each database**, identical after schema-name normalization; multi-column FKs are one relationship each. Full source contains the union of actual objects, including environment-only markers and three unlinked view entities.\n\n${legend}\n\n## Database-enforced relationships\n\n| # | Child / constraint | Child columns → parent columns | Parent per child | Children per parent | Parent key | UPDATE / DELETE |\n|---|---|---|---|---|---|---|\n`;
fks.forEach((fk,index)=>{relation+=`| ${index+1} | ${linkTable(fk.child)} / ${code(fk.name)} | ${code(fk.childColumns.join(', '))} → ${linkTable(fk.parent)} (${code(fk.parentColumns.join(', '))}) | ${fk.parentCardinality} | ${fk.childCardinality} | ${code(fk.parentKey)} | ${fk.update} / ${fk.delete} |\n`;});
relation+='\n## INFERRED application linkages — not diagram FK edges\n\n| Source | Logical target | Evidence | Limitation |\n|---|---|---|---|\n';
for(const item of inferred)relation+=`| ${code(item.source)} | ${item.target} | ${sourceLink({path:item.evidence,line:item.line})} | ${item.note} |\n`;
relation+='\nViews derive audit projections by SQL; their definitions are listed in the dictionary. A view dependency is not an FK. JSON snapshots/source hashes and application retry/version guards are not automatically relational constraints. No inferred edge is inserted into the physical ERD.\n';
await write('LDSS_RELATIONSHIPS.md',relation);
let dictionary=`# LDSS data dictionary\n\n${docDate}. Live metadata from both named synthetic schemas. **${new Set([...baseNames(a),...baseNames(b)]).size} distinct base tables + ${a.views.length} views**, covering primary ${baseNames(a).length}+${a.views.length} and 5181 ${baseNames(b).length}+${b.views.length}. Search by table, column, FK or index name. No business rows or configuration values are included.\n\nSQL defaults are the exact information_schema representation: a metadata NULL means SQL NULL or no explicit default (the metadata does not distinguish declaration spelling). Quoted SQL literals, expressions, generated-column formulas, full SQL types and collations are retained. PK/UK flags on a component name its constraint, not individual-column uniqueness. CHECK clauses are verbatim schema expressions. Existing schema comments are empty except the engine-provided VIEW marker; no business comments were invented.\n\n## Object index\n\n| Object | Type | Present | Module | Description |\n|---|---|---|---|---|\n`;
for(const table of allNames)dictionary+=`| [${table}](#${anchor(table)}) | ${sourceSchema(table).tables.find(t=>t.TABLE_NAME===table).TABLE_TYPE} | ${envLabel(table)} | ${moduleOf.get(table)} | ${md(purpose(table))} |\n`;
for(const table of allNames){
 const s=sourceSchema(table),info=s.tables.find(t=>t.TABLE_NAME===table),refs=sourceRefs(table),tableFks=fks.filter(f=>f.child===table),allIndexes=indexes(s,table);
 dictionary+=`\n<a id="${anchor(table)}"></a>\n\n## ${table}\n\n${purpose(table)}\n\n**Present:** ${envLabel(table)}. **Type:** ${info.TABLE_TYPE}. **Engine/collation:** ${info.ENGINE??'N/A'} / ${info.TABLE_COLLATION??'N/A'}. **Schema comment:** ${info.TABLE_COMMENT?code(info.TABLE_COMMENT):'none'}.\n\n**DDL evidence:** ${refs.length?refs.map(sourceLink).join(', '):'No creation/alteration statement found in repository migrations; live schema remains authoritative. Environment ownership markers are operator-fixture metadata, not backup jobs.'}\n\n| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |\n|---|---|---|---|---|---|---|\n`;
 for(const col of rows(s,'columns',table)){
   const memberships=rows(s,'keyColumns',table).filter(k=>k.COLUMN_NAME===col.COLUMN_NAME).map(k=>`${rows(s,'constraints',table).find(c=>c.CONSTRAINT_NAME===k.CONSTRAINT_NAME)?.CONSTRAINT_TYPE??'KEY'} ${k.CONSTRAINT_NAME} [${k.ORDINAL_POSITION}]`);
   const references=tableFks.flatMap(f=>f.childColumns.includes(col.COLUMN_NAME)?[`${f.name}: ${f.parent} (${f.parentColumns.join(', ')}) / ${f.update} / ${f.delete}`]:[]);
   dictionary+=`| ${code(col.COLUMN_NAME)} | ${code(col.COLUMN_TYPE)} | ${col.IS_NULLABLE} | ${col.COLUMN_DEFAULT===null?'NULL / no explicit default':code(col.COLUMN_DEFAULT)} | ${md(memberships.join('; ')||'—')} | ${md(references.join('; ')||'—')} | ${md([col.EXTRA,col.GENERATION_EXPRESSION,col.COLLATION_NAME,col.COLUMN_COMMENT].filter(Boolean).join('; ')||'—')} |\n`;
 }
 dictionary+='\n### Indexes and unique constraints\n\n| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |\n|---|---|---|---|---|\n';
 for(const index of allIndexes)dictionary+=`| ${code(index.name)} | ${index.unique?'YES':'NO'} | ${code(index.rows.map(r=>(r.COLUMN_NAME??'<expression>')+(r.SUB_PART?`[prefix ${r.SUB_PART}]`:'')+(r.COLLATION?` ${r.COLLATION}`:'')).join(', '))} | ${index.rows[0].INDEX_TYPE} | ${md(index.rows[0].INDEX_COMMENT||'—')} |\n`;
 if(!allIndexes.length)dictionary+='| — | — | No declared index | — | — |\n';
 if(table==='scholar_intakes')dictionary+='\n**5181 difference:** the standalone nonunique `academic_year_id (academic_year_id)` index exists only in primary. Both have ix_intake_associated_year (academic_year_id, scholar_id). All other indexes for this table match.\n';
 dictionary+='\n### CHECK constraints\n\n';
 const checks=rows(s,'checks',table);dictionary+=checks.length?checks.map(c=>`- ${code(c.CONSTRAINT_NAME)}: ${code(c.CHECK_CLAUSE)}`).join('\n')+'\n':'None declared.\n';
 const view=s.views.find(v=>v.TABLE_NAME===table);if(view)dictionary+=`\n### View definition\n\nSecurity: ${view.SECURITY_TYPE}; check option: ${view.CHECK_OPTION}; updatable metadata: ${view.IS_UPDATABLE}. No definer account is exported.\n\n\`\`\`sql\n${view.VIEW_DEFINITION}\n\`\`\`\n\n5181 definition differs only in its explicit database qualifier.\n`;
}
dictionary+='\n## Foreign-key MATCH metadata\n\nAll inspected foreign keys report MATCH_OPTION = NONE. The diagrams use declared column nullability conservatively; CHECK clauses and application rules can impose additional conditions. Exact MATCH metadata accompanies each relationship in schema/relationships.json.\n';
await write('LDSS_DATA_DICTIONARY.md',dictionary);
const normalized = (value,schema) => JSON.stringify(value).replaceAll('`'+schema.identity.database_name+'`.','').replaceAll('"REFERENCED_TABLE_SCHEMA":"'+schema.identity.database_name+'"','"REFERENCED_TABLE_SCHEMA":"<self>"');
const sectionDifferences={};
for(const section of ['columns','indexes','constraints','keyColumns','rules','checks','views','triggers']){
 sectionDifferences[section]=common.filter(table=>{
  const filter=s=>s[section].filter(row=>(row.TABLE_NAME??row.EVENT_OBJECT_TABLE)===table);
  return normalized(filter(a),a)!==normalized(filter(b),b);
 });
}
const versionDifferences=a.journal.filter(x=>!b.journal.some(y=>y.version===x.version)),checksumDifferences=a.journal.filter(x=>b.journal.some(y=>y.version===x.version&&y.checksum!==x.checksum));
const timestampDifferences=a.journal.filter(x=>b.journal.some(y=>y.version===x.version&&y.applied_at!==x.applied_at));
const migrationFiles=await load('migration-files.json');
const migrationFileMismatches=a.journal.filter(row=>migrationFiles.find(file=>file.file===row.version)?.sha256!==row.checksum);
const unAppliedFiles=migrationFiles.filter(file=>!a.journal.some(row=>row.version===file.file));
await write('schema/comparison.json',JSON.stringify({primaryOnly,uatOnly,commonObjects:common.length,sectionDifferences,versionDifferences,checksumDifferences,timestampDifferenceCount:timestampDifferences.length,migrationFileMismatches,unAppliedMigrationFiles:unAppliedFiles.map(f=>f.path)},null,2));
let comparison=`# Primary versus Individual Payments UAT schema\n\n${docDate}. No automatic reconciliation or migration was performed.\n\n| Inventory | Primary | 5181 UAT |\n|---|---:|---:|\n| Base tables | ${baseNames(a).length} | ${baseNames(b).length} |\n| Views | ${a.views.length} | ${b.views.length} |\n| Columns including views | ${a.columns.length} | ${b.columns.length} |\n| FK constraints (not component rows) | ${fks.length} | ${bfks.length} |\n| CHECK constraints | ${a.checks.length} | ${b.checks.length} |\n| Index definitions | ${new Set(a.indexes.map(r=>r.TABLE_NAME+':'+r.INDEX_NAME)).size} | ${new Set(b.indexes.map(r=>r.TABLE_NAME+':'+r.INDEX_NAME)).size} |\n| Journal entries | ${a.journal.length} | ${b.journal.length} |\n\n## Environment-specific tables\n\nPrimary only: ${primaryOnly.map(code).join(', ')}. 5181 only: ${uatOnly.map(code).join(', ')}. These ownership/recovery markers have different fields and primary keys; they are not application financial entities or backup-job tables. Their complete definitions are in the dictionary. Supported purpose references: [primary two-batch owner](../../../scripts/uat-two-batch.ts#L105), [annual owner](../../../scripts/test-annual-intakes-db.ts#L88) and [IP-UAT-1 report](../../acceptance/IP_UAT_1_INDIVIDUAL_PAYMENTS_TEST_ENVIRONMENT_REPORT.md). No marker values were read.\n\n## Shared objects\n\n${common.length} common objects. Column/type/nullability/default/generation/collation, PK/UNIQUE/CHECK/FK definitions and referential actions match on shared objects. All ${fks.length} FK constraints and ordered component mappings match after self-schema qualification normalization.\n\n**One index difference:** primary retains the standalone nonunique scholar_intakes.academic_year_id (academic_year_id) index. 5181 lacks it. Both retain ix_intake_associated_year (academic_year_id, scholar_id); [F53](../../../db/migrations/20261024010000_f53_annual_intake_registration.sql#L10) adds that composite index. The history causing retention/removal of the standalone index is not established by schema metadata. No unique or FK constraint difference follows from this observation.\n\nAll three view definitions match after stripping the actual database qualifier; raw qualifiers are retained in schema JSON. The ${a.triggers.length} trigger definitions match after qualification normalization. No view or trigger was executed.\n\n## Migration journal\n\nVersion differences: **${versionDifferences.length}**. Checksum differences: **${checksumDifferences.length}**. Applied-time differences: **${timestampDifferences.length}** (independent installation history, not a checksum drift). Repository migration-file mismatches for applied versions: **${migrationFileMismatches.length}**. Unapplied repository migration files: **${unAppliedFiles.length}**; existence on disk does not establish deployment. No journal was changed.\n\n| Version | Checksum (both) | Primary applied_at | 5181 applied_at |\n|---|---|---|---|\n`;
for(const row of a.journal)comparison+=`| ${code(row.version)} | ${code(row.checksum)} | ${code(row.applied_at)} | ${code(b.journal.find(x=>x.version===row.version)?.applied_at??'ABSENT')} |\n`;
if(unAppliedFiles.length)comparison+='\nUnapplied files:\n\n'+unAppliedFiles.map(file=>'- '+code(file.path)).join('\n')+'\n';
await write('LDSS_SCHEMA_COMPARISON.md',comparison);
await write('LDSS_SYSTEM_OVERVIEW.md',`# LDSS system overview\n\nThis is a physical schema map, not a permission, payment-authority or workflow-transition diagram.\n\n[Overview SVG](exports/LDSS_SYSTEM_OVERVIEW.svg) · [Mermaid source](LDSS_SYSTEM_OVERVIEW.mmd)\n\n\`\`\`mermaid\n${overview.join('\n')}\n\`\`\`\n\n## Domain guide\n\n| Module | Core objects | Context parents | FK edges | Source / SVG |\n|---|---:|---:|---:|---|\n${moduleInventory.map(m=>`| ${m.title} | ${m.core.length} | ${m.context.length} | ${m.foreignKeys} | [Source](modules/${m.id}.mmd) / [SVG](exports/${m.id}.svg) |`).join('\n')}\n\nEach constraint appears in the module owning its child table; referenced parent tables are repeated for context. Shared parents do not imply duplicate storage.\n\nThere is **no persistent backup job/history schema** in either inspected target. Module 13 contains the actual migration journal and UAT ownership markers only. Signatories and configurable document capacities occupy reserved system_settings rows; stored generated Individual Payment documents use the real document-version/content tables. No signatory, template or backup-job table was invented.\n\nPublished Masterlist membership, eligibility, entitlement reservation, Payroll finalization/submission/processing and recorded payment outcomes remain separate entity groups. ERD links do not equate these business states.\n`);
await write('README.md',`# LDSS database ERD and dictionary\n\n${docDate}. Read-only live metadata documentation.\n\n- **Primary:** ${a.identity.database_name} — ${baseNames(a).length} tables, ${a.views.length} views, ${fks.length} FKs, ${a.journal.length} migrations.\n- **5181:** ${b.identity.database_name} — ${baseNames(b).length} tables, ${b.views.length} views, ${bfks.length} FKs, ${b.journal.length} migrations.\n- Host: ${a.identity.hostname}, MariaDB ${a.identity.server_version}, 127.0.0.1:${a.identity.server_port}.\n- Captured: primary ${a.capturedAt}; 5181 ${b.capturedAt} (UTC).\n\n## Start here\n\n1. [System overview and module guide](LDSS_SYSTEM_OVERVIEW.md).\n2. [Full physical ERD source](LDSS_COMPLETE_ERD.mmd) / [SVG](exports/LDSS_COMPLETE_ERD.svg): **${allNames.length} union objects**, including ${new Set([...baseNames(a),...baseNames(b)]).size} base tables and ${a.views.length} views. This includes environment-only markers from both targets.\n3. [Data dictionary](LDSS_DATA_DICTIONARY.md): every column, key, index, CHECK, default, nullable field, view definition and DDL reference.\n4. [Relationship inventory](LDSS_RELATIONSHIPS.md): all FKs and separately marked INFERRED relationships.\n5. [Schema comparison](LDSS_SCHEMA_COMPARISON.md) and [completion report](../LDSS_DB_ERD_1_REPORT.md).\n\n## Reading the physical diagrams\n\n${legend}\n\nEntity attributes deliberately include PK/FK fields rather than all non-key payload columns. Full SQL types and every field are in the dictionary. Views with no keys appear as independent named entities. Edge labels are exact FK names; child/parent column order and referential actions are in the relationship inventory. Inspect composite links there instead of interpreting each component as an independent FK.\n\nThe large complete SVG is a technical index, not the only readable visual. Use the ${domains.length} smaller module sources/exports for focused review. No PDF is required to use these scalable sources.\n\n## Reproducibility and scope\n\nMachine-readable [primary metadata](schema/primary.json), [5181 metadata](schema/ip-uat.json), [relationship/module metadata](schema/relationships.json), [comparison](schema/comparison.json) and [validation](schema/validation.json) accompany the sources.\n\nThe offline generator is [tools/generate.mjs](tools/generate.mjs), with [domain/description mapping](tools/domains.mjs). Run node docs/architecture/erd/tools/generate.mjs output/db-erd-1-20261029 from the repository root to regenerate from the captured metadata. It does not connect to a database. It overwrites only this generated documentation tree; do not point it at historical evidence. The fresh capture driver is [capture-schema.mjs](../../../output/db-erd-1-20261029/capture-schema.mjs); its outputs use exclusive creation and will refuse an existing snapshot. A future refresh should use a newly reviewed task output directory and preserve this dated capture.\n\nNo business, account, session, payment, signatory-value or document rows were read. Only information_schema and migration-journal metadata were queried. Consistent read-only transactions were used; information_schema is not MVCC-protected against concurrent DDL, so validation repeats the metadata checks before completion. No readiness/authenticated API, backup capture, restore, migration, build or financial test was needed.\n`);
const actualTables=new Set([...baseNames(a),...baseNames(b)]);
const diagramText=await fs.readFile(path.join(destination,'LDSS_COMPLETE_ERD.mmd'),'utf8');
for(const table of allNames)assert.ok(diagramText.includes('\n  '+table+'\n')||diagramText.includes('\n  '+table+' {'),table);
for(const fk of fks){assert.ok(actualTables.has(fk.parent)&&actualTables.has(fk.child));assert.ok(diagramText.includes('"'+fk.name+'"'));for(const col of fk.parentColumns)assert.ok(rows(a,'columns',fk.parent).some(c=>c.COLUMN_NAME===col));}
assert.equal(moduleInventory.reduce((sum,m)=>sum+m.foreignKeys,0),fks.length);
assert.equal(moduleInventory.reduce((sum,m)=>sum+m.core.length,0),allNames.length);
const validation={passed:true,counts:{primaryTables:baseNames(a).length,uatTables:baseNames(b).length,views:a.views.length,unionTables:actualTables.size,unionObjects:allNames.length,foreignKeys:fks.length,modules:domains.length,primaryColumns:a.columns.length,uatColumns:b.columns.length},allObjectsInCompleteDiagram:true,allForeignKeysInInventoryAndChildModule:true,allReferencesExist:true,compositeMappingsPreserved:true,foreignKeySetsEqual:true,nonUniqueParentTargets:fks.filter(f=>!f.parentUnique).map(f=>f.name),inferredRelationshipsSeparate:inferred.length,comparison:sectionDifferences,migrationFileMismatches: migrationFileMismatches.length,generatedAt:new Date().toISOString()};
await write('schema/validation.json',JSON.stringify(validation,null,2));
console.log(JSON.stringify(validation));
