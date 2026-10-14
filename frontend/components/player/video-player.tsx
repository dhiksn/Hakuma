'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { PlayerSource } from '@/types/api';
import { formatSeconds } from '@/lib/utils';
import { QualitySelector } from './quality-selector';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  AlertCircle,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoPlayerProps {
  slug: string;
  title: string;
  thumbnail: string | null;
  sources: PlayerSource[];
  onRefreshSources?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  slug,
  title,
  thumbnail,
  sources,
  onRefreshSources,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Sort sources by height descending (e.g. 1080p -> 720p -> 480p)
  const sortedSources = [...sources].sort((a, b) => (b.height || 0) - (a.height || 0));

  const [activeSource, setActiveSource] = useState<PlayerSource | null>(
    sortedSources[0] || null
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBuffering, setIsBuffering] = useState(false);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Set initial source if updated from props
  useEffect(() => {
    if (sortedSources.length > 0 && (!activeSource || !sortedSources.some(s => s.url === activeSource.url))) {
      setActiveSource(sortedSources[0]);
    }
  }, [sources]);

  // Load HLS stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource?.url) return;

    setHasError(false);
    setErrorMessage('');

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeSource.url;
    // Proxy HLS through backend to avoid CORS block
    const proxyUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/proxy/hls?url=${encodeURIComponent(streamUrl)}`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(proxyUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setHasError(true);
              setErrorMessage('Gagal memuat segmen video (Network Error). Tautan streaming mungkin telah kedaluwarsa.');
              hls.destroy();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setHasError(true);
              setErrorMessage('Terjadi kesalahan fatal saat memutar stream HLS.');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = proxyUrl;
    } else {
      setHasError(true);
      setErrorMessage('Browser ini tidak mendukung pemutaran video HLS.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSource?.url, slug]);

  // Handle Fullscreen Change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls auto-hide timer
  const resetControlsTimer = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);

    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const v = Number(e.target.value);
    video.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 0.5;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleQualityChange = (source: PlayerSource) => {
    const video = videoRef.current;
    const prevTime = video ? video.currentTime : 0;
    const wasPlaying = video ? !video.paused : false;

    setActiveSource(source);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = prevTime;
        if (wasPlaying) videoRef.current.play().catch(() => {});
      }
    }, 200);
  };

  const handleRetry = () => {
    setHasError(false);
    if (onRefreshSources) {
      onRefreshSources();
    } else if (activeSource) {
      setActiveSource({ ...activeSource });
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      className="group relative aspect-video w-full overflow-hidden border border-white/20 bg-black shadow-2xl select-none"
    >
      <video
        ref={videoRef}
        poster={thumbnail || undefined}
        playsInline
        className="h-full w-full object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onDurationChange={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onClick={togglePlay}
      />

      {/* Buffering Indicator */}
      {isBuffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="h-10 w-10 animate-spin border-2 border-white/20 border-t-white" />
        </div>
      )}

      {/* Error Overlay with Fallback Retry */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 text-center z-30">
          <AlertCircle className="mb-3 h-10 w-10 text-neutral-400 stroke-[1.5]" />
          <h4 className="font-momo text-base font-bold uppercase tracking-tight text-white">
            Stream Tidak Dapat Diputar
          </h4>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-400">
            {errorMessage || 'Tautan pemutaran HLS telah kedaluwarsa atau server handshake sedang dibatasi.'}
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              onClick={handleRetry}
              size="sm"
              className="bg-white text-black hover:bg-neutral-200 uppercase tracking-wider text-xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Muat Ulang Stream
            </Button>
          </div>
        </div>
      )}

      {/* Floating Center Big Play Button (when paused) */}
      {!isPlaying && !hasError && (
        <button
          onClick={togglePlay}
          aria-label="Play Video"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center bg-white/90 text-black hover:bg-white hover:scale-110 transition-all shadow-xl"
        >
          <Play className="h-7 w-7 fill-current ml-1" />
        </button>
      )}

      {/* Custom Bottom Controls Bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300 z-20 ${
          controlsVisible || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div className="relative mb-3 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 cursor-pointer"
            aria-label="Video timeline scrubber"
          />
        </div>

        {/* Toolbar Items */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-1 hover:text-neutral-300 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1 hover:text-neutral-300 transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 hidden sm:inline-block cursor-pointer"
                aria-label="Volume slider"
              />
            </div>

            {/* Time Stamp */}
            <span className="font-mono text-[11px] text-neutral-300">
              {formatSeconds(currentTime)} / {formatSeconds(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback Rate Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px] text-white hover:bg-white/20"
                >
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="font-mono">{playbackRate}x</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px] bg-black border-white/20">
                {PLAYBACK_RATES.map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className="cursor-pointer text-xs font-mono py-1 focus:bg-white focus:text-black"
                  >
                    {rate}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quality Selector */}
            <QualitySelector
              sources={sortedSources}
              activeSource={activeSource}
              onSelect={handleQualityChange}
            />

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:text-neutral-300 transition-colors"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
