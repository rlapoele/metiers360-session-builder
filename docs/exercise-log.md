# Exercise evidence log

This working document preserves evidence needed for the final candidate-facing README. It is not the final README and should remain factual and concise.

Update it after each candidate-attention session. Autonomous agent execution time does not count toward the half-day attention budget; candidate time spent reading, framing, directing, reviewing and testing does.

## Attention sessions

Exact durations have not yet been recorded. Do not estimate or backfill them without the candidate's confirmation.

| Date | Candidate attention | Work reviewed or directed | Verification performed personally |
|---|---:|---|---|
| 2026-10-21 | To be supplied by the candidate | Requirements, API behavior, UX direction, architecture, wireframes, Git setup and documentation | To be supplied by the candidate |
| 2026-10-22 | To be supplied by the candidate | Project-context restoration, correction of stale Task 1 handoff documentation, provision of the official Métiers360 logo, direction and review of the Task 2 shell/light theme and selected-navigation contrast refinement, authorisation of the Task 3 runtime-contract/BFF, Task 4 catalogue-discovery, Task 5 contextual-details, Task 6 persisted-draft and Task 7 responsive-composition slices, acceptance of Task 7, and direction to schedule explicit visual-system and application-copy reviews | Ran Axe in Firefox and reported the selected navigation link's WCAG AAA enhanced-contrast finding; tested and accepted Task 6; confirmed Task 7 was tested and accepted without supplying additional personal-check details; further personal verification remains to be supplied |
| 2026-10-23 | To be supplied by the candidate | Reviewed and directed the remaining Task 7A visual refinements, paused work overnight, reported storm-limited connectivity and authorised the offline-capable Task 8 save-flow slice plus the Prettier correction | To be supplied by the candidate |

Running total: **unknown pending candidate input**.

## AI use to date

Distinct agent workflows actually applied are tracked separately in [skill-log.md](skill-log.md). That registry complements this outcome-focused account; it does not replace the final explanation of what was delegated and personally verified.

AI assistance has been used for:

- reading and analysing the exercise brief, mock API and catalogue;
- checking API behavior such as search scope, thumbnail responses, saved sessions, headset selection and empty compatibility arrays;
- exploring the information architecture and catalogue/session-builder workflow;
- drafting responsive text wireframes for mobile, tablet and desktop;
- proposing the Astro/React/BFF/state-management architecture;
- identifying candidate shadcn/ui Base UI primitives and a Zod validation boundary;
- creating and reviewing repository context documentation;
- assisting with repository initialization, branch/upstream verification and ignore rules.
- bootstrapping and verifying the minimal Astro/React/Tailwind frontend foundation while keeping the supplied mock API independently runnable.
- restoring the project context from repository sources and reconciling stale Task 1 documentation with the verified Git state.
- downloading and validating the supplied official Métiers360 logo for later use in the application shell.
- evaluating a logo-derived blue accent and recording the agreed primitive-to-semantic token structure, responsive-query ownership and Tailwind utility discipline for future UI slices.
- implementing and verifying the shared Astro shell, route-aware navigation, two foundation routes, accessible focus baseline and light-theme token mappings as the authorised Task 2 slice.
- reviewing shell contrast against WCAG AA and AAA thresholds, then implementing and verifying the candidate-approved current-navigation token and square focus-outline refinement.
- implementing and verifying central runtime schemas, a typed server-only catalogue client and thin same-origin Astro BFF routes without changing the supplied mock API.
- implementing and verifying the URL-owned searchable/filterable paginated catalogue, server-rendered initial data, TanStack Query client transitions, responsive cards and recoverable UI states.
- implementing and verifying contextual video details with complete metadata, responsive modal geometry, accessible keyboard/focus behavior, synchronised selection, missing-media handling and recoverable errors.
- implementing and verifying the validated Nano Stores draft model, guarded browser persistence, derived count/duration/compatibility, cross-island header count and catalogue selection restoration.
- implementing and verifying responsive draft composition with a persistent desktop rail, mobile/tablet sheet, explicit ordering controls, textual compatibility states, retryable metadata failures and cross-route focus restoration.
- auditing and refining the representative shell, catalogue, details and draft surfaces with before/after browser evidence, restrained neutral/blue hierarchy, contextual French copy, contrast checks, reduced-motion handling and responsive accessibility verification.
- applying the official shadcn/Base UI Astro guidance selectively to owned `Button`, `Input` and native `Select` primitives, while discarding unrelated generated theme/font/icon additions and retaining native dialogs.
- converting the established primitive color palette from hexadecimal notation to numerically equivalent OKLCH tokens without changing semantic mappings or visual intent.
- implementing and verifying the Task 8 finalisation/save workflow with persisted name/headset input, explicit compatibility, accessible validation, pending protection, confirmed clear-on-success and retryable draft-preserving failures.

