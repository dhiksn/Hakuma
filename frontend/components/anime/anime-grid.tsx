import React from 'react';
import { AnimeItem } from '@/types/api';
import { AnimeCard } from './anime-card';
import { Skeleton } from '@/components/ui/skeleton';

interface AnimeGridProps {
  items?: AnimeItem[];
  isLoading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
  className?: string;
}

export function AnimeGrid({
  items = [],
  isLoading = false,
  skeletonCount = 12,
  emptyMessage = 'Tidak ada anime yang ditemukan.',
  className = '',
}: AnimeGridProps) {
  if (isLoading) {
    return (
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${className}`}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col border border-white/5 bg-neutral-950 p-0"
          >
            <Skeleton className="aspect-[2/3] w-full" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[220px] w-full flex-col items-center justify-center border border-dashed border-white/10 bg-neutral-950/40 p-8 text-center">
        <p className="font-momo text-sm text-neutral-400">{emptyMessage}</p>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
          Hakuma Editorial Catalog
        </span>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${className}`}
    >
      {items.map((item, index) => (
        <AnimeCard
          key={item.slug || item.url || index}
          item={item}
          priority={index < 6}
        />
      ))}
    </div>
  );
}
