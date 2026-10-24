import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  function Input({ className, type, ...props }, ref) {
    return (
      <InputPrimitive
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          'cursor-pointer border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background min-h-12 w-full min-w-0 rounded-md border-2 px-3 py-2 text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

export { Input };
