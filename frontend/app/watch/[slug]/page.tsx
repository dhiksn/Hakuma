import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchVideo, fetchSearch } from '@/lib/api';
import { WatchView } from './watch-view';
import { ErrorState } from '@/components/anime/error-state';

interface WatchPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const video = await fetchVideo(slug);
    return {
      title: `${video.title} — Nonton Streaming`,
      description: video.description || `Tonton ${video.title} streaming berkualitas tinggi di Hakuma.`,
    };
  } catch {
    return {
      title: 'Tonton Video Anime',
      description: 'Pemutar streaming anime Hakuma.',
    };
  }
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { slug } = await params;

  let videoDetail;
  let fetchError = null;

  try {
    videoDetail = await fetchVideo(slug);
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND' || err?.statusCode === 404) {
      notFound();
    }
    fetchError = err;
  }

  if (fetchError || !videoDetail) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16">
        <ErrorState
          error={fetchError}
          title="Gagal Memuat Detail Video"
          message="Tidak dapat mengambil data video dari server Hakuma."
        />
      </div>
    );
  }

  // Fetch recommendations based on the first tag if available
  let recommendations: import('@/types/api').AnimeItem[] = [];
  if (videoDetail.tags && videoDetail.tags.length > 0) {
    try {
      const searchRes = await fetchSearch({
        tags: videoDetail.tags[0],
        page_size: 8,
      });
      recommendations = searchRes.data.filter((item) => item.slug !== videoDetail.slug);
    } catch (_) {
      // Fallback: no recommendations
    }
  }

  return (
    <WatchView
      initialVideo={videoDetail}
      recommendations={recommendations}
    />
  );
}
