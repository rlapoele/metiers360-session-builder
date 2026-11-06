// Canonical editorial contract: ../../../docs/search-dictionary-rules.md (v1).
export const DICTIONARY_RULE_VERSION = 1;

export const STOP_WORDS: ReadonlySet<string> = new Set([
  'a',
  'au',
  'aux',
  'avec',
  'ce',
  'ces',
  'cette',
  'd',
  'dans',
  'de',
  'des',
  'du',
  'elle',
  'elles',
  'en',
  'et',
  'il',
  'ils',
  'je',
  'l',
  'la',
  'le',
  'les',
  'leur',
  'leurs',
  'ne',
  'nos',
  'notre',
  'on',
  'ou',
  'par',
  'pas',
  'pour',
  'qu',
  'que',
  'qui',
  'sa',
  'se',
  'ses',
  'son',
  'sur',
  'un',
  'une',
  'vos',
  'votre',
  'journee',
  'devenir',
]);

// Only expand notation actually reviewed in the catalogue. These are whole
// word forms, not suffix-concatenation guesses (pâtissier + ère is incorrect).
const GENDER_EXPANSIONS = [
  ['boulanger(ère)', 'boulanger', 'boulangère'],
  ['pâtissier(ère)', 'pâtissier', 'pâtissière'],
  ['traiteur(se)', 'traiteur', 'traiteuse'],
  ['conducteur(trice)', 'conducteur', 'conductrice'],
  ['electricien(ne)', 'electricien', 'electricienne'],
  ['itinérant(e)', 'itinérant', 'itinérante'],
  ['technicien(ne)', 'technicien', 'technicienne'],
  ['médical(e)', 'médical', 'médicale'],
  ['assistant(e)', 'assistant', 'assistante'],
  ['gardien(ne)', 'gardien', 'gardienne'],
  ['principal(e)', 'principal', 'principale'],
  ['opérateur(trice)', 'opérateur', 'opératrice'],
  ['programmeur(se)', 'programmeur', 'programmeuse'],
  ['administrateur(trice)', 'administrateur', 'administratrice'],
  ['chef(fe)', 'chef', 'cheffe'],
  ['maquilleur(se)', 'maquilleur', 'maquilleuse'],
  ['posticheur(se)', 'posticheur', 'posticheuse'],
] as const;

function foldText(value: string) {
  return value
    .normalize('NFD')
    .toLowerCase()
    .replace(/\p{M}/gu, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

export function normalizeSearchText(value: string): string {
  return foldText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left, (letter) => letter.codePointAt(0)!);
  const b = Array.from(right, (letter) => letter.codePointAt(0)!);
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return a.length - b.length;
}

const collator = new Intl.Collator('fr', {
  usage: 'sort',
  sensitivity: 'base',
  numeric: false,
  ignorePunctuation: false,
  caseFirst: 'false',
});
export function compareFrench(left: string, right: string): number {
  return collator.compare(left, right) || compareCodePoints(left, right);
}

export function expandJobNotation(text: string) {
  const unsupported = new Set<string>();
  const variants = [1, 2].map((gender) =>
    text.replace(
      /([\p{L}\p{M}]+)\(([\p{L}\p{M}]+)\)/gu,
      (notation: string, base: string, suffix: string) => {
        const expansion = GENDER_EXPANSIONS.find(
          ([pattern]) => foldText(pattern) === foldText(notation),
        );
        if (expansion) return gender === 1 ? expansion[1] : expansion[2];
        if (suffix === suffix.toUpperCase()) return notation; // Acronym, not gender notation.
        unsupported.add(notation);
        return base; // Retain the supplied base without indexing an unknown suffix.
      },
    ),
  );
  return {
    variants: [...new Set(variants)],
    unsupported: [...unsupported].sort(compareCodePoints),
  };
}

export function extractSearchTerms(text: string) {
  const terms: { key: string; label: string; start: number; end: number }[] =
    [];
  // A phrase never crosses a comma, slash, parenthesis or sentence boundary.
  for (const segment of text.matchAll(/[^,.:;/()[\]{}!?…\r\n]+/gu)) {
    const tokens = [...segment[0].matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(
      (token) => ({
        key: normalizeSearchText(token[0]),
        start: segment.index + token.index,
        end: segment.index + token.index + token[0].length,
      }),
    );
    for (let first = 0; first < tokens.length; first += 1) {
      const start = tokens[first]!;
      if (!start.key || STOP_WORDS.has(start.key)) continue;
      for (
        let length = 1;
        length <= 4 && first + length <= tokens.length;
        length += 1
      ) {
        const words = tokens.slice(first, first + length);
        const last = words.at(-1)!;
        if (STOP_WORDS.has(last.key)) continue;
        if (
          length > 1 &&
          (words.filter((word) => !STOP_WORDS.has(word.key)).length < 2 ||
            words.some(
              (word) => word.key === 'journee' || word.key === 'devenir',
            ))
        )
          continue;
        terms.push({
          key: words.map((word) => word.key).join(' '),
          label: text.slice(start.start, last.end),
          start: start.start,
          end: last.end,
        });
      }
    }
  }
  return terms;
}
