import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrendingView, VALID_TIMESPANS, TIMESPANS, DEFAULT_TIMESPAN } from '../../../_trending-view';

interface Props {
  params: Promise<{ timespan: string; pageNum: string }>;
}

export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { timespan, pageNum } = await params;
  const label = TIMESPANS.find((t) => t.value === timespan)?.label || timespan;
  return {
    title: `Trending Anime — ${label}, Halaman ${pageNum}`,
  };
}

// /trending/[timespan]/page/[pageNum]  →  timespan, page N
export default async function TrendingTimespanPageNum({ params }: Props) {
  const { timespan, pageNum } = await params;
  if (!VALID_TIMESPANS.includes(timespan) || timespan === DEFAULT_TIMESPAN) notFound();

  const page = parseInt(pageNum, 10);
  if (isNaN(page) || page < 2) notFound();

  return <TrendingView timespan={timespan} page={page} />;
}
