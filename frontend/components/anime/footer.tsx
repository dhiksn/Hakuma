import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black py-12 text-neutral-400">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand & Adult Disclaimer */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              {/* Wadah Ikon Bersih Tanpa Garis Sudut/Bingkai */}
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden">
                <img 
                  src="/icon1.png" 
                  alt="Hakuma" 
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="font-momo text-sm font-bold tracking-widest text-white uppercase">
                HAKUMA
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-neutral-400">
              Hakuma adalah antarmuka streaming anime editorial pihak ketiga berbasis web. Proyek ini tidak berafiliasi resmi dengan situs web manapun. Seluruh media dan merek dagang dimiliki oleh hak cipta produsen masing-masing.
            </p>
            <div className="inline-block border border-white/20 bg-neutral-950 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-300">
              Peringatan: Khusus 18 Tahun ke Atas (Dewasa)
            </div>
          </div>

          {/* Navigation Directory */}
          <div className="space-y-2">
            <h4 className="font-momo text-xs font-semibold uppercase tracking-wider text-white">
              Direktori
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link href="/trending" className="hover:text-white transition-colors">
                  Trending Populer
                </Link>
              </li>
              <li>
                <Link href="/season" className="hover:text-white transition-colors">
                  Season (Musiman)
                </Link>
              </li>
              <li>
                <Link href="/tags" className="hover:text-white transition-colors">
                  Katalog Kategori & Tag
                </Link>
              </li>
              <li>
                <Link href="/images" className="hover:text-white transition-colors">
                  Galeri Komunitas
                </Link>
              </li>
            </ul>
          </div>

          {/* Information & Tech Specs */}
          <div className="space-y-2">
            <h4 className="font-momo text-xs font-semibold uppercase tracking-wider text-white">
              Spesifikasi Sistem
            </h4>
            <div className="space-y-1 font-mono text-[11px] text-neutral-400">
              <p>Player: HLS Native Engine</p>
              <p>Framework: Next.js 15 App Router</p>
              <p>Engine: Hakuma REST API</p>
              <p>Aesthetic: Pure Monochrome Editorial</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row font-mono text-[11px] text-neutral-400">
          <p>© {new Date().getFullYear()} Hakuma Streaming. Seluruh hak cipta dilindungi undang-undang.</p>
          <div className="flex gap-4">
            <span className="text-neutral-400">18+ ONLY</span>
            <span className="text-neutral-400">ROBOTS: NOINDEX</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
