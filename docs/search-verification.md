# Revamped search — Task 18 verification and handoff

Date: 2026-11-07. Starting point: clean `dev` at `e05e0c8` (`feat: apply catalogue search automatically`). Tasks 12–17B and 19–21 supply the implementation; Task 18 consolidates regression evidence and current documentation. Candidate acceptance at Checkpoint H is separate. No release or deployment is included.

Status: **Task 18 technically complete and verified; Checkpoint H awaits candidate review.** Results below come from this run.

## Current behaviour

The order is Public → Métiers ou mots-clés → Casque VR. Committed selections, chip removal and clear-all update criteria/results automatically. Typing only requests up to five grouped suggestions after the agreed threshold/debounce; Enter without choosing a suggestion never creates a free-text criterion.

The predicate is `audience AND (job A OR job B …) AND every title AND legacy q AND headset`; empty groups impose no condition. Every repeated-job URL adopts OR, including old links. Selected appellations and deterministic title keywords (including names) retain their authored display values. Stable source keys restore chips through reload/history.

Contextual availability uses the complete cached snapshot before pagination. Job alternatives ignore the current job group; audience/headset alternatives replace their own filter; title candidates retain all current conditions. Available suggestions receive slots before disabled candidates. Unknown availability stays selectable; stale indications are explicitly provisional. Defaults, chip removal and clear-all remain usable.

URL/history owns criteria and pagination. Ordinary updates preserve unfinished text/focus; back/forward clears transient text/disclosures. Matching changes reset page one; source-only wording preserves it. One page response publishes current results and availability together; old cards/count/headset display stay explicitly previous during loading/error. Invalid URL data is never silently dropped; an explicit reset applies safe defaults and searches them.

Astro prepares the complete validated catalogue and dictionary at development/production server startup, publishes readiness atomically and retains the snapshot for the process lifetime. Transient preparation failure has four total attempts with bounded backoff; terminal failure stops and offers manual recovery. Status polling is foreground-only and stops on terminal state. Warm search/suggestions use that snapshot. Video details, thumbnails and saved-session operations still use the separate API. No mock API/catalogue changes are involved.

## Reproduce

Use the existing Node/npm setup in [README](../README.md). From the repository root:

```bash
npm run verify
npm run test:browser

git diff --check
```

Install the pinned browser with `npx playwright install chromium` if it is not available. `verify` includes formatting, lint, strict checks, unit/component/real-process tests and a production build. Run it before the browser suite so the isolated startup tests can use the current built server. Local loopback binding and browser launch must be permitted.

The default browser run owns the unchanged seeded API on 4100 and Astro on 4323, plus ephemeral ports for each isolated cold-start scenario. It refuses shared fixed ports and cleans up its child processes. One worker and zero test retries remain configured. No hosted service, user development server or browser draft is used.

`PLAYWRIGHT_BASE_URL` keeps its existing hosted-check meaning: no local services. The local-only `startup.spec.ts` is excluded in that mode; the remaining search/session cases still target the supplied URL. Discovery was checked with `--list` against an intentionally invalid example URL, without making network requests. This is not a hosted smoke test or deployment verification.

## Contract-to-evidence map

| Contract area | Durable evidence |
|---|---|
| Complete validated snapshot, no partial publication, retries/manual recovery/concurrency/shutdown | [Preparation tests](../src/features/catalogue/search-preparation.server.test.ts), [snapshot tests](../src/features/catalogue/search-snapshot.server.test.ts) |
| Startup before visitors in development/production, build without API, one process owner, readiness/HTTP/SSR/cache reuse | [Real-process lifecycle tests](../src/lib/catalogue-startup.test.ts), [runtime tests](../src/features/catalogue/search-runtime.server.test.ts) |
| Deterministic names/phrases/gender/normalization, source mappings and authored appellations | [Dictionary tests](../src/features/catalogue/search-dictionary.server.test.ts), [versioned rules](search-dictionary-rules.md) |
| All-URL métier OR, every title/q AND, exact public/headset, source identity, bounds/validation, pagination | [Search service tests](../src/features/catalogue/search-service.server.test.ts), [navigation tests](../src/features/catalogue/search-navigation.test.ts) |
| Own-group exclusion/replacement, full-snapshot counts, eligible-before-cap ranking | [Service tests](../src/features/catalogue/search-service.server.test.ts), [suggestion tests](../src/features/catalogue/search-suggestions.server.test.ts) |
| Immediate commits, no free text, shared chips/help, defaults/removal/clear, full-label disclosure and focus | [Form tests](../src/components/catalogue/CatalogueSearchForm.test.tsx), [option tests](../src/components/catalogue/CatalogueAvailability.test.tsx), [selector tests](../src/components/catalogue/KeywordSelector.test.tsx) |
| Newest-only results/availability, failed-search history, previous cards/count/headset, preparation and retry | [Unified hook tests](../src/features/catalogue/use-catalogue-search.test.tsx), [integration tests](../src/components/catalogue/CatalogueSearchIntegration.test.tsx) |
| SSR/reload/back/forward, real keyboard/touch, OR widening/title narrowing, one request/history entry per committed change, errors and invalid reset | [Responsive search scenarios](../e2e/search.spec.ts) |
| Draft persistence/order/removal/save/saved-session review, live API failures, details overlays, same-origin thumbnails, contrast/overflow/reduced-motion/text-spacing | [Original delivery scenarios](../e2e/delivery.spec.ts) |
| Browser arrival before API availability, four-attempt exhaustion/manual recovery, criteria/draft retention, warm cached search/SSR with API stopped | [Isolated startup scenarios](../e2e/startup.spec.ts) |

