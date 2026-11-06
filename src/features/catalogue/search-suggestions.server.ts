import {
  compareCodePoints,
  compareFrench,
  normalizeSearchText,
} from '@features/catalogue/search-dictionary-rules';
import type { SearchDictionary } from '@features/catalogue/search-dictionary.server';

interface SuggestionInput {
  term: string;
  selectedJobCodes?: readonly string[];
  selectedTitleKeys?: readonly string[];
}

export type DictionarySuggestion =
  | {
      category: 'job';
      key: string;
      jobCode: string;
      sourceKey: string;
      label: string;
      jobLabel: string;
    }
  | { category: 'title'; key: string; label: string };

interface Rank {
  tier: number;
  sourceRank: number;
  expression: string;
}
interface RankedSuggestion {
  suggestion: DictionarySuggestion;
  rank: Rank;
  identity: string;
}

function matchTier(expression: string, query: string): number | undefined {
  if (expression === query) return 0;
  if (expression.startsWith(query)) return 1;
  const words = expression.split(' ');
  let position = 0;
  const prefixesMatch = query.split(' ').every((fragment) => {
    while (position < words.length && !words[position]!.startsWith(fragment))
      position += 1;
    if (position === words.length) return false;
    position += 1;
    return true;
  });
  if (prefixesMatch) return 2;
  return expression.includes(query) ? 3 : undefined;
}

function compareRank(a: Rank, b: Rank) {
  return (
    a.tier - b.tier ||
    a.sourceRank - b.sourceRank ||
    Array.from(a.expression).length - Array.from(b.expression).length ||
    compareFrench(a.expression, b.expression)
  );
}

function compareSuggestions(a: RankedSuggestion, b: RankedSuggestion) {
  return (
    compareRank(a.rank, b.rank) || compareCodePoints(a.identity, b.identity)
  );
}

/** Pure ranking/grouping only; request validation and debounce belong to later tasks. */
export function suggestDictionaryTerms(
  dictionary: SearchDictionary,
  input: SuggestionInput,
): DictionarySuggestion[] {
  const query = normalizeSearchText(input.term);
  if (Array.from(query.replaceAll(' ', '')).length < 2) return [];
  const selectedJobs = new Set(input.selectedJobCodes);
  const selectedTitles = new Set(
    input.selectedTitleKeys?.map(normalizeSearchText),
  );
  const jobs: RankedSuggestion[] = [];
  const titles: RankedSuggestion[] = [];

  for (const job of dictionary.jobs) {
    if (selectedJobs.has(job.code)) continue;
    let best: RankedSuggestion | undefined;
    for (const source of job.sources) {
      for (const expression of source.expressions) {
        const tier = matchTier(expression, query);
        if (tier === undefined) continue;
        const candidate: RankedSuggestion = {
          rank: {
            tier,
            sourceRank: source.kind === 'label' ? 0 : 1,
            expression,
          },
          identity: `${job.code}:${source.key}`,
          suggestion: {
            category: 'job',
            key: job.code,
            jobCode: job.code,
            sourceKey: source.key,
            label: source.label,
            jobLabel: job.label,
          },
        };
        if (!best || compareSuggestions(candidate, best) < 0) best = candidate;
      }
    }
    if (best) jobs.push(best);
  }
  for (const title of dictionary.titles) {
    if (selectedTitles.has(title.key)) continue;
    const tier = matchTier(title.key, query);
    if (tier === undefined) continue;
    titles.push({
      rank: { tier, sourceRank: 0, expression: title.key },
      identity: title.key,
      suggestion: { category: 'title', key: title.key, label: title.label },
    });
  }
  jobs.sort(compareSuggestions);
  titles.sort(compareSuggestions);
  let jobCount = Math.min(3, jobs.length);
  let titleCount = Math.min(2, titles.length);
  jobCount += Math.min(5 - jobCount - titleCount, jobs.length - jobCount);
  titleCount += Math.min(5 - jobCount - titleCount, titles.length - titleCount);
  return [...jobs.slice(0, jobCount), ...titles.slice(0, titleCount)].map(
    (item) => item.suggestion,
  );
}
