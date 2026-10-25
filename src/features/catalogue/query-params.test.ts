import { describe, expect, it } from 'vitest';

import {
  catalogueQueryFromSearchParams,
  catalogueQueryToSearchParams,
  updateCatalogueQuery,
} from '@features/catalogue/query-params';

describe('catalogue query parameters', () => {
  it('reads supported non-empty filters and a valid page', () => {
    const query = catalogueQueryFromSearchParams(
      new URLSearchParams(
        'q=automobile&job=I1604&headset=meta-quest-2&audience=college&page=3&ignored=value',
      ),
    );

    expect(query).toEqual({
      q: 'automobile',
      job: 'I1604',
      headset: 'meta-quest-2',
      audience: 'college',
      page: 3,
    });
  });

  it('normalises blank filters and invalid pages to the catalogue defaults', () => {
    const query = catalogueQueryFromSearchParams(
      new URLSearchParams('q=+++&page=-2'),
    );

    expect(query).toEqual({
      q: '',
      job: '',
      headset: '',
      audience: '',
      page: 1,
    });
  });

  it('omits default values when writing a shareable URL', () => {
    const searchParams = catalogueQueryToSearchParams({
      q: '  santé  ',
      job: '',
      headset: 'pico-4',
      audience: '',
      page: 1,
    });

    expect(searchParams.toString()).toBe('q=sant%C3%A9&headset=pico-4');
  });

  it('resets pagination when a search criterion changes', () => {
    const query = updateCatalogueQuery(
      {
        q: 'mécanicien',
        job: 'I1604',
        headset: '',
        audience: '',
        page: 4,
      },
      { audience: 'lycee' },
    );

    expect(query).toEqual({
      q: 'mécanicien',
      job: 'I1604',
      headset: '',
      audience: 'lycee',
      page: 1,
    });
  });

  it('keeps an explicitly requested page change', () => {
    const query = updateCatalogueQuery(
      {
        q: '',
        job: '',
        headset: '',
        audience: '',
        page: 1,
      },
      { page: 2 },
    );

    expect(query.page).toBe(2);
  });
});
