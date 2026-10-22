import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { forwardRef } from 'react';

const buttonVariants = cva(
  'focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-action-hover active:bg-action-active',
        outline: 'border-border bg-card text-foreground hover:bg-muted border',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted border-border border',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'text-destructive hover:bg-muted',
        link: 'text-navigation-current px-0 underline-offset-4 hover:underline',
      },
      size: {
        default: '',
        compact: 'min-h-9 px-3 py-1.5',
        icon: 'size-11 min-h-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = forwardRef<
  HTMLButtonElement,
  ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
>(function Button(
  { className, variant = 'default', size = 'default', ...props },
  ref,
) {
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

export { Button, buttonVariants };
