# LDSS full-process flowcharts

Based on the implemented v0.37.0 workflows. Prepared 2026-10-05.

These charts describe the implemented local system. F36 human acceptance and production launch remain pending.

**Roles:** Green = Staff / Coordinator operations; gold = Coordinator decisions; blue = technical administration; gray = system / records; red = blocked or unresolved work. Labels also state the actor; color is not required to understand the flow.

**Scope:** Internal staff only. Scholars submit physical documents; they do not log in. Requirements, qualification, operational status and payment eligibility are separate records. Receipt does not mean verification; selection does not mean activation; finalization does not mean payment.

## Full scholarship process

Start here. Each detailed chart below expands one part of this process.

```mermaid
flowchart TD
  setup["Administrator: Configure users, periods and policies"] --> register["Staff / Coordinator: Register or find scholar"]
  register --> annual["Staff / Coordinator: Record annual academics and application"]
  annual --> qualify["Coordinator: Qualify and select"]
  qualify --> official["Staff + Coordinator: Review, approve and publish masterlist"]
  official --> active["System: Activate official scholarship; retain locked version"]
  active --> receive["Staff / Coordinator: Receive and verify physical requirements"]
  setup --> cycle["Administrator configures payout; Coordinator opens cycle"]
  cycle --> assess["System: Assess current payout eligibility"]
  receive --> assess
  assess --> eligible{"Effective eligibility allows payout?"}
  eligible -->|"No"| resolve["Resolve missing records or follow controlled exception process"]
  resolve --> assess
  eligible -->|"Yes"| draft["Staff / Coordinator: Prepare OVR roster"]
  draft --> final["Different Coordinator: Finalize validated roster atomically"]
  final --> submit["Coordinator: Submit for administrative processing"]
  submit --> outcomes["Staff / Coordinator: Record external payment outcomes"]
  outcomes --> close["Coordinator: Reconcile and close batch"]
  close --> history["System: Preserve official, document, payment and audit history"]
  history --> next["Next semester: New checklist and payout cycle"]
  next --> receive
  class setup,cycle admin
  class qualify,final,submit,close coordinator
  class register,annual,official,receive,draft,outcomes operator
  class active,assess,history,next system
  class resolve exception
  classDef operator fill:#e9f3f0,stroke:#276657,color:#163d34,stroke-width:1.5px
  classDef coordinator fill:#fff1cf,stroke:#94701e,color:#533f12,stroke-width:1.5px
  classDef admin fill:#eaf0fc,stroke:#526f9a,color:#263b60,stroke-width:1.5px
  classDef system fill:#f0f1f4,stroke:#707b8a,color:#28323f,stroke-width:1.5px
  classDef exception fill:#fae9e8,stroke:#a75750,color:#632b27,stroke-width:1.5px
```

## Registration to official scholarship

An exam pass or selection alone does not activate a scholar or make them payout eligible.

```mermaid
flowchart TD
  start(["Staff / Coordinator receives scholar details"]) --> find{"Existing scholar?"}
  find -->|"Yes"| reuse["Use existing permanent Scholar ID"]
  find -->|"No"| method{"Manual entry or Excel?"}
  method -->|"Manual"| duplicate["Check possible duplicates"]
  method -->|"Excel"| stage["Stage and validate rows; review duplicate warnings"]
  stage --> confirm["Explicitly confirm valid import"]
  confirm --> create["Create permanent Scholar ID; never renumber"]
  duplicate --> review{"Same person?"}
  review -->|"Yes"| reuse
  review -->|"Uncertain"| duplicate
  review -->|"No, reviewed separately"| create
  create --> academic["Record school, course and year level for academic year"]
  reuse --> academic
  academic --> applicant["Create annual Applicant record"]
  applicant --> exam["Staff / Coordinator: Record Exam Passed"]
  exam --> qualified["Coordinator: Confirm Qualified"]
  qualified --> selected["Coordinator: Select scholar"]
  applicant -.-> notSelected["Coordinator: Not Selected where allowed"]
  exam -.-> notSelected
  qualified -.-> notSelected
  selected --> draft["Staff / Coordinator: Prepare Draft masterlist"]
  draft --> verification["For Verification: Check candidates and sources"]
  verification --> submitted["Submit for Approval"]
  submitted --> approve{"Different Coordinator approves?"}
  approve -->|"Return with reason"| draft
  approve -->|"Yes"| approved["Approved masterlist"]
  approved --> publish["Coordinator: Publish official snapshot"]
  publish --> activate["System: Activate included Selected scholars atomically"]
  activate --> lock["Coordinator: Lock official masterlist"]
  lock --> done(["Official scholarship; later changes use amendments"])
  class start,reuse,stage,confirm,duplicate,create,academic,applicant,exam,draft,verification,submitted operator
  class qualified,selected,notSelected,approved,publish,lock coordinator
  class activate system
  classDef operator fill:#e9f3f0,stroke:#276657,color:#163d34,stroke-width:1.5px
  classDef coordinator fill:#fff1cf,stroke:#94701e,color:#533f12,stroke-width:1.5px
  classDef admin fill:#eaf0fc,stroke:#526f9a,color:#263b60,stroke-width:1.5px
  classDef system fill:#f0f1f4,stroke:#707b8a,color:#28323f,stroke-width:1.5px
  classDef exception fill:#fae9e8,stroke:#a75750,color:#632b27,stroke-width:1.5px
```

