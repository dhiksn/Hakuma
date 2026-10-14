'use client';

import React, { useEffect } from 'react';
import { ErrorState } from '@/components/anime/error-state';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error Boundary caught error:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-16 flex items-center justify-center min-h-[60vh]">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
