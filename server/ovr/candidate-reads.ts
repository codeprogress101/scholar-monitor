import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { cachedReads, readCacheSource, isSnapshotRead } from "../read-cache.js";

type KeySet = "annual" | "scholar" | "academic" | "owner" | "instance";
type Rule = { from: RegExp; field: string; keys: KeySet };
// Only raw source reads are batched. Domain decisions still run in their existing
// services. Unsupported query shapes fall through to the original reader.
const rules: Rule[] = [
  { from: /\bFROM semester_entitlements\b/, field: "scholar_id", keys: "scholar" },
  { from: /\bFROM semester_document_reconciliations r\b/, field: "r.source_instance_id", keys: "instance" },
  { from: /\bFROM requirement_document_evidence e\b/, field: "COALESCE(a.scholar_id,ss.scholar_id)", keys: "scholar" },
  { from: /\bFROM payment_records p\b/, field: 'target.id', keys: 'annual' },
  { from: /\bFROM payment_corrections c\b/, field: 'target.id', keys: 'annual' },
  { from: /\bFROM scholarship_records(?: r)?\b/, field: "r.id", keys: "annual" },
  { from: /\bFROM scholarship_records\b/, field: "scholar_id", keys: "scholar" },
  { from: /\bFROM scholarship_records r\b/, field: "r.scholar_id", keys: "scholar" },
  { from: /\bFROM academic_records a\b/, field: "a.id", keys: "academic" },
  { from: /\bFROM academic_records\b/, field: "scholar_id", keys: "scholar" },
  { from: /\bFROM academic_changes c JOIN academic_records a\b/, field: "a.scholar_id", keys: "scholar" },
  { from: /\bFROM academic_change_decisions d\b/, field: "d.academic_record_id", keys: "academic" },
  { from: /\bFROM masterlist_entries e\b/, field: "e.scholar_id", keys: "scholar" },
  { from: /\bFROM scholars(?: s)?\b/, field: "s.id", keys: "scholar" },
  { from: /\bFROM scholars\b/, field: "id", keys: "scholar" },
  { from: /\bFROM scholar_semesters ss\b/, field: "ss.id", keys: "owner" },
  { from: /\bFROM scholar_semesters ss\b/, field: "ss.scholar_id", keys: "scholar" },
  { from: /\bFROM participations p\b/, field: "p.scholar_id", keys: "scholar" },
  { from: /\bFROM scholar_semester_revisions\b/, field: "scholar_semester_id", keys: "owner" },
  { from: /\bFROM semester_review_events\b/, field: "scholar_semester_id", keys: "owner" },
  { from: /\bFROM semester_document_reconciliations(?: r)?\b/, field: "scholar_semester_id", keys: "owner" },
  { from: /\bFROM semester_document_reconciliations r\b/, field: "r.scholar_semester_id", keys: "owner" },
  { from: /\bFROM entrant_grading_card_reviews e\b/, field: "c.scholar_semester_id", keys: "owner" },
  { from: /\bFROM entrant_grading_card_reviews\b/, field: "instance_id", keys: "instance" },
  { from: /\bFROM prior_batch_members m\b/, field: "m.scholar_semester_id", keys: "owner" },
  { from: /\bFROM prior_batch_documents d\b/, field: "d.instance_id", keys: "instance" },
  { from: /\bFROM requirement_checklists\b/, field: "scholar_semester_id", keys: "owner" },
  { from: /\bFROM requirement_checklists c\b/, field: "annual.scholar_id", keys: "scholar" },
  { from: /\bFROM requirement_instances i\b/, field: "i.id", keys: "instance" },
  { from: /\bFROM requirement_instances i\b/, field: "c.scholar_semester_id", keys: "owner" },
  { from: /\bFROM requirement_instances i\b/, field: "a.scholar_id", keys: "scholar" },
  { from: /\bFROM requirement_workflow_events e\b/, field: "c.scholar_semester_id", keys: "owner" },
  { from: /\bFROM requirement_workflow_events\b/, field: "instance_id", keys: "instance" },
  { from: /\bFROM requirement_waivers\b/, field: "instance_id", keys: "instance" },
  { from: /\bFROM requirement_receipts(?: r)?\b/, field: "r.instance_id", keys: "instance" },
  { from: /\bFROM requirement_receipts\b/, field: "instance_id", keys: "instance" },
  { from: /\bFROM requirement_document_evidence d\b/, field: "d.instance_id", keys: "instance" },
  { from: /\bFROM requirement_coverage(?: c)?\b/, field: "requirement_instance_id", keys: "instance" },
  { from: /\bFROM requirement_coverage\b/, field: "scholar_semester_id", keys: "owner" },
  { from: /\bFROM requirement_coverage c\b/, field: "c.requirement_instance_id", keys: "instance" },
  { from: /\bFROM requirement_coverage c\b/, field: "c.scholar_semester_id", keys: "owner" },
  { from: /\bFROM requirement_timing_decisions\b/, field: "instance_id", keys: "instance" },
  { from: /\bFROM semester_entitlements\b/, field: "scholar_semester_id", keys: "owner" },
  { from: /\bFROM ovr_batches b JOIN payout_cycles p\b/, field: "r.scholar_id", keys: "scholar" },
  { from: /\bFROM payroll_draft_deferrals\b/, field: "scholarship_id", keys: "annual" },
  { from: /\bFROM payroll_deferrals\b/, field: "scholarship_id", keys: "annual" },
  { from: /\bFROM scholarship_records r JOIN scholarship_records origin\b/, field: "origin.id", keys: "annual" },
];

