# Cross-tab draft follow-up — 2026-11-11

Baseline: clean `dev` at `b3fa83b`. The candidate authorised step 1 initially and step 2 on 2026-11-11. This record preserves the existing plan/checklist and their historical review markers.

## Three-step scope

1. **Implemented / committed:** Synchronise the draft across same-origin tabs, migrate existing persistence, serialize edits against the latest value, preserve focus and resolve newly received video IDs.
2. **Technically complete / candidate review pending:** BFF-owned, process-lifetime save-operation tracking and duplicate-request protection.
3. **Planned only:** Cross-tab saving restrictions, operation recovery and accessible banners using existing semantic colors (add warning primitives/semantics/Tailwind mapping only if needed).

The supplied mock API/catalogue and per-tab URL filters remain unchanged. Step 1 does not promise protected simultaneous API saves; steps 2–3 supply that behaviour. No commit, release or deployment is authorised.

## Step 1 acceptance

- CT1: Existing valid version-1 drafts retain name, headset and ordered IDs through migration to one validated version-2 storage envelope with draft identity/revision.
- CT2: Storage notifications and focus/visible/pageshow recovery read the latest persisted value; received changes never echo to storage. Invalid incoming data cannot overwrite a valid draft.
- CT3: A short Web Lock serializes read/apply/write actions. Simultaneous additions survive; field edits affect only that field and the last processed edit of the same field wins. Queued actions from a replaced draft cannot modify its successor.
- CT4: All islands, catalogue selection, draft views, duration and compatibility reflect received IDs. External additions do not steal focus; removal of a focused draft row leaves focus on a surviving control or empty state.
- CT5: Local clearing propagates. Existing loading/error/retry and save/review paths remain working. Browser storage failures preserve an in-memory draft; unsupported Web Locks provide best-effort synchronization only, with no simultaneous-write guarantee.

## Verification budget and strategy

Use the existing red–green–refactor strategy: focused store/component regressions first, `npm run verify`, then the repository Playwright suite with real same-context pages at desktop/tablet/mobile widths. Add deterministic delayed-lock/storage-event cases and actual concurrent browser additions. Reuse existing metadata failure/recovery and keyboard/overlay/axe gates; do not suppress deferred keyword-popup findings. Self-review the final diff and perform one targeted mutation check of the new concurrency protection.

Verification ceiling: 30 minutes aggregate wall time and at most two harness-repair cycles; this exceeds the normal ~2-minute browser run enough for meaningful concurrency/interaction checks. Stop optional qualification if it consumes the ceiling; report remaining uncertainty. No stress/performance benchmark or new conformance claim. Verification usage/results will be recorded here at handoff. Candidate attention duration has not been supplied.

## Implementation and review notes

Step 1 adds validated persistence envelopes with lazy legacy migration, native Web Locks around read/apply/write actions, optimistic local projection, storage/activation listeners and teardown. New IDs resolve through the existing Query cache in both draft surfaces and the sessions overview. External removal restores focus only when the removed control leaves focus on the document body. URL search state remains per tab.

Writes now complete asynchronously. The existing reload regression explicitly checks the persisted third addition before reloading: the first full browser run demonstrated that reloading immediately after the click could interrupt that pending write (desktop/tablet retained two additions). Closing/reloading before an outstanding write completes remains a documented limitation. Save success awaits draft clearing before navigation. Cross-tab API-save coordination remains outside this step.

The under-lock reread mutation check failed two concurrency regressions when removed, then the implementation was restored. No tests were skipped, no retries were added to Playwright and the deferred keyword-popup findings remain visible. The only browser harness adjustment is the explicit durability assertion before reload; a sandbox-only EPERM retry enabled the existing lifecycle tests to bind their local ports.

## Verification results — 2026-11-11

- `npm run verify`: formatting, ESLint, strict Astro/TypeScript checks (124 files, zero diagnostics), 270 tests in 36 files and production build passed. Fifteen store/component regressions were added to the previous 255 tests.
- Browser suite: all three new two-tab scenarios passed, including deliberately queued concurrent additions, alternating changes, metadata recovery, focus, independent search URLs, persistence, overflow and finalisation axe checks. Existing save/review and search scenarios passed at desktop/tablet/mobile widths. New screenshots were visually inspected at all three widths.
- The second full browser run passed 32/33 scenarios. Its desktop cold-start process failed to become healthy while a concurrently launched quality gate rebuilt `dist`; tablet/mobile cold starts passed. The isolated desktop cold-start rerun passed (1/1, 17.5 seconds): all 33 scenarios have now passed across these runs. Future verification must run build-writing gates sequentially.
- Targeted mutation: removing the reread inside the lock caused two concurrency tests to fail; restored before final verification. No API/catalogue, dependency, token or deployment changes.
- Two diagnostic cycles were used (asynchronous reload durability; overlapping build output). Verification remained within the 30-minute ceiling; no optional stress benchmark or native assistive-technology audit was added. Deferred keyword-popup axe findings are unchanged. Candidate attention duration was not supplied.

