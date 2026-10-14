import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-white',
  {
    variants: {
      variant: {
        default:
          'border border-white/20 bg-neutral-900 text-neutral-200 hover:border-white/40',
        secondary:
          'border border-transparent bg-white/10 text-neutral-300 hover:bg-white/20',
        outline:
          'border border-white/30 text-white',
        solid:
          'bg-white text-black font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