## Receive, verify and correct requirements

Navigate: Scholar registry > Open profile > Receive requirements. Documents remain physical; no student login or document upload.

```mermaid
flowchart TD
  physical(["Scholar hands in physical documents"]) --> choose["Staff / Coordinator: Find scholar and choose academic year / period"]
  choose --> checklist["System: Provision or reuse checklist with pinned policy versions"]
  checklist --> allowed{"Period and record allow receiving?"}
  allowed -->|"No"| stop["View history; resolve period or record restriction"]
  allowed -->|"Yes"| select["Select only documents actually received"]
  select --> date["Confirm received date; optional custody details"]
  date --> receive["Receive Selected Requirements"]
  receive --> submitted["System: Selected items become Submitted; record receiver"]
  submitted --> send["Staff / Coordinator: Send for verification"]
  send --> review["For Verification: Check identity, period, placement, policy and physical document"]
  review --> decision{"Review outcome?"}
  decision -->|"Valid and complete"| verified["Verified"]
  decision -->|"Correctable"| correction["For Correction: Record reason"]
  decision -->|"Reject"| rejected["Rejected; does not satisfy requirement"]
  correction --> resubmit["Receive corrected physical copy: Resubmitted"]
  resubmit --> send
  verified -.->|"Linked reopening with reason"| correction
  checklist -.->|"Unverified item; authorized exception"| waive["Coordinator: Waive with reason and authority reference"]
  rejected -.->|"Authorized waiver"| waive
  waive --> waived["Waived; retain original receipts and decisions"]
  verified --> assess["Reassess cycle eligibility using current sources"]
  waived --> policy{"Cycle permits this waiver?"}
  policy -->|"Yes"| assess
  policy -->|"No"| unsatisfied["Requirement remains unsatisfied for this cycle"]
  class choose,select,date,receive,send,review,correction,resubmit operator
  class waive coordinator
  class checklist,submitted,verified,waived,assess system
  class stop,rejected,unsatisfied exception
  classDef operator fill:#e9f3f0,stroke:#276657,color:#163d34,stroke-width:1.5px
  classDef coordinator fill:#fff1cf,stroke:#94701e,color:#533f12,stroke-width:1.5px
  classDef admin fill:#eaf0fc,stroke:#526f9a,color:#263b60,stroke-width:1.5px
  classDef system fill:#f0f1f4,stroke:#707b8a,color:#28323f,stroke-width:1.5px
  classDef exception fill:#fae9e8,stroke:#a75750,color:#632b27,stroke-width:1.5px
```

## Eligibility, OVR and payment outcomes

OVR is the payout batch/roster. This application records disbursement outcomes; it does not transfer money.

