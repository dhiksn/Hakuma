'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimeItem } from '@/types/api';
import { extractSlugFromUrl, formatViews } from '@/lib/utils';
import { useAgeGate } from '@/hooks/use-age-gate';
import { Play, Flame, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroBannerProps {
  item: AnimeItem | null;
}

export function HeroBanner({ item }: HeroBannerProps) {
  const isVerified = useAgeGate();

  if (!item) return null;

  const slug = item.slug || extractSlugFromUrl(item.url);
  const viewsDisplay = formatViews(item.views);

  return (
    <div className="relative mb-10 w-full overflow-hidden border border-white/10 bg-black">
      {/* Background Graphic / Thumbnail */}
      <div className="relative h-[340px] sm:h-[420px] md:h-[480px] w-full overflow-hidden">
        {item.thumbnail && (
          <Image
            src={item.thumbnail}
            alt={item.title || 'Featured Anime'}
            fill
            priority
            sizes="100vw"
            className={`object-cover object-center ${
              !isVerified ? 'blur-2xl grayscale' : 'filter grayscale contrast-125 opacity-40 hover:opacity-70 transition-opacity duration-700'
            }`}
          />
        )}

        {/* Heavy Cinematic Monochrome Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent w-full md:w-3/4" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-12 max-w-3xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex items-center gap-1 bg-white text-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Flame className="h-3 w-3" />
              #1 Paling Populer
            </span>
            {viewsDisplay !== '—' && (
              <span className="flex items-center gap-1 border border-white/20 bg-black/70 px-2 py-0.5 font-mono text-[10px] text-neutral-300">
                <Eye className="h-3 w-3 text-neutral-400" />
                {viewsDisplay} penonton
              </span>
            )}
          </div>

          <h1 className="font-momo text-2xl sm:text-4xl md:text-5xl font-extrabold uppercase leading-none tracking-tight text-white line-clamp-2 drop-shadow-sm">
            {item.title || 'Featured Video'}
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-neutral-400 max-w-xl font-normal leading-relaxed line-clamp-2">
            Tonton anime pilihan teratas saat ini dengan kualitas resolusi tinggi dan pemutaran tanpa jeda langsung melalui pemutar HLS Hakuma.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-white text-black hover:bg-neutral-200">
              <Link href={`/watch/${slug}`} className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-current" />
                <span>Tonton Sekarang</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
