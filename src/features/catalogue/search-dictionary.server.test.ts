import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { buildSearchDictionary } from '@features/catalogue/search-dictionary.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import { normalizeSearchText } from '@features/catalogue/search-dictionary-rules';
import {
  AudienceSchema,
  HeadsetSchema,
  JobSchema,
  VideoSchema,
} from '@lib/api/schemas';

const raw: unknown = JSON.parse(
  readFileSync(
    new URL('../../../server/data/catalog.json', import.meta.url),
    'utf8',
  ),
);
const fixture = z
  .object({
    jobs: z.array(JobSchema),
    audiences: z.array(AudienceSchema),
    headsets: z.array(HeadsetSchema),
    videos: z.array(
      VideoSchema.extend({ thumbnail_url: z.string().nullable() }),
    ),
  })
  .parse(raw);

function snapshot(
  titles: string[] = [],
  appellations: string[] = [],
): CatalogueSnapshot {
  return {
    videos: titles.map((title, i) => ({
      ...fixture.videos[0]!,
      id: `vid_${i}`,
      title,
    })),
    jobs: {
      source: 'test',
      data: [{ ...fixture.jobs[0]!, label: 'Métier exemple', appellations }],
    },
    audiences: { data: fixture.audiences },
    headsets: { data: fixture.headsets },
  };
}

const catalogue: CatalogueSnapshot = {
  videos: fixture.videos,
  jobs: { source: 'fixture', data: fixture.jobs },
  audiences: { data: fixture.audiences },
  headsets: { data: fixture.headsets },
};

