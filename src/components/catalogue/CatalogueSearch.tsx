import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
          Rechercher une vidéo par titre
        </label>
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
        />
        <Input
          id="catalogue-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Rechercher par titre…"
          className="pr-4 pl-10"
        />
      </div>
      <Button type="submit" className="hidden min-h-12 px-5 sm:inline-flex">
        Rechercher
      </Button>
    </form>
  );
}
