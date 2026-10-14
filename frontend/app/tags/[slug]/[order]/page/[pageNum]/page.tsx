import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TagView, VALID_ORDERS, DEFAULT_ORDER, SORT_OPTIONS } from '../../../_tag-view';

interface Props {
  params: Promise<{ slug: string; order: string; pageNum: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, order, pageNum } = await params;
  const decoded = decodeURIComponent(slug);
  const decodedOrder = decodeURIComponent(order);
  const label = SORT_OPTIONS.find((o) => o.value === decodedOrder)?.label || decodedOrder;
  return {
    title: `Tag: ${decoded} — ${label}, Halaman ${pageNum}`,
  };
}

export const revalidate = 600;

// /tags/[slug]/[order]/page/[pageNum]  →  custom order, page N
export default async function TagDetailOrderPageNum({ params }: Props) {
  const { slug, order, pageNum } = await params;
  const decodedOrder = decodeURIComponent(order);

  if (!VALID_ORDERS.includes(decodedOrder) || decodedOrder === DEFAULT_ORDER) notFound();

  const page = parseInt(pageNum, 10);
  if (isNaN(page) || page < 2) notFound();

  return <TagView slug={decodeURIComponent(slug)} order={decodedOrder} page={page} />;
}
