# Implementation plan: Métiers360 session builder

Status: accepted on 2026-10-21. Tasks 1 through 11 and Checkpoints A through F are technically complete; final candidate review of Task 11 is next. The candidate reviewed, committed and pushed Task 10 in `3c36990`, followed by their README edits in `05026e5`. Task 10 verification is recorded in [delivery-verification.md](../docs/delivery-verification.md). The candidate reviewed/retested the alias refactor and committed/pushed it in `b405ba1`, then explicitly authorised Task 11 on 2026-10-25. The public demo and private API are verified; configuration, release procedure and evidence are in [deployment.md](../docs/deployment.md). Stop for candidate review before further work.

## Purpose

Deliver a small, accessible session-building application before 2026-10-27 while respecting the exercise's half-day candidate-attention budget. Work in thin, independently verifiable slices and prefer a complete, explainable core workflow over unverified breadth.

The live completion state belongs in [todo.md](todo.md). This file records the stable sequence, dependencies, acceptance criteria and risks. Do not silently reorder or expand scope; document why when implementation evidence requires a change.

## Priorities

1. **Core delivery:** find videos, inspect them, compose and order a draft, validate it, and save it reliably.
2. **Agreed supporting workflow:** list saved sessions and inspect a saved session.
3. **Delivery quality:** a cohesive contemporary visual system, accessibility, responsive behaviour, failure recovery, verified commands and a concise candidate-facing README.

If scope must be reduced, protect the verified core delivery first. Preserve the visual review's hierarchy, consistency and accessibility work; record optional decorative refinements or saved-session review as deliberate omissions rather than shipping incomplete behaviour.

## Copy verification cadence

- Review new or changed French interface copy within every user-facing task before marking that slice complete. Check headings, labels, calls to action, helper text, validation, loading, empty, error, retry, warning, success and confirmation states in their rendered context rather than as an isolated string list.
- Keep terminology, tone, capitalisation and action patterns consistent with the product language in `AGENTS.md`. Prefer direct, practical wording for rushed or less digitally confident users; preserve authored/API values and avoid clever, decorative or technical phrasing.
- Task 7A includes an interim cross-surface copy check so visual hierarchy and control treatments are refined around representative wording rather than placeholders.
- Task 9A performs the dedicated application-wide French copy audit after every workflow exists. Task 10 then rechecks accessible names, instructions, validation and live status messages as part of final accessibility verification.

## Dependency flow

```text
Toolchain and scripts
  -> application shell and theme
    -> runtime contracts and BFF
      -> catalogue discovery
        -> video details
          -> persisted draft model
            -> responsive draft composition
              -> representative visual-system review
                -> validation and save
                  -> saved-session review
                    -> application-wide French copy audit
                      -> final accessibility, responsive and delivery review
```

## Tasks

### Task 1 — Bootstrap the frontend toolchain

**Outcome:** The repository contains the smallest runnable Astro server application compatible with React 18, strict TypeScript and Tailwind, while the supplied mock API remains a separate process.

**Acceptance criteria:**

- Astro uses server output and React 18 with strict TypeScript.
- Tailwind is configured without installing the full target dependency set prematurely.
- Implemented scripts cover separate API/web development, combined development, strict checking, tests and production build; documentation claims only commands that exist.
- The mock API has minimal service-local package metadata so `/server` remains independently runnable and deployable; the API-only root `Dockerfile` is preserved under `archives/` so it cannot be mistaken for the Astro service image.
- The supplied API still starts and responds without source or catalogue modification.

**Verification:** Run the newly implemented check, test and build scripts plus an API smoke check.

**Dependencies:** None.

### Task 2 — Build the responsive application shell

**Outcome:** `Catalogue` and `Mes séances` have a shared, navigable shell that establishes the visual and accessibility baseline.

**Acceptance criteria:**

- `/` and `/sessions` render with semantic landmarks, headings and current-navigation state.
- The neutral shadcn-compatible CSS variables are exposed through Tailwind `@theme inline`; Heroicons outline is the only icon source.
- The shell draws on the original mobile, tablet and desktop wireframes for hierarchy and responsive intent, following the accepted product and architecture requirements without treating diagram details as a complete UI specification or fabricating brand assets or settings.
- Focus visibility, touch target sizing and overflow are checked at representative viewport widths.

**Verification:** Strict check, tests, production build and real-browser inspection at mobile, tablet and desktop widths.

**Dependencies:** Task 1.

## Checkpoint A — Foundation

The frontend and mock API run together, both routes are navigable, all implemented verification commands pass, and the shell has been reviewed before API feature work begins.

### Task 3 — Establish runtime contracts and the BFF boundary

**Outcome:** Untrusted API, environment and persisted values cross centralised Zod boundaries, and browser requests use thin same-origin Astro endpoints.

