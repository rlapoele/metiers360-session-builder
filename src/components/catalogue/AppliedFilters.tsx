import { XMarkIcon } from '@heroicons/react/24/outline';

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
        <button
          key={filter.key}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="border-border bg-secondary focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {filter.label}
          <XMarkIcon aria-hidden="true" className="size-4" />
          <span className="sr-only">Retirer ce filtre</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-navigation-current focus-visible:outline-ring min-h-11 px-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Tout effacer
      </button>
    </div>
  );
}
