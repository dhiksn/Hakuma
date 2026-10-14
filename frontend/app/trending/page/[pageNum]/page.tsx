import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrendingView, DEFAULT_TIMESPAN } from '../../_trending-view';

interface Props {
  params: Promise<{ pageNum: string }>;
}

export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageNum } = await params;
  return {
    title: `Trending Anime — Halaman ${pageNum}`,
  };
}

// /trending/page/[pageNum]  →  monthly, page N
export default async function TrendingPageNum({ params }: Props) {
  const { pageNum } = await params;
  const page = parseInt(pageNum, 10);
  if (isNaN(page) || page < 2) notFound();

  return <TrendingView timespan={DEFAULT_TIMESPAN} page={page} />;
}
