import React from 'react';
import Link from 'next/link';
import { fetchTrending } from '@/lib/api';
import { AnimeCard } from '@/components/anime/anime-card';
import { ErrorState } from '@/components/anime/error-state';
import { EditorialPagination } from '@/components/anime/editorial-pagination';
import { Flame } from 'lucide-react';

export const TIMESPANS = [
  { value: 'daily', label: 'Hari Ini' },
  { value: 'weekly', label: 'Minggu Ini' },
  { value: 'monthly', label: 'Bulan Ini' },
  { value: 'quarterly', label: 'Kuartal (3 Bln)' },
  { value: 'semi-annual', label: 'Semester (6 Bln)' },
  { value: 'yearly', label: 'Tahun Ini' },
];

export const VALID_TIMESPANS = TIMESPANS.map((t) => t.value);
export const DEFAULT_TIMESPAN = 'monthly';

/** Build clean URL for a timespan + page combo */
export function trendingHref(timespan: string, page: number): string {
  const isDefault = timespan === DEFAULT_TIMESPAN;
  const base = isDefault ? '/trending' : `/trending/${timespan}`;
  if (page <= 1) return base;
  return `${base}/page/${page}`;
}interface TrendingViewProps {
  timespan: string;
  page: number;
}

export async function TrendingView({ timespan, page }: TrendingViewProps) {
  let trendingData;
  let fetchError = null;

  try {
    trendingData = await fetchTrending(timespan, page, 600);
  } catch (err: any) {
    fetchError = err;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10">
      {/* Editorial Header */}
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-4 w-4 text-white" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            Peringkat Populer
          </span>
        </div>
        <h1 className="font-momo text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
          Anime Paling Banyak Ditonton
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Peringkat teratas anime terfavorit berdasarkan metrik penayangan di platform. Pilih
          rentang waktu untuk melihat tren harian hingga tahunan.
        </p>

        {/* Timespan Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/10 pt-4">
          {TIMESPANS.map((ts) => {
            const isActive = timespan === ts.value;
            return (
              <Link
                key={ts.value}
                href={trendingHref(ts.value, 1)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all border ${
                  isActive
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-neutral-950 text-neutral-400 border-white/15 hover:border-white/40 hover:text-white'
                }`}
              >
                {ts.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {fetchError || !trendingData ? (
        <ErrorState
          error={fetchError}
          title="Gagal Memuat Data Trending"
          message="Tidak dapat mengambil peringkat trending untuk periode ini."
        />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {trendingData.data.map((item, index) => {
              const rank = item.rank || (page - 1) * trendingData.data.length + index + 1;
              return (
                <AnimeCard
                  key={item.url || index}
                  item={item}
                  rank={rank}
                  priority={index < 6}
                />
              );
            })}
          </div>

          <EditorialPagination
            currentPage={page}
            totalPages={trendingData.pagination.totalPages}
            baseHref={trendingHref(timespan, 1)}
          />
        </div>
      )}
    </div>
  );
}
