import React from 'react';
import { Metadata } from 'next';
import { fetchHome } from '@/lib/api';
import { HeroBanner } from '@/components/anime/hero-banner';
import { SectionHeader } from '@/components/anime/section-header';
import { AnimeCard } from '@/components/anime/anime-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ErrorState } from '@/components/anime/error-state';

export const metadata: Metadata = {
  title: 'Beranda — Hakuma Editorial Stream',
  description: 'Temukan anime terbaru, rilis populer, dan arsip kurasi terlengkap.',
};

export const revalidate = 300; // revalidate every 5 minutes

export default async function HomePage() {
  let homeData;
  let fetchError = null;

  try {
    homeData = await fetchHome(300);
  } catch (err: any) {
    fetchError = err;
  }

  if (fetchError || !homeData) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16">
        <ErrorState
          error={fetchError}
          title="Gagal Memuat Beranda"
          message="Tidak dapat mengambil katalog utama dari backend Hakuma. Pastikan server backend sedang aktif."
        />
      </div>
    );
  }

  // Find trending section for Hero banner
  const trendingSection = homeData.sections.find((s) =>
    s.title.toLowerCase().includes('trending')
  );
  const heroItem =
    trendingSection?.items?.[0] ||
    homeData.sections[0]?.items?.[0] ||
    null;

  return (
    <div className="pb-16">
      {/* Hero Banner with #1 Item */}
      <div className="container mx-auto px-4 sm:px-6 pt-6">
        <HeroBanner item={heroItem} />

        {/* Dynamic Sections with Carousel */}
        <div className="space-y-12">
          {homeData.sections.map((section, idx) => (
            <section key={section.title || idx} className="relative">
              <SectionHeader
                title={section.title}
                subtitle={section.subtitle}
                allUrl={section.allUrl}
                className="mb-4"
              />

              <Carousel
                opts={{
                  align: 'start',
                  dragFree: true,
                }}
                className="w-full"
              >
                <div className="flex items-center justify-end gap-2 mb-2">
                  <CarouselPrevious className="static translate-y-0" />
                  <CarouselNext className="static translate-y-0" />
                </div>
                <CarouselContent className="-ml-3">
                  {section.items.map((item, itemIdx) => (
                    <CarouselItem
                      key={item.url || itemIdx}
                      className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
                    >
                      <AnimeCard
                        item={item}
                        priority={idx === 0 && itemIdx < 6}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
