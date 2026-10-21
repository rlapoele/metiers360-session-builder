# Métiers360 session builder

This repository contains a frontend exercise for preparing playlists of immersive job-discovery videos. The supplied code currently consists of the mock API and its catalogue. The frontend architecture described below is the agreed implementation direction, not existing code.

## Read before changing the project

Use these sources in this order:

1. [README.md](README.md) — original exercise, audience, constraints and expected deliverable.
2. [API.md](API.md) and [server/server.mjs](server/server.mjs) — authoritative API behaviour.
3. [docs/architecture.md](docs/architecture.md) — intended frontend architecture and ownership boundaries.
4. The viewport references in [docs/wireframes](docs/wireframes) — agreed information hierarchy and responsive behaviour.
5. Existing source and tests, once the frontend has been bootstrapped.

When these sources conflict, do not silently choose one. Preserve the exercise requirements, report the conflict and ask before changing an accepted product or architecture decision.

## Product goal

Build a small, accessible application that lets a counsellor, teacher or educator:

1. find relevant 360-degree job-discovery videos;
2. add videos to a draft session;
3. put them in playback order;
4. name the session and optionally choose its VR headset;
5. save it through the supplied API;
6. review previously saved sessions.

Users may be rushed, may not be comfortable with digital tools and often work on a tablet in front of a group. Optimise for quick comprehension, forgiving interactions and visible system status rather than feature density.

## Scope and information architecture

There are two top-level destinations:

- `Catalogue` at `/` — the default page and main session-building workspace.
- `Mes séances` at `/sessions` — lists the current draft separately from saved sessions.

Supporting views:

- `/sessions/[id]` is a dedicated, read-only saved-session details page.
- Video details are contextual: a right-hand sheet on desktop/tablet and a full-screen sheet on mobile. Do not add a video-details route unless public linking or indexing becomes a real requirement.
- `Ma séance` is the current draft, not a third navigation destination. It is a persistent desktop panel on the catalogue and a sheet on smaller viewports.

Do not add a settings destination without a concrete setting. Do not add edit or delete actions for saved sessions: the supplied API does not support them.

## Visual and interaction direction

Use the familiar catalogue/cart mental model, but use domain language:

- video, not product;
- `Ajouter à ma séance`, not add to cart;
- `Ma séance`, not cart;
- `Enregistrer la séance`, not checkout or order.

Core rules:

- Start mobile-first and add layout capacity at tablet and desktop breakpoints.
- Keep search permanently visible.
- Keep catalogue cards concise: thumbnail/fallback, title, duration, primary job, contextual headset compatibility and add/remove state.
- Put full description, audiences, all jobs, all headsets and publication date in video details.
- Use a flat, filterable catalogue. Do not group the results into one section per job: videos can belong to several jobs and the API is paginated.
- Do not add client-only sorting of a single API page; it would imply that the whole catalogue was sorted.
- Preserve filters and pagination in the URL. Preserve the draft across navigation and reloads.
- Make ordering explicit with numbered items and keyboard/touch-accessible move-up/move-down controls. Drag and drop may enhance these controls but must not replace them.
- A selected session headset must produce an explicit compatibility status. Do not force users to infer compatibility from a list of badges.
- The video-details surface and draft-session surface have sticky close/primary controls where appropriate and return the user to the same catalogue position.

Viewport references:

- [Mobile wireframes](docs/wireframes/mobile.md)
- [Tablet wireframes](docs/wireframes/tablet.md)
- [Desktop wireframes](docs/wireframes/desktop.md)

The wireframes define hierarchy and behaviour, not pixel-perfect styling. Preserve their intent while improving spacing, typography and visual polish in implementation.

## Technical direction

- Astro, using its Vite-based toolchain and server output.
- React 18 for interactive islands.
- TypeScript in strict mode; do not use `any` to bypass API or component contracts.
- Tailwind CSS for styling.
- Nano Stores for the small amount of draft state shared between islands.
- TanStack Query inside interactive React surfaces for remote/server state.
- The supplied `server/server.mjs` remains a separate mock backend.
- Astro owns presentation and a thin BFF boundary for browser requests.
- Do not use Remix.
- shadcn/ui configured with Base UI may be used selectively for accessible primitives such as sheets, dialogs, selects, fields and alerts. Do not import a broad component system or accept generic default styling without need.

See [docs/architecture.md](docs/architecture.md) before adding dependencies or creating the frontend structure.

## State ownership

Keep state in the narrowest appropriate owner:

- URL: catalogue query, filters and pagination.
- TanStack Query: API data, loading, retry and error state inside a React surface.
- Nano Stores plus browser persistence: draft session name, optional headset, ordered video IDs and derived count/duration.
- Local component state: open/closed surfaces and temporary form presentation state.
- Mock API: saved sessions. They are memory-only and disappear when the API restarts.

React Context does not cross separate Astro islands. Do not use it as a substitute for the shared draft store.

## API constraints and gotchas

- The API deliberately has variable latency and occasional failures. Every remote surface needs loading, empty, recoverable-error and success states.
- A session name is required and limited to 120 characters.
- A saved session contains 1–30 video IDs in playback order.
- `headset_id` is optional.
- The API supports multiple saved sessions, but only in memory.
- Saved sessions have no update or delete endpoint.
- `thumbnail_url` may be `null`; render an intentional fallback.
- Thumbnail URLs point to dynamically generated 640 × 360 SVG responses, not files stored on disk.
- Treat `compatible_headsets` as `string[]`; an empty array is valid at the type/UI boundary even though the current fixture has no such videos.
- The catalogue response contains identifiers for jobs, audiences and headsets. Resolve human-readable labels through their reference endpoints and centralise those lookups.
- Do not modify the supplied API or catalogue unless a task explicitly calls for it.

## Accessibility baseline

Target WCAG/RGAA-friendly behaviour from the first component:

- semantic headings, landmarks, lists, buttons and links;
- complete keyboard operation and visible focus;
- correctly labelled form controls and validation messages;
- focus trapping/restoration and Escape handling for modal sheets;
- sufficient colour contrast without relying on colour alone;
- touch targets suitable for tablet/mobile use;
- meaningful loading announcements and recoverable errors;
- useful image alternatives, while avoiding redundant alt text when adjacent text already names the video;
- reduced-motion-safe transitions.

## Implementation discipline

- Implement in thin, reviewable slices: shell/contracts, catalogue discovery, draft composition, save flow, saved-session review, then polish.
- Read the relevant wireframe and API section before implementing a slice.
- Prefer straightforward feature modules over speculative generic abstractions.
- Keep Astro components for mostly static structure and React islands for real interaction. Do not turn every card into its own island.
- Keep user-facing copy in French. Code identifiers may be English but must be consistent.
- Preserve authored/API values; format dates, durations and labels only in presentation helpers.
- Do not claim a command exists until it is present in `package.json`.
- Once the frontend is bootstrapped, every change must pass the repository's format/lint, strict typecheck, unit tests and production build. Interaction work also requires browser verification at mobile, tablet and desktop widths.
- Never commit secrets, `.env` files, build output or dependencies.

## Definition of done for a UI slice

A slice is complete only when:

- its happy path and loading/empty/error states are implemented;
- keyboard and touch interactions work;
- focus behaviour is verified for overlays;
- the relevant API failure can be retried without losing the draft;
- strict typechecking, tests and build pass;
- the result has been checked in a real browser at the affected viewport sizes;
- documentation is updated when implementation intentionally changes an accepted decision.
