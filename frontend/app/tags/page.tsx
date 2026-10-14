import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { fetchBrowse } from '@/lib/api';
import { ErrorState } from '@/components/anime/error-state';
import { Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Katalog Kategori & Tag',
  description: 'Daftar lengkap semua genre, tag, dan kategori anime di Hakuma.',
};

export const revalidate = 3600; // 1 hour revalidate

export default async function TagsIndexPage() {
  let browseData;
  let fetchError = null;

  try {
    browseData = await fetchBrowse(3600);
  } catch (err: any) {
    fetchError = err;
  }

  if (fetchError || !browseData) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16">
        <ErrorState
          error={fetchError}
          title="Gagal Memuat Daftar Tag"
          message="Tidak dapat memuat direktori tag dari server backend."
        />
      </div>
    );
  }

  const { tags } = browseData;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10">
      {/* Editorial Header */}
      <div className="mb-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="h-4 w-4 text-neutral-400" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            Direktori Lengkap
          </span>
        </div>
        <h1 className="font-momo text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
          Kategori & Tag Anime
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Telusuri seluruh arsip berdasarkan {tags.length} klasifikasi genre dan tema spesifik. Setiap kategori menyajikan daftar judul berurutan.
        </p>
      </div>

      {/* Grid of Tag Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tags.map((tag) => (
          <Link
            key={tag.name}
            href={`/tags/${encodeURIComponent(tag.name)}`}
            className="group relative flex flex-col justify-between overflow-hidden border border-white/10 bg-[#080808] p-5 transition-all duration-300 hover:border-white/40 hover:bg-neutral-950"
          >
            {/* Optional background image banner */}
            {tag.thumbnail && (
              <div className="absolute inset-0 z-0 opacity-15 transition-opacity group-hover:opacity-30">
                <Image
                  src={tag.thumbnail}
                  alt={tag.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover editorial-thumbnail"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
              </div>
            )}

            <div className="relative z-10">
              <div className="flex items-baseline justify-between">
                <h3 className="font-momo text-base font-bold uppercase tracking-tight text-white transition-colors group-hover:text-neutral-300">
                  {tag.name}
                </h3>
                {tag.videoCount !== null && (
                  <span className="font-mono text-[10px] text-neutral-400 border border-white/10 px-1.5 py-0.5 bg-black/60">
                    {tag.videoCount}
                  </span>
                )}
              </div>

              {tag.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-400">
                  {tag.description}
                </p>
              )}
            </div>

            <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/5 pt-3 font-mono text-[10px] uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300">
              <span>Buka Koleksi</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
