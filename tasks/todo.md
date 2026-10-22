# Project task checklist

Last updated: 2026-10-22

This is the live progress record for the accepted [implementation plan](plan.md). Check an item only after its acceptance criteria and relevant verification have passed. Record concise evidence beneath the completed item rather than duplicating implementation detail.

## Phase 1 — Foundation

- [x] **Task 1:** Bootstrap the frontend toolchain.
  - Evidence: `npm run verify` passed formatting, linting, strict Astro/TypeScript checks, the configured test runner and the production build.
  - Evidence: `npm run dev` served the mock API on port 4000 and the Astro placeholder on port 4321; `/health`, a one-item catalogue request and the rendered page all responded successfully, and one interrupt stopped both processes.
  - Evidence: the production web server and mock API were also smoke-tested independently; the placeholder was inspected in a real mobile-width browser; `npm audit` reported zero known vulnerabilities.
- [x] **Task 2:** Build the responsive application shell.
  - Evidence: `/` and `/sessions` share an Astro layout and responsive header with semantic landmarks, one page heading, a skip link, the official logo and route-aware `aria-current` navigation.
  - Evidence: the light theme defines neutral and logo-derived blue primitives, maps shadcn-compatible semantic tokens through Tailwind `@theme inline`, and uses named utilities without arbitrary values or direct custom-property expressions in component markup.
  - Evidence: the current-navigation semantic token uses blue 800 for a 9.17:1 contrast ratio on white; navigation focus outlines remain blue, visible and square rather than rounded.
  - Evidence: the post-review accessibility refinement passed `npm run verify`, including formatting, linting, strict Astro/TypeScript checks, four tests and the production build.
  - Evidence: focused Vitest coverage passed for navigation state and rendered header semantics; `npm run verify` passed formatting, linting, strict Astro/TypeScript checks, four tests and the production build.
- [x] **Checkpoint A:** Frontend and API run together; routes, verification commands and responsive shell are reviewed.
  - Evidence: `/`, `/sessions` and the API health endpoint returned HTTP 200 from the combined development process; browser checks at 320, 390, 768, 834, 1024, 1280 and 1440 CSS pixels found no horizontal overflow.
  - Evidence: mobile, tablet and desktop screenshots confirmed the intended header progression; the skip link and navigation focus treatment were visible, 44–48px touch targets were measured, route state was correct and the browser console stayed clean.

## Phase 2 — Contracts and catalogue

- [x] **Task 3:** Establish runtime contracts and the BFF boundary.
  - Evidence: central Zod schemas and inferred types cover videos, pagination, reference data, sessions, creation input, API errors, persisted drafts and server configuration; application-owned inputs are strict while additive upstream fields remain compatible.
  - Evidence: the shared server-only client validates untrusted JSON, applies a seven-second timeout, rewrites thumbnail URLs, proxies SVG bodies and normalises configuration, transport, timeout, upstream and invalid-response failures.
  - Evidence: thin same-origin Astro endpoints expose the supported catalogue, reference, session and thumbnail operations without modifying or duplicating the supplied mock API.
  - Evidence: the focused red-green cycle produced 20 boundary tests; final `npm run verify` passed formatting, linting, strict checks with zero diagnostics, all 24 tests and the production build.
  - Evidence: two-process smoke checks confirmed a filtered video response, same-origin thumbnail rewrite/proxy, reference data, preserved upstream 400 and 500 responses, and a successful `201` session creation on a distinct manual retry.
- [x] **Task 4:** Implement catalogue discovery.
  - Evidence: the server-rendered initial catalogue hydrates into one cohesive React surface using TanStack Query; browser responses are runtime-validated against the same-origin BFF contract.
  - Evidence: search, job, headset and audience filters plus server pagination write only supported state to the URL, reset page on criteria changes and restore predictably through back/forward navigation.
  - Evidence: responsive cards expose result count, loading, empty, recoverable-error, missing-thumbnail, contextual compatibility and explicit add/remove states with labelled native controls and visible focus.
  - Evidence: 13 focused query/API/component tests passed; the URL page-reset mutation was caught by its regression test; final full-suite evidence is recorded in the Task 4 handoff documents.
  - Evidence: the same-origin thumbnail endpoint adds a light browser-facing `public, max-age=86400, stale-while-revalidate=604800` cache policy without changing the supplied API; a focused endpoint test protects the exact header.
  - Evidence: browser checks covered 320, 390, 834, 1024 and 1440 CSS pixels, mobile filter focus restoration, empty search, retry recovery, pagination, history and zero horizontal overflow.
- [x] **Task 5:** Implement contextual video details.
  - Evidence: a contextual native modal keeps the catalogue mounted and unchanged, uses a full-screen mobile treatment and a 512px right-hand tablet/desktop sheet, and exposes complete metadata plus a deliberate 16:9 missing-thumbnail fallback.
  - Evidence: the surface has an accessible name, initial close-button focus, an explicit forward/backward focus loop, Escape handling, scroll locking and trigger-focus restoration; add/remove state stays synchronised with the originating card.
  - Evidence: focused red-green tests cover the details BFF contract, French date formatting, complete content, selection synchronisation, missing thumbnails, retry and focus restoration; all 43 tests pass in the final suite.
  - Evidence: browser checks at 390, 834 and 1440 CSS pixels confirmed the responsive sheet geometry, zero horizontal overflow, keyboard focus containment, Escape restoration and successful recovery from an actual transient API failure without changing the catalogue URL.
