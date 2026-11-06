import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { buildSearchDictionary } from '@features/catalogue/search-dictionary.server';
import { createCataloguePreparation } from '@features/catalogue/search-preparation.server';
import { createCatalogueSearchService } from '@features/catalogue/search-service.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import {
  AudienceSchema,
  BffVideoListSchema,
  HeadsetSchema,
  JobSchema,
  VideoSchema,
} from '@lib/api/schemas';
import { CatalogueClientError } from '@lib/api/errors';

const fixture = z
  .object({
    jobs: z.array(JobSchema),
    audiences: z.array(AudienceSchema),
    headsets: z.array(HeadsetSchema),
    videos: z.array(
      VideoSchema.extend({ thumbnail_url: z.string().nullable() }),
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(
        new URL('../../../server/data/catalog.json', import.meta.url),
        'utf8',
      ),
    ) as unknown,
  );
const snapshot: CatalogueSnapshot = {
  videos: fixture.videos.map((video) => ({
    ...video,
    thumbnail_url:
      video.thumbnail_url === null ? null : `/api/thumbnails/${video.id}.svg`,
  })),
  jobs: { data: fixture.jobs, source: 'test' },
  audiences: { data: fixture.audiences },
  headsets: { data: fixture.headsets },
};
const ready = {
  status: 'ready' as const,
  snapshot,
  dictionary: buildSearchDictionary(snapshot),
};
const service = createCatalogueSearchService({
  getState: () => ready,
  retry: async () => ready,
});
const params = (query = '') => new URLSearchParams(query);

function search(query = '') {
  const result = service.search(params(query));
  expect(result.status).toBe(200);
  if (result.status !== 200) throw new Error(JSON.stringify(result.body));
  return result;
}

describe('cached AND search and query boundary', () => {
  it('filters every condition before pagination, with stable IDs and validated existing list shapes', () => {
    const all = search();
    expect(all.body.meta).toEqual({
      page: 1,
      per_page: 24,
      total: 204,
      total_pages: 9,
    });
    BffVideoListSchema.parse(all.body);
    expect(search('page=999').body.meta.page).toBe(9);
    expect(search('page=2').body.data[0]?.id).toBe(snapshot.videos[24]?.id);
    const expected = snapshot.videos.filter(
      (v) =>
        v.jobs.includes('A1203') &&
        v.audiences.includes('adultes-reconversion') &&
        v.compatible_headsets.includes('pico-4') &&
        ready.dictionary.titles
          .find((t) => t.key === 'omar')
          ?.videoIds.includes(v.id) &&
        ready.dictionary.titles
          .find((t) => t.key === 'jardinier')
          ?.videoIds.includes(v.id),
    );
    expect(
      search(
        'job=A1203&title=Omar&title=jardinier&audience=adultes-reconversion&headset=pico-4',
      ).body.data,
    ).toEqual(expected);
    expect(expected.map((v) => v.id)).toContain('vid_001');
  });

  it('requires the same video to carry all jobs and all whole title terms', () => {
    const multi = snapshot.videos.find((v) => v.jobs.length > 1)!;
    const query = new URLSearchParams(multi.jobs.map((code) => ['job', code]));
    const result = search(query.toString());
    expect(result.body.meta.total).toBe(
      snapshot.videos.filter((v) =>
        multi.jobs.every((code) => v.jobs.includes(code)),
      ).length,
    );
    expect(result.body.data.map((v) => v.id)).toContain(multi.id);
    expect(search('title=omar&title=hugo&page=2').body.meta).toMatchObject({
      page: 1,
      total: 0,
      total_pages: 1,
    });
    const title = ready.dictionary.titles.find((t) =>
      t.videoIds.some(
        (id) => snapshot.videos.findIndex((v) => v.id === id) >= 24,
      ),
    )!;
    expect(
      search(new URLSearchParams({ title: title.key }).toString()).body.meta
        .total,
    ).toBe(title.videoIds.length);
  });

  it('uses whole words and contiguous dictionary phrases rather than title substrings', () => {
    const custom: CatalogueSnapshot = {
      ...snapshot,
      videos: ['Car municipal', 'Carrossier municipal', 'Municipal, car'].map(
        (title, index) => ({
          ...snapshot.videos[0]!,
          id: `word_${index}`,
          title,
        }),
      ),
    };
    const state = {
      status: 'ready' as const,
      snapshot: custom,
      dictionary: buildSearchDictionary(custom),
    };
    const words = createCatalogueSearchService({
      getState: () => state,
      retry: async () => state,
    });
    const word = words.search(params('title=car'));
    if (word.status !== 200) throw new Error('Not ready');
    expect(word.body.data.map((video) => video.id)).toEqual([
      'word_0',
      'word_2',
    ]);
    const phrase = words.search(params('title=car municipal'));
    if (phrase.status !== 200) throw new Error('Not ready');
    expect(phrase.body.data.map((video) => video.id)).toEqual(['word_0']);
    expect(words.search(params('title=municipal car')).status).toBe(400);
    expect(words.search(params('q=car')).body).toMatchObject({
      meta: { total: 3 },
    });
  });

  it('restores selected appellation/title spelling and references through the same page service', () => {
    const result = service.page(
      params('job=I1604&jobTerm=I1604:appellation/garagiste&title=Aïcha'),
    );
    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('Unexpected error');
    expect(result.body.context.criteria.selected).toContainEqual(
      expect.objectContaining({
        category: 'job',
        label: 'Garagiste',
        sourceKey: 'appellation/garagiste',
      }),
    );
    expect(result.body.context.criteria.selected).toContainEqual({
      category: 'title',
      key: 'aicha',
      label: ready.dictionary.titles.find((title) => title.key === 'aicha')!
        .label,
    });
    expect(result.body.context.references.jobs).toBe(snapshot.jobs);
    expect(service.page(params('job=unknown')).status).toBe(400);
  });

  it('preserves legacy substring semantics without accent normalization or regex execution', () => {
    expect(search('q=OMAR').body.data).toEqual(search('title=omar').body.data);
    expect(search('q=mar').body.meta.total).toBeGreaterThan(0);
    expect(search('q=municipal+jardinier').body.meta.total).toBe(0);
    expect(search('q=.*').body.meta.total).toBe(0);
    expect(search('q=Omar&title=hugo').body.meta.total).toBe(0);
    expect(search('q=Aïcha').body.data).toEqual(
      snapshot.videos.filter((v) => v.title.toLowerCase().includes('aïcha')),
    );
  });

  it('normalizes and deduplicates selections while preserving validated selected appellations', () => {
    const result = search(
      'job=I1604&job=I1604&jobTerm=I1604:appellation/garagiste&jobTerm=I1604:appellation/garagiste&title=Omar&title=omar&unrelated=ignored',
    );
    expect(result.criteria.jobs).toEqual(['I1604']);
    expect(result.criteria.titles).toEqual(['omar']);
    expect(result.criteria.jobTerms).toEqual([
      { code: 'I1604', sourceKey: 'appellation/garagiste', label: 'Garagiste' },
    ]);
    expect(search('job=I1604').criteria.jobTerms[0]?.label).toBe(
      fixture.jobs.find((j) => j.code === 'I1604')?.label,
    );
    expect(result.body.data).toEqual(search('job=I1604&title=omar').body.data);
    expect(search('title=Aïcha').criteria.titles).toEqual(['aicha']);
    expect(
      search('title=+&job=+&audience=+&headset=+&q=+').body.meta.total,
    ).toBe(204);
  });

  it.each([
    'job=UNKNOWN',
    'audience=UNKNOWN',
    'headset=UNKNOWN',
    'title=not-a-dictionary-term',
    'title=.*',
    'audience=college&audience=college',
    'headset=pico-4&headset=pico-4',
    'page=1&page=2',
    'q=a&q=b',
    'page=0',
    'page=-1',
    'page=1.5',
    'page=NaN',
    'page=1e2',
    'page=9007199254740992',
    'jobTerm=I1604:appellation/garagiste',
    'job=I1604&jobTerm=I1604:appellation/unknown',
    'job=A1203&jobTerm=A1203:appellation/garagiste',
    'job=I1604&jobTerm=broken',
    'job=I1604&jobTerm=I1604:appellation/garagiste&jobTerm=I1604:label/mecanicien mecanicienne automobile',
  ])('rejects invalid criteria without broadening results: %s', (query) => {
    const result = service.search(params(query));
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      error: 'validation_error',
      message: expect.any(String),
      details: expect.any(Array),
    });
  });

  it('bounds code points, aggregate input and unique criterion count including legacy q', () => {
    expect(
      service.search(new URLSearchParams({ q: '😀'.repeat(120) })).status,
    ).toBe(200);
    expect(
      service.search(new URLSearchParams({ q: '😀'.repeat(121) })).status,
    ).toBe(400);
    const ten = new URLSearchParams(
      ready.dictionary.titles.slice(0, 10).map((t) => ['title', t.key]),
    );
    expect(service.search(ten).status).toBe(200);
    ten.set('q', 'Omar');
    expect(service.search(ten).status).toBe(400);
    const excessive = new URLSearchParams();
    for (let i = 0; i < 1000; i++) excessive.append('job', 'A1203');
    expect(service.search(excessive).status).toBe(400);
    expect(
      service.search(new URLSearchParams({ ignored: 'x'.repeat(9000) })).status,
    ).toBe(200);
  });

  it('suggests up to five global category matches and excludes selected identities', () => {
    const result = service.suggestions(
      params(
        'term=jard&audience=college&headset=pico-4&job=A1203&title=jardinier',
      ),
    );
    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('Not ready');
    expect(result.body.data.length).toBeLessThanOrEqual(5);
    expect(result.body.data.length).toBeGreaterThan(0);
    expect(result.body.data).not.toContainEqual(
      expect.objectContaining({ jobCode: 'A1203' }),
    );
    expect(result.body.data).not.toContainEqual(
      expect.objectContaining({ category: 'title', key: 'jardinier' }),
    );
    const unfiltered = service.suggestions(
      params('term=jard&job=A1203&title=jardinier'),
    );
    if (unfiltered.status !== 200) throw new Error('Not ready');
    expect(result.body.data).toEqual(unfiltered.body.data);
    expect(service.suggestions(params('term=j')).body).toEqual({ data: [] });
    expect(service.suggestions(params('term=.*')).body).toEqual({ data: [] });
    expect(service.suggestions(params('term=a&term=b')).status).toBe(400);
    expect(
      service.suggestions(new URLSearchParams({ term: 'a'.repeat(121) }))
        .status,
    ).toBe(400);
    expect(service.suggestions(params('term=jard&job=unknown')).status).toBe(
      400,
    );
  });
});

