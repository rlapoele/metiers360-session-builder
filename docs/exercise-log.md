# Exercise evidence log

This working document preserves evidence needed for the final candidate-facing README. It is not the final README and should remain factual and concise.

Update it after each candidate-attention session. Autonomous agent execution time does not count toward the half-day attention budget; candidate time spent reading, framing, directing, reviewing and testing does.

## Attention sessions

Exact durations have not yet been recorded. Do not estimate or backfill them without the candidate's confirmation.

| Date | Candidate attention | Work reviewed or directed | Verification performed personally |
|---|---:|---|---|
| 2026-10-21 | To be supplied by the candidate | Requirements, API behavior, UX direction, architecture, wireframes, Git setup and documentation | To be supplied by the candidate |
| 2026-10-22 | To be supplied by the candidate | Project-context restoration, correction of stale Task 1 handoff documentation, provision of the official Métiers360 logo, direction of the UI-foundation conventions, review of the Task 2 responsive shell and light theme, and direction of the selected-navigation contrast refinement | Ran Axe in Firefox and reported the selected navigation link's WCAG AAA enhanced-contrast finding; further personal verification remains to be supplied |

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

The candidate has actively shaped the direction by selecting Astro, React 18, strict TypeScript and Tailwind; excluding Remix; choosing the two-page structure and catalogue/cart mental model; and requesting successive API and responsive-design checks. This demonstrates direction and review, but it is not a substitute for recording the candidate's own final verification activities below.

## Candidate verification

Record only checks the candidate personally performed or explicitly reviewed. Do not turn agent-run checks into candidate verification.

- The candidate ran the Axe Firefox extension against the shell and reported its `color-contrast-enhanced` finding for the selected navigation link. This identified an optional WCAG AAA gap in the original 5.20:1 primary-blue treatment while the WCAG AA threshold was already met.

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
