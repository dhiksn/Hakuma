import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { ImagesView } from './_images-view';
import Loading from '../loading';

export const metadata: Metadata = {
  title: 'Community Images & Galeri',
  description: 'Telusuri koleksi gambar dan ilustrasi komunitas Hakuma.',
};

// /images → all channels
export default function ImagesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ImagesView channel="all" />
    </Suspense>
  );
}
