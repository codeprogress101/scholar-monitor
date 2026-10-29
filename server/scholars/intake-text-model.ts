export type SuppliedText = {schoolText:string|null;courseText:string|null};
export type TextState = SuppliedText & {revision:number;snapshotHash:string|null};
export type TextEvent = TextState & {intakeId:string;action:'registered'|'completed'|'corrected';basisIntakeRevision:number;basisIntakeHash:string;sourceReference:string;reason:string;actorId:string;recordedAt:string};
export const absentText = ():TextState=>({revision:0,snapshotHash:null,schoolText:null,courseText:null});
/** Do not trim or normalize an accepted nonblank statement. */
export function validSuppliedText(value:unknown):boolean {
 return value===null||typeof value==='string'&&Array.from(value).length<=300&&!/[\p{Cc}\u202a-\u202e\u2066-\u2069\p{Cs}]/u.test(value);
}
export function blankSuppliedText(value:unknown):unknown {return value===undefined||typeof value==='string'&&validSuppliedText(value)&&/^\s*$/u.test(value)?null:value;}
