# Project status and handoff

Last reviewed: 2026-10-22

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
- The official 192 × 192 Métiers360 WebP logo supplied from `https://www.metiers360.com/logos/m360-logo.webp` is available at `public/images/m360-logo.webp` for the Task 2 application header; it has not yet been integrated into the UI.
- The only frontend content is a deliberately minimal French placeholder proving the toolchain. The shared application shell, routes, theme tokens and product UI remain Task 2 work.

## Next action

Review Task 1 and wait for the user's explicit instruction before starting Task 2 from the accepted [project plan](../tasks/plan.md). Task 2 will introduce the `Catalogue` and `Mes séances` routes, shared responsive shell and neutral semantic theme. Do not skip ahead to API contracts, broad component installation or feature implementation.

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

The initial context baseline was accepted and pushed to `dev` in commit `6ed929a` (`docs: preserve project context and exercise evidence. Establish durable project memory mechanism`).

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
- a neutral, content-first initial theme whose semantic CSS variables are mapped into Tailwind's `@theme inline` namespaces;
- Heroicons outline as the sole application icon family;
- no global or project-local shadcn agent skill;
- the supplied `server/server.mjs` remains a separate, unchanged mock backend;
- optional Railway deployment is the final step only if time remains, using a public Astro service and a private mock-API service;
- no Remix.

Do not reopen these decisions without new evidence or an implementation conflict. Record an intentional change in the architecture document rather than silently diverging.

## Intentionally open choices

These are known implementation choices, not missing conversational context:

- Task 1 selected Astro 7.4, the Astro Node and React integrations, React 18.3, TypeScript 6, Tailwind CSS 4 and their compatible verification tooling. Review dependency updates deliberately rather than allowing them to redefine the accepted architecture.
- The official Métiers360 logo is available at `public/images/m360-logo.webp`, but no official typeface or broader brand system has been supplied. Use the logo without fabricating the rest of the identity. Begin with the agreed neutral theme, then review the rendered representative slice before refining its accent and typographic treatment.
- The most efficient saved-session video-resolution strategy remains provisional because the API has no batch-by-ID endpoint. Follow the bounded/cached approach in the architecture document and record a better strategy if implementation evidence supports one.
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

## Task 1 verification handoff

- `npm run verify`: passed formatting, ESLint, `astro check` with zero diagnostics, Vitest (configured with no behavior tests yet) and the production build.
- `npm run dev`: served the mock API at `http://localhost:4000` and Astro at `http://localhost:4321`; `/health`, `/videos?per_page=1` and `/` responded successfully; one interrupt stopped both child processes.
- `npm start` and `npm run start:api`: the built Astro service and mock API were smoke-tested independently.
- A real browser at 390 × 844 CSS pixels rendered the placeholder with the expected title, heading and content hierarchy.
- `npm audit`: zero known vulnerabilities after avoiding an incompatible/vulnerable Astro ESLint parser chain; ESLint covers JavaScript/TypeScript and `astro check` validates Astro files.
- Task 1 was committed and pushed to `dev` as `7763d60` (`chore: bootstrap Astro frontend toolchain`). At the 2026-10-22 context-restoration handoff, `dev` matched `origin/dev` and the working tree was clean.