Step 1 is technically complete and ready for candidate review. Steps 2–3 remain planned only. Suggested commit: `feat: synchronize session drafts across browser tabs`.

## Step 2 contract — 2026-11-11

Baseline: clean `dev` at `32c8665`; candidate reports the preceding refactor committed/pushed. Step 2 is additive BFF infrastructure; the existing UI and legacy POST stay unchanged until separately authorised step 3. Candidate requests desktop-only browser verification.

- POST `/api/session-save-operations`: validated `{ operation_id: UUID, client_id: UUID, draft_id: nonempty bounded string, revision: nonnegative safe integer, session: CreateSession }`. Admit synchronously before starting one upstream call. Return 202 while pending, 200 for a retained terminal result, with `Location` and `Cache-Control: no-store`.
- GET `/api/session-save-operations/[id]`: 200 snapshot or 404 unknown; invalid IDs return 400. Every response identifies the current runtime. Snapshots retain operation/client/draft/revision and pending, succeeded (session) or failed (sanitised BFF error plus HTTP status) state.
- Same operation ID and canonical request joins/replays the original result, including failure. Reusing an ID with different content returns 409. A different operation for a pending or successfully saved draft within the same client returns 409 with the existing snapshot; a failed draft may start a fresh operation ID. No automatic upstream retries. Step 3 must persist one random client UUID shared by its tabs; the client namespace prevents unrelated browsers with `initial`/`legacy` draft IDs blocking each other.
- The process owns work independently of browser disconnection. Registry capacity is 1000 operations with no time eviction: reject new admissions with 503 at capacity, retaining all known results. Existing IDs remain readable/replayable. A restart or another instance has a different runtime ID and no record; unknown must never mean safe-to-retry automatically. This is deliberately single-process memory, not durable idempotency.
- Preserve supplied API/catalogue and upstream validation/error semantics. As agreed, uncertainty between BFF and mock API remains outside the exercise model. No cross-tab banners, browser save restrictions or UI protocol integration in this step.

Acceptance: deterministic pending/concurrent/replay/conflict/failure/new-attempt/capacity/restart tests; route validation/status/no-store/error tests; a real desktop HTTP round trip plus existing browser regressions. Use failing-first focused tests, full `npm run verify`, sequential desktop browser verification, one targeted admission-guard mutation and final diff review. Verification ceiling remains 30 minutes and two diagnostic cycles; no load benchmark.

## Step 2 verification and handoff — 2026-11-11

- Failing-first registry and route suites initially failed on absent modules, then passed all 10 new regressions. Delayed promises prove one upstream call for concurrent replay; tests cover pending/success/failure, conflicting reuse, duplicate draft admission, explicit retry after failure, independent client namespaces, capacity retention, sanitisation, browser abort independence, canonicalisation, route validation/no-store/Location and unknown runtime state.
- `npm run verify` passed formatting, ESLint, strict Astro/TypeScript checks (135 files, zero diagnostics), all 285 tests in 39 files and production build. The first gate caught a too-narrow inferred entry type; explicitly retaining the inferred schema union fixed it without suppressions. Final source was restored after mutation before this gate.
- Mutation: removing the duplicate-draft guard made its targeted regression fail (202 admitted instead of 409). Restored immediately; no persistent mutation or skipped tests.
- All 12 desktop Chromium browser scenarios passed in 51.9 seconds with zero Playwright retries. New browser calls start a real operation, read its state, replay from a second page, reject conflicting IDs/draft saves and confirm exactly one matching saved session. The unchanged mock can reject a save; the test alone permits a fresh operation ID after an explicit failed status, bounded to three attempts. Existing save/review, cross-tab, search, recovery, focus and axe checks passed; deferred keyword-popup findings remain unchanged. No additional viewport or formal conformance audit is claimed.
- Build-writing gates ran sequentially. Verification stayed within the 30-minute/two-diagnostic-cycle ceiling; no harness repair or benchmark was needed. Candidate attention duration was not supplied.

Step 2 is technically complete, uncommitted and ready for candidate review. Current UI and legacy save endpoint remain unchanged; step 3 is planned only. No supplied API/catalogue, dependency, styles, Git staging/commit/push or deployment changes. Suggested commit: `feat: track session save operations in the BFF`.
