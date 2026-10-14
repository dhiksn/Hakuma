import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SeasonView } from '../_season-view';

interface Props {
  params: Promise<{ year: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Season ${year}`,
    description: `Arsip rilisan anime per musim tahun ${year}.`,
  };
}

// /season/[year]
export default async function SeasonYearPage({ params }: Props) {
  const { year: rawYear } = await params;
  const year = parseInt(rawYear, 10);

  if (isNaN(year) || year < 1900 || year > 2100) notFound();

  return <SeasonView year={year} />;
}