The candidate has actively shaped the direction by selecting Astro, React 18, strict TypeScript and Tailwind; excluding Remix; choosing the two-page structure and catalogue/cart mental model; and requesting successive API and responsive-design checks. This demonstrates direction and review, but it is not a substitute for recording the candidate's own final verification activities below.

## Candidate verification

Record only checks the candidate personally performed or explicitly reviewed. Do not turn agent-run checks into candidate verification.

- The candidate ran the Axe Firefox extension against the shell and reported its `color-contrast-enhanced` finding for the selected navigation link. This identified an optional WCAG AAA gap in the original 5.20:1 primary-blue treatment while the WCAG AA threshold was already met.
- The candidate confirmed that Task 7 was tested and accepted. No additional candidate-run check details or attention duration were supplied, so the agent-run Task 7 evidence remains recorded separately below.

## Candidate assumptions for the final README

The brief asks for the three assumptions that most affected the solution. The following are candidates supported by the documented direction; select and refine the final three after implementation:

1. The primary user prepares a session quickly, often on a tablet and sometimes in front of a group, so the interface should prioritise immediate comprehension and forgiving actions over dense functionality.
2. Session preparation is best understood through a familiar catalogue-and-cart model, while all user-facing language remains specific to videos and séances.
3. Reviewing multiple previously saved sessions is useful because the supplied API exposes a session collection, even though saved sessions are memory-only and cannot be edited or deleted.
4. Search and filters should reflect only capabilities the supplied API actually provides; title-only search and server pagination must not be presented as full-catalogue semantic search or client-side global sorting.

These are working candidates, not a claim that the final three have already been chosen.

## Main interface choices for the final README

Candidate choices currently documented:

- Keep `Catalogue` and `Mes séances` as the only top-level destinations; treat `Ma séance` as the current draft rather than a third page.
- Keep catalogue cards concise and move complete metadata into a contextual details sheet so the user retains catalogue position.
- Keep the draft persistently visible on desktop and available as a full-height sheet on smaller viewports, with explicit ordering and compatibility controls.
- Begin with a neutral, content-first shadcn theme, share its semantic CSS custom properties with Tailwind utilities through `@theme inline`, and use Heroicons outline consistently rather than mixing icon families.
- Keep page composition viewport-driven while allowing reusable components to adapt to their allocated space through container queries; consume the resulting design system through named Tailwind utilities instead of scattered arbitrary values.

Final wording should state which target users benefit from each choice and should be checked against the implemented interface.

### Rationale for the UI foundations

- **shadcn/ui with Base UI:** Base UI supplies headless primitives with established accessibility, keyboard interaction, focus and overlay behaviour; shadcn/ui provides owned, editable component source composed on top of those primitives. Reusing that foundation avoids spending the exercise's limited attention budget recreating complex common-component behaviour. It reduces implementation risk but does not replace keyboard, focus, screen-reader and responsive browser verification.
- **Neutral initial theme:** A restrained, readable baseline keeps decorative styling from masking structural problems. It lets the candidate and reviewers assess information hierarchy, navigation and end-to-end workflows first, while the colourful catalogue thumbnails remain the main visual content.
- **Token-based theming:** Because the component source is owned and its semantic CSS variables are exposed through Tailwind's `@theme inline` namespaces, visual treatment can evolve incrementally without rewriting component composition or scattering replacement colour utilities through the application.
- **Heroicons outline only:** One icon family gives actions and metadata a consistent stroke, proportion and visual weight. Generated components that introduce another icon dependency should be adapted rather than allowing mixed icon languages to accumulate.

These are implementation principles rather than claims that the resulting interface is accessible or visually successful before it has been tested.

## Decision made against an AI proposal

**Not yet identified.** The final README requires one genuine, significant instance. Do not invent a disagreement or relabel a jointly explored option as a rejected AI recommendation. Record it here when it actually occurs, including:

- what the tool proposed;
- why the candidate rejected or changed it;
- what was implemented instead;
- what evidence or product principle informed the decision.

## Deliberate omissions and one-more-day ideas

