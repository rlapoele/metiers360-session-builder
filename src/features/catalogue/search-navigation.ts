import { keywordSuggestionParams } from '@features/catalogue/keyword-suggestions';
import {
  formCriteriaIdentity,
  type SearchFormCriteria,
} from '@features/catalogue/search-form';

const SEARCH_KEYS = new Set([
  'job',
  'jobTerm',
  'title',
  'q',
  'audience',
  'headset',
  'page',
]);
/** Keep invalid/duplicate recognized values intact for the shared server validator. */
export function recognizedSearchParams(params: URLSearchParams) {
  const result = new URLSearchParams();
  for (const [key, value] of params)
    if (SEARCH_KEYS.has(key)) result.append(key, value);
  return result;
}
export function searchFormParams(criteria: SearchFormCriteria, page = 1) {
  const result = keywordSuggestionParams({ ...criteria, term: '' });
  result.delete('term');
  if (page > 1) result.set('page', String(page));
  return result;
}
function matchingCriteriaIdentity(criteria: SearchFormCriteria) {
  // Source wording affects chips/URLs, not the job predicate or result page.
  return formCriteriaIdentity({
    ...criteria,
    selected: criteria.selected.map((item) =>
      item.category === 'job' ? { ...item, sourceKey: '' } : item,
    ),
  });
}
export function submittedSearchParams(
  current: URLSearchParams,
  applied: SearchFormCriteria,
  next: SearchFormCriteria,
  page: number,
) {
  const result = new URLSearchParams(current);
  for (const key of SEARCH_KEYS) result.delete(key);
  const nextPage =
    matchingCriteriaIdentity(applied) === matchingCriteriaIdentity(next)
      ? page
      : 1;
  for (const [key, value] of searchFormParams(next, nextPage))
    result.append(key, value);
  return result;
}