**Acceptance criteria:**

- Schemas cover videos, paginated lists, jobs, audiences, headsets, sessions, creation input, API errors, draft persistence and server configuration.
- TypeScript types are inferred from schemas; transport failures and invalid responses become a consistent internal error contract.
- Server loaders call the shared server-only client directly; browser code calls the Astro BFF.
- Loading, upstream failure and invalid-response behaviour are proven against the supplied API without changing it.

**Verification:** Focused schema/client tests, strict check, production build and API/BFF smoke checks.

**Dependencies:** Task 1.

### Task 4 — Implement catalogue discovery

**Outcome:** Users can search and filter the paginated catalogue without losing navigable state.

**Acceptance criteria:**

- Search, job, headset and audience filters use supported API parameters, with page reset when criteria change.
- Query, filters and page are preserved in the URL; browser back/forward and reload behave predictably.
- Results expose loading, result count, empty, recoverable-error and success states.
- Cards remain concise and express add/remove and contextual compatibility state accessibly.
- Catalogue cards show all compatible headset names when no headset filter is selected, preserving API order. When filtered by headset, show only that selected headset. This explicit 2026-10-25 requirement supersedes the earlier implementation's two-badge limit.

**Verification:** Query-state unit tests, component tests and browser checks covering success, empty, retry and pagination.

**Dependencies:** Tasks 2 and 3.

### Task 5 — Implement contextual video details

**Outcome:** Users can inspect complete video metadata without losing catalogue context.

**Acceptance criteria:**

- Details use a right-hand sheet on tablet/desktop and a full-screen sheet on mobile.
- Missing thumbnails render an intentional 16:9 fallback.
- The surface has an accessible name, initial focus, focus trap, Escape handling and focus restoration.
- Closing details restores the user's catalogue state and position.

**Verification:** Component tests plus keyboard and responsive browser checks.

**Dependencies:** Task 4.

## Checkpoint B — Catalogue

Users can find and inspect videos across target viewports, including loading, empty and failed responses, using keyboard-only interaction.

### Task 6 — Implement the persisted draft model

**Outcome:** A valid ordered draft survives navigation and reloads and can be observed across Astro islands.

**Acceptance criteria:**

- Nano Stores owns draft name, optional headset and ordered video IDs; count, duration and compatibility are derived.
- Browser persistence is SSR-safe and validated before restoration.
- Add, remove, move up, move down, clear-after-save and invalid-persistence behaviour are tested.
- A persisted draft does not produce a misleading zero-count hydration flash.

**Verification:** Store and persistence unit tests plus a reload/navigation browser check.

**Dependencies:** Task 3.

### Task 7 — Implement responsive `Ma séance` composition

**Outcome:** Users can review and order the draft from the catalogue at every supported viewport size.

**Acceptance criteria:**

- The draft is a persistent catalogue panel on desktop and a full-height sheet on tablet/mobile.
- Items are numbered and can be reordered with keyboard/touch-accessible move controls; drag and drop is not required.
- Count, total duration and explicit headset compatibility statuses remain understandable without relying on colour.
- Remote errors or surface transitions do not discard draft content.
- The completed surface supplies the final representative layout needed for the dedicated visual-system review; broad aesthetic rework remains outside this functional task.

**Verification:** Component tests and mobile/tablet/desktop browser checks for add, remove, reorder, focus and persistence.

**Dependencies:** Tasks 4 and 6.

### Task 7A — Review and refine the representative UI

**Outcome:** The shell, catalogue, video details and draft composition share a cohesive, contemporary visual language before save and saved-session screens extend it.

**Acceptance criteria:**

- Review the implemented mobile, tablet and desktop surfaces together, including their representative headings, labels and actions, then refine typography, spacing rhythm, density, hierarchy, cards, controls, surface separation and restrained interaction feedback where evidence supports a change.
- Prefer shared semantic tokens and reusable component treatments over page-specific decoration. Keep surfaces, borders and shadows predominantly neutral, retain the accessible logo-derived blue for action/focus and continue to defer pink unless the representative review establishes a clear semantic role.
- Preserve the accepted information architecture, user-facing behaviour, content clarity, touch targets, keyboard focus, colour contrast and reduced-motion behavior; visual modernisation must not obscure system status or increase interaction cost.

**Verification:** Compare before/after screenshots at mobile, tablet and desktop widths; repeat contrast, keyboard-focus, reduced-motion and overflow checks; run the full repository verification suite.

**Dependencies:** Tasks 5 and 7.

## Checkpoint C — Composition and visual direction

A user can build and reorder a persistent draft from the catalogue without data loss, pointer-only interaction or viewport overflow, and the representative surfaces share an approved visual direction that later workflows can reuse.

