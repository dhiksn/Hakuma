import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrendingView, VALID_TIMESPANS, TIMESPANS, DEFAULT_TIMESPAN } from '../_trending-view';

interface Props {
  params: Promise<{ timespan: string }>;
}

export const revalidate = 600;

export async function generateStaticParams() {
  return VALID_TIMESPANS.filter((t) => t !== DEFAULT_TIMESPAN).map((t) => ({ timespan: t }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { timespan } = await params;
  const label = TIMESPANS.find((t) => t.value === timespan)?.label || timespan;
  return {
    title: `Trending Anime — ${label}`,
  };
}

// /trending/[timespan]  →  timespan, page 1
export default async function TrendingTimespanPage({ params }: Props) {
  const { timespan } = await params;
  if (!VALID_TIMESPANS.includes(timespan) || timespan === DEFAULT_TIMESPAN) notFound();

  return <TrendingView timespan={timespan} page={1} />;
}
