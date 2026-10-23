# Project status and handoff

Last reviewed: 2026-10-24

This file records transient project state that does not belong in the stable architecture document. A new contributor or agent must still inspect the actual working tree with `git status` and read the sources in the order defined by `AGENTS.md`.

## Delivery

- Submission deadline: **2026-10-27**. This is the concrete date supplied by the candidate; it resolves the original brief's relative “7 days after receipt” wording.
- Attention budget: one half-day of the candidate's attention. Per the original brief, autonomous agent execution time is excluded; time spent reading, framing, directing, reviewing and testing is included.
- Attention time and AI-use evidence are tracked in [exercise-log.md](exercise-log.md). Do not infer missing durations after the fact.

## Current phase

- The supplied mock API, catalogue and original brief are present.
- Product structure, responsive behavior and intended frontend architecture have been agreed and documented.
- Task 1 is complete: the repository now has a minimal Astro 7 server application with the Node adapter, React 18, strict TypeScript and Tailwind CSS 4.
- The root scripts run and verify the web application; `server/package.json` keeps the supplied mock API independently runnable. The original API-only root Dockerfile is preserved at `archives/Dockerfile.api-original`.
- Task 2 and Checkpoint A are complete: `/` and `/sessions` now share a responsive Astro shell with the official 192 × 192 Métiers360 WebP logo, semantic navigation, route-aware current state, a keyboard skip link and page-specific French metadata and headings.
- The initial light theme uses neutral surfaces, borders and shadows plus a logo-derived blue ramp for action and focus semantics. Primitive colors are expressed in OKLCH and map to shadcn-compatible semantic variables and named Tailwind utilities through `@theme inline`. A dedicated current-navigation token uses blue 800 so selected-link text reaches a 9.17:1 contrast ratio on white, while focus outlines remain square and use the primary blue.
- Task 3 is complete: shared Zod runtime contracts, a server-only catalogue client and thin same-origin Astro BFF endpoints now cover supported catalogue, reference, session and thumbnail operations with consistent failure normalisation.
- Task 4 is complete: the catalogue now renders server-provided initial data and hydrates into one React/TanStack Query surface with URL-owned search, job/headset/audience filters, server pagination, responsive cards and recoverable loading, empty and error states.
- Task 5 and Checkpoint B are complete: cards open complete video metadata in a contextual native modal that becomes a full-screen mobile surface or a right-hand tablet/desktop sheet without changing the catalogue URL or position. Loading, missing-thumbnail, recoverable-error and add/remove states are covered.
- Task 6 is complete: a versioned Zod-validated Nano Stores model owns the draft name, optional headset and unique ordered video IDs; catalogue add/remove actions and the header count now observe the same persisted state across islands, navigation and reloads.
- Count, known duration and headset compatibility are derived from the canonical draft plus registered video data. Invalid or duplicate persisted IDs are discarded, and server output shows a loading placeholder instead of a misleading zero before browser restoration.
- Task 7 is complete: `Ma séance` is a persistent sticky catalogue rail from the desktop breakpoint and a full-height modal sheet with a sticky summary on mobile/tablet. Numbered items have explicit move and remove controls, textual duration/compatibility status and retryable metadata failures without draft loss.
- Task 7A and Checkpoint C are complete: the representative shell, catalogue, details and draft surfaces now share clearer neutral surface separation, tighter spacing and hierarchy, restrained selected states, more stable draft controls, contextual French copy and a small owned shadcn/Base UI control layer without changing accepted behavior.
- Task 8 and Checkpoint D are complete: a responsive finalisation dialog collects the required session name and optional headset, states compatibility, preserves the canonical ordered draft through validation/upstream failures, saves through the existing BFF and clears only after a confirmed `201`.
- Task 9 is complete: `/sessions` distinguishes the persisted current draft from saved sessions and covers loading, empty, retryable error and success states; `/sessions/[id]` provides an ordered, read-only programme with not-found and retryable service-error handling.

