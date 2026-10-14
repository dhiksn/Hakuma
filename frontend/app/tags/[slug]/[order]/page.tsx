import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TagView, VALID_ORDERS, DEFAULT_ORDER, SORT_OPTIONS } from '../_tag-view';

interface Props {
  params: Promise<{ slug: string; order: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, order } = await params;
  const decoded = decodeURIComponent(slug);
  const decodedOrder = decodeURIComponent(order);
  const label = SORT_OPTIONS.find((o) => o.value === decodedOrder)?.label || decodedOrder;
  return {
    title: `Tag: ${decoded} — ${label}`,
  };
}

export const revalidate = 600;

// /tags/[slug]/[order]  →  custom order, page 1
export default async function TagDetailOrderPage({ params }: Props) {
  const { slug, order } = await params;
  const decodedOrder = decodeURIComponent(order);

  // Block default order here (should use /tags/[slug] instead) and invalid orders
  if (!VALID_ORDERS.includes(decodedOrder) || decodedOrder === DEFAULT_ORDER) notFound();

  return <TagView slug={decodeURIComponent(slug)} order={decodedOrder} page={1} />;
}
