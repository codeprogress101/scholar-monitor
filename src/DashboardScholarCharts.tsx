import type {AnnualOverview} from '../server/dashboard/overview';
import {outcomeShare} from './DashboardCharts';

export const classificationPercent=(count:number,total:number)=>`${(100*outcomeShare(count,total)).toLocaleString(undefined,{maximumFractionDigits:2})}%`;

export function ClassificationChart({data}:{data:AnnualOverview}) {
 const groups=[{label:'New',count:data.new,color:'#285e45'},{label:'Continuing',count:data.continuing,color:'#85aa91'},{label:'Unknown',count:data.unknown,color:'#cbd1d8'}];
 const radius=56,circumference=2*Math.PI*radius;
 return <section className="d1-panel d12-classification" aria-labelledby="d12-classification-title">
  <header><div><p className="d1-overline">Selected academic year · all statuses</p><h2 id="d12-classification-title">Scholar classification</h2></div></header>
  <div className="d12-classification-body"><svg viewBox="0 0 150 150" className="d12-classification-donut" aria-hidden="true">
   <circle cx="75" cy="75" r={radius} fill="none" stroke="#edf0ed" strokeWidth="14"/>
   {groups.map((group,index)=>{const arc=circumference*outcomeShare(group.count,data.total),start=circumference*groups.slice(0,index).reduce((sum,g)=>sum+outcomeShare(g.count,data.total),0);return group.count>0?<circle key={group.label} cx="75" cy="75" r={radius} fill="none" stroke={group.color} strokeWidth="14" strokeDasharray={`${arc} ${circumference-arc}`} strokeDashoffset={-start} transform="rotate(-90 75 75)"/>:null;})}
   <text x="75" y="72" textAnchor="middle" className="d1-donut-number">{data.total.toLocaleString()}</text><text x="75" y="92" textAnchor="middle" className="d1-donut-label">scholars</text>
  </svg><dl className="d12-classification-counts">{groups.map(group=><div key={group.label}><dt><span className="d12-key" style={{backgroundColor:group.color}} aria-hidden="true"/>{group.label}</dt><dd>{group.count.toLocaleString()} <span className="d13-percent">{classificationPercent(group.count,data.total)}</span></dd></div>)}</dl></div>
  {data.total===0&&<p className="d1-empty">No associated scholars in this year.</p>}
  <p className="d1-caption">Annual classification, not admission approval.</p>
 </section>;
}

export function YearLevelChart({data}:{data:AnnualOverview}) {
 const primary=data.academic.levels.filter(group=>group.level!==null&&group.level<=5);
 const supplementary=data.academic.levels.filter(group=>group.level===null||group.level>5);
 const otherCount=supplementary.reduce((total,group)=>total+group.count,0);
 const rows=(groups:typeof primary)=><dl className="d12-level-list">{groups.map(group=><div key={group.label}>
  <dt>{group.label}</dt><dd><svg viewBox="0 0 1000 10" preserveAspectRatio="none" aria-hidden="true"><rect width={1000*outcomeShare(group.count,data.total)} height="10" fill={group.level===null?'#a1aaa4':'#397457'}/></svg><span>{group.count.toLocaleString()}</span></dd>
 </div>)}</dl>;
 return <section className="d1-panel d12-year-levels" aria-labelledby="d12-year-title">
  <header><div><p className="d1-overline">Selected-year academic records</p><h2 id="d12-year-title">Scholars by year level</h2></div></header>
  {rows(primary)}
  {otherCount>0&&<details className="d1-scope d13-other-levels"><summary>Other / Unknown levels ({otherCount.toLocaleString()})</summary>{rows(supplementary)}</details>}
  <details className="d1-scope"><summary>Year-level source</summary><p>Existing academic placement and its latest approved correction. Missing or unrecognized levels are Unknown. Initial registration wording is not substituted. Year 7+ groups recognized levels 7–100. A year level does not establish graduation eligibility.</p></details>
 </section>;
}

export default function DashboardScholarCharts({data}:{data:AnnualOverview}) {
 return <div className="d12-scholar-charts" data-scholar-charts-ready="true"><ClassificationChart data={data}/>{data.academic?<YearLevelChart data={data}/>:<section className="d1-panel"><h2>Scholars by year level</h2><p role="alert">Year-level data is unavailable. Refresh to retry.</p></section>}</div>;
}
