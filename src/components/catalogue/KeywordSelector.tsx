import { Combobox } from '@base-ui/react/combobox';
import {
  BriefcaseIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useId, useImperativeHandle, useRef, useState, type Ref } from 'react';

import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { normalizeSearchText } from '@features/catalogue/search-dictionary-rules';
import type { KeywordSuggestion } from '@features/catalogue/keyword-suggestions';
import { useKeywordSuggestions } from '@features/catalogue/use-keyword-suggestions';

interface KeywordSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  selected: readonly KeywordSuggestion[];
  onSelect: (item: KeywordSuggestion) => void;
  audience?: string;
  headset?: string;
  legacyQuery?: string;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  error?: string;
}

/** A controlled, add-one selector. The parent owns pending chips and submission. */
export function KeywordSelector({
  value,
  onValueChange,
  selected,
  onSelect,
  audience,
  headset,
  legacyQuery,
  inputRef,
  disabled = false,
  error,
}: KeywordSelectorProps) {
  const id = useId();
  const inputElement = useRef<HTMLInputElement>(null);
  useImperativeHandle(inputRef, () => inputElement.current!);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const count =
    new Set(selected.map((item) => `${item.category}:${item.key}`)).size +
    Number(Boolean(legacyQuery));
  const limit = count >= 10;
  const eligible =
    Array.from(normalizeSearchText(value).replaceAll(' ', '')).length >= 2;
  const tooLong = Array.from(value).length > 120;
  const remote = useKeywordSuggestions(
    { term: value, selected, audience, headset, legacyQuery },
    !disabled && !limit && open,
  );
  const items = remote.items.filter(
    (item) =>
      !selected.some(
        (chosen) =>
          chosen.category === item.category && chosen.key === item.key,
      ),
  );
  const message =
    error ??
    (limit
      ? 'Dix critères sélectionnés. Retirez un critère pour en ajouter un autre.'
      : tooLong
        ? 'Utilisez au maximum 120 caractères.'
        : remote.preparing
          ? 'Le catalogue est en cours de préparation.'
          : remote.loading
            ? 'Chargement des suggestions…'
            : remote.error
              ? 'Les suggestions sont indisponibles. Réessayez.'
              : open && eligible && items.length === 0
                ? 'Aucune suggestion. Essayez un autre terme.'
                : items.length > 0
                  ? `${items.length} suggestions disponibles. Utilisez les flèches pour choisir.`
                  : 'Saisissez au moins deux caractères, puis choisissez une suggestion.');
  return (
    <div data-slot="keyword-selector" className="min-w-0 space-y-2">
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <BriefcaseIcon aria-hidden="true" className="size-4 shrink-0" />
        <MagnifyingGlassIcon aria-hidden="true" className="size-4 shrink-0" />
        Métiers ou mots-clés
      </label>
      <Combobox.Root<KeywordSuggestion>
        items={items}
        filter={null}
        value={null}
        inputValue={value}
        autoHighlight={false}
        open={
          open &&
          eligible &&
          !tooLong &&
          !limit &&
          !disabled &&
          items.length > 0
        }
        onOpenChange={setOpen}
        onInputValueChange={(text, details) => {
          if (details.reason === 'input-change') {
            onValueChange(text);
            setOpen(true);
            setAnnouncement('');
          }
        }}
        onValueChange={(item) => {
          if (
            !item ||
            limit ||
            selected.some(
              (chosen) =>
                chosen.category === item.category && chosen.key === item.key,
            )
          )
            return;
          onSelect(item);
          onValueChange('');
          setOpen(false);
          setAnnouncement(
            `${item.label}, ${item.category === 'job' ? 'métier' : 'titre de vidéo'}, ajouté aux critères.`,
          );
        }}
      >
        <Combobox.Input
          ref={inputElement}
          id={id}
          aria-labelledby={`${id}-label`}
          render={<Input />}
          disabled={disabled}
          aria-describedby={`${id}-help ${id}-selected`}
          aria-invalid={Boolean(error || tooLong)}
          placeholder="Ex. : jardinier, Omar…"
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.nativeEvent.isComposing &&
              value.trim()
            )
              event.preventDefault();
          }}
        />
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={6}
            className="keyword-suggestions-positioner z-50"
          >
            <Combobox.Popup className="border-border bg-popover text-popover-foreground overflow-hidden rounded-md border shadow-md">
              <Combobox.List className="keyword-suggestions-list overflow-y-auto p-1">
                <KeywordSuggestionGroups items={items} />
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <p
        id={`${id}-help`}
        role="status"
        className="text-muted-foreground text-sm wrap-anywhere"
      >
        {announcement || message}
      </p>
      <span id={`${id}-selected`} className="sr-only">
        {count} critère{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''},
        dix maximum.
      </span>
      {remote.error && remote.canRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            inputElement.current?.focus();
            remote.retry();
          }}
          disabled={remote.loading}
        >
          Réessayer les suggestions
        </Button>
      )}
    </div>
  );
}

const groups = [
  { category: 'job', label: 'Métier', icon: BriefcaseIcon },
  { category: 'title', label: 'Titre de vidéo', icon: MagnifyingGlassIcon },
] as const;

function KeywordSuggestionGroups({
  items,
}: {
  items: readonly KeywordSuggestion[];
}) {
  return (
    <>
      {groups.map((group) => {
        const groupItems = items.filter(
          (item) => item.category === group.category,
        );
        return groupItems.length > 0 ? (
          <Combobox.Group key={group.category}>
            <Combobox.GroupLabel className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs font-semibold">
              <group.icon aria-hidden="true" className="size-4 shrink-0" />
              {group.label}
            </Combobox.GroupLabel>
            {groupItems.map((item) => (
              <Combobox.Item
                key={`${item.category}:${item.key}`}
                value={item}
                className="data-highlighted:bg-accent data-highlighted:text-accent-foreground flex min-h-12 cursor-pointer flex-col justify-center rounded-sm px-3 py-2 text-sm wrap-anywhere data-highlighted:outline-none"
              >
                <span>{item.label}</span>
                {item.category === 'job' && item.jobLabel !== item.label && (
                  <span className="text-muted-foreground text-xs">
                    {item.jobLabel}
                  </span>
                )}
              </Combobox.Item>
            ))}
          </Combobox.Group>
        ) : null;
      })}
    </>
  );
}
