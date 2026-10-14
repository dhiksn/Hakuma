import React from 'react';

const BARS = 12;
const DURATION = 1.2; // detik per putaran

export default function Loading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[60vh]">
      <style>{`
        @keyframes ios-fade {
          0%   { opacity: 1; }
          100% { opacity: 0.12; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ios-bar { animation: none !important; }
        }
      `}</style>

      <div role="status" className="flex flex-col items-center">
        <div className="relative h-16 w-16" aria-hidden="true">
          {Array.from({ length: BARS }).map((_, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{ transform: `rotate(${i * (360 / BARS)}deg)` }}
            >
              <div
                className="ios-bar absolute left-1/2 top-0 h-[28%] w-[8%] -translate-x-1/2 rounded-full bg-white"
                style={{
                  animation: `ios-fade ${DURATION}s linear infinite`,
                  animationDelay: `${(i - BARS) * (DURATION / BARS)}s`,
                }}
              />
            </div>
          ))}
        </div>

        <span className="mt-6 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Memuat Data Hakuma...
        </span>
      </div>
    </div>
  );
}