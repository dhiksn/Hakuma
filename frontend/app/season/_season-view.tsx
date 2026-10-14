import React from 'react';
import { fetchSeason } from '@/lib/api';
import { AnimeGrid } from '@/components/anime/anime-grid';
import { ErrorState } from '@/components/anime/error-state';
import { YearSelector } from '@/components/anime/year-selector';
import { Calendar, Sun, CloudRain, Snowflake, Wind } from 'lucide-react';

const getSeasonIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('summer')) return <Sun className="h-4 w-4 text-white" />;
  if (lower.includes('spring')) return <CloudRain className="h-4 w-4 text-white" />;
  if (lower.includes('winter')) return <Snowflake className="h-4 w-4 text-white" />;
  return <Wind className="h-4 w-4 text-white" />;
};

interface SeasonViewProps {
  year: number;
}

export async function SeasonView({ year }: SeasonViewProps) {
  const currentYear = new Date().getFullYear();

  let seasonData;
  let fetchError = null;

  try {
    seasonData = await fetchSeason(year, 3600);
  } catch (err: any) {
    fetchError = err;
  }

  const availableYears = seasonData?.availableYears || [
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3,
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10">
      {/* Editorial Header */}
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
                Arsip Musiman
              </span>
            </div>
            <h1 className="font-momo text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              Rilis Season Tahun {year}
            </h1>
            <p className="mt-1 text-xs text-neutral-400 font-mono">
              Arsip rilisan anime dikelompokkan berdasarkan kuartal musim penayangan.
            </p>
          </div>

          <YearSelector currentYear={year} availableYears={availableYears} />
        </div>
      </div>

      {/* Season Groups */}
      {fetchError || !seasonData ? (
        <ErrorState
          error={fetchError}
          title={`Gagal Memuat Season ${year}`}
          message="Tidak dapat mengambil data rilis musim untuk tahun yang diminta."
        />
      ) : (
        <div className="space-y-14">
          {seasonData.seasons.map((season) => (
            <section key={season.name} className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center border border-white/20 bg-neutral-900">
                    {getSeasonIcon(season.name)}
                  </div>
                  <h2 className="font-momo text-xl font-bold uppercase tracking-tight text-white">
                    {season.name} {season.year}
                  </h2>
                </div>
                {season.videoCount !== undefined && season.videoCount !== null && (
                  <span className="font-mono text-[11px] text-neutral-400">
                    {season.videoCount} judul terdaftar
                  </span>
                )}
              </div>

              <AnimeGrid
                items={season.items}
                emptyMessage={`Belum ada data video untuk ${season.name} ${season.year}.`}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
