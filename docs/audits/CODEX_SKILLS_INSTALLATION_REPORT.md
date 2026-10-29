# Verified Codex skills installation

Date: **23 October 2026, Philippine time**. Status: **S01, S02 and S03 installed and verified; installation scope complete.** The user's explicit approval of the pinned [evaluation](CODEX_SKILLS_EVALUATION.md) authorized these three folders, the documented manual-invocation metadata and source/license attribution. No complete LDSS audit, questionnaire, P11 remediation or deployment has started.

## 1. Installed scope and provenance

| ID | Installed directory | Publisher, pinned revision and exact source path | Upstream files → installed files |
|---|---|---|---:|
| S01 | `C:/Users/ADMIN/.agents/skills/sharp-edges` | Trail of Bits, [`196a9073ab10d35bacf111f945e02c00b2c6883a`](https://github.com/trailofbits/skills/tree/196a9073ab10d35bacf111f945e02c00b2c6883a/plugins/sharp-edges/skills/sharp-edges), `plugins/sharp-edges/skills/sharp-edges` | 19 → 21 |
| S02 | `C:/Users/ADMIN/.agents/skills/variant-analysis` | Trail of Bits, same commit, [`plugins/variant-analysis/skills/variant-analysis`](https://github.com/trailofbits/skills/tree/196a9073ab10d35bacf111f945e02c00b2c6883a/plugins/variant-analysis/skills/variant-analysis) | 18 → 20 |
| S03 | `C:/Users/ADMIN/.agents/skills/vercel-react-best-practices` | Vercel Engineering, [`063bee94c3f4df8453406c830b0a7df0f2860278`](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices), `skills/react-best-practices` | 76 → 78 |

All three destinations were absent before installation. The existing reviewed Skill Installer was run with the exact repository, commit and path arguments, explicit destination, and **`--method download`**. S01/S02 shared one pinned archive download; S03 used a second invocation with **`--name vercel-react-best-practices`**. The helper copied only the selected directories and removed its temporary archives. No marketplace, candidate installer, scanner, hook, daemon, package lifecycle, MCP server or additional package was installed or executed. Existing skills were not overwritten or reinstalled. [Exact installer commands and results](../../output/skills-installation-20261023/installer-results.json).

The child download environment excluded `GITHUB_TOKEN` and `GH_TOKEN`. Downloads used public unauthenticated GitHub HTTPS sources. No credentials were configured or passed to the public download helper. No private LDSS file, source content, scholarship record, financial data or database contents was uploaded. Official OpenAI documentation was read separately to verify the local discovery/invocation interfaces; this was not a vendor scan.

## 2. Hash verification and local metadata changes

Before local modifications, **all 113 files / 405,814 bytes matched the evaluated per-file SHA-256 manifests**, with no missing or additional upstream file. The approved [proposal manifest](../../output/skills-evaluation-20261023/proposed-installations.json) remains unchanged as historical evaluation evidence; the current installation receipt is separate. [Pre-metadata verification](../../output/skills-installation-20261023/upstream-verification.json).

| ID | Unchanged installed `SKILL.md` SHA-256 | Final installed relative-file manifest SHA-256 |
|---|---|---|
| S01 | `3b69a709c2f8f0cfcf57d40a3186e166f307865cc8ed924be4098e549a121e9c` | `9001c9b901b6cf9277a363d9ff880eb19de24006ca30826c2667673e16c4517c` |
| S02 | `7b6b78e499bcb88d05c68254ffc91ebc28edabf4e9808adcc40e2628ebb9407e` | `07983ce616a7b54b4e6ebe9f47edfcfc08b225c53982d3916a45b9fcc3908f28` |
| S03 | `71ed7794962fa6e803ee83030517b5b93a9f70fbfeb431ec4535c5480a8d8355` | `d73b031be611b3e0b0339da0ba2530e32e57ac0d1d2905e6fe19b8c4373febb4` |

The [installed manifest](../../output/skills-installation-20261023/installed-manifest.json) records **every installed file**, its bytes/hash, source revision, destination and disclosed metadata delta. Each relative-file manifest digest above hashes its sorted `files` array serialized as UTF-8 JSON with two-space indentation and a final newline. The overall installed-manifest file SHA-256 is **`0e31404314f880998d52258bcdc2eb5e9511e29a613dcdcd733df91f896dd70c`**.

Each installed `agents/openai.yaml` contains:

```yaml
policy:
  allow_implicit_invocation: false
```

For S01/S02, the only upstream-file change is appending this policy to the existing YAML; all interface fields and assets are preserved. S03 receives a new local YAML with display name, short description and the same policy. No upstream `SKILL.md`, reference, rule, resource or compiled guide was edited. This setting permits explicit invocation while excluding implicit use, as described in the [official skills documentation](https://learn.chatgpt.com/docs/build-skills).

| ID | Upstream YAML SHA-256 | Installed YAML SHA-256 | Additional local files |
|---|---|---|---|
| S01 | `d18c31ffb600df69db714161add9a1fe1dca38011b52a0c8926d4d4d3fb1ea4f` | `c77bae1f9eb7cbe1d29e84e27a73fb553ddf94ee9af00c6b7d75c1c19db9b325` | `SOURCE.md`, `LICENSE` |
| S02 | `6d6b67250ba8300e79491ac12e73262f54f2bf50776276fd04607ae4e3006fde` | `3218a517464aeb75156b57a5d499ef756ca368537e811fa945d7293fc8eca320` | `SOURCE.md`, `LICENSE` |
| S03 | None; local addition | `47529c38d45e2d5767975f0eccc709d0b29d8072ce6244965d559c0fac80c287` | `SOURCE.md`, `agents/openai.yaml` |

Final inventory: **119 files**: **111 byte-identical upstream files**, **two disclosed upstream YAML adaptations**, and **six local additions**. Installed sizes are S01 **151,589**, S02 **66,088**, and S03 **231,673 bytes**. [Metadata modification receipt](../../output/skills-installation-20261023/metadata-deltas.json).

Every `SOURCE.md` attributes the publisher, exact URL/commit, license, local changes and user-approved usage boundary. S01/S02 include unchanged copies of the pinned Trail of Bits **CC BY-SA 4.0** repository license; each LICENSE SHA-256 is `7abe19ec9bb73b36141b999b861d24ad855e808bafe0f81e84cce28556f6c297`. S03 preserves its upstream **MIT** declaration and attribution. The reviewed Vercel repository has no standalone license file; no invented publisher copyright/license file was added. The installed trees are not described as wholly byte-identical upstream because of the disclosed additions/adaptations.

## 3. Actual discovery and explicit/manual invocation verification

Verification used the installed **Codex CLI 0.162.0-alpha.17.2**, from the existing VS Code extension, Python **3.14.0**, Node **22.21.0** and existing ripgrep. No new runtime dependency or subscription was needed.

An owned local app-server process executed **`skills/list` with `forceReload: true`** for both a separate synthetic temporary directory and `C:/xampp/htdocs/scholar_monitor`. In both contexts, all three exact user-scope paths were discovered, enabled and associated with their expected UI metadata; **zero skill-discovery errors** occurred. This verifies discovery beyond directory existence. No LDSS source was supplied to a model. [Native discovery evidence](../../output/skills-installation-20261023/discovery.json). The method follows the documented [app-server skills interface](https://learn.chatgpt.com/docs/app-server).

Native turn construction was then exercised using ephemeral synthetic threads and a temporary, **loopback-only in-process capture endpoint**. It returned deterministic empty protocol completions, not model-generated responses. Provider overrides existed only in that owned process; global Codex configuration was not edited. Existing MCP entries/apps were disabled for these test sessions, no tool calls were returned/executed, and captured requests carried **no Authorization header**. No external inference, nested model, additional agent, installed server or target application was used. Only selected checks/hashes were retained, not complete global prompt contents.

| Verification | Result |
|---|---|
| Matching toy prompt without explicit skill selection | All three instruction bodies absent; approved skill entries also absent from the offline implicit context |
| `$sharp-edges`, `$variant-analysis`, `$vercel-react-best-practices`, each with the native structured skill item | Each selected complete installed instruction file loaded; other two absent |
| The same three `$skill-name` markers **without** structured skill items | Each selected complete installed instruction file loaded; other two absent |
| Manual policy on disk | Exactly one `allow_implicit_invocation: false` per installed YAML; hashes match the recorded changes |

All **seven native transport cases passed**. [Explicit/implicit loading evidence](../../output/skills-installation-20261023/explicit-verification.json). These checks verify native selection/injection and suppression of implicit context, not autonomous reasoning quality or an OS-enforced sandbox.

The initial `codex debug prompt-input` probe omitted the skills even when an explicit marker was merely appended. It renders session context plus the supplied prompt, without exercising the complete turn-specific skill-selection path. That probe is retained as a limitation and **is not counted as an explicit-invocation pass**; the subsequent native turn tests above verify actual loading. [Initial probe](../../output/skills-installation-20261023/prompt-verification.json), [official command scope](https://learn.chatgpt.com/docs/developer-commands).

The current conversation's skill catalog may refresh on the next turn. No running user session was restarted. The installer recommends availability on the **next turn**; a stale picker may require a normal Codex restart. Native discovery/loading already passed on this host; a visual picker screenshot is not claimed.

## 4. Small synthetic examples

The current Codex assistant explicitly read all three installed `SKILL.md` files and applicable Variant Analysis/Vercel references, then applied their guidance to owned synthetic fixtures outside the LDSS worktree. Exact toy copies and hashes are retained privately. An owned Node harness passed **18 assertions**; fixture hashes were unchanged through execution, search and review. No upstream executable/example query or LDSS module was run.

| Skill | Exercise and observed result |
|---|---|
| Sharp Edges | Toy authentication API with a safe whole-object default but fail-open missing/false option. Reproduced acceptance of invalid tokens with `{}`, false, zero, empty and null option values. Distinguished omitted-argument rejection, valid-token success and null-object failure. Review only; no remediation. |
| Variant Analysis | Used that **already reproduced concrete defect** as the seed. Narrow ripgrep searches expanded one element at a time: **1 → 2 → 4** hits. Confirmed the seed and two variants; rejected the normalized/guarded look-alike. No broad application scan, CI rule or automatic modification. |
| Vercel React Best Practices | Reviewed toy React/TypeScript code with two independent sequential requests and a label maintained through redundant effect/state. Identified existing `Promise.all` and render-time derivation as appropriate client concepts. A deterministic request-start trace passed; no React renderer or browser timing benchmark was run. |

[Synthetic review, findings and false-positive reasoning](../../output/skills-installation-20261023/synthetic-review.md), [actual test/search results and file hashes](../../output/skills-installation-20261023/synthetic-results.json), [toy files](../../output/skills-installation-20261023/synthetic-fixtures/ToyCard.tsx). These are usability/compatibility smokes, not evidence of LDSS vulnerabilities, a complete security assessment or a guaranteed performance improvement.

## 5. Permissions, dependencies and continuing usage boundaries

The installation needed ordinary filesystem writes to the three new user skill folders and public GitHub reads. No administrator access, database account, API key, privilege escalation, application dependency, runtime grant or LDSS configuration change was needed. Verification used existing local tooling and a temporary loopback capture that was stopped afterwards. No persistent provider, hook or MCP configuration was added.

The approved boundaries are recorded in the local attribution files:

- **Sharp Edges:** security/defensive-programming review only; no automatic remediation.
- **Variant Analysis:** begin only from a concrete identified defect; no broad unapproved automated modifications. Semgrep/CodeQL are not installed or authorized by this receipt.
- **Vercel:** existing React/TypeScript frontend only. Preserve frontend architecture and R01–R07 improvements. No Next.js/RSC, SWR/new caching libraries, dependency change or module-level caching of financial decisions. Its upstream instructions still contain broader server/framework recommendations; those are outside the user's authorization.

Manual invocation controls discovery/use, not filesystem privileges or model correctness. The installed upstream text is preserved; the local usage notes and task authorization govern application. Marketplace-specific agent aliases/slash workflows were not installed. Direct narrow workflows worked in the synthetic examples; optional scanner, marketplace orchestration, broader frameworks and additional tools remain untested/unavailable. Future use must preserve these restrictions; installing a skill does not authorize any audit or fix.

## 6. LDSS and existing-tool preservation

The pre-installation baseline verified the accepted P10 inputs; the final check reconfirmed **all 683 source inputs, 261 build artifacts and 62 migrations** against their accepted hashes. All **265 pre-existing skill files** in the inventoried legacy user/repository roots remain exact, with no existing file added/removed in those roots (generated Python caches excluded consistently). Exactly the three approved new folders exist in the destination. `package.json` and lockfile remain at the accepted existing worktree versions; no dependency installation/build occurred.

Hash-only comparisons of existing Codex configuration/instruction files, present LDSS environment configuration and the evaluation document remained exact. The final verifier also checked installed upstream preservation, metadata deltas, attribution/license files, native discovery, all explicit/implicit cases and toy fixture hashes. [Pre-installation baseline](../../output/skills-installation-20261023/baseline.json), [final verification](../../output/skills-installation-20261023/final-verification.json).

Within the LDSS repository, only this requested report and ignored private installation evidence were created by this task; application code, schemas, dependencies and deployment settings were not edited. Existing unrelated/uncommitted work was preserved. No application test/build, database connection, financial command, user-account operation, production access, operational activation, LAN action or Git publication was performed. Consequently no application financial record was changed **by this installation**. This is an execution-boundary statement, not a fresh database-wide hash comparison or an assertion about unrelated concurrent user activity. The full application UAT gate was not rerun for instruction-only skill installation.

## 7. Completion and limitations

**Installation and scoped verification succeeded for S01, S02 and S03.** There was no installer/hash/discovery failure. The offline prompt-probe limitation and distinction between local transport verification, current-assistant toy review and real model/application testing are documented above. No runtime isolation, broad supply-chain certification, financial correctness revalidation or production capacity certification is implied.

Use explicitly on a future authorized task with `$sharp-edges`, `$variant-analysis` or `$vercel-react-best-practices`; these skills are configured for manual invocation only. **Stop here. The LDSS audit, whole-system questionnaire, P11 and all remediation/deployment remain unstarted and require the user's next instruction.**