The cold-start browser case starts the real built Astro entrypoint with the API absent. It checks initial SSR 503/no-store/Retry-After and an announced preparation state, no false successful zero count, four attempts followed by a stable failed state, and health remaining live. It starts the unchanged API, uses the visible manual-retry control and verifies restored criteria and the persisted draft. After stopping that isolated API, new cached searches and SSR still succeed while the live details endpoint returns 503. Logs are attached to the browser report. This complements the controlled dev/production lifecycle cases; it does not pretend every warm search exercises upstream latency/failure.

## Results

Environment: macOS, Node 24.14.1, npm 11.17.0, repository-pinned Playwright/Chromium and axe packages. 

| Check | Result |
|---|---|
| Format and ESLint | Pass |
| Strict Astro/TypeScript | 119 files; zero errors, warnings or hints |
| Unit/component/real-process suite | 34 files / 255 tests passed |
| Production build | Pass |
| Complete local browser suite | 30 passed, 1.8m, three viewports, zero retries |
| Isolated cold-start/recovery | Pass at desktop, tablet and mobile; four-attempt exhaustion, manual recovery, persisted criteria/draft, API-offline warm search/SSR |
| Hosted-mode discovery | 27 tests in two files; local startup cases excluded, no network/hosted verification |
| Documentation links and diff hygiene | Pass |
| Supplied inputs | API/catalogue, original exercise brief and wireframes unchanged from HEAD |
| Production application source/dependencies | Unchanged by Task 18 |

Run logs for this workspace session are `/private/tmp/metiers360-task18-verify.log` and `/private/tmp/metiers360-task18-browser.log`. The ignored Playwright report retains axe attachments and isolated startup logs; these temporary artifacts are not release assets.

The suite now contains 30 local scenarios: the existing 27 search/session cases plus cold-start/recovery at desktop 1440×900, tablet 834×1112 and mobile 390×844. The existing narrow text-spacing check also runs at 320px. Production code is unchanged by Task 18; only regression tests/configuration and documentation are updated.

## Accessibility evidence and limits

Closed-popup catalogue/error/empty, details, draft/finalisation and saved-session scans retain their existing axe gates, visible-field contrast checks and horizontal-overflow assertions. No thresholds or rules are relaxed. The delivery scenarios also check keyboard focus, reduced motion and increased text spacing; search scenarios add actual touch activation, disabled-option semantics, native keyboard typeahead and chip disclosure/removal targets.

Task 18 additionally records both scoped selector/listbox and diagnostic full-page axe scans while the keyword popup is open. Scoped violations must remain zero. Full-page findings are attached as evidence, not called a pass or hidden through exclusions. The fresh results retain only the previously documented finding IDs:

| Open-popup full-page finding | Desktop nodes | Tablet nodes | Mobile nodes |
|---|---:|---:|---:|
| aria-hidden-focus | 9 | 10 | 10 |
| page-has-heading-one | 1 | 1 | 1 |
| region | 1 | 1 | 1 |

There are 30 gated closed-popup/workflow scans and three gated open-popup scoped scans with zero reported violations, plus three diagnostic full-page open-popup scans with the findings above. Incomplete checks remain in the attached reports, not reclassified as passes. These full-page open-popup findings remain a candidate-review limitation; this task does not claim they are resolved. Disabled suggestions remain keyboard-discoverable so their explanation can be read; activation is blocked.

