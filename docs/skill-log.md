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
| `agent-skills:planning-and-task-breakdown` | 2026-10-21 | Audited the existing delivery sequence, identified the absence of an actionable plan, and decomposed delivery into ordered tasks with acceptance criteria and checkpoints. | `tasks/plan.md` and `tasks/todo.md` |
| `agent-skills:documentation-and-adrs` | 2026-10-21 | Crystallised durable product, UI-foundation, README, handoff and optional-deployment decisions while keeping rationale separate from transient status. | `docs/architecture.md`, `docs/exercise-log.md`, `docs/project-status.md` and planning updates |
| `agent-skills:git-workflow-and-versioning` | 2026-10-21 | Kept documentation changes scoped and reviewable through working-tree inspection, diff hygiene and atomic commit-message suggestions. | Per-change status and `git diff --check` verification reported during documentation work |
| `agent-skills:source-driven-development` | 2026-10-21 | Verified the optional two-service Railway topology and Astro Node deployment requirements, grounded the Task 1 stack in current official documentation, and checked the Task 2 Astro Container and Tailwind v4 theme/container-query contracts before implementation. | Railway and foundation sections in `docs/architecture.md`, optional Task 11 in `tasks/plan.md`, Task 1 configuration and Task 2 `vitest.config.ts`/theme implementation |
| `agent-skills:incremental-implementation` | 2026-10-21 | Delivered Tasks 1 and 2 as separately authorised, runnable slices and stopped at each review boundary before beginning the next planned task. | Task 1 and Task 2 implementation and completion evidence in `tasks/todo.md` |
| `agent-skills:test-driven-development` | 2026-10-21 | Established the Vitest/full-verification gate for Task 1, then used failing-first navigation and Astro component tests to drive Task 2 route state and header semantics. | `package.json`, `vitest.config.ts`, `src/components/app-shell/*.test.ts` and verification evidence in `tasks/todo.md` |
| `agent-skills:debugging-and-error-recovery` | 2026-10-21 | Traced and resolved the Astro agent-environment background-process behavior, and removed an incompatible vulnerable Astro ESLint parser chain without weakening strict Astro checking. | Foreground combined-development command, ESLint configuration and zero-vulnerability audit evidence |
| `agent-skills:browser-testing-with-devtools` | 2026-10-21 | Applied the browser-verification workflow to the Task 1 placeholder and the Task 2 shell. Chrome DevTools MCP was unavailable, so the isolated in-app browser was used to inspect responsive screenshots, accessibility state, keyboard focus, overflow and console output. | Browser checks recorded in `docs/exercise-log.md` |
| `agent-skills:frontend-ui-engineering` | 2026-10-22 | Implemented the semantic, accessible, mobile-first Task 2 shell with route-aware navigation, touch targets and page-specific hierarchy. | `src/layouts/AppLayout.astro`, `src/components/app-shell/`, `src/pages/` and browser-verification evidence |
| `design-ui-with-restraint` | 2026-10-22 | Kept the foundation content-first, using the supplied logo, neutral structure and a restrained accessible blue accent without fabricated brand elements, decorative effects or premature feature UI. | `src/styles/global.css` and the rendered Task 2 shell |

## Explicit exclusions

- The external shadcn skill was evaluated but deliberately not installed or used. Official shadcn/Base UI documentation informed the architecture instead.
- Skills likely to become relevant later—such as frontend UI engineering, code review or shipping—are not part of the registry until they are actually applied.

## Maintenance

At the end of meaningful work, check whether a previously unrecorded skill was applied. If so, add one row with its first-use date, concrete contribution and repository evidence. Repeated use of an existing skill does not require another row.
