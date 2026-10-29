# Localhost Individual Payments activation and verification

24 October 2026, Philippine time. **Individual Payments is enabled in the owned synthetic application at [127.0.0.1:3011](http://127.0.0.1:3011/#individual-payments).** The original 800 + 200 payrolls retain 1,000 Pending outcomes, 1,000 entitlements/allocations and zero payment records. Actual payment mutations were tested in separate synthetic databases. No LAN/production activation or deployment is authorized or performed.

## Activation and access

| Flag supplied explicitly to this UAT instance | Value |
|---|---|
| `INDIVIDUAL_PAYMENTS_ENABLED` | `true` |
| `OMITTED_PAYMENTS_ENABLED` | `true` |
| `INDIVIDUAL_DOCUMENTS_ENABLED` | `true` |
| `INDIVIDUAL_SETTLEMENT_ENABLED` | `true` |
| `HISTORICAL_MULTIBATCH_ENABLED` | `true`, retained |

The three dependent services also require `INDIVIDUAL_PAYMENTS_ENABLED`. Application defaults and the main `.env` are unchanged. All five flags above remain effectively off in the main configuration ([check](../../output/individual-uat-activation-20261024/default-flags.json)). Disabled notices disappear through the existing availability endpoints; no notice, permission check or financial guard was removed.

The new [scoped launcher](../../scripts/local-individual-uat.ts) checks the local development context, exact owned fixture naming/manifest, administrative ownership marker, all 62 migration fingerprints, restricted runtime grants and completed compatibility results. The administrative marker is checked using the existing local setup account because it is deliberately unavailable to the runtime user; no grant was broadened. Business requests still use the restricted runtime account. Startup refuses an incomplete compatibility record.

```powershell
node --import tsx scripts/local-individual-uat.ts verify
node --import tsx scripts/local-individual-uat.ts serve
```

Only the verified old port-3011 process was stopped, after checking its command line and loopback listener. The replacement binds **127.0.0.1 only**. The older historical-fixture helper remains unchanged; use this new launcher to retain the authorized individual flags when restarting. Existing synthetic account names/password storage remain as documented in the [historical multi-batch report](LDSS_HISTORICAL_MULTI_BATCH_IMPLEMENTATION_REPORT.md); credentials are not reproduced here.

Staff uses **Individual Payments → Unclaimed Stipends / Omitted Scholars / Cheque Payments**. **Prepare Documents** opens the existing individual document workspace; **View History** opens the existing transaction/payment history. These are contextual views, not new top-level modules. Staff and Coordinator retain their existing operational authority. Pure System Administrator and unassigned accounts are denied financial APIs.

## Compatibility checks before activation

Reviewed the accepted P04–P10 reports, latest historical multi-batch report, feature wiring, schema/grant contracts and existing test drivers. No applicable `AGENTS.md` was found in the workspace/ancestors. Historical reports' earlier stop/activation boundaries are reference history; the user's current instruction expressly authorizes this isolated UAT activation.

Five fresh integration runs completed successfully **before the port-3011 instance was enabled**:

| Disposable driver arguments after `scripts/test-eligibility-db.ts` | Result |
|---|---|
| `--main-payroll --payment-recording --individual-payments --payroll-reconciliation --individual-documents` | Passed Unclaimed request/DV, cancellation/replacement, document generation/download, retry/concurrency, source invalidation, authorization, audit rollback and reconciliation |
| `--main-payroll --omitted-payments --browser-release --individual-documents` | Passed eligible later-payroll routing, preparation closure, Coordinator-authorized OR + DV, both draft downloads and source/financial preservation |
| `--main-payroll --payment-recording --individual-payments --browser-release --individual-settlement --financial-reports` | Passed personal settlement, forwarding, duplicate protection, corrections, closed/Original evidence, reports and recovery |
| `--main-payroll --omitted-payments --browser-release --individual-settlement --financial-reports` | Passed omitted representative settlement, required attestations, financial ownership, reports and recovery |
| Previous Unclaimed settlement arguments plus `--settlement-races`, without reports | Passed original-payroll Paid correction versus individual cheque release: one effective Paid winner, unchanged original payroll rows/frozen evidence |

[Exact commands, times and exit codes](../../output/individual-uat-activation-20261024/compatibility-tests.json). Each driver creates and removes only its own disposable schema/account. Populated document/settlement backup restores verified exact content, financial inventory and constraints. No migration or upgrade was applied to a retained fixture; its existing 62-migration state was verified instead.

## Combined historical multi-batch scenario

The original fixture is `ldss_hmulti_test_33804_f28b9d67` at port **3011**. A separate verified encrypted backup/restore produced `ldss_restore_1792809529168_5bbfffd2`, served at [127.0.0.1:3012](http://127.0.0.1:3012/#individual-payments). This is an explicitly labelled synthetic copy, not a replacement for port 3011. It retains both independent historical imports and their prior reviews, official publications, frozen payrolls and allocations. The backup contained 139 tables and 53,481,501 SQL bytes, within the unchanged 64 MiB boundary. [Recovery evidence](../../output/individual-uat-activation-20261024/recovery.json).

Four controlled fictional returned-payroll Unclaimed outcomes were recorded through the reviewed Payment Recording API: two from each batch. No original Pending baseline was altered. Requests, preparation, documents, forwarding and settlements used authorized application commands; no approval/payment/verification row was fabricated directly.

| Final observed state | Original 3011 | Separate combined copy, 3012 |
|---|---:|---:|
| Scholars / entitlements / allocations | 1,000 / 1,000 / 1,000 | 1,000 / 1,000 / 1,000 |
| Batch 1 Pending / Unclaimed / payroll Paid | 800 / 0 / 0 | 798 / 2 / 0 |
| Batch 2 Pending / Unclaimed / payroll Paid | 200 / 0 / 0 | 198 / 2 / 0 |
| Canonical individual Paid records | 0 | 3: two personal, one representative |
| Payment Recording `canRecord` | `true` for both | `true` for both |

Both historical batches supplied genuine Unclaimed source rows in the copy. Their actual individual payment date is the declared synthetic setup-day release, **24 October 2026**, separately recorded from server timestamps. Original historical batch-level dates were never copied into individual release evidence. The fourth Unclaimed scholar remains **Awaiting Request**, available for subsequent manual testing. No omitted case was manufactured from Batch 2.

The copy's historical setup rows, both finalization records, allocations, entitlements and Masterlist publication records matched their pre-command hashes after all three settlements. [Declared cases and protected hashes](../../output/individual-uat-activation-20261024/scenario-cases.json), [combined verification](../../output/individual-uat-activation-20261024/combined-verification.json), [original readiness](../../output/individual-uat-activation-20261024/baseline-readiness.json).

Restart the separate copy with `node --import tsx scripts/local-individual-uat.ts serve --scenario`. Its runtime is restricted separately; private credentials and the encrypted recovery key remain in the task's ACL-restricted `private` directory. No reset, destructive cleanup or unattended payment action is scheduled.

## Workflow and browser results

- **Unclaimed:** Staff recorded the actual fictional request, prepared DV only, generated/downloaded the draft, forwarded it and recorded acknowledged cheque release. Generation and forwarding both left settlement unpaid until the explicit Paid command. Existing one-active-route, period/source/standing and duplicate-payment checks remained active.
- **Documents:** Fresh integration suites generated Unclaimed DV and omitted OR + DV, checked DOCX content and exact centavo wording, rejected wrong-kind/financial/template inputs, verified downloads and preserved immutable generation history. The browser downloaded an actual `DRAFT-DV-…docx`. Payee and unknown official fields remained blank; no sample signatories or accounting values were adopted.
- **Uncertain response:** A browser route deliberately dropped one *committed* document-generation response. The UI blocked further actions, retained the exact request across reload, then recovered through **Retry saved request**. One document version remained; no duplicate generation/payment was created. The interception was removed after testing. Expected aborted-response and initial signed-out `/auth/me` 401 messages are test events, not unexplained application errors.
- **Personal collection:** Browser and API releases required acknowledgment, retained actual date and actor/recording time, and showed **Paid** separately from **Original payroll outcome: Unclaimed**.
- **Representative collection:** The browser required the single-payment physical signed-authorization/scholar-ID/representative-ID and acknowledged-release attestation. No representative names, ID numbers, scans or uploads were stored. Bulk representative input is rejected by the tested service.
- **Omitted:** Fresh disposable integration tests verified later eligible editable same-semester payroll first, then closed-preparation Coordinator-approved OR + DV. Port 3011 displays the existing preparation-owner guidance; no omission or preparation closure was added there. The omitted route's browser mutation journey was not repeated in the historical copy; its fresh HTTP integration tests cover both documents and settlement.
- **History/corrections:** Browser history was accessible after settlement. Fresh integration suites verified Staff open-period date correction, Coordinator decisions, restricted/closed-period handling, cancellation/replacement conflicts and immutable Original closure. The combined copy has no closure; Original/Updated closure assertions belong to those separate disposable regressions.

Browser artifacts: [enabled original workspace](../../output/playwright/individual-uat/baseline-enabled.png), [enabled original cheque screen](../../output/playwright/individual-uat/baseline-cheques-enabled.png), [draft after exact retry](../../output/playwright/individual-uat/draft-recovered.png), [personal Paid/history](../../output/playwright/individual-uat/personal-paid-history.png), [representative Paid](../../output/playwright/individual-uat/representative-paid.png). Playwright and PDF skills were used for bounded browser/export verification; no UI redesign was needed.

## Reconciliation, exports and financial safeguards

Fresh small-fixture report suites verified Original/Updated/settlement bases, exact API/XLSX/PDF rows and totals, permissions, stale-source rejection, renderer/audit rollback and distinct-entitlement counting. Original Unclaimed remains separate from later individual Paid; an omitted settlement never becomes original membership.

The combined copy exported both full payrolls as Provisional Reconciliation: **800 and 200 distinct Excel scholar rows**, two original Unclaimed outcomes per batch, and respectively two/one later Paid-via-DV rows. Numeric stipend cells remain PHP 5,000. Settlement totals are PHP 15,000 across three distinct entitlements, with zero conflicts; payroll Paid totals stay zero. The dedicated settlement report covers transaction-associated entitlements only and is not misrepresented as the complete payroll. [Excel verification](../../output/individual-uat-activation-20261024/combined-reports/excel-verification.json).

The PDFs have 45 and 12 pages. Text extraction and representative first/last-page rendering confirmed separate payroll/individual columns, readable wrapping, page headers/footers and correct counts/subtotals. This is representative export QA, not native Office printing or every-page accessibility certification. [PDF review](../../output/individual-uat-activation-20261024/combined-reports/pdf-review.json), [synthetic exports](../../output/individual-uat-activation-20261024/combined-reports).

Source revalidation, claimability, actual-release evidence, exclusive routes, exact retries, transaction/audit rollback, database uniqueness/FKs, immutable frozen evidence, Coordinator authority and current period rules remain unchanged. Q28 continuation after semester end was not implemented or enabled. No cutoff, semester date or benefit amount was changed.

## Code and verification boundary

The new launcher supplies flags only to the explicitly selected UAT instance. Nine existing test helpers received optional output-directory overrides so this run does not overwrite accepted P02–P08 artifacts: payment recording (small/large), reconciliation, individual payments, omissions, documents, settlement and settlement races, plus document backup. Their defaults remain unchanged. The backup helper additionally accepts only the exact task's bounded recovery-output path pattern; schema ownership and financial assertions remain intact. No `server`, `src`, migration, permission, package or main configuration change was required.

| Final verification | Result |
|---|---|
| `npm test` | Exit 0: **98 files, 603 tests passed**. [Log](../../output/individual-uat-activation-20261024/unit.log) |
| Five pre-activation financial integration runs | All exit 0; commands and logs above |
| `node --expose-gc --max-old-space-size=4096 --import tsx scripts/test-import-db.ts --payment-recording-large --individual-payments --individual-settlement --financial-reports` | Exit 0: all 13 import scenario groups; 835-member payroll with 825 Paid/10 Unclaimed; single release, accepted **eight-person bulk release**, representative release, rollback/retry/duplicate safeguards, XLSX/PDF and populated recovery. [Log](../../output/individual-uat-activation-20261024/volume/run.log) |
| Combined historical-source scenario | Three actual synthetic individual settlements across both imported batches; 1,000 distinct entitlements/allocations retained, four original Unclaimed records unchanged. [Authoritative browser checks](../../output/individual-uat-activation-20261024/browser-authoritative-verification.json) |
| Final `npm run lint` | Exit 0, zero errors/warnings. [Log](../../output/individual-uat-activation-20261024/lint-final.log) |
| Final `npm run typecheck` | Exit 0. [Log](../../output/individual-uat-activation-20261024/typecheck-final.log) |
| Final normal `npm run build` | Exit 0 through all normal stages. Existing Vite chunk-size warning remains. [Log](../../output/individual-uat-activation-20261024/build-final.log) |
| `npm run check:secrets` | Exit 0; 1,168 source/build files checked. [Log](../../output/individual-uat-activation-20261024/secrets.log) |
| Protected source/configuration hashes | All **448 files exact**, including application code, schemas/migrations, `.env`, package files and lint/TypeScript configuration. [Evidence](../../output/individual-uat-activation-20261024/application-after.json) |

The large run used existing limits and measured existing full-detail costs; it is not a LAN capacity guarantee or performance enhancement. No full `test:uat`, security review, cross-engine/assistive-technology certification or named office acceptance is claimed. Negative integration probes deliberately produce 403/409/422/500 diagnostics; their assertions passed. One new report-harness assertion initially confused transaction-only settlement scope with full payroll scope and was corrected to use Provisional Reconciliation. The first launcher check correctly refused runtime access to administrative ownership metadata; the check now uses read-only local administrative access, without new grants. Neither correction changed application validation.

## Remaining boundaries and stop point

- Official OR/DV formats, mappings, numbers, accounting sources and signatories still require actual office approval. All generated individual forms remain drafts.
- Existing claimability restrictions and restricted-date evidence/approval remain. No new post-semester request/release authority, blanket exception or Q28 implementation is supplied.
- The existing cheque queue can change its reviewed row without rewriting an earlier transaction parameter in the address bar. Use the explicit transaction link when bookmarking/reloading a different row; financial commands used the displayed transaction and verified its source. This existing navigation limitation was observed, not changed in this activation task.
- P10's dependency advisories, full-detail latency/memory, storage/backup limits and operational acceptance requirements remain separate. No LAN/production settings, records or listeners were accessed or activated; application defaults and main `.env` remain disabled/unchanged. This is localhost UAT authorization only.

Final read-only preservation compared **ten existing schemas**: development, A–F, V1, V2 and the original historical multi-batch fixture. All business rows, counts and table definitions match the starting snapshots; all existing grants match after excluding the two explicitly new clone-owned accounts. The original fixture retains all **10,347 original audit rows**, plus one expected `auth.login`; sessions changed 26→27 and rate-limit content changed through the authorized Staff browser login. Those authentication changes are retained, not reset. The separate verified restore and its restricted runtime/restore-definer accounts are the only retained additions. [Preservation evidence](../../output/individual-uat-activation-20261024/preservation.json).

**Completed and stopped:** existing Individual Payments is usable at port 3011, the 800/200 Pending baseline is preserved, separate synthetic mutation workflows passed, and both loopback instances remain available. No LAN/production activation, deployment, database reset, original financial mutation, schema/permission change or unrelated enhancement was performed. Further work requires a new instruction.
