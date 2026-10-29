# LDSS controlled LAN roster import plan

Prepared 24 October 2026, Philippine time. **Identifiable import is not approved and has not run.** The populated UAT task independently authorizes fictional fixtures. It does not authorize copying names, school/course/year-level data, original IDs, documents or financial outcomes from LAN.

## Source and access qualification

The reference population is the user's approximately **835-scholar LAN roster**. Historical P10 and prior-batch evidence corroborate the population size, but do not establish that a particular current LAN table, workbook, view or roster revision is authoritative for this import. No approved source file/view, source owner, roster revision or authorized read-only connection has been supplied in this task. The repository's active local development configuration is not evidence of LAN read-only authorization.

**Actual LAN records accessed: none. Identifiable records copied: none.** No credential search, LAN account creation, permission change, production backup or remote database export was performed. Current UAT identities are independently generated fictional values; they have no production-to-UAT mapping. A fictional name coinciding with a real name would be incidental, not a copied record.

## Proposed fields and destination

| Field | Proposal awaiting explicit approval |
|---|---|
| First, middle and last name; suffix | Prefer independently generated fictional names. Real components may be copied only if the user expressly approves these exact fields and the authoritative source. Preserve compound/long-name formatting; never infer missing components. |
| Original Scholar ID | Exclude. Generate permanent IDs using the UAT sequence. No reversible map or original ID in filenames, notes or audit references. |
| School, course, year level | Exclude LAN values by default. Synthetic configured institutions and placements already support testing. Each real field requires separate inclusion approval. |
| Academic year and semester | Use explicit synthetic UAT calendar configuration, with no claim that it is an official calendar. |
| Birth date, phone, email, address, identification numbers | Exclude. |
| COR/COG files, grades, actual outcomes, cheques, accounting documents | Exclude. Generate only supported synthetic scenarios through normal workflows. |
| Credentials, sessions, tokens, representative identity | Never import. |

Expected population: approximately 835, to be reconciled against the specifically approved source before any import. Destinations must be the exact owned local schemas listed in [the environment report](LDSS_POPULATED_UAT_ENVIRONMENT.md), never a default development/LAN connection. Prefer a separately allocated synthetic UAT scenario for an approved import so the fictional acceptance fixtures remain reproducible.

## Exact controlled procedure and approval boundary

1. Identify and record the approved roster owner, source path or read-only view, revision/as-of date, expected count and lawful office authorization. Confirm an existing read-only account or an office-provided minimal export. Do not use a root/writer account for LAN access or create a new LAN account under this task.
2. Present the exact approved columns, extraction query or workbook range, destination schema, retention date and masking procedure for explicit user approval. **This plan is incomplete at those source-specific points; no executable LAN query is invented.** Do not execute a query/export simply because a previous task once accessed LAN.
3. Inventory the destination using `node scripts/uat-environment.mjs inventory SCENARIO`. Validate the manifest, ownership marker, exact database, migration checksums and dedicated restricted runtime account. Reject development, LAN, unknown schemas or a missing ownership marker.
4. Extract only the approved fields through the confirmed read-only method into an ACL restricted local temporary folder. Do not export a whole table/database or backup. Record count and a file hash without recording names in logs. Do not create a source-ID crosswalk.
5. Validate names/encoding and stage using the existing Scholar Registry import API/template where the approved columns satisfy its contract. Review duplicates and warnings before confirmation. The existing approved simple import also requires placement/classification information; **do not fill absent LAN fields with invented facts to make it pass**. Names-only records can use the existing registration/duplicate-review workflow; any additional bulk capability needs its own approved enhancement scope.
6. Confirm only the reviewed set through the existing authenticated import/registration commands. Use generated UAT IDs and retain truthful missing values. Source list approval is not masterlist publication, document verification or payment authority. Do not infer actual grades or financial outcomes.
7. Reconcile the approved count, unique IDs, duplicate decisions and excluded fields. Verify that logs/artifacts contain no excluded information. Keep the approved import isolated from automated security tests and external services.
8. Remove the transient extraction after reconciliation using an exact-path, reviewed cleanup. Retain only what the approved retention decision permits. Record disposal evidence without copying personal values into the report.

## Access, retention and artifact handling

The synthetic environment binds to **127.0.0.1** and uses separate application accounts. Runtime database privileges use the existing table/column grant generator; original account grants are preserved. Local UAT credentials are stored only in the ignored private folder restricted to the current Windows user and SYSTEM. Do not commit, publish or attach that folder.

For a future real-name import, proposed retention is **14 days after the agreed UAT review**, subject to explicit approval and applicable office requirements. This is a proposal, not a confirmed records policy. State an exact deletion date before copying. Backups containing approved personal data require the same ACL, encryption and retention restrictions; do not include such data in general synthetic backup archives.

Screenshots, PDFs, Excel and Word examples use fictional identities by default. Mask or exclude real names before any capture/export leaves the restricted workstation. Do not send private LAN records to AI services, external scanners, public archives or committed fixtures. Avoid making screenshots at all where masking cannot be verified.

Owned cleanup must validate the exact schema and ownership metadata and require explicit destructive confirmation. Run the inventory first. No existing database reset or identifiable import is authorized by this document.

## Risks and remaining approval

The principal risks are an incorrect roster revision, overbroad access, a linkable identity map, accidental screenshots/logging, and treating imported names as evidence of eligibility/payment. Source confirmation, field minimization, local ACLs, generated IDs and normal workflow checks address these at their respective boundaries. Synthetic data already permits independent functional and UI work.

**Gate remains pending:** authoritative roster/source; existing authorized read-only method; exact fields; extraction procedure; exact destination; retention date; and masking/backup restrictions. The user must explicitly approve the completed source-specific plan before identifiable copying.
