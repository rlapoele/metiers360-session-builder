import { ChevronDownIcon } from '@heroicons/react/24/outline';
import * as React from 'react';
import { cn } from 'cn';

type NativeSelectProps = React.ComponentProps<'select'>;

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  function NativeSelect({ className, ...props }, ref) {
    return (
      <div
        className={cn('relative w-full', className)}
        data-slot="native-select-wrapper"
      >
        <select
          ref={ref}
          data-slot="native-select"
          className="border-input bg-card text-foreground focus-visible:ring-ring focus-visible:ring-offset-background min-h-11 w-full min-w-0 appearance-none rounded-md border py-2 pr-10 pl-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <ChevronDownIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
          aria-hidden="true"
          data-slot="native-select-icon"
        />
      </div>
    );
  },
);

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<'option'>) {
  return (
    <option data-slot="native-select-option" className={className} {...props} />
  );
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={className}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
