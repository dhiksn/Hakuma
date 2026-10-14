'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchImages } from '@/lib/api';
import { ImageItem } from '@/types/api';
import { ErrorState } from '@/components/anime/error-state';
import { useAgeGate } from '@/hooks/use-age-gate';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2, ArrowUpRight } from 'lucide-react';

const CHANNELS = [
  { value: 'all', label: 'Semua Channel' },
  { value: 'media', label: 'Media' },
  { value: 'nsfw-general', label: 'NSFW General' },
  { value: 'futa', label: 'Futa' },
  { value: 'yuri', label: 'Yuri' },
  { value: 'yaoi', label: 'Yaoi' },
  { value: 'traps', label: 'Traps' },
  { value: 'furry', label: 'Furry' },
  { value: 'irl-3d', label: 'IRL / 3D' },
];

export function ImagesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerified = useAgeGate();

  const channel = searchParams.get('channel') || 'all';

  const [extraItems, setExtraItems] = useState<ImageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initial fetch for the channel
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['images', channel],
    queryFn: () => fetchImages({ channel: channel === 'all' ? undefined : channel }),
    staleTime: 60 * 1000,
  });

  // Saat data baru masuk (channel berubah), reset load-more state
  React.useEffect(() => {
    setExtraItems([]);
    setNextCursor(data?.pagination?.nextCursor || null);
  }, [data]);

  const allItems = [...(data?.data || []), ...extraItems];

  const handleChannelChange = (newChannel: string) => {
    router.push(`/images?channel=${newChannel}`);
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchImages({
        channel: channel === 'all' ? undefined : channel,
        cursor: nextCursor,
      });
      setExtraItems((prev) => [...prev, ...res.data]);
      setNextCursor(res.pagination.nextCursor || null);
    } catch (e) {
      console.error('Failed to load more images', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10">
      {/* Editorial Header */}
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="h-4 w-4 text-white" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            Arsip Galeri Komunitas
          </span>
        </div>
        <h1 className="font-momo text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
          Community Image Uploads
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Koleksi ilustrasi, poster promosi, dan kiriman komunitas dengan kurasi channel tematik dan navigasi kursor dinamis.
        </p>

        {/* Channel Filter Pills */}
        <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/10 pt-4">
          {CHANNELS.map((ch) => {
            const isActive = channel === ch.value;
            return (
              <button
                key={ch.value}
                onClick={() => handleChannelChange(ch.value)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all border ${
                  isActive
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-neutral-950 text-neutral-400 border-white/15 hover:border-white/40 hover:text-white'
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {isError ? (
        <ErrorState
          error={error}
          title="Gagal Memuat Galeri Gambar"
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-5">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse bg-neutral-900 border border-white/5"
            />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-white/15 p-8 text-center bg-neutral-950">
          <p className="font-momo text-sm text-neutral-400">Tidak ada gambar di channel ini.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Images Grid — Clean Editorial Gallery */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-5">
            {allItems.map((img, idx) => {
              return (
                <a
                  key={`${img.url}-${idx}`}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden border border-white/10 bg-[#080808] transition-all hover:border-white/40 hover:shadow-lg hover:shadow-black/60"
                >
                  {img.thumbnail ? (
                    <>
                      <Image
                        src={img.thumbnail}
                        alt={img.uploader ? `Uploaded by ${img.uploader}` : 'Community Image'}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
                          !isVerified ? 'blur-xl grayscale' : ''
                        }`}
                      />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                      {/* uploader overlay */}
                      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-6 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {img.uploader && (
                          <p className="font-mono text-[9px] text-neutral-200 truncate">
                            {img.uploader}
                          </p>
                        )}
                      </div>

                      {/* Channel badge top-left — always visible */}
                      {img.channel && (
                        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-black/75 px-1.5 py-0.5 backdrop-blur-sm border border-white/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="font-mono text-[8px] uppercase tracking-wider text-white">
                            #{img.channel}
                          </span>
                        </div>
                      )}

                      {/* Corner link icon */}
                      <div className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center bg-black/80 text-white opacity-0 transition-opacity group-hover:opacity-100 border border-white/20">
                        <ArrowUpRight className="h-3 w-3" />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-600">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </a>
              );
            })}
          </div>

          {/* Cursor Load More Button */}
          {nextCursor && (
            <div className="flex justify-center pt-6 border-t border-white/10">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                size="lg"
                className="border-white/20 hover:bg-white hover:text-black uppercase tracking-wider text-xs px-8"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memuat Gambar...
                  </>
                ) : (
                  'Muat Lebih Banyak Gambar'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
