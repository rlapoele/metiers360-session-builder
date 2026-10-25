# Railway deployment and release procedure

Task 11 was explicitly authorised and verified on 2026-10-25. The candidate created the Railway project and connected the repository; their existing service already followed `releases`. This document records the verified configuration, promotion procedure and audit limits.

The first promotion (`a5ca4ba`) preserved `195cf9d` on `main`; the build-environment correction (`4668d51`) preserved `a5ca4ba`. Public application checks passed on `4668d51`. The final documentation/test-readiness promotion preserves that working release on `main`. Inspect live Git refs and Railway deployment details rather than treating these historical hashes as permanent branch tips.

## Verified demonstration

Public URL: **[web-production-2e0a66.up.railway.app](https://web-production-2e0a66.up.railway.app)**, HTTPS, web target port 8080. The API remains private at `api.railway.internal:4000`, with no public domain or TCP proxy. Project ID: `28d988de-d7f6-4693-aad7-a2a220fc1afe`; production environment: `11b6283d-58cb-462e-9959-4ed42bd5e02a`.

Verification on 2026-10-25:

- Both services became online with successful health checks and Node 24.14.1. Web deployment `970fb5ee-06e9-4ac7-a75c-b94d42afe565` passed `npm run verify` in Railway: 77 checked files with zero diagnostics, 18 test files / 95 tests, and production build. Runtime logs show the Astro listener on port 8080 and API listener on 4000. Neither build uses the archived Dockerfile.
- HTTPS `/health` returned 200, `status: ok` and `Cache-Control: no-store`. The public BFF returned catalogue data and a same-origin SVG thumbnail with 200. No private hostname appeared in public HTML or the generated client assets; the client bundle may contain the environment-schema field name, not its server-only value.
- All four existing desktop/mobile Chromium scenarios passed against the live URL: complete selection/persistence/order/removal/save/list/details flows, read failure/retry, empty/not-found, input boundaries, focus, reduced motion, 320px text spacing and overflow. Twenty axe scans reported zero violations; two scans retained five incomplete contrast-node occurrences. Earlier manual contrast evidence remains in `accessibility-audit.md`; incomplete results are not automated passes or a formal conformance claim.
- The hosted suite exposed two test-environment assumptions. It now waits for Astro's actual catalogue hydration before client-side error injection (the trace showed a native form submission before handlers attached), and uses UUID-suffixed fictional session names to distinguish repeated runs against a persistent demo process. It does not choose an arbitrary duplicate link or suppress an assertion. Earlier runs and their failures are recorded in `exercise-log.md`.
- The default local suite passed all six desktop/tablet/mobile cases. The full verification gate also passed with `NODE_ENV=production`; npm's dependency audit reported zero vulnerabilities. A separate production health check passed while the upstream API was deliberately offline. Firefox was used for Railway configuration and a visual public-catalogue check; no new full Firefox keyboard or screen-reader audit is claimed.

Known interaction limit: catalogue controls depend on React hydration. Submitting the search before its handlers attach can perform a native navigation and lose the query; the browser suite's readiness assertion does not fix or test progressive enhancement before hydration. This observed early-interaction case is recorded for candidate review rather than silently broadening deployment work into a UI change.

## Services

Project: `peaceful-education`, production environment. Both services use `rlapoele/metiers360-session-builder`, branch `releases`, one replica in EU West. Pushes to `dev` do not deploy; pushes to `releases` trigger automatic deployments. No watch-path exclusions are configured.

| Setting | `web` | `api` |
|---|---|---|
| Repository root | `/` | `/server` |
| Builder | Railpack | Railpack |
| Build | `npm run verify`, through root `railpack.json` | Dependency installation; no build script |
| Start | `npm start` | `npm start` |
| Health check | `/health` | `/health` |
| Node | `RAILPACK_NODE_VERSION=24.14.1` | `RAILPACK_NODE_VERSION=24.14.1` |
| Listener | `HOST=0.0.0.0`, `PORT=8080` | `PORT=4000`; existing Node listener supports IPv4/IPv6 |
| Public networking | Web domain only, target port 8080 | No public domain or TCP proxy |

The web service has the server-only reference:

```text
CATALOG_API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}
```

Browser requests and thumbnails continue through Astro's same-origin `/api/*` BFF. The private API hostname must not appear in HTML, client bundles or browser requests. Neither service uses the archived original Dockerfile.

The web `/health` endpoint reports process liveness, uses `Cache-Control: no-store` and makes no upstream request. The API's existing `/health` similarly bypasses random mock failures. A passing liveness check is supplemented by the full public application smoke test.

## Configuration ownership and local use

The live Railway UI reports that legacy Config as Code is deprecated: new services cannot opt in after 2026-08-28. No legacy `railway.json` is used. Service roots, source branch, variables, networking and health checks are explicit Railway service settings recorded above. Root `railpack.json` is the supported native **builder** configuration, not the deprecated Railway deployment-config format; it runs the repository quality gate before packaging the web application.

Both roots include `.node-version` for local version managers. Railway's explicit Node override takes precedence over the permissive package `engines` range. The candidate's first web attempt selected 22.23.3, which Astro rejected because it requires at least 22.23.4; 24.14.1 is the locally verified deployment version.

Railpack supplies `NODE_ENV=production`. Vitest explicitly sets `NODE_ENV=test` inside its test workers so React's development-only `act` helpers remain available. This does not change the environment of the subsequent production build or deployed application. The first configured web build exposed the inherited-environment failure; the existing saved-session tests reproduced it locally before this correction, then the complete 95-test gate passed under `NODE_ENV=production`.

Local setup remains `npm ci`, `npm --prefix server ci`, `npm run dev`; no Railway account or environment file is required. The local API default remains port 4000 and Astro's server-only API URL defaults to localhost. `npm run verify` and the default `npm run test:browser` remain local checks.

## Release promotion

Only promote a clean, verified `dev` after explicit release authorisation. Fetch and inspect the three branch tips first. Preserve the previous `releases` on `main` before moving `releases`; use fast-forward merges and normal pushes, never resets or force-pushes:

```bash
git fetch origin --prune
git switch dev
git merge --ff-only origin/dev
npm run verify
npm run test:browser
git switch main
git merge --ff-only origin/main
git merge --ff-only origin/releases
git push origin main
git switch releases
git merge --ff-only origin/releases
git merge --ff-only dev
git push origin releases
git switch dev
```

Before the release push, verify `origin/main` equals the old release tip. Stop if a branch has diverged, an unrelated local commit exists or a fast-forward fails. The first release's previous tip is `195cf9d`, already present on both `main` and `origin/main`.

The release push is a deployment action: both services follow it. Apply the prepared Railway service settings against the promoted source, then confirm that each deployment uses the intended commit, root, Railpack builder, Node version and health check. A source push and a staged-settings deployment can briefly queue separate builds during initial setup; no public application URL is published before the final configured deployment passes verification.

## Verification and rollback

Inspect both build/runtime logs, health-check outcomes and the API's lack of public networking. Test the public catalogue, one proxied thumbnail, ordered/persisted draft, finalisation, save confirmation, saved list and details on desktop and mobile. The mock API deliberately emits occasional errors; verify its explicit retry paths.

The existing browser suite can target an already deployed application without starting local services:

```bash
PLAYWRIGHT_BASE_URL=https://YOUR-VERIFIED-WEB-DOMAIN npm run test:browser -- --project=desktop --project=mobile
```

Use a fresh browser context. The workflow creates clearly named test sessions in the demo API; browser-only response overrides do not alter the supplied backend. Add the real URL to the README only after successful public checks.

If the application cannot reach the API, thumbnails fail, health checks fail or the critical save/review flow breaks, keep the public link unpublished and inspect deployment logs/settings. After a working release exists, redeploy the previous successful deployments from each service's Railway deployment history; verify both health checks and the critical flow again. Do not restore the old scaffold Docker image as an application rollback: it contains no frontend. The Git `main` backup preserves the previous release source; it is not automatically deployed. A subsequent source correction is made on `dev`, verified and promoted normally.

Saved sessions are process-memory demo data: API restarts, replacement deployments and rollbacks erase sessions created since startup. There is no database, volume or migration to restore. All visitors to this unauthenticated demonstration share the API's session collection; use fictional session names, not personal data. No automatic ongoing monitoring or maintenance schedule is created by this task.

References: [Railpack configuration](https://railpack.com/config/file/), [Railpack Node versions](https://railpack.com/languages/node/), [Railway private networking](https://docs.railway.com/networking/private-networking).