## Next action

Wait for the user's explicit instruction before starting Task 9A from the accepted [project plan](../tasks/plan.md). Task 9A will perform the application-wide French copy audit. Do not skip ahead to Task 10 or delivery work.

The plan and checklist are now the canonical implementation-progress record. This handoff document should summarise the current phase and next action rather than duplicate every task checkbox.

## Git workflow

Repository: `https://github.com/rlapoele/metiers360-session-builder.git`

| Branch | Role |
|---|---|
| `dev` | Default branch and active development/integration branch. Push normal project work here. |
| `releases` | Production-release branch. Only advance it as part of an intentional release. |
| `main` | Backup branch used before making a new production release. Do not treat it as the day-to-day development branch. |

As verified on 2026-10-21, all three branches exist locally and on `origin` and track their matching remote branches. GitHub's remote `HEAD` points to `dev`. The branches are expected to diverge as development proceeds; inspect `git branch -vv` instead of relying on a commit hash recorded here.

Before the first release, define and document the exact commands used to preserve the prior release on `main` and promote the candidate to `releases`. Do not improvise destructive branch replacement or force-push.

## Repository-state handoff

The initial context baseline was accepted and pushed to `dev` in commit `6ed929a` (`docs: preserve project context and exercise evidence. Establish durable project memory mechanism`). Task 2 was accepted and pushed to `dev` in commit `61da47d` (`feat: build responsive application shell`), followed by the accepted accessibility refinement in `2ddf704` (`fix: strengthen current navigation accessibility`).

Task 3 was accepted and pushed to `dev` in commit `6f4a56b` (`feat: establish runtime contracts and BFF boundary`).

Task 4 and its thumbnail browser-cache policy were accepted and pushed in `937a7ec` (`feat: implement catalogue discovery and thumbnail caching`). The follow-up planning update is committed in `54b4610` (`docs: schedule visual and copy refinement`). Task 5 was accepted and pushed in `f5cb6f9` (`feat: add contextual video details`). Task 6 was accepted and pushed in `c3e3d7e` (`feat: persist shared session draft state`). Task 7 was accepted, committed and pushed in `963db80` (`feat: add responsive session draft composition`).

Task 7A and Checkpoint C were accepted, committed and pushed in `cbc2399` (`feat: refine session builder interface`). Its post-commit visual refinements were subsequently committed and pushed in `7804efd` (`feat: refine visual details`) and `9334307` (`feat: increased Retirer button horizontal padding to px-4`).

Task 8 and Checkpoint D were committed and pushed in `f22dc0d` (`feat: add session finalisation and saving`), followed by the required/optional field cues in `8cee9e8` (`fix: clarify session form field requirements`). The subsequent label-spacing and visual refinements are committed and pushed through `c797443` (`fix: corrected dialog border and used badges consistently in video card and details`). Task 9 is complete and intentionally uncommitted for review.

Do not record a supposedly permanent clean/dirty working-tree snapshot here: the act of updating this file changes that state. At every handoff, inspect `git status --short --branch` and report uncommitted files in the current task's final response. Record a commit here only when it is a meaningful baseline future work may need to identify.

## Settled decisions

The accepted product and architecture decisions live in `AGENTS.md`, `docs/architecture.md` and the viewport wireframes. In particular:

