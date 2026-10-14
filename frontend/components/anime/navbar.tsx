'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CommandSearch } from './command-search';

const NAV_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/trending', label: 'Trending' },
  { href: '/season', label: 'Season' },
  { href: '/tags', label: 'Tags' },
  { href: '/images', label: 'Images' },
  { href: '/search', label: 'Eksplor' },
];

export function Navbar() {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* 1. Left: Brand Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-momo text-base sm:text-lg font-black tracking-tight text-white uppercase hover:opacity-90 transition-opacity"
            >
              <div className="relative h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                <Image
                  src="/icon1.png"
                  alt="Hakuma"
                  fill
                  sizes="32px"
                  className="object-contain"
                  priority
                />
              </div>
              <span className="tracking-widest">HAKUMA</span>
            </Link>
          </div>

          {/* 2. Center: Centered Navigation Menu */}
          <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-2">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider font-medium transition-all ${
                    isActive
                      ? 'text-white border-b-2 border-white font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* 3. Right: Prominent Search Box & Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Prominent Search Modal Trigger Box */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="group flex h-9 w-40 sm:w-56 md:w-60 lg:w-72 items-center justify-between border border-white/20 bg-neutral-950 px-3 text-xs text-neutral-400 transition-all hover:border-white/50 hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
              aria-label="Buka pencarian anime (⌘K)"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-neutral-500 transition-colors group-hover:text-white shrink-0" />
                <span className="truncate text-xs">Cari anime...</span>
              </div>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 border border-white/15 bg-black px-1.5 font-mono text-[10px] text-neutral-400 group-hover:text-neutral-200">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Navigation Drawer */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden border border-white/10 text-white h-9 w-9"
                  aria-label="Menu navigasi"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 border-l border-white/20 bg-black p-6">
                <SheetHeader className="mb-6 text-left border-b border-white/10 pb-4">
                  <SheetTitle className="font-momo text-base uppercase tracking-wider text-white">
                    HAKUMA
                  </SheetTitle>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
                    Editorial Stream
                  </span>
                </SheetHeader>
                <div className="flex flex-col space-y-2">
                  {NAV_LINKS.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setSheetOpen(false)}
                        className={`px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                          isActive
                            ? 'bg-white text-black font-semibold'
                            : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Instant Search Modal Dialog */}
      <CommandSearch open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
