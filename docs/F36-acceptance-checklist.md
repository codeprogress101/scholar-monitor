# F36 — User acceptance and release checklist

Candidate: **v0.37.0**, XAMPP MariaDB, 29 migrations through `20261004180000_f31_audit_viewer.sql`. F35 is accepted by the request to proceed. F36 remains **pending human acceptance and production readiness**. Automated evidence is not Coordinator or technical-owner sign-off.

## Repeatable technical gate

Run `npm run test:uat` from this workspace with XAMPP MySQL running and the F35 key available. The command creates and verifies a new encrypted backup, runs `check` and every configured `test:*-db` suite sequentially, fails on any unsuccessful suite, and writes `output/uat/F36-report.json` plus per-suite logs. Suites use disposable databases; `test:db` checks the live development schema/grants and the backup drill reads the existing demo database.

The report records source, dependency lock, migration and build SHA-256 values. Changing any frozen input invalidates the evidence and requires another gate run. Production authorization and both sign-offs remain explicitly pending in this machine-generated report.

## Business acceptance scenarios

Use individual Staff, Coordinator and System Administrator accounts. Michael's existing account remains System Administrator. Existing role-specific test accounts and demo records remain available; passwords and activation links are not copied into this document. Designate real human signatories below before production. Synthetic role accounts in automated fixtures are not human signatories.

| Scenario | Expected behavior | Automated evidence | Human result |
| --- | --- | --- | --- |
| Exam passed, requirements incomplete | Not payout eligible | Qualification and eligibility suites | Pending |
| Course shift approved | Original Scholar ID and prior years retained | Academic changes suite | Pending |
| Dropped scholar | Payout eligibility blocked despite documents | Eligibility suite | Pending |
| Duplicate Excel import | Duplicates reported; confirmation cannot create duplicate records | Import suite | Pending |
| COR verified, grades missing | Not eligible; missing grades explained | Eligibility suite | Pending |
| Locked official masterlist | Direct edits denied; controlled amendment preserves history | Masterlist workflow/amendment suites | Pending |
| OVR finalization | Entire roster commits or rolls back; independent approval enforced | Finalization/concurrency suites | Pending |
| Eligibility override approved | Separate Coordinator decision and audit evidence preserved | Override/audit suites | Pending |
| New semester after paid history | Earlier paid outcomes, finalization and corrections unchanged | Payment suite | Pending |
| Staff receives one document | Selected document Submitted; unselected documents unchanged; verification separate | Receiving suite and F36 browser smoke | Pending |
| System Administrator boundary | Can configure system; cannot view operational scholar records or approve scholarships | RBAC suite and F36 browser smoke | Pending |
| Recover official records | All table digests/schema objects restored, constraints enforced | Backup suite and F35/F36 restore reports | Pending |

For each manual scenario, record the date, actual account/person, demo record ID, observed result and any defect in a private test log. Do not copy personal information or credentials into committed evidence. Use demo records; never simulate payments against real operational records.

## Browser smoke evidence

The disposable receiving fixture was exercised with separate synthetic Staff, Coordinator and System Administrator logins. Staff navigated from the registry to a scholar's Receive requirements panel and received COR without changing unselected COG. Coordinator opened Masterlists. System Administrator opened editable Configuration and was denied operational scholar access. This is a navigation/receiving smoke check; approval edge cases and security enforcement are covered by the API/database suites, not claimed as full browser journeys.

Screenshots: `output/playwright/f36-staff-receiving.png`, `f36-coordinator.png`, `f36-system-admin.png`, `f36-admin-denied.png`. The initial unauthenticated identity request returned expected HTTP 401; no other browser console errors were observed. The browser fixture was stopped and its accounts/database were removed.

## Production release conditions

- [ ] Coordinator manually accepts all business scenarios and any resolved defects.
- [ ] Technical owner accepts the exact candidate hash/build and technical evidence.
- [ ] Production target, approved access model and deployment owner are recorded.
- [ ] Production HTTPS, origin, secrets, database isolation and restricted runtime grants are verified; the local XAMPP development setup is not treated as a production deployment.
- [ ] MFA requirement and implementation/approved policy decision are recorded.
- [ ] Backup schedule, offsite encrypted copy, separate key custody, retention and failure monitoring are operational; RPO/RTO accepted.
- [ ] A verified pre-release backup and known-good prior application artifact/configuration are available.
- [ ] Staging smoke tests pass using production-equivalent settings; rollback is rehearsed.
- [ ] Coordinator and technical owner explicitly authorize launch. No launch with failing critical tests.

## Sign-off record

| Role | Person | Candidate/report hash | Decision | Date |
| --- | --- | --- | --- | --- |
| Scholarship Coordinator | To be designated | Pending | **Pending** | — |
| Technical owner | To be designated | Pending | **Pending** | — |

No production release or external notification is performed by this checkpoint. See [release and rollback procedure](F36-release-runbook.md).
