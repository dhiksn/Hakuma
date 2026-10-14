'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimeItem } from '@/types/api';
import { extractSlugFromUrl, formatViews } from '@/lib/utils';
import { useAgeGate } from '@/hooks/use-age-gate';
import { Eye, Film } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnimeCardProps {
  item: AnimeItem;
  rank?: number;
  priority?: boolean;
}

export function AnimeCard({ item, rank, priority = false }: AnimeCardProps) {
  const isVerified = useAgeGate();
  const slug = item.slug || extractSlugFromUrl(item.url);
  const [imageError, setImageError] = useState(false);
  const viewsDisplay = formatViews(item.views);

  return (
    <Link
      href={`/watch/${slug}`}
      className="group relative flex flex-col overflow-hidden border border-white/10 bg-[#0a0a0a] transition-all duration-300 hover:border-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
    >
      {/* Thumbnail Container (Portrait Anime Poster Ratio) */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
        {item.thumbnail && !imageError ? (
          <Image
            src={item.thumbnail}
            alt={item.title || 'Anime Thumbnail'}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            priority={priority}
            onError={() => setImageError(true)}
            className={`object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              !isVerified ? 'blur-xl grayscale' : 'editorial-thumbnail'
            }`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-900 text-neutral-600">
            <Film className="h-8 w-8 stroke-[1.5]" />
            <span className="mt-1 text-[10px] tracking-wider uppercase font-mono">No Preview</span>
          </div>
        )}

        {/* Subtle Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Rank Badge (if provided) */}
        {(rank || item.rank) && (
          <div className="absolute left-2 top-2 z-10">
            <span className="flex h-6 min-w-6 items-center justify-center bg-black/90 px-1.5 font-mono text-[11px] font-bold tracking-tight text-white border border-white/20">
              #{rank || item.rank}
            </span>
          </div>
        )}

        {/* Episode or Status Tag */}
        {(item.episode || item.status) && (
          <div className="absolute right-2 top-2 z-10">
            <Badge variant="outline" className="bg-black/80 text-[9px] px-1.5 py-0 border-white/20">
              {item.episode || item.status}
            </Badge>
          </div>
        )}

        {/* Views Badge */}
        {viewsDisplay !== '—' && (
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 bg-black/90 px-2 py-1 font-mono text-[11px] text-white border border-white/15 backdrop-blur-sm">
            <Eye className="h-3.5 w-3.5 text-neutral-300" />
            <span className="font-semibold">{viewsDisplay}</span>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex flex-col p-2.5 gap-1 min-h-[3.5rem]">
        <h3
          className="line-clamp-2 font-momo text-[11px] font-medium leading-snug text-neutral-200 transition-colors group-hover:text-white"
          title={item.title || 'Untitled'}
        >
          {item.title || 'Untitled Video'}
        </h3>


      </div>
    </Link>
  );
}
