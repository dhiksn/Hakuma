import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-900 border border-white/5',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
