import React from 'react';
import Link from 'next/link';
import { fetchTag } from '@/lib/api';
import { AnimeGrid } from '@/components/anime/anime-grid';
import { ErrorState } from '@/components/anime/error-state';
import { EditorialPagination } from '@/components/anime/editorial-pagination';
import { TagSortDropdown } from '@/components/anime/tag-sort-dropdown';
import { Tag as TagIcon, ChevronRight } from 'lucide-react';

export const SORT_OPTIONS = [
  { value: 'recent_upload', label: 'Upload Terbaru' },
  { value: 'old_upload', label: 'Upload Terlama' },
  { value: 'newest', label: 'Rilis Terbaru' },
  { value: 'oldest', label: 'Rilis Terlama' },
  { value: 'most_views', label: 'Paling Banyak Ditonton' },
  { value: 'least_views', label: 'Paling Sedikit Ditonton' },
  { value: 'most_likes', label: 'Paling Disukai' },
  { value: 'title_az', label: 'Judul (A — Z)' },
  { value: 'title_za', label: 'Judul (Z — A)' },
];

export const DEFAULT_ORDER = 'recent_upload';
export const VALID_ORDERS = SORT_OPTIONS.map((o) => o.value);

/** Build clean URL for a tag + order + page combo */
export function tagHref(slug: string, order: string, page: number): string {
  const encodedSlug = encodeURIComponent(slug);
  const isDefault = order === DEFAULT_ORDER;
  const base = isDefault
    ? `/tags/${encodedSlug}`
    : `/tags/${encodedSlug}/${encodeURIComponent(order)}`;
  if (page <= 1) return base;
  return `${base}/page/${page}`;
}

interface TagViewProps {
  slug: string;
  order: string;
  page: number;
}

export async function TagView({ slug, order, page }: TagViewProps) {
  let tagData;
  let fetchError = null;

  try {
    tagData = await fetchTag(slug, page, order, 600);
  } catch (err: any) {
    fetchError = err;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 font-mono text-xs text-neutral-400"
      >
        <Link href="/" className="transition-colors hover:text-white uppercase tracking-wider">
          Beranda
        </Link>
        <ChevronRight className="h-3 w-3 text-neutral-600 shrink-0" />
        <Link href="/tags" className="transition-colors hover:text-white uppercase tracking-wider">
          Tag
        </Link>
        <ChevronRight className="h-3 w-3 text-neutral-600 shrink-0" />
        <span className="text-white font-semibold uppercase tracking-wider truncate">{slug}</span>
      </nav>

      {/* Header & Sort */}
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <TagIcon className="h-4 w-4 text-neutral-400" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
                Katalog Berdasarkan Tag
              </span>
            </div>
            <h1 className="font-momo text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white capitalize">
              {slug}
            </h1>
          </div>

          <TagSortDropdown
            currentOrder={order}
            slug={slug}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Content */}
      {fetchError || !tagData ? (
        <ErrorState
          error={fetchError}
          title={`Gagal Memuat Anime Tag "${slug}"`}
          message="Tidak dapat mengambil video untuk tag ini dari server."
        />
      ) : (
        <div className="space-y-8">
          <AnimeGrid
            items={tagData.items}
            emptyMessage={`Belum ada anime yang tercatat dengan tag "${slug}".`}
          />

          <EditorialPagination
            currentPage={page}
            totalPages={tagData.pagination.totalPages}
            baseHref={tagHref(slug, order, 1)}
          />
        </div>
      )}
    </div>
  );
}
