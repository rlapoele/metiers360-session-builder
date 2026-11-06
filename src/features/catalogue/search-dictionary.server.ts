import {
  compareCodePoints,
  compareFrench,
  DICTIONARY_RULE_VERSION,
  expandJobNotation,
  extractSearchTerms,
  normalizeSearchText,
} from '@features/catalogue/search-dictionary-rules';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';

interface TitleOccurrence {
  videoId: string;
  text: string;
  start: number;
  end: number;
}
interface TitleEntry {
  key: string;
  label: string;
  videoIds: string[];
  sources: TitleOccurrence[];
}
interface JobSource {
  key: string;
  kind: 'label' | 'appellation';
  label: string;
  originals: string[];
  expressions: string[];
}
interface JobEntry {
  code: string;
  label: string;
  sources: JobSource[];
}
interface JobTerm {
  key: string;
  jobCodes: string[];
  sources: { jobCode: string; sourceKey: string }[];
}
interface DictionaryDiagnostic {
  code: 'unsupported-gender-notation';
  jobCode: string;
  sourceKey: string;
  notation: string;
}
export interface SearchDictionary {
  version: number;
  titles: TitleEntry[];
  jobs: JobEntry[];
  jobTerms: JobTerm[];
  diagnostics: DictionaryDiagnostic[];
}

function jobExpressions(text: string) {
  const { variants, unsupported } = expandJobNotation(text);
  const expressions = new Set<string>();
  for (const variant of variants) {
    for (const term of extractSearchTerms(variant)) expressions.add(term.key);
    // Full source wording also supports long job queries and shared context
    // around slash-separated gender forms, without inventing new job labels.
    const full = normalizeSearchText(variant);
    if (full) expressions.add(full);
  }
  return { expressions: [...expressions].sort(compareFrench), unsupported };
}

/**
 * Purely transform a complete validated snapshot into dictionary v1 and source
 * mappings. Same data/rules/runtime produce identical serialized output even
 * when input records arrive in a different order. No I/O, clock or randomness.
 * Editorial rules: ../../../docs/search-dictionary-rules.md.
 */
export function buildSearchDictionary(
  snapshot: CatalogueSnapshot,
): SearchDictionary {
  const titles = new Map<string, TitleEntry>();
  for (const video of [...snapshot.videos].sort((a, b) =>
    compareCodePoints(a.id, b.id),
  )) {
    for (const term of extractSearchTerms(video.title)) {
      let entry = titles.get(term.key);
      if (!entry) {
        entry = { key: term.key, label: term.label, videoIds: [], sources: [] };
        titles.set(term.key, entry);
      }
      if (!entry.videoIds.includes(video.id)) entry.videoIds.push(video.id);
      entry.sources.push({
        videoId: video.id,
        text: term.label,
        start: term.start,
        end: term.end,
      });
    }
  }

  const diagnostics: DictionaryDiagnostic[] = [];
  const jobTerms = new Map<string, JobTerm>();
  const jobs: JobEntry[] = [];
  for (const job of [...snapshot.jobs.data].sort((a, b) =>
    compareCodePoints(a.code, b.code),
  )) {
    const sources = new Map<string, JobSource>();
    const inputs: { kind: JobSource['kind']; text: string }[] = [
      { kind: 'label', text: job.label },
      ...job.appellations.map((text) => ({
        kind: 'appellation' as const,
        text,
      })),
    ];
    for (const { kind, text } of inputs) {
      const key = `${kind}/${normalizeSearchText(text)}`;
      const existing = sources.get(key);
      if (existing) {
        if (!existing.originals.includes(text)) existing.originals.push(text);
      } else
        sources.set(key, {
          key,
          kind,
          label: text,
          originals: [text],
          expressions: [],
        });
    }
    for (const source of [...sources.values()].sort((a, b) =>
      compareCodePoints(a.key, b.key),
    )) {
      source.originals.sort(compareCodePoints);
      source.label = source.originals[0]!;
      const expressions = new Set<string>();
      const unsupported = new Set<string>();
      for (const original of source.originals) {
        const expanded = jobExpressions(original);
        expanded.expressions.forEach((expression) =>
          expressions.add(expression),
        );
        expanded.unsupported.forEach((notation) => unsupported.add(notation));
      }
      source.expressions = [...expressions].sort(compareFrench);
      for (const notation of [...unsupported].sort(compareCodePoints))
        diagnostics.push({
          code: 'unsupported-gender-notation',
          jobCode: job.code,
          sourceKey: source.key,
          notation,
        });
      for (const key of source.expressions) {
        let entry = jobTerms.get(key);
        if (!entry) {
          entry = { key, jobCodes: [], sources: [] };
          jobTerms.set(key, entry);
        }
        if (!entry.jobCodes.includes(job.code)) entry.jobCodes.push(job.code);
        entry.sources.push({ jobCode: job.code, sourceKey: source.key });
      }
    }
    jobs.push({
      code: job.code,
      label: job.label,
      sources: [...sources.values()].sort((a, b) =>
        compareCodePoints(a.key, b.key),
      ),
    });
  }
  return {
    version: DICTIONARY_RULE_VERSION,
    titles: [...titles.values()].sort((a, b) => compareFrench(a.key, b.key)),
    jobs,
    jobTerms: [...jobTerms.values()].sort((a, b) =>
      compareFrench(a.key, b.key),
    ),
    diagnostics,
  };
}
