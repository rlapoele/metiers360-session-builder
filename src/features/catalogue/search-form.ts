import type {
  KeywordSuggestionRequest,
  KeywordSuggestion,
} from '@features/catalogue/keyword-suggestions';
import {
  compareCodePoints,
  normalizeSearchText,
} from '@features/catalogue/search-dictionary-rules';

/** Pending form values; applied URL/result ownership belongs to the parent. */
export type SearchFormCriteria = Omit<KeywordSuggestionRequest, 'term'>;

export function keywordIdentity(item: KeywordSuggestion) {
  return item.category === 'job'
    ? `job:${item.jobCode}`
    : `title:${normalizeSearchText(item.key)}`;
}
export function orderedKeywords(selected: readonly KeywordSuggestion[]) {
  return [...selected].sort((a, b) =>
    a.category === b.category
      ? compareCodePoints(a.key, b.key)
      : a.category === 'job'
        ? -1
        : 1,
  );
}
export function formCriteriaIdentity(criteria: SearchFormCriteria) {
  return JSON.stringify({
    audience: criteria.audience || '',
    selected: orderedKeywords(criteria.selected).map((item) => [
      keywordIdentity(item),
      item.category === 'job' ? item.sourceKey : '',
    ]),
    legacyQuery: criteria.legacyQuery || '',
    headset: criteria.headset || '',
  });
}
export function addKeyword(
  criteria: SearchFormCriteria,
  item: KeywordSuggestion,
): SearchFormCriteria {
  if (
    criteria.selected.some(
      (selected) => keywordIdentity(selected) === keywordIdentity(item),
    ) ||
    criteria.selected.length + Number(Boolean(criteria.legacyQuery)) >= 10
  )
    return criteria;
  return { ...criteria, selected: [...criteria.selected, item] };
}
