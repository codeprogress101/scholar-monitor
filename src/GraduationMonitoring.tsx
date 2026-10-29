import type {Session} from './auth-api';
import GraduationReview from './GraduationReview';
import ProgramDurationReview from './ProgramDurationReview';
import {graduationRoute,graduationPanelAddress,closeGraduationPanel,rememberGraduationFocus,restoreGraduationFocus} from './graduation-navigation';
import { useEffect, useState, type FormEvent } from "react";
import type { Access } from "../server/authorization/policy";
import { MONITORING_LABELS, type MonitoringContext, type MonitoringList, type MonitoringRow } from "../server/scholars/graduation-monitoring-model";
import { configurationRequest as request } from "./configuration-api";
import { ApiError } from "./auth-api";
import { scholarAddress } from "./scholar-navigation";

export function MonitoringTable({data,permissions}:{data:MonitoringList;permissions:readonly string[]}) {
  const canReview=permissions.includes('scholarship.status.request')||permissions.includes('scholarship.status.approve');
  return <div className="table-responsive graduation-table-scroll" role="region" aria-label="Graduation monitoring scholars" tabIndex={0} onFocusCapture={e=>{if(e.target!==e.currentTarget)e.target.scrollIntoView({block:"nearest",inline:"nearest"});}}>
    <table className="table table-hover graduation-table">
      <caption className="visually-hidden">Graduation monitoring for {data.academicYear.name}. Indicators do not change standing or benefits.</caption>
      <thead><tr>{['Scholar / permanent ID','School / course','Year / duration','Monitoring status','Actions'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{data.items.map((row:MonitoringRow)=><tr key={row.id}>
        <th scope="row"><a href={scholarAddress(row.id,'overview',data.academicYear.id)}>{row.name}</a><small>{row.scholarId}</small></th>
        <td>{row.school??'School not supplied'}<small>{row.course??'Course not supplied'}</small>{row.provisional&&<small>Initial facts; academic review needed</small>}</td>
        <td>{row.yearLevel??'Not supplied'}<small title={row.durationYears===null?'Unknown — reference needed':undefined}>{row.durationYears===null?'Duration unknown':`${row.durationYears} years`}</small></td>
        <td><strong className={`monitoring-indicator monitoring-${row.indicator}`} title={MONITORING_LABELS[row.indicator]}><span aria-hidden="true">{row.indicator==='cannot_determine'?'Cannot determine':row.indicator==='delayed'?'Delayed / monitor':MONITORING_LABELS[row.indicator]}</span><span className="visually-hidden">{MONITORING_LABELS[row.indicator]}</span></strong><details className="monitoring-row-details"><summary>Status details</summary><p>{row.explanation}</p></details></td>
        <td><div className="monitoring-row-actions" role="group" aria-label={`Actions for ${row.scholarId}`}><a className="btn btn-sm configuration-primary" aria-label={`Review monitoring evidence for ${row.scholarId}`} id={"graduation-review-"+row.id} href={graduationPanelAddress((typeof window==="undefined"?"#scholars?task=graduation":window.location.hash)+(typeof window==="undefined"||!new URLSearchParams(window.location.hash.split('?')[1]).has('academicYearId')?'&academicYearId='+data.academicYear.id:''),"review",row.id)}>Review</a><a className="btn btn-sm btn-outline-secondary" aria-label={`Review academic record for ${row.scholarId}`} href={scholarAddress(row.id,'academic',data.academicYear.id)}>Academic</a>{canReview&&<a className="btn btn-sm btn-outline-secondary" aria-label={`Review scholarship standing for ${row.scholarId}`} href={scholarAddress(row.id,'scholarship',data.academicYear.id)}>Standing</a>}</div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export default function GraduationMonitoring({access,session}:{access:Access|null;session?:Session}) {
  const route=new URLSearchParams(window.location.hash.split('?')[1]);
  const panel=graduationRoute(window.location.hash);
  const [context,setContext]=useState<MonitoringContext|null>(null),[data,setData]=useState<MonitoringList|null>(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  const [year,setYear]=useState(route.get('academicYearId')??''),[semester,setSemester]=useState(route.get('semesterId')??'');
  const [search,setSearch]=useState(route.get('q')??''),[filter,setFilter]=useState(route.get('filter')??'final_year_review');
  const [school,setSchool]=useState(route.get('schoolId')??''),[course,setCourse]=useState(route.get('courseId')??'');
  const [sort,setSort]=useState(route.get('sort')??'name'),[direction,setDirection]=useState(route.get('direction')??'asc'),[limit,setLimit]=useState(route.get('limit')??'25');
  const canRead=access?.permissions.some(p=>p.code==='scholars.read')??false;
  const routeQuery=route.toString();
  useEffect(()=>{
    if(!canRead)return;
    const controller=new AbortController();let active=true;
    void (async()=>{
      const options=await request<MonitoringContext>('scholars/graduation-monitoring/context',{signal:controller.signal});
      if(!active)return;setContext(options);
      const params=graduationRoute('#scholars?'+routeQuery).query;
      const selected=params.get('academicYearId')??options.workingYearId;
      if(!selected)throw new Error('The working academic year is unavailable. Select an academic year to continue.');
      params.set('academicYearId',selected);
      if(!params.has('filter'))params.set('filter','final_year_review');
      setYear(value=>value||selected);
      const rows=await request<MonitoringList>(`scholars/graduation-monitoring?${params}`,{signal:controller.signal});
      if(active)setData(rows);
    })().catch((e:unknown)=>{if(active)setError(e instanceof ApiError?e.message:e instanceof Error?e.message:'Graduation monitoring could not be loaded. Retry the read.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;controller.abort();};
  // The URL owns committed filters; editable form values do not start new reads.
  },[canRead,routeQuery,revision]);

  useEffect(()=>{if(data&&!loading&&!panel.review&&!panel.duration)restoreGraduationFocus();},[data,loading,panel.review,panel.duration]);
  function closePanel(){rememberGraduationFocus(panel.review?'graduation-review-'+panel.review:'graduation-duration-action');window.location.hash=closeGraduationPanel(window.location.hash);}
  function navigate(offset:number,submit=false){
    const params=submit?new URLSearchParams({task:'graduation',academicYearId:year,filter,sort,direction,limit,offset:'0'}):new URLSearchParams(window.location.hash.split('?')[1]);
    if(submit){for(const [key,value]of Object.entries({semesterId:semester,q:search.trim(),schoolId:school,courseId:course}))if(value)params.set(key,value);}
    else {params.set('academicYearId',data!.academicYear.id);params.set('offset',String(offset));}
    const hash='#scholars?'+params.toString();if(window.location.hash===hash)setRevision(v=>v+1);else window.location.hash=hash;
  }
  function submit(event:FormEvent){event.preventDefault();navigate(0,true);}
  function refresh(){setLoading(true);setError('');setData(null);setRevision(v=>v+1);}
  if(!canRead)return <p role="alert">Graduation Monitoring requires scholar-record access. System Administrator access alone does not grant Registry authority.</p>;
  const activeSemesters=context?.semesters.filter(s=>s.academicYearId===year)??[];
  return <section className="graduation-monitoring" aria-labelledby="graduation-monitoring-title">
    <div className="d-flex justify-content-between flex-wrap gap-2 align-items-start"><div><h1 id="graduation-monitoring-title" tabIndex={-1}>Graduation Monitoring</h1><p>Review candidates and supported evidence.</p></div><button className="btn btn-outline-secondary" disabled={loading} onClick={refresh} aria-label="Refresh monitoring">Refresh</button></div>
    <div className="graduation-help"><details><summary>How indicators work</summary><p>Indicators use reviewed academic and program information. Expected and Delayed need recorded evidence. Unknown or changed sources need review. Monitoring does not approve graduation or change standing, continuation or payments. Semester selects review context; placement is the current approved annual record, not a past semester snapshot. Open the profile for history.</p></details><a id="graduation-duration-action" className="btn btn-outline-secondary" href={graduationPanelAddress(window.location.hash,'duration','catalog')} aria-label="Program duration references">Duration sources</a></div>
    {panel.invalid&&<p role="alert">This review link is invalid. Open a review from the matching row.</p>}
    <form onSubmit={submit} className="graduation-filters" aria-label="Graduation monitoring filters">
      <label>Academic year<select className="form-select" required value={year} onChange={e=>{setYear(e.target.value);setSemester('');}}><option value="">Select academic year</option>{context?.years.map(y=><option key={y.id} value={y.id}>{y.name}{y.id===context.workingYearId?' (working year)':''}</option>)}</select></label>
      <label>Semester context<select className="form-select" value={semester} onChange={e=>setSemester(e.target.value)}><option value="">All semesters — annual placement</option>{activeSemesters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Search name or Scholar ID<input className="form-control" type="search" maxLength={160} value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label>Graduation-monitoring filter<select className="form-select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="final_year_review">Final-Year Review Candidates (Years IV / V)</option><option value="all">All associated scholars</option><option value="unknown_duration">Unknown duration</option><option value="needs_review">Needs review</option><option value="follow_up">Follow-up recorded</option>{Object.entries(MONITORING_LABELS).filter(([key])=>key!=='not_final_year').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <button className="btn btn-primary align-self-end" disabled={loading||!year}>Apply filters</button>
      <details className="graduation-extra-filters"><summary>More filters{(school||course||sort!=='name'||direction!=='asc'||limit!=='25')?' (active)':''}</summary><div className="graduation-extra-fields">
      <label>School<select className="form-select" value={school} onChange={e=>setSchool(e.target.value)}><option value="">All schools</option>{context?.schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Course<select className="form-select" value={course} onChange={e=>setCourse(e.target.value)}><option value="">All courses</option>{context?.courses.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Sort by<select className="form-select" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Name</option><option value="scholarId">Scholar ID</option><option value="yearLevel">Year level</option></select></label>
      <label>Direction<select className="form-select" value={direction} onChange={e=>setDirection(e.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
      <label>Rows per page<select className="form-select" value={limit} onChange={e=>setLimit(e.target.value)}>{[25,50,100].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      </div></details>
    </form>
    {context?.choicesLimited&&<p>Reference choices are limited to 100 per list. An older context can still be opened by its explicit supported URL.</p>}
    {error&&<div role="alert" className="alert alert-danger">{error} <button className="btn btn-outline-secondary" onClick={refresh}>Retry monitoring</button></div>}
    {loading&&<p role="status">Loading graduation monitoring…</p>}
    {!loading&&data&&<>
      <p className="mb-1"><strong>{data.academicYear.name}</strong> · {data.semester?.name??'All semesters — annual placement'}.</p>
      <p className="monitoring-placement-note">Placement: current annual record</p>
      <p role="status" aria-atomic="true">{data.total} scholars match. {data.items.length?`Showing ${data.offset+1}–${Math.min(data.offset+data.items.length,data.total)}.`:data.total?'No scholars on this page.':''}</p>
      {data.items.length?<MonitoringTable data={data} permissions={access?.permissions.map(p=>p.code)??[]}/>:<p className="alert alert-info">{data.total?'This page is beyond the matching results. Apply filters to return to the first page.':'No scholars match this review. Change the filters or academic year. Check the selected context and source review filters.'}</p>}
      <nav className="d-flex flex-wrap gap-2 align-items-center mt-3" aria-label="Graduation monitoring pagination"><button className="btn btn-outline-secondary" disabled={data.offset===0} onClick={()=>navigate(Math.max(0,data.offset-data.limit))}>Previous page</button><span>Page {Math.floor(data.offset/data.limit)+1}</span><button className="btn btn-outline-secondary" disabled={data.offset+data.items.length>=data.total} onClick={()=>navigate(data.offset+data.limit)}>Next page</button></nav>
    </>}
    {session&&data&&panel.review&&<GraduationReview session={session} person={panel.review} year={data.academicYear.id} semester={data.semester?.id??null} permissions={access?.permissions.map(p=>p.code)??[]} onClose={closePanel}/>}
    {session&&context&&panel.duration&&<ProgramDurationReview session={session} id={panel.duration} context={context} permissions={access?.permissions.map(p=>p.code)??[]} onClose={closePanel}/>}
  </section>;
}