- [x] **Checkpoint B:** Catalogue search, filtering, pagination, details and failure states are browser-verified.
  - Evidence: Tasks 4 and 5 collectively cover the complete catalogue flow across target viewport families, including keyboard-only overlays, loading/empty/error/success states, URL preservation, missing media and retry recovery.

## Phase 3 — Draft composition

- [x] **Task 6:** Implement the persisted draft model.
  - Evidence: Nano Stores owns the validated versioned draft, with name, optional headset and unique ordered video IDs persisted to browser storage; count, known duration and explicit compatibility/unresolved states are derived rather than duplicated.
  - Evidence: failing-first unit coverage verifies valid restoration, invalid JSON/schema/duplicate rejection, add/remove, bounded move-up/move-down, name/headset validation, clear-after-save and derived data; the catalogue integration persists selection and the header avoids a misleading server-rendered zero.
  - Evidence: a browser-discovered cross-island hydration race was corrected by deferring catalogue observation until its first client effect. The final add → `/sessions` → reload → catalogue flow retained the count and selected card with zero console errors or warnings.
- [x] **Task 7:** Implement responsive `Ma séance` composition.
  - Evidence: the catalogue exposes the canonical draft as a sticky desktop rail from 1280px and as a full-height modal sheet plus sticky summary through mobile/tablet widths; the shared header control opens the sheet or focuses the rail according to the viewport.
  - Evidence: numbered items expose explicit touch/keyboard move-up, move-down and remove actions; count, resolved duration and headset compatibility remain textual, while unavailable per-video metadata is retained and retryable rather than removed from the draft.
  - Evidence: focused component tests cover ordering, persistence, removal, compatibility, remote failure, focus containment and restoration; browser checks at 320, 390, 834, 1024 and 1280 CSS pixels verified responsive placement, reload persistence, Escape handling, clean console output and zero horizontal overflow.
- [x] **Task 7A:** Review and refine the representative UI across the shell, catalogue, video details and draft composition.
  - Evidence: before/after browser captures at 390, 834 and 1280 CSS pixels guided a restrained hierarchy pass across the shell, search/filter workspace, catalogue cards, contextual details and draft composition without changing accepted information architecture or behavior.
  - Evidence: neutral page/card separation, tighter vertical rhythm, clearer selected-card treatment, less awkward draft controls and contextual French copy now support scanning while preserving semantic tokens, named utilities, touch targets and Heroicons outline.
  - Evidence: an owned shadcn/Base UI primitive layer now centralises `Button`, `Input` and native `Select` presentation across the catalogue and draft controls. Native dialogs remain in place, generated Geist/Lucide/theme expansion was rejected, and React 18 ref forwarding is covered by focused tests.
  - Evidence: a shared `Badge` primitive gives the header draft count and ordered-session positions sufficient primary contrast, while catalogue headset support is presented as compact neutral metadata pills without an ambiguous validation checkmark.
  - Evidence: the confirmed `Dans ma séance` state retains its textual label and checkmark but now uses a dedicated semantic success color backed by an OKLCH green primitive with 4.94:1 contrast on white; blue remains reserved for selection and primary action treatment.
  - Evidence: removing a video from the reversible draft now uses the same neutral secondary treatment and X icon in catalogue cards, video details and the draft rail/sheet; destructive red and the trash icon are reserved for genuinely destructive actions.
  - Evidence: the populated desktop draft rail is bounded to the viewport once sticky; its summary remains visible while the video list scrolls independently through later items without moving the catalogue page.
  - Evidence: contrast checks passed from 4.83:1 to 17.18:1 for representative text/action pairs; keyboard focus, Escape restoration, reduced motion, clean console output and zero horizontal overflow were verified in the browser.
- [x] **Checkpoint C:** Draft composition, ordering, persistence and the refined visual direction are browser-verified across viewport families.
  - Evidence: Tasks 6, 7 and 7A collectively cover persisted ordering, responsive sheet/rail composition and the representative visual system at 320, 390, 834, 1024 and 1280 CSS pixels; final `npm run verify` passed 13 test files, 67 tests, strict checks with zero diagnostics and the production build.

## Phase 4 — Save workflow

- [ ] **Task 8:** Implement finalisation and session saving.
- [ ] **Checkpoint D:** The complete required exercise flow works against the supplied API and passes verification.

## Phase 5 — Saved-session review

- [ ] **Task 9:** Implement saved-session list and read-only details.
- [ ] **Task 9A:** Complete the application-wide French copy audit across every route, overlay and UI state.

## Phase 6 — Delivery

- [ ] **Task 10:** Complete accessibility/responsive verification and final documentation.
- [ ] **Checkpoint E:** Clean-install rehearsal, full verification and candidate review are complete.

## Phase 7 — Optional hosted demo

- [ ] **Task 11 (optional):** Deploy the public Astro service and private mock-API service to Railway.
- [ ] **Checkpoint F (optional):** Smoke-test the public URL and add it to the README only if verified.

## Current task

**Awaiting explicit instruction:** Task 8 — Implement finalisation and session saving.

Task 7A and Checkpoint C are complete and committed in `cbc2399`. The post-commit visual follow-up remains uncommitted for review. Do not begin Task 8 without a new user instruction.
