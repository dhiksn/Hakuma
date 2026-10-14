import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { SearchView } from './search-view';
import Loading from '../loading';

export const metadata: Metadata = {
  title: 'Pencarian & Eksplorasi',
  description: 'Filter dan telusuri anime berdasarkan tag, studio, dan jumlah penonton.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchView />
    </Suspense>
  );
}
