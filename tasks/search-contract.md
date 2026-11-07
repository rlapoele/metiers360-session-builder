# Task 12 — Agreed search contract

Date: 2026-11-06; revised by candidate agreement on **2026-11-07**. Status: **revised contract agreed; Tasks 19–21 implemented and verified; candidate review next, final Task 18/Checkpoint H pending**. Tasks 13–17B implement the earlier explicit-submit, all-AND search with global suggestions. This revision supersedes those interaction/matching requirements. Task 19 now implements OR and contextual server availability; Task 20 now renders contextual disabled options and recovery states; Task 21 now commits selections automatically and removes explicit submission. Completed task evidence remains historical.

## Confirmed direction

Public → Métiers ou mots-clés → Casque VR, with automatic search on committed selections and no Rechercher button. Keep shared full-width icon chips below the controls, then help explaining the mixed Boolean rule. Keep people’s names and selected appellations. Startup preparation, process-lifetime cache, bounded retries and manual recovery remain unchanged; the mock API remains untouched and sessions remain live API operations.

[The implementation plan](plan.md#automatic-search-follow-up-agreed-2026-11-07) records follow-up slices; Tasks 19–21 were separately authorised; final Task 18/Checkpoint H still require instruction. [Dictionary rules](../docs/search-dictionary-rules.md) remain the deterministic extraction authority; this revision changes matching, availability and interaction, not dictionary extraction.

## Selected criteria and meaning

| Criterion | Identity | Required condition on each returned video |
|---|---|---|
| Public | Existing audience ID, zero or one | Video's audiences includes that ID |
| Métier | Existing job code plus selected source appellation key for display, zero or more | Video's jobs includes at least one selected code; appellation does not narrow matching further |
| Title keyword | Normalized dictionary word/phrase, zero or more | Normalized title contains every selected complete word/contiguous phrase |
| Casque VR | Existing headset ID, zero or one | Video's compatible_headsets includes that ID |

No criteria returns the complete catalogue. The predicate is:

`audience AND (job A OR job B OR …) AND title 1 AND title 2 AND … AND headset`

An empty group imposes no condition. Legacy `q`, when present, is another AND condition with its existing literal substring semantics. Adding a métier can broaden the job group; adding a title can only narrow it. Never silently remove selections or relax other conditions.

An appellation is a way of finding its parent job, not a promise that every video covers that speciality. For example, selecting Garagiste means job I1604. Job matching does not require the appellation to appear in the video's title. A title selection never implies a job selection, even if the text looks like a job name.

Public is exact API membership. « Tous les publics » means no filter; the actual audience « Tout public » has ID `tout-public` and is a separate selectable value. Do not implicitly expand it to all audiences or add it to every audience filter.

## Dictionary extraction and matching rules

See [deterministic dictionary rules, version 1](../docs/search-dictionary-rules.md) for the canonical normalization, stop list, compact-gender handling, phrase extraction and reproducibility requirements. Keep names, source spellings and source-to-video/job mappings. The Task 14A builder now implements those rules with linked JSDoc/comments and focused regression checks. Task 14B wires it to startup preparation; Task 15 exposes validated cached HTTP search and suggestions. Task 17A composes the selector into the pending form; Task 17B now supplies live catalogue integration.

## Dictionary mappings and suggestions

- Title entries retain normalized value, original display value and matching video IDs. Job entries retain code, canonical label and normalized source words/phrases/full label/appellations. Keep the complete expanded job strings searchable even if longer than four words; phrase limits apply to extracted title suggestions.
- One job suggestion per code. Match input against its label and appellations. Show the matched appellation as primary text and the canonical job label as secondary text when different. The chip keeps exactly the appellation the user selected, including after automatic application, reload, back/forward and URL sharing. If the best match is the canonical label itself, that selectable source label is the fallback display value; do not invent an appellation or shorten authored wording. Source-key and duplicate handling are specified below.
- Title suggestions display their extracted word/phrase. Use existing category labels Métier and Titre de vidéo, with their agreed icons. The same visible word may appear in both categories; they remain independent criteria.
- Empty input: no menu. Start at two normalized alphanumeric characters. Wait 200ms after input settles; cancel/ignore superseded responses. Typing alone never changes results or the URL; selecting an available suggestion commits a criterion and triggers search.
- Ranking, best first: exact normalized match; phrase/word prefix; every typed fragment matching the start of a source token in order; contiguous substring. Within a tier, prefer canonical job label over appellation, then the shorter matching expression, then French alphabetical order, then stable identity. Job matching uses its best source expression. Title entries use their own expression. Do not use video count or personalized ranking.
- Five suggestions total. Apply the contextual availability rules below before allocating available suggestions. If both categories have available matches, reserve up to three places for jobs and two for title terms, then fill unused places from the other category by its ranking. Render jobs first and title terms second, ranked within groups. Fill all possible places with available matches first. Disabled matches may fill spare places only, using the same category allocation and ranking. Never hide an available match behind five disabled items. This avoids one category monopolizing the menu.
- Exclude selected job codes and selected normalized title entries before applying limits; retain unavailable matches as disabled options only where the five-item allocation leaves room; explain that they have no matching videos in this context. No automatic selection of the first item.

## Form, chips and results

Chip text stays on one line and never wraps. Constrain each chip to its container's available width and truncate only its text with an ellipsis when necessary; keep the category icon and remove button visible, non-shrinking and usable. The chip list may wrap whole chips onto subsequent rows. This supersedes earlier suggestions to wrap long text within a chip. Truncation is presentation-only: retain the complete selected appellation/keyword in state, URL restoration and accessible names, including the removal action. Make the full text available to keyboard and touch users through an accessible reveal; hover or a native title attribute alone is insufficient. Do not clip the entire chip or its focus treatment to conceal overflow.

Allow up to ten job/title chips combined, in addition to public/headset. Duplicate aliases for the same job and duplicate normalized title terms do not add another criterion. A job and a title chip with similar text are not duplicates. Retain redundant broader/narrower title terms rather than removing them unexpectedly.

Choosing a suggestion, changing a dropdown, removing a chip or clearing all immediately commits the new criteria, updates the URL and starts search. Remove Rechercher and the staged-edits cue. Removal restores focus to the corresponding control; clear-all restores defaults and clears selections and unfinished text. Ordinary dropdown/chip changes preserve unfinished keyword text, which never becomes a criterion automatically. Enter on an active available suggestion selects it; Enter on unfinished text does not submit a free-text search.

Keep focus in the edited control rather than moving it to results. Announce loading and successful result counts without announcing every keystroke. Keep controls usable during requests. Results/count and card headset display remain tied to the last successful response and are explicitly labelled previous while updating or after failure; retain selections and the session draft, with retry of the current criteria. No dimming that reduces contrast. There is no longer a separate editable pending selection set, although selected URL criteria can temporarily differ from the last successful results.

Each effective committed change creates one history entry and resets page to one; typing creates none. A source-label-only change for the same job code retains pagination. Back/forward restores URL criteria/results and clears unfinished input/disclosures; reload restores the URL. Pagination retains the criteria and uses the same service. Cancel/ignore superseded search and availability responses, including rapid changes and history navigation. Only a response for the current criteria may publish current results and availability together.

Empty results keep every selected chip removable and the form editable. No automatic relaxation. Invalid known URL criteria still produce an explicit validation error, never a broadened search; offer an explicit correction action that replaces invalid criteria with safe defaults and automatically searches those defaults. Do not remove invalid parameters merely by loading the page.

The shared help becomes: « Au moins un métier sélectionné doit correspondre. Tous les mots-clés de titre et les autres critères doivent correspondre. » This replaces the earlier blanket AND text; an empty métier group adds no condition.

## Contextual option availability

Compute availability server-side from the complete ready snapshot, before pagination. Keep dictionary entries and source mappings unchanged; availability is derived per request, not baked into the lifetime dictionary. For each candidate, count matching videos under these conditions (a positive count means enabled):

| Candidate | Conditions retained when evaluating it |
|---|---|
| Métier | Candidate job code AND current audience, headset, every title and legacy q; ignore the entire currently selected job group |
| Title keyword | Candidate title AND current jobs OR group, audience, headset, every selected title and legacy q |
| Public | Candidate audience replaces current audience; retain jobs OR group, all titles/q and headset |
| Casque VR | Candidate headset replaces current headset; retain audience, jobs OR group and all titles/q |

Ignoring the current job group permits useful OR alternatives. Test the candidate's own matching videos: an existing non-empty OR group must not make a job with zero contextual matches appear available. Public/headset options likewise must not be disabled merely because they differ from the current selection.

Render unavailable dropdown/suggestion options disabled with understandable no-match semantics and keyboard behaviour. Selected values remain visible and removable even when unavailable. Unfiltered defaults and clear-all always remain available; the real `tout-public` audience remains distinct from no filter. Counts are internal availability metadata; this agreement does not require displaying counts beside options.

Search/page context returns public/headset availability with its results; contextual suggestions receive the complete current criteria (including legacy q) and return availability for matching job/title candidates. Use shared predicate helpers for SSR and browser routes. Keep the ordinary search data/meta response compatible; extend the opt-in context and suggestion schemas/clients together. Query keys and cancellation include all matching criteria, with stable source metadata for chip restoration. Final field names are an implementation detail to validate through Zod, not a mock API change.

During loading or failure, do not treat missing data as zero availability. Retain the last successful availability as explicitly previous/updating information, allow manual recovery and never use stale disabled flags to block options for a different current context. Until fresh metadata arrives, options whose availability is unknown remain selectable; server validation and explicit zero-results handling remain authoritative. Initial preparation retains its existing loading/recovery state.

## URL and server contract

Implemented Task 15 application-owned routes: `GET /api/catalogue/search`, `GET /api/catalogue/suggestions`, `GET /api/catalogue/status`, `POST /api/catalogue/retry`. Existing `/api/videos` and upstream endpoints keep their contracts. The same search/status service is called directly by SSR; Task 17B now connects the current page loader. [HTTP response and validation details](../docs/catalogue-search-service.md) document the implemented boundary. Retry accepts no arbitrary upstream URL and cannot refresh an already-ready cache.

Search URLs use repeated `job` and `title` parameters, plus optional `audience`, `headset`, `page`; example (spaces shown decoded): `/?audience=adultes-reconversion&job=A1203&title=omar&title=jardinier&headset=pico-4`. Encode with URLSearchParams. Sort/deduplicate job codes and normalized title values for stable URLs/query keys; omit defaults. Chip order: public, jobs, titles, headset. Search returns the existing video-list data/meta shape; paginate at 24 items, ordered by video ID. A page beyond the last page is canonicalized to the last page after filtering; zero results uses page one.

New métier selections also serialize repeated `jobTerm` parameters pairing a job code with its selected normalized source key. Example (decoded): `job=I1604&jobTerm=I1604:appellation/garagiste`. A key uses `appellation/` or `label/` plus the normalized full source text. Split at the first colon to recover the code; decode and validate the remainder through the dictionary. Encode complete values with URLSearchParams. No array positions, random IDs or client-supplied display labels are needed.

Each dictionary job retains these source keys and their original display text. Require jobTerm to belong to a selected job and its current dictionary sources. Reject unknown/mismatched keys or conflicting keys for one code; collapse exact duplicates. Effective job identity remains the code, so another alias adds neither a chip nor another job-group member; preserve the first chosen alias until removed. URLs choosing different aliases have identical result sets but retain their respective chip wording. Source metadata is used for URL/UI restoration, not the result predicate. Legacy job links without jobTerm display the canonical label; their next committed change can serialize that validated label key. Source keys after the first colon use the same 120-code-point limit; the entire pair consumes the aggregate 8KiB budget.

Reject malformed known parameters, multiple public/headset/page values, unknown IDs/selected dictionary terms, more than ten job/title criteria, terms over 120 Unicode code points or recognized query data over 8KiB (UTF-8 bytes of its URLSearchParams serialization, including names, separators, percent encoding and duplicates) with a French 400 validation response. Whitespace-only criteria are omitted. Positive integer page only. Unrelated page URL parameters are ignored; do not silently discard invalid search criteria and broaden results. Title terms are validated against the dictionary after preparation, not treated as executable expressions or regular expressions.

Suggestion URLs accept input `term` (max 120 code points) and the complete current criteria: jobs, titles, optional audience/headset and legacy q. Validate the same limits and source identities. Context determines availability as specified above, while matching and ranking still use the complete dictionary. No infinite result lists.

**Multi-métier URL decision (2026-11-07):** every repeated-job URL means OR after implementation, including previously created links. No version parameter or preservation of old AND behaviour. For example, `/?job=A1203&job=I1604` will return videos with either code instead of requiring both. Single-job links keep their meaning; `jobTerm` still changes display only. This intentional result-set change is accepted by the candidate.

Legacy audience/headset and page links retain meaning; multi-job meaning changes as explicitly agreed above. A legacy `q` remains a separate case-insensitive contiguous substring title condition matching the old API behaviour; render it as a removable title-search chip with an accessible explanation. Keep q in the URL while it exists; AND with new criteria. Do not normalize its accents/hyphens or pretend it is a dictionary selection. Only legacy URLs create it; include it in the ten-criterion limit, validate length and preserve its chip on committed changes until removed/cleared. One q maximum. No redirects that change its meaning.

## Startup, retry and loading contract

- One preparation pipeline per Astro process begins at server startup without a visitor request. Gather all validated video pages and jobs/audiences/headsets, build mappings/dictionary, then publish ready atomically. Readiness requires everything. Cache for process lifetime; no sessions in this cache. API startup may lag behind Astro.
- Budget: four attempts total, with delays of 1s, 2s and 4s after a failed attempt. Each upstream request retains the existing seven-second timeout. Stop an attempt at its first failure, discard unpublished partial work and restart preparation on the next attempt. No per-request nested automatic retry layer. Four attempts are not a seven-second overall deadline: each attempt can involve several requests.
- Retry transport failures, timeouts, HTTP 408/429/5xx; for 429 respect a valid Retry-After delay capped at 30s. Fail without automatic retry on configuration errors, invalid schemas, duplicate IDs/inconsistent pagination and other 4xx. Give the user a generic useful failure message; log technical details on the server. Never label invalid data as an empty catalogue.
- While preparing, return a machine-readable preparing state (HTTP 503 and Retry-After 1) from search/suggestions. The page shows an announced loading state, not zero results; React checks status once per second while visible and stops when ready or failed. Once ready it requests the URL-selected results automatically. Preserve selected criteria/draft. Legacy query validation needing catalogue data waits until ready.
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
| A1203 and I1604 as two métier chips | Match either code; an existing URL with both codes adopts OR without a version flag. |
| Additional métier with zero contextual matches | Disabled even if the existing job group already returns videos. |
| Alternative audience/headset | Evaluate by replacing its own current filter, not adding a contradictory second value. |
| Rapid successive selections | Only the newest criteria response controls current results/availability; unfinished text never becomes a criterion. |
| Omar and Hugo as two title chips | Same title must contain both; do not return all Omar videos plus all Hugo videos. |
| Aïcha versus aicha | Same normalized title keyword identity; display preserves source spelling. |
| Electricien(ne), Conducteur(trice) | Correct full gender words; no generated ne/trice keyword. |
| car versus carrossier | Partial typing may suggest carrossier; selecting complete title keyword car cannot match carrossier. |
| Tous les publics versus Tout public | No audience condition versus exact tout-public membership. |
| Startup page 2 fails | No partial search results/dictionary; bounded retry, then ready or explicit failed state. |
| Existing q=Omar | Preserve old case-insensitive title substring semantics as a removable legacy criterion. |

## Original candidate agreement (2026-11-06; historical baseline)

1. Whole-word title matching and deterministic two-to-four-word phrases, exact stop list, no morphological/fuzzy expansion.
2. Selected appellation on métier chips, with a stable validated source identity in the URL. The canonical label is a fallback when the label itself was selected or a legacy job link has no appellation metadata.
3. Two-character threshold, 200ms debounce, five suggestions with a 3-job/2-title allocation and global rather than progressively filtered suggestions.
4. Maximum ten keyword/job criteria; explicit selection required before submission; pending removals/clear-all; legacy q compatibility.
5. Four startup attempts with 1/2/4s delays, loading/status polling and manual retry; keep video details on the existing API path. No deployment-readiness change.

The candidate agreed to these defaults and the selected-appellation choice. Task 12 is complete. Document and test deterministic extraction as specified in [dictionary rules](../docs/search-dictionary-rules.md). That agreement alone did not authorise implementation; the candidate subsequently explicitly authorised Tasks 13–17B's preparation, dictionary, startup, HTTP search, selector, form and live integration, now verified. Task 18 onward still requires a separate instruction.

Task 17B implementation choice: `include=context` on the existing search route opts into validated selected-source labels and cached references for page restoration. Other callers retain the existing data/meta response. SSR uses the same page projection directly. Only matching criteria change resets pagination; a source-label-only change for the same job code preserves the page. Invalid URL correction is explicitly staged before Rechercher, rather than silently dropping criteria. [Live integration evidence](../docs/catalogue-search-integration.md) records these details.

## Superseding candidate agreement (2026-11-07)

Automatic search, contextual availability and OR between all selected métiers (including existing multi-métier URLs) replace the original explicit-submit, global-suggestions and all-AND requirements. Title conditions, legacy q and distinct audience/headset groups retain AND. No compatibility flag, migration or mock API change is needed. Names, deterministic extraction, selected appellations, chip ellipsis/disclosure and startup/recovery rules remain agreed. That agreement authorised documentation only. The candidate subsequently authorised Task 19; its server matching, availability metadata and eligible-first allocation are now implemented. The candidate then separately authorised Task 20, which connects accessible contextual option states and pending-context recovery. The candidate separately authorised Task 21, which implements automatic search, URL/history and the revised form/help. Final Task 18/Checkpoint H require separate instructions. Implementation guides distinguish Task 19 server behaviour from the earlier form interaction baseline.
