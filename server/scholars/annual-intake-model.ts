import type {TextState,TextEvent} from './intake-text-model.js';
export type IntakeClass = "new" | "continuing";
export type InitialPlacement = { schoolId: string | null; courseId: string | null; yearLevel: string | null };
export type AnnualIntake = {
 id: string; scholarId: string; academicYearId: string; revision: number; snapshotHash: string;
 classification: IntakeClass; originalClassification: IntakeClass; sourceKind: "manual" | "import";
 sourceReference: string | null; rootSourceReference: string | null; importJobId: string | null; sourceRow: number | null;
 initialPlacement: InitialPlacement; missingInitialFields: (keyof InitialPlacement)[];
 actorId: string; recordedAt: string; basis: "supplied";
};
export type IntakeHistory = { revision: number; action: "registered" | "supplement_initial_details" | "correct_classification"; snapshot: AnnualIntake; reason: string | null; actorId: string; recordedAt: string };
export type RegistrationContext = { workingContext: {settingId:string;settingVersion:number;academicYearVersion:number}; academicYear: {id:string;code:string;name:string} };
export type RegistrationResult = {id:string;scholarId:string;version:number;annualIntake:AnnualIntake;registrationOnly:true;suppliedText?:TextState};
export type IntakeView = { intake:AnnualIntake; suppliedText:TextState;initialSuppliedText:TextEvent|null;academicYearVersion:number; periodUnavailable:boolean; canSupplement:boolean; established:{academicRecords:number;annualRecords:number;publications:number;entitlements:number} };