- two top-level pages: `Catalogue` and `Mes séances`;
- contextual video details rather than a video-details route;
- a dedicated saved-session details route;
- Astro server output with React 18 islands and a thin same-origin BFF;
- URL-owned catalogue state, TanStack Query remote state, and a persisted Nano Stores draft;
- strict TypeScript plus Zod validation at runtime boundaries;
- Tailwind and selectively installed shadcn/ui components configured with Base UI;
- a neutral, content-first light theme with neutral surfaces, borders and shadows; a logo-derived blue ramp supplies accessible action and focus colour, while pink is deferred;
- primitive colour ramps map to shadcn semantic CSS variables, which are exposed as named Tailwind utilities through `@theme inline`; component markup avoids arbitrary values and direct variable expressions when a named utility can express the design;
- media queries own viewport-level shell composition, while container queries are used selectively for reusable component internals that depend on allocated space;
- Heroicons outline as the sole application icon family;
- no global or project-local shadcn agent skill;
- the supplied `server/server.mjs` remains a separate, unchanged mock backend;
- French interface copy is reviewed within each user-facing slice, receives an interim contextual pass during Task 7A, an application-wide audit in Task 9A and a final accessibility-focused recheck in Task 10;
- optional Railway deployment is the final step only if time remains, using a public Astro service and a private mock-API service;
- no Remix.

Do not reopen these decisions without new evidence or an implementation conflict. Record an intentional change in the architecture document rather than silently diverging.

## Intentionally open choices

These are known implementation choices, not missing conversational context:

- Task 1 selected Astro 7.4, the Astro Node and React integrations, React 18.3, TypeScript 6, Tailwind CSS 4 and their compatible verification tooling. Review dependency updates deliberately rather than allowing them to redefine the accepted architecture.
- The official Métiers360 logo is available at `public/images/m360-logo.webp`, but no official typeface or broader brand system has been supplied. Use the logo without fabricating the rest of the identity. The blue ramp remains a deliberate derivation from the supplied asset rather than a claim about official brand specifications. Task 7A confirmed the restrained neutral/blue direction and improved the representative surfaces; the application-wide copy audit remains scheduled for Task 9A.
- Because the API has no batch-by-ID endpoint, Task 9 resolves saved-session videos through bounded sequential catalogue-page requests with `per_page=100`, stops as soon as all requested IDs are found and restores the saved ID order. This avoids a request per video while respecting the existing API contract.
- The final candidate-facing README will replace the original brief only during the final delivery phase, after its claims and commands can be verified.
- Railway deployment is optional. Do not trade core verification or submission-readiness work for it; if attempted, follow the explicit two-service topology in `docs/architecture.md` rather than relying on automatic service discovery.

## Handoff checklist

At the end of each meaningful slice, update this file with:

- completed plan task/checkpoint and next pending task;
- files or areas changed;
- exact verification commands and their outcomes;
- known failures, unresolved questions and approvals still needed;
- whether the working tree is intentionally uncommitted.

Record candidate-attention and AI-use evidence separately in `docs/exercise-log.md`.

## Task 2 verification handoff