### Task 8 — Implement finalisation and session saving

**Outcome:** A valid draft can be named, optionally assigned a headset and saved with recoverable failure handling.

**Acceptance criteria:**

- The form enforces the API's trimmed 1–120 character name, ordered 1–30 video IDs and optional known headset.
- Compatibility warnings are explicit, validation is accessible and duplicate submissions are disabled while pending.
- A `201` clears the draft only after confirmation and leads to a clear success destination.
- Failed transport or validation responses preserve every draft value and can be retried.

**Verification:** Validation/save tests and browser flows for success, validation failure, upstream failure and retry.

**Dependencies:** Tasks 3 and 7A.

## Checkpoint D — Core delivery

The complete required exercise flow—find, compose, order, name and save—works against the supplied API and passes the repository verification suite.

### Task 9 — Implement saved-session review

**Outcome:** Users can distinguish their current draft from saved sessions and inspect a saved session in playback order.

**Acceptance criteria:**

- `/sessions` presents the current draft separately from saved sessions with loading, empty, error and retry states.
- `/sessions/[id]` is a dedicated read-only details page with not-found and service-error handling.
- Video metadata is resolved in order without an avoidable request per video.
- No unsupported saved-session edit or delete controls are introduced.

**Verification:** Data-resolution tests and browser flow from successful save to list and details.

**Dependencies:** Tasks 3 and 8.

### Task 9A — Complete the application-wide French copy audit

**Outcome:** Every implemented workflow uses clear, consistent and practical French copy suited to counsellors, teachers and educators who may be rushed or less comfortable with digital tools.

**Acceptance criteria:**

- Inventory and review visible copy across every route, overlay and remote/form state, including headings, labels, calls to action, helper text, validation, loading, empty, error, retry, warning, success and confirmation messages.
- Use the agreed domain vocabulary consistently—particularly `Catalogue`, `Mes séances`, `Ma séance`, videos, headsets and save/add/remove actions—and align tone, capitalisation and CTA patterns without rewriting authored/API content.
- Verify that accessible names, instructions, validation and status announcements remain understandable outside their visual context; update tests where wording is an intentional interface contract without making incidental prose unnecessarily brittle.

**Verification:** Walk through every implemented route and critical state in a real browser at mobile and desktop widths, inspect accessible names and announcements, run focused tests for intentional copy contracts, then run the full repository verification suite.

**Dependencies:** Tasks 8 and 9.

### Task 10 — Complete delivery verification and documentation

**Outcome:** The submitted repository is reproducible, candid about scope and reviewable in five minutes.

**Authorised partial scope, 2026-10-24:** Audit and fix the identified accessibility issues, repeat axe and browser checks, and update project records. Evidence is recorded in [accessibility-audit.md](../docs/accessibility-audit.md). This review stop precedes the remaining Task 10 work, including the clean-install rehearsal, final README and submission-readiness assessment. No deployment is authorised by this slice.

**Authorised follow-up:** Preserve the candidate's lighter input/select fill and perimeter, add a contrasting bottom edge, repeat the relevant contrast/axe/browser checks and update records. This visual refinement is another review stop within the same partial scope, not authorisation for the remaining Task 10 work.

**Authorised focus follow-up, 2026-10-25:** Preserve a contextual focus destination after draft removal, including the empty draft, verify the shared panel/sheet behavior and update records. This remains a bounded review stop before the rest of Task 10.

**Acceptance criteria:**

- Keyboard, focus, announcements, contrast, reduced motion and overflow are reviewed across affected surfaces and target widths.
- Accessible names, instructions, validation and live status copy receive a final contextual check after the Task 9A audit.
- Format/lint, strict check, unit/component tests, browser tests and production build all pass from the documented setup. Task 10 establishes the reproducible `npm run test:browser` command and documents its actual outcomes separately from the unit/component gate.
- The supplied exercise brief is preserved verbatim at `docs/source/exercise-brief.md`; it remains an authoritative source document rather than being treated as obsolete archive material.
- The root README is replaced with the required candidate-facing README using verified claims and commands, links to `docs/skill-log.md` from its AI-use section, and `AGENTS.md` plus internal links are updated to point to the preserved brief.
- The exercise log records actual AI use, candidate verification, attention time, deliberate omissions and one genuine decision made against an AI proposal.

**Final README content:**

- a concise project overview describing the session builder, its users and their context;
- prerequisites plus verified installation, local development, test and production-build commands;
- a concise stack and architecture overview explaining why the main choices suit this exercise, with a link to `docs/architecture.md` for detail;
- a short user guide covering catalogue discovery, draft composition and ordering, saving, and saved-session review;
- a small set of representative interface screenshots with useful captions and alternative text, captured only after the relevant UI is stable;
- the three most consequential assumptions and two or three main interface decisions, connected to the intended users;
- deliberate omissions, what would be done with one more day, accessibility and verification evidence, AI use with a concise link to `docs/skill-log.md`, the candidate's attention time and one genuine decision made against an AI proposal.

