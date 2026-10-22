import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { FormEvent } from 'react';

interface CatalogueSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CatalogueSearch({
  value,
  onChange,
  onSubmit,
}: CatalogueSearchProps) {
  return (
    <form role="search" onSubmit={onSubmit} className="flex gap-3">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="catalogue-search" className="sr-only">
          Rechercher une vidéo
        </label>
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
        />
        <input
          id="catalogue-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Rechercher une vidéo…"
          className="border-input bg-background focus-visible:outline-ring min-h-12 w-full rounded-md border py-2 pr-4 pl-10 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </div>
      <button
        type="submit"
        className="bg-primary text-primary-foreground hover:bg-action-hover focus-visible:outline-ring hidden min-h-12 rounded-md px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex sm:items-center"
      >
        Rechercher
      </button>
    </form>
  );
}
