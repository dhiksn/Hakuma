'use client';

import React, { useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { fetchSearch } from '@/lib/api';
import { AnimeItem } from '@/types/api';
import { formatViews } from '@/lib/utils';
import {
  Flame,
  Calendar,
  Tag,
  Image as ImageIcon,
  Search,
  Eye,
  ArrowRight,
  Loader2,
  Film,
} from 'lucide-react';

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (⌘K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setIsSearching(false);
    }
  }, [open]);

  // Debounced search when query changes
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {                                                                                                                                                                                                                                                            
      try {
        const data = await fetchSearch({ q: trimmed, page_size: 4 });
        setResults(data?.data || []);
      } catch (err) {
        console.error('[CommandSearch] fetch error:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Reset scroll to top when new results arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [results]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    startTransition(() => {
      router.push(url);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleSelect(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <form onSubmit={handleSearchSubmit} className="relative">
        <CommandInput
          placeholder="Ketik judul anime, genre, atau studio..."
          value={query}
          onValueChange={setQuery}
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          </div>
        )}
      </form>

      <CommandList ref={listRef} className="p-2">
        <CommandEmpty className="py-6 text-center text-xs text-neutral-400">
          {query.trim().length >= 2 ? (
            <div className="space-y-3">
              <p>Tidak ada hasil instan untuk &quot;{query}&quot;.</p>
              <button
                type="button"
                onClick={() => handleSelect(`/search?q=${encodeURIComponent(query)}`)}
                className="inline-flex items-center gap-1.5 border border-white/20 bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-white hover:text-black transition-colors"
              >
                <span>Cari di Halaman Eksplor Lengkap</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            'Ketik minimal 2 huruf untuk mulai mencari...'
          )}
        </CommandEmpty>

        {/* Live Search Results */}
        {results.length > 0 && (
          <CommandGroup heading={`Hasil Pencarian Anime (${results.length})`}>
            {results.map((item) => {
              const slug = item.slug || item.url.replace(/.*\/videos\/hentai\//, '');
              const viewsDisplay = formatViews(item.views);

              return (
                <CommandItem
                  key={item.url || slug}
                  onSelect={() => handleSelect(`/watch/${slug}`)}
                  className="flex items-center gap-3 p-2 cursor-pointer rounded-none"
                >
                  {/* Portrait Thumbnail */}
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden bg-neutral-900 border border-white/10">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title || 'Anime Cover'}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-600">
                        <Film className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-momo text-xs font-medium text-white truncate">
                      {item.title}
                    </h4>
                    <div className="mt-0.5 flex items-center gap-3 font-mono text-xs text-neutral-400">
                      {item.brand && <span className="text-neutral-400">{item.brand}</span>}
                      {viewsDisplay !== '—' && (
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Eye className="h-2.5 w-2.5" />
                          {viewsDisplay}
                        </span>
                      )}
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        {item.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 capitalize">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 text-neutral-500 opacity-60 shrink-0" />
                </CommandItem>
              );
            })}

            <CommandItem
              onSelect={() => handleSelect(`/search?q=${encodeURIComponent(query)}`)}
              className="mt-2 border border-dashed border-white/20 p-2 text-center text-xs text-neutral-300 hover:text-white cursor-pointer justify-center"
            >
              <Search className="mr-2 h-3.5 w-3.5" />
              <span>Lihat semua hasil untuk &quot;{query}&quot; →</span>
            </CommandItem>
          </CommandGroup>
        )}

        {results.length > 0 && <CommandSeparator className="my-2" />}

        {/* Quick Navigations — only show when no search results */}
        {results.length === 0 && !isSearching && (
          <CommandGroup heading="Kategori & Navigasi">
            <CommandItem
              onSelect={() => handleSelect('/trending')}
              className="cursor-pointer py-2"
            >
              <Flame className="mr-2 h-4 w-4 text-neutral-400" />
              <span>Trending Anime (Populer)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect('/season')}
              className="cursor-pointer py-2"
            >
              <Calendar className="mr-2 h-4 w-4 text-neutral-400" />
              <span>Musiman (Season)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect('/tags')}
              className="cursor-pointer py-2"
            >
              <Tag className="mr-2 h-4 w-4 text-neutral-400" />
              <span>Semua Genre & Tag</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect('/images')}
              className="cursor-pointer py-2"
            >
              <ImageIcon className="mr-2 h-4 w-4 text-neutral-400" />
              <span>Galeri Gambar Komunitas</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