Keep the README readable in roughly five minutes. Detailed architecture, wireframes, task history and exhaustive verification evidence remain in their dedicated documents rather than being duplicated.

**Verification:** Clean-install/full-suite rehearsal and final working-tree/diff review.

**Dependencies:** All delivered feature tasks and Task 9A.

## Checkpoint E — Submission readiness

The repository is reproducible, the final README matches the delivered application, known omissions are explicit, and the candidate has personally reviewed the evidence claimed as personal verification.

### Task 11 — Optionally deploy to Railway

**Outcome:** If time remains after Checkpoint E, the reviewed application is available from a public Railway URL without exposing the mock API directly.

**Acceptance criteria:**

- Two Railway services use the same repository with explicit roots: `/` for `web` and `/server` for `api`; deployment does not depend on automatic monorepo discovery.
- Both services follow the `releases` branch. Preserve the previous release on `main`, then fast-forward/push verified `dev` to `releases`; every release-branch push triggers deployment. Follow [deployment.md](../docs/deployment.md) without resets or force-pushes.
- Astro uses the Node adapter in standalone server mode, listens on `0.0.0.0` and Railway's `PORT`, and is the only service with a public domain.
- The web service's server-only `CATALOG_API_URL` references the API service's `RAILWAY_PRIVATE_DOMAIN` and `PORT`; no private hostname reaches browser code.
- API-generated thumbnail URLs are exposed through the same-origin BFF proxy, and both services have passing health checks.
- A production smoke test covers catalogue loading, a thumbnail, draft composition, session saving and saved-session review; documentation states that saved sessions reset on API restart/redeploy.

**Verification:** Inspect both deployment logs and health checks, then run the critical flow against the public URL at mobile and desktop widths.

**Dependencies:** Checkpoint E. Skip this task without penalty if the attention or calendar budget is exhausted.

## Checkpoint F — Optional hosted demo

The public Astro URL serves the verified application, the API remains private, and the final README includes the live link only after the smoke test passes.

## Proposed follow-up — Revamped catalogue search (2026-11-06)

Status: Task 12's contract is agreed; separately authorised Tasks 13, 14A, 14B, 15, 16 and 17A are technically complete on `dev`. The candidate explicitly requested Task 17A after the selector handoff; composed-form review is next. No separate Checkpoint G sign-off is inferred. Task 17B onward remain unauthorised. Preserve completed Tasks 1–11 and the original wireframes as delivery history. Startup preparation and revamped HTTP search are active; visible UI integration remains future work.

### Agreed direction

- Public → Métiers ou mots-clés → Casque VR → Rechercher. All criteria are optional; one audience, one headset and multiple typed job/title criteria combine with AND.
- Up to five suggestions in total, grouped as Métier and Titre de vidéo. Job labels and appellations resolve to a particular job code; title keywords resolve to matching titles. A term may occur in both categories or match several jobs. Different aliases for the same job produce one effective criterion.
- All selected criteria appear in a shared full-width chip area below the controls, followed by « Tous les critères sélectionnés doivent correspondre. » Removing a dropdown chip resets that control; default Tous values produce no chip. Retain the clear-all action.
- Whole chips may wrap across rows, but text inside each chip must remain on one line. Limit chip width to its container and ellipsize only overflowing text, keeping the icon and remove button visible and usable. Preserve complete values/accessibility text and provide keyboard/touch access to the full label. This replaces the earlier long-value text-wrapping suggestion.
- Heroicons outline: UserGroup for public, Briefcase for métier, MagnifyingGlass for title keywords and Eye for headset. Introduce those same icons beside the corresponding field-label words; preserve complete category/value names for assistive technology and comfortable removal targets.
- Desktop uses one row with the widest field reserved for keywords. Tablet gives Public and keywords separate full-width rows, followed by headset and submit together. Mobile stacks all controls and uses a full-width submit action; chips wrap below. Breakpoints follow available catalogue width, including the desktop draft rail, rather than device names alone.
- Edits are pending until submission. Keep pending chips separate from applied results/counts in state and provide a visible modified-criteria cue. Applied criteria and pagination remain URL-owned; pending form presentation stays local.
- When each Astro server process starts, automatically retrieve the entire catalogue and required reference data through the existing validated API client, validate the snapshot and build the dictionary before marking search ready. Do not wait for the first page visit or search. Retain the complete snapshot and dictionary in process memory without a timed expiry; a restart repeats preparation. The user confirms the catalogue rarely changes and never changes during use. No browser persistence or disk cache is needed.
- Startup preparation has explicit preparing, ready and failed states. Retry temporary upstream failures with capped backoff and a finite attempt budget; after exhaustion, expose a recoverable error and manual retry. Early visitors see an announced loading state, never an empty catalogue presented as a successful result. Requests observe the shared preparation rather than starting another build.
- Astro performs AND matching against the complete cached snapshot, then computes totals and pagination in stable video-ID order. The mock API and its catalogue files stay unchanged. Sessions remain live API operations. Proposed default: retain existing per-video details fetching for this increment, avoiding unrelated draft/session metadata changes.

