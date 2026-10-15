export default function AdminGuide() {
  return <section aria-label="System Administrator walkthrough">
    <h2>System administration</h2>
    <p>Set up the shared records that Staff and Coordinators use.</p>
    <nav className="task-grid" aria-label="Administration tasks">
      <a href="#configuration?category=academic-years"><strong>1. Academic calendar</strong><span>Review the year, then configure its first and second semesters.</span></a>
      <a href="#requirements"><strong>2. Required documents</strong><span>Set up individual COR and COG definitions for semester receiving.</span></a>
      <a href="#payouts"><strong>3. Payroll setup</strong><span>Prepare the semester's cycle. The Coordinator handles operational opening and approvals.</span></a>
      <a href="#access"><strong>Roles & permissions</strong><span>Inspect account access and role responsibilities.</span></a>
      <a href="#status"><strong>System health</strong><span>Check the connection and installed database structure.</span></a>
    </nav>
    <details className="secondary-details"><summary>Administrator walkthrough</summary>
      <ol>
        <li><strong>Check existing records first.</strong> Use Academic calendar to review the year and its dates. Retain old years for history. Do not create another working year while the current year's two semesters are unfinished.</li>
        <li><strong>Set semester dates.</strong> Under Semesters, use the same year for the first and second semesters. Each semester must fall within that year's dates.</li>
        <li><strong>School and course details.</strong> Staff enters these directly in scholar academic records or Excel imports. No advance school/course setup is needed.</li>
        <li><strong>Configure documents and payroll.</strong> Keep COR and COG separate. Create the semester cycle, load applicable requirements, and save its setup. Ask the Coordinator to review and open it.</li>
        <li><strong>Hand over daily work.</strong> Staff uses Scholar registry for all scholars, receiving and roster preparation. Coordinators make the authorized scholarship and payroll decisions.</li>
      </ol>
      <p>Locking a year prevents changes to its semesters and cannot be undone from this screen. It is not a substitute for finishing payroll work.</p>
    </details>
    <details className="secondary-details"><summary>Create accounts or change roles</summary>
      <p>The current browser screen displays permissions. Account creation, password-reset links and role assignment use the local account/roles commands documented in README. Use individual accounts; do not share passwords or activation links.</p>
      <p>System Administrator access does not grant scholarship selection, document verification or payroll approval.</p>
    </details>
  </section>;
}
