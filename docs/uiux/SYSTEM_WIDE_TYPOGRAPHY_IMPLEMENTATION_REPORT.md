# System-wide typography refinement

25 October 2026, Philippine time. **Implemented and tested in a new isolated candidate only. Primary 5173 is unchanged and was not restarted. Stopped after isolated verification.**

Review at [localhost:3022](http://127.0.0.1:3022/). Source: `C:/xampp/htdocs/ldss_typography_candidate_20261025`. Owned database: **`ldss_typography_test_51288_f9f45b4b`**, runtime **`ldss_ty_51288_f9f45b4b@localhost`**, **66 migrations**. Copied account identities/password hashes/roles remain available. Credentials and recovery keys remain restricted and are excluded from the review package.

## Baseline and original configuration

The accepted [B2.5 primary source](B2_5_PRIMARY_UAT_PROMOTION_REPORT.md) was verified against its six promoted hashes. A fresh checkpoint protects **1,290 existing main-workspace files**, actual primary runtime/profile, migration checksums, business rows, accounts, grants and audit evidence. A fresh encrypted source backup passed a new isolated restore before provisioning the copy. Copied sessions, reset tokens and rate-limit rows were excluded. [Preflight](../../output/typography-20261025/preflight.json), [verified recovery](../../output/typography-20261025/backup.json).

Original `src/styles.css` declared **Inter / Segoe UI / sans-serif** at root and Bootstrap body level, but supplied no Inter assets or browser font dependency. A later workspace override selected **Arial / Helvetica**, including headings. Several earlier auth/marketing headings used **Georgia**, and the shared dialog heading had its own Arial shorthand. Weights also mixed 400/500/550/600/650/700/750/800. Browser measurements confirmed Arial headings in the operational workspace. No existing browser `@font-face` or runtime font import was present.

The existing Noto Sans TTFs belong to server-generated PDF reports. They, PDF generation and all other backend behavior remain unchanged. Technical `pre`/`code` content retains its existing monospace formatting.

## Implemented typography and exact files

**One existing CSS file and seven new asset/license/provenance files**, entirely in the external candidate:

| Candidate path | Change |
|---|---|
| `src/styles.css` | Four local subset font faces; shared body/heading/weight variables; replace competing Inter/Arial/Georgia UI rules; approved weight hierarchy; tabular financial figures |
| `public/fonts/ldss/dm-sans-latin.woff2` | Normal variable DM Sans, CSS weights **400–600**, 36,932 bytes |
| `public/fonts/ldss/dm-sans-latin-ext.woff2` | DM Sans Latin Extended, 18,228 bytes |
| `public/fonts/ldss/manrope-latin.woff2` | Normal variable Manrope, CSS weights **600–700**, 24,836 bytes |
| `public/fonts/ldss/manrope-latin-ext.woff2` | Manrope Latin Extended, 15,120 bytes |
| `public/fonts/ldss/dmsans-OFL.txt` | Full copyright notice and SIL Open Font License 1.1 |
| `public/fonts/ldss/manrope-OFL.txt` | Full copyright notice and SIL Open Font License 1.1 |
| `public/fonts/ldss/README.md` | Versioned distribution URLs, licensing basis, coverage and exact hashes |

Manrope serves page/section headings, Dashboard KPI numbers and the existing major payment-summary totals. DM Sans serves body text, names, tables, forms, navigation, buttons, labels, badges and descriptions. Shared variables are `--ldss-font-body`, `--ldss-font-heading` and regular/medium/semibold/heading weight tokens. Existing intermediate/heavy UI weights are brought into the approved hierarchy. Segoe UI, Arial and generic sans-serif remain fallbacks.

Existing font sizes, line heights, layout, spacing, colors, table alignment, status meanings, accessible names and semantic markup remain. No text size was reduced. Financial tables and totals use lining/tabular numerals. The fonts fitted the tested layouts without a component or layout redesign.

**No TS/TSX component, handler, hook, dialog implementation, API, schema, test, dependency or configuration edit was needed.** All **824 other protected candidate source/configuration/test/assets** checked against the baseline match. [Exact eight-file inventory](../../output/typography-20261025/candidate-files.json), [source preservation](../../output/typography-20261025/source-preservation.json).

## Fonts, license and delivery

Assets are unmodified **Google Fonts WOFF2 distributions: DM Sans v17 and Manrope v20**, downloaded during this task. Both families permit bundling under **SIL OFL 1.1**; the full respective copyright notices/licenses accompany the assets. [DM Sans upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt), [Manrope upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt).

Four local files cover Latin and Latin Extended, including ordinary Filipino/Spanish accented names. Other scripts or unsupported characters use system fallback; this is not universal glyph coverage. No italic files, separate per-weight files, font package or UI library were added. The variable assets supply the required weights. Existing body/heading fallbacks and `font-synthesis: none` remain.

Font faces use **`font-display: swap`**, same-origin URLs and subset `unicode-range` declarations. No Google Fonts stylesheet, remote runtime request, preconnect or duplicate preload was introduced. The Google delivery CSS is retained only as task evidence. Both role review runs recorded **zero external runtime requests**. [Exact asset URLs/hashes/weights](../../output/typography-20261025/font-assets.json).

| Measured build property | Accepted B2.5 → candidate |
|---|---:|
| Browser font binaries | **0 → 95,116 bytes**, about **92.9 KiB** |
| Complete client assets, including licenses/provenance | **1,330,375 → 1,437,835 bytes** |
| Built CSS | **301,627 → 303,878 bytes** |
| CSS gzip observation | **45,160 → 45,601 bytes**, **+441** |
| Built JavaScript | **1,027,796 → 1,027,796 bytes** |
| Server build | **277 files byte-identical** |

Generated CSS/dependency asset names change. Compiled JavaScript compares exactly after normalizing those generated asset-hash references; this is not a claim of identical JavaScript file hashes. [Bundle comparison](../../output/typography-20261025/bundle-impact.json).

One cold local Dashboard sample loaded only the two Latin files: **61,768 encoded font bytes**, observed resource durations **2.6 ms / 5.0 ms**. An explicit `Ññé ₱` probe loaded the two Extended files as needed, bringing font bytes to 95,116. The subsequent sample still transferred the Latin files; no cache-hit or warm-speedup claim is made. These are local browser observations, not LAN/concurrency performance certification.

Blocking WOFF2 requests deliberately produced font-load errors while text remained visible and the fallback page had no horizontal overflow. The routes were then restored. [Loading/fallback measurements](../../output/typography-20261025/font-loading.json), [fallback capture](../../output/playwright/typography/font-fallback-1440.png).

## Screens and accessibility review

Staff and Coordinator reviewed **Dashboard, Registry, Add Scholar, Admission review, document policies, Masterlists, Payroll, Payment Recording, reconciliation, Individual Payments, Graduation Monitoring, Reports, financial reports, Configuration and My access** at **1440/1024/820/375/320 CSS pixels**, height 900. Signed-out access was also checked at all five widths. Existing role-limited/empty states remain honest; no permission was expanded or record invented to populate a screen.

All reviewed pages passed no-page-horizontal-overflow checks. Names remain readable, tables retain local scrolling, form labels and button text fit, and payment badges remain unclipped in DM Sans. Dashboard KPI/summary heading roles resolve to Manrope. Existing important font sizes remain unchanged, including measured Registry headings at **25.6 px** and Dashboard heading at **26.4 px**.

Both roles passed keyboard checks for School → Course, required-field validation, visible **3-pixel** payment-table/pencil focus and horizontal focus scrolling. Export dialogs fit all five viewports, use Manrope titles/DM Sans content, close with Escape and restore their triggers. Registration Cancel restores Add Scholar. Date correction opens with the actual stored **2026-10-24** date and was cancelled. No financial confirmation or save was sent. Existing dialog semantics/handlers are unchanged.

Browser business-write guards recorded **zero attempts**. Test sessions were signed out. No scholar save, import, academic command, payment/correction or calendar change was performed even on the retained review copy; integration mutations used fresh disposable schemas.

Native **200% zoom was attempted but is not verified**: browser shortcut attempts left `innerWidth=1440` and `devicePixelRatio=1`; Chrome settings are unavailable in the CLI's isolated browser context. These results are recorded rather than substituting CSS scaling or DPR emulation for native zoom. Full assistive-technology/WCAG certification is also not claimed.

Matched Coordinator before/after captures use the **same 1,000-person copy, account, default screen state, empty search/selection, viewport and zoom**. The accepted B2.5 client was replayed through candidate-only static-asset interception against the same real API. The after client was reloaded normally. No database, primary file or financial response was replaced. The account banner is masked with the page background in captures.

| Representative view | Before | After |
|---|---|---|
| Dashboard / 1440 | [Before](../../output/playwright/typography/coordinator-before-dashboard-1440.png) | [After](../../output/playwright/typography/coordinator-after-dashboard-1440.png) |
| Registry / 1024 | [Before](../../output/playwright/typography/coordinator-before-registry-1024.png) | [After](../../output/playwright/typography/coordinator-after-registry-1024.png) |
| Add Scholar / 320 | [Before](../../output/playwright/typography/coordinator-before-registration-320.png) | [After](../../output/playwright/typography/coordinator-after-registration-320.png) |
| Payment Recording / 1440 | [Before](../../output/playwright/typography/coordinator-before-recording-1440.png) | [After](../../output/playwright/typography/coordinator-after-recording-1440.png) |
| Graduation / 820 | [Before](../../output/playwright/typography/coordinator-before-graduation-820.png) | [After](../../output/playwright/typography/coordinator-after-graduation-820.png) |
| Financial report / 375 | [Before](../../output/playwright/typography/coordinator-before-financial-report-375.png) | [After](../../output/playwright/typography/coordinator-after-financial-report-375.png) |

All six representative views have matched pairs at every requested width. Additional evidence: [Staff Registry 320](../../output/playwright/typography/staff-after-registry-320.png), [dialog 320](../../output/playwright/typography/coordinator-dialog-320.png), [sign-in 375](../../output/playwright/typography/signin-after-375.png). [Coordinator screen results](../../output/typography-20261025/coordinator-review-final.json), [Staff screen results](../../output/typography-20261025/staff-review.json), [Coordinator controls](../../output/typography-20261025/coordinator-controls-final.json), [Staff controls](../../output/typography-20261025/staff-controls-final.json). The ui-ux-pro-max and Playwright skills supported these focused checks.

## Tests and preservation

| Candidate check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | **Exit 0**, no errors |
| `npm run build` | **Exit 0**, complete normal command |
| `npm test` | **Exit 0; 118 files / 753 tests**, including existing UI, badge, registration, recovery and dialog coverage |
| `npm run check:secrets` | **Exit 0** |
| Registry, Payment Recording, reconciliation, individual settlement, financial-report integrations | **All five exit 0**, freshly owned disposable schemas |
| Current primary and copy payment previews | **798 / 200 accepted, zero conflicts**, no commit |

Existing regression coverage retains R01/R07 parity, financial guards, retry/atomicity, Original/current distinctions and complete API/XLSX/PDF outputs. No test rule, validator, output limit or financial pin was weakened. [Five normal command exits](../../output/typography-20261025/checks-main.json), [unit log](../../output/typography-20261025/test-main.log), [five integration commands/exits](../../output/typography-20261025/regressions-typography/results.json), [authoritative financial reads](../../output/typography-20261025/readiness.json).

All **1,290 protected primary files** match. Primary remains **66 migrations**, exact restricted runtime and unchanged controller/API/Vite **49912 / 32832 / 41884**. All current business values/definitions, migration checksums, accounts/password hashes/roles, grants and **10,404 existing audit rows** match. This task performed no primary login; no authentication/audit difference was observed in the final comparison.

Primary and copied original records retain **1,000 scholars, 14 accounts, 1,000 annual intakes/academic records and 1,000 entitlements/allocations**. Permanent IDs, annual classifications, original Excel/import bindings, Masterlists, academic/standing history and frozen financial sources remain exact. **Every current payment row/evidence/date matches**: two Paid records dated **2026-10-24**. PAY-001 remains **2 Paid/798 Pending**, PAY-002 **200 Pending**, both recordable. The copy's only observed additions are ordinary role-test authentication: two logins and two logouts; no business evidence changed. [Preservation](../../output/typography-20261025/preservation.json).

Retained listener PIDs at **3011/3012/3013/3015/3016/3018/3019/3020/3021** match the preceding accepted checkpoint. None was restarted or used for mutations. This is not an exhaustive new inventory of every retained database. [Final delivery/process verification](../../output/typography-20261025/delivery.json).

## Review package, limits and primary promotion boundary

[Eight-file hashes](../../output/typography-20261025/candidate-files.json), [binary-capable patch](../../output/typography-20261025/TYPOGRAPHY_CANDIDATE.patch), [source assets/licenses](../../output/typography-20261025/candidate-source.zip), [compatible build](../../output/typography-20261025/compatible-build.zip). Archives exclude `.env`, credentials, keys, fixture data and the candidate Apache isolation rule. `git apply --check` passed against the actual dirty primary baseline; **the patch was not applied**.

The candidate remains running at **3022**, PID **28972**. Restart only from its directory with `node --import tsx output/typography-20261025/serve.ts`; it performs no startup migration or reset.

Remaining limits are native 200% zoom/complete AT acceptance, fallback glyph dependence outside the supplied subsets, existing narrow-table scrolling/native select clipping, the existing Vite chunk-size warning and earlier unrelated payment-preview focus qualification. Native controls/technical code blocks may retain platform-specific rendering. PDFs retain their existing fonts. Synthetic checks are not office/LAN acceptance.

Helper issues included a first archive-prefix assumption, generated asset-reference hashes, Windows text decoding and focus assertions sampled before the existing focus handoff settled. Corrected helpers/readiness checks passed without application changes. The unavailable browser zoom-settings operation affected only an empty task browser tab; primary was not opened or changed.

**After separate primary authorization:**

1. Recheck exact synthetic 5173/3001 profile/runtime, 66 checksums, current dirty source and all eight reviewed hashes. Review later CSS/assets rather than overwriting them; inventory all then-current records and actual dates.
2. Take a fresh current file/data/account/grant/frozen-source checkpoint and verify recovery appropriate to presentation maintenance. Do not transfer copied accounts, sessions, fixtures or task interception routes.
3. Stage the exact font binaries/licenses and CSS, verify hashes and run the compatible build. Keep retained older-version static assets intact. Coordinate only the necessary primary frontend/build maintenance; no schema, grant, permission, flag, API or database change is needed.
4. Verify both roles, font requests/fallbacks, representative screens, dialogs, payment labels/dates and current preservation read-only. Seek a native 200% zoom check in an available normal browser.
5. If activation fails, return to saved **66-compatible B2.5 CSS/client**, preserving legitimate later edits and unrelated static files. No database restore, migration downgrade, record deletion or stale-data replacement is appropriate.

**Stopped after isolated implementation and testing.** Primary 5173 remains on accepted B2.5. No promotion, primary/retained restart, backend/database/business-rule change, directory management, Dashboard graph/layout redesign, financial-policy change, rollover, feature activation, LAN/production operation or unrelated enhancement occurred.
