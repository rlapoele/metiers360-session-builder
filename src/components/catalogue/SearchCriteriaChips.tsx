import {
  BriefcaseIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useId, useRef, useState } from 'react';

import { Button } from '@components/ui/button';
import type { CatalogueReferences } from '@features/catalogue/api';
import {
  keywordIdentity,
  orderedKeywords,
  type SearchFormCriteria,
} from '@features/catalogue/search-form';

export type ChipRemoval =
  | { category: 'audience' | 'headset' | 'legacy' }
  | { category: 'keyword'; identity: string };
interface Props {
  criteria: SearchFormCriteria;
  references?: Pick<CatalogueReferences, 'audiences' | 'headsets'>;
  disabled?: boolean;
  hasUnselectedText?: boolean;
  onRemove: (removal: ChipRemoval) => void;
  onClear: () => void;
}

/** Reveal is an inline disclosure: no hover-only text or clipped focus rings. */
export function SearchCriteriaChips({
  criteria,
  references,
  disabled,
  hasUnselectedText,
  onRemove,
  onClear,
}: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState<string>();
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const chips = [
    ...(criteria.audience
      ? [
          {
            key: 'audience',
            type: 'Public',
            label:
              references?.audiences.data.find(
                (item) => item.id === criteria.audience,
              )?.label ?? criteria.audience,
            icon: UserGroupIcon,
            removal: { category: 'audience' as const },
          },
        ]
      : []),
    ...orderedKeywords(criteria.selected).map((item) => ({
      key: keywordIdentity(item),
      type: item.category === 'job' ? 'Métier' : 'Titre de vidéo',
      label: item.label,
      icon: item.category === 'job' ? BriefcaseIcon : MagnifyingGlassIcon,
      removal: {
        category: 'keyword' as const,
        identity: keywordIdentity(item),
      },
    })),
    ...(criteria.legacyQuery
      ? [
          {
            key: 'legacy',
            type: 'Recherche par titre',
            label: criteria.legacyQuery,
            icon: MagnifyingGlassIcon,
            removal: { category: 'legacy' as const },
          },
        ]
      : []),
    ...(criteria.headset
      ? [
          {
            key: 'headset',
            type: 'Casque VR',
            label:
              references?.headsets.data.find(
                (item) => item.id === criteria.headset,
              )?.name ?? criteria.headset,
            icon: EyeIcon,
            removal: { category: 'headset' as const },
          },
        ]
      : []),
  ];
  const active = chips.find((chip) => chip.key === revealed);
  function closeReveal() {
    const key = revealed;
    setRevealed(undefined);
    if (key) triggers.current.get(key)?.focus();
  }
  return (
    <div
      className="min-w-0 space-y-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && active) {
          event.preventDefault();
          closeReveal();
        }
      }}
    >
      {chips.length > 0 && (
        <>
          <ul
            aria-label="Critères sélectionnés"
            className="flex min-w-0 flex-wrap gap-2"
          >
            {chips.map((chip) => (
              <li
                key={chip.key}
                className="border-border bg-secondary flex min-h-9 min-w-0 max-w-full items-center rounded-full border"
              >
                <button
                  type="button"
                  ref={(element) => {
                    if (element) triggers.current.set(chip.key, element);
                    else triggers.current.delete(chip.key);
                  }}
                  disabled={disabled}
                  aria-label={`Afficher le libellé complet du critère ${chip.type} : ${chip.label}`}
                  aria-expanded={active?.key === chip.key}
                  aria-controls={
                    active?.key === chip.key ? `${id}-full-label` : undefined
                  }
                  onClick={() =>
                    setRevealed((current) =>
                      current === chip.key ? undefined : chip.key,
                    )
                  }
                  className="hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-l-full px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <chip.icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 truncate">{chip.label}</span>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={`Retirer le critère ${chip.type} : ${chip.label}`}
                  className="size-8 rounded-full"
                  onClick={() => {
                    setRevealed(undefined);
                    onRemove(chip.removal);
                  }}
                >
                  <XMarkIcon aria-hidden="true" className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          {active && (
            <div
              id={`${id}-full-label`}
              role="region"
              aria-label="Libellé complet du critère"
              className="border-border bg-card min-w-0 space-y-2 rounded-md border p-3"
            >
              <p className="text-sm wrap-anywhere">
                <span className="font-semibold">{active.type} : </span>
                {active.label}
              </p>
              {active.key === 'legacy' && (
                <p className="text-muted-foreground text-sm">
                  Recherche historique : le titre doit contenir ce texte exact,
                  sans distinction de casse.
                </p>
              )}
              <Button type="button" variant="outline" onClick={closeReveal}>
                Fermer le libellé complet
              </Button>
            </div>
          )}
        </>
      )}
      {(chips.length > 0 || hasUnselectedText) && (
        <Button
          type="button"
          variant="link"
          disabled={disabled}
          className="max-w-full px-0 whitespace-normal"
          onClick={() => {
            setRevealed(undefined);
            onClear();
          }}
        >
          Effacer tous les critères
        </Button>
      )}
      <p className="text-muted-foreground text-sm">
        Au moins un métier sélectionné doit correspondre. Tous les mots-clés de
        titre et les autres critères doivent correspondre.
      </p>
    </div>
  );
}
