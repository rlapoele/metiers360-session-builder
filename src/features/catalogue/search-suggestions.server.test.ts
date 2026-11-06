import { describe, expect, it } from 'vitest';

import { buildSearchDictionary } from '@features/catalogue/search-dictionary.server';
import { suggestDictionaryTerms } from '@features/catalogue/search-suggestions.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';

function dictionary() {
  const jobRows: [string, string, string[]][] = [
    [
      'A1203',
      "Agent / Agente d'entretien des espaces verts",
      ['Jardinier municipal / Jardinière municipale'],
    ],
    ['A1208', 'Jardinier / Jardinière paysagiste', ['Paysagiste en entretien']],
    ['A1209', 'Jardinier spécialisé', ['Agent de jardin']],
    ['A1210', 'Jardinier de nuit', []],
    [
      'I1604',
      'Mécanicien / Mécanicienne automobile',
      ['Garagiste', 'Garagiste-mécanicien'],
    ],
  ];
  const input: CatalogueSnapshot = {
    videos: [
      'Jardinier municipal',
      'Jardinier paysagiste',
      'Jardinage collectif',
      'Jardins partagés',
      'Un jardin caché',
      'Omar, Garagiste',
    ].map((title, index) => ({
      id: `vid_${index}`,
      title,
      description: '',
      duration_seconds: 60,
      jobs: [],
      audiences: [],
      compatible_headsets: [],
      thumbnail_url: null,
      published_at: '2024-01-01',
    })),
    jobs: {
      source: 'test',
      data: jobRows.map(([code, label, appellations]) => ({
        code,
        label,
        appellations,
        major_domain: { code: 'A', label: 'Domain' },
        professional_domain: { code: 'A12', label: 'Domain' },
      })),
    },
    headsets: { data: [] },
    audiences: { data: [] },
  };
  return buildSearchDictionary(input);
}

describe('pure dictionary suggestions', () => {
  it('keeps categories separate and uses the selected original appellation with its parent code', () => {
    const result = suggestDictionaryTerms(dictionary(), { term: 'garagiste' });
    expect(result.find((item) => item.category === 'job')).toEqual({
      category: 'job',
      key: 'I1604',
      jobCode: 'I1604',
      label: 'Garagiste',
      sourceKey: 'appellation/garagiste',
      jobLabel: 'Mécanicien / Mécanicienne automobile',
    });
    expect(result.find((item) => item.category === 'title')).toMatchObject({
      key: 'garagiste',
      label: 'Garagiste',
    });
    const params = new URLSearchParams({
      job: 'I1604',
      jobTerm: 'I1604:appellation/garagiste',
    });
    const job = dictionary().jobs.find(
      (item) => item.code === params.get('job'),
    );
    expect(
      job?.sources.find(
        (source) => source.key === params.get('jobTerm')?.split(':')[1],
      )?.label,
    ).toBe('Garagiste');
  });

  it('returns five grouped results, allocating three jobs and two title keywords when both are abundant', () => {
    const result = suggestDictionaryTerms(dictionary(), { term: 'jard' });
    expect(result).toHaveLength(5);
    expect(result.map((item) => item.category)).toEqual([
      'job',
      'job',
      'job',
      'title',
      'title',
    ]);
    expect(
      new Set(
        result
          .filter((item) => item.category === 'job')
          .map((item) => item.key),
      ).size,
    ).toBe(3);
  });

  it('fills unused job slots with titles and excludes all selected aliases of a job', () => {
    const result = suggestDictionaryTerms(dictionary(), {
      term: 'jard',
      selectedJobCodes: ['A1203', 'A1208', 'A1209', 'A1210'],
      selectedTitleKeys: ['jardinier'],
    });
    expect(result).toHaveLength(5);
    expect(
      result.every(
        (item) => item.category === 'title' && item.key !== 'jardinier',
      ),
    ).toBe(true);
    expect(
      suggestDictionaryTerms(dictionary(), {
        term: 'garagiste',
        selectedJobCodes: ['I1604'],
      }).some((item) => item.category === 'job'),
    ).toBe(false);
  });

  it('uses canonical-label fallback, shared slash context and ordered word-prefix matching', () => {
    expect(
      suggestDictionaryTerms(dictionary(), { term: 'mecanicien' }).find(
        (item) => item.category === 'job',
      ),
    ).toMatchObject({ sourceKey: 'label/mecanicien mecanicienne automobile' });
    expect(
      suggestDictionaryTerms(dictionary(), {
        term: 'agent entretien espaces',
      }).find((item) => item.category === 'job'),
    ).toMatchObject({ jobCode: 'A1203' });
    expect(
      suggestDictionaryTerms(dictionary(), { term: 'jard mu' }).some(
        (item) =>
          item.category === 'title' && item.key === 'jardinier municipal',
      ),
    ).toBe(true);
    expect(
      suggestDictionaryTerms(dictionary(), { term: 'mu jard' }).some(
        (item) =>
          item.category === 'title' && item.key === 'jardinier municipal',
      ),
    ).toBe(false);
  });

  it('ranks exact words before longer prefixes, and supports weaker substrings without fuzzy corrections', () => {
    const titles = suggestDictionaryTerms(dictionary(), {
      term: 'jardinier',
      selectedJobCodes: ['A1203', 'A1208', 'A1209', 'A1210'],
    });
    expect(titles[0]).toMatchObject({ category: 'title', key: 'jardinier' });
    expect(
      suggestDictionaryTerms(dictionary(), { term: 'ardin' }).length,
    ).toBeGreaterThan(0);
    expect(suggestDictionaryTerms(dictionary(), { term: 'jradinier' })).toEqual(
      [],
    );
  });

  it('does not open on empty or one-character input and produces repeatable results', () => {
    for (const term of ['', ' ', 'j', 'j -'])
      expect(suggestDictionaryTerms(dictionary(), { term })).toEqual([]);
    const input = dictionary();
    expect(suggestDictionaryTerms(input, { term: 'JÀRD' })).toEqual(
      suggestDictionaryTerms(input, { term: 'jard' }),
    );
    expect(suggestDictionaryTerms(input, { term: 'jard' })).toEqual(
      suggestDictionaryTerms(input, { term: 'jard' }),
    );
  });
});
