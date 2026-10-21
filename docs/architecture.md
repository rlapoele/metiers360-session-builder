# Intended frontend architecture

Status: proposed implementation baseline, agreed before frontend bootstrap.

The repository currently contains the supplied Node mock API only. This document records the intended architecture so implementation can begin consistently. Update it when an implemented decision supersedes this proposal; do not let it silently drift away from the code.

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
| Styling | Tailwind CSS | Fast responsive implementation with a small local token layer |
| Shared client state | Nano Stores | Small framework-agnostic store shared between Astro islands |
| Remote state | TanStack Query | Loading, error, retry and caching inside cohesive React surfaces |
| UI primitives | Selective shadcn/ui with Base UI | Accessible sheets, dialogs, selects and fields when they save work |
| Tests | Vitest + Testing Library; Playwright for critical flows | Logic/component confidence plus real responsive interaction checks |
| Backend | Supplied `server/server.mjs` | Exercise-owned mock API with realistic latency and failures |

Do not add every target dependency before it is needed. Bootstrap the minimum, then add a dependency with the slice that uses it.

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
- do not invent business rules that contradict `API.md`;
- do not duplicate the mock API's catalogue or session storage.

The upstream base URL belongs in server-only configuration, for example `CATALOG_API_URL=http://localhost:4000`. Never expose a secret or server-only variable through a public Astro environment prefix.

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
├── docs/
│   ├── architecture.md
│   └── wireframes/
│       ├── desktop.md
│       ├── mobile.md
│       └── tablet.md
├── server/
│   ├── data/catalog.json
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
│   │   │   ├── contracts.ts
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

## API contracts

Centralise API types and parsing. Do not scatter `as Video` casts through components.

Core contracts:

```ts
interface Video {
  id: string;
  title: string;
  description: string;
  duration_seconds: number;
  jobs: string[];
  audiences: string[];
  compatible_headsets: string[];
  thumbnail_url: string | null;
  published_at: string;
}

interface Session {
  id: string;
  name: string;
  video_ids: string[];
  headset_id: string | null;
  created_at: string;
  total_duration_seconds: number;
}

interface SessionDraft {
  name: string;
  headsetId: string | null;
  videoIds: string[];
}
```

The list response also needs typed pagination metadata. Jobs, audiences and headsets need their own reference types. Arrays remain arrays even when empty; do not model `compatible_headsets` as a non-empty tuple.

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

Define a small semantic token layer for surfaces, text, borders, focus and statuses rather than scattering arbitrary colours. Tailwind utilities may consume CSS custom properties.

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

## Expected scripts after bootstrap

The current `package.json` only provides `npm start` for the API. Do not document these as available until they have been implemented:

```text
npm run dev          # Astro frontend and mock API together
npm run dev:web      # Astro only
npm run dev:api      # supplied mock API only
npm run check        # Astro/TypeScript strict checks
npm run lint         # source linting
npm run test         # unit/component tests
npm run test:browser # critical browser flows
npm run build        # production build
```

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

1. Bootstrap Astro, React 18, strict TypeScript and Tailwind; add the page shell and verification scripts.
2. Define API contracts/client/BFF and prove loading/error handling against the supplied server.
3. Implement catalogue search, filters, pagination and concise cards.
4. Implement video details and missing-thumbnail handling.
5. Implement the persisted ordered draft and responsive `Ma séance` surfaces.
6. Implement finalisation/save with validation and failure recovery.
7. Implement saved-session list and read-only details.
8. Complete browser accessibility/responsive verification and write the final candidate-facing README.

Keep each step independently reviewable and working. The exercise explicitly values stopping deliberately and explaining omissions over presenting an unverified exhaustive build.
