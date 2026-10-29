export const MONITORING_LABELS = {
  potentially_graduating: "Potentially Graduating",
  expected: "Expected to Graduate",
  delayed: "Graduation Delayed / Continue Monitoring",
  graduated: "Graduated",
  cannot_determine: "Cannot Determine Automatically",
  not_final_year: "Not in confirmed final year",
} as const;
export type MonitoringIndicator = keyof typeof MONITORING_LABELS;
export type MonitoringChoice = { id: string; name: string };
export type MonitoringContext = {
  workingYearId: string | null;
  years: MonitoringChoice[];
  semesters: (MonitoringChoice & { academicYearId: string })[];
  schools: MonitoringChoice[];
  courses: MonitoringChoice[];
  choicesLimited: boolean;
  graduationWritesEnabled?: boolean;
};
export type MonitoringRow = {
  id: string; scholarId: string; name: string;
  school: string | null; course: string | null; yearLevel: string | null;
  provisional: boolean; durationYears: string | null;
  indicator: MonitoringIndicator; explanation: string;
  graduationRequestId: string | null;
};
export type MonitoringList = {
  items: MonitoringRow[]; total: number; offset: number; limit: number;
  academicYear: MonitoringChoice; semester: MonitoringChoice | null;
  durationSourceAvailable: boolean; reviewSourceAvailable: boolean;
};

// Explicit academic labels only; no inference from course names or age.
const words=['first','second','third','fourth','fifth','sixth'],romans=['i','ii','iii','iv','v','vi'];
export const LEVEL_LABELS:readonly (readonly string[])[]=Array.from({length:100},(_,index)=>{
 const n=index+1,last=n%10,suffix=n%100>=11&&n%100<=13?'th':last===1?'st':last===2?'nd':last===3?'rd':'th';
 return [String(n),n+suffix,n+suffix+' year','year '+n,...(words[index]?[words[index],words[index]+' year',romans[index],'year '+romans[index]]:[])];
});
export function normalizedMonitoringLevel(value:string|null):number|null {const i=LEVEL_LABELS.findIndex(labels=>labels.includes(value?.trim().toLowerCase()??''));return i<0?null:i+1;}
export function potentialIndicator(input:{yearLevel:string|null;approvedPlacement:boolean;applicableOfficialDurationYears:number|null;finalYearLevel:number|null}):MonitoringIndicator {
 const level=normalizedMonitoringLevel(input.yearLevel),final=input.finalYearLevel,duration=input.applicableOfficialDurationYears;
 if(!input.approvedPlacement||level===null||duration===null||duration<=0||final===null||!Number.isInteger(final)||final<1||final>100||level>final)return 'cannot_determine';
 return level===final?'potentially_graduating':'not_final_year';
}
