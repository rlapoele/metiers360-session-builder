import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

import type { CatalogueReferences } from '../../features/catalogue/api';
import type { CatalogueQuery } from '../../features/catalogue/query-params';

type FilterValues = Pick<CatalogueQuery, 'job' | 'headset' | 'audience'>;

interface CatalogueFiltersProps {
  query: CatalogueQuery;
  references?: CatalogueReferences;
  disabled: boolean;
  onChange: (update: Partial<CatalogueQuery>) => void;
}

const filterFields = [
  { key: 'job', label: 'Métier' },
  { key: 'headset', label: 'Casque VR' },
  { key: 'audience', label: 'Public' },
] as const;

function FilterSelects({
  idPrefix,
  values,
  references,
  disabled,
  onChange,
}: {
  idPrefix: string;
  values: FilterValues;
  references?: CatalogueReferences;
  disabled: boolean;
  onChange: (key: keyof FilterValues, value: string) => void;
}) {
  const options = {
    job: references?.jobs.data.map((job) => ({
      value: job.code,
      label: job.label,
    })),
    headset: references?.headsets.data.map((headset) => ({
      value: headset.id,
      label: headset.name,
    })),
    audience: references?.audiences.data.map((audience) => ({
      value: audience.id,
      label: audience.label,
    })),
  };

  return filterFields.map(({ key, label }) => (
    <div key={key} className="space-y-2">
      <label htmlFor={`${idPrefix}-${key}`} className="text-sm font-semibold">
        {label}
      </label>
      <NativeSelect
        id={`${idPrefix}-${key}`}
        value={values[key]}
        disabled={disabled}
        onChange={(event) => onChange(key, event.currentTarget.value)}
      >
        <NativeSelectOption value="">
          {key === 'job'
            ? 'Tous les métiers'
            : key === 'headset'
              ? 'Tous les casques'
              : 'Tous les publics'}
        </NativeSelectOption>
        {options[key]?.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  ));
}

export function CatalogueFilters({
  query,
  references,
  disabled,
  onChange,
}: CatalogueFiltersProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [staged, setStaged] = useState<FilterValues>({
    job: query.job,
    headset: query.headset,
    audience: query.audience,
  });
  const activeCount = [query.job, query.headset, query.audience].filter(
    Boolean,
  ).length;

  useEffect(() => {
    setStaged({
      job: query.job,
      headset: query.headset,
      audience: query.audience,
    });
  }, [query.audience, query.headset, query.job]);

  function openDialog() {
    setStaged({
      job: query.job,
      headset: query.headset,
      audience: query.audience,
    });
    dialogRef.current?.showModal();
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange(staged);
    dialogRef.current?.close();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={openDialog}
        disabled={disabled}
        className="lg:hidden"
      >
        <FunnelIcon aria-hidden="true" className="size-5" />
        Filtres{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>

      <div className="hidden grid-cols-3 gap-4 lg:grid">
        <FilterSelects
          idPrefix="desktop-filter"
          values={query}
          references={references}
          disabled={disabled}
          onChange={(key, value) => onChange({ [key]: value })}
        />
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="filter-dialog-title"
        className="bg-card text-foreground fixed inset-0 m-0 ml-auto h-dvh max-h-none w-full max-w-none shadow-xl backdrop:bg-foreground/40 sm:max-w-md lg:hidden"
      >
        <form onSubmit={applyFilters} className="flex min-h-full flex-col">
          <header className="border-border bg-card flex min-h-16 items-center justify-between border-b px-4 sm:px-6">
            <h2 id="filter-dialog-title" className="text-xl font-semibold">
              Filtres
            </h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => dialogRef.current?.close()}
              className="px-2"
            >
              <XMarkIcon aria-hidden="true" className="size-5" />
              Fermer
            </Button>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
            <FilterSelects
              idPrefix="sheet-filter"
              values={staged}
              references={references}
              disabled={disabled}
              onChange={(key, value) =>
                setStaged((current) => ({ ...current, [key]: value }))
              }
            />
            <Button
              type="button"
              variant="link"
              onClick={() => setStaged({ job: '', headset: '', audience: '' })}
              className="px-1"
            >
              Réinitialiser les filtres
            </Button>
          </div>

          <footer className="border-border bg-card sticky bottom-0 border-t p-4 sm:p-6">
            <Button type="submit" className="min-h-12 w-full">
              Afficher les vidéos
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
