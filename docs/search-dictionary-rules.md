# Deterministic search dictionary rules

Version: 1. Date: 2026-11-06. Status: candidate-agreed rules for future implementation; no dictionary builder has been implemented yet.

This document owns the editorial extraction and matching rules. The [search contract](../tasks/search-contract.md) owns selection identities, suggestion ranking, URL state and startup behaviour. Keep stop words and expansion rules here rather than copying them into several specification documents.

## D1 — Reproducibility

For the same complete catalogue, rule version and supported runtime, dictionary construction must produce the same keys, display values, mappings and ordering on every run. It uses no AI, randomness, current time, personalisation, external enrichment or manual judgement at execution time. Startup retries can affect when it is ready, not its contents.

Process source records in stable video-ID/job-code order. Deduplicate normalized values without depending on request completion order. For a title display-spelling collision, choose the lowest video ID, then the first source occurrence within that title. For a job source-key collision after normalization, keep the separate appellation/label prefixes and choose the original text by Unicode code-point order within each source kind. Sort mapping IDs/codes explicitly. French ordering must use an explicit fr collator with fixed options and a code-point identity tie-break; implementation must pin/test the runtime rather than assume collation is identical across all Node/ICU versions.

A catalogue change, rule change or runtime change may deliberately alter output. Reproducibility does not mean the output is linguistically perfect: the stop list and phrase limits are editorial decisions that can be reviewed and versioned.

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

When the builder is implemented, add a short JSDoc contract to its public function: input snapshot, output dictionary, deterministic/pure transformation guarantee, rule version and a relative reference to this document. Comments inside helpers should explain the relevant editorial reason (for example retaining names or expanding suffix notation), not restate every line of code. Keep stop lists and expansion tables as named data, with comments linking to these rules. Do not duplicate the full business specification in comments.

Future source documentation should distinguish the pure dictionary builder from startup/API orchestration. Network calls and retries gather inputs; the builder transforms a complete snapshot. Suggestions use the contract's explicit ranking and stable tie-breaks; their contents depend on input text and selections, not timing.

## D4 — Required verification when implemented

- Verify the same fixture and rule version produce identical serialized dictionary output across repeated builds and shuffled source records, without timestamps or random IDs.
- Use expected-output fixtures for names, accents/œ, stop words, phrase boundaries, gender notation, acronyms, compounds, duplicate spellings and selected appellation keys.
- Verify every emitted key maps to its recorded source video/job; two aliases of one code retain distinct display source identities but only one effective job condition.
- Preserve the agreed Omar/jardinier municipal and Garagiste → I1604 acceptance examples. Keep dictionary-build tests separate from startup retry/lifecycle tests.
- Any intentional editorial rule change updates this document/version, named data and affected examples/tests together. Do not silently change rules to make a test pass.

These are requirements for later tasks, not claims that implementation tests already exist or pass.
