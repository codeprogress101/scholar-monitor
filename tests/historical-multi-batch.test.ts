import {randomUUID} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import type {PoolConnection} from 'mysql2/promise';
import {cachedReads} from '../server/read-cache';
import {historicalBatch,historicalMember,historicalOwnerBatch,historicalRoster} from '../server/payouts/historical-context';
import {historicalAppendSchema,validateHistoricalDates} from '../server/payouts/historical-append';
import {deadlineBoundary,submissionState,validateWindow} from '../server/payouts/submission-rules';

describe('independent historical source ownership',()=>{
 it('retains the earliest legacy root and indexes each batch scope without per-scholar SQL',async()=>{
  const cycle=randomUUID(),root=randomUUID(),second=randomUUID(),originalImport=randomUUID(),newImport=randomUUID();
  const members=Array.from({length:200},()=>({ownerId:randomUUID(),scholarId:randomUUID(),scholarshipId:randomUUID(),approvalId:randomUUID(),approvalRevision:1,sourceHash:'a'.repeat(64),masterlistId:randomUUID(),publicationHash:'b'.repeat(64),publicationVersion:1}));
  const execute=vi.fn(async()=>[[{cycle_id:cycle,batch_id:root,import_job_id:originalImport,revision:1,deadline:'2026-10-21',snapshot:{}},{cycle_id:cycle,batch_id:second,import_job_id:newImport,revision:2,deadline:'2026-10-23',snapshot:{format:'historical-multibatch/v1',semesterId:randomUUID(),importHash:'c'.repeat(64),scopeHash:'d'.repeat(64),members}}],[]]);
  const db=cachedReads({execute} as unknown as PoolConnection);
  expect((await historicalBatch(db,cycle))?.importId).toBe(originalImport);
  expect((await historicalBatch(db,cycle,second))?.importId).toBe(newImport);
  expect(await historicalRoster(db,cycle,root)).toBeUndefined();
  expect(await historicalRoster(db,cycle,second)).toEqual(members.map(m=>m.scholarId));
  for(const m of members){expect(await historicalMember(db,cycle,second,m.ownerId)).toEqual(m);expect(await historicalOwnerBatch(db,cycle,m.ownerId)).toBe(second);}
  expect(await historicalMember(db,cycle,second,randomUUID())).toBeUndefined();
  expect(execute).toHaveBeenCalledTimes(1);
 });
 it('fails closed on an unknown or malformed source format',async()=>{
  const execute=vi.fn(async()=>[[{batch_id:randomUUID(),snapshot:{format:'unreviewed'}}],[]]);
  await expect(historicalBatch(cachedReads({execute} as unknown as PoolConnection),randomUUID())).rejects.toMatchObject({code:'HISTORICAL_SCOPE_INVALID'});
 });
});

describe('historical dates and unchanged cutoff semantics',()=>{
 const input={opensOn:'2026-10-22',deadlineOn:'2026-10-23',reportedReleaseOn:'2026-10-23'};
 it('accepts evidenced nonoverlapping past windows and keeps today cutoff uncompleted',()=>{
  expect(()=>validateHistoricalDates(input,'2026-10-04','2027-02-21','2026-10-21','2026-10-24')).not.toThrow();
  expect(deadlineBoundary('2026-10-24')).toBe('2026-10-24T16:00:00.000Z');
  expect(submissionState('2026-10-24','2026-10-24','2026-10-24T15:59:59.999Z')).toBe('open');
  expect(submissionState('2026-10-24','2026-10-24','2026-10-24T16:00:00.000Z')).toBe('cutoff_reached');
 });
 it.each([{opensOn:'2026-10-21'},{deadlineOn:'2026-10-25',reportedReleaseOn:'2026-10-25'},{reportedReleaseOn:'2026-10-22'},{opensOn:'2026-10-24'}])('rejects unsupported date ordering %j',patch=>{
  expect(()=>validateHistoricalDates({...input,...patch},'2026-10-04','2027-02-21','2026-10-21','2026-10-24')).toThrow();
 });
 it('requires supported release date, authority, versions and scope hash',()=>{
  expect(historicalAppendSchema.safeParse({...input,reviewed:true}).success).toBe(false);
  expect(()=>validateWindow('2026-10-21','2026-10-23','2026-10-24',[{opensOn:'2026-10-04',cutoffOn:'2026-10-21'}])).toThrow();
 });
});
