import { scholarIssueAction } from "./scholar-issue-navigation";

export default function ScholarIssueAction({ code, scholarId, yearId, semesterId, payoutCycleId,permissions }: { code: string; scholarId: string; yearId: string; semesterId?: string; payoutCycleId?: string;permissions?:string[] }) {
  const action = scholarIssueAction(code, scholarId, yearId, semesterId, payoutCycleId);
  const required=action.permissions??(action.role==='Coordinator approval required'?['scholarship.status.approve']:['scholars.read']);
  const canOpen=!permissions||required.every(p=>permissions.includes(p));
  return <span className="scholar-issue-action">{action.href&&canOpen?<a href={action.href}>{action.label}</a>:<span>{action.label}</span>}{action.explanation&&<small>{action.explanation}</small>}{action.role && <small>{action.role}</small>}</span>;
}
