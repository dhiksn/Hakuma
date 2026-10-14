import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string | null;
  allUrl?: string | null;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  allUrl,
  className = '',
}: SectionHeaderProps) {
  // Map API allUrl to internal web routes
  const resolveInternalUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.includes('/api/browse/trending')) return '/trending';
    if (url.includes('/api/browse/season')) return '/season';
    if (url.includes('/api/browse/images')) return '/images';
    if (url.includes('/api/browse')) return '/tags';
    if (url.includes('/api/search')) {
      return url.replace('/api/search', '/search');
    }
    if (url.startsWith('/')) return url;
    return null;
  };

  const internalHref = resolveInternalUrl(allUrl);

  return (
    <div
      className={`flex items-baseline justify-between border-b border-white/10 pb-2.5 ${className}`}
    >
      <div className="flex items-baseline gap-3">
        <h2 className="font-momo text-base sm:text-lg font-bold tracking-tight text-white uppercase">
          {title}
        </h2>
        {subtitle && (
          <span className="font-mono text-[11px] text-neutral-400">
            / {subtitle}
          </span>
        )}
      </div>

      {internalHref && (
        <Link
          href={internalHref}
          className="group flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-neutral-400 transition-colors hover:text-white"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
