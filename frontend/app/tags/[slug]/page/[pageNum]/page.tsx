import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TagView, DEFAULT_ORDER } from '../../_tag-view';

interface Props {
  params: Promise<{ slug: string; pageNum: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageNum } = await params;
  const decoded = decodeURIComponent(slug);
  return {
    title: `Tag: ${decoded} — Halaman ${pageNum}`,
  };
}

export const revalidate = 600;

// /tags/[slug]/page/[pageNum]  →  default order, page N
export default async function TagDetailPageNum({ params }: Props) {
  const { slug, pageNum } = await params;
  const page = parseInt(pageNum, 10);
  if (isNaN(page) || page < 2) notFound();

  return <TagView slug={decodeURIComponent(slug)} order={DEFAULT_ORDER} page={page} />;
}