describe('deterministic search dictionary', () => {
  it('keeps Omar and useful phrases, excluding stop words and phrases across punctuation', () => {
    const dictionary = buildSearchDictionary(
      snapshot(['Une journée avec Omar, jardinier municipal']),
    );
    expect(dictionary.version).toBe(1);
    expect(
      dictionary.titles.map((entry) => [
        entry.key,
        entry.label,
        entry.videoIds,
      ]),
    ).toEqual([
      ['jardinier', 'jardinier', ['vid_0']],
      ['jardinier municipal', 'jardinier municipal', ['vid_0']],
      ['municipal', 'municipal', ['vid_0']],
      ['omar', 'Omar', ['vid_0']],
    ]);
    expect(
      dictionary.titles.find((entry) => entry.key === 'omar')?.sources,
    ).toEqual([{ videoId: 'vid_0', text: 'Omar', start: 17, end: 21 }]);
  });

  it('preserves internal connectors, compounds, acronyms and places without arbitrary word-length filtering', () => {
    const dictionary = buildSearchDictionary(
      snapshot([
        "Hugo, entretien d'espaces verts à Lille",
        'Aïcha, aide-boulangère ASV VL SI 3D',
        'Manœuvre; cœur: æther',
      ]),
    );
    const entries = new Map(
      dictionary.titles.map((entry) => [entry.key, entry]),
    );
    for (const key of [
      'hugo',
      'aicha',
      'lille',
      'entretien d espaces verts',
      'aide boulangere',
      'asv',
      'vl',
      'si',
      '3d',
      'manoeuvre',
      'coeur',
      'aether',
    ]) {
      expect(entries.has(key), key).toBe(true);
    }
    expect(entries.get('aide boulangere')?.label).toBe('aide-boulangère');
    expect(entries.has('lille aicha')).toBe(false);
    expect(entries.has('manoeuvre coeur')).toBe(false);
    expect(normalizeSearchText('  Équipe d’ASV — cœur  ')).toBe(
      'equipe d asv coeur',
    );
  });

  it('limits phrases to four tokens and never removes connectors from a phrase', () => {
    const dictionary = buildSearchDictionary(
      snapshot([
        'agent de soins aux animaux',
        'Devenir aide de cuisine',
        'une journée de nuit',
      ]),
    );
    const keys = dictionary.titles.map((entry) => entry.key);
    expect(keys).toContain('agent de soins');
    expect(keys).not.toContain('agent soins');
    expect(keys).not.toContain('agent de soins aux animaux');
    expect(keys).not.toContain('journee de nuit');
    expect(keys).not.toContain('devenir aide');
    expect(keys).toContain('aide de cuisine');
    expect(keys).not.toContain('a');
  });

  it('retains every occurrence and chooses spelling by video ID then source occurrence', () => {
    const input = snapshot(['Aïcha, aicha', 'AICHA']);
    const result = buildSearchDictionary(input).titles.find(
      (entry) => entry.key === 'aicha',
    );
    expect(result?.label).toBe('Aïcha');
    expect(result?.videoIds).toEqual(['vid_0', 'vid_1']);
    expect(result?.sources).toHaveLength(3);
  });

  it('preserves distinct appellation and label keys and resolves vocabulary to all parent jobs', () => {
    const input = snapshot(
      [],
      ['Garagiste', 'GARAGISTE', 'Garagiste-mécanicien'],
    );
    const first = input.jobs.data[0]!;
    const dictionary = buildSearchDictionary({
      ...input,
      jobs: {
        ...input.jobs,
        data: [
          { ...first, code: 'I1604', label: 'Garagiste' },
          {
            ...first,
            code: 'I1607',
            label: 'Autre métier',
            appellations: ['Garagiste'],
          },
        ],
      },
    });
    const job = dictionary.jobs.find((entry) => entry.code === 'I1604');
    expect(
      job?.sources.find((source) => source.key === 'appellation/garagiste'),
    ).toMatchObject({
      label: 'GARAGISTE',
      originals: ['GARAGISTE', 'Garagiste'],
      kind: 'appellation',
    });
    expect(
      job?.sources.some((source) => source.key === 'label/garagiste'),
    ).toBe(true);
    expect(
      job?.sources.some(
        (source) => source.key === 'appellation/garagiste mecanicien',
      ),
    ).toBe(true);
    expect(
      dictionary.jobTerms.find((term) => term.key === 'garagiste')?.jobCodes,
    ).toEqual(['I1604', 'I1607']);
  });

  it('expands compact notation into two coherent forms without suffix noise or mixed-gender compounds', () => {
    const dictionary = buildSearchDictionary(
      snapshot(
        [],
        [
          'Boulanger(ère)-pâtissier(ère)-traiteur(se)',
          'Conducteur(trice) de machines en industrie alimentaire',
          'Electricien(ne) de maintenance itinérant(e)',
          'Auxiliaire vétérinaire (ASV)',
        ],
      ),
    );
    const terms = dictionary.jobTerms.map((entry) => entry.key);
    for (const key of [
      'boulanger',
      'boulangere',
      'patissiere',
      'traiteuse',
      'conductrice',
      'electricienne',
      'itinerante',
      'asv',
    ])
      expect(terms).toContain(key);
    for (const key of [
      'ere',
      'trice',
      'ne',
      'se',
      'boulanger patissiere traiteur',
    ])
      expect(terms).not.toContain(key);
    expect(terms).toContain('boulanger patissier traiteur');
    expect(terms).toContain('boulangere patissiere traiteuse');
    expect(terms).toContain('conductrice de machines en industrie alimentaire');
    expect(dictionary.diagnostics).toEqual([]);
  });

  it('reports unsupported compact suffixes without inventing an expansion or indexing the suffix', () => {
    const dictionary = buildSearchDictionary(
      snapshot([], ['Pilote(zzz) de drone']),
    );
    expect(dictionary.diagnostics).toEqual([
      {
        code: 'unsupported-gender-notation',
        jobCode: 'A1203',
        sourceKey: 'appellation/pilote zzz de drone',
        notation: 'Pilote(zzz)',
      },
    ]);
    expect(dictionary.jobTerms.map((term) => term.key)).not.toContain('zzz');
    expect(dictionary.jobTerms.map((term) => term.key)).toContain('pilote');
  });

  it('does not infer titles, synonyms, morphology or descriptions from job vocabulary', () => {
    const dictionary = buildSearchDictionary(
      snapshot(['Boulangère, voiture'], ['Garagiste']),
    );
    expect(dictionary.titles.map((entry) => entry.key)).not.toContain(
      'garagiste',
    );
    expect(dictionary.titles.map((entry) => entry.key)).not.toContain(
      'boulanger',
    );
    expect(dictionary.jobTerms.map((entry) => entry.key)).not.toContain(
      'voiture',
    );
    expect(dictionary.titles.map((entry) => entry.key)).not.toContain(
      'immersion',
    );
    expect(
      buildSearchDictionary({
        ...catalogue,
        videos: [],
        jobs: { source: 'empty', data: [] },
      }),
    ).toEqual({
      version: 1,
      titles: [],
      jobs: [],
      jobTerms: [],
      diagnostics: [],
    });
  });

  it('builds the actual catalogue reproducibly without mutation, clock or randomness', () => {
    const before = JSON.stringify(catalogue);
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('No clock');
    });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('No randomness');
    });
    try {
      const first = buildSearchDictionary(catalogue);
      const shuffled = {
        ...catalogue,
        videos: [...catalogue.videos].reverse(),
        jobs: {
          ...catalogue.jobs,
          data: catalogue.jobs.data
            .map((job) => ({
              ...job,
              appellations: [...job.appellations].reverse(),
            }))
            .reverse(),
        },
      };
      expect(JSON.stringify(buildSearchDictionary(shuffled))).toBe(
        JSON.stringify(first),
      );
      expect(JSON.stringify(buildSearchDictionary(catalogue))).toBe(
        JSON.stringify(first),
      );
      expect(JSON.stringify(catalogue)).toBe(before);
      expect(first.jobs).toHaveLength(55);
      expect(first.diagnostics).toEqual([]);
      expect(
        first.titles.find((term) => term.key === 'omar')?.videoIds,
      ).toContain('vid_001');
      expect(
        first.jobTerms.find((term) => term.key === 'garagiste')?.jobCodes,
      ).toContain('I1604');
      for (const entry of first.titles)
        for (const occurrence of entry.sources) {
          const video = catalogue.videos.find(
            (video) => video.id === occurrence.videoId,
          )!;
          expect(video.title.slice(occurrence.start, occurrence.end)).toBe(
            occurrence.text,
          );
          expect(normalizeSearchText(occurrence.text)).toBe(entry.key);
        }
      for (const entry of first.jobTerms)
        for (const source of entry.sources) {
          const original = first.jobs
            .find((job) => job.code === source.jobCode)
            ?.sources.find((item) => item.key === source.sourceKey);
          expect(original?.expressions).toContain(entry.key);
        }
    } finally {
      clock.mockRestore();
      random.mockRestore();
    }
  });
});