### Architecture change to make explicit before coding

The current architecture requires a thin BFF and no duplicate catalogue storage. The agreed search direction deliberately adds a derived, read-only in-memory catalogue snapshot and an application search service in Astro. Record this scoped exception in `docs/architecture.md` before introducing it. Existing API proxies, thumbnail rewriting, session operations and the draft store keep their current responsibilities. Server-rendered initial results and browser searches must use the same service; SSR must not call its own HTTP endpoint.

### Task 12 — Agree the exact search contract

**Dependencies:** None. **Scope:** Small; planning/contracts only.

The candidate agreed [Task 12's search contract](search-contract.md) on 2026-11-06, accepting the defaults and selecting the matched appellation for métier chip text. Validated source keys preserve that wording through URL sharing/reload while job codes alone determine matching. [Dictionary rules](../docs/search-dictionary-rules.md) own deterministic extraction, editorial lists, source ordering and future implementation comments/tests. Task 12 is complete as a documentation/agreement task; Tasks 13, 14A, 14B, 15, 16 and 17A were subsequently explicitly authorised. Task 17B onward is not authorised.

- Define typed job/title selection identities, safe query limits, duplicate handling, URL serialization and legacy `q`/`job` link compatibility. Propose keeping existing links meaningful rather than silently dropping them.
- Agree title word/phrase extraction, a small explicit French stop list, gender/compound rules, accent and œ normalization, suggestion ranking and empty-input behaviour. Names such as Omar and Hugo must remain keywords. No AI enrichment, invented synonyms or fuzzy matching in this increment.
- Specify submission with unselected text (proposal: ask the user to select a suggestion or clear it), no-result behaviour, pending removal/clear semantics and video-details fetching. Candidate reviews these choices before implementation.
- Specify retryable versus non-retryable initialization errors, attempt budget and backoff bounds. Verify the installed Astro/Node adapter's supported server-start lifecycle before choosing a startup entry point; module loading on first request or during the build does not satisfy startup preparation. Keep server liveness distinct from search readiness. Deployment traffic gating on readiness is a separate decision, not an instruction to change Railway settings now.

**Verification:** Example acceptance matrix including Omar, Hugo, jardinier municipal, garagiste → I1604, accent variants, two jobs and duplicate aliases. Agree exact word versus substring matching; do not inherit upstream substring semantics accidentally.
**Likely records:** `tasks/plan.md`, `tasks/todo.md`, `docs/architecture.md`.

### Task 13 — Prepare the catalogue loader for startup initialization

**Dependencies:** Task 12. **Scope:** Medium; server cache module and focused tests, reusing the API client.

- Load every video page with supported `per_page=100`, plus required reference data; preserve validated values and same-origin thumbnail URLs. Check completion and duplicate IDs before publishing the snapshot.
- Share one in-flight preparation between the startup initializer, requests and retries. Publish the search-ready state atomically only after both the complete snapshot and Task 14's dictionary succeed. Failed preparation must release the pending promise so recovery can succeed. Never serve a partial dictionary/catalogue as complete.
- Reuse a successful snapshot for the process lifetime. Cache only catalogue/reference data, never saved-session responses; do not bind shared initialization cancellation to one browser disconnect.
- Add explicit preparation states and the agreed bounded retry policy for temporary failures, including the mock API starting later than Astro. Manual retries share the same initializer and cannot overlap automatic attempts. Stop retry timers during shutdown; permanent validation/configuration errors must not spin in an automatic retry loop.

**Verification:** Multiple pages, callers joining a running initialization, warm reuse without upstream calls, later-page failure followed by recovery, capped attempts/backoff, terminal errors, manual retry and unchanged session fetching. Full repository verification gate. Task 14 completes the startup trigger after the dictionary builder exists.
**Implemented files:** `src/features/catalogue/search-snapshot.server.ts`, `search-preparation.server.ts` and their tests; existing server API client/error type and client tests for cancellation, body timeout and Retry-After metadata.

**Verified handoff (2026-11-06):** `npm run verify` passes 132 tests, 82-file strict checks with zero diagnostics, formatting/lint and production build. All six existing desktop/tablet/mobile browser scenarios pass. Failing-first tests cover second-page failure/reload, four-attempt exhaustion/manual recovery, concurrent callers, dictionary completion before readiness, 429 delays and shutdown races. The controller requires the future dictionary callback and retains state per instance; Task 14B will instantiate it once at server startup. No mock API, catalogue, dependencies, startup wiring, search UI or endpoints changed; no commit/push performed. Candidate review is next.

### Task 14 — Build the dictionary and connect server-start preparation

**Dependencies:** Tasks 12–13. **Scope:** Two reviewable slices: 14A dictionary module/tests, then 14B startup wiring/lifecycle tests.

- Normalize matching copies while preserving original display strings and people’s names; implement the agreed reviewed gender/compound and phrase rules without generating meaningless suffix fragments.
- Build category-aware mappings from title keywords to video IDs and job vocabulary to job codes, retaining source labels/appellations for explanations. Keep ambiguous terms as distinct job suggestions, not an implicit OR selection.
- Return at most five deterministic suggestions across categories; rank exact/prefix matches before weaker matches and omit already-selected effective criteria. Categories need not both appear when only one matches.
- Follow the agreed [versioned dictionary rules](../docs/search-dictionary-rules.md). Give the future builder a concise JSDoc contract linking to those rules, keep stop/expansion lists as named data and verify repeatable output even with shuffled input records. Retain validated appellation/label source keys and original display text for selected métier chip restoration; job-code deduplication still controls matching.
- In 14B, start the combined catalogue/dictionary preparation automatically from the verified server-start entry point. Initialization must begin without a browser request in development and the built Node server, remain server-only, and avoid an upstream dependency during `npm run build`. Search readiness requires successful completion of both stages; early requests join the current work or receive an explicit preparing state, not another initialization.

**Verification:** In 14A, real fixture examples, names, accents, apostrophes, œ, compounds, compressed gender forms, phrase preservation, mapping collisions and deterministic five-item limit. In 14B, prove upstream requests and dictionary preparation start before any visitor request; exercise delayed API startup, recovery/exhaustion, concurrent early requests, process restart, shutdown and a production build without a running API. Full repository gate after each slice.
**Likely files:** 14A dictionary module/test under `src/features/catalogue/` and shared contracts if needed; 14B the supported startup integration/entry point and lifecycle tests. Select the exact startup mechanism from installed tooling and official documentation during implementation.

**Task 14A verified handoff (2026-11-06):** pure rules/builder/suggestion helpers and 15 focused tests are implemented in five new files under `src/features/catalogue/`. Names, exact source occurrences, normalized mappings, stable selected-appellation keys, compact-form diagnostics and the five-suggestion allocation are covered. Reversing complete fixture inputs produces identical JSON without mutating inputs or using clock/randomness. `npm run verify` passes 147 tests, 87-file strict checks with zero diagnostics, formatting/lint and production build. Current fixture: 631 title entries, 1,603 job-vocabulary entries and zero diagnostics across 204 videos/55 jobs. No startup/controller wiring, endpoints, UI, supplied API/catalogue, dependency, commit or push changes. No interaction/browser verification was needed for these unconnected pure helpers. Candidate review is next.

**Task 14B verified handoff (2026-11-06):** the official Node integration is wrapped at its supported server entrypoint; development starts through the real Vite SSR runner before listening, while production starts through the built standalone entrypoint. Both use one process-owned runtime composed from the real loader and dictionary. JSON phase logs include explicit entry-point/trigger attribution, run ID, PID, safe error kind/status, retry delay, counts and timings. Signal/server closure cleanup is idempotent. `npm run verify` passes 158 tests, 92-file strict checks with zero diagnostics, formatting/lint and production build. Eight child-process lifecycle cases cover both modes, startup before visitors, liveness during held preparation, readiness, bounded failures/manual recovery, configuration redaction and SIGTERM cancellation; unit tests cover logs and SSR module-owner reuse. Build succeeds without the API and does not initialize preparation. All six existing browser scenarios pass. [Startup troubleshooting](../docs/catalogue-startup.md) records ownership/logging and verification limits. No supplied API/catalogue, dependencies, search endpoints/UI, deployment settings, commit or push changed. Candidate review/Checkpoint G is next; Task 15 is not authorised.

**Checkpoint G:** Candidate reviews extraction examples, dictionary mappings and evidence that initialization starts before the first request, with recoverable startup failures and no premature ready state, before UI integration.

### Task 15 — Expose cached AND search and suggestions

**Dependencies:** Tasks 13–14. **Scope:** Medium; shared search service/tests and four small Astro routes including status/recovery.

- Add application-owned search/suggestion endpoints backed by the same service callable from SSR. Validate requests with Zod and check identifiers against the snapshot; reject malformed/unknown criteria with actionable French errors.
- Require every selected title condition and every selected job code, plus audience/headset membership; paginate only after filtering and retain stable ordering. Return counts and existing validated video shapes.
- Bound query input and distinguish empty results from preparing/failed initialization. Define a response contract so SSR and React can announce preparation and recover automatically when ready; a failed preparation exposes manual retry without losing selected criteria. Existing upstream video proxies and supplied API behaviour remain intact for other callers.

**Verification:** Multi-title/multi-job AND, mixed criteria, names, unknown IDs, injection-like input treated as data, matches beyond page one, correct totals and retryable cache errors. Full repository gate.
**Likely files:** search service/test, search contracts and routes under `src/pages/api/catalogue/`.

**Task 15 verified handoff (2026-11-06):** from clean `dev` at `34ddf7b`, added bounded Zod query parsing, ready-only membership/source validation, cached complete-catalogue AND search with legacy q and canonical pagination, global suggestions, browser-safe response schemas and shared SSR-callable service. Four routes expose search/suggestions/status and nonblocking bodyless recovery without ready-cache refresh. Actual dev/production tests prove HTTP shares startup ownership and concurrent recovery performs one cycle. An initial real-server failure exposed empty POST streams in the Node adapter; a failing-first regression and bounded stream-content check corrected it. `npm run verify` passes 192 tests/26 files, 102-file strict checks with zero diagnostics, formatting/lint and build. All six desktop/tablet/mobile browser scenarios pass (57.3s); diff hygiene passes. [HTTP/SSR guide](../docs/catalogue-search-service.md) records response/validation/recovery contracts. No visible UI/SSR-page integration, supplied API/catalogue, dependency, deployment, commit or push changes. Candidate review is next; Task 16 remains unauthorised.

### Task 16 — Build the accessible keyword selector

**Dependencies:** Tasks 12, 14–15. **Scope:** Medium; selector component/test and browser suggestion client/contracts.

- Build the grouped suggest input with debounced requests, keyboard navigation, Enter selection, Escape dismissal and category-aware selections; prevent selection from prematurely submitting the form.
- Handle idle/loading/no-suggestion/error/retry states. Cancel obsolete requests or ignore stale responses; preserve selected criteria when requests fail.
- Use existing Base UI capabilities only after checking their installed API and official documentation; add no dependency unless a concrete need is demonstrated.

**Verification:** Focused interaction tests plus real mobile/tablet/desktop keyboard and touch checks, including stale responses, long French labels and selection announcements. Full repository gate.
**Likely files:** selector component/test, suggestion client/test and contracts as needed.

**Task 16 verified handoff (2026-11-06):** from clean `dev` at `53e6ac3`, added a controlled Base UI grouped keyword selector, validated suggestion/status/recovery client and TanStack Query hook. Two-code-point threshold, 200ms debounce, server-ranked grouping, selected-source retention, no automatic highlight/free-text chip, keyboard/touch selection, bounded ten-criterion additions, cancellation/stale-response isolation and preparation recovery follow the contract. Named CSS classes constrain popup bounds and wrap long options; chip truncation remains Task 17A. Fourteen new client/component cases bring the passing full gate to 206 tests/28 files, 107-file strict checks with zero diagnostics, formatting/lint and build. An isolated real Chromium fixture checks 320/390/834/1440px, long/unbroken labels, touch, open-popup Tab, Enter/Escape, retry and zero horizontal overflow/runtime exceptions. All six existing desktop/tablet/mobile browser regressions pass (58.2s). A failing-first focus assertion also protects input focus after retry. Scoped selector/listbox axe scans have zero violations; three full-page open-popup focus-hiding/landmark findings are retained in [the selector guide](../docs/keyword-selector.md), with no whole-page conformance claim. No supplied API/catalogue, dependencies, live form/URL/results integration, commit or push changes. Candidate review next; Task 17 remains unauthorised.

### Task 17 — Integrate the responsive search form and URL state

**Dependencies:** Tasks 15–16. **Scope:** Split into two reviewable slices.

**17A — Form composition:** Replace the separate métier dropdown/title-only form with the approved ordered controls, full-width shared chips/help, matching label/chip icons, pending edits and explicit submission. Preserve native public/headset selects, removal/reset focus and the distinction between a catalogue headset filter and the draft headset. Likely files: search form, selector composition, applied chips and tests (up to five per slice).

Chip acceptance: single-line text with ellipsis within the available width; non-shrinking icon/removal control; whole-chip row wrapping; no horizontal overflow or clipped focus indicator. Keep full selected values and accessible removal names, with keyboard/touch access to the untruncated label.

**Task 17A verified handoff (2026-11-06):** from clean `dev` at `acb0057`, composed a reusable responsive search form, shared icon chip list and pending-state helpers. The form emits criteria only on Rechercher; existing catalogue controls/URL/results are not replaced until Task 17B can use the full contract. Native selects, selected appellations, legacy q, ten-slot/dedup rules, unselected-text validation, semantic applied resets and future navigation reset keys are retained. Chip text stays single-line/ellipsized while whole chips wrap; icons/removal targets remain visible, and a keyboard/touch inline disclosure exposes full values. Removal/reset focus and clear-all work without submitting. A failing-first case corrected the selector's stale “added” help after reset. Full gate passes 215 tests/29 files, 111-file strict checks with zero diagnostics, formatting/lint and build. Actual Chromium checks pass at 320/390/834/1024/1440px with simulated draft rail, responsive geometry, ellipsis, disclosure/focus, pending submit and no overflow/runtime exceptions; closed-popup whole-fixture axe has zero violations. All six existing browser regressions pass. Open-combobox audit findings from Task 16 remain explicitly documented. [Form contract/verification](../docs/catalogue-search-form.md) records boundaries. No supplied API/catalogue, dependencies, live URL/results integration, staging, commit, push or deployment changes. Candidate review next; Task 17B remains unauthorised.

**17B — Catalogue integration:** Connect SSR and React/TanStack Query to the new search service/endpoints, typed applied URL criteria and pagination. Restore chips/results after back/forward/reload; reset page on submitted criteria changes. Preserve result-count meaning while pending/loading/error, draft contents, contextual details and scroll behaviour. Likely files: catalogue page, `CatalogueApp`, query-params, browser API and relevant tests; subdivide if this exceeds a focused slice.

**Verification:** Full gate after each slice; browser checks at 320/390px, 834/1024px and desktop with draft rail. Verify chips from all categories, clear-all, single-line ellipsis for long values (including an unbroken word), whole-chip row wrapping, visible icons/remove controls, keyboard/touch full-label access, removal focus, explicit submission, deep links, history, pagination and zero overflow. Review the rendered form with the candidate before final acceptance.

### Task 18 — Regression verification and handoff

**Dependencies:** Task 17. **Scope:** Separate test and documentation passes.

- Extend existing browser scenarios for the new search, arrival during startup preparation, exhausted retries/manual recovery and unchanged draft → save → saved-session flow. Check that pending initialization never shows a misleading zero-result success, retains criteria/draft and becomes usable when ready. Keep mock latency/failure coverage for initialization, details and sessions; do not claim warm cached searches exercise the upstream API.
- Run `npm run verify`, `npm run test:browser` and `git diff --check`; verify responsive keyboard/touch behaviour, suggestion/chip accessibility, loading/empty/error states and same-origin thumbnails. No new formal WCAG/RGAA conformance claim.
- Update current architecture, README search/limit explanations, status, checklist and exercise/skill logs. Preserve original brief/wireframes and annotate the existing post-implementation diagram as describing its old baseline rather than silently treating it as current search documentation.

**Checkpoint H:** Candidate accepts the complete change on `dev`. No commit, push of implementation, release promotion, tag or deployment is included without a later explicit instruction. Each repository change passes `npm run verify`; interaction slices additionally require browser verification.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope exceeds the attention budget | Core flow receives insufficient review | Stop at a verified checkpoint; protect Tasks 1–8 before supporting breadth |
| Astro/island state hydration causes draft inconsistencies | Misleading count or lost draft | Establish and test persistence boundaries before composing the UI |
| Mock API latency and failures create flaky UX/tests | Reviewers encounter dead ends | Model deterministic loading/error fixtures in tests and provide visible retry paths |
| API lacks batch lookup for session video IDs | Saved details trigger excessive requests | Reuse cached catalogue data and implement a bounded resolution strategy |
| Component primitives are assumed accessible without verification | Keyboard/focus regressions remain hidden | Treat shadcn/Base UI as a foundation and verify actual composed behaviour |
| Visual polish obscures structural review | Time is spent before workflows are stable | Keep the neutral baseline until a representative slice has been reviewed |
| Optional deployment displaces required exercise work | Submission quality drops for a non-required extra | Attempt Railway only after Checkpoint E and stop if it threatens the remaining budget |

## Progress protocol

After each task:

1. verify its acceptance criteria with the commands and browser checks that actually exist;
2. update [todo.md](todo.md) with completion and evidence;
3. update `docs/project-status.md` with the current phase, next action and unresolved blockers;
4. update `docs/exercise-log.md` only with factual attention, AI-use or verification evidence;
5. add any newly applied distinct agent skill to `docs/skill-log.md` without duplicating earlier entries;
6. review the diff and suggest an atomic commit message.

Do not mark a checkpoint complete until every included task and checkpoint condition has been verified.
