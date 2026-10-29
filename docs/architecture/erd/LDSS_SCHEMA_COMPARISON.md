# Primary versus Individual Payments UAT schema

29 October 2026. No automatic reconciliation or migration was performed.

| Inventory | Primary | 5181 UAT |
|---|---:|---:|
| Base tables | 150 | 149 |
| Views | 3 | 3 |
| Columns including views | 1250 | 1246 |
| FK constraints (not component rows) | 381 | 381 |
| CHECK constraints | 223 | 223 |
| Index definitions | 539 | 537 |
| Journal entries | 67 | 67 |

## Environment-specific tables

Primary only: `_ldss_annual_uat_owner`, `_ldss_uat_owner`. 5181 only: `_ip_uat1_owner`. These ownership/recovery markers have different fields and primary keys; they are not application financial entities or backup-job tables. Their complete definitions are in the dictionary. Supported purpose references: [primary two-batch owner](../../../scripts/uat-two-batch.ts#L105), [annual owner](../../../scripts/test-annual-intakes-db.ts#L88) and [IP-UAT-1 report](../../acceptance/IP_UAT_1_INDIVIDUAL_PAYMENTS_TEST_ENVIRONMENT_REPORT.md). No marker values were read.

## Shared objects

151 common objects. Column/type/nullability/default/generation/collation, PK/UNIQUE/CHECK/FK definitions and referential actions match on shared objects. All 381 FK constraints and ordered component mappings match after self-schema qualification normalization.

**One index difference:** primary retains the standalone nonunique scholar_intakes.academic_year_id (academic_year_id) index. 5181 lacks it. Both retain ix_intake_associated_year (academic_year_id, scholar_id); [F53](../../../db/migrations/20261024010000_f53_annual_intake_registration.sql#L10) adds that composite index. The history causing retention/removal of the standalone index is not established by schema metadata. No unique or FK constraint difference follows from this observation.

All three view definitions match after stripping the actual database qualifier; raw qualifiers are retained in schema JSON. The 33 trigger definitions match after qualification normalization. No view or trigger was executed.

## Migration journal

Version differences: **0**. Checksum differences: **0**. Applied-time differences: **67** (independent installation history, not a checksum drift). Repository migration-file mismatches for applied versions: **0**. Unapplied repository migration files: **0**; existence on disk does not establish deployment. No journal was changed.

| Version | Checksum (both) | Primary applied_at | 5181 applied_at |
|---|---|---|---|
| `20260929000000_f00_baseline.sql` | `5c7ec2220869ea3356664e332da673f5bdede75e5f81dc66128a0aab25f0868c` | `2026-10-24 01:36:55.649749` | `2026-10-28 05:35:42.408914` |
| `20260929010000_f01_authentication.sql` | `a93809f39d29385622b30dd9489d2bbbbe46ca1a2017572918dddf3f8aef14a0` | `2026-10-24 01:36:55.715860` | `2026-10-28 05:35:42.461203` |
| `20260929020000_f02_permissions.sql` | `628ca074c1dd35b03053a29ab5a9603a3c0aae40ada4d9a6073ac0855c70e97a` | `2026-10-24 01:36:55.781960` | `2026-10-28 05:35:42.512603` |
| `20260929030000_f03_configuration.sql` | `3aa941c95f7038c681a5a02a9cc863b0b6a0365bf236ebf5ffe1fd2e0e44cefe` | `2026-10-24 01:36:55.882674` | `2026-10-28 05:35:42.581490` |
| `20260929040000_f04_scholars.sql` | `d23d064963c8c09ed0f80155388179af4ce0a3e4d6010004cd0e8a4ff5479554` | `2026-10-24 01:36:55.942886` | `2026-10-28 05:35:42.623321` |
| `20260930060000_f06_qualification.sql` | `862d5132abb23b7a187229d5174aec9aaece6a91bbdaf016621e8ec7964ba4dd` | `2026-10-24 01:36:55.998290` | `2026-10-28 05:35:42.656049` |
| `20260930070000_f07_status_changes.sql` | `1877b23b63fc36b308afbd54487fb258175997f26bd940d256e0d28e5b4d33c0` | `2026-10-24 01:36:56.066626` | `2026-10-28 05:35:42.713229` |
| `20260930080000_f08_academic_records.sql` | `605c13f17cf964184a3d39540f6c02098dc5cf03a596378b05417cf97ebae46f` | `2026-10-24 01:36:56.094785` | `2026-10-28 05:35:42.738656` |
| `20260930090000_f09_academic_changes.sql` | `a88aadd4e2517f44aabb57784306dee5929e3460cbff90619455b3f1458b6976` | `2026-10-24 01:36:56.138023` | `2026-10-28 05:35:42.773908` |
| `20260930100000_f10_masterlist_drafts.sql` | `8dfa4954381c29fc104d122727c66752b1a426f9cce15aec02924f1a9718e333` | `2026-10-24 01:36:56.180435` | `2026-10-28 05:35:42.810075` |
| `20260930110000_f11_official_masterlists.sql` | `3662085011854364e045c195a60f884746418402be9da8e7bfdf8787fe49e022` | `2026-10-24 01:36:56.242451` | `2026-10-28 05:35:42.858349` |
| `20260930120000_f12_masterlist_amendments.sql` | `b89f5e7831097ab69c71f614cbce8f1f156a4fb52ae1368bc571d6d0cc7073af` | `2026-10-24 01:36:56.300013` | `2026-10-28 05:35:42.914632` |
| `20261001090000_f13_requirement_definitions.sql` | `07e44a35f79f9a34d229dc7e5eef1a9c12c028065d49abaf41c721497b9c5db2` | `2026-10-24 01:36:56.334194` | `2026-10-28 05:35:42.939601` |
| `20261001100000_f14_requirement_instances.sql` | `7d2edbd0f6faf42a8e37d45ca6235214234711abdd6cbfcba38dfe471a0ad66a` | `2026-10-24 01:36:56.370810` | `2026-10-28 05:35:42.967908` |
| `20261001110000_f15_requirement_receiving.sql` | `9492c7ac42492e2b9d3349af3fd848bd1a1495c95c5d213713f4cf03ca248bdd` | `2026-10-24 01:36:56.390645` | `2026-10-28 05:35:42.984161` |
| `20261001120000_f16_requirement_verification.sql` | `7cc9d516252d7ee508643b2c8e05e88a444ec693a97d60ea5ea373e18c11c3ad` | `2026-10-24 01:36:56.410336` | `2026-10-28 05:35:43.001580` |
| `20261001130000_f17_requirement_waivers.sql` | `bf94b77f41d9baeb9167b659b6e860e60e8704af4b9db85255436000a036dea2` | `2026-10-24 01:36:56.428876` | `2026-10-28 05:35:43.017252` |
| `20261001140000_f18_payout_cycles.sql` | `5aff96abb6883f80d3fb95256e5fd12c87fc6fddd78cb9077f854ec87d1722af` | `2026-10-24 01:36:56.494373` | `2026-10-28 05:35:43.080448` |
| `20261002090000_f19_payout_eligibility.sql` | `768d82ba6bf577dbc16c991b254f01141f78a298b4823873130ba9184c6c21a1` | `2026-10-24 01:36:56.515083` | `2026-10-28 05:35:43.098661` |
| `20261002093000_f20_eligibility_overrides.sql` | `dc79bfe0a03471458573313d6c41fd47b34e9009de3438e2670f68e3ff256f75` | `2026-10-24 01:36:56.550291` | `2026-10-28 05:35:43.150725` |
| `20261002100000_f21_ovr_drafts.sql` | `0b0fc97f49ae1fbe268d340aa18585890ca028c1f0b3309415c61289b084d63c` | `2026-10-24 01:36:56.593496` | `2026-10-28 05:35:43.206697` |
| `20261002110000_f22_ovr_finalization.sql` | `135adece2258df50266712aec40b3800c4f9eb9c66bf134f9ea43a945889493b` | `2026-10-24 01:36:56.607774` | `2026-10-28 05:35:43.221475` |
| `20261003090000_f23_ovr_processing.sql` | `929cf7240faa602720de2ed8c9b870e23f95d5d6f1315771f041baf5a59c9ce0` | `2026-10-24 01:36:56.625270` | `2026-10-28 05:35:43.239165` |
| `20261003100000_f24_ovr_amendments.sql` | `73aa668d6197061add0779995eb1ddaea24417bfff635a6a86f18b032b6b3a22` | `2026-10-24 01:36:56.640264` | `2026-10-28 05:35:43.250938` |
| `20261003110000_f25_payment_corrections.sql` | `6210869d4e1479cacbce6576f9f2705cc3ff3273adf81b9f1f745c4db5845279` | `2026-10-24 01:36:56.656687` | `2026-10-28 05:35:43.266416` |
| `20261003120000_f26_profile_audit_view.sql` | `a224a6184785dd0c6a877dd6c6317d66337f7f2af9f59c368ed7e9fe039744f9` | `2026-10-24 01:36:56.659505` | `2026-10-28 05:35:43.269247` |
| `20261004090000_f27_excel_import.sql` | `88b6967537b6bc5d5699390e96052f4d6a45193d99f57b3b986d23cf2b539975` | `2026-10-24 01:36:56.690756` | `2026-10-28 05:35:43.294584` |
| `20261004093000_f28_excel_exports.sql` | `51c512f063663045177ad006cb1594fe7a3d2644246eab1308dc0cbd0d3e6a5b` | `2026-10-24 01:36:56.694638` | `2026-10-28 05:35:43.298622` |
| `20261004180000_f31_audit_viewer.sql` | `b40c0257b5fe55efd7581eeb478df4b28646a421fcd84aabfeda5ccea0326985` | `2026-10-24 01:36:56.717496` | `2026-10-28 05:35:43.325371` |
| `20261006010000_f36_workflow_foundation.sql` | `5a7a7dc2ba6df4d8a85348d61ed56a7dac0e7b97d140e2a52a509ecfce023d4c` | `2026-10-24 01:36:57.020231` | `2026-10-28 05:35:43.529452` |
| `20261006020000_f36_continuing_rosters.sql` | `dab3846d9a78718aaa39f466b62141d3a2ff9ec0df98c62fc340c6e3b50296d9` | `2026-10-24 01:36:57.024319` | `2026-10-28 05:35:43.531479` |
| `20261006030000_f36_semester_checklist_owner.sql` | `399ed165000addeab2f5f2ce8bf851fe21d2e7f43e09ed7953cb5fa2fbe6553f` | `2026-10-24 01:36:57.062129` | `2026-10-28 05:35:43.561062` |
| `20261006040000_f36_semester_setup.sql` | `ccdb9dc2580e4cdf7eeca55acef3f8e8b7117da9d93475e3834ad1ddea209843` | `2026-10-24 01:36:57.065000` | `2026-10-28 05:35:43.563144` |
| `20261007010000_f36_payroll_submission_windows.sql` | `5bb245ec80738fecb10e2d4a00747426da3c86d7771dd8f74c52ebc8bb739d8d` | `2026-10-24 01:36:57.123165` | `2026-10-28 05:35:43.607510` |
| `20261007020000_f36_enrollment_document_evidence.sql` | `dd24f90e77c12d08f66f3fbadd6dadfd60835db61cd453f19a7e2431c27cd73f` | `2026-10-24 01:36:57.138720` | `2026-10-28 05:35:43.620227` |
| `20261007030000_f36_requirement_timing_decisions.sql` | `51ece06ac6bd65d51127208fbb4041e27477ab3972487fd6f835c01b33132290` | `2026-10-24 01:36:57.155190` | `2026-10-28 05:35:43.631256` |
| `20261007040000_f36_payroll_workflow.sql` | `d93984cdf1fe1e85dea5a8162eb48db15041f35cc94ff4eec94ff07c07358607` | `2026-10-24 01:36:57.243600` | `2026-10-28 05:35:43.698399` |
| `20261007050000_f36_graduation_confirmation.sql` | `c1de2b40aaefa7fad80a52542c8eba178dc452c76a653eb866fe70605dac0e76` | `2026-10-24 01:36:57.259344` | `2026-10-28 05:35:43.711257` |
| `20261007060000_f36_admission_validation.sql` | `96da5beadd3a3f6cbc3398a93bd4381ee65f7c218ad0ea639c5664136720bd33` | `2026-10-24 01:36:57.295756` | `2026-10-28 05:35:43.747465` |
| `20261008010000_f36_workflow_diagnostic_fixes.sql` | `c55555924185209453ff4c3fe59ef3109052692192eb393460daeaf0796d9c36` | `2026-10-24 01:36:57.344010` | `2026-10-28 05:35:43.793071` |
| `20261008020000_f36_annual_rollover.sql` | `9d862e0850a62a420fb5b3e7a7912ed87dd4b5a6dde5de878e9e5957ab87b582` | `2026-10-24 01:36:57.396553` | `2026-10-28 05:35:43.840128` |
| `20261008030000_f36_scholar_intake.sql` | `d99c6120a11564a85dc4cb35058e51afcfe267d447ef8275d395ba4e82fc6f2f` | `2026-10-24 01:36:57.425808` | `2026-10-28 05:35:43.865599` |
| `20261008040000_f37_notifications.sql` | `1202235bbfc3cabfefc0ee58798b03710ea4abd126d2c5f37f2e5bdb9086cb87` | `2026-10-24 01:36:57.469552` | `2026-10-28 05:35:43.899655` |
| `20261009010000_f36_unclaimed_reprocessing.sql` | `f046cead6863d5d14313112932937ded1ddd2c24d8637e0758c8e72d74bedaee` | `2026-10-24 01:36:57.563155` | `2026-10-28 05:35:43.979128` |
| `20261010010000_f36_payroll_signatories.sql` | `89257fc68d08e2d0df74a8f51d1e8d77fc4ba26b912224f9bf1b2099bf85f0db` | `2026-10-24 01:36:57.565540` | `2026-10-28 05:35:43.981462` |
| `20261010020000_f38_treasury_reconciliation.sql` | `669ad685923c7b5f7109fb5322491cbb678a36fb7baffb2ac1294263780f8da7` | `2026-10-24 01:36:57.626883` | `2026-10-28 05:35:44.028987` |
| `20261010030000_f38_placement_policy_reviews.sql` | `c8830dc8a0f8eb6fde3791c63f207e775a5b4d09e9d84562fd37a3d0b1edd502` | `2026-10-24 01:36:57.640392` | `2026-10-28 05:35:44.044330` |
| `20261010040000_f38_legacy_conversion.sql` | `4263cdc9467b1c3acc6d3c8f7498ec03eb48648fea6d7c462b6ea52ff429b1ed` | `2026-10-24 01:36:57.655388` | `2026-10-28 05:35:44.057151` |
| `20261013010000_f39_masterlist_additions.sql` | `6f966989386dcea152bb00fd40662b2307bab9b2ee4f4ad60a9c116812fcea7f` | `2026-10-24 01:36:57.685120` | `2026-10-28 05:35:44.082095` |
| `20261013020000_f40_masterlist_consolidation.sql` | `6565634ea777e899c34103f20c2a1321ea753e3ad8bb7e5109b446ac63c2ee9d` | `2026-10-24 01:36:57.713521` | `2026-10-28 05:35:44.104426` |
| `20261014010000_f41_shared_semester_documents.sql` | `75e6f7e8ee0802d5b821a8aebdd79da453cb730a349f4adbc640ea2a59920205` | `2026-10-24 01:36:57.729763` | `2026-10-28 05:35:44.117780` |
| `20261014020000_f42_entrant_grading_cards.sql` | `a51862cf0af5b09acccdf5ab64770fea191200c844d0818e8e7f36675c8f471d` | `2026-10-24 01:36:57.776115` | `2026-10-28 05:35:44.153464` |
| `20261014030000_f43_policy_consistency.sql` | `eee4e6f09e09c6eb50dff843c334b8acaddbf965d655ab9416ecebdf49e42349` | `2026-10-24 01:36:57.783763` | `2026-10-28 05:35:44.160379` |
| `20261020010000_f44_course_pending_import.sql` | `74b5d68cee3eb6e83ce0ffbc9412853ac7859220c71186b9599a17ee41aa6d64` | `2026-10-24 01:36:57.864272` | `2026-10-28 05:35:44.272201` |
| `20261020020000_f45_prior_batch_approval.sql` | `4983d3cfdcab10c10550b49ce6613445230df2cbbe4225d5e032b6808c583e7e` | `2026-10-24 01:36:57.937012` | `2026-10-28 05:35:44.343512` |
| `20261022010000_f46_payroll_reconciliation.sql` | `20e278f00df46e05de1c5c0e383a25b4e44aac0ffba5c88c87fccbc46ec6de14` | `2026-10-24 01:36:57.968880` | `2026-10-28 05:35:44.373198` |
| `20261022020000_f47_single_closure_snapshot.sql` | `8a480bb112a05104da7069f6675bdfe4352598eb2c006345b15f5420da938743` | `2026-10-24 01:36:58.038604` | `2026-10-28 05:35:44.408040` |
| `20261022030000_f48_individual_unclaimed.sql` | `bb26ce8f2f41d7f8bc6405868a1dc1794200e5b02df6d27ef085e99facc43000` | `2026-10-24 01:36:58.092550` | `2026-10-28 05:35:44.446430` |
| `20261022040000_f49_omitted_scholars.sql` | `b36e639da326997f126d38db0b4ee383a30a1ad652e5abcd8e8fb49f2c90a792` | `2026-10-24 01:36:58.169103` | `2026-10-28 05:35:44.506358` |
| `20261022050000_f50_omission_approval_owner.sql` | `bcd0becbe816d7b81d4f8c36c12d94b96dd9d0488ea0d3b73903c0448c48b4cd` | `2026-10-24 01:36:58.195438` | `2026-10-28 05:35:44.530335` |
| `20261022060000_f51_individual_documents.sql` | `f231f4883f918432958bbad93609b414401be622cede50547bf0e5e38d6adf0a` | `2026-10-24 01:36:58.234381` | `2026-10-28 05:35:44.560090` |
| `20261022070000_f52_individual_settlement.sql` | `bb42fd6da7266884df26ae4b299c184737acd7423e80bf2007fd23cac9c3351e` | `2026-10-24 01:36:58.311759` | `2026-10-28 05:35:44.621752` |
| `20261024010000_f53_annual_intake_registration.sql` | `75b9b7a2bd7ab94c5fcc8c82dbedb5fc0193319434603e245843be75c4fa3861` | `2026-10-24 08:39:15.167266` | `2026-10-28 05:35:44.704555` |
| `20261024020000_f54_graduation_monitoring.sql` | `31f507ee9ca5358ec6a64bb667ba6ef4055abb8d83bd486a67b7bdd23a0d8d66` | `2026-10-24 15:00:30.666575` | `2026-10-28 05:35:44.834484` |
| `20261025010000_f55_import_intake_bindings.sql` | `2208ea4522899c666ac6f2c475c1098a86a34a496a593d1bbbb0297b7c0e5f1e` | `2026-10-24 17:37:58.592133` | `2026-10-28 05:35:44.855815` |
| `20261025020000_f56_intake_supplied_text.sql` | `d130f15172bf6f02cc4ec0ff6da5922564ebd671870f16534782fe0504fa350e` | `2026-10-25 05:19:50.554990` | `2026-10-28 05:35:44.889609` |
| `20261027010000_f57_payroll_cutoff_policy.sql` | `b818ddafd1a38b91b421b6df0bcef9d1b8f7453b97635502afa8dd460946b71e` | `2026-10-27 01:11:49.854869` | `2026-10-28 05:35:44.934592` |
