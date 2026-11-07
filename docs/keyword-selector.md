# Grouped keyword selector

Task 16 supplies a reusable controlled selector and browser client for the [agreed search contract](../tasks/search-contract.md). Task 17A subsequently composed it into the shared-chip form, and Task 17B now mounts that form with applied URL state, page loading and result integration. See [live integration](catalogue-search-integration.md).

Task 21 integration (2026-11-07): the controlled selector's available selection now commits the parent form's criteria immediately, while typing still only requests suggestions. It keeps the same input node across criteria/results updates, preserving unfinished text on dropdown changes and focus on selection. Back/forward resets text/disclosures through the form's presentation reset key; clear-all clears them explicitly. Disabled options, max five grouping, selected appellations and preparation/error/retry semantics remain unchanged. Earlier references below to pending parent submission describe the original integration history.

## Component contract

`src/components/catalogue/KeywordSelector.tsx` uses the installed Base UI 1.9 combobox for group semantics, active-option keyboard navigation, popup positioning, dismissal and focus. The server already ranks and limits the five suggestions; `filter={null}` prevents a second browser filter from changing appellation matches or ordering. Auto-highlight is disabled. No dependency was added.

Render inside the existing `QueryClientProvider`. Props:

- `value` / `onValueChange`: controlled unselected input text. Parent clear-all, history restoration and submission checks can control it directly.
- `selected`: pending validated job/title suggestion objects. Category plus identity distinguishes a métier from a similarly worded title. `legacyQuery` optionally carries the separate old title condition and consumes one of ten slots.
- `onSelect`: emits the complete chosen object, including authored appellation, source key and parent job code. Selection clears text, closes the menu and leaves input focus; it does not apply a search or create a free-text criterion.
- Optional `audience`, `headset`: current pending IDs, included in contextual suggestion availability.
- Optional `inputRef`, `disabled`, `error`: parent focus control, availability and a French validation explanation, including future unselected-text submission errors.

The parent owns pending chips, duplicate prevention across the whole form, applied criteria and submission. The selector defensively excludes already-selected identities and blocks additions once ten unique job/title/legacy criteria exist. It retains input text at the limit. Explicit public/headset choices do not consume those ten slots. No session draft state is read or modified.

## Contextual disabled suggestions — Task 20 (2026-11-07)

The selector consumes the required count/available metadata validated by the existing client. Grouped items retain the server's eligible-first allocation, authored labels and five-item limit. Unavailable matches remain visible where the server leaves spare slots, with « Aucune vidéo avec ces critères » and native Base UI Item `disabled`/aria-disabled semantics. The live help counts only actionable suggestions; an all-unavailable menu explains that criteria can be removed to broaden possibilities. No video counts are displayed beside options.

