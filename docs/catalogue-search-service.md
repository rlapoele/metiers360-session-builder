# Cached catalogue search service

Task 15 adds the application-owned HTTP boundary for the [agreed search contract](../tasks/search-contract.md). Task 17B now connects the visible catalogue and SSR loader to this service; [live integration](catalogue-search-integration.md) records the opt-in page context and URL/query ownership. The supplied API and its `/videos` contract are unchanged.

## Ownership and SSR use

`search-service.server.ts` operates on the complete startup-owned snapshot and deterministic dictionary. `search-query.server.ts` validates queries and resolves trusted chip wording. `search-contracts.ts` exports browser-safe Zod response schemas and inferred types; it imports no server runtime. The four Astro routes delegate to the same service.

SSR loaders call `getCatalogueSearchService()` from `search-http.server.ts`, then `search(url.searchParams)` or `status()` directly, without loopback HTTP. Getting the service does not start preparation or create another cache. The factory `createCatalogueSearchService(runtime)` also supports isolated tests. Each request reads the current runtime state; a ready snapshot is never refreshed by search, suggestions or recovery.

A successful service search returns `{ status: 200, body, criteria }`. Only `body` is serialized over HTTP. `criteria` supplies canonical page, sorted/deduplicated job codes and normalized title keys, legacy q and validated `{ code, sourceKey, label }` métier selections for SSR restoration. A legacy job without jobTerm resolves to its dictionary label source. Explicit source keys preserve the selected appellation. No client-supplied display label is trusted.

## HTTP responses

Every response uses JSON and `Cache-Control: no-store`, including errors. This browser/proxy policy does not expire the process-lifetime server cache.

| Route | Success | Other expected responses |
|---|---|---|
| `GET /api/catalogue/search` | 200 `{ data: Video[], meta: { page, per_page: 24, total, total_pages } }`, with existing same-origin thumbnail paths | 400 invalid query; 503 preparing/failed/unavailable |
| `GET /api/catalogue/suggestions` | 200 `{ data: Suggestion[] }`, maximum five | Same validation/preparation failures |
| `GET /api/catalogue/status` | 200 readiness body, including failed state | Unexpected internal error remains a generic 500 |
| `POST /api/catalogue/retry` | 202 preparing; 200 if already ready or recovery unavailable | 400 for query parameters or nonempty body |

Search accepts repeated `job`, `title`, `jobTerm`, and single `audience`, `headset`, `page`, legacy `q`. Suggestions additionally accept a single `term`, with the same selected-criteria validation. Unrelated query parameters are ignored. Pagination is fixed at 24; `per_page` is not a search parameter.

Examples (URLSearchParams should encode values in application code):

```text
/api/catalogue/search?audience=adultes-reconversion&job=A1203&title=omar&title=jardinier&headset=pico-4
/api/catalogue/search?job=I1604&jobTerm=I1604%3Aappellation%2Fgaragiste
/api/catalogue/suggestions?term=jard&job=A1203
```

Every job and every title condition must match the same video, alongside audience/headset and optional legacy q. Title predicates use the dictionary's complete-word/phrase video mappings. q preserves trimmed, case-insensitive contiguous substring matching, including its original accents/punctuation. Nothing is evaluated as a regular expression. Filtering precedes ID ordering and pagination across the full snapshot. An excessive page is canonicalized in response meta and service criteria; zero results uses page one and total_pages one. The service does not redirect or relax criteria.

Suggestions use the whole dictionary, not the filtered result set. Selected job/title identities are excluded before the existing ranking and three-job/two-title allocation. Under two normalized characters returns an empty suggestion list. Public/headset selections are validated without narrowing suggestions.

## Validation

Known query data is limited to **8,192 UTF-8 bytes of its URLSearchParams serialization**, including parameter names, separators, percent encoding and duplicates, before normalization. Unrelated parameters do not consume that budget. Terms and job source keys are limited to 120 Unicode code points. For jobTerm, the source key after the first colon is the bounded term; the complete pair still consumes the aggregate budget.

Whitespace-only criteria are omitted. Repeated single-value parameters are rejected even when their values are identical. Jobs and normalized title identities are deduplicated/sorted; at most ten jobs/title terms/legacy q combined are allowed. Page must be a positive safe integer written with decimal digits. Source keys must belong to selected jobs, be present in the dictionary and not conflict for one job. Invalid/unknown criteria never disappear silently to broaden results.

Syntax/size limits are checked immediately. Snapshot/dictionary membership is checked only once ready, so early requests with unknown terms receive preparation status until validation becomes possible. French validation responses retain the existing `{ error: 'validation_error', message, details: [{ field, message }] }` shape. They do not reflect submitted values or internal errors.

## Preparation and recovery

Ready status is `{ status: 'ready' }`. Preparing status includes `status: 'preparing'`, `attempt`, a French message and `canRetry: false`. Failed status includes `status: 'failed'`, a French message and `canRetry`; true permits manual recovery, false represents an idle/stopped owner requiring server startup/restart.

Search/suggestion 503 bodies add `error: 'catalogue_preparing' | 'catalogue_failed' | 'catalogue_unavailable'` to that non-ready status. Preparing responses include `Retry-After: 1`; terminal failures do not, so clients can stop automatic polling. The status route remains HTTP 200 so callers can inspect readiness, with Retry-After only while preparing. `/health` remains independent liveness.

Recovery accepts no parameters or nonempty body, never takes an upstream URL, never starts an idle/stopped owner and never rebuilds ready data. It returns immediately after initiating or joining one preparation cycle; it does not wait through upstream requests/backoff. Concurrent calls share the existing controller. An empty Node request stream is accepted; nonempty input is rejected without buffering the whole body. Existing lifecycle logs identify a recovery cycle with `trigger: manual-retry` and a fresh run ID; ordinary searches do not add log noise.

Visible polling, loading/error announcements and a retry button remain future UI integration. Consumers should poll status once per second only while preparing and visible, stop on failed, and load submitted results when ready. See [startup logs and troubleshooting](catalogue-startup.md).

## Verification

Focused service/route tests cover mixed and multi-title/multi-job AND, word/phrase boundaries, names and accent normalization, legacy substring conditions, selected appellations, input bounds, unknown/malformed selections, global suggestion allocation/exclusions, zero results, pagination and nonblocking recovery. Real development/production process tests hold preparation, check actual HTTP readiness/503 headers, query prepared data without new upstream calls, and recover from bounded failure through concurrent HTTP POSTs. They also retain startup, build-without-API and shutdown checks. No UI behavior change is claimed by these endpoint checks.

Verified Task 15 gate: `npm run verify` passes 192 tests in 26 files, strict checks on 102 files with zero diagnostics, formatting/lint and production build. All six existing desktop/tablet/mobile browser regression scenarios pass against the unchanged mock API (57.3s). Documentation links and diff hygiene pass. No dependency, supplied API/catalogue, deployment, commit or push change.

Task 17B adds `service.page(params)` and opt-in `GET /api/catalogue/search?include=context` for trusted selected labels and cached references alongside data/meta. Non-opt-in responses and the supplied API retain their contracts. The catalogue index calls page directly; browser queries validate the page projection. This is presentation metadata, not another predicate or a new upstream capability.
