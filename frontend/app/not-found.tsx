import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-24 flex flex-col items-center justify-center text-center min-h-[65vh]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center border border-white/20 bg-neutral-950 text-white">
        <FileQuestion className="h-7 w-7 stroke-[1.5]" />
      </div>
      <h1 className="font-momo text-3xl font-bold tracking-tight text-white uppercase">
        404 — Tidak Ditemukan
      </h1>
      <p className="mt-2 max-w-sm text-xs text-neutral-400 leading-relaxed">
        Halaman atau video yang Anda cari mungkin telah dipindahkan, dihapus, atau tidak pernah ada.
      </p>
      <div className="mt-8">
        <Button asChild variant="outline" size="sm" className="border-white/20 hover:bg-white hover:text-black">
          <Link href="/" className="flex items-center gap-2 uppercase tracking-wider text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
