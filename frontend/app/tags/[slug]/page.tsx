import { Metadata } from 'next';
import { TagView, DEFAULT_ORDER } from './_tag-view';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  return {
    title: `Tag: ${decoded}`,
    description: `Daftar anime dengan kategori dan tag ${decoded} di Hakuma.`,
  };
}

export const revalidate = 600;

// /tags/[slug]  →  default order, page 1
export default async function TagDetailPage({ params }: Props) {
  const { slug } = await params;
  return <TagView slug={decodeURIComponent(slug)} order={DEFAULT_ORDER} page={1} />;
}
