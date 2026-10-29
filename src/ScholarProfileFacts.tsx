import type {ScholarDetail} from '../server/scholars/model';
export default function ScholarProfileFacts({person,yearId}:{person:ScholarDetail;yearId:string}) {
 const p=person.placement;
 if(!p||p.academicYearId!==yearId)return <p className="small">Selected-year placement and classification are not loaded here. Review the current tab or Academic placement below.</p>;
 return <dl className="u1-profile-facts" aria-label="Selected-year scholar facts">
  <div><dt>Classification</dt><dd>{p.classification==='new'?'New':p.classification==='continuing'?'Continuing':'Not recorded'}</dd></div>
  <div><dt>{p.provisional?'Initial school (provisional)':'School'}</dt><dd>{p.school??'Not recorded'}</dd></div>
  <div><dt>{p.provisional?'Initial course (provisional)':'Course'}</dt><dd>{p.course??'Not recorded'}</dd></div>
  <div><dt>Year level{p.provisional?' (provisional)':''}</dt><dd>{p.yearLevel??'Not recorded'}</dd></div>
  <div><dt>Standing</dt><dd>{p.scholarshipStanding??'Not recorded'}</dd></div>
 </dl>;
}
