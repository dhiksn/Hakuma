import { Metadata } from 'next';
import { TrendingView, DEFAULT_TIMESPAN } from './_trending-view';

export const metadata: Metadata = {
  title: 'Trending Anime',
  description: 'Peringkat anime paling populer berdasarkan jumlah penonton dan periode tren.',
};

export const revalidate = 600;

// /trending  →  monthly, page 1
export default function TrendingPage() {
  return <TrendingView timespan={DEFAULT_TIMESPAN} page={1} />;
}
