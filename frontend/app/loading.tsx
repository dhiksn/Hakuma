import React from 'react';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 animate-spin border-2 border-white/20 border-t-white" />
      <span className="mt-4 font-mono text-xs uppercase tracking-widest text-neutral-400">
        Memuat Data Hakuma...
      </span>
    </div>
  );
}
