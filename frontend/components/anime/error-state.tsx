'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserFriendlyMessage } from '@/lib/api';

interface ErrorStateProps {
  error?: any;
  code?: string;
  message?: string;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function ErrorState({
  error,
  code,
  message,
  onRetry,
  title,
  className = '',
}: ErrorStateProps) {
  const errCode = code || error?.code || (error?.statusCode === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR');
  const errMessage = message || error?.userMessage || error?.message || '';
  const friendly = getUserFriendlyMessage(errCode, errMessage);
  const isRateLimited = errCode === 'RATE_LIMITED';

  return (
    <div
      className={`flex min-h-[280px] w-full flex-col items-center justify-center border border-white/10 bg-neutral-950 p-8 text-center ${className}`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center border border-white/20 bg-neutral-900 text-white">
        {isRateLimited ? (
          <Clock className="h-6 w-6 stroke-[1.5]" />
        ) : (
          <AlertCircle className="h-6 w-6 stroke-[1.5]" />
        )}
      </div>

      <h3 className="font-momo text-base font-bold uppercase tracking-tight text-white">
        {title || (isRateLimited ? 'Permintaan Melebihi Batas' : 'Terjadi Kesalahan')}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-relaxed text-neutral-400">
        {friendly}
      </p>

      {errCode && (
        <span className="mt-3 font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
          KODE: {errCode}
        </span>
      )}

      {onRetry && (
        <div className="mt-6">
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-white/20 bg-white/5 hover:bg-white hover:text-black"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isRateLimited ? 'Coba Lagi Nanti' : 'Coba Lagi'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
