'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getAgeGateConsent, setAgeGateConsent } from '@/lib/storage';
import { ShieldAlert } from 'lucide-react';

export function AgeGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const verified = getAgeGateConsent();
    if (!verified) {
      setIsOpen(true);
      document.body.classList.add('age-gate-active');
    }
  }, []);

  if (!isMounted) return null;

  const handleConfirm = () => {
    setAgeGateConsent(true);
    setIsOpen(false);
    document.body.classList.remove('age-gate-active');
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md border-white/20 bg-black text-white p-8">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-white/30 bg-neutral-900">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest text-neutral-400 uppercase font-mono">
                Verifikasi Usia
              </span>
              <AlertDialogTitle className="font-momo text-2xl tracking-tight text-white uppercase">
                Konten Dewasa (18+)
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-xs leading-relaxed text-neutral-300">
            Situs ini memuat konten animasi eksplisit yang ditujukan hanya untuk pengguna berusia 18 tahun ke atas.
            Dengan melanjutkan, Anda menyatakan secara sadar bahwa Anda telah cukup umur secara hukum di yurisdiksi Anda untuk melihat konten dewasa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={handleDecline}
            className="w-full sm:w-auto border-white/20 bg-transparent text-xs hover:bg-neutral-900 uppercase tracking-wider"
          >
            Keluar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="w-full sm:w-auto bg-white text-black text-xs font-semibold hover:bg-neutral-200 uppercase tracking-wider"
          >
            Saya 18 Tahun ke Atas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
