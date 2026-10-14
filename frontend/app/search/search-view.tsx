'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchSearch, fetchBrowse } from '@/lib/api';
import { FilterBar } from '@/components/anime/filter-bar';
import { AnimeGrid } from '@/components/anime/anime-grid';
import { ErrorState } from '@/components/anime/error-state';
import { EditorialPagination } from '@/components/anime/editorial-pagination';

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') || '';
  const order = searchParams.get('order') || 'recent_upload';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '24', 10);
  const tags = searchParams.get('tags') || '';
  const brands = searchParams.get('brands') || '';
  const blacklist = searchParams.get('blacklist') || '';

  // 1. Fetch available tags for filter dialog
  const { data: browseData } = useQuery({
    queryKey: ['browse-tags'],
    queryFn: () => fetchBrowse(3600),
    staleTime: 1000 * 60 * 30,
  });

  // 2. Fetch search results with TanStack Query
  const {
    data: searchData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['search', q, order, page, pageSize, tags, brands, blacklist],
    queryFn: () =>
      fetchSearch({
        q,
        order,
        page,
        page_size: pageSize,
        tags,
        brands,
        blacklist,
      }),
    // Selalu fetch — tidak ada staleTime override dari default
    gcTime: 0,
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(newPage));
    }
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = searchData?.totalPages || 1;
  const currentPage = searchData?.page || page;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      {/* Editorial Page Header */}
      <div className="mb-6 border-b border-white/10 pb-4">
        <h1 className="font-momo text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
          Eksplorasi & Pencarian
        </h1>
        <p className="mt-1 text-xs text-neutral-400 font-mono">
          Koleksi komprehensif dengan filter multi-tag, brand studio, dan penyortiran lanjutan.
        </p>
      </div>

      {/* Filter Toolbar */}
      <FilterBar
        availableTags={browseData?.tags || []}
        totalResults={searchData?.total}
      />

      {/* Results View */}
      {isError ? (
        <ErrorState
          error={error}
          title="Pencarian Gagal"
          onRetry={() => refetch()}
        />
      ) : (
        <div className="space-y-8">
          <AnimeGrid
            items={searchData?.data}
            isLoading={isLoading}
            skeletonCount={pageSize}
            emptyMessage={
              q
                ? `Tidak ditemukan anime dengan kata kunci "${q}". Silakan periksa kembali filter Anda.`
                : 'Tidak ada anime yang cocok dengan kombinasi filter saat ini.'
            }
          />

          {/* Editorial Pagination */}
          {!isLoading && (
            <EditorialPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