- Shared shell files: `src/layouts/AppLayout.astro`, `src/components/app-shell/AppHeader.astro` and `src/components/app-shell/navigation.ts`.
- Route files: `src/pages/index.astro` and `src/pages/sessions/index.astro`; the official logo is rendered from `public/images/m360-logo.webp`.
- Theme source: `src/styles/global.css`, with primitive neutral/blue values, shadcn semantic mappings and Tailwind `@theme inline` exposure. No pink application accent or dark theme was introduced.
- No application icon was required in this slice, so no unused icon dependency was installed; Heroicons outline remains the sole allowed family when an icon is first needed.
- `vitest.config.ts` loads the Astro Vite configuration so native Astro component tests can render through the Astro Container API.
- `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, four Vitest tests and the production build.
- The combined development process returned HTTP 200 for `/`, `/sessions` and `/health`. Browser inspection covered 320, 390, 768, 834, 1024, 1280 and 1440 CSS pixels with no horizontal overflow, a clean console, correct current navigation, visible keyboard focus and 44–48px header targets.
- A post-review accessibility refinement introduced a dedicated blue-800 current-navigation token, raising selected-link contrast on white from 5.20:1 to 9.17:1, and removed rounding from navigation-link focus outlines. `npm run verify` passed formatting, linting, strict Astro/TypeScript checks, four tests and the production build; browser checks at 320, 768, 1024 and 1440 CSS pixels confirmed the semantic token, square outline, clean console and zero horizontal overflow.
- The Task 2 baseline is committed as `61da47d`; its accessibility refinement was accepted and committed as `2ddf704`.

## Task 4 verification handoff

- `src/pages/index.astro` resolves the initial URL state and uses the shared server-only client for first-render videos and reference data; `CatalogueApp` hydrates the workflow without requesting the Astro service from itself.
- `src/features/catalogue/` owns URL parsing/serialization, browser BFF calls and display formatting. Criteria changes reset pagination; default values are omitted from shareable URLs; `popstate` restores search and results.
- `src/components/catalogue/` contains focused search, filter, applied-filter, result/card and pagination components. Mobile/tablet filters use a staged native modal dialog; desktop filters stay inline.
- A distinct BFF video schema validates same-origin thumbnail paths while the upstream video schema continues to require absolute URLs. A browser-discovered regression test protects this boundary.
- The same-origin thumbnail endpoint now adds `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`, enabling light browser reuse without modifying the supplied API or incorrectly treating ID-based URLs as immutable. A focused route test protects the exact policy.
- `@tanstack/react-query` manages remote catalogue/reference state, `@heroicons/react` supplies the agreed outline icons, and Testing Library/jsdom support behavior-focused React tests. No shadcn component or Nano Store was installed prematurely.
- Card selection is intentionally in-memory inside `CatalogueApp`. It demonstrates accessible add/remove state for Task 4 without pre-empting Task 6's validated Nano Stores persistence model.
- Browser checks covered success, missing thumbnail fallback, empty search, a deterministic single-request failure followed by successful retry, pagination, applied filters, back navigation, staged-filter cancellation and focus restoration at 320, 390, 834, 1024 and 1440 CSS pixels. No horizontal overflow or unexpected console warning/error was present; the injected 503 produced only its expected failed-request console entry.
- Focused tests cover query state, BFF browser parsing and the core catalogue component. A mutation that disabled page reset made the focused test fail as expected.
- Final `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 38 tests and the production server build; `git diff --check` passed at handoff.
- Task 4 is committed as `937a7ec`. Its follow-up visual/copy planning update is committed as `54b4610`; both were present on `origin/dev` before Task 5 began.

## Task 5 verification handoff

- `src/components/catalogue/VideoDetailsSheet.tsx` owns a native modal surface with a named header, initial close-button focus, explicit Tab/Shift+Tab containment, Escape close behavior, document scroll locking and trigger-focus restoration. It is full-screen below the small breakpoint and a 512px right-hand sheet from tablet widths upward.
- `VideoDetailsContent.tsx` presents the thumbnail or 16:9 fallback, title, duration, description, every associated job and ROME code, audiences, compatible headsets and the publication date. It omits the future draft-headset compatibility callout until Task 6 establishes that state.
- The existing `CatalogueApp` owns the contextual open/close state so the catalogue, URL, scroll position and temporary card selection remain mounted and synchronised. No video-details route or new dependency was added.
- Focused failing-first coverage protects the browser details request, French date presentation, complete content, selection synchronisation, retry, missing thumbnails, focus containment and focus restoration.
- Browser verification covered 390 × 844, 834 × 1112 and 1440 × 900 CSS pixels. The sheet measured 390px full-width on mobile and 512px right-aligned at tablet/desktop, with no horizontal overflow; keyboard focus stayed inside, Escape restored the originating button and page scrolling, and a real transient API failure recovered through `Réessayer` without changing `/`.
- Final `npm run verify` passes formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 43 tests and the production server build; `git diff --check` passes at handoff.
- Task 5 is committed as `f5cb6f9`. Task 6 began only after the user's explicit instruction.

## Task 6 verification handoff

