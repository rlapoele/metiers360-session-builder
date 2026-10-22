# Agent skill registry

Last reviewed: 2026-10-22

This document records the distinct agent skills actually applied while delivering the Métiers360 session builder. It supports the exercise's AI-use disclosure by making the working methods visible without turning the exercise log into a tool transcript.

## Recording rules

- Record a skill only after its instructions have been loaded and applied to project work.
- Record each distinct skill once. Extend its contribution summary only when a materially different use adds useful context.
- Do not record skills that were merely available, suggested, inspected for possible installation or anticipated for future work.
- Do not count shell commands, web browsing, APIs, MCP connectors or other tools as skills.
- Do not count project dependencies such as Astro, React, Base UI or Zod as agent skills.
- Keep claims factual. The initial backfill below is limited to skill use explicitly surfaced in the retained project conversation as of 2026-10-21; earlier unrecorded use must not be reconstructed from guesswork.

## Distinct skills used

| Skill | First recorded | Contribution to this project | Evidence produced |
|---|---|---|---|
| `agent-skills:using-agent-skills` | 2026-10-21 | Established the distinction between applied skills, merely available skills and ordinary tools while creating this registry. | `docs/skill-log.md` and the maintenance rule in `AGENTS.md` |
| `agent-skills:planning-and-task-breakdown` | 2026-10-21 | Audited the delivery sequence, decomposed implementation into ordered tasks with acceptance criteria and checkpoints, and later inserted the explicit Task 7A visual-system review without destabilising established downstream task numbers. | `tasks/plan.md` and `tasks/todo.md` |
| `agent-skills:documentation-and-adrs` | 2026-10-21 | Crystallised durable product, UI-foundation, README, handoff and optional-deployment decisions while keeping rationale separate from transient status. | `docs/architecture.md`, `docs/exercise-log.md`, `docs/project-status.md` and planning updates |
| `agent-skills:git-workflow-and-versioning` | 2026-10-21 | Kept documentation changes scoped and reviewable through working-tree inspection, diff hygiene and atomic commit-message suggestions. | Per-change status and `git diff --check` verification reported during documentation work |
| `agent-skills:source-driven-development` | 2026-10-21 | Verified the optional two-service Railway topology and Astro Node deployment requirements, grounded the Task 1 stack in current official documentation, checked the Task 2 Astro Container and Tailwind v4 theme/container-query contracts, confirmed the Task 3 Astro endpoint/server-environment and Zod 4 boundary APIs, and followed the current TanStack Query v5 provider/query/placeholder-data contracts for Task 4. | Railway and foundation sections in `docs/architecture.md`, optional Task 11 in `tasks/plan.md`, Task 1 configuration, Task 2 theme implementation, Task 3 BFF/environment configuration and Task 4 catalogue query surface |
| `agent-skills:incremental-implementation` | 2026-10-21 | Delivered Tasks 1 through 3 as separately authorised, runnable slices and stopped at each review boundary before beginning the next planned task. | Task 1 through Task 3 implementation and completion evidence in `tasks/todo.md` |
| `agent-skills:test-driven-development` | 2026-10-21 | Established the Vitest/full-verification gate for Task 1, used failing-first navigation and Astro component tests for Task 2, drove Task 3 schemas/client/BFF helpers through focused cycles, and added failing-first Task 4 URL, browser-contract, React behavior and thumbnail cache-policy coverage. | `package.json`, `vitest.config.ts`, colocated component/API/query/route tests and verification evidence in `tasks/todo.md` |
| `agent-skills:debugging-and-error-recovery` | 2026-10-21 | Traced and resolved the Astro agent-environment background-process behavior, and removed an incompatible vulnerable Astro ESLint parser chain without weakening strict Astro checking. | Foreground combined-development command, ESLint configuration and zero-vulnerability audit evidence |
| `agent-skills:browser-testing-with-devtools` | 2026-10-21 | Applied the browser-verification workflow to the Task 1 placeholder and the Task 2 shell. Chrome DevTools MCP was unavailable, so the isolated in-app browser was used to inspect responsive screenshots, accessibility state, keyboard focus, overflow and console output. | Browser checks recorded in `docs/exercise-log.md` |
| `agent-skills:frontend-ui-engineering` | 2026-10-22 | Implemented the semantic, accessible, mobile-first Task 2 shell and Task 4 catalogue discovery surface with labelled controls, touch targets, explicit UI states and responsive card composition. | `src/layouts/AppLayout.astro`, `src/components/app-shell/`, `src/components/catalogue/`, `src/pages/` and browser-verification evidence |
| `design-ui-with-restraint` | 2026-10-22 | Kept the foundation content-first, using the supplied logo, neutral structure and a restrained accessible blue accent without fabricated brand elements, decorative effects or premature feature UI. | `src/styles/global.css` and the rendered Task 2 shell |
| `product-design:audit` | 2026-10-22 | Audited the rendered shell's information hierarchy, responsive behavior, keyboard focus and colour contrast, distinguishing the selected link's WCAG AA pass from its optional AAA enhanced-contrast finding. | Accessibility review evidence and the approved current-navigation contrast refinement recorded in `docs/exercise-log.md` |
| `agent-skills:api-and-interface-design` | 2026-10-22 | Defined the stable Task 3 boundary between browser, Astro and the supplied API, with schema-first contracts, consistent error semantics, allow-listed forwarding and no duplicated business storage. | `src/lib/api/`, `src/pages/api/` and Task 3 handoff evidence |
| `agent-skills:code-review-and-quality` | 2026-10-22 | Reviewed the completed Task 3 and Task 4 diffs across correctness, readability, architecture, security and performance; mutation-tested boundary and URL-reset behavior and split the catalogue UI into focused modules before handoff. | Task 3 API tests, Task 4 query/component tests, final diff reviews and verification evidence |
| `playwright` | 2026-10-22 | Automated Task 4 browser inspection across target widths and exercised catalogue search, filters, pagination, history, card selection and deterministic failure/retry flows in an isolated browser session. | Responsive screenshots and browser-flow evidence recorded in `docs/exercise-log.md` |
| `write-practical-copy` | 2026-10-22 | Established the per-slice, representative-surface, application-wide and final-accessibility cadence for reviewing clear, consistent French interface copy. | Copy-verification cadence and Task 9A in `tasks/plan.md` and `tasks/todo.md` |

## Explicit exclusions

- The external shadcn skill was evaluated but deliberately not installed or used. Official shadcn/Base UI documentation informed the architecture instead.
- Skills likely to become relevant later—such as frontend UI engineering, code review or shipping—are not part of the registry until they are actually applied.

## Maintenance

At the end of meaningful work, check whether a previously unrecorded skill was applied. If so, add one row with its first-use date, concrete contribution and repository evidence. Repeated use of an existing skill does not require another row.
