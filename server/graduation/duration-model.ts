import type {z} from 'zod';
import type {durationFacts,durationCreate,durationAppend,reviewContext,source} from './duration-validation.js';
export type DurationFacts=z.infer<typeof durationFacts>;
export type EvidenceSource=z.infer<typeof source>;
export type ReviewContext=z.infer<typeof reviewContext>;
export type DurationCreate=z.infer<typeof durationCreate>;
export type DurationAppend=z.infer<typeof durationAppend>;
export type DurationState='proposed'|'confirmed'|'rejected'|'withdrawn'|'disputed'|'retired';
export type DurationSnapshot={format:'program-duration/v1';id:string;schoolId:string;courseId:string;revision:number;state:DurationState;facts:DurationFacts;scopeDatesHash:string;decisionReference?:string|null};
export type EventView<T>={snapshot:T;snapshotHash:string;beforeHash:string|null;actorId:string;recordedAt:string;reason:string;action:string};
export type DurationView=EventView<DurationSnapshot>;
export type DurationReview={current:DurationView;reviewSourceHash:string;conflicts:string[];reviewContext:ReviewContext;usageCount:number;usagePreview:{caseId:string;scholarId:string;permanentId:string;academicYearId:string;semesterId:string|null}[]};
export function durationTransition(state:DurationState,action:DurationAppend['action']):DurationState|null {
 if(state==='retired')return null;
 if(action==='propose_correction')return 'proposed';
 if(action==='retire')return 'retired';
 if(action==='dispute')return state==='confirmed'?'disputed':null;
 if(action==='withdraw')return state==='proposed'?'withdrawn':null;
 if(action==='confirm')return ['proposed','disputed'].includes(state)?'confirmed':null;
 return ['proposed','disputed'].includes(state)?'rejected':null;
}
export function scopesOverlap(a:{start:string;end:string;curriculum:string|null;cohort:string|null},b:typeof a){return a.start<=b.end&&b.start<=a.end&&(!a.curriculum||!b.curriculum||a.curriculum===b.curriculum)&&(!a.cohort||!b.cohort||a.cohort===b.cohort);}
