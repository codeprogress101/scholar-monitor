import { scholarIssueAction } from "./scholar-issue-navigation";

export default function ScholarIssueAction({ code, scholarId, yearId, semesterId, payoutCycleId }: { code: string; scholarId: string; yearId: string; semesterId?: string; payoutCycleId?: string }) {
  const action = scholarIssueAction(code, scholarId, yearId, semesterId, payoutCycleId);
  return <span className="scholar-issue-action"><a href={action.href}>{action.label}</a>{action.role && <small>{action.role}</small>}</span>;
}
