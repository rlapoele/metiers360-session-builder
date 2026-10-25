import { XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '@components/ui/button';

export interface AppliedFilter {
  key: 'job' | 'headset' | 'audience';
  label: string;
}

interface AppliedFiltersProps {
  filters: AppliedFilter[];
  onRemove: (key: AppliedFilter['key']) => void;
  onClear: () => void;
}

export function AppliedFilters({
  filters,
  onRemove,
  onClear,
}: AppliedFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Filtres appliqués"
    >
      {filters.map((filter) => (
        <Button
          key={filter.key}
          type="button"
          onClick={() => onRemove(filter.key)}
          variant="secondary"
          size="compact"
          aria-label={`Retirer le filtre ${filter.label}`}
          className="rounded-full border px-3 font-medium"
        >
          {filter.label}
          <XMarkIcon aria-hidden="true" className="size-4" />
          <span className="sr-only">Retirer ce filtre</span>
        </Button>
      ))}
      <Button
        type="button"
        variant="link"
        onClick={onClear}
        className="max-w-full px-2 whitespace-normal"
      >
        Effacer la recherche et les filtres
      </Button>
    </div>
  );
}
