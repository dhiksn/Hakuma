'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { TagItem } from '@/types/api';

const SORT_OPTIONS = [
  { value: 'recent_upload', label: 'Upload Terbaru' },
  { value: 'old_upload', label: 'Upload Terlama' },
  { value: 'most_views', label: 'Paling Banyak Ditonton' },
  { value: 'least_views', label: 'Paling Sedikit Ditonton' },
  { value: 'most_likes', label: 'Paling Banyak Disukai' },
  { value: 'least_likes', label: 'Paling Sedikit Disukai' },
  { value: 'newest', label: 'Rilis Terbaru' },
  { value: 'oldest', label: 'Rilis Terlama' },
  { value: 'title_az', label: 'Judul (A — Z)' },
  { value: 'title_za', label: 'Judul (Z — A)' },
];

interface FilterBarProps {
  availableTags?: TagItem[];
  totalResults?: number;
}

export function FilterBar({ availableTags = [], totalResults }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get('q') || '';
  const currentOrder = searchParams.get('order') || 'recent_upload';
  const currentTagsRaw = searchParams.get('tags') || '';
  const currentBrandsRaw = searchParams.get('brands') || '';
  const currentBlacklistRaw = searchParams.get('blacklist') || '';

  const [q, setQ] = useState(currentQ);
  const [order, setOrder] = useState(currentOrder);
  const [brands, setBrands] = useState(currentBrandsRaw);
  const [blacklist, setBlacklist] = useState(currentBlacklistRaw);

  const selectedTags = currentTagsRaw
    ? currentTagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState('');

  // Update query in URL — strip default values so URL stays clean
  const applyFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val.trim() === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    // Always reset page on filter change
    params.delete('page');

    // Strip defaults so URL stays clean
    if (params.get('order') === 'recent_upload') params.delete('order');

    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ''}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q, order, brands, blacklist });
  };

  const handleOrderChange = (newOrder: string) => {
    setOrder(newOrder);
    applyFilters({ order: newOrder });
  };

  const handleToggleTag = (tag: string) => {
    let newTags: string[];
    if (selectedTags.includes(tag)) {
      newTags = selectedTags.filter((t) => t !== tag);
    } else {
      newTags = [...selectedTags, tag];
    }
    applyFilters({ tags: newTags.join(',') });
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = selectedTags.filter((t) => t !== tag);
    applyFilters({ tags: newTags.join(',') });
  };

  const handleResetFilters = () => {
    setQ('');
    setOrder('recent_upload');
    setBrands('');
    setBlacklist('');
    router.push('/search');
  };

  const hasActiveFilters =
    Boolean(currentQ) ||
    currentOrder !== 'recent_upload' ||
    selectedTags.length > 0 ||
    Boolean(currentBrandsRaw) ||
    Boolean(currentBlacklistRaw);

  return (
    <div className="mb-8 space-y-4 border border-white/10 bg-neutral-950 p-4 sm:p-5">
      {/* Top Search Input & Order */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul anime atau karakter..."
            className="pl-9 bg-black border-white/20 text-xs text-white placeholder:text-neutral-500"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                applyFilters({ q: '' });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="w-full sm:w-56">
          <Select value={order} onValueChange={handleOrderChange}>
            <SelectTrigger className="bg-black border-white/20">
              <SelectValue placeholder="Urutkan..." />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="bg-white text-black hover:bg-neutral-200">
          Cari
        </Button>
      </form>

      {/* Advanced Tag & Brand Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
        {/* Tag Picker Dialog with Command */}
        <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-neutral-900 text-[11px] gap-1.5"
            >
              <Plus className="h-3 w-3" />
              <span>Pilih Tag ({selectedTags.length})</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-white/20 bg-black p-0">
            <DialogHeader className="p-4 border-b border-white/10">
              <DialogTitle className="text-sm uppercase tracking-wider">
                Filter Tag (AND Logic)
              </DialogTitle>
            </DialogHeader>
            <Command className="bg-transparent">
              <CommandInput
                placeholder="Ketik nama tag..."
                value={tagSearchInput}
                onValueChange={setTagSearchInput}
              />
              <CommandList className="max-h-72 p-2">
                <CommandEmpty>Tag tidak ditemukan.</CommandEmpty>
                <CommandGroup>
                  {availableTags.map((t) => {
                    const isSelected = selectedTags.includes(t.name);
                    return (
                      <CommandItem
                        key={t.name}
                        onSelect={() => handleToggleTag(t.name)}
                        className="flex items-center justify-between text-xs cursor-pointer py-2"
                      >
                        <span className="capitalize">{t.name}</span>
                        <div className="flex items-center gap-2">
                          {t.videoCount && (
                            <span className="font-mono text-[10px] text-neutral-500">
                              {t.videoCount}
                            </span>
                          )}
                          <div
                            className={`flex h-4 w-4 items-center justify-center border border-white/30 ${
                              isSelected ? 'bg-white text-black' : 'bg-transparent'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>

        {/* Brand Filter Input */}
        <div className="flex items-center gap-1.5">
          <Input
            value={brands}
            onChange={(e) => setBrands(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters({ brands });
              }
            }}
            placeholder="Filter Brand (e.g. PoRO, T-Rex)"
            className="h-8 w-44 bg-neutral-900 border-white/20 text-[11px] placeholder:text-neutral-500"
          />
        </div>

        {/* Blacklist Filter Input */}
        <div className="flex items-center gap-1.5">
          <Input
            value={blacklist}
            onChange={(e) => setBlacklist(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters({ blacklist });
              }
            }}
            placeholder="Blacklist Tag (e.g. yaoi,scat)"
            className="h-8 w-44 bg-neutral-900 border-white/20 text-[11px] placeholder:text-neutral-500"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-[11px] text-neutral-400 hover:text-white ml-auto"
          >
            Reset Semua
          </Button>
        )}
      </div>

      {/* Selected Tags Chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="font-mono text-[10px] uppercase text-neutral-500">
            Tag Terpilih:
          </span>
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="flex items-center gap-1 bg-neutral-900 border-white/30 text-[10px] text-white pr-1"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-neutral-400 ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Results Count Header */}
      {totalResults !== undefined && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono text-[11px] text-neutral-500">
          <span>Hasil Ditemukan: {totalResults.toLocaleString()} judul</span>
          <span>Halaman {searchParams.get('page') || '1'}</span>
        </div>
      )}
    </div>
  );
}
