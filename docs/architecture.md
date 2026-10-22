# Intended frontend architecture

Status: implementation baseline, agreed before frontend bootstrap and updated as delivery progresses.

The repository contains the supplied Node mock API and the completed minimal Astro frontend foundation from Task 1. This document records the intended architecture for the remaining implementation. Update it when an implemented decision supersedes the baseline; do not let it silently drift away from the code.

## Goals

- Deliver the exercise's React 18 and strict TypeScript requirement through Astro's React integration and Vite-based toolchain.
- Server-render the application shell and meaningful catalogue/session content.
- Hydrate only the workflows that need interaction.
- Keep the supplied backend unchanged and behind a typed application boundary.
- Make mobile the base experience, with deliberate tablet and desktop enhancements.
- Keep the solution small enough to explain and evolve during the exercise debrief.

## Non-goals

- Authentication or user accounts.
- A database or persistence beyond the supplied API and browser draft storage.
- Editing or deleting saved sessions.
- Video playback; the API provides metadata and thumbnails, not video streams.
- A bespoke design system or a generic component abstraction for every element.
- Remix.

## Target stack

| Concern | Direction | Why |
|---|---|---|
| Application framework | Astro in server mode | Server-rendered pages, routing, BFF endpoints and selective hydration |
| Interactive UI | React 18 islands | Matches the exercise requirement without hydrating the entire page |
| Language | TypeScript with `strict: true` | Explicit contracts across API, state and UI boundaries |
| Runtime schemas | Zod | Validate untrusted API, configuration and persisted data while inferring TypeScript types |
| Styling | Tailwind CSS | Fast responsive implementation with a small local token layer |
| Shared client state | Nano Stores | Small framework-agnostic store shared between Astro islands |
| Remote state | TanStack Query | Loading, error, retry and caching inside cohesive React surfaces |
| UI primitives | Selective shadcn/ui with Base UI | Accessible sheets, dialogs, selects and fields when they save work |
| Icons | Heroicons React, 24px outline set | Restrained, consistent icons with explicit individual imports |
| Tests | Vitest + Testing Library; Playwright for critical flows | Logic/component confidence plus real responsive interaction checks |
| Backend | Supplied `server/server.mjs` | Exercise-owned mock API with realistic latency and failures |

Do not add every target dependency before it is needed. Bootstrap the minimum, then add a dependency with the slice that uses it.

## UI primitive shortlist

Use shadcn/ui configured with its Base UI variant as a source of owned, editable primitives rather than as a broad visual system. The current Base UI registry includes the selected components; add them individually when the corresponding workflow is implemented.

| Component | Intended use |
|---|---|
| `Sheet` | Mobile/tablet filters, video details and draft-session surfaces; desktop video details |
| `Dialog` / `AlertDialog` | Finalisation only if a modal is appropriate; confirmation before explicitly replacing a non-empty draft |
| `Combobox` | Searchable métier filter, where choosing among roughly 55 ROME entries benefits from type-ahead |
| `Select` or `NativeSelect` | Short headset and audience choices; prefer the native control when it provides the clearest touch experience |
| `Field` + `Input` | Catalogue search and the required session-name field with descriptions/errors |
| `Checkbox` | Optional multi-select semantics only if usability testing supports it; the explicit add/remove button remains the default card action |
| `Alert` | Recoverable API errors and headset-compatibility warnings |
| `Skeleton` / `Spinner` | Initial layout-preserving loads and compact pending actions; always retain a textual status |
| `Empty` | No catalogue results and no saved sessions, with context-specific next actions |
| `Pagination` | Server-backed catalogue pagination |
| `Button` / `Badge` | Foundational actions and concise metadata/status presentation |

Do not install the full registry, force every semantic HTML element through a component, or retain generic shadcn styling unchanged. In particular, a custom video card can remain ordinary semantic markup, and a tooltip must never be the only accessible label.

Do not install the shadcn agent skill globally or locally. The project rules and official documentation provide the required guidance without granting a skill recurring access to the mutable `shadcn@latest` CLI. This can be reconsidered only through an explicit user decision.

