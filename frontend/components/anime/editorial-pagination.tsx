'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil } from 'lucide-react';

interface EditorialPaginationProps {
  currentPage: number;
  totalPages: number | null;
  hrefPattern?: string; // string template with [page], e.g. "/trending/weekly/page/[page]"
  baseHref?: string;    // base URL; pagination appends /page/N (or nothing for page 1)
  hrefBuilder?: (page: number) => string; // client-only: function override
  onPageChange?: (page: number) => void;
  className?: string;
}

export function EditorialPagination({
  currentPage,
  totalPages,
  hrefPattern,
  baseHref,
  hrefBuilder,
  onPageChange,
  className = '',
}: EditorialPaginationProps) {
  const router = useRouter();
  const total = totalPages || 1;

  const [isEditing, setIsEditing] = useState(false);
  const [inputPage, setInputPage] = useState(String(currentPage));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  // Click outside to cancel edit mode automatically
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsEditing(false);
        setInputPage(String(currentPage));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isEditing, currentPage]);

  if (total <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < total;

  // Resolve URL — hrefBuilder > baseHref > hrefPattern
  const resolveHref = (pageNumber: number): string => {
    if (hrefBuilder) return hrefBuilder(pageNumber);
    if (baseHref) {
      // baseHref = "/trending" or "/trending/weekly"
      // page 1 → baseHref, page N → baseHref/page/N
      return pageNumber <= 1 ? baseHref : `${baseHref}/page/${pageNumber}`;
    }
    if (!hrefPattern) return '#';
    const url = hrefPattern.replace(/\[page\]/g, String(pageNumber));
    if (pageNumber <= 1) {
      try {
        const [base, qs] = url.split('?');
        if (!qs) return base;
        const params = new URLSearchParams(qs);
        params.delete('page');
        const remaining = params.toString();
        return remaining ? `${base}?${remaining}` : base;
      } catch {
        return url;
      }
    }
    return url;
  };

  const useHref = !!(hrefBuilder || baseHref || hrefPattern);

  // Jump to specific page
  const handleJump = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(total, targetPage));
    setIsEditing(false);
    if (clamped === currentPage) return;

    if (useHref) {
      router.push(resolveHref(clamped));
    } else if (onPageChange) {
      onPageChange(clamped);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(inputPage, 10);
    if (!isNaN(parsed)) {
      handleJump(parsed);
    } else {
      setIsEditing(false);
      setInputPage(String(currentPage));
    }
  };

  // Generate numbered pages with smart ellipsis
  const getPages = (): (number | 'ellipsis')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 'ellipsis', total];
    }

    if (currentPage >= total - 2) {
      return [1, 'ellipsis', total - 3, total - 2, total - 1, total];
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', total];
  };

  const pages = getPages();

  // Render button or Link depending on mode
  const renderItem = (
    p: number,
    label: React.ReactNode,
    isActive = false,
    key?: string | number
  ) => {
    const itemClasses = `flex h-9 min-w-9 items-center justify-center px-3 font-mono text-xs transition-all border select-none ${
      isActive
        ? 'bg-white text-black font-bold border-white pointer-events-none'
        : 'bg-neutral-950 text-neutral-300 border-white/20 hover:border-white hover:bg-white hover:text-black'
    }`;

    if (useHref) {
      return (
        <Link
          key={key ?? p}
          href={resolveHref(p)}
          className={itemClasses}
          aria-current={isActive ? 'page' : undefined}
        >
          {label}
        </Link>
      );
    }

    return (
      <button
        key={key ?? p}
        type="button"
        onClick={() => onPageChange && onPageChange(p)}
        className={itemClasses}
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
      </button>
    );
  };

  const renderPrevButton = () => {
    const btnClasses =
      'flex h-9 w-9 items-center justify-center border border-white/20 bg-neutral-950 text-white transition-all hover:border-white hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-25 disabled:border-white/10';

    if (useHref) {
      if (!canPrev) {
        return (
          <span className={btnClasses} aria-disabled="true">
            <ArrowLeft className="h-4 w-4" />
          </span>
        );
      }
      return (
        <Link
          href={resolveHref(currentPage - 1)}
          className={btnClasses}
          aria-label="Halaman sebelumnya"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      );
    }

    return (
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onPageChange && onPageChange(currentPage - 1)}
        className={btnClasses}
        aria-label="Halaman sebelumnya"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    );
  };

  const renderNextButton = () => {
    const btnClasses =
      'flex h-9 w-9 items-center justify-center border border-white/20 bg-neutral-950 text-white transition-all hover:border-white hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-25 disabled:border-white/10';

    if (useHref) {
      if (!canNext) {
        return (
          <span className={btnClasses} aria-disabled="true">
            <ArrowRight className="h-4 w-4" />
          </span>
        );
      }
      return (
        <Link
          href={resolveHref(currentPage + 1)}
          className={btnClasses}
          aria-label="Halaman berikutnya"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      );
    }

    return (
      <button
        type="button"
        disabled={!canNext}
        onClick={() => onPageChange && onPageChange(currentPage + 1)}
        className={btnClasses}
        aria-label="Halaman berikutnya"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    );
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 pt-8 pb-4 border-t border-white/10 ${className}`}
    >
      {/* Top Page Numbers Control Row */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {/* Previous Button */}
        {renderPrevButton()}

        {/* Numbered Page Buttons & Ellipsis */}
        {pages.map((p, idx) => {
          if (p === 'ellipsis') {
            return (
              <div
                key={`ellipsis-${idx}`}
                className="flex h-9 w-9 items-center justify-center text-neutral-500 font-mono"
              >
                <MoreHorizontal className="h-4 w-4" />
              </div>
            );
          }

          const isActive = p === currentPage;
          return renderItem(p, p, isActive, `page-${p}`);
        })}

        {/* Next Button */}
        {renderNextButton()}
      </div>

      {/* Interactive Editorial Page Indicator with Quick Jump */}
      <div className="min-h-7 flex items-center justify-center">
        {isEditing ? (
          <form
            ref={formRef}
            onSubmit={handleJumpSubmit}
            className="flex items-center gap-1.5 font-mono text-[11px]"
          >
            <span className="text-neutral-400 uppercase tracking-widest">HALAMAN</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={total}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setInputPage(String(currentPage));
                }
              }}
              autoFocus
              className="h-6 w-14 border border-white bg-black px-1 text-center font-mono text-xs font-bold text-white outline-none focus:ring-1 focus:ring-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-neutral-400 uppercase tracking-widest">
              DARI <span className="text-white font-bold">{total}</span>
            </span>
            <button
              type="submit"
              className="h-6 border border-white/20 bg-neutral-900 px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black transition-colors ml-1"
            >
              LOMPAT ↵
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setInputPage(String(currentPage));
              }}
              className="h-6 px-1.5 font-mono text-[10px] text-neutral-500 hover:text-white transition-colors"
              title="Batal"
            >
              ✕
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            <span>HALAMAN</span>
            <button
              type="button"
              onClick={() => {
                setInputPage(String(currentPage));
                setIsEditing(true);
              }}
              className="group flex items-center gap-1 border-b border-dashed border-white/40 px-1 py-0.5 font-bold text-white transition-all hover:border-white hover:bg-white/10 cursor-pointer"
              title="Klik untuk melompat ke nomor halaman"
            >
              <span>{currentPage}</span>
              <Pencil className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
            <span>
              DARI <span className="text-white font-bold">{total}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
