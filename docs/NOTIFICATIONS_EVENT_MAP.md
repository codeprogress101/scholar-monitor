# In-app notifications: implemented event map

Pending work is projected from the authoritative records, across all years by default. Read state is personal and does not decide or resolve work. Audit insertion captures selected events in the same database transaction; no browser delivery request or background delivery worker is required.

| Existing transition | Reviewer / next action permission | Outcome recipient |
| --- | --- | --- |
| Validated scholar awaiting selection | scholarship.status.approve | Most recent validator (or annual-record creator) |
| Academic change requested | academic.changes.approve | Requester |
| Scholarship standing requested | scholarship.status.approve | Requester |
| Masterlist sent for verification | masterlists.prepare | Submitting preparer (creator before submission) |
| Masterlist submitted for approval | masterlists.approve | Submitting preparer (creator before submission) |
| Masterlist approved / published | masterlists.publish / masterlists.lock | Submitting preparer (creator before submission) |
| Masterlist returned | Submitting preparer with masterlists.prepare | Submitting preparer; remains pending |
| Official masterlist amendment requested | masterlists.amendments.approve | Requester |
| Continuing roster prepared | continuing.approve | Roster preparer |
| Documents submitted / resubmitted / awaiting verification | requirements.verify (ordinary Staff permission) | Original receiving account |
| Document returned for correction | Receiving account with requirements.receive | Receiver; remains pending |
| Document verified / rejected / waived / timing decision | No new approval step | Receiver |
| Existing permitted override submitted for review | eligibility.overrides.approve | Requester |
| Payroll submitted for review | ovr.finalize | Review submitter (creator before submission) |
| Payroll finalized / routed / marked processed | ovr.submit / ovr.process | Review submitter (creator before submission) |
| All frozen payroll members have recorded outcomes | ovr.close; Coordinator confirms reconciliation and closure | Review submitter; payment recording remains separate |
| Payroll returned to draft | Review submitter with ovr.prepare | Submitting preparer; remains pending |
| Payroll amendment / payment correction requested | ovr.amendments.approve / payments.corrections.approve | Requester |
| Import confirmed | No review implied; one result per workbook | Importer |
| Export generated | No persistent downloadable export is implied | Exporting account |
| Account created / enabled / disabled / roles changed | users.manage technical notice only | Authorized account administrators |

Notifications are dynamically limited by current permissions and record ownership. Existing business commands remain responsible for policy, version, ownership and approval checks. No new approval routes exist here.

## Compatibility and limits

- Pre-feature pending requests are discovered from source tables with their original timestamps. Completed audit history is not replayed.
- Ordinary document receipt is visible as pending verification without a separate notice for every receipt/save. Explicit resubmission creates a new event.
- Direct waiver, timing, semester-configuration and academic-compliance saves do not acquire new approval stages. Unimplemented or policy-restricted reconsideration processes remain restricted.
- Imports/exports are synchronous. Failed transactions return the existing request error and have no committed success notification. There is no persisted asynchronous job-failure queue to integrate. Export files are delivered to the originating browser, not stored for later download.
- Account changes have technical notices; existing local-operator account commands remain the way to change accounts.
- Notification polling does not calculate payroll eligibility, generate checklists or scan historical audit logs.

Validation and deployment status will be recorded with the delivery evidence. Migration 43 is additive; no data reset or deployment is included.

Polling defaults to 45 seconds while visible; VITE_NOTIFICATION_POLL_MS can select 30-60 seconds at build time. Errors back off to five minutes; visibility and successful actions request refresh. Notification polls do not extend the login idle timeout.
