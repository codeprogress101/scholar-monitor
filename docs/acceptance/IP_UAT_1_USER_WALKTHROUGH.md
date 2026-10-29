# IP-UAT-1 — Individual Payments user walkthrough

28 October 2026. **Fictional practice only. Open [the UAT](http://127.0.0.1:5181/) and confirm the yellow SYNTHETIC UAT — NOT REAL PAYMENTS banner.** Primary uses port 5173; do not perform these exercises there.

## Sign in and start

Use **uat_coordinator@example.invalid**, account name **uat_coordinator**. The email login was confirmed by the user. The requested password did not meet the existing 15-character minimum. A generated UAT-only password is in the restricted [private login handoff](C:/Users/ADMIN/.ldss/ip-uat-1-20261028/private/UAT_LOGIN.txt). The same file holds the optional Staff login. Do not share it outside this fictional exercise.

Open the [one-page scenario index](http://127.0.0.1:5181/IP_UAT_1_SCENARIOS.html). In Individual Payments choose **IP-UAT-YEAR → Individual Payments UAT first semester**. Search using the ID below; names may display surname first.

| Scenario | Scholar ID | Starting condition | Account | Starting point |
|---|---|---|---|---|
| A — Aster Unassigned UAT A | LDSS-2026-00015 | Active, no assignment; requirements need review | Staff or Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?academicYear=0e90de06-f05c-4224-b5bc-54ae813ef387&semester=34b2feaa-b1d2-4847-b72a-ebf9ec17d9b4) |
| B — Birch Complete UAT B | LDSS-2026-00012 | Requirements complete, no frozen assignment | Staff or Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?academicYear=0e90de06-f05c-4224-b5bc-54ae813ef387&semester=34b2feaa-b1d2-4847-b72a-ebf9ec17d9b4) |
| C — Cedar DraftDeferred UAT C | LDSS-2026-00013 | PAY-003 Draft; deferred | Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?academicYear=0e90de06-f05c-4224-b5bc-54ae813ef387&semester=34b2feaa-b1d2-4847-b72a-ebf9ec17d9b4&filter=deferred) |
| D — Dahlia ReviewDeferred UAT D | LDSS-2026-00010 | PAY-002 Review; deferred | Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?academicYear=0e90de06-f05c-4224-b5bc-54ae813ef387&semester=34b2feaa-b1d2-4847-b72a-ebf9ec17d9b4&filter=deferred) |
| E — Elm Frozen UAT E | LDSS-2026-00001 | PAY-001 Processed; frozen member | Staff or Coordinator | [Open](http://127.0.0.1:5181/#payouts?cycle=42c2b091-ccba-4dc2-9e34-0beb7d040646&batch=32735e4d-0555-4a5b-9275-f79cb9c0ab35) |
| F — Fern LaterEligible UAT F | LDSS-2026-00014 | Eligible later ordinary PAY-003 candidate | Staff or Coordinator | [Open](http://127.0.0.1:5181/#payouts?cycle=42c2b091-ccba-4dc2-9e34-0beb7d040646&batch=6c76a7bc-6d21-4188-aad4-f54102a61729) |
| G — Ginkgo Reserved UAT G | LDSS-2026-00002 | PAY-001 reservation | Staff or Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?academicYear=0e90de06-f05c-4224-b5bc-54ae813ef387&semester=34b2feaa-b1d2-4847-b72a-ebf9ec17d9b4) |
| H — Hazel Omitted UAT H | LDSS-2026-00003 | PAY-001 genuine omission recorded | Staff request; Coordinator approval | [Open](http://127.0.0.1:5181/#individual-payments?view=omitted&sourceBatch=32735e4d-0555-4a5b-9275-f79cb9c0ab35&q=LDSS-2026-00003) |
| I — Iris AwaitingApproval UAT I | LDSS-2026-00004 | Awaiting Coordinator approval | Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?view=omitted&sourceBatch=32735e4d-0555-4a5b-9275-f79cb9c0ab35&q=LDSS-2026-00004) |
| J — Juniper UnpaidORDV UAT J | LDSS-2026-00005 | Authorized, prepared, unpaid OR + DV | Staff or Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?view=omitted&sourceBatch=32735e4d-0555-4a5b-9275-f79cb9c0ab35&q=LDSS-2026-00005) |
| K — Kestrel Unclaimed UAT K | LDSS-2026-00006 | PAY-001 Unclaimed | Staff or Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?view=unclaimed) |
| L — Laurel Pending UAT L | LDSS-2026-00007 | PAY-001 Pending | Staff or Coordinator | [Open](http://127.0.0.1:5181/#payouts?view=recording&cycle=42c2b091-ccba-4dc2-9e34-0beb7d040646&batch=32735e4d-0555-4a5b-9275-f79cb9c0ab35) |
| M — Maple Paid UAT M | LDSS-2026-00008 | PAY-001 Paid | Staff or Coordinator | [Open](http://127.0.0.1:5181/#payouts?view=recording&cycle=42c2b091-ccba-4dc2-9e34-0beb7d040646&batch=32735e4d-0555-4a5b-9275-f79cb9c0ab35) |
| N — Nettle Incomplete UAT N | LDSS-2026-00016 | Active with incomplete requirements | Staff or Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?academicYear=0e90de06-f05c-4224-b5bc-54ae813ef387&semester=34b2feaa-b1d2-4847-b72a-ebf9ec17d9b4) |
| O — Orchid Cheque UAT O | LDSS-2026-00009 | Prepared cheque-route transaction; unpaid | Staff or Coordinator | [Open](http://127.0.0.1:5181/#individual-payments?view=cheques&transaction=c9d1e744-f89a-482a-8501-b7e2c6760cd8) |

Rowan **LDSS-2026-00011** is the additional Review anchor, keeping PAY-002 meaningful while Dahlia is deferred. All 16 people are fictional. These PAY-001/002/003 batches belong to this UAT only.

## Preparation prerequisite

The reset baseline starts with **payroll preparation Closed**, so the authorized omission/OR+DV exercises are usable. To restore a Draft or work on later payroll preparation, a **Coordinator** first opens **Individual Payments → Omitted Scholars**, selects PAY-001, expands **Change preparation state**, enters a fictional reason and clicks **Reopen Payroll Preparation**.

This is a semester-wide setting inside this UAT. After restoration/later-payroll exercises, use the same section and **Close Payroll Preparation** before requesting/approving/preparing OR+DV. Reopening preserves existing authorizations and reservations but blocks their forward preparation until closed again. Do not treat this restriction as an application error.

## Restore a deferred scholar

**Coordinator:** reopen preparation first. Choose **Not Yet on Payroll → Show: Deferred**, search **LDSS-2026-00013**, then **Review Recovery Options → Restore to Original Payroll**. Follow the original payroll link, review the deferral reason under **Changes & deferrals**, enter your fictional restoration reason and choose **Restore to this draft**, then **Confirm restoration**. Refresh and verify inclusion. No allocation or payment is created by restoration.

Repeat for **LDSS-2026-00010**. PAY-002 is in Review, so use **Return to Draft** first, with its required reason/reference, then restore. A Staff account can inspect recovery but cannot return or restore. PAY-001's frozen member **LDSS-2026-00001** must remain protected. History remains in the original payroll's workflow and deferral history.

## Review a later payroll

Open [UAT PAY-003](http://127.0.0.1:5181/#payouts?cycle=42c2b091-ccba-4dc2-9e34-0beb7d040646&batch=6c76a7bc-6d21-4188-aad4-f54102a61729) and search **LDSS-2026-00014**. This requirements-complete scholar is an eligible ordinary candidate. Inspect **Review Excluded Scholars** for **LDSS-2026-00002**: the PAY-001 reservation prevents a second ordinary stipend. Reopen preparation before supported preparation commands; all current source/version and cutoff checks still apply. Do not force a transfer or infer that an included candidate is Paid.

## Request and approve an omission

Close preparation. Open [Hazel's omission](http://127.0.0.1:5181/#individual-payments?view=omitted&sourceBatch=32735e4d-0555-4a5b-9275-f79cb9c0ab35&q=LDSS-2026-00003), choose **Review → Request OR + DV**. Then, as Coordinator, enter a **Decision or cancellation reason** and choose **Approve** or **Reject**. Iris **LDSS-2026-00004** already starts at this decision step. Staff can request but cannot approve.

After approval, **Prepare OR + DV** creates an unpaid transaction. **Prepare Documents** opens the draft forms. Use **View History** to see the request, attributed decision and preparation. Source eligibility is rechecked; approval does not bypass a changed source or create an acknowledged payment.

## Prepare individual OR/DV

Open [Juniper's prepared omission](http://127.0.0.1:5181/#individual-payments?view=omitted&sourceBatch=32735e4d-0555-4a5b-9275-f79cb9c0ab35&q=LDSS-2026-00005) → **Review → Prepare Documents**. Enter only fictional payee/office details, then **Prepare OR + DV Documents**. Download the draft OR and DV Word files. Their generation history is separate from payment history. Draft templates and internal references are not official external approval or cheque numbers.

## Unclaimed, Pending and Paid

**Staff or Coordinator:** choose **Unclaimed Stipends**, find **LDSS-2026-00006**, choose **Record Payment Request → Review → Prepare DV → Prepare Documents**. This uses **DV only**, retaining the original Unclaimed payroll outcome. Continue through **Review Payment** only when the fictional claim/release evidence supports it. Later individual release must not erase the original payroll history or create another entitlement.

For **LDSS-2026-00007**, open [PAY-001 Payment Recording](http://127.0.0.1:5181/#payouts?view=recording&cycle=42c2b091-ccba-4dc2-9e34-0beb7d040646&batch=32735e4d-0555-4a5b-9275-f79cb9c0ab35) and inspect its Pending row. Record an outcome only as an intentional fictional test, with its actual test date/reference and required confirmations. Pending must not appear as an existing Unclaimed outcome. Maple **LDSS-2026-00008** is already Paid; a new ordinary payment must be rejected. Both use the original payroll's recording/history views.

## Cheque Payments

Open [Orchid's cheque transaction](http://127.0.0.1:5181/#individual-payments?view=cheques&transaction=c9d1e744-f89a-482a-8501-b7e2c6760cd8) → **Review Payment**. **Prepare Documents** prepares its authorized draft OR/DV. **Mark as Forwarded** records forwarding only; it remains unpaid. Use the existing payment-date, preview and acknowledgment controls to record a fictional received payment only when you intend to test that action. A fresh duplicate payment must reject; an exact supported retry must return the original result. **View History** retains forwarding, document versions and the acknowledged outcome. Cancellation inside LDSS does not cancel an external cheque.

## Check restrictions and finish

Use **Not Yet on Payroll → Show: All / Deferred / Needs Review / On payroll / reserved**. Search Aster **LDSS-2026-00015** and Nettle **LDSS-2026-00016** to inspect their missing evidence. Neither may be paid through discovery. Use Previous/Next when a result exceeds the page size; no current results are silently omitted. Sign out when done. If a command result is uncertain, keep its saved request and use only its supported exact-retry path; do not start a replacement action.

## Start, stop and reset — operator only

Run from PowerShell in the repository:

~~~powershell
cd C:\xampp\htdocs\scholar_monitor
node output/ip-uat-1-20261028/control.mjs start
~~~

To verify or stop only this UAT:

~~~powershell
node output/ip-uat-1-20261028/control.mjs verify
node output/ip-uat-1-20261028/control.mjs stop
~~~

To deliberately discard fictional test changes and restore this approved baseline:

~~~powershell
node output/ip-uat-1-20261028/control.mjs reset --confirm-reset-ip-uat-1
~~~

Finish or recover pending commands first and stop using the UAT during reset. Reset refuses missing confirmation, primary identities, unknown ownership or active transactions. It stops only verified UAT processes, saves an encrypted before-reset evidence archive, completely restores the fictional baseline into a new owned database, verifies it and restarts the UAT. Login credentials and fictional IDs remain unchanged. A reset failure leaves the UAT stopped for operator review; it must not be “fixed” by resetting primary.

## Feedback checklist

- [ ] Found the intended scholar and correct original payroll.
- [ ] Understood the difference between Deferred, Unassigned, Omitted, Pending, Unclaimed and Paid.
- [ ] Staff/Coordinator controls matched the intended authority.
- [ ] Restoration and document preparation did not announce payment.
- [ ] Source/duplicate restrictions were clear and could not be bypassed.
- [ ] Search, keyboard, mobile layout and history were usable.
- [ ] Recorded any confusing message, screenshot and scenario ID before requesting reset.

See the [environment and acceptance report](IP_UAT_1_INDIVIDUAL_PAYMENTS_TEST_ENVIRONMENT_REPORT.md). This UAT is not office financial authority or an operational LAN deployment.
