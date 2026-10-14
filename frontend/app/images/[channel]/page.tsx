import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ImagesView } from '../_images-view';
import { VALID_CHANNELS, CHANNELS } from '../channels';
import Loading from '../../loading';

interface Props {
  params: Promise<{ channel: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { channel } = await params;
  const label = CHANNELS.find((c) => c.value === channel)?.label || channel;
  return {
    title: `Images — ${label}`,
    description: `Galeri komunitas channel ${label}.`,
  };
}

export async function generateStaticParams() {
  return VALID_CHANNELS.map((channel) => ({ channel }));
}

// /images/[channel] → specific channel
export default async function ImagesChannelPage({ params }: Props) {
  const { channel } = await params;
  if (!VALID_CHANNELS.includes(channel)) notFound();

  return (
    <Suspense fallback={<Loading />}>
      <ImagesView channel={channel} />
    </Suspense>
  );
}
