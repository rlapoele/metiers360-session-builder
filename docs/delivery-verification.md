# Delivery verification — Task 10

Date: 2026-10-25. Application baseline: `cecaac0` plus the Task 10 changes under review. Task 11 has not started.

## Reproduce the checks

Prerequisites: Node >=22.23.4, npm, and the browser installed by Playwright. Commands from the repository root:

```bash
npm ci
npm --prefix server ci
npx playwright install chromium
npm run verify
npm run test:browser
```

- `verify`: Prettier, ESLint, strict Astro/TypeScript, Vitest and production server build.
- `test:browser`: pinned Playwright Test 1.64.1 and axe-core integration 4.14.0. Tests live in `e2e/delivery.spec.ts`; configuration is in `playwright.config.ts`.
- Vitest owns unit/component tests; Playwright owns `e2e/`. Generated browser reports are excluded from lint/typechecking, with application and test source still checked.
- The browser command starts an unchanged mock API on **4100** with seed **42**, builds the Astro service and starts it on **4323** with a server-only API URL. It refuses occupied test ports rather than reusing unrelated processes, and stops its own services afterward.
- One worker, zero test retries. Real read failures use bounded, explicit UI retries. Save failures must retain the entered name before another explicit save-button activation. The application never automatically replays POST requests.
- `playwright-report/index.html` contains full axe results, including incomplete checks. Failure traces/screenshots are retained. Open the report with `npx playwright show-report`. Generated reports are ignored by Git.

To intentionally refresh the three README screenshots:

```bash
CAPTURE_README=1 npm run test:browser
```

This is an opt-in capture mode; ordinary test runs do not overwrite documentation images.

## Recorded results

Environment: macOS, Node **24.14.1**, npm **11.17.0**, Playwright Chromium **156.0.8078.4**.

| Check | Result |
|---|---|
| Working-copy `npm run verify` | Pass: 76 checked files, zero errors/warnings/hints, 18 test files / 95 tests, production build |
| Working-copy browser suite | Six scenarios passed, across 1440×900, 834×1112 and 390×844 |
| Clean install | Fresh source snapshot, no copied dependencies/build output/environment files; root and API `npm ci` passed |
| Clean-install full verification | Same strict/unit/build gate passed |
| Clean-install browser suite | All six scenarios passed again |
| Development smoke test from clean install | `npm run dev`, API `/health` and application `/` responded on the documented ports |
| Dependency installation audit | Zero known vulnerabilities reported by npm; no dependency upgrade or supplied backend change |
| Original exercise brief | Preserved verbatim; SHA-256 matches the previous root README |
| Source/diff review | Application changes limited to details-retry focus and clear-filter action wrapping; no supplied API/catalogue/wireframe change |

The isolated rehearsal is under `/private/tmp/metiers360-task10-clean.XtlQ6S/`. It used a fresh `node_modules`, not a claim of an empty global npm/browser download cache. npm reported an optional `fsevents` install-script approval notice; the documented commands passed without approving it.

A development reconnect logged a disabled-property hydration warning. A fresh isolated catalogue navigation, add and persisted-draft reload did not reproduce it and recorded no browser warnings, errors or runtime exceptions. No application change was made for that non-reproduced reconnect diagnostic; it is retained here rather than claiming every development reconnect is warning-free.

## Browser coverage

Each viewport runs two scenarios:

1. Search catalogue, verify all compatible-headset labels, open/close video details, check initial focus and keyboard entry into its scroll region, add three videos, reload the persisted draft, reorder/remove, verify contextual removal focus, validate the required name, select a headset, save with explicit retry if necessary, then inspect the saved list and exact saved playback order.
2. Inject one browser-side catalogue failure, inspect the recoverable error, remove the override and retry into an empty result; verify reduced-motion styles and increased text spacing. The mobile project checks the latter at **320×740**. Finally inspect a real not-found saved-session route, recovering a transient upstream service failure if encountered.

The suite inspects accessible names, native field labels, validation focus and `aria-invalid`, status text, preserved draft values and absence of horizontal page overflow. The happy-path flows record zero JavaScript runtime exceptions. Deliberate/seeded failed HTTP requests are expected and are not a clean-console claim.

Representative screenshots were captured only after the flows passed and reviewed at their actual viewport sizes: desktop catalogue/draft, tablet video details and mobile finalisation. They are committed documentation assets, not pixel-diff golden tests.

## Accessibility evidence and limits

Each suite run records **30 axe scans**, using `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` and `best-practice`, with **zero automated violations**. Three scans retain `color-contrast` incomplete results, totaling seven node occurrences, in both the working-copy and clean-install runs. No rule was disabled and no application node excluded.

The remaining nodes are modal counter/helper/ROME/publication text and the compatible-headset message. Contextual color review uses the established pairs: muted RGB 86/86/86 on white (**7.34:1**) and success RGB 0/130/54 on RGB 245/245/245 (**4.54:1**). Screenshots confirm their presentation; incomplete results remain visible in the report rather than being reclassified as automated passes.

Separate browser assertions measure every visible catalogue/form input boundary against both adjacent surfaces: **3.234:1 outside / 3.098:1 inside**. This catches the non-text boundary gap that axe alone did not flag. Earlier target-size measurements found the compact draft actions 36px high, above the AA 24px minimum; disabled controls are not treated as contrast failures.

Task 10 fixed two findings exposed by this final review:

- A focused video-details retry action disappeared when its request completed. Retry now moves focus to the persistent content region before starting the request. A previously passing component test was extended, failed before the fix, and passes afterward.
- Final regression review temporarily removed that focus handoff: the focused component test failed again. The implementation was restored byte-for-byte to the clean-rehearsal source and all 19 focused catalogue tests passed afterward.
- At 320px with increased text spacing, the long clear-search/filter action overflowed. Both presentations of that action now allow wrapping, and the browser regression passes.

This is **not a formal WCAG/RGAA conformance audit**. No dedicated screen-reader, voice-control, exhaustive zoom/high-contrast or criterion-by-criterion assessment was performed. Native Firefox evidence remains the earlier explicitly authorised session; this final suite uses Chromium. Candidate-reported manual browser checks remain separately attributed in [exercise-log.md](exercise-log.md).

## Review stop

Task 10 implementation and technical verification are complete. The candidate subsequently confirmed review, commit and push in `3c36990`, followed by their README edits in `05026e5`, closing Checkpoint E. Task 11 deployment remains unauthorised. The separately requested import-alias maintenance does not reopen or expand the delivery/deployment scope.

References: [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [multiple test web servers](https://playwright.dev/docs/test-webserver), [detailed accessibility history](accessibility-audit.md).