These must reflect the delivered application, so they remain open until implementation scope is known.

### Deliberate omissions

- Pending implementation.

### With one more day

- Pending implementation.

## Verification evidence

Record exact commands, browser widths and outcomes as implementation proceeds. Do not list planned scripts as successful checks.

| Date | Performed by | Command or check | Outcome |
|---|---|---|---|
| 2026-10-21 | Agent | Documentation link/structure inspection and `git diff --check` | Passed after the handoff documents were added |
| 2026-10-21 | Agent | `npm audit --json` | Passed with zero known vulnerabilities after dependency review |
| 2026-10-21 | Agent | `npm run verify` | Formatting, ESLint, strict Astro/TypeScript checks, configured Vitest runner and production build passed; no behavior test files exist in this foundation-only slice |
| 2026-10-21 | Agent | Independent production smoke checks for `npm start` and `npm run start:api` | Built Astro page, API health and a one-item catalogue response succeeded |
| 2026-10-21 | Agent | `npm run dev`, followed by local requests to `/`, `/health` and `/videos?per_page=1` | Both services ran together on ports 4321 and 4000, returned expected responses and stopped together on interrupt |
| 2026-10-21 | Agent | Real-browser inspection at 390 × 844 CSS pixels | Placeholder title, heading and supporting text rendered with the expected accessible hierarchy; Chrome DevTools MCP was unavailable, so the in-app browser was used |
| 2026-10-22 | Agent | `npm run verify` and `git diff --check` after recording the agreed UI-foundation conventions | Full repository gate and diff hygiene passed; an initial Tailwind warning caused by a pseudo-class written in Markdown was removed before the final run |
| 2026-10-22 | Agent | Focused Task 2 Vitest red-green cycle and final `npm run verify` | Navigation-state and Astro header tests passed: 2 files and 4 tests; formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics and the production build also passed |
| 2026-10-22 | Agent | Combined `npm run dev` smoke check of `/`, `/sessions` and API `/health` | All three endpoints returned HTTP 200; one interrupt stopped both child processes cleanly |
| 2026-10-22 | Agent | Real-browser Task 2 inspection at 320, 390, 768, 834, 1024, 1280 and 1440 CSS pixels | Both routes navigated correctly; current-page semantics, one h1, visible skip-link/navigation focus, 44–48px targets, responsive header progression and zero horizontal overflow were verified; console errors/warnings: zero |
| 2026-10-22 | Agent | Selected-navigation accessibility review and focused Vitest red-green cycle | Confirmed the original primary blue passed AA at 5.20:1 but failed AAA; the approved blue-800 semantic token reaches 9.17:1 on white, and component coverage now protects both the token utility and absence of rounded navigation-focus classes |
| 2026-10-22 | Agent | Real-browser contrast and focus verification at 320, 768, 1024 and 1440 CSS pixels | The current link rendered as `rgb(8, 74, 126)`, the focused link had a square 2px solid primary-blue outline with a 2px offset, no viewport had horizontal overflow and browser warnings/errors were zero |
| 2026-10-22 | Agent | `npm run verify` and `git diff --check` after the selected-navigation accessibility refinement | Formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, four Vitest tests, the production build and diff hygiene passed |
| 2026-10-22 | Agent | Task 3 focused schema/client/BFF red-green cycles | Twenty boundary tests passed for accepted and rejected schemas, query allow-listing, French session-input errors, thumbnail rewriting/proxying, upstream details, invalid responses, transport failures and timeouts |
| 2026-10-22 | Agent | Combined `npm run dev` Task 3 BFF smoke checks | Filtered videos, reference data and SVG proxy returned through Astro; upstream 400 and deliberate 500 bodies/statuses were preserved; one distinct manual POST retry returned 201 with ordered video IDs |
| 2026-10-22 | Agent | Final Task 3 `npm run verify` and `git diff --check` | Formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, 24 Vitest tests, the production server build and diff hygiene passed |
| 2026-10-22 | Agent | Task 4 focused red-green tests and mutation check | Thirteen focused URL-state, browser-BFF and React component tests passed; changing page-reset behavior made the intended regression test fail before restoration |
| 2026-10-22 | Agent | Task 4 real-browser inspection at 320, 390, 834, 1024 and 1440 CSS pixels | Verified responsive 1/2/3-column layouts, staged mobile filters, Escape/focus restoration, missing-thumbnail fallback, add/remove state and zero horizontal overflow |
| 2026-10-22 | Agent | Task 4 browser flows for URL state and remote failures | Verified empty search, applied filters, pagination, back-navigation restoration and a deterministic one-request 503 followed by successful retry without losing URL criteria |
| 2026-10-22 | Agent | Final Task 4 `npm run verify` and `git diff --check` | Formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 37 Vitest tests, the production server build and diff hygiene passed |
| 2026-10-22 | Agent | Task 4 thumbnail-cache focused red-green cycle | The endpoint-level test first failed because `Cache-Control` was absent, then passed after the Astro BFF added the approved browser-facing policy; the supplied API was unchanged |
| 2026-10-22 | Agent | Task 4 thumbnail-cache follow-up `npm run verify` | Formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 38 Vitest tests and the production server build passed |
| 2026-10-22 | Agent | Task 5 focused red-green tests and review | Details fetching/date formatting, complete metadata, selection synchronisation, retry, missing-thumbnail and focus-loop tests failed before their implementations and passed afterward; the final suite contains 43 passing tests |
| 2026-10-22 | Agent | Task 5 real-browser inspection at 390 × 844, 834 × 1112 and 1440 × 900 CSS pixels | Verified full-screen mobile and 512px right-hand tablet/desktop geometry, zero horizontal overflow, initial focus, forward/backward focus containment, Escape/focus/scroll restoration, unchanged catalogue URL, selection synchronisation and the no-thumbnail fallback |
| 2026-10-22 | Agent | Task 5 live failure and retry check | The mock API produced a transient details `500`; the sheet exposed its recoverable error state and `Réessayer` then loaded the complete video without losing catalogue context |
| 2026-10-22 | Agent | Final Task 5 `npm run verify` and `git diff --check` | Formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 43 Vitest tests, the production server build and diff hygiene passed |
| 2026-10-22 | Agent | Task 6 focused red-green store, header and catalogue tests | Verified valid restoration, malformed/schema-invalid/duplicate rejection, add/remove/reorder, name/headset constraints, clear-after-save, derived duration/compatibility, non-numeric server fallback and persisted catalogue selection |
| 2026-10-22 | Agent | Task 6 real-browser add, route-navigation, reload and return flow | A selected video remained counted on `/sessions`, survived a full reload and returned selected in the catalogue. An initial cross-island hydration mismatch was diagnosed and corrected; the final isolated run had zero console errors or warnings |
| 2026-10-22 | Agent | Final Task 6 `npm run verify`, `git diff --check` and production-dependency audit | Formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 56 Vitest tests, the production server build and diff hygiene passed; `npm audit --omit=dev` reported zero known production vulnerabilities |
| 2026-10-22 | Agent | Task 7 focused component red-green cycles | Header activation, desktop ordering/removal/persistence and mobile sheet focus tests failed before implementation and passed afterward; added coverage for textual headset compatibility and retained retryable items after metadata failure |
| 2026-10-22 | Agent | Task 7 browser checks at 320, 390, 834, 1024 and 1280 CSS pixels | Verified full-height mobile/tablet sheet through 1024px, sticky rail from 1280px, bottom/header triggers, labelled move/remove controls, Escape/focus restoration, reload persistence and zero horizontal overflow; a persisted-draft hydration mismatch was found and corrected, after which console warnings/errors were zero |
| 2026-10-22 | Agent | Final Task 7 `npm run verify` and cross-route focus regression | Formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 63 Vitest tests and the production server build passed; navigating from `Mes séances` opened the draft sheet, and Escape removed the hash and restored focus to the catalogue header trigger with a clean console |
| 2026-10-22 | Agent | Task 7A before/after audit at 390 × 844, 834 × 1112 and 1280 × 900 CSS pixels | Compared the representative catalogue at all three widths plus tablet details/draft and the populated desktop rail; refined surface separation, hierarchy, density, selected states, draft controls and contextual copy without changing accepted IA or behavior |
| 2026-10-22 | Agent | Task 7A accessibility and responsive browser checks | No horizontal overflow at 320, 390, 834, 1024 or 1280 CSS pixels; Escape restored focus to details and draft openers; keyboard focus exposed a 2px solid outline; reduced-motion emulation produced a 0.01ms transition; browser errors/warnings were zero; representative contrast ratios ranged from 4.83:1 to 17.18:1 |
| 2026-10-22 | Agent | Task 7A mutation check and final `npm run verify` | Reverting the clarified search label made its focused test fail before restoration; formatting, ESLint, strict Astro/TypeScript checks with zero diagnostics, all 12 test files and 63 tests, and the production server build passed |
| 2026-10-22 | Agent | Task 7A selective shadcn/Base UI control pass | Centralised catalogue and draft controls through owned Button/Input/NativeSelect primitives; a failing-first ref test exposed the generated React 19-style ref assumption, which was adapted for React 18. Browser checks confirmed native select semantics, improved caret spacing, consistent variants, draft ordering and a 2px logo-blue focus ring. |
| 2026-10-22 | Agent | Final refined Task 7A verification and production dependency audit | No horizontal overflow at 320, 390, 834, 1024 or 1280 CSS pixels and no console warnings/errors; `npm run verify` passed 13 test files, 66 tests, strict checks with zero diagnostics and the production build; `npm audit --omit=dev` reported zero known production vulnerabilities. |
| 2026-10-22 | Agent | Primitive palette OKLCH conversion | Replaced all 16 hexadecimal primitive token values with numerically equivalent OKLCH values while preserving semantic aliases. `npm run verify` passed 13 test files and 66 tests, strict checks and the production build; the browser exposed active OKLCH custom properties, rendered the catalogue correctly and reported no warnings/errors. |
| 2026-10-22 | Agent | Task 7A populated desktop-draft overflow regression | A failing-first component test now protects the viewport-bounded rail, fixed summary and independent list scroll. With seven persisted videos at 1374 × 1502 CSS pixels, the sticky rail fit the viewport, its list scrolled 223px through the final item without moving the page, and the console remained clean. Final `npm run verify` passed 13 files and 67 tests, strict checks and the production build. |
| 2026-10-22 | Agent | Task 7A badge and headset-metadata refinement | Failing-first component checks protected stronger header/order markers and semantic headset metadata. A shared badge primitive now renders primary numeric markers and neutral headset pills; the catalogue checkmark was removed while chosen-session compatibility indicators were preserved. Browser inspection at 1374 × 1502 confirmed clean wrapping, no horizontal overflow and no console warnings/errors; `npm run verify` passed 13 files and 67 tests, strict checks and the production build. |
| 2026-10-22 | Agent | Task 7A semantic success-state refinement | Added an OKLCH green primitive and semantic success token pair, then changed only the checked `Dans ma séance` label to `text-success`. The selected-card border remained blue and the checkmark preserved a non-color cue. Calculated contrast was 4.94:1 on white; browser inspection at 1374 × 1502 showed the intended computed token, no overflow and a clean console. `npm run verify` passed 13 files and 67 tests, strict checks and the production build. |
| 2026-10-23 | Agent | Task 7A reversible-removal consistency pass | Failing-first coverage exposed three distinct removal treatments across catalogue cards, video details and the draft composition. All three now use the neutral secondary button variant and X icon while retaining context-appropriate sizing. Browser inspection of the populated card and rail confirmed matching computed colors, 44px targets, no horizontal overflow and a clean console; `npm run verify` passed 13 files and 67 tests, strict checks and the production build. |
| 2026-10-23 | Agent | Task 8 failing-first save-client and finalisation tests | Added contract and interaction coverage for ordered payloads, invalid success responses, validation details, required-name semantics, headset incompatibility, one pending submission, retained draft values and manual retry; the focused red run failed on the missing implementation before all new tests passed. |
| 2026-10-23 | Agent | Task 8 responsive browser save flows | Verified the populated 1362px desktop rail, 480 × 844 mobile full-screen finalisation and 834 × 1112 tablet dialog, including initial focus, Escape return, accessible name validation, explicit incompatibility, success/clear and no horizontal overflow. Two actual mock-API write failures retained the draft name/video and a later manual retry reached the confirmation destination; final console warnings/errors were zero. |
| 2026-10-23 | Agent | Final Task 8 `npm run verify` and `git diff --check` | Prettier (including the prior `button.tsx` issue), ESLint, strict Astro/TypeScript checks with zero diagnostics, all 15 Vitest files and 75 tests, the production server build and diff hygiene passed. |
| 2026-10-23 | Agent | Task 8 required/optional field-cue refinement | A failing-first dialog test established visible and accessible `(obligatoire)` and `(facultatif)` labels while retaining the native required state and removing repetitive headset helper copy. Desktop browser inspection confirmed both cues, initial name focus and clean responsive fit; the focused component suite passed 5 tests before the full verification gate passed. |
