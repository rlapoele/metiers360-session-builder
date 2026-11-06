# Deterministic search dictionary rules

Version: 1. Date: 2026-11-06. Status: candidate-agreed rules, implemented and verified in Task 14A. Startup activation, HTTP endpoints and the search UI remain later tasks.

This document owns the editorial extraction and matching rules. The [search contract](../tasks/search-contract.md) owns selection identities, suggestion ranking, URL state and startup behaviour. Keep stop words and expansion rules here rather than copying them into several specification documents.

## D1 — Reproducibility

For the same complete catalogue, rule version and supported runtime, dictionary construction must produce the same keys, display values, mappings and ordering on every run. It uses no AI, randomness, current time, personalisation, external enrichment or manual judgement at execution time. Startup retries can affect when it is ready, not its contents.

Process source records in stable video-ID/job-code order. Deduplicate normalized values without depending on request completion order. For a title display-spelling collision, choose the lowest video ID, then the first source occurrence within that title. For a job source-key collision after normalization, keep the separate appellation/label prefixes and choose the original text by Unicode code-point order within each source kind. Sort mapping IDs/codes explicitly. French ordering must use an explicit fr collator with fixed options and a code-point identity tie-break; implementation must pin/test the runtime rather than assume collation is identical across all Node/ICU versions.

A catalogue change, rule change or runtime change may deliberately alter output. Reproducibility does not mean the output is linguistically perfect: the stop list and phrase limits are editorial decisions that can be reviewed and versioned.

Implemented collation options: locale `fr`, `usage: sort`, `sensitivity: base`, `numeric: false`, `ignorePunctuation: false`, `caseFirst: false` (the Intl string value). Equal collation results fall back to Unicode code-point comparison. No clock, randomness, video popularity or input arrival order participates in dictionary ordering.

## D2 — Inputs and pipeline

Use the complete validated catalogue snapshot, not one results page. Run: stable source ordering → notation expansion → matching normalization/tokenization → word/phrase extraction → source mappings → deduplication/display selection → stable ordering. Preserve authored source strings for display and traceability. A failure must not publish a partial dictionary.

## Normalization and matching

Preserve originals for display. For matching only: Normalize Unicode to NFD, lowercase, remove combining accents, convert œ to oe and æ to ae, turn typographic apostrophes into straight apostrophes, then treat apostrophes and hyphens as word separators. Collapse whitespace. Letters/digits form tokens; retain short acronyms and numeric tokens (ASV, AVQ, SI, VL, 3D). Do not apply a minimum token length globally.

Commas, colons, slashes, parentheses and sentence-ending punctuation define phrase boundaries. Words are still indexed on either side; a phrase cannot cross a boundary. Hyphenated compounds also offer the equivalent space-separated phrase. Thus aide-boulangère matches aide boulangère. No stemming, singular/plural equivalence, automatic masculine/feminine equivalence, typo tolerance or invented synonyms. Job aliases already provide many alternatives. A title word boulangère does not automatically match boulanger.

Autocomplete may match partial input; selected title criteria use complete normalized tokens, never arbitrary substrings. Selecting car does not match carrossier. A selected phrase preserves order and adjacency, including internal connecting words: espaces verts is not equivalent to verts espaces. Separate title chips require both words anywhere in the same title.

## Extraction rules

1. Read only video titles and job labels/appellations. Descriptions, domain labels and saved-session names do not contribute keywords in this increment.
2. For job strings, expand the reviewed compressed forms before tokenization. Keep both supplied slash-separated forms and their shared contextual wording as alternative job vocabulary. Never treat suffix fragments such as trice or ère as keywords generated from notation.
3. Extract every non-stop word, plus contiguous phrases of two to four tokens within a phrase boundary. A phrase must start and end with a non-stop word and contain at least two non-stop words; internal stop words are allowed. Do not generate phrases containing journee or devenir. These are deterministic candidate phrases, not claims of semantic understanding; do not add an AI phrase selector or manually grow a large taxonomy.
4. Deduplicate by category plus normalized value. Keep all source occurrences for mappings; choose the original display spelling from the lowest video ID for title terms. Keep any chosen display spelling stable across requests.
5. Retain names and place names using exactly these rules; no name detection or exclusion. Omar, Hugo, Aïcha and Lille can be title keywords. Aïcha and aicha share a matching key. Names with punctuation follow ordinary word/phrase rules.

Agreed exact stop list (normalized tokens): `a, au, aux, avec, ce, ces, cette, d, dans, de, des, du, elle, elles, en, et, il, ils, je, l, la, le, les, leur, leurs, ne, nos, notre, on, ou, par, pas, pour, qu, que, qui, sa, se, ses, son, sur, un, une, vos, votre, journee, devenir`.

Stop words suppress dictionary candidates only. They are not deleted from normalized titles used to check a phrase. Do not remove occupational terms such as aide, agent, chef, employé or technicien merely because they are common. Useful title themes such as sécurité, outils, nuit and équipe remain. Do not add extra exclusions without reviewing the resulting vocabulary.

