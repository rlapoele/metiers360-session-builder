# Catalogue preparation at server startup

Task 14B, 2026-11-06. Catalogue and dictionary preparation now starts automatically in development and in the built Node server. Search endpoints/UI are still later tasks: current catalogue pages continue using their existing API requests.

## Startup ownership

- `astro.config.ts` uses `catalogue-node.integration.ts`, a wrapper around the installed official `@astrojs/node` standalone integration. It preserves the adapter's configuration/features and replaces only its production server entrypoint.
- In development, `astro:server:setup` imports the runtime through Vite's runnable **SSR** environment before the server listens. It starts preparation without awaiting API readiness. Vitest's own Vite server is excluded, matching Astro's test-server behaviour; real development startup is verified in separate child processes.
- In production, `catalogue-entrypoint.server.ts` re-exports the official Node adapter entrypoint and calls startup explicitly as `production`. The official adapter still owns HTTP serving and honours its autostart control. Existing `npm start`/`npm run start:web` commands still run `dist/server/entry.mjs`.
- Development passes `development` explicitly. Entry-point attribution is not inferred from Vite's build-time DEV flag. A process-owned registry under `Symbol.for('metiers360.catalogue.runtime')` retains one runtime across SSR module invalidation/reimports. Future request handlers obtain the same owner with `getCatalogueRuntime()`; that getter does not lazily initiate preparation and throws if startup has not created an owner.
- Module import/configuration/build does not fetch the catalogue. Only the server-start calls initiate work. `npm run build` succeeds with no API running. Restarting the server creates a fresh snapshot; there is no timed expiry. Restart development after changing dictionary rules or catalogue data rather than expecting HMR to refresh the lifetime snapshot.
- The preparation controller publishes ready only after validated catalogue/reference loading and the real dictionary builder complete. It keeps the agreed four-attempt retry policy. SIGINT/SIGTERM and development server closure stop work and remove owned signal listeners; existing CLI/default signal handling is retained. Shutdown is idempotent.

References: [Astro integration lifecycle](https://docs.astro.build/en/reference/integrations-reference/#astroserversetup), [adapter entrypoints](https://docs.astro.build/en/reference/adapter-reference/#serverentrypoint), [Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/). Exact behaviour was checked against installed Astro 7.4.2 and Node adapter 11.1.9, not assumed from older examples.

## Reading the logs

The logs answer three questions: did startup initiate preparation, why did it retry/fail, and when was the complete snapshot/dictionary ready? They are bounded lifecycle events, not per-video or per-query logs. No telemetry dependency, tracing backend or deployment-setting change was added.

Each normal application lifecycle line is JSON with `event`, `level`, `runId`, `entryPoint`, `trigger` and `pid`. One `runId` spans all automatic attempts; manual recovery starts a new one. `trigger` distinguishes `startup` from `manual-retry`. Durations are milliseconds from the monotonic process clock and include backoff in the final total.

| Event | Level | Useful fields / meaning |
|---|---|---|
| `catalogue.preparing` | info | `attempt`, `maxAttempts`: initialization started before visitors |
| `catalogue.loaded` | info | `videos`, `jobs`, `audiences`, `headsets`, `durationMs`: complete snapshot collected |
| `catalogue.dictionary_built` | info, or warn if diagnostics exist | `ruleVersion`, `titleKeywords`, `jobVocabulary`, `diagnostics`, `durationMs` |
| `catalogue.ready` | info | `attempt`, total `durationMs`: both phases succeeded |
| `catalogue.retry` | warn | failed `attempt`, `stage`, `kind`, optional HTTP `status`, upcoming `delayMs` |
| `catalogue.failed` | error | terminal `attempt`, `stage`, `kind`, optional HTTP `status`, total `durationMs` |
| `catalogue.stopped` | info | last `stage`, total `durationMs`: work/cache owner stopped |

A healthy start produces four lines (preparing, loaded, dictionary_built, ready). Warm accesses do not log or reload. Current fixture counts are 204 videos, 55 jobs, 631 title keywords/phrases and 1,603 job vocabulary entries; these are observations for the current data/rule version, not hardcoded readiness requirements.

Logs deliberately omit API URLs, configuration values, raw exception messages/bodies, full Zod diagnostics, names and keyword/appellation text. Error classification, phase and HTTP status remain available. Actual dictionary content stays deterministic; run IDs and timings belong only to lifecycle telemetry.

## Troubleshooting

- No `catalogue.preparing`: check that the process uses the normal development command or built standalone entrypoint. A build, a unit-test Vite server, or an explicitly disabled Node adapter autostart is not application startup.
- `retry` with transport/timeout/408/429/5xx: check API availability/private networking and the configured `CATALOG_API_URL`. Follow the same `runId`; the log gives the next delay. Startup order is allowed to differ between the two services.
- `failed` with configuration/invalid-response/other 4xx: correct configuration or inspect the supplied API contract/data. These errors do not automatically loop. Temporary failures stop after four attempts too. Manual recovery starts a fresh bounded cycle through the runtime's `retry()` method; the public recovery endpoint/button remains Task 15+.
- `dictionary_built` has nonzero diagnostics: review `getCatalogueRuntime().getState()` internally and the dictionary's diagnostics against [the extraction rules](search-dictionary-rules.md). Unknown compact notation is reported for review, not converted into guessed vocabulary. The log contains the count without dumping source text.
- `/health` is still **liveness**, not a readiness guarantee. It responds while preparation is pending or failed. The future search status/loading integration must distinguish those states; this task does not change the visible catalogue workflow or gate deployment traffic.

## Verification

Runtime unit tests verify phase logs, counts/timings, correlation, manual-retry attribution, redaction, silent warm reuse and process-owner reuse across module reloads. Real-process lifecycle tests build with the API unavailable, then launch actual development and production entrypoints against a controlled read-only local backend using the supplied catalogue fixture. They prove preparation begins before visitors, liveness during a held upstream response, complete readiness, bounded exhaustion/manual recovery, invalid-configuration redaction and SIGTERM cancellation. A test-only Node preload inspects the existing owner over child-process IPC; no production debug/status endpoint is introduced.

The lifecycle tests bind loopback ports and therefore require an environment permitting local test servers. This is distinct from tests that only stub network calls.

Task 14B verification gate: `npm run verify` passed 158 tests and strict checks on 92 files with zero diagnostics, formatting/lint and production build. All six existing desktop/tablet/mobile browser scenarios also passed against the unchanged mock API. The controlled lifecycle backend is a test stand-in, not a modification to that API. No new search UI or production recovery/status route is claimed.
