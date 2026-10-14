import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { ImagesView } from './images-view';
import Loading from '../loading';

export const metadata: Metadata = {
  title: 'Community Images & Galeri',
  description: 'Telusuri koleksi gambar dan ilustrasi komunitas Hakuma dengan cursor-based pagination.',
};

export default function ImagesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ImagesView />
    </Suspense>
  );
}