Official references: [shadcn/ui Base UI components](https://ui.shadcn.com/docs/components/base) and [Base UI React components](https://base-ui.com/react/components/).

## Runtime topology

```text
Browser
  │
  ├─ requests Astro pages ───────────────┐
  │                                      │
  └─ React island requests `/api/*` ──┐  │
                                      ▼  ▼
                              Astro server / BFF
                                │           │
                                │ shared typed API client
                                ▼
                         supplied mock API
                        `server/server.mjs`
```

The mock API remains a separate process. Browser-side code calls same-origin Astro BFF endpoints. Astro page loaders call the shared server-only API client directly rather than making HTTP requests back into their own BFF.

Keep the BFF thin:

- forward supported query parameters and request bodies;
- apply timeouts and normalise transport failures;
- preserve meaningful upstream status codes and validation details;
- map upstream thumbnail URLs to a same-origin BFF thumbnail endpoint and proxy the SVG response;
- do not invent business rules that contradict `API.md`;
- do not duplicate the mock API's catalogue or session storage.

The upstream base URL belongs in server-only configuration, for example `CATALOG_API_URL=http://localhost:4000`. Never expose a secret or server-only variable through a public Astro environment prefix.

The thumbnail mapping is required because the supplied API generates absolute URLs from the host used to call it. In a two-service deployment that host is private and cannot be reached by a browser. Do not return a `*.railway.internal` thumbnail URL to client code or make the API public solely to serve thumbnails.

## Optional Railway deployment topology

Railway deployment is an optional final step after the application and delivery documentation are complete. Keep the repository simple for the exercise rather than restructuring it into a workspace monorepo only to trigger automatic service discovery.

Configure two Railway services explicitly from the same repository:

| Service | Root directory | Build/start direction | Networking |
|---|---|---|---|
| `web` | `/` | Build the Astro app; start the Node adapter's standalone `dist/server/entry.mjs` output | Public domain; listen on Railway's `PORT` and `0.0.0.0` |
| `api` | `/server` | No application build; start `server.mjs` through a small service-local `package.json` | Private only; use the existing `/health` endpoint |

The Astro service receives a server-only `CATALOG_API_URL` reference such as `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}`. Browser requests continue to use only the public Astro origin and its BFF. The API service does not need a public domain.

This layout is compatible with Railway's per-service root directories without assuming that Railway will infer two services from the current single-package repository. During bootstrap, add the service-local API package metadata and relocate the supplied API-only root `Dockerfile` to an archive location: if left at the repository root, Railway may select it for the Astro service. Prefer Railway's native Node build path unless deployment evidence makes service-specific Dockerfiles necessary.

Both services need independent health checks. Deployment verification must also acknowledge that saved sessions are in API process memory and disappear when the API restarts or redeploys.

Official references: [Railway monorepo deployments](https://docs.railway.com/deployments/monorepo), [Railway private domains](https://docs.railway.com/networking/domains/working-with-domains), [Railway variables](https://docs.railway.com/variables/reference), [Railway Astro deployment](https://docs.railway.com/guides/astro), and [Astro Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/).

## Routes and responsive surfaces

| Route/surface | Purpose | Rendering direction |
|---|---|---|
| `/` | Catalogue and session-building workspace | Astro page containing one cohesive `CatalogueApp` React island |
| `/sessions` | Current draft summary and saved-session list | Server-rendered initial content; interactive retry/navigation as needed |
| `/sessions/[id]` | Read-only saved-session details | Dedicated server-rendered page |
| Video details | Inspect one video without losing catalogue context | React sheet inside `CatalogueApp`; full-screen on mobile |
| `Ma séance` | Edit the current unsaved session | Persistent panel on desktop catalogue; sheet on tablet/mobile |
| Session finalisation | Name, headset, order review and save | Step/surface reached from `Ma séance`, responsive at every width |

The default catalogue route is `/`; do not add a redundant `/catalogue` route unless a later navigation requirement justifies it.

## State ownership

| State | Owner | Notes |
|---|---|---|
| Search text, job/headset/audience filters, page | URL query parameters | Back/forward, reload and shareable catalogue state |
| Video/reference/session responses | TanStack Query or Astro loader | Do not copy remote resources into Nano Stores |
| Draft name, headset ID, ordered video IDs | Nano Store persisted to `localStorage` | Shared across islands and routes; clear only after a confirmed save or explicit replacement |
| Draft count and duration | Derived selectors | Do not persist duplicate derived values |
| Sheet/dialog open state | Local React state | Temporary presentation state |
| Saved sessions | Mock API | Lost when the mock API restarts |

Browser persistence must be guarded for server rendering. Read `localStorage` only in the browser, hydrate predictably and avoid rendering a misleading zero-count flash when a persisted draft exists.

## Feature boundaries and proposed folders

```text
.
├── AGENTS.md
├── API.md
├── README.md
├── archives/
│   └── Dockerfile.api-original
├── docs/
│   ├── architecture.md
│   └── wireframes/
│       ├── desktop.md
│       ├── mobile.md
│       └── tablet.md
├── server/
│   ├── data/catalog.json
│   ├── package.json
│   └── server.mjs
├── src/
│   ├── components/
│   │   ├── astro/
│   │   │   ├── AppHeader.astro
│   │   │   └── PageShell.astro
│   │   └── react/
│   │       ├── catalogue/
│   │       ├── session-draft/
│   │       ├── sessions/
│   │       └── ui/
│   ├── features/
│   │   ├── catalogue/
│   │   │   ├── api.ts
│   │   │   ├── model.ts
│   │   │   └── query-params.ts
│   │   └── sessions/
│   │       ├── api.ts
│   │       ├── model.ts
│   │       └── session-draft.store.ts
│   ├── layouts/
│   │   └── AppLayout.astro
│   ├── lib/
│   │   ├── api/
│   │   │   ├── catalogue-client.server.ts
│   │   │   ├── schemas.ts
│   │   │   └── errors.ts
│   │   ├── format/
│   │   └── test/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── audiences.ts
│   │   │   ├── headsets.ts
│   │   │   ├── jobs.ts
│   │   │   ├── sessions/
│   │   │   └── videos/
│   │   ├── sessions/
│   │   │   ├── [id].astro
│   │   │   └── index.astro
│   │   └── index.astro
│   └── styles/
│       └── global.css
└── tests/
    └── browser/
```

This is a boundary map, not a requirement to create empty directories. Create folders only when a real slice needs them. Feature-specific types and behaviour stay with their feature; only genuinely shared transport, formatting and test utilities belong under `lib`.

## Component/island strategy

Recommended interactive boundaries:

- `CatalogueApp`: search, filters, pagination, card selection, video-details sheet and desktop draft panel. Keeping these together avoids dozens of card islands and duplicated query providers.
- `SessionDraftButton`: header count/trigger shared across routes through Nano Stores.
- `SessionsList`: only if client-side retry/refetch needs justify hydration; otherwise render the list in Astro.
- `SessionFinalisation`: may live inside `CatalogueApp` initially. Extract only if reuse or complexity earns it.

Static logo, primary navigation, headings and page shells should remain Astro/HTML. React Context may be used inside a single island, but it cannot coordinate separate islands; shared draft state belongs in Nano Stores.

## Runtime schemas and API contracts

Centralise Zod schemas and boundary parsing. Treat `response.json()`, BFF request bodies, environment values and persisted browser data as `unknown`; do not scatter `as Video` casts or duplicate schema-shaped TypeScript interfaces through components.

Define the runtime schema first and infer its TypeScript type:

```ts
import * as z from "zod";

export const VideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  duration_seconds: z.number().int().nonnegative(),
  jobs: z.array(z.string()),
  audiences: z.array(z.string()),
  compatible_headsets: z.array(z.string()),
  thumbnail_url: z.string().nullable(),
  published_at: z.string(),
});

export type Video = z.infer<typeof VideoSchema>;
```

Required schemas:

- `VideoSchema` and the paginated video-list schema;
- `JobSchema`, `AudienceSchema` and `HeadsetSchema`, including their list envelopes;
- `SessionSchema` and the sessions-list envelope;
- `CreateSessionSchema`, matching the server's trimmed 1–120 character name, ordered 1–30 video IDs and optional nullable single `headset_id`;
- the documented API-error and validation-error shapes;
- `SessionDraftSchema` for data restored from browser persistence;
- server environment configuration, including `CATALOG_API_URL`.

Use `safeParse` in fetch/storage/configuration adapters and convert failures to one internal contract/configuration error type. Preserve useful diagnostics for development, but show users a concise recoverable service error rather than raw Zod issues.

Response schemas should use normal `z.object` semantics rather than strict objects so an additive upstream field does not break the frontend. Input schemas controlled by this application may reject unknown keys where that improves safety. After a successful parse, internal functions and components trust the inferred type; do not revalidate between internal layers.

The list response also needs typed pagination metadata. Arrays remain arrays even when empty; do not model `compatible_headsets` as a non-empty tuple. Keep transport field names as authored by the API and map them only at an explicit domain/presentation boundary when a different internal name is valuable.

Zod complements strict TypeScript rather than replacing it: TypeScript protects compile-time usage, while Zod verifies data that crosses a runtime boundary. Official references: [Zod schemas and type inference](https://zod.dev/) and [`safeParse`](https://zod.dev/basics).

For saved-session details, resolve `video_ids` against catalogue data without issuing an avoidable request per video. The supplied API has no batch-by-ID endpoint, so reuse cached catalogue items where possible and fetch a bounded catalogue set when necessary. Record a clearer strategy if implementation reveals a better option.

## Catalogue behaviour

- Search queries only titles because that is what the supplied API supports.
- Initial filters: job, headset and audience.
- Use API pagination and display total results/pages.
- Reset page to 1 when the query or a filter changes.
- Keep applied filters visible as removable chips on small viewports.
- Do not group by job or sort only the current page.
- Cards show decision-critical information; video details show the complete record.
- If a headset is selected for the draft/filter, display explicit compatible/incompatible language.
- A missing thumbnail gets a stable 16:9 fallback; do not request a made-up thumbnail URL.

## Session workflow

1. Add/remove videos from the catalogue.
2. Open `Ma séance` to review count, total duration and order.
3. Reorder with explicit controls.
4. Finalise: enter a required name, optionally select a headset and resolve compatibility warnings.
5. Submit once; disable duplicate submission while pending.
6. On `201`, clear the draft and navigate to the saved-session details page or a clear success destination.
7. On failure, keep every draft value and offer retry.

The server validates only known IDs, length and the optional headset ID. The UI should prevent obvious invalid submissions but must still render API validation details.

## Styling and responsive model

### Visual baseline

Start with a calm, neutral, content-first interface. The catalogue thumbnails already provide substantial colour, so application chrome should favour clear hierarchy, borders and spacing over decorative colour or shadow.

- Use the default neutral shadcn theme as the initial foundation, configured with Base UI and CSS variables.
- Begin with the light theme. Dark-mode tokens may remain structurally available, but a user-facing theme switch is not part of the initial scope.
- Use moderate rounding, minimal elevation and touch-friendly control sizes.
- Reserve non-neutral colour for primary actions, selection, keyboard focus, compatibility and system feedback. Neutral does not mean that success, warning, incompatibility and error states become indistinguishable.
- Treat this baseline as a hypothesis to review after the first representative slice renders a header, search/filter controls, a video card and the draft summary at mobile, tablet and desktop widths.

### Theme-token contract

Keep shadcn CSS custom properties as the single authored theme source under `:root`, with optional `.dark` overrides. Expose each token to Tailwind CSS v4 through the appropriate `@theme inline` namespace so application utilities and shadcn components resolve the same values.

For example:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

This mapping produces semantic utilities such as `bg-background`, `text-foreground`, `bg-warning` and `text-warning-foreground`. A custom property is not automatically available as a Tailwind utility: add an explicit `--color-*`, `--radius-*`, `--font-*` or other appropriate namespaced entry in `@theme inline`. Do not maintain a second hard-coded Tailwind palette or scatter raw colour utilities through components.

Use the initial shadcn token set for background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring and radius. Add project-specific compatibility/status pairs only when a real UI state requires them, and verify their contrast in context.

Official reference: [shadcn/ui theming](https://ui.shadcn.com/docs/theming).

### Icon contract

Use `@heroicons/react/24/outline` as the sole application icon family. Import icons individually and keep visible text or accessible names for actions; an icon must not be the only label unless the control has an equivalent accessible name and the symbol is conventional in context.

The shadcn generator commonly emits Lucide imports. Replace generated Lucide usage with the corresponding Heroicon before accepting a component, and do not retain both icon dependencies. Use current-colour styling and a consistent rendered size, normally 20–24 CSS pixels depending on control density.

Official reference: [Heroicons React usage](https://github.com/tailwindlabs/heroicons#react).

### Responsive model

Responsive progression:

- Mobile base: one-column catalogue; two-row header/navigation; filter and draft full-screen sheets; sticky bottom draft summary.
- Tablet: two-column catalogue; full-height side sheets; single-column saved-session list.
- Desktop: three-column catalogue; inline filter toolbar; sticky 320–400px draft panel; compact horizontal saved-session/video rows.

Use content-driven breakpoints and verify around 320, 390, 768, 834, 1024, 1280 and 1440 CSS pixels. Avoid hiding information solely because the viewport is smaller; move secondary information into the relevant details surface.

## Accessibility and failure handling

- Prefer native elements and progressive enhancement.
- Give sheets/dialogs an accessible name, initial focus, focus trap, Escape close and focus restoration.
- Do not make an entire complex card a single nested interactive target. Use a clear details link and a separate add/remove button.
- Announce result counts and async save outcomes appropriately.
- Keep errors near the failed surface and preserve user input.
- Provide retry actions for catalogue, reference-data, sessions and save failures.
- Use skeletons only where they preserve layout; otherwise use concise labelled loading states.
- Distinguish no catalogue results from an unavailable catalogue.
- Distinguish no saved sessions from a failed sessions request.

## Implemented foundation scripts

Task 1 implements these root commands:

```text
npm run dev          # Astro frontend and mock API together
npm run dev:web      # Astro only
npm run dev:api      # supplied mock API only
npm start            # built Astro server
npm run start:api    # supplied mock API only
npm run check        # Astro/TypeScript strict checks
npm run lint         # source linting
npm run format       # format supported project files
npm run format:check # verify formatting
npm run test         # Vitest unit/component runner
npm run build        # production build
npm run verify       # formatting, lint, strict checks, tests and build
```

`npm run test:browser` will be introduced when an interaction slice has browser flows to automate. Until then, browser checks are performed directly and recorded in the exercise log.

## Verification strategy

Unit/component coverage should prioritise:

- URL query parsing and serialisation;
- duration/date formatting;
- draft add/remove/reorder and persistence;
- derived count/duration;
- compatibility messaging;
- API error normalisation;
- session validation and failed-save preservation.

Browser coverage should prioritise:

- search/filter/pagination with loading, empty and failed responses;
- inspect a video, close details and retain catalogue state;
- create and reorder a draft across navigation/reload;
- save successfully and inspect the saved session;
- fail a save, retain the draft and retry;
- keyboard-only sheet/dialog and ordering flows;
- mobile, tablet and desktop overflow/focus behaviour.

## Delivery sequence

1. Bootstrap Astro, React 18, strict TypeScript and Tailwind; add a minimal placeholder and verification scripts.
2. Add the responsive application shell and neutral semantic theme.
3. Define Zod schemas, inferred contracts, API client/BFF and prove loading/error handling against the supplied server.
4. Implement catalogue search, filters, pagination and concise cards.
5. Implement video details and missing-thumbnail handling.
6. Implement the persisted ordered draft and responsive `Ma séance` surfaces.
7. Implement finalisation/save with validation and failure recovery.
8. Implement saved-session list and read-only details.
9. Complete browser accessibility/responsive verification and write the final candidate-facing README.

Keep each step independently reviewable and working. The exercise explicitly values stopping deliberately and explaining omissions over presenting an unverified exhaustive build.
