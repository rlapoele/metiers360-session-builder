# Task 12 — Search contract proposal

Date: 2026-11-06. Status: **draft awaiting candidate agreement**. This is a proposed contract, not an implementation or a claim about current behaviour. Task 12 remains unchecked; Tasks 13 onward are not authorised.

## Confirmed direction

Use the approved Public → Métiers ou mots-clés → Casque VR → Rechercher layout, full-width icon chips and shared AND help. Keep people’s names. Astro prepares the complete catalogue/dictionary at server startup, retains it for the process lifetime and searches it without changing the supplied API. Sessions stay live API operations. See [the implementation plan](plan.md#proposed-follow-up--revamped-catalogue-search-2026-11-06).

All precise rules and numbers below are recommendations for review unless explicitly identified above as confirmed.

## Selected criteria and meaning

| Criterion | Identity | Required condition on each returned video |
|---|---|---|
| Public | Existing audience ID, zero or one | Video's audiences includes that ID |
| Métier | Existing job code, zero or more | Video's jobs includes every selected code |
| Title keyword | Normalized dictionary word/phrase, zero or more | Normalized title contains every selected complete word/contiguous phrase |
| Casque VR | Existing headset ID, zero or one | Video's compatible_headsets includes that ID |

No criteria returns the complete catalogue. All conditions combine with AND; two jobs require the same video to carry both codes. The current catalogue has 37 multi-job videos, so this is meaningful but can yield few results. Do not silently change to OR or remove criteria producing no matches.

An appellation is a way of finding its parent job, not a promise that every video covers that speciality. For example, selecting Garagiste means job I1604. Job matching does not require the appellation to appear in the video's title. A title selection never implies a job selection, even if the text looks like a job name.

Public is exact API membership. « Tous les publics » means no filter; the actual audience « Tout public » has ID `tout-public` and is a separate selectable value. Do not implicitly expand it to all audiences or add it to every audience filter.

## Normalization and matching

Preserve originals for display. For matching only: Unicode-normalize, lowercase, remove combining accents, convert œ to oe and æ to ae, turn typographic apostrophes into straight apostrophes, then treat apostrophes and hyphens as word separators. Collapse whitespace. Letters/digits form tokens; retain short acronyms and numeric tokens (ASV, AVQ, SI, VL, 3D). Do not apply a minimum token length globally.

Commas, colons, slashes, parentheses and sentence-ending punctuation define phrase boundaries. Words are still indexed on either side; a phrase cannot cross a boundary. Hyphenated compounds also offer the equivalent space-separated phrase. Thus aide-boulangère matches aide boulangère. No stemming, singular/plural equivalence, automatic masculine/feminine equivalence, typo tolerance or invented synonyms. Job aliases already provide many alternatives. A title word boulangère does not automatically match boulanger.

Autocomplete may match partial input; selected title criteria use complete normalized tokens, never arbitrary substrings. Selecting car does not match carrossier. A selected phrase preserves order and adjacency, including internal connecting words: espaces verts is not equivalent to verts espaces. Separate title chips require both words anywhere in the same title.

## Extraction rules

1. Read only video titles and job labels/appellations. Descriptions, domain labels and saved-session names do not contribute keywords in this increment.
2. For job strings, expand the reviewed compressed forms before tokenization. Keep both supplied slash-separated forms and their shared contextual wording as alternative job vocabulary. Never treat suffix fragments such as trice or ère as keywords generated from notation.
3. Extract every non-stop word, plus contiguous phrases of two to four tokens within a phrase boundary. A phrase must start and end with a non-stop word and contain at least two non-stop words; internal stop words are allowed. Do not generate phrases containing journee or devenir. These are deterministic candidate phrases, not claims of semantic understanding; do not add an AI phrase selector or manually grow a large taxonomy.
4. Deduplicate by category plus normalized value. Keep all source occurrences for mappings; choose the original display spelling from the lowest video ID for title terms. Keep any chosen display spelling stable across requests.
5. Retain names and place names using exactly these rules; no name detection or exclusion. Omar, Hugo, Aïcha and Lille can be title keywords. Aïcha and aicha share a matching key. Names with punctuation follow ordinary word/phrase rules.

Proposed exact stop list (normalized tokens): `a, au, aux, avec, ce, ces, cette, d, dans, de, des, du, elle, elles, en, et, il, ils, je, l, la, le, les, leur, leurs, ne, nos, notre, on, ou, par, pas, pour, qu, que, qui, sa, se, ses, son, sur, un, une, vos, votre, journee, devenir`.

Stop words suppress dictionary candidates only. They are not deleted from normalized titles used to check a phrase. Do not remove occupational terms such as aide, agent, chef, employé or technicien merely because they are common. Useful title themes such as sécurité, outils, nuit and équipe remain. Do not add extra exclusions without reviewing the resulting vocabulary.

Compressed notation uses a small source-reviewed expansion table, not speculative suffix rules. Current replacement patterns: `boulanger(ère)`, `pâtissier(ère)`, `traiteur(se)`, `conducteur(trice)`, `electricien(ne)`, `itinérant(e)`, `technicien(ne)`, `médical(e)`, `assistant(e)`, `gardien(ne)`, `principal(e)`, `opérateur(trice)`, `programmeur(se)`, `administrateur(trice)`, `chef(fe)`, `maquilleur(se)`, `posticheur(se)`. Expansion produces the valid masculine/feminine words, not every combination of a compound. Unknown compact suffix notation must be reported in dictionary-build diagnostics for review rather than silently indexed as a suffix. Parenthetical context/acronyms such as (espaces verts), (ASV), (AVQ), (IDE) and (SI) remain searchable vocabulary, not suffixes. No expansion of ind to industrie, VL to véhicule léger or 2 D to 2D without an additional agreed rule.

## Dictionary mappings and suggestions

- Title entries retain normalized value, original display value and matching video IDs. Job entries retain code, canonical label and normalized source words/phrases/full label/appellations. Keep the complete expanded job strings searchable even if longer than four words; phrase limits apply to extracted title suggestions.
- One job suggestion per code. Match input against its label and appellations, then show the canonical job label and the matched appellation as secondary text when different. **Proposed chip text: canonical job label**, ensuring identical meaning/display after reload and no alias URL metadata. This differs from the short matched-appellation example in the visual proposal; candidate must choose between this and retaining the selected appellation with an additional stable selection identifier.
- Title suggestions display their extracted word/phrase. Use existing category labels Métier and Titre de vidéo, with their agreed icons. The same visible word may appear in both categories; they remain independent criteria.
- Empty input: no menu. Start at two normalized alphanumeric characters. Wait 200ms after input settles; cancel/ignore superseded responses. No result count or searches are triggered merely by typing/selecting.
- Ranking, best first: exact normalized match; phrase/word prefix; every typed fragment matching the start of a source token in order; contiguous substring. Within a tier, prefer canonical job label over appellation, then the shorter matching expression, then French alphabetical order, then stable identity. Job matching uses its best source expression. Title entries use their own expression. Do not use video count or personalized ranking.
- Five suggestions total. If both categories match, reserve up to three places for jobs and two for title terms, then fill unused places from the other category by its ranking. Render jobs first and title terms second, ranked within groups. This avoids one category monopolizing the menu; the 3/2 allocation is proposed, not previously agreed.
- Exclude selected job codes and selected normalized title entries before applying limits; do not suppress other suggestions simply because their addition would produce no AND results. No automatic selection of the first item.

## Form, chips and results

Allow up to ten job/title chips combined, in addition to public/headset. Duplicate aliases for the same job and duplicate normalized title terms do not add another criterion. A job and a title chip with similar text are not duplicates. Retain redundant broader/narrower title terms rather than removing them unexpectedly.

All edits, chip removals and clear-all are pending until Rechercher; removal returns focus to its dropdown or keyword input. Clear-all restores default dropdowns and clears keywords and input. Show « Critères modifiés — lancez la recherche pour les appliquer. » only when pending selections differ from applied selections. Results/count and card headset display still reflect the last applied search; mark previous results as previous while a new request is pending or fails.

Enter with an active suggestion selects it without submitting. Rechercher with non-empty unselected input focuses the input and explains « Choisissez une suggestion ou effacez le texte avant de rechercher. » No automatic free-text chip. Empty input plus zero chips is a valid full-catalogue search.

Submission updates the URL and resets page to one only when criteria change. Back/forward restores the applied form/results and discards unsubmitted edits; reload restores submitted criteria. Empty results explain that no video matches all selected criteria and keep the form editable. No automatic relaxation. Search errors retain selected criteria and the session draft.

## URL and server contract

Proposed application-owned routes: `GET /api/catalogue/search`, `GET /api/catalogue/suggestions`, `GET /api/catalogue/status`, `POST /api/catalogue/retry`. Existing `/api/videos` and upstream endpoints keep their contracts. SSR calls the same search/status service directly. Retry accepts no arbitrary upstream URL and cannot refresh an already-ready cache.

Search URLs use repeated `job` and `title` parameters, plus optional `audience`, `headset`, `page`; example (spaces shown decoded): `/?audience=adultes-reconversion&job=A1203&title=omar&title=jardinier&headset=pico-4`. Encode with URLSearchParams. Sort/deduplicate job codes and normalized title values for stable URLs/query keys; omit defaults. Chip order: public, jobs, titles, headset. Search returns the existing video-list data/meta shape; paginate at 24 items, ordered by video ID. A page beyond the last page is canonicalized to the last page after filtering; zero results uses page one.

Reject malformed known parameters, multiple public/headset/page values, unknown IDs/selected dictionary terms, more than ten job/title criteria, terms over 120 Unicode code points or recognized query data over 8KiB with a French 400 validation response. Whitespace-only criteria are omitted. Positive integer page only. Unrelated page URL parameters are ignored; do not silently discard invalid search criteria and broaden results. Title terms are validated against the dictionary after preparation, not treated as executable expressions or regular expressions.

Suggestion URLs accept input `term` (max 120 code points), selected jobs/titles and optional current public/headset for validation; suggestions are drawn from the whole catalogue, not progressively filtered by those other choices. Validate the same selection limits. This avoids contextual suggestions disappearing after each selection. No infinite result lists.

Legacy `job`, audience/headset and page links retain meaning. A legacy `q` remains a separate case-insensitive contiguous substring title condition matching the old API behaviour; render it as a removable title-search chip with an accessible explanation. Keep q in the URL while it exists; AND with new criteria. Do not normalize its accents/hyphens or pretend it is a dictionary selection. Only legacy URLs create it; include it in the ten-criterion limit, validate length and preserve its chip on submission until removed/cleared. One q maximum. No redirects that change its meaning.

## Startup, retry and loading contract

- One preparation pipeline per Astro process begins at server startup without a visitor request. Gather all validated video pages and jobs/audiences/headsets, build mappings/dictionary, then publish ready atomically. Readiness requires everything. Cache for process lifetime; no sessions in this cache. API startup may lag behind Astro.
- Proposed budget: four attempts total, with delays of 1s, 2s and 4s after a failed attempt. Each upstream request retains the existing seven-second timeout. Stop an attempt at its first failure, discard unpublished partial work and restart preparation on the next attempt. No per-request nested automatic retry layer. Four attempts are not a seven-second overall deadline: each attempt can involve several requests.
- Retry transport failures, timeouts, HTTP 408/429/5xx; for 429 respect a valid Retry-After delay capped at 30s. Fail without automatic retry on configuration errors, invalid schemas, duplicate IDs/inconsistent pagination and other 4xx. Give the user a generic useful failure message; log technical details on the server. Never label invalid data as an empty catalogue.
- While preparing, return a machine-readable preparing state (proposed HTTP 503 and Retry-After 1) from search/suggestions. The page shows an announced loading state, not zero results; React checks status once per second while visible and stops when ready or failed. Once ready it requests the submitted results automatically. Preserve pending selections/draft. Legacy query validation needing catalogue data waits until ready.
- A failed state stops automatic polling and displays « Le catalogue ne peut pas être préparé. Réessayer ». Manual retry starts one new bounded cycle only when failed; simultaneous retries join it. Configuration/data failures may need server correction; manual retry is allowed but must not trigger a loop. A ready cache is never rebuilt via this public recovery action. Shutdown cancels retry timers and initialization requests.
- Keep current liveness semantics. Do not gate Railway traffic or modify deployment settings in this increment without separate agreement. Readiness status belongs to the application search service.
- The installed integration types and [official integration documentation](https://docs.astro.build/en/reference/integrations-reference/) distinguish development server hooks; the [Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/) starts production standalone output through its server entrypoint. Do not claim astro:server:start alone covers production. Task 14B must select and prove supported dev and production bootstrap paths sharing the exact same cache instance as requests, without API calls during build. Exact wiring remains an implementation choice, not validated by this documentation task.

## Acceptance examples for candidate review

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

## Decisions to agree before Task 12 can close

1. Whole-word title matching and deterministic two-to-four-word phrases, exact stop list, no morphological/fuzzy expansion.
2. Canonical job labels on chips versus preserving the matched appellation (the latter needs a stable URL identity beyond job code).
3. Two-character threshold, 200ms debounce, five suggestions with a 3-job/2-title allocation and global rather than progressively filtered suggestions.
4. Maximum ten keyword/job criteria; explicit selection required before submission; pending removals/clear-all; legacy q compatibility.
5. Four startup attempts with 1/2/4s delays, loading/status polling and manual retry; keep video details on the existing API path. No deployment-readiness change.

Candidate agreement on this draft is separate from authorisation to implement Tasks 13 onward.