- `nanostores` and `@nanostores/react` provide the agreed framework-independent store and React subscriptions; no persistence helper package was added because the versioned Zod boundary and SSR timing are application-specific.
- `src/features/sessions/session-draft.store.ts` owns the canonical draft, guarded browser hydration, persistence and actions for add, remove, bounded move-up/move-down, name, headset and clear-after-save. Video metadata remains an unpersisted lookup used only for derived duration and compatibility.
- `SessionDraftButton` is a separate header island that announces the validated count on both routes. Its server fallback contains no numeric count, avoiding a false zero while browser storage is unresolved.
- `CatalogueApp` now replaces temporary local selection with the shared store. It waits until its first client effect before observing restored state so the server-rendered catalogue hydrates without cross-island markup mismatches.
- Focused failing-first coverage verifies valid and invalid restoration, duplicate rejection, persistence, ordering, clear-after-save, name/headset constraints, derived duration/compatibility, the header hydration state and catalogue persistence.
- The browser flow added a video, navigated to `/sessions`, reloaded and returned to `/`; the header retained `1 vidéo dans ma séance`, the originating card retained `Dans ma séance`/`Retirer de ma séance`, and the corrected run had zero console errors or warnings.
- Final `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 56 tests and the production server build; `git diff --check` passed, and `npm audit --omit=dev` reported zero known production vulnerabilities. Task 6 was accepted and committed as `c3e3d7e`; Task 7 began only after the user's explicit instruction.

## Task 7 verification handoff

- `SessionDraftComposition.tsx` resolves draft metadata through the existing validated per-video BFF query, registers successful responses for derived state and leaves failed IDs ordered, persisted and individually retryable.
- `SessionDraftContent.tsx` renders the shared numbered list, durations, textual headset compatibility and labelled move/remove controls. No drag-only behavior, dead finalisation action, new dependency or supplied-API change was introduced.
- The catalogue uses a sticky three-column desktop composition from 1280px. Smaller viewports retain the full-width catalogue, receive bottom padding for a fixed draft summary and open a native full-height modal with initial close focus, explicit Tab containment, Escape handling, scroll locking and trigger-focus restoration.
- The shared header count is now an accessible action: it opens the modal below 1280px and focuses the persistent rail at desktop widths. Draft display is gated behind the catalogue's first client effect to avoid the cross-island hydration mismatch discovered with a persisted draft during browser testing.
- Focused component coverage verifies desktop ordering/removal/persistence, mobile focus behavior, textual compatibility, retryable metadata failure, header event dispatch and the cross-route hash entry flow. The final suite contains 63 passing tests.
- Browser checks at 320, 390, 834, 1024 and 1280 CSS pixels verified sheet/rail placement, two-video ordering, reload persistence, header and bottom-summary triggers, Escape focus restoration, zero horizontal overflow and zero console warnings/errors after the hydration fix.
- Task 7 was accepted, committed and pushed as `963db80` (`feat: add responsive session draft composition`).

## Task 7A verification handoff

- The page background now separates white content surfaces without adding decorative brand claims; the header and overlays remain neutral, while the existing blue ramp continues to carry action, focus and selected-state meaning.
- Search and filters read as one catalogue workspace. Cards use restrained elevation, secondary details actions and an explicit selected border/state; the desktop draft rail uses stable two-column move controls, a separately aligned remove action and a viewport-bounded list that scrolls independently while its summary remains visible.
- `Button`, `Input`, `NativeSelect` and `Badge` are now owned primitives composed from the official shadcn/Base UI direction. All catalogue/draft controls use those variants, native select semantics and mobile pickers are preserved, the caret has dedicated spacing, and native dialogs remain unchanged.
- The header draft count and ordered-session positions use compact primary badges for faster scanning. Catalogue cards no longer prefix supported headsets with a validation checkmark; they render up to two neutral headset pills under the accessible `Casques compatibles` list label. Explicit compatible/non-compatible icons remain reserved for the draft after a session headset is chosen.
- The palette now includes an OKLCH green 700 primitive mapped through semantic `success` and `success-foreground` tokens. `Dans ma séance` uses `text-success` with its existing checkmark, reaching 4.94:1 contrast on white without changing the blue selected-card border or relying on color alone.
- Removal from the current draft is consistently treated as a reversible secondary action: catalogue cards, video details and draft items now share the neutral secondary button colors and X icon. Their full-width or compact geometry remains contextual, while destructive red and the trash icon are no longer used for this action.
- The CLI output was treated as scaffolding rather than a theme decision: Geist, Lucide, dark/chart/sidebar tokens and animation helpers were removed; Heroicons outline and the existing neutral/blue product tokens remain authoritative. React 18 ref forwarding and the shared touch/focus treatment have focused regression coverage.
- Contextual copy now states that catalogue search is by title and that headset choice happens when saving. No Task 8 finalisation action or behavior was introduced.
- Before/after captures covered 390 × 844, 834 × 1112 and 1280 × 900 CSS pixels, with additional details/draft-sheet captures at tablet width. The final control pass rechecked the filter sheet, selected cards, draft ordering controls and desktop rail; browser checks confirmed focus restoration, a visible 2px logo-blue keyboard ring, reduced-motion handling, zero errors/warnings and no horizontal overflow at 320, 390, 834, 1024 and 1280 CSS pixels.
- A seven-video desktop draft was rechecked at 1374 × 1502 CSS pixels after bounding the sticky rail: its list had 223px of independent overflow, scrolled through the final item without changing the page scroll position, kept the summary visible and produced no console warnings or errors.
- The same populated desktop state was rechecked after the badge refinement: both numeric badge roles rendered with the primary blue and white text, headset metadata rendered as icon-free neutral pills, horizontal overflow remained absent and the console stayed clean.
- The semantic success follow-up was browser-checked in the same desktop state: `Dans ma séance` resolved to the new OKLCH green token, retained its checkmark, left the selected border blue and introduced no horizontal overflow or console diagnostics.
- Representative contrast ratios range from 4.83:1 for destructive text on white to 17.18:1 for foreground text on the page background. A search-label mutation made the focused component test fail before restoration.
- Final `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 13 Vitest files and 67 tests, and the production server build. `npm audit --omit=dev` reported zero known production vulnerabilities. Task 7A and Checkpoint C were committed in `cbc2399`; its later visual follow-ups are committed in `7804efd` and `9334307`.