/** Find the outer FROM, ignoring subqueries and SQL string literals. */
function outerToken(sql: string, token: string) {
  let depth = 0, quote = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "(") depth++; else if (c === ")") depth--;
    if (!depth && sql.slice(i, i + token.length) === token) return i;
  }
  return -1;
}

type Binding = {field:string; keys:KeySet; position:number; needle:string; indices:number[]; or?:boolean};
function parameterIndex(sql:string, end:number) {
  let count=0,quote="";
  for(let i=0;i<end;i++) {
    const c=sql[i];
    if(quote){if(c==="\\")i++;else if(c===quote)quote="";continue;}
    if(c==="'"||c==='"'||c==="`")quote=c;else if(c==="?")count++;
  }
  return count;
}
function outerAggregate(sql:string) {
  let depth=0,subquery=-1,quote="";
  for(let i=0;i<sql.length;i++) {
    const c=sql[i];
    if(quote){if(c==="\\")i++;else if(c===quote)quote="";continue;}
    if(c==="'"||c==='"'||c==="`"){quote=c;continue;}
    if(c==="("){depth++;if(subquery<0 && /^\s*SELECT\b/i.test(sql.slice(i+1)))subquery=depth;}
    else if(c===")"){if(subquery===depth)subquery=-1;depth--;}
    if(subquery<0 && /^(?:COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|JSON_ARRAYAGG|JSON_OBJECTAGG)\s*\(/i.test(sql.slice(i)))return true;
  }
  return false;
}
function sourcePlan(sql:string) {
  const from=outerToken(sql," FROM ");if(from<0)return null;
  const tail=sql.slice(from),where=outerToken(tail," WHERE ");if(where<0)return null;
  const conditions=tail.slice(where),bindings:Binding[]=[];
  if(outerAggregate(sql.slice(0,from)) || [" GROUP BY "," HAVING "," UNION "," OR "].some(token=>outerToken(conditions,token)>=0))return null;
  if(outerToken(conditions," LIMIT ")>=0 && !/ LIMIT \d+(?= (?:FOR UPDATE|LOCK IN SHARE MODE)$|$)/.test(sql))return null;
  for(const rule of rules) {
    if(!rule.from.test(tail.slice(0,where)))continue;
    const token=outerToken(conditions,` WHERE ${rule.field}=?`)>=0?` WHERE ${rule.field}=?`:` AND ${rule.field}=?`;
    const found=outerToken(conditions,token);if(found<0)continue;
    const position=from+where+found+(token.startsWith(" WHERE")?7:5);
    if(bindings.some(b=>b.position===position))continue;
    if(sql.indexOf(`${rule.field}=?`,position+rule.field.length+2)>=0)return null;
    bindings.push({field:rule.field,keys:rule.keys,position,needle:`${rule.field}=?`,indices:[parameterIndex(sql,position)]});
  }
  const or=" AND (a.scholar_id=? OR ss.scholar_id=?)",orAt=outerToken(conditions,or);
  if(orAt>=0 && /\bFROM requirement_instances i\b/.test(tail.slice(0,where))) {
    const position=from+where+orAt+5,index=parameterIndex(sql,position);
    bindings.push({field:"COALESCE(a.scholar_id,ss.scholar_id)",keys:"scholar",position,needle:or.slice(5),indices:[index,index+1],or:true});
  }
  return bindings.length?{from,bindings}:null;
}

/** A candidate projection owns this adapter, inside its existing guarded
 * transaction/snapshot. Batches of <=200 preserve each original WHERE, ORDER BY,
 * per-key LIMIT and lock suffix. Writes invalidate both bulk and ordinary caches.
 * No eligibility output or cache is retained across projections/requests.
 */
export async function candidateReads(connection: PoolConnection, annuals: readonly string[], semester: string, wrapCache = true) {
  const snapshot = isSnapshotRead(connection);
  const keys: Record<KeySet, string[]> = { annual: [...new Set(annuals)], scholar: [], academic: [], owner: [], instance: [] };
  const sets = new Map<KeySet, Set<string>>();
  const bulk = new Map<string, Promise<Map<string, RowDataPacket[]>>>();
  const coveragePairs = new Map<string, Promise<Map<string, Set<string>> | null>>();
  const plans = new Map<string,ReturnType<typeof sourcePlan>>();
  if (!keys.annual.length) return cachedReads(connection);
  for (let offset = 0; offset < keys.annual.length; offset += 200) {
    const ids = keys.annual.slice(offset, offset + 200), marks = ids.map(() => "?").join(",");
    const [people] = await connection.execute<RowDataPacket[]>(`SELECT id,scholar_id FROM scholarship_records WHERE id IN (${marks}) LOCK IN SHARE MODE`, ids);
    keys.scholar.push(...people.map(r => String(r.scholar_id)));
  }
  keys.scholar = [...new Set(keys.scholar)];
  for (let offset = 0; offset < keys.scholar.length; offset += 200) {
    const ids = keys.scholar.slice(offset, offset + 200), marks = ids.map(() => "?").join(",");
    const [academics] = await connection.execute<RowDataPacket[]>(`SELECT id FROM academic_records WHERE scholar_id IN (${marks}) LOCK IN SHARE MODE`, ids);
    const [owners] = await connection.execute<RowDataPacket[]>(`SELECT id FROM scholar_semesters WHERE scholar_id IN (${marks}) AND semester_id=? LOCK IN SHARE MODE`, [...ids, semester]);
    keys.academic.push(...academics.map(r => String(r.id))); keys.owner.push(...owners.map(r => String(r.id)));
    const [instances] = await connection.execute<RowDataPacket[]>(`SELECT i.id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id LEFT JOIN scholarship_records r ON r.id=c.scholarship_record_id LEFT JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id WHERE (r.scholar_id IN (${marks}) OR ss.scholar_id IN (${marks})) AND c.semester_id=? LOCK IN SHARE MODE`, [...ids,...ids,semester]);
    keys.instance.push(...instances.map(r => String(r.id)));
  }
  for (const key of Object.keys(keys) as KeySet[]) { keys[key] = [...new Set(keys[key])]; sets.set(key, new Set(keys[key])); }
  const proxy = new Proxy(connection, {
    get(target, method) {
      if (method !== "execute" && method !== "query") { const v = Reflect.get(target, method); return typeof v === "function" ? v.bind(target) : v; }
      return async (sql: string, values?: unknown[]) => {
        const run = (sql:string, values?:unknown[])=>readCacheSource(target,method,sql,values) as Promise<[RowDataPacket[], unknown]>;
        const invoke = () => run(sql, values);
        if (typeof sql !== "string" || !/^\s*SELECT\b/i.test(sql)) { bulk.clear(); coveragePairs.clear(); return invoke(); }
        if (!values || /UTC_TIMESTAMP|NOW\(/i.test(sql)) return invoke();
        // Parse each recognized SQL shape once; values remain request-local.
        let plan=plans.get(sql);if(plan===undefined){plan=sourcePlan(sql);plans.set(sql,plan);}
        if(!plan)return invoke();const {from}=plan;
        const bindings=plan.bindings.flatMap(b=>{
          const id=values[b.indices[0]];
          return typeof id==="string" && sets.get(b.keys)!.has(id) && b.indices.every(i=>values[i]===id)?[{...b,id}]:[];
        });
        if (!bindings.length || bindings.length > 2) return invoke();
        const fixed = [...values]; for (const b of bindings) for (const index of b.indices) fixed[index] = null;
        const cacheKey = JSON.stringify([method, sql, fixed]);
        let pending = bulk.get(cacheKey);
        if (!pending) {
          pending = (async () => {
            const result = new Map<string, RowDataPacket[]>();
            const limit = sql.match(/ LIMIT (\d+)(?= (?:FOR UPDATE|LOCK IN SHARE MODE)$|$)/);
            // Compound coverage reads used to query every owner/document chunk
            // combination. Read actual pairs first, including malformed/foreign
            // relationships; skip only combinations proven empty in this same
            // snapshot/guard. The original SELECT, predicates, order, limits and
            // locks still decide every returned source row.
            let pairs: Map<string, Set<string>> | null | undefined;
            const ownerIndex=bindings.findIndex(b=>b.keys==='owner'),instanceIndex=bindings.findIndex(b=>b.keys==='instance');
            if(snapshot && bindings.length===2 && ownerIndex>=0 && instanceIndex>=0 && /^ FROM requirement_coverage(?: c)?(?: WHERE | LEFT JOIN )/.test(sql.slice(from))){
              const lock=sql.match(/ (?:FOR UPDATE|LOCK IN SHARE MODE)$/)?.[0]??'';
              let sources=coveragePairs.get(lock);
              if(!sources){sources=(async()=>{
                const index=new Map<string,Set<string>>();let decoded=0;
                for(let offset=0;offset<keys.owner.length;offset+=200){
                  const owners=keys.owner.slice(offset,offset+200);
                  const [rows]=await run(`SELECT scholar_semester_id,requirement_instance_id FROM requirement_coverage WHERE scholar_semester_id IN (${owners.map(()=>'?').join(',')}) LIMIT 20001${lock}`,owners);
                  // Oversized metadata discards the optimization, never source
                  // rows. Fall back to every original chunk combination.
                  decoded+=rows.length;if(decoded>20000)return null;
                  for(const row of rows){const owner=String(row.scholar_semester_id),instances=index.get(owner)??new Set<string>();instances.add(String(row.requirement_instance_id));index.set(owner,instances);}
                }
                return index;
              })();coveragePairs.set(lock,sources);}
              pairs=await sources;
            }
            const execute = async (chunks:string[][]) => {
              if(pairs){const instances=new Set(chunks[instanceIndex]);if(!chunks[ownerIndex].some(owner=>[...pairs!.get(owner)??[]].some(instance=>instances.has(instance))))return;}
              let query = sql;
              for (const b of [...bindings].sort((a,b)=>b.position-a.position)) {
                const ids = chunks[bindings.indexOf(b)], marks = ids.map(()=>"?").join(",");
                const replacement = b.or ? `(a.scholar_id IN (${marks}) OR ss.scholar_id IN (${marks}))` : `${b.field} IN (${marks})`;
                query = query.slice(0,b.position)+replacement+query.slice(b.position+b.needle.length);
              }
              query = query.slice(0,from)+bindings.map((b,i)=>`,${b.field} AS __candidate_key_${i}`).join("")+query.slice(from);
              if (limit) query = query.replace(/ LIMIT \d+(?= (?:FOR UPDATE|LOCK IN SHARE MODE)$|$)/, "");
              const parameters = values.flatMap((value,index)=>{
                const binding = bindings.findIndex(b=>b.indices.includes(index));
                return binding<0?[value]:chunks[binding];
              });
              const [rows] = await run(query, parameters);
              for (const source of rows) {
                // Metadata removal must not mutate an enclosing raw-source cache.
                const row={...source};
                const key = JSON.stringify(bindings.map((_,i)=>String(row[`__candidate_key_${i}`])));
                for (let i=0;i<bindings.length;i++) delete row[`__candidate_key_${i}`];
                const group = result.get(key) ?? []; if (!result.has(key)) result.set(key, group);
                if (!limit || group.length < Number(limit[1])) group.push(row);
              }
            };
            const chunks = async (index:number, selected:string[][]):Promise<void> => {
              if (index===bindings.length) return execute(selected);
              const ids=keys[bindings[index].keys];
              for(let offset=0;offset<ids.length;offset+=200) await chunks(index+1,[...selected,ids.slice(offset,offset+200)]);
            };
            await chunks(0,[]);
            return result;
          })(); bulk.set(cacheKey, pending);
        }
        // The enclosing cachedReads boundary clones once before exposing rows.
        return [(await pending).get(JSON.stringify(bindings.map(b=>b.id))) ?? [], []];
      };
    },
  });
  return wrapCache ? cachedReads(proxy) : proxy;
}
