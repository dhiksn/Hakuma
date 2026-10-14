'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, ArrowLeft, ArrowRight } from 'lucide-react';

interface YearSelectorProps {
  currentYear: number;
  availableYears: number[];
}

export function YearSelector({ currentYear, availableYears }: YearSelectorProps) {
  const router = useRouter();

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr, 10);
    const currentYear = new Date().getFullYear();
    if (year === currentYear) {
      router.push('/season');
    } else {
      router.push(`/season/${yearStr}`);
    }
  };

  // availableYears is sorted descending: [2026, 2025, 2024, ..., 1986]
  const currentIndex = availableYears.indexOf(currentYear);

  // Left arrow: go to previous chronological year (older year: e.g. 2026 -> 2025)
  const prevYear =
    currentIndex !== -1 && currentIndex < availableYears.length - 1
      ? availableYears[currentIndex + 1]
      : availableYears.includes(currentYear - 1)
      ? currentYear - 1
      : null;

  // Right arrow: go to next chronological year (newer year: e.g. 2025 -> 2026)
  const nextYear =
    currentIndex > 0
      ? availableYears[currentIndex - 1]
      : availableYears.includes(currentYear + 1)
      ? currentYear + 1
      : null;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Tombol Panah Kiri (Tahun Sebelumnya) */}
      <button
        type="button"
        disabled={!prevYear}
        onClick={() => prevYear && handleYearChange(String(prevYear))}
        className="flex h-10 w-10 items-center justify-center border border-white/20 bg-neutral-950 text-white transition-all hover:border-white/50 hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-30 disabled:border-white/10"
        aria-label="Tahun sebelumnya"
        title={prevYear ? `Tahun ${prevYear}` : 'Tidak ada tahun sebelumnya'}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      {/* Dropdown Pemilih Tahun */}
      <div className="w-40 sm:w-44">
        <Select value={String(currentYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="h-10 bg-neutral-950 border-white/20 text-xs font-mono text-white hover:border-white/40 focus:ring-1 focus:ring-white">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <span>Tahun {currentYear}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-72 bg-neutral-950 border-white/20">
            {availableYears.map((y) => (
              <SelectItem
                key={y}
                value={String(y)}
                className="font-mono text-xs cursor-pointer focus:bg-white focus:text-black"
              >
                Tahun {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tombol Panah Kanan (Tahun Selanjutnya) */}
      <button
        type="button"
        disabled={!nextYear}
        onClick={() => nextYear && handleYearChange(String(nextYear))}
        className="flex h-10 w-10 items-center justify-center border border-white/20 bg-neutral-950 text-white transition-all hover:border-white/50 hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-30 disabled:border-white/10"
        aria-label="Tahun berikutnya"
        title={nextYear ? `Tahun ${nextYear}` : 'Tidak ada tahun berikutnya'}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