## Task 8 verification handoff

- `src/features/sessions/api.ts` is the browser-side save boundary. It posts the ordered validated payload once, parses every response as untrusted data and exposes validation details or a stable recoverable French error without automatically replaying a write.
- `SessionFinalisationDialog.tsx` provides the responsive final step with a required 1–120 character name and optional known headset that are explicitly identified in their visible and accessible labels, plus an explicit compatibility summary, ordered video confirmation, accessible field/general errors, pending lockout and manual retry. Visible filter and finalisation labels are block-level so their shared vertical-spacing utilities reliably separate them from their controls. Name and headset edits continue to write to the persisted canonical draft.
- `SessionDraftComposition.tsx` exposes `Finaliser ma séance` in both the desktop rail and smaller-viewport sheet. A confirmed `201` invokes `clearDraftAfterSave()` and navigates to the focused `/sessions?created={id}` success state; validation and failed requests leave the draft untouched.
- Failing-first unit/component tests protect ordered request payloads, invalid success responses, server validation details, accessible empty-name handling, compatibility warnings, duplicate-submit prevention, retained values and retry recovery.
- Real-browser checks covered the populated 1362px desktop rail, a 480 × 844 mobile full-screen dialog and an 834 × 1112 tablet dialog. They verified initial name-field focus, Escape return to the draft sheet, no horizontal overflow, explicit incompatible-video copy, success and cleared header count, two real seeded upstream failures, retained name/video content and a successful later retry. Final console warnings/errors were zero.
- `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 15 Vitest files and 75 tests, and the production server build. `git diff --check` passed. The previously isolated `button.tsx` Prettier failure is resolved. The Task 8 baseline and field-cue refinement are committed in `f22dc0d` and `8cee9e8`; subsequent label-spacing and visual refinements are committed through `c797443`.

## Task 9 verification handoff

- `src/pages/sessions/index.astro` now supplies server-validated initial session/headset data to one React sessions surface. The current draft remains visibly separate from saved sessions, while TanStack Query owns list loading, retry and recovered data in the browser.
- `src/pages/sessions/[id].astro` and `SavedSessionDetails.astro` render saved sessions as read-only ordered programmes with saved name/date/duration/headset metadata, intentional missing-video fallbacks, a 404 state and a retryable 503 state. No edit or delete actions were added.
- `resolve-session-videos.server.ts` scans catalogue pages sequentially with `per_page=100`, stops once all requested IDs are resolved or the catalogue is exhausted and reconstructs the result in `video_ids` order. Focused tests protect request bounds, ordering and unavailable positions.
- Real-browser checks covered 480px mobile, 834px tablet and 1440px desktop layouts with no horizontal overflow. Not-found and transient service-error states were exercised, the desktop summary remained sticky, smaller layouts remained linear and the final browser console had no errors or warnings.
- A real save created `Vérification Task 9`, returned to `/sessions?created=ses_004`, exposed the confirmation and saved-list entry, cleared the draft and linked to details preserving the selected Omar → Hugo playback order. The mock API remains memory-only, so this verification record disappears when its process restarts.
- `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 18 Vitest files and 84 tests, and the production server build. Task 9 is intentionally uncommitted for review; Task 9A has not started.

