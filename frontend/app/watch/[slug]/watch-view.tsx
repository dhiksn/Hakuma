'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { VideoDetail, AnimeItem } from '@/types/api';
import { ArtPlayer } from '@/components/player/art-player';
import { TagBadge } from '@/components/anime/tag-badge';
import { AnimeCard } from '@/components/anime/anime-card';
import { fetchVideo } from '@/lib/api';
import {
  formatViews,
  formatDuration,
  formatDate,
  calculateApproval,
  extractSlugFromUrl,
} from '@/lib/utils';
import { Clock, Calendar, Eye, Film } from 'lucide-react';

interface WatchViewProps {
  initialVideo: VideoDetail;
  recommendations?: AnimeItem[];
}

export function WatchView({ initialVideo, recommendations = [] }: WatchViewProps) {
  const [video, setVideo] = useState<VideoDetail>(initialVideo);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  const handleRefreshStream = async () => {
    try {
      const refreshed = await fetchVideo(video.slug);
      setVideo(refreshed);
    } catch (err) {
      console.error('Failed to refresh video stream', err);
    }
  };

  // Scroll daftar episode ke episode aktif (hanya di dalam container, bukan halaman)
  useEffect(() => {
    const list = listRef.current;
    const active = activeRef.current;
    if (!list || !active) return;
    list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
  }, [video.slug]);

  const viewsDisplay = formatViews(video.views);
  const episodeCount = video.episodes?.length || 0;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-10">
        {/* ===== Baris utama: kolom kiri (konten) + kolom kanan (episode) ===== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Kiri: Player + Info */}
          <div className="lg:col-span-8 space-y-6 min-w-0">
            <div className="relative isolate w-full">
              <ArtPlayer
                slug={video.slug}
                title={video.title}
                thumbnail={video.poster || video.thumbnail}
                sources={video.player || []}
                onRefreshSources={handleRefreshStream}
              />
            </div>

            {/* Title block */}
            <div className="flex gap-4">
              {video.thumbnail && (
                <div className="relative w-24 sm:w-32 shrink-0 aspect-[2/3] overflow-hidden border border-white/10 bg-neutral-900">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-3 min-w-0">
                <h1 className="font-momo text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white leading-tight">
                  {video.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-xs text-neutral-400">
                  {video.brand && (
                    <span className="text-white font-medium uppercase tracking-wider">
                      {video.brand}
                    </span>
                  )}
                  {viewsDisplay !== '—' && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {viewsDisplay}
                    </span>
                  )}
                  {video.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </span>
                  )}
                  {video.releasedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(video.releasedAt)}
                    </span>
                  )}
                </div>

                {video.tags && video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {video.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sinopsis */}
            {video.description && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Sinopsis
                </p>
                <p className="text-sm leading-relaxed text-neutral-300 whitespace-pre-line">
                  {video.description}
                </p>
              </div>
            )}
          </div>

          {/*
            Kanan: panel episode.
            Di desktop panel dibuat absolute (inset-0) sehingga tingginya SELALU
            mengikuti tinggi kolom kiri — tidak ada area kosong di bawahnya.
            Kalau daftar episode panjang, scroll terjadi di dalam panel.
          */}
          <aside className="lg:col-span-4 relative lg:min-h-[480px]">
            <div className="flex flex-col border border-white/10 bg-neutral-950 max-h-[28rem] lg:max-h-none lg:absolute lg:inset-0">
              {/* Header panel */}
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 shrink-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Episode
                </p>
                <span className="font-mono text-[10px] text-neutral-400">
                  {episodeCount || 1}
                </span>
              </div>

              {/* List scrollable */}
              <div
                ref={listRef}
                className="relative flex-1 min-h-0 overflow-y-auto p-2 space-y-2"
              >
                {video.episodes && video.episodes.length > 0 ? (
                  video.episodes.map((ep, idx) => {
                    const epSlug = ep.slug || extractSlugFromUrl(ep.url);
                    const isActive = epSlug === video.slug;

                    return (
                      <Link
                        key={ep.url || idx}
                        ref={isActive ? activeRef : undefined}
                        href={`/watch/${epSlug}`}
                        aria-current={isActive ? 'true' : undefined}
                        className={`group flex items-center gap-3 p-2 border transition-colors ${
                          isActive
                            ? 'border-white bg-white/5'
                            : 'border-white/10 hover:border-white/30 bg-black'
                        }`}
                      >
                        <div className="relative aspect-video w-28 shrink-0 overflow-hidden bg-neutral-900">
                          {ep.thumbnail ? (
                            <Image
                              src={ep.thumbnail}
                              alt={ep.title || `Episode ${idx + 1}`}
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-600">
                              <Film className="h-5 w-5" />
                            </div>
                          )}
                          {isActive && (
                            <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                            Ep {idx + 1}
                          </span>
                          <h4
                            className={`line-clamp-2 font-momo text-xs leading-snug mt-0.5 ${
                              isActive
                                ? 'text-white font-bold'
                                : 'text-neutral-300 group-hover:text-white'
                            }`}
                          >
                            {ep.title || `Episode ${idx + 1}`}
                          </h4>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  /* Tidak ada episode lain: tampilkan kartu episode saat ini agar panel tetap terisi */
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-4 text-center">
                    <Film className="h-6 w-6 text-neutral-600" />
                    <p className="font-mono text-xs text-neutral-500">
                      Video ini hanya punya satu episode.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* ===== Rekomendasi: full width di bawah, selalu rata penuh ===== */}
        {recommendations.length > 0 && (
          <section className="border-t border-white/10 pt-6 space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Rekomendasi
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {recommendations.slice(0, 6).map((rec) => (
                <AnimeCard key={rec.url || rec.slug} item={rec} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}