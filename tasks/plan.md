# Implementation plan: Métiers360 session builder

Status: accepted on 2026-10-21. Task 1 completed on 2026-10-21; Task 2 awaits review and explicit instruction.

## Purpose

Deliver a small, accessible session-building application before 2026-10-27 while respecting the exercise's half-day candidate-attention budget. Work in thin, independently verifiable slices and prefer a complete, explainable core workflow over unverified breadth.

The live completion state belongs in [todo.md](todo.md). This file records the stable sequence, dependencies, acceptance criteria and risks. Do not silently reorder or expand scope; document why when implementation evidence requires a change.

## Priorities

1. **Core delivery:** find videos, inspect them, compose and order a draft, validate it, and save it reliably.
2. **Agreed supporting workflow:** list saved sessions and inspect a saved session.
3. **Delivery quality:** accessibility, responsive behaviour, failure recovery, verified commands and a concise candidate-facing README.

If scope must be reduced, protect the verified core delivery first. Record saved-session review or non-essential polish as deliberate omissions rather than shipping incomplete behaviour.

## Dependency flow

```text
Toolchain and scripts
  -> application shell and theme
    -> runtime contracts and BFF
      -> catalogue discovery
        -> video details
          -> persisted draft model
            -> responsive draft composition
              -> validation and save
                -> saved-session review
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
- The shell follows the mobile, tablet and desktop wireframe hierarchy without fabricating brand assets or settings.
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

**Verification:** Component tests and mobile/tablet/desktop browser checks for add, remove, reorder, focus and persistence.

**Dependencies:** Tasks 4 and 6.

## Checkpoint C — Composition

A user can build and reorder a persistent draft from the catalogue without data loss, pointer-only interaction or viewport overflow.

### Task 8 — Implement finalisation and session saving

**Outcome:** A valid draft can be named, optionally assigned a headset and saved with recoverable failure handling.

**Acceptance criteria:**

- The form enforces the API's trimmed 1–120 character name, ordered 1–30 video IDs and optional known headset.
- Compatibility warnings are explicit, validation is accessible and duplicate submissions are disabled while pending.
- A `201` clears the draft only after confirmation and leads to a clear success destination.
- Failed transport or validation responses preserve every draft value and can be retried.

**Verification:** Validation/save tests and browser flows for success, validation failure, upstream failure and retry.

**Dependencies:** Tasks 3 and 7.

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

### Task 10 — Complete delivery verification and documentation

**Outcome:** The submitted repository is reproducible, candid about scope and reviewable in five minutes.

**Acceptance criteria:**

- Keyboard, focus, announcements, contrast, reduced motion and overflow are reviewed across affected surfaces and target widths.
- Format/lint, strict check, unit/component tests, browser tests and production build all pass from the documented setup.
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

**Dependencies:** All delivered feature tasks.

## Checkpoint E — Submission readiness

The repository is reproducible, the final README matches the delivered application, known omissions are explicit, and the candidate has personally reviewed the evidence claimed as personal verification.

### Task 11 — Optionally deploy to Railway

**Outcome:** If time remains after Checkpoint E, the reviewed application is available from a public Railway URL without exposing the mock API directly.

**Acceptance criteria:**

- Two Railway services use the same repository with explicit roots: `/` for `web` and `/server` for `api`; deployment does not depend on automatic monorepo discovery.
- Astro uses the Node adapter in standalone server mode, listens on `0.0.0.0` and Railway's `PORT`, and is the only service with a public domain.
- The web service's server-only `CATALOG_API_URL` references the API service's `RAILWAY_PRIVATE_DOMAIN` and `PORT`; no private hostname reaches browser code.
- API-generated thumbnail URLs are exposed through the same-origin BFF proxy, and both services have passing health checks.
- A production smoke test covers catalogue loading, a thumbnail, draft composition, session saving and saved-session review; documentation states that saved sessions reset on API restart/redeploy.

**Verification:** Inspect both deployment logs and health checks, then run the critical flow against the public URL at mobile and desktop widths.

**Dependencies:** Checkpoint E. Skip this task without penalty if the attention or calendar budget is exhausted.

## Checkpoint F — Optional hosted demo

The public Astro URL serves the verified application, the API remains private, and the final README includes the live link only after the smoke test passes.

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