```mermaid
flowchart TD
  setup["Administrator: Configure cycle, dates and required policy versions"] --> open["Coordinator: Open payout cycle"]
  open --> calculate["Staff / Coordinator: Request fresh eligibility calculation"]
  calculate --> normal["System: Check official membership, Active status, academics and required documents"]
  normal --> effective["Apply current approved override, if any; preserve normal result"]
  effective --> eligible{"Eligible with fresh sources?"}
  eligible -->|"No"| blocked["Show reasons; correct records or use reviewed override process"]
  blocked --> calculate
  eligible -->|"Yes"| roster["Staff / Coordinator: Add to Draft OVR; prevent duplicate cycle membership"]
  roster --> submit["Staff / Coordinator: Submit roster for review"]
  submit --> review{"Different Coordinator approves fresh full-roster validation?"}
  review -->|"Return to Draft"| roster
  review -->|"Yes"| finalize["System: Finalize every entry and snapshot atomically"]
  finalize --> adminSubmit["Coordinator: Record administrative submission"]
  adminSubmit --> process["Staff / Coordinator: Record processing evidence"]
  process --> external["Disbursement handled outside LDSS"]
  external --> outcome["Record Paid with positive amount, or Not paid with reason and zero"]
  outcome --> complete{"All members have outcomes and totals reconcile?"}
  complete -->|"No"| outcome
  complete -->|"Yes"| close["Coordinator: Close batch; freeze closure totals"]
  close --> cycleClose["Coordinator: Close cycle when its batches are complete"]
  cycleClose --> retain(["Preserve history; next semester uses new records"])
  class setup admin
  class open,adminSubmit,close,cycleClose coordinator
  class calculate,roster,submit,process,outcome operator
  class normal,effective,finalize,retain system
  class blocked exception
  classDef operator fill:#e9f3f0,stroke:#276657,color:#163d34,stroke-width:1.5px
  classDef coordinator fill:#fff1cf,stroke:#94701e,color:#533f12,stroke-width:1.5px
  classDef admin fill:#eaf0fc,stroke:#526f9a,color:#263b60,stroke-width:1.5px
  classDef system fill:#f0f1f4,stroke:#707b8a,color:#28323f,stroke-width:1.5px
  classDef exception fill:#fae9e8,stroke:#a75750,color:#632b27,stroke-width:1.5px
```

## Corrections, amendments and exceptions

A different Coordinator means a different authenticated individual from the requester or submitter; not a second role on the same account.

```mermaid
flowchart TD
  change(["A correction or exception is needed"]) --> kind{"What changes?"}
  kind -->|"Contact or personal details"| profile["Staff / Coordinator: Edit registry with audit reason"]
  kind -->|"School or course"| official{"Official or protected membership?"}
  official -->|"No"| placement["Request academic change; different Coordinator decides"]
  official -->|"Yes"| master["Use latest locked masterlist amendment"]
  master --> approval["Different Coordinator approves; no official change yet"]
  approval --> publication["Coordinator publishes new locked version and linked academic history"]
  kind -->|"Operational status"| status["Request On Hold, Dropped or other allowed transition"]
  status --> statusApproval["Different Coordinator decides; effective eligibility is reassessed"]
  kind -->|"Eligibility exception"| override["Request against fresh calculation; submit for review"]
  override --> overrideApproval["Different Coordinator approves or rejects with authority evidence"]
  overrideApproval --> overrideResult["Keep normal result; show separately labeled override result"]
  kind -->|"Finalized OVR roster or name"| ovr["Request amendment before processing; cycle must be open"]
  ovr --> ovrApproval["Different Coordinator approves validated roster"]
  ovrApproval --> resubmit["New effective version; Coordinator resubmits administratively"]
  kind -->|"Payment outcome"| closed{"Batch/cycle closed or period unavailable?"}
  closed -->|"No"| correction["Staff / Coordinator: Append payment correction"]
  closed -->|"Yes"| correctionRequest["Request correction; different Coordinator approves"]
  profile --> preserve["Preserve permanent ID, original rows, versions and audit evidence"]
  placement --> preserve
  publication --> preserve
  statusApproval --> preserve
  overrideResult --> preserve
  resubmit --> preserve
  correction --> preserve
  correctionRequest --> preserve
  class profile,placement,master,status,override,ovr,correction operator
  class approval,publication,statusApproval,overrideApproval,ovrApproval,resubmit,correctionRequest coordinator
  class overrideResult,preserve system
  classDef operator fill:#e9f3f0,stroke:#276657,color:#163d34,stroke-width:1.5px
  classDef coordinator fill:#fff1cf,stroke:#94701e,color:#533f12,stroke-width:1.5px
  classDef admin fill:#eaf0fc,stroke:#526f9a,color:#263b60,stroke-width:1.5px
  classDef system fill:#f0f1f4,stroke:#707b8a,color:#28323f,stroke-width:1.5px
  classDef exception fill:#fae9e8,stroke:#a75750,color:#632b27,stroke-width:1.5px
```

## Oversight, security and release

