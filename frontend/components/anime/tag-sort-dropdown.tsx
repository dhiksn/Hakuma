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
import { ArrowUpDown } from 'lucide-react';

const DEFAULT_ORDER = 'recent_upload';

interface TagSortDropdownProps {
  currentOrder: string;
  slug: string;
  options: { value: string; label: string }[];
}

export function TagSortDropdown({ currentOrder, slug, options }: TagSortDropdownProps) {
  const router = useRouter();

  const handleOrderChange = (newOrder: string) => {
    const encodedSlug = encodeURIComponent(slug);
    if (newOrder === DEFAULT_ORDER) {
      router.push(`/tags/${encodedSlug}`);
    } else {
      router.push(`/tags/${encodedSlug}/${encodeURIComponent(newOrder)}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400 shrink-0">
        <ArrowUpDown className="h-3 w-3 text-neutral-400" />
        <span>URUTAN:</span>
      </div>
      <div className="w-40 sm:w-44">
        <Select value={currentOrder} onValueChange={handleOrderChange}>
          <SelectTrigger className="h-8 border-white/20 bg-neutral-950 px-2.5 font-mono text-[11px] text-white transition-colors hover:border-white/50 focus:ring-1 focus:ring-white">
            <SelectValue placeholder="Pilih Urutan" />
          </SelectTrigger>
          <SelectContent
            className="border-white/20 bg-neutral-950 font-mono text-[11px]"
            style={{ width: 'var(--radix-select-trigger-width)' }}
          >
            {options.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer font-mono text-[11px] text-white focus:bg-white focus:text-black data-[state=checked]:font-bold"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