describe('shared readiness and manual recovery', () => {
  it('never starts on a search/status call; defers dictionary validation until ready', async () => {
    const runtime = createCataloguePreparation({
      loadSnapshot: async () => snapshot,
      buildDictionary: buildSearchDictionary,
      reportFailure: () => {},
    });
    const cold = createCatalogueSearchService(runtime);
    expect(cold.status().body).toMatchObject({
      status: 'failed',
      canRetry: false,
    });
    expect(runtime.getState().status).toBe('idle');
    const pending = runtime.start();
    expect(cold.status().body).toMatchObject({
      status: 'preparing',
      attempt: 1,
    });
    expect(cold.search(params('title=unknown'))).toMatchObject({
      status: 503,
      retryAfter: 1,
      body: { status: 'preparing' },
    });
    expect(cold.search(params('page=bad')).status).toBe(400);
    await pending;
    expect(cold.status().body).toEqual({ status: 'ready' });
    expect(cold.search(params('title=unknown')).status).toBe(400);
    runtime.shutdown();
    expect(cold.search(params()).body).toMatchObject({
      status: 'failed',
      canRetry: false,
    });
  });

  it('starts one nonblocking recovery cycle and never refreshes ready data', async () => {
    let fail = true;
    const loadSnapshot = vi.fn(async () => {
      if (fail)
        throw new CatalogueClientError({
          kind: 'invalid-response',
          status: 502,
          message: 'private',
        });
      return snapshot;
    });
    const runtime = createCataloguePreparation({
      loadSnapshot,
      buildDictionary: buildSearchDictionary,
      reportFailure: () => {},
    });
    const recovery = createCatalogueSearchService(runtime);
    await runtime.start();
    expect(recovery.search(params())).toMatchObject({
      status: 503,
      body: { status: 'failed', canRetry: true },
    });
    expect(JSON.stringify(recovery.status())).not.toContain('private');
    fail = false;
    expect(recovery.retry().status).toBe(202);
    expect(recovery.retry().status).toBe(202);
    await runtime.retry();
    expect(loadSnapshot).toHaveBeenCalledTimes(2);
    expect(recovery.retry()).toMatchObject({
      status: 200,
      body: { status: 'ready' },
    });
    expect(loadSnapshot).toHaveBeenCalledTimes(2);
    runtime.shutdown();
  });
});
