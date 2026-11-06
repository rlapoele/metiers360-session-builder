import { EyeIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useId, useRef, useState, type FormEvent } from 'react';

import { Button } from '@components/ui/button';
import { NativeSelect, NativeSelectOption } from '@components/ui/native-select';
import { KeywordSelector } from '@components/catalogue/KeywordSelector';
import {
  SearchCriteriaChips,
  type ChipRemoval,
} from '@components/catalogue/SearchCriteriaChips';
import type { CatalogueReferences } from '@features/catalogue/api';
import {
  addKeyword,
  formCriteriaIdentity,
  keywordIdentity,
  orderedKeywords,
  type SearchFormCriteria,
} from '@features/catalogue/search-form';

interface Props {
  applied: SearchFormCriteria;
  references?: Pick<CatalogueReferences, 'audiences' | 'headsets'>;
  onSubmit: (criteria: SearchFormCriteria) => void;
  disabled?: boolean;
  /** Future history/page restoration can reset pending edits even if criteria are equal. */
  resetKey?: string;
}
export function CatalogueSearchForm(props: Props) {
  return (
    <SearchFormContent
      key={`${props.resetKey ?? ''}:${formCriteriaIdentity(props.applied)}`}
      {...props}
    />
  );
}
function SearchFormContent({
  applied,
  references,
  onSubmit,
  disabled = false,
}: Props) {
  const id = useId();
  const [pending, setPending] = useState<SearchFormCriteria>(() => ({
    ...applied,
    selected: [...applied.selected],
  }));
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const audienceRef = useRef<HTMLSelectElement>(null);
  const headsetRef = useRef<HTMLSelectElement>(null);
  const keywordRef = useRef<HTMLInputElement>(null);
  const modified =
    formCriteriaIdentity(pending) !== formCriteriaIdentity(applied);
  function remove(removal: ChipRemoval) {
    if (removal.category === 'keyword') {
      setPending((current) => ({
        ...current,
        selected: current.selected.filter(
          (item) => keywordIdentity(item) !== removal.identity,
        ),
      }));
      keywordRef.current?.focus();
    } else if (removal.category === 'legacy') {
      setPending((current) => ({ ...current, legacyQuery: undefined }));
      keywordRef.current?.focus();
    } else {
      setPending((current) => ({ ...current, [removal.category]: undefined }));
      const control = (
        removal.category === 'audience' ? audienceRef : headsetRef
      ).current;
      if (control && !control.disabled) control.focus();
      else keywordRef.current?.focus();
    }
  }
  function clear() {
    setPending({ selected: [] });
    setText('');
    setError(undefined);
    if (audienceRef.current && !audienceRef.current.disabled)
      audienceRef.current.focus();
    else keywordRef.current?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    if (text.trim()) {
      setError(
        'Choisissez une suggestion ou effacez le texte avant de rechercher.',
      );
      keywordRef.current?.focus();
      return;
    }
    setError(undefined);
    onSubmit({ ...pending, selected: orderedKeywords(pending.selected) });
  }
  return (
    <form
      role="search"
      aria-label="Rechercher des vidéos"
      onSubmit={submit}
      className="catalogue-search-form min-w-0 space-y-4"
    >
      <div className="catalogue-search-fields grid min-w-0 items-start gap-4">
        <div className="search-form-audience min-w-0 space-y-2">
          <label
            htmlFor={`${id}-audience`}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <UserGroupIcon aria-hidden="true" className="size-4 shrink-0" />
            Public
          </label>
          <NativeSelect
            ref={audienceRef}
            id={`${id}-audience`}
            value={pending.audience ?? ''}
            disabled={disabled || !references}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setPending((current) => ({
                ...current,
                audience: value || undefined,
              }));
            }}
          >
            <NativeSelectOption value="">Tous les publics</NativeSelectOption>
            {references?.audiences.data.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="search-form-keywords min-w-0">
          <KeywordSelector
            value={text}
            onValueChange={(value) => {
              setText(value);
              setError(undefined);
            }}
            selected={pending.selected}
            onSelect={(item) => {
              setPending((current) => addKeyword(current, item));
              setError(undefined);
            }}
            audience={pending.audience}
            headset={pending.headset}
            legacyQuery={pending.legacyQuery}
            inputRef={keywordRef}
            disabled={disabled}
            error={error}
          />
        </div>
        <div className="search-form-headset min-w-0 space-y-2">
          <label
            htmlFor={`${id}-headset`}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <EyeIcon aria-hidden="true" className="size-4 shrink-0" />
            Casque VR
          </label>
          <NativeSelect
            ref={headsetRef}
            id={`${id}-headset`}
            value={pending.headset ?? ''}
            disabled={disabled || !references}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setPending((current) => ({
                ...current,
                headset: value || undefined,
              }));
            }}
          >
            <NativeSelectOption value="">Tous les casques</NativeSelectOption>
            {references?.headsets.data.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <Button
          type="submit"
          disabled={disabled}
          className="search-form-submit w-full"
        >
          Rechercher
        </Button>
      </div>
      <SearchCriteriaChips
        criteria={pending}
        hasUnselectedText={Boolean(text)}
        references={references}
        disabled={disabled}
        onRemove={remove}
        onClear={clear}
      />
      <p role="status" className="text-muted-foreground text-sm">
        {modified
          ? 'Critères modifiés — lancez la recherche pour les appliquer.'
          : ''}
      </p>
    </form>
  );
}