Compressed notation uses a small source-reviewed expansion table, not speculative suffix rules. Current replacement patterns: `boulanger(ère)`, `pâtissier(ère)`, `traiteur(se)`, `conducteur(trice)`, `electricien(ne)`, `itinérant(e)`, `technicien(ne)`, `médical(e)`, `assistant(e)`, `gardien(ne)`, `principal(e)`, `opérateur(trice)`, `programmeur(se)`, `administrateur(trice)`, `chef(fe)`, `maquilleur(se)`, `posticheur(se)`. Expansion produces the valid masculine/feminine words, not every combination of a compound. Unknown compact suffix notation must be reported in dictionary-build diagnostics for review rather than silently indexed as a suffix. Parenthetical context/acronyms such as (espaces verts), (ASV), (AVQ), (IDE) and (SI) remain searchable vocabulary, not suffixes. No expansion of ind to industrie, VL to véhicule léger or 2 D to 2D without an additional agreed rule.

## D3 — Implementation documentation

The builder's JSDoc records its complete validated input, output dictionary, deterministic/pure transformation guarantee and a relative reference to this document. Comments inside helpers explain editorial reasons such as expanding whole word forms rather than concatenating suffixes. Stop lists and expansion tables are named data linked to these rules. Maintain this arrangement; do not duplicate the full business specification in comments.

The pure dictionary builder is separate from startup/API orchestration. Network calls and retries gather inputs; the builder transforms a complete snapshot. Suggestions use the contract's explicit ranking and stable tie-breaks; their contents depend on input text and selections, not timing.

### Implemented representation and notation handling

- Named stop words, the 17 explicit compact-form replacements, normalization, token offsets and collation live in `src/features/catalogue/search-dictionary-rules.ts`. A compound with several compact forms produces an all-masculine and an all-feminine expression, not every mixed combination. Unknown attached lowercase notation is returned as a diagnostic and contributes only its supplied base word; the unknown suffix is not indexed as vocabulary. Authored source text remains intact for display/source identity.
- `buildSearchDictionary` in `src/features/catalogue/search-dictionary.server.ts` returns JSON-serializable arrays: rule version, title entries, jobs with source entries, job-vocabulary mappings and diagnostics. Title sources include the exact original excerpt and its JavaScript UTF-16 start/end offsets, plus video ID; entries also retain sorted unique video IDs.
- Job source keys retain `label/` or `appellation/` plus normalized full original text. Each source keeps all distinct authored spellings and chooses the deterministic display spelling specified in D1. Sources contain extracted vocabulary and full expanded normalized strings (including long job expressions). A term can map to several job codes and to several source appellations for the same code.
- Slash-separated supplied forms keep separate extraction/phrase boundaries but share their parent source/job mapping and the complete normalized source context. Ordered-fragment suggestion matching can therefore find `agent entretien espaces` in `Agent / Agente d'entretien des espaces verts` without synthesizing a new authored label or treating the two gender forms as two jobs. Selected chips use the original source label, not an expanded/generated expression.
- `suggestDictionaryTerms` in `src/features/catalogue/search-suggestions.server.ts` implements the contract's pure matching/ranking, two-character threshold, selected-job/title exclusion and three-job/two-title allocation with unused-slot filling. It returns source keys and authored labels for later selection restoration. Debounce, request validation, URL parsing, HTTP endpoints, AND result execution and UI integration are not part of this helper.

## D4 — Required verification when implemented

- Verify the same fixture and rule version produce identical serialized dictionary output across repeated builds and shuffled source records, without timestamps or random IDs.
- Use expected-output fixtures for names, accents/œ, stop words, phrase boundaries, gender notation, acronyms, compounds, duplicate spellings and selected appellation keys.
- Verify every emitted key maps to its recorded source video/job; two aliases of one code retain distinct display source identities but only one effective job condition.
- Preserve the agreed Omar/jardinier municipal and Garagiste → I1604 acceptance examples. Keep dictionary-build tests separate from startup retry/lifecycle tests.
- Any intentional editorial rule change updates this document/version, named data and affected examples/tests together. Do not silently change rules to make a test pass.

Task 14A evidence (2026-11-06): 15 focused dictionary/suggestion tests pass, including expected extraction examples, complete fixture builds with reversed videos/jobs/appellations, unchanged input, clock/randomness traps, source-excerpt/mapping consistency, selected-appellation restoration and the five-item allocation. The full `npm run verify` gate passes 147 tests, strict checks on 87 files with zero diagnostics, formatting/lint and production build. Building the validated supplied fixture yields 204 videos, 55 jobs, 631 title entries, 1,603 job-vocabulary entries and zero unsupported-notation diagnostics. These counts describe this fixture/rule version, not a fixed future catalogue size. No startup or browser search integration is claimed.
