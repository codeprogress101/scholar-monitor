import {describe,expect,it,vi} from "vitest";
import type {PoolConnection} from "mysql2/promise";
import {cachedReads} from "../server/read-cache";
import {publicationAward,publicationMember} from "../server/eligibility/publication-index";

describe("request-local official publication indexes",()=>{
  const snapshot={academicYearId:"year",masterlistId:"list",entries:[{scholarId:"person",snapshot:{scholarshipId:"annual"},awardNumber:"001"},{scholarId:"person",snapshot:{scholarshipId:"annual"},awardNumber:"duplicate"}]};
  it("parses a publication once, preserves first award and exact identity-pair membership",async()=>{
    const execute=vi.fn(async()=>[[{snapshot:JSON.stringify(snapshot),version:2,snapshot_hash:"hash",academic_year_id:"year",status:"published"}],[]]);
    const db=cachedReads({execute} as unknown as PoolConnection);
    expect(await publicationAward(db,"list","annual",true)).toBe("001");
    expect(await publicationAward(db,"list","missing",true)).toBe("");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(await publicationMember(db,"list","person","annual","year")).toMatchObject({member:true,version:2,snapshotHash:"hash"});
    expect(await publicationMember(db,"list","different","annual","year")).toMatchObject({member:false,version:2,snapshotHash:"hash"});
    expect(execute).toHaveBeenCalledTimes(2);
  });
  it("invalidates indexed snapshots after writes and isolates mutable returned values",async()=>{
    let version=1;
    const execute=vi.fn(async()=>[[{snapshot,version,snapshot_hash:"hash",academic_year_id:"year",status:"published"}],[]]);
    const db=cachedReads({execute} as unknown as PoolConnection);
    const first=await publicationMember(db,"list","person","annual","year");first!.version=99;
    expect((await publicationMember(db,"list","person","annual","year"))!.version).toBe(1);
    version=2;await db.execute("UPDATE masterlist_publications SET snapshot_hash='changed'");
    expect((await publicationMember(db,"list","person","annual","year"))!.version).toBe(2);
    expect((await publicationMember(cachedReads({execute} as unknown as PoolConnection),"list","person","annual","year"))!.version).toBe(2);
    expect(execute).toHaveBeenCalledTimes(4);
  });
  it("does not cache on a raw pooled connection and retains missing-publication semantics",async()=>{
    const execute=vi.fn(async()=>[[],[]]);const db={execute} as unknown as PoolConnection;
    expect(await publicationMember(db,"list","person","annual","year")).toBeUndefined();
    expect(await publicationMember(db,"list","person","annual","year")).toBeUndefined();
    expect(await publicationAward(db,null,"annual",false)).toBe("");
    expect(execute).toHaveBeenCalledTimes(3);
  });
  it("retains invalid-publication metadata without inspecting unusable membership arrays",async()=>{
    const execute=vi.fn(async()=>[[{snapshot:JSON.stringify({academicYearId:"other",masterlistId:"list"}),version:2,snapshot_hash:"hash",academic_year_id:"other",status:"published"}],[]]);
    const db=cachedReads({execute} as unknown as PoolConnection);
    expect(await publicationMember(db,"list","person","annual","year")).toMatchObject({member:false,version:2,snapshotHash:"hash"});
  });
});