These controls apply throughout the scholarship process. F36 technical tests passed; human sign-off and production readiness remain pending.

```mermaid
flowchart TD
  signIn["Individual staff account signs in"] --> auth["System: Check active session and permission on every command"]
  auth --> allowed{"Authorized and valid current state?"}
  allowed -->|"No"| deny["Reject safely; preserve existing records"]
  allowed -->|"Yes"| transaction["Validate versions and retry key; commit change and audit together"]
  transaction --> readers["Role-scoped profile, dashboard, reports and audit views"]
  readers --> export["Authorized export: Minimize personal data; audit disclosure"]
  admin["Administrator: Manage accounts, roles and configuration"] -.-> auth
  transaction -.-> backup["Designated technical operator: Encrypted backup"]
  backup --> restore["Restore to isolated database; verify rows, schema and history"]
  restore --> release["Run acceptance suites; freeze source, build and migration hashes"]
  release --> signoff{"Coordinator and technical owner sign off, deployment controls ready?"}
  signoff -->|"No: current position"| pending["Keep candidate local; resolve acceptance and deployment items"]
  signoff -->|"Yes: future step"| launch["Controlled deployment with fresh backup and known rollback artifact"]
  launch --> monitor["Monitor workflows, access and backup completion"]
  monitor --> issue{"Critical regression?"}
  issue -->|"Yes"| rollback["Stop writes; controlled rollback or isolated recovery and reconciliation"]
  issue -->|"No"| monitor
  class admin,backup,restore,release,launch,monitor,rollback admin
  class auth,transaction,readers,export system
  class deny,pending exception
  classDef operator fill:#e9f3f0,stroke:#276657,color:#163d34,stroke-width:1.5px
  classDef coordinator fill:#fff1cf,stroke:#94701e,color:#533f12,stroke-width:1.5px
  classDef admin fill:#eaf0fc,stroke:#526f9a,color:#263b60,stroke-width:1.5px
  classDef system fill:#f0f1f4,stroke:#707b8a,color:#28323f,stroke-width:1.5px
  classDef exception fill:#fae9e8,stroke:#a75750,color:#632b27,stroke-width:1.5px
```

## Reading notes

- Registration is once per person. Each academic year adds its own academics and scholarship record; a new semester adds a new checklist/cycle without resetting older paid history.

- Excel stages and validates data before explicit confirmation; it does not silently overwrite existing people. Resolve duplicate rows before confirming an import.

- Qualification requires a complete same-year academic record. Not Selected ends that annual qualification path. Official publication activates included Selected scholars.

- Normal eligibility requires current authoritative records and satisfying document statuses. Waivers only count where cycle policy allows them. Normal ineligibility includes Dropped status. An approved eligibility override is a separate, audited exception, not an alteration to the normal calculation. Source changes require recalculation/review.

- Requirement verification is permitted to both Staff and Coordinator. It does not require a different person from the receiver. Approval workflows requiring an independent Coordinator are explicitly labeled.

- Unverified requirement states may receive an authorized waiver; Verified/Waived cannot simply be replaced by a waiver. Rejected documents do not use ordinary resubmission: the shown resubmission path starts from For Correction.

- Masterlists can be returned to Draft at permitted pre-publication states. Published/Locked originals are never reopened; amendments create new versions.

- OVR draft admission and finalization recheck current sources, duplicates and pending changes. Failed finalization rolls back the whole operation. A pending OVR amendment pauses administrative processing; amendments are unavailable after processing begins.

- A rejected/cancelled change request has no effect on the authoritative record. Reapproval never erases the original evidence. Terminal status corrections use linked correction history rather than deleting status events.

- Closed-batch corrections preserve original closure totals and show corrected effective totals separately. Closing a batch does not itself close the whole payout cycle.

- Routine receiving uses the simplified screen. Additional custody details are optional; decision reasons/references remain required where the workflow calls for them.

## Implementation references

- [Implementation plan](../LDSS_Codex_Function_by_Function_Implementation_Plan.md)

- [Official publication and activation](F11-delivery.md), [masterlist amendments](F12-delivery.md)

- [Verification](F16-delivery.md), [waivers](F17-delivery.md), [overrides](F20-delivery.md)

- [OVR processing](F23-delivery.md), [OVR amendments](F24-delivery.md), [payment corrections](F25-delivery.md)

- [F36 acceptance checklist](F36-acceptance-checklist.md), [release and rollback](F36-release-runbook.md)
