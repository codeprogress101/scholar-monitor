import { describe, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { candidateReads } from "../server/ovr/candidate-reads";
import {snapshotConnection} from "../server/authorization/read-snapshot";

async function fixture(n=2,snapshot=false) {
  const annuals=Array.from({length:n},(_,i)=>`annual-${i}`);
  const execute=vi.fn(async(sql:string, values:unknown[]=[]):Promise<[Record<string,unknown>[],unknown[]]>=>{
    const ids=[...new Set(values.filter(v=>typeof v==='string' && /^(annual|scholar)-/.test(v)))];
    if(sql.startsWith("SELECT id,scholar_id FROM scholarship_records"))return [ids.map(id=>({id,scholar_id:String(id).replace('annual','scholar')})),[]];
    if(sql.startsWith("SELECT id FROM academic_records"))return [ids.map(id=>({id:String(id).replace('scholar','academic')})),[]];
    if(sql.startsWith("SELECT id FROM scholar_semesters"))return [ids.map(id=>({id:String(id).replace('scholar','owner')})),[]];
    if(sql.startsWith("SELECT i.id FROM requirement_instances"))return [ids.map(id=>({id:String(id).replace('scholar','instance')})),[]];
    return [[],[]];
  });
  const source={execute,query:execute} as unknown as PoolConnection;
  const db=await candidateReads(snapshot?snapshotConnection(source):source,annuals,"semester");
  execute.mockClear();
  return {db,execute};
}

describe("candidate source batching inside one guarded projection",()=>{
  it("falls back to the full original coverage read when optional pair metadata exceeds its bound",async()=>{
    const {db,execute}=await fixture(2,true);
    execute.mockResolvedValueOnce([Array.from({length:20001},()=>({scholar_semester_id:'owner-0',requirement_instance_id:'instance-0'})),[]]);
    execute.mockResolvedValue([[{id:'kept',__candidate_key_0:'instance-1',__candidate_key_1:'owner-1'}],[]]);
    const sql='SELECT id FROM requirement_coverage WHERE scholar_semester_id=? AND requirement_instance_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE';
    expect((await db.execute(sql,['owner-1','instance-1']))[0]).toEqual([{id:'kept'}]);
    expect(execute.mock.calls[0][0]).toContain('LIMIT 20001');
    expect(execute.mock.calls[1][0]).toContain('scholar_semester_id IN (?,?) AND requirement_instance_id IN (?,?)');
  });
  it("keeps cross-owner coverage and history while skipping only proven empty chunk combinations",async()=>{
    const {db,execute}=await fixture(401,true);
    let revision=3;
    execute.mockImplementation(async(sql:string,values:unknown[]=[])=>{
      if(sql.startsWith('UPDATE')){revision=4;return [[],[]];}
      if(sql.startsWith('SELECT scholar_semester_id,requirement_instance_id'))return [values.includes('owner-0')?[{scholar_semester_id:'owner-0',requirement_instance_id:'instance-400'}]:[],[]];
      expect(values).toContain('owner-0');expect(values).toContain('instance-400');
      expect(sql).toContain('ORDER BY revision DESC');
      return [[{revision,__candidate_key_0:'instance-400',__candidate_key_1:'owner-0'},{revision:1,__candidate_key_0:'instance-400',__candidate_key_1:'owner-0'}],[]];
    });
    const sql='SELECT revision FROM requirement_coverage WHERE scholar_semester_id=? AND requirement_instance_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE';
    expect((await db.execute(sql,['owner-0','instance-400']))[0]).toEqual([{revision:3}]);
    expect((await db.execute(sql,['owner-400','instance-0']))[0]).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(4);
    revision=4;
    expect((await db.execute(sql,['owner-0','instance-400']))[0]).toEqual([{revision:3}]);
    await expect(db.query('UPDATE coverage SET revision=4')).rejects.toThrow('Snapshot projections may only read data.');
  });
  it("keeps each key's ordering/LIMIT, empty results, locking suffix and row isolation",async()=>{
    const {db,execute}=await fixture();
    execute.mockResolvedValue([[{revision:3,__candidate_key_0:"instance-0"},{revision:2,__candidate_key_0:"instance-0"}],[]]);
    const sql="SELECT revision FROM requirement_workflow_events WHERE instance_id=? ORDER BY version DESC LIMIT 1 FOR UPDATE";
    const [rows]=await db.execute(sql,["instance-0"]);
    expect(rows).toEqual([{revision:3}]);
    (rows as {revision:number}[])[0].revision=999;
    expect((await db.execute(sql,["instance-0"]))[0]).toEqual([{revision:3}]);
    expect((await db.execute(sql,["instance-1"]))[0]).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toContain("ORDER BY version DESC FOR UPDATE");
    expect(execute.mock.calls[0][0]).not.toContain("LIMIT 1");
    expect(execute.mock.calls[0][1]).toEqual(["instance-0","instance-1"]);
  });
  it("groups compound owner/document predicates without changing either constraint",async()=>{
    const {db,execute}=await fixture();
    execute.mockResolvedValue([[{id:"coverage",__candidate_key_0:"instance-0",__candidate_key_1:"owner-0"}],[]]);
    const sql="SELECT id FROM requirement_coverage WHERE scholar_semester_id=? AND requirement_instance_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE";
    expect((await db.execute(sql,["owner-0","instance-0"]))[0]).toEqual([{id:"coverage"}]);
    expect((await db.execute(sql,["owner-1","instance-1"]))[0]).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][1]).toEqual(["owner-0","owner-1","instance-0","instance-1"]);
    expect(execute.mock.calls[0][0]).toContain("scholar_semester_id IN (?,?) AND requirement_instance_id IN (?,?)");
    expect(execute.mock.calls[0][0]).toMatch(/LOCK IN SHARE MODE$/);
  });
  it("preserves repeated OR ownership parameters and receiving semester",async()=>{
    const {db,execute}=await fixture();
    execute.mockResolvedValue([[{id:"doc",__candidate_key_0:"scholar-0"}],[]]);
    const sql="SELECT i.id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id LEFT JOIN scholarship_records a ON a.id=c.scholarship_record_id LEFT JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id WHERE c.semester_id=? AND (a.scholar_id=? OR ss.scholar_id=?) ORDER BY i.id";
    expect((await db.execute(sql,["semester","scholar-0","scholar-0"]))[0]).toEqual([{id:"doc"}]);
    expect((await db.execute(sql,["semester","scholar-1","scholar-1"]))[0]).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][1]).toEqual(["semester","scholar-0","scholar-1","scholar-0","scholar-1"]);
  });
  it("uses bounded chunks beyond 200 keys and keeps a fixed batch parameter",async()=>{
    const {db,execute}=await fixture(401);
    const sql="SELECT revision FROM payroll_draft_deferrals WHERE batch_id=? AND scholarship_id=? ORDER BY revision DESC LIMIT 1";
    await db.execute(sql,["batch","annual-0"]);await db.execute(sql,["batch","annual-400"]);
    expect(execute).toHaveBeenCalledTimes(3);
    for(const [,params] of execute.mock.calls){expect(params![0]).toBe("batch");expect(params!.length).toBeLessThanOrEqual(201);}
  });
  it("invalidates source groups on every write, including through query",async()=>{
    const {db,execute}=await fixture();
    const sql="SELECT revision FROM requirement_workflow_events WHERE instance_id=? ORDER BY version";
    execute.mockResolvedValue([[{revision:1,__candidate_key_0:"instance-0"}],[]]);
    expect((await db.execute(sql,["instance-0"]))[0]).toEqual([{revision:1}]);
    await db.query("UPDATE requirement_instances SET status='submitted' WHERE id=?",["instance-0"]);
    execute.mockResolvedValue([[{revision:2,__candidate_key_0:"instance-0"}],[]]);
    expect((await db.execute(sql,["instance-0"]))[0]).toEqual([{revision:2}]);
    expect(execute).toHaveBeenCalledTimes(3);
  });
  it("ignores nested predicates and question marks in SQL literals when binding parameters",async()=>{
    const {db,execute}=await fixture();
    execute.mockResolvedValue([[{id:"instance-0",__candidate_key_0:"instance-0"}],[]]);
    const sql="SELECT (SELECT '?' FROM other WHERE id=?) AS detail,i.id FROM requirement_instances i WHERE i.id=? FOR UPDATE";
    expect((await db.execute(sql,["fixed","instance-0"]))[0]).toEqual([{id:"instance-0"}]);
    expect(execute.mock.calls[0][1]).toEqual(["fixed","instance-0","instance-1"]);
    expect(execute.mock.calls[0][0]).toContain("SELECT '?' FROM other WHERE id=?");
  });
  it("falls back for unknown query shapes, unknown IDs, unequal OR identities and clocks",async()=>{
    const {db,execute}=await fixture();
    await db.execute("SELECT id FROM unrelated WHERE instance_id=?",["instance-0"]);
    await db.execute("SELECT id FROM requirement_workflow_events WHERE instance_id=?",["outside"]);
    await db.execute("SELECT COUNT(*) n FROM requirement_workflow_events WHERE instance_id=?",["instance-0"]);
    await db.execute("SELECT IFNULL(COUNT(*),0) n FROM requirement_workflow_events WHERE instance_id=?",["instance-0"]);
    await db.execute("SELECT id FROM requirement_workflow_events WHERE instance_id=? OR version=1",["instance-0"]);
    await db.execute("SELECT id FROM requirement_workflow_events WHERE instance_id=? LIMIT 1 OFFSET 1",["instance-0"]);
    await db.execute("SELECT i.id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id LEFT JOIN scholarship_records a ON a.id=c.scholarship_record_id LEFT JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id WHERE c.semester_id=? AND (a.scholar_id=? OR ss.scholar_id=?) ORDER BY i.id",["semester","scholar-0","scholar-1"]);
    await db.query("SELECT UTC_TIMESTAMP() AS day");await db.query("SELECT UTC_TIMESTAMP() AS day");
    expect(execute).toHaveBeenCalledTimes(9);
    expect(execute.mock.calls[0]).toEqual(["SELECT id FROM unrelated WHERE instance_id=?",["instance-0"]]);
  });
});
