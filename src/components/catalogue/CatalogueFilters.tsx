import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState, type FormEvent } from 'react';

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
      <select
        id={`${idPrefix}-${key}`}
        value={values[key]}
        disabled={disabled}
        onChange={(event) => onChange(key, event.currentTarget.value)}
        className="border-input bg-background focus-visible:outline-ring min-h-11 w-full rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">
          {key === 'job'
            ? 'Tous les métiers'
            : key === 'headset'
              ? 'Tous les casques'
              : 'Tous les publics'}
        </option>
        {options[key]?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
      <button
        type="button"
        onClick={openDialog}
        disabled={disabled}
        className="border-input bg-background focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
      >
        <FunnelIcon aria-hidden="true" className="size-5" />
        Filtres{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

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
        className="bg-background text-foreground fixed inset-0 m-0 ml-auto h-dvh max-h-none w-full max-w-none backdrop:bg-foreground/40 sm:max-w-md lg:hidden"
      >
        <form onSubmit={applyFilters} className="flex min-h-full flex-col">
          <header className="border-border flex min-h-16 items-center justify-between border-b px-4 sm:px-6">
            <h2 id="filter-dialog-title" className="text-xl font-semibold">
              Filtres
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <XMarkIcon aria-hidden="true" className="size-5" />
              Fermer
            </button>
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
            <button
              type="button"
              onClick={() => setStaged({ job: '', headset: '', audience: '' })}
              className="text-navigation-current focus-visible:outline-ring min-h-11 px-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Réinitialiser les filtres
            </button>
          </div>

          <footer className="border-border bg-background sticky bottom-0 border-t p-4 sm:p-6">
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-action-hover focus-visible:outline-ring min-h-12 w-full rounded-md px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Afficher les vidéos
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
