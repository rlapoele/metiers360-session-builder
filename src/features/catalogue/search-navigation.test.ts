import { describe, expect, it } from 'vitest';
import {
  searchFormParams,
  submittedSearchParams,
  recognizedSearchParams,
} from '@features/catalogue/search-navigation';
const job = {
  category: 'job' as const,
  key: 'I1604',
  jobCode: 'I1604',
  sourceKey: 'appellation/garagiste',
  label: 'Garagiste',
  jobLabel: 'Mécanicien automobile',
};
describe('applied search URLs', () => {
  it('encodes sorted/deduplicated typed identities and authored source metadata without labels', () => {
    const params = searchFormParams(
      {
        selected: [{ category: 'title', key: 'omar', label: 'Omar' }, job, job],
        audience: 'college',
        headset: 'pico-4',
        legacyQuery: 'Aïcha-méca',
      },
      2,
    );
    expect(params.getAll('job')).toEqual(['I1604']);
    expect(params.getAll('jobTerm')).toEqual(['I1604:appellation/garagiste']);
    expect(params.get('q')).toBe('Aïcha-méca');
    expect(params.get('page')).toBe('2');
    expect(params.toString()).not.toContain('Garagiste');
  });
  it('resets page only on criteria change and retains unrelated page URL data', () => {
    const current = new URLSearchParams('tracking=keep&page=3&job=I1604');
    expect(
      submittedSearchParams(
        current,
        { selected: [job] },
        { selected: [job] },
        3,
      ).get('page'),
    ).toBe('3');
    const next = submittedSearchParams(
      current,
      { selected: [job] },
      { selected: [] },
      3,
    );
    expect(next.get('tracking')).toBe('keep');
    expect(next.has('page')).toBe(false);
    expect(next.has('job')).toBe(false);
  });
  it('preserves malformed known parameters for server validation instead of broadening', () => {
    expect(
      recognizedSearchParams(
        new URLSearchParams(
          'job=A&job=B&page=bad&audience=a&audience=b&other=x',
        ),
      ).toString(),
    ).toBe('job=A&job=B&page=bad&audience=a&audience=b');
  });
  it('keeps the page when only a selected source label changes for the same job code', () => {
    const current = new URLSearchParams('job=I1604&page=3');
    const next = submittedSearchParams(
      current,
      { selected: [job] },
      {
        selected: [
          {
            ...job,
            sourceKey: 'label/mecanicien automobile',
            label: 'Mécanicien automobile',
          },
        ],
      },
      3,
    );
    expect(next.get('page')).toBe('3');
    expect(next.get('jobTerm')).toBe('I1604:label/mecanicien automobile');
  });
});