The installed [Base UI 1.9 Item contract](https://github.com/mui/base-ui/blob/v1.9.0/docs/src/app/(docs)/react/components/combobox/types.md) exposes disabled interaction. Its keyboard model keeps disabled items reachable so assistive technology can discover their explanation: highlighting is allowed, but Enter/pointer selection is blocked. Continue with the arrows to an available item. An explicit onValueChange guard also rejects unavailable items. No first item is selected automatically, and no free-text criterion is created.

Queries include every selected criterion, including legacy q, and cancel/ignore obsolete contexts. While updating or after failure, stale suggestions/flags are not offered as current choices; the announced loading/error state and retry action remain distinct from an empty successful menu. Recovery errors reset on context changes, and delayed manual recovery responses update their original context key. The form's separate dropdown availability retains previous metadata as explicitly provisional hints. Existing keyboard/touch focus, selected-source wording and retry-focus behaviour remain intact. Automatic application is Task 21.

Task 20 focused tests verify disabled pointer/Enter activation, all-unavailable explanations and continued access to enabled choices. The complete gate passes 252 tests/34 files with zero strict diagnostics and build; all 24 responsive browser scenarios pass, including real touch activation at desktop/tablet/mobile widths. Existing scoped/full-page audit boundaries below are preserved.

## Interaction and presentation

The field label and category headers use Heroicons outline Briefcase/MagnifyingGlass icons. Following candidate feedback on 2026-11-07, category header text and icons use the same foreground colour as field labels; secondary job wording remains muted. Options show the selected source text and a secondary canonical métier label only when different. Long option labels wrap, including unbroken words; the future chips have their separate no-wrap/ellipsis rule. The popup uses measured Base UI anchor/viewport bounds through two named CSS classes and scrolls vertically when needed. Option targets are at least 48px high.

After two normalized alphanumeric Unicode code points, wait 200ms after the last edit before requesting suggestions. No menu is shown for empty/short input. Over 120 input code points is explained locally rather than sent to the endpoint. Results retain server grouping and ranking, with no initially highlighted option. Arrow keys navigate; Enter selects an active option without submitting. Enter on nonempty unmatched text does not select or submit. Escape closes without clearing text; Tab leaves the selector. Input focus and explicit labels/descriptions remain available; an explicit aria-labelledby reference preserves the name while the portal focus manager hides sibling content. Selection and loading/empty/error states have French status text. Retrying returns focus to the input before the retry button disappears, allowing immediate keyboard selection after recovery.

## Remote state and recovery

`keyword-suggestions.ts` serializes stable sorted/deduplicated identities and selected source keys with URLSearchParams, retaining the first source for a job. It validates unknown JSON against Task 15's browser-safe schemas and propagates cancellation to fetch. It never sends display labels or an upstream URL. Preparation and ordinary suggestion failures are distinguishable typed errors; unexpected response content is not reflected into UI copy.

`use-keyword-suggestions.ts` keeps remote state in TanStack Query; input/debounce/open presentation stays local. Query keys include current text, pending selections and optional public/headset/legacy criteria. Editing, closing or unmounting makes prior work inactive; consumed AbortSignals cancel requests. Obsolete responses cannot replace the current query's options even if a transport ignores cancellation. No previous-query options are selectable during the debounce or a new request.

Preparation 503 does not become an empty list: status is checked while the selector is active, then once per second while preparing. Query's default foreground interval policy suspends interval polling in hidden tabs. Ready status resumes suggestions automatically; failed status stops polling. The explicit retry button retries suggestions or starts one shared server recovery cycle as appropriate. A failed status check also has a manual retry. No nested automatic query retry loop is added. Page-level initialization polling and preserving applied results remain Task 17B responsibilities.

## Verification and limits

Fourteen new client/component tests cover encoding/boundaries, debounce/Unicode threshold, grouping and selected appellations, arrows/Enter, Escape/Tab, empty/error/retry states, obsolete responses with an ignored AbortSignal, preparation-to-ready, terminal failure/manual recovery, status-request failure, defensive selected-identity exclusion and the ten-criterion limit. Full repository verification passes 206 tests in 28 files, strict checks on 107 files with zero diagnostics, formatting/lint and production build.

An isolated temporary browser fixture imports the actual selector and full application styles without adding a repository route. Chromium checks at 320, 390, 834 and 1440px verify grouped options, long/unbroken labels, no horizontal overflow, keyboard selection/focus/dismissal, touch selection, empty/error/retry states and no runtime exceptions. Mocked fixture HTTP responses make these states deterministic; they do not claim new end-to-end integration with the current catalogue page.

Component-scoped axe scans covering the selector and listbox have zero violations at those four widths. The initial whole-fixture scan exposed a label-name issue when opening the portal; the explicit ID association corrected it. A subsequent whole-page open-popup scan retains three findings: aria-hidden-focus on the fixture's separate Rechercher button, page-has-heading-one because sibling content is temporarily hidden, and region for the body-portalled popup. Installed Base UI's focus manager hides outside content while the typeable combobox is open. These results are retained, not presented as a clean full-page audit or suppressed in repository tests. Tab behaviour is checked directly; full-page reader/focus/landmark behaviour must be revisited in Task 17's real form context. No native screen-reader or formal WCAG/RGAA conformance claim is made.

Reference: [Base UI combobox documentation](https://base-ui.com/react/components/combobox), checked against installed 1.9 API/types/source before use. No mock API/catalogue, dependency, existing form or URL/result-flow change is included in Task 16.

All six existing catalogue/session desktop/tablet/mobile browser regressions pass against the unchanged mock API (58.2s). They cover the delivered application rather than mounting this standalone selector. The final selector-specific fixture also verifies focus after retry at all four widths. The fixture used the installed Playwright runtime after the CLI availability check stalled; no test tooling or browser fixture was added to the application.

Task 17B additionally fixed and regression-tested manual recovery after a status query had already reached failed: the recovery response replaces the cached status so polling resumes. Actual live-page keyboard/touch/closed-popup checks and retained open-popup findings are recorded in the integration guide.
