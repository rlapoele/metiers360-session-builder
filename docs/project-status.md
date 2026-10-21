# Project status and handoff

Last reviewed: 2026-10-21

This file records transient project state that does not belong in the stable architecture document. A new contributor or agent must still inspect the actual working tree with `git status` and read the sources in the order defined by `AGENTS.md`.

## Delivery

- Submission deadline: **2026-10-27**. This is the concrete date supplied by the candidate; it resolves the original brief's relative “7 days after receipt” wording.
- Attention budget: one half-day of the candidate's attention. Per the original brief, autonomous agent execution time is excluded; time spent reading, framing, directing, reviewing and testing is included.
- Attention time and AI-use evidence are tracked in [exercise-log.md](exercise-log.md). Do not infer missing durations after the fact.

## Current phase

- The supplied mock API, catalogue and original brief are present.
- Product structure, responsive behavior and intended frontend architecture have been agreed and documented.
- The frontend has **not** been bootstrapped. There is no Astro application, React source, frontend dependency set or frontend verification command yet.
- `npm start` is currently the only implemented package script and starts the supplied mock API.

## Next action

Start delivery sequence step 1 from [architecture.md](architecture.md#delivery-sequence):

1. bootstrap Astro in server mode with React 18, strict TypeScript and Tailwind;
2. add the application shell for `Catalogue` and `Mes séances`;
3. add only the verification scripts that are genuinely implemented;
4. verify the initial shell before beginning the API-contract slice.

Do not skip ahead to broad component installation or feature implementation. Keep the first slice independently runnable and reviewable.

## Git workflow

Repository: `https://github.com/rlapoele/metiers360-session-builder.git`

| Branch | Role |
|---|---|
| `dev` | Default branch and active development/integration branch. Push normal project work here. |
| `releases` | Production-release branch. Only advance it as part of an intentional release. |
| `main` | Backup branch used before making a new production release. Do not treat it as the day-to-day development branch. |

As verified on 2026-10-21, all three branches exist locally and on `origin`, point to commit `195cf9d`, and track their matching remote branches. GitHub's remote `HEAD` points to `dev`.

Before the first release, define and document the exact commands used to preserve the prior release on `main` and promote the candidate to `releases`. Do not improvise destructive branch replacement or force-push.

## Working-tree handoff

At this handoff, documentation changes are intentionally uncommitted pending review:

- `AGENTS.md`: Zod, selective shadcn/Base UI guidance, and handoff-document links;
- `docs/architecture.md`: runtime-schema direction and UI primitive shortlist;
- `docs/project-status.md`: this status and workflow record;
- `docs/exercise-log.md`: exercise evidence record.

Review the current diff rather than assuming this list is still current. Once these files are accepted and committed, update or remove this subsection so it does not claim the tree is dirty when it is not.

## Settled decisions

The accepted product and architecture decisions live in `AGENTS.md`, `docs/architecture.md` and the viewport wireframes. In particular:

- two top-level pages: `Catalogue` and `Mes séances`;
- contextual video details rather than a video-details route;
- a dedicated saved-session details route;
- Astro server output with React 18 islands and a thin same-origin BFF;
- URL-owned catalogue state, TanStack Query remote state, and a persisted Nano Stores draft;
- strict TypeScript plus Zod validation at runtime boundaries;
- Tailwind and selectively installed shadcn/ui components configured with Base UI;
- the supplied `server/server.mjs` remains a separate, unchanged mock backend;
- no Remix.

Do not reopen these decisions without new evidence or an implementation conflict. Record an intentional change in the architecture document rather than silently diverging.

## Intentionally open choices

These are known implementation choices, not missing conversational context:

- Exact compatible dependency versions will be selected during bootstrap while preserving React 18 and the documented architecture.
- No official brand assets, palette or typeface have been supplied. Do not fabricate an official Métiers360 identity; use a restrained product treatment unless assets are provided.
- The most efficient saved-session video-resolution strategy remains provisional because the API has no batch-by-ID endpoint. Follow the bounded/cached approach in the architecture document and record a better strategy if implementation evidence supports one.
- The final candidate-facing README will replace the original brief only during the final delivery phase, after its claims and commands can be verified.

## Handoff checklist

At the end of each meaningful slice, update this file with:

- completed delivery-sequence step and next pending step;
- files or areas changed;
- exact verification commands and their outcomes;
- known failures, unresolved questions and approvals still needed;
- whether the working tree is intentionally uncommitted.

Record candidate-attention and AI-use evidence separately in `docs/exercise-log.md`.
