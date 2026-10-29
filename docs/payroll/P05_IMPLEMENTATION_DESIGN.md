# P05 implementation design — 22 October 2026

Local scope only. P01–P04 are accepted. This records the schema justification before implementation; it is not deployment approval.

The accepted P04 baseline is retained in `output/p05-omitted-20261022/accepted-p04-fingerprints.json`: 616 source inputs, 230 build artifacts, 58 migration hashes. Read-only development inventory records 132 existing business tables, 15 schemas and 12 LDSS accounts. No application source differed at capture.

## Existing constraints and minimal extension

* Submission windows govern dates and numbered batch creation. They cannot express preparation closure without changing receipt deadlines or closing lawful payment processing. Add append-only `payroll_preparation_versions`, keyed by cycle/revision. The existing Coordinator `payroll.windows.manage` permission owns close/reopen; absent history means Open for compatibility. New-window creation and draft submission/finalization check this state under the existing global guard.
* A genuine omission precedes allocation and may have no entitlement or payment. P04 headers require a payment; `ovr_entries` would falsely assert roster membership. Add immutable `payroll_omissions` with permanent scholar/semester uniqueness and a real finalized source, plus append-only `payroll_omission_events` for review, destination provenance, request, approval/rejection and cancellation. Existing journals/audits cannot enforce case identity or per-case revisions; they remain the atomic retry/audit infrastructure. Pending OR + DV cases reserve that permanent identity before entitlement creation, through the latest immutable case event and the same financial locks.
* Extend P04 transaction headers with a strict source discriminator and omission/approval FK. Unclaimed headers still require a real payment and prohibit omission fields; omitted headers require an approved omission event/entitlement and prohibit a fabricated payment. Preserve every existing header/event and all unique semester-benefit, allocation and active-route constraints. Scope original-request uniqueness separately to each source kind so a formally cancelled omission followed by a legitimate payroll Unclaimed outcome remains compatible. The shared entitlement route still permits only one active individual transaction. No Paid ledger or fake payroll is added.
* Reuse the existing entitlement creation writer, with the same current academic review/authority FKs and fixed PHP 5,000. Only Coordinator approval creates an omitted entitlement. A cancelled, unallocated omitted entitlement may later be reused by ordinary Coordinator payroll finalization, with a new approval event; never delete it or create a second entitlement.

## Integration and safety

Staff Add to Payroll records a reviewed destination-origin event then asks `managedCandidates` for the one selected annual record. It never inserts a roster entry, changes cutoffs, removes a deferral or finalizes. Normal whole-batch review/finalization remains authoritative. Historical evidence is reusable only for the same valid prior approval/import and recorded source-root link; destination timing remains independent. Source provenance enters the existing review fingerprint.

The existing eligibility service accepts a narrow omission review context, validated against the case's actual scholar, source batch and semester. This allows fresh validation of that case's own unpaid reservation; it cannot ignore another allocation or route. Ordinary eligibility sees active requests as blocked. Case lookups are batch-loaded for cohort paths; queue/search uses relational paged sources and does no cohort assessment.

All mutations retain configuration-guard → actor → financial locks, current permission rechecks, atomic journal/audit, exact retries and request-local cache invalidation. No unsafe cross-request cache is introduced. Closed preparation never changes batch state, cycle state, academic lock, payment or reconciliation. Reopening preserves existing OR + DV cases/reservations.

P06 documents, forwarding and P07 cheque/payment transitions are excluded. Existing semester-end restrictions remain; no late-claim authority is invented. Operations remain disabled by default under an additional P05 activation flag.

## Forward constraint correction during verification

A rolled-back privileged SQL probe found that the new F49 approval CHECK could evaluate to SQL unknown for a NULL entitlement, and its authorization FK did not itself bind the semester owner. Application commands already rejected those inputs. F50 adds an explicit non-NULL approval fence and a composite authorization/owner FK. F49's applied checksum is preserved. Empty and populated upgrade rehearsals verify this forward correction without rewriting evidence or disabling foreign keys.

The canonical `payment_records` individual-source extension remains deferred until actual individual settlement is separately authorized in P07. P05 extends only the unpaid P04 header; it neither needs nor creates an individual Paid record.