No exhaustive native Firefox, VoiceOver/other screen-reader, zoom or WCAG/RGAA conformance audit is claimed. React hydration is required for interactive search; checks wait for hydration and do not establish no-JavaScript or pre-hydration behaviour. API fixture coverage is finite and the catalogue is assumed stable during a process. Process restart is the supported snapshot refresh boundary; manual recovery cannot rebuild an already-ready cache.

## Open-popup review and deferred follow-up (2026-11-07)

**Candidate decision:** leave the current application/tests as they are for now and record the findings/recommendations. No accessibility remediation or further investigation is authorised by this note. Deferring work does not resolve the findings, establish conformance or constitute acceptance of Checkpoint H.

The recorded rule counts above describe affected nodes, not that many independent defects. Inspection of the installed Base UI 1.9 implementation identifies a likely shared cause: our input is outside the popup, and that path uses a focus manager which hides surrounding content from assistive technology while suggestions are open. The public Combobox modal option already defaults to false; setting it explicitly to false would not bypass that internal path. See [the versioned popup implementation](https://github.com/mui/base-ui/blob/v1.9.0/packages/react/src/combobox/popup/ComboboxPopup.tsx).

| Finding | Interpretation and possible user impact | Priority |
|---|---|---|
| aria-hidden-focus | Surrounding content is hidden from screen readers while containing focusable controls. If focus reaches one before the hiding is removed, its name/purpose may not be announced. Deque classifies the rule as serious and maps it to WCAG level A. The finding alone does not prove that this timing actually occurs in our interaction. | First priority for investigation/resolution |
| page-has-heading-one | The existing catalogue heading temporarily disappears from the accessibility tree, rather than being absent from the HTML. Screen-reader heading navigation may not find it while suggestions are open. This appears to be a consequence of the same hiding policy. | Review as a possible secondary symptom |
| region | The popup is portalled outside the main landmark. Screen-reader landmark navigation may not clearly locate its content. This needs semantic review; it is not justification to add an arbitrary landmark solely to silence the rule. | Review after the focus policy is understood |

Authoritative rule guidance: [hidden focusable content](https://dequeuniversity.com/rules/axe/4.14/aria-hidden-focus), [heading-one rule](https://dequeuniversity.com/rules/axe/3.0/page-has-heading-one), [landmark containment](https://dequeuniversity.com/rules/axe/4.14/region). The heading/region diagnostics are not equivalent in severity or interpretation to the focus finding; the region guidance also references RGAA.

Existing browser checks passed selection, Escape, Tab dismissal, focus behaviour and touch activation. Closing the popup before moving focus can avoid the practical hidden-focus mismatch. However, neither those checks nor the zero-violation scoped scans verify the actual native screen-reader experience, especially touch-screen-reader navigation. These are potential impacts supported by the reported DOM conditions, not newly observed VoiceOver failures.

**Recommendation, not an authorised task:** before unconditional Checkpoint H acceptance, perform a focused accessibility validation/resolution pass prioritising aria-hidden-focus. With VoiceOver, check entering/navigating suggestions, selection, dismissal, Tab departure and return to surrounding controls; include touch-screen-reader navigation for mobile/tablet. If a mismatch is confirmed, prefer supported composition/configuration or a targeted upstream/library fix that keeps focus and accessibility-tree exposure consistent. Re-run full-page open/closed axe scans and keyboard/touch/screen-reader checks. Do not blindly remove aria-hidden, add fake headings/landmarks, suppress the rules or assume a library upgrade fixes it. The two structural findings may be secondary effects and do not independently justify a rewrite.

If work resumes, start from this evidence and validate the current installed version/behaviour before choosing a fix. The recommendation remains deferred until the candidate explicitly requests that follow-up.

## Documentation and candidate handoff

Current authorities are [the agreed search contract](../tasks/search-contract.md), [dictionary rules](search-dictionary-rules.md), [current architecture](architecture.md), [startup/log guide](catalogue-startup.md), [HTTP service](catalogue-search-service.md), [form](catalogue-search-form.md), [selector](keyword-selector.md) and [integration](catalogue-search-integration.md). Original brief/wireframes and the dated v1.0.1 diagram are preserved as history; the old diagram does not depict the startup snapshot, dictionary or current search service.

Checkpoint H remains the candidate's review/acceptance of the complete search on `dev`, including its recorded accessibility limits. Nothing is staged, committed, pushed, released or deployed by this task. The public demo and original screenshots are not claimed to reflect these local changes. A new clean-install rehearsal, dependency audit and hosted/Firefox verification were not part of this run; dated Task 10/11 evidence remains separate.
