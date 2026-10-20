import {describe,it,expect} from 'vitest';
import {assertLaunch,assertMigrationHistory,backupHealth,expectedPending,coursePendingMigration,priorBatchMigration,inside} from '../deployment/office-release/release-lib.mjs';

describe('office release safeguards',()=>{
  it('allows only the exact prior-batch migration from the installed 54-migration baseline',()=>{
    const baseline=Array.from({length:54},(_,i)=>({version:String(i),checksum:'same'}));
    const candidate=[...baseline,{version:priorBatchMigration,checksum:'new'}];
    expect(assertMigrationHistory(baseline,candidate)).toEqual([priorBatchMigration]);
    expect(assertMigrationHistory(candidate,candidate)).toEqual([]);
    expect(()=>assertMigrationHistory(baseline.slice(1),candidate)).toThrow();
    expect(()=>assertMigrationHistory(baseline,[...baseline,{version:'unexpected.sql',checksum:'new'}])).toThrow();
    expect(()=>assertMigrationHistory([{...baseline[0],checksum:'changed'},...baseline.slice(1)],candidate)).toThrow();
  });
  it('allows only the exact additive course-pending migration from the installed baseline',()=>{
    const baseline=Array.from({length:53},(_,i)=>({version:String(i),checksum:'same'}));
    const candidate=[...baseline,{version:coursePendingMigration,checksum:'new'}];
    expect(assertMigrationHistory(baseline,candidate)).toEqual([coursePendingMigration]);
    expect(assertMigrationHistory(candidate,candidate)).toEqual([]);
    expect(()=>assertMigrationHistory(baseline.slice(1),candidate)).toThrow();
  });
  it('rejects outside or root paths',()=>{
    expect(inside('C:/ProgramData/LDSSProduction','C:/ProgramData/LDSSProduction')).toBe(false);
    expect(inside('C:/ProgramData/LDSSProduction','C:/ProgramData/LDSSProduction/../other')).toBe(false);
    expect(inside('C:/ProgramData/LDSSProduction','C:/ProgramData/LDSSProduction/release-20261019')).toBe(true);
  });
  it('rejects a mismatched or unexpected migration set',()=>{
    const base=Array.from({length:48},(_,i)=>({version:String(i),checksum:'same'}));
    const all=[...base,...expectedPending.map((version:string)=>({version,checksum:'new'}))];
    expect(assertMigrationHistory(base,all)).toEqual(expectedPending);
    expect(()=>assertMigrationHistory([{...base[0],checksum:'changed'},...base.slice(1)],all)).toThrow();
    expect(()=>assertMigrationHistory(base,all.slice(1))).toThrow();
    expect(assertMigrationHistory(all,all)).toEqual([]);
  });
  it('requires artifact-bound named approval and an after-hours window',()=>{
    const start=Date.parse('2026-10-19T18:00:00+08:00');
    const approved={coordinator:'Coordinator Name',technicalOwner:'Technical Name',pilotStaff:'Staff Name',clientPCs:['PC1','PC2'],manifestSha256:'hash',maintenanceApproved:true,windowStart:new Date(start).toISOString(),windowEnd:new Date(start+3600000).toISOString(),keepLANData:true};
    expect(()=>assertLaunch(approved,'hash',start)).not.toThrow();
    expect(()=>assertLaunch(approved,'other',start)).toThrow();
    expect(()=>assertLaunch(approved,'hash',start-1)).toThrow();
    expect(()=>assertLaunch({...approved,coordinator:'PENDING'},'hash',start)).toThrow();
    expect(()=>assertLaunch({...approved,windowEnd:new Date(start+3*3600000).toISOString()},'hash',start)).toThrow();
  });
  it('does not equate desktop staging or a fresh confirmation with fresh off-host data',()=>{
    const now=Date.parse('2026-10-19T12:00:00Z');
    const current={lastBackup:new Date(now-60000).toISOString(),lastStaged:new Date(now).toISOString()};
    expect(backupHealth(current,null,now).breached).toBe(true);
    const proof={sha256:'a'.repeat(64),confirmedBy:'Operator',offHostLocation:'Independent workstation',confirmedAt:new Date(now).toISOString(),backupCreatedAt:new Date(now-5*3600000).toISOString()};
    expect(backupHealth(current,proof,now).breached).toBe(true);
    expect(backupHealth(current,{...proof,backupCreatedAt:new Date(now-60000).toISOString()},now).breached).toBe(false);
  });
  it('allows daytime cutover only with explicit approval and confirmed sign-out',()=>{
    const now=Date.parse('2026-10-19T09:25:00+08:00');
    const launch={coordinator:'Coordinator Name',technicalOwner:'Technical Name',pilotStaff:'Staff Name',clientPCs:['PC1','PC2'],manifestSha256:'hash',maintenanceApproved:true,windowStart:new Date(now).toISOString(),windowEnd:new Date(now+2*3600000).toISOString(),keepLANData:true};
    expect(()=>assertLaunch(launch,'hash',now)).toThrow('Explicit daytime maintenance approval required');
    expect(()=>assertLaunch({...launch,allowDaytimeMaintenance:true},'hash',now)).toThrow('All LAN users must be signed out');
    const signedOut={...launch,allowDaytimeMaintenance:true,usersSignedOutConfirmed:true};
    expect(()=>assertLaunch(signedOut,'hash',now)).toThrow('Daytime approval evidence required');
    expect(()=>assertLaunch({...signedOut,daytimeApprovalReference:'User requested immediate maintenance and confirmed all LAN users signed out'},'hash',now)).not.toThrow();
    expect(()=>assertLaunch({...signedOut,daytimeApprovalReference:'User confirmed daytime maintenance'},'other',now)).toThrow('Approval belongs to another artifact');
    expect(()=>assertLaunch({...signedOut,daytimeApprovalReference:'User confirmed daytime maintenance'},'hash',now+2*3600000)).toThrow('Outside approved maintenance window');
  });
});