## Task 3 verification handoff

- `zod` 4.6 was added as the runtime-validation dependency. `src/lib/api/schemas.ts` is the single schema/type source for upstream responses, application-owned session input, persisted draft data and server configuration.
- `src/lib/api/catalogue-client.server.ts` is the shared server-only client for Astro loaders and BFF routes. It validates JSON once, rewrites non-null thumbnail URLs to `/api/thumbnails/{id}.svg`, applies a seven-second timeout and exposes typed catalogue, reference and session operations.
- `src/pages/api/` contains thin same-origin endpoints for videos, jobs, audiences, headsets, sessions and thumbnails. Supported video query parameters are allow-listed; session bodies are validated before forwarding; meaningful upstream status/details are preserved.
- Internal errors distinguish configuration, transport, timeout, upstream and invalid-response failures. Raw Zod diagnostics remain server-side while BFF responses use concise recoverable French messages.
- Focused red-green tests passed for 20 schema/client/BFF cases. Final `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 24 tests and the production build; `git diff --check` is part of the final handoff check.
- Combined `npm run dev` smoke checks returned a validated filtered video list with a same-origin thumbnail URL, an SVG thumbnail with `nosniff`, reference data, the upstream 400 body for invalid pagination and the upstream deliberate 500 body for the first session POST. No automatic POST retry was added; one distinct manual retry verified the `201` path and ordered IDs.
- Task 3 is committed as `6f4a56b`. Task 4 was implemented only after a new explicit instruction.

## Task 1 verification handoff

- `npm run verify`: passed formatting, ESLint, `astro check` with zero diagnostics, Vitest (configured with no behavior tests yet) and the production build.
- `npm run dev`: served the mock API at `http://localhost:4000` and Astro at `http://localhost:4321`; `/health`, `/videos?per_page=1` and `/` responded successfully; one interrupt stopped both child processes.
- `npm start` and `npm run start:api`: the built Astro service and mock API were smoke-tested independently.
- A real browser at 390 × 844 CSS pixels rendered the placeholder with the expected title, heading and content hierarchy.
- `npm audit`: zero known vulnerabilities after avoiding an incompatible/vulnerable Astro ESLint parser chain; ESLint covers JavaScript/TypeScript and `astro check` validates Astro files.
- Task 1 was committed and pushed to `dev` as `7763d60` (`chore: bootstrap Astro frontend toolchain`). At the 2026-10-22 context-restoration handoff, `dev` matched `origin/dev` and the working tree was clean.
