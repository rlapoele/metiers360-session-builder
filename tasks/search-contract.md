# Task 12 — Agreed search contract

Date: 2026-11-06. Status: **candidate-agreed contract; startup foundation and Task 15 search endpoints implemented; Task 17B live catalogue integration implemented**. The candidate accepted the defaults and chose the selected appellation for métier chips. Task 12 is complete as a documentation/agreement task; Tasks 13–17B were separately authorised and verified. Task 17B is ready for candidate review; Task 18 onward is not authorised.

## Confirmed direction

Use the approved Public → Métiers ou mots-clés → Casque VR → Rechercher layout, full-width icon chips and shared AND help. Keep people’s names. Astro prepares the complete catalogue/dictionary at server startup, retains it for the process lifetime and searches it without changing the supplied API. Sessions stay live API operations. See [the implementation plan](plan.md#proposed-follow-up--revamped-catalogue-search-2026-11-06).

The rules and defaults below are agreed requirements. Tasks 13–15 now implement the server preparation/dictionary/search boundary; Task 16 adds the controlled selector; Task 17A composes the complete pending form/chips. Task 17B now connects the live page, URL/history and results. Editorial extraction rules are maintained in [dictionary rules](../docs/search-dictionary-rules.md); this contract owns interaction, selection and URL behaviour.

## Selected criteria and meaning

| Criterion | Identity | Required condition on each returned video |
|---|---|---|
| Public | Existing audience ID, zero or one | Video's audiences includes that ID |
| Métier | Existing job code plus selected source appellation key for display, zero or more | Video's jobs includes every selected code; appellation does not narrow matching further |
| Title keyword | Normalized dictionary word/phrase, zero or more | Normalized title contains every selected complete word/contiguous phrase |
| Casque VR | Existing headset ID, zero or one | Video's compatible_headsets includes that ID |

No criteria returns the complete catalogue. All conditions combine with AND; two jobs require the same video to carry both codes. The current catalogue has 37 multi-job videos, so this is meaningful but can yield few results. Do not silently change to OR or remove criteria producing no matches.

An appellation is a way of finding its parent job, not a promise that every video covers that speciality. For example, selecting Garagiste means job I1604. Job matching does not require the appellation to appear in the video's title. A title selection never implies a job selection, even if the text looks like a job name.

Public is exact API membership. « Tous les publics » means no filter; the actual audience « Tout public » has ID `tout-public` and is a separate selectable value. Do not implicitly expand it to all audiences or add it to every audience filter.

## Dictionary extraction and matching rules

See [deterministic dictionary rules, version 1](../docs/search-dictionary-rules.md) for the canonical normalization, stop list, compact-gender handling, phrase extraction and reproducibility requirements. Keep names, source spellings and source-to-video/job mappings. The Task 14A builder now implements those rules with linked JSDoc/comments and focused regression checks. Task 14B wires it to startup preparation; Task 15 exposes validated cached HTTP search and suggestions. Task 17A composes the selector into the pending form; Task 17B now supplies live catalogue integration.

## Dictionary mappings and suggestions

- Title entries retain normalized value, original display value and matching video IDs. Job entries retain code, canonical label and normalized source words/phrases/full label/appellations. Keep the complete expanded job strings searchable even if longer than four words; phrase limits apply to extracted title suggestions.
- One job suggestion per code. Match input against its label and appellations. Show the matched appellation as primary text and the canonical job label as secondary text when different. The chip keeps exactly the appellation the user selected, including after submission, reload, back/forward and URL sharing. If the best match is the canonical label itself, that selectable source label is the fallback display value; do not invent an appellation or shorten authored wording. Source-key and duplicate handling are specified below.
- Title suggestions display their extracted word/phrase. Use existing category labels Métier and Titre de vidéo, with their agreed icons. The same visible word may appear in both categories; they remain independent criteria.
- Empty input: no menu. Start at two normalized alphanumeric characters. Wait 200ms after input settles; cancel/ignore superseded responses. No result count or searches are triggered merely by typing/selecting.
- Ranking, best first: exact normalized match; phrase/word prefix; every typed fragment matching the start of a source token in order; contiguous substring. Within a tier, prefer canonical job label over appellation, then the shorter matching expression, then French alphabetical order, then stable identity. Job matching uses its best source expression. Title entries use their own expression. Do not use video count or personalized ranking.
- Five suggestions total. If both categories match, reserve up to three places for jobs and two for title terms, then fill unused places from the other category by its ranking. Render jobs first and title terms second, ranked within groups. This avoids one category monopolizing the menu.
- Exclude selected job codes and selected normalized title entries before applying limits; do not suppress other suggestions simply because their addition would produce no AND results. No automatic selection of the first item.

## Form, chips and results

Chip text stays on one line and never wraps. Constrain each chip to its container's available width and truncate only its text with an ellipsis when necessary; keep the category icon and remove button visible, non-shrinking and usable. The chip list may wrap whole chips onto subsequent rows. This supersedes earlier suggestions to wrap long text within a chip. Truncation is presentation-only: retain the complete selected appellation/keyword in state, URL restoration and accessible names, including the removal action. Make the full text available to keyboard and touch users through an accessible reveal; hover or a native title attribute alone is insufficient. Do not clip the entire chip or its focus treatment to conceal overflow.

Allow up to ten job/title chips combined, in addition to public/headset. Duplicate aliases for the same job and duplicate normalized title terms do not add another criterion. A job and a title chip with similar text are not duplicates. Retain redundant broader/narrower title terms rather than removing them unexpectedly.

All edits, chip removals and clear-all are pending until Rechercher; removal returns focus to its dropdown or keyword input. Clear-all restores default dropdowns and clears keywords and input. Show « Critères modifiés — lancez la recherche pour les appliquer. » only when pending selections differ from applied selections. Results/count and card headset display still reflect the last applied search; mark previous results as previous while a new request is pending or fails.

Enter with an active suggestion selects it without submitting. Rechercher with non-empty unselected input focuses the input and explains « Choisissez une suggestion ou effacez le texte avant de rechercher. » No automatic free-text chip. Empty input plus zero chips is a valid full-catalogue search.

Submission updates the URL and resets page to one only when criteria change. Back/forward restores the applied form/results and discards unsubmitted edits; reload restores submitted criteria. Empty results explain that no video matches all selected criteria and keep the form editable. No automatic relaxation. Search errors retain selected criteria and the session draft.

## URL and server contract

Implemented Task 15 application-owned routes: `GET /api/catalogue/search`, `GET /api/catalogue/suggestions`, `GET /api/catalogue/status`, `POST /api/catalogue/retry`. Existing `/api/videos` and upstream endpoints keep their contracts. The same search/status service is called directly by SSR; Task 17B now connects the current page loader. [HTTP response and validation details](../docs/catalogue-search-service.md) document the implemented boundary. Retry accepts no arbitrary upstream URL and cannot refresh an already-ready cache.

Search URLs use repeated `job` and `title` parameters, plus optional `audience`, `headset`, `page`; example (spaces shown decoded): `/?audience=adultes-reconversion&job=A1203&title=omar&title=jardinier&headset=pico-4`. Encode with URLSearchParams. Sort/deduplicate job codes and normalized title values for stable URLs/query keys; omit defaults. Chip order: public, jobs, titles, headset. Search returns the existing video-list data/meta shape; paginate at 24 items, ordered by video ID. A page beyond the last page is canonicalized to the last page after filtering; zero results uses page one.

New métier selections also serialize repeated `jobTerm` parameters pairing a job code with its selected normalized source key. Example (decoded): `job=I1604&jobTerm=I1604:appellation/garagiste`. A key uses `appellation/` or `label/` plus the normalized full source text. Split at the first colon to recover the code; decode and validate the remainder through the dictionary. Encode complete values with URLSearchParams. No array positions, random IDs or client-supplied display labels are needed.

Each dictionary job retains these source keys and their original display text. Require jobTerm to belong to a selected job and its current dictionary sources. Reject unknown/mismatched keys or conflicting keys for one code; collapse exact duplicates. Effective job identity remains the code, so another alias adds neither a chip nor another AND condition; preserve the first chosen alias until removed. URLs choosing different aliases have identical result sets but retain their respective chip wording. Source metadata is used for URL/UI restoration, not the result predicate. Legacy job links without jobTerm display the canonical label; their next submission can serialize that validated label key. Source keys after the first colon use the same 120-code-point limit; the entire pair consumes the aggregate 8KiB budget.

Reject malformed known parameters, multiple public/headset/page values, unknown IDs/selected dictionary terms, more than ten job/title criteria, terms over 120 Unicode code points or recognized query data over 8KiB (UTF-8 bytes of its URLSearchParams serialization, including names, separators, percent encoding and duplicates) with a French 400 validation response. Whitespace-only criteria are omitted. Positive integer page only. Unrelated page URL parameters are ignored; do not silently discard invalid search criteria and broaden results. Title terms are validated against the dictionary after preparation, not treated as executable expressions or regular expressions.

Suggestion URLs accept input `term` (max 120 code points), selected jobs/titles and optional current public/headset for validation; suggestions are drawn from the whole catalogue, not progressively filtered by those other choices. Validate the same selection limits. This avoids contextual suggestions disappearing after each selection. No infinite result lists.

Legacy `job`, audience/headset and page links retain meaning. A legacy `q` remains a separate case-insensitive contiguous substring title condition matching the old API behaviour; render it as a removable title-search chip with an accessible explanation. Keep q in the URL while it exists; AND with new criteria. Do not normalize its accents/hyphens or pretend it is a dictionary selection. Only legacy URLs create it; include it in the ten-criterion limit, validate length and preserve its chip on submission until removed/cleared. One q maximum. No redirects that change its meaning.

## Startup, retry and loading contract

- One preparation pipeline per Astro process begins at server startup without a visitor request. Gather all validated video pages and jobs/audiences/headsets, build mappings/dictionary, then publish ready atomically. Readiness requires everything. Cache for process lifetime; no sessions in this cache. API startup may lag behind Astro.
- Budget: four attempts total, with delays of 1s, 2s and 4s after a failed attempt. Each upstream request retains the existing seven-second timeout. Stop an attempt at its first failure, discard unpublished partial work and restart preparation on the next attempt. No per-request nested automatic retry layer. Four attempts are not a seven-second overall deadline: each attempt can involve several requests.
- Retry transport failures, timeouts, HTTP 408/429/5xx; for 429 respect a valid Retry-After delay capped at 30s. Fail without automatic retry on configuration errors, invalid schemas, duplicate IDs/inconsistent pagination and other 4xx. Give the user a generic useful failure message; log technical details on the server. Never label invalid data as an empty catalogue.
- While preparing, return a machine-readable preparing state (HTTP 503 and Retry-After 1) from search/suggestions. The page shows an announced loading state, not zero results; React checks status once per second while visible and stops when ready or failed. Once ready it requests the submitted results automatically. Preserve pending selections/draft. Legacy query validation needing catalogue data waits until ready.
- A failed state stops automatic polling and displays « Le catalogue ne peut pas être préparé. Réessayer ». Manual retry starts one new bounded cycle only when failed; simultaneous retries join it. Configuration/data failures may need server correction; manual retry is allowed but must not trigger a loop. A ready cache is never rebuilt via this public recovery action. Shutdown cancels retry timers and initialization requests.
- Keep current liveness semantics. Do not gate Railway traffic or modify deployment settings in this increment without separate agreement. Readiness status belongs to the application search service.
- The installed integration types and [official integration documentation](https://docs.astro.build/en/reference/integrations-reference/) distinguish development server hooks; the [Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/) starts production standalone output through its server entrypoint. Do not claim astro:server:start alone covers production. Task 14B must select and prove supported dev and production bootstrap paths sharing the exact same cache instance as requests, without API calls during build. Task 14B subsequently implemented and verified the development SSR-runner hook and wrapped Node server entrypoint; see [startup ownership and logs](../docs/catalogue-startup.md).

## Agreed acceptance examples

| Example | Expected behaviour |
|---|---|
| Title Une journée avec Omar, jardinier municipal (vid_001) | Keywords Omar, jardinier, municipal; phrase jardinier municipal. No phrase crosses the comma. Une/journée/avec do not become standalone suggestions. |
| Job A1203 label/appellations | jardinier, jardinière, espaces verts and jardinier municipal can find the job; selection resolves to A1203. |
| Input jard | May suggest jobs A1203/A1208 and title jardinier; selected jardinier checks the complete title word. |
| Garagiste (Métier) and automobile (title) | Job I1604 AND complete title token automobile. No requirement for garagiste in the title. |
| Omar and jardinier (title), A1203, adultes-reconversion, pico-4 | vid_001 matches all conditions. Other records must independently pass every condition. |
| Omar and Hugo as two title chips | Same title must contain both; do not return all Omar videos plus all Hugo videos. |
| Aïcha versus aicha | Same normalized title keyword identity; display preserves source spelling. |
| Electricien(ne), Conducteur(trice) | Correct full gender words; no generated ne/trice keyword. |
| car versus carrossier | Partial typing may suggest carrossier; selecting complete title keyword car cannot match carrossier. |
| Tous les publics versus Tout public | No audience condition versus exact tout-public membership. |
| Startup page 2 fails | No partial search results/dictionary; bounded retry, then ready or explicit failed state. |
| Existing q=Omar | Preserve old case-insensitive title substring semantics as a removable legacy criterion. |

## Candidate agreement (2026-11-06)

1. Whole-word title matching and deterministic two-to-four-word phrases, exact stop list, no morphological/fuzzy expansion.
2. Selected appellation on métier chips, with a stable validated source identity in the URL. The canonical label is a fallback when the label itself was selected or a legacy job link has no appellation metadata.
3. Two-character threshold, 200ms debounce, five suggestions with a 3-job/2-title allocation and global rather than progressively filtered suggestions.
4. Maximum ten keyword/job criteria; explicit selection required before submission; pending removals/clear-all; legacy q compatibility.
5. Four startup attempts with 1/2/4s delays, loading/status polling and manual retry; keep video details on the existing API path. No deployment-readiness change.

The candidate agreed to these defaults and the selected-appellation choice. Task 12 is complete. Document and test deterministic extraction as specified in [dictionary rules](../docs/search-dictionary-rules.md). That agreement alone did not authorise implementation; the candidate subsequently explicitly authorised Tasks 13–17B's preparation, dictionary, startup, HTTP search, selector, form and live integration, now verified. Task 18 onward still requires a separate instruction.

Task 17B implementation choice: `include=context` on the existing search route opts into validated selected-source labels and cached references for page restoration. Other callers retain the existing data/meta response. SSR uses the same page projection directly. Only matching criteria change resets pagination; a source-label-only change for the same job code preserves the page. Invalid URL correction is explicitly staged before Rechercher, rather than silently dropping criteria. [Live integration evidence](../docs/catalogue-search-integration.md) records these details.
