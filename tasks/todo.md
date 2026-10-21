# Project task checklist

Last updated: 2026-10-21

This is the live progress record for the accepted [implementation plan](plan.md). Check an item only after its acceptance criteria and relevant verification have passed. Record concise evidence beneath the completed item rather than duplicating implementation detail.

## Phase 1 — Foundation

- [x] **Task 1:** Bootstrap the frontend toolchain.
  - Evidence: `npm run verify` passed formatting, linting, strict Astro/TypeScript checks, the configured test runner and the production build.
  - Evidence: `npm run dev` served the mock API on port 4000 and the Astro placeholder on port 4321; `/health`, a one-item catalogue request and the rendered page all responded successfully, and one interrupt stopped both processes.
  - Evidence: the production web server and mock API were also smoke-tested independently; the placeholder was inspected in a real mobile-width browser; `npm audit` reported zero known vulnerabilities.
- [ ] **Task 2:** Build the responsive application shell.
- [ ] **Checkpoint A:** Frontend and API run together; routes, verification commands and responsive shell are reviewed.

## Phase 2 — Contracts and catalogue

- [ ] **Task 3:** Establish runtime contracts and the BFF boundary.
- [ ] **Task 4:** Implement catalogue discovery.
- [ ] **Task 5:** Implement contextual video details.
- [ ] **Checkpoint B:** Catalogue search, filtering, pagination, details and failure states are browser-verified.

## Phase 3 — Draft composition

- [ ] **Task 6:** Implement the persisted draft model.
- [ ] **Task 7:** Implement responsive `Ma séance` composition.
- [ ] **Checkpoint C:** Draft composition, ordering and persistence are browser-verified across viewport families.

## Phase 4 — Save workflow

- [ ] **Task 8:** Implement finalisation and session saving.
- [ ] **Checkpoint D:** The complete required exercise flow works against the supplied API and passes verification.

## Phase 5 — Saved-session review

- [ ] **Task 9:** Implement saved-session list and read-only details.

## Phase 6 — Delivery

- [ ] **Task 10:** Complete accessibility/responsive verification and final documentation.
- [ ] **Checkpoint E:** Clean-install rehearsal, full verification and candidate review are complete.

## Phase 7 — Optional hosted demo

- [ ] **Task 11 (optional):** Deploy the public Astro service and private mock-API service to Railway.
- [ ] **Checkpoint F (optional):** Smoke-test the public URL and add it to the README only if verified.

## Current task

**Awaiting review:** Task 1 — Bootstrap the frontend toolchain — is complete.

The next implementation slice is Task 2 — Build the responsive application shell. Do not begin it without a new user instruction.
