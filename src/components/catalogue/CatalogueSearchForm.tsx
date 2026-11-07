import { EyeIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useEffect, useId, useRef, useState } from 'react';

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
  type SearchAvailabilityState,
} from '@features/catalogue/search-form';

interface Props {
  criteria: SearchFormCriteria;
  references?: Pick<CatalogueReferences, 'audiences' | 'headsets'>;
  availability?: SearchAvailabilityState;
  focusOnReady?: boolean;
  onChange: (criteria: SearchFormCriteria) => void;
  disabled?: boolean;
  /** Reset temporary text/disclosures on history restoration or explicit URL repair. */
  resetKey?: string;
}
export function CatalogueSearchForm(props: Props) {
  return <SearchFormContent key={props.resetKey ?? ''} {...props} />;
}
function SearchFormContent({
  criteria,
  references,
  availability = {
    loading: false,
    error: false,
    canRetry: false,
    retry: () => {},
  },
  onChange,
  focusOnReady = false,
  disabled = false,
}: Props) {
  const id = useId();
  function commit(next: SearchFormCriteria) {
    if (
      !disabled &&
      formCriteriaIdentity(next) !== formCriteriaIdentity(criteria)
    )
      onChange({ ...next, selected: orderedKeywords(next.selected) });
  }
  const optionInfo = availability.current ?? availability.previous;
  function optionState(group: 'audiences' | 'headsets', key: string) {
    const info = optionInfo?.[group].find((item) => item.id === key);
    const unavailable = info?.available === false;
    return {
      disabled: Boolean(availability.current && unavailable),
      suffix: unavailable
        ? availability.current
          ? ' — Aucune vidéo avec ces critères'
          : ' — Aucune vidéo avec les critères précédents'
        : '',
    };
  }
  const [text, setText] = useState('');
  const audienceRef = useRef<HTMLSelectElement>(null);
  const headsetRef = useRef<HTMLSelectElement>(null);
  const keywordRef = useRef<HTMLInputElement>(null);
  const focusedAfterRepair = useRef(false);
  useEffect(() => {
    if (focusOnReady && !disabled && !focusedAfterRepair.current) {
      audienceRef.current?.focus();
      focusedAfterRepair.current = true;
    }
  }, [focusOnReady, disabled]);
  function remove(removal: ChipRemoval) {
    if (removal.category === 'keyword') {
      commit({
        ...criteria,
        selected: criteria.selected.filter(
          (item) => keywordIdentity(item) !== removal.identity,
        ),
      });
      keywordRef.current?.focus();
    } else if (removal.category === 'legacy') {
      commit({ ...criteria, legacyQuery: undefined });
      keywordRef.current?.focus();
    } else {
      commit({ ...criteria, [removal.category]: undefined });
      const control = (
        removal.category === 'audience' ? audienceRef : headsetRef
      ).current;
      if (control && !control.disabled) control.focus();
      else keywordRef.current?.focus();
    }
  }
  function clear() {
    commit({ selected: [] });
    setText('');
    if (audienceRef.current && !audienceRef.current.disabled)
      audienceRef.current.focus();
    else keywordRef.current?.focus();
  }
  return (
    <form
      role="search"
      aria-label="Rechercher des vidéos"
      onSubmit={(event) => event.preventDefault()}
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
            value={criteria.audience ?? ''}
            disabled={disabled || !references}
            aria-describedby={`${id}-availability`}
            onChange={(event) => {
              const value = event.currentTarget.value;
              commit({
                ...criteria,
                audience: value || undefined,
              });
            }}
          >
            <NativeSelectOption value="">Tous les publics</NativeSelectOption>
            {references?.audiences.data.map((item) => (
              <NativeSelectOption
                key={item.id}
                value={item.id}
                disabled={optionState('audiences', item.id).disabled}
              >
                {item.label}
                {optionState('audiences', item.id).suffix}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="search-form-keywords min-w-0">
          <KeywordSelector
            value={text}
            onValueChange={(value) => {
              setText(value);
            }}
            selected={criteria.selected}
            onSelect={(item) => {
              commit(addKeyword(criteria, item));
            }}
            audience={criteria.audience}
            headset={criteria.headset}
            legacyQuery={criteria.legacyQuery}
            inputRef={keywordRef}
            disabled={disabled}
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
            value={criteria.headset ?? ''}
            disabled={disabled || !references}
            aria-describedby={`${id}-availability`}
            onChange={(event) => {
              const value = event.currentTarget.value;
              commit({
                ...criteria,
                headset: value || undefined,
              });
            }}
          >
            <NativeSelectOption value="">Tous les casques</NativeSelectOption>
            {references?.headsets.data.map((item) => (
              <NativeSelectOption
                key={item.id}
                value={item.id}
                disabled={optionState('headsets', item.id).disabled}
              >
                {item.name}
                {optionState('headsets', item.id).suffix}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        <p
          id={`${id}-availability`}
          role="status"
          className="text-muted-foreground text-sm wrap-anywhere"
        >
          {disabled
            ? 'Les critères ne sont pas encore disponibles.'
            : availability.loading
              ? 'Recherche en cours. Mise à jour de la disponibilité. Les indications précédentes sont provisoires ; les options restent sélectionnables.'
              : availability.error
                ? 'La disponibilité ne peut pas être actualisée. Les indications précédentes sont provisoires ; les options restent sélectionnables.'
                : 'Les options sans vidéo avec ces critères sont indisponibles.'}
        </p>
        {availability.error && availability.canRetry && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              audienceRef.current?.focus();
              availability.retry();
            }}
          >
            Réessayer la disponibilité
          </Button>
        )}
      </div>
      <SearchCriteriaChips
        criteria={criteria}
        hasUnselectedText={Boolean(text)}
        references={references}
        disabled={disabled}
        onRemove={remove}
        onClear={clear}
      />
    </form>
  );
}
