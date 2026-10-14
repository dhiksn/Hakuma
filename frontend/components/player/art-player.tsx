'use client';

import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { PlayerSource } from '@/types/api';

interface ArtPlayerProps {
  slug: string;
  title: string;
  thumbnail: string | null;
  sources: PlayerSource[];
  onRefreshSources?: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function proxyUrl(url: string) {
  return `${API_BASE}/api/proxy/hls?url=${encodeURIComponent(url)}`;
}

function playM3u8(video: HTMLVideoElement, url: string, art: Artplayer) {
  if (Hls.isSupported()) {
    if ((art as any)._hls) {
      (art as any)._hls.destroy();
    }
    const hls = new Hls({ enableWorker: true });
    (art as any)._hls = hls;
    hls.loadSource(url);
    hls.attachMedia(video);
    art.on('destroy', () => hls.destroy());
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
  } else {
    art.notice.show = 'Browser tidak mendukung HLS.';
  }
}

export function ArtPlayer({
  slug,
  title,
  thumbnail,
  sources,
  onRefreshSources,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);

  // Sort sources descending by height
  const sorted = [...sources].sort((a, b) => (b.height || 0) - (a.height || 0));

  const qualities = sorted.map((s, i) => ({
    default: i === 0,
    html: s.quality || `${s.height}p`,
    url: proxyUrl(s.url),
  }));

  useEffect(() => {
    if (!containerRef.current || sorted.length === 0) return;

    // Destroy any existing instance first (React StrictMode mounts twice)
    if (artRef.current) {
      try {
        if ((artRef.current as any)._hls) {
          (artRef.current as any)._hls.destroy();
        }
        artRef.current.destroy(false);
      } catch (_) {}
      artRef.current = null;
    }

    // Clear container innerHTML to prevent $control_option redefinition error
    containerRef.current.innerHTML = '';

    const art = new Artplayer({
      container: containerRef.current,
      url: qualities[0].url,
      type: 'm3u8',
      poster: thumbnail || '',
      volume: 1,
      autoSize: false,
      autoMini: false,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      setting: true,
      hotkey: true,
      pip: true,
      fullscreen: true,
      fullscreenWeb: true,
      mutex: true,
      backdrop: false,
      lang: 'en',
      theme: '#ffffff',
      quality: qualities.length > 1 ? qualities : [],
      customType: {
        m3u8: playM3u8,
      },
    });

    artRef.current = art;

    return () => {
      if ((art as any)._hls) {
        (art as any)._hls.destroy();
      }
      art.destroy(false);
      artRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Update sources when they change (refresh)
  useEffect(() => {
    const art = artRef.current;
    if (!art || sorted.length === 0) return;
    art.switchUrl(qualities[0].url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-video border border-white/20 bg-black"
    />
  );
}
