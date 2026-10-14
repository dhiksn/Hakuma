import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ekstrak slug anime dari URL hanime.tv
 * Contoh:
 *   "https://hanime.tv/videos/hentai/kanojo-saimin-1" -> "kanojo-saimin-1"
 *   "/videos/hentai/kanojo-saimin-1" -> "kanojo-saimin-1"
 *   "kanojo-saimin-1" -> "kanojo-saimin-1"
 */
export function extractSlugFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  const clean = url.trim().replace(/\/+$/, '');
  const match = clean.match(/\/videos\/hentai\/([^/?#]+)/);
  if (match) return match[1];

  // Jika URL berupa slug langsung
  const segments = clean.split('/');
  return segments[segments.length - 1] || '';
}

/**
 * Rekonstruksi URL penuh hanime.tv untuk pemanggilan endpoint /api/video?url=...
 */
export function buildHanimeVideoUrl(slugOrUrl: string): string {
  if (!slugOrUrl) return '';
  if (slugOrUrl.startsWith('http://') || slugOrUrl.startsWith('https://')) {
    return slugOrUrl;
  }
  const cleanSlug = extractSlugFromUrl(slugOrUrl);
  return `https://hanime.tv/videos/hentai/${cleanSlug}`;
}

/**
 * Format jumlah views secara ringkas (e.g. 3.1M, 850K)
 */
export function formatViews(views: string | number | null | undefined): string {
  if (views === null || views === undefined || views === '') return '—';
  if (typeof views === 'string') {
    // Jika sudah terformat seperti "3.1M" atau "120K"
    if (/^\d+(\.\d+)?[KMB]?$/i.test(views.trim())) {
      return views.trim();
    }
    const num = Number(views.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) return formatNumberCompact(num);
    return views;
  }
  return formatNumberCompact(views);
}

/**
 * Format likes / dislikes ringkas (e.g. 8.7K)
 */
export function formatLikes(likes: number | null | undefined): string {
  if (likes === null || likes === undefined) return '0';
  return formatNumberCompact(likes);
}

export function formatNumberCompact(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

/**
 * Hitung rasio like vs dislike dalam persentase
 */
export function calculateApproval(likes: number | null | undefined, dislikes: number | null | undefined): number {
  const l = likes || 0;
  const d = dislikes || 0;
  const total = l + d;
  if (total === 0) return 100;
  return Math.round((l / total) * 100);
}

/**
 * Format durasi video ke "MM:SS" atau "HH:MM:SS"
 */
export function formatDuration(duration: string | null | undefined): string {
  if (!duration) return '—';
  // Jika format ISO "PT16M25S"
  if (duration.startsWith('PT')) {
    const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (m) {
      const h = parseInt(m[1] || '0', 10);
      const min = parseInt(m[2] || '0', 10);
      const sec = parseInt(m[3] || '0', 10);
      if (h > 0) {
        return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      }
      return `${min}:${String(sec).padStart(2, '0')}`;
    }
  }
  return duration;
}

/**
 * Format tanggal rilis
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Format waktu detik ke MM:SS untuk video player
 */
export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
