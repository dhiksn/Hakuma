import {
  ApiErrorCode,
  ApiErrorResponse,
  ApiResponse,
  BrowseData,
  HomeData,
  ImagesData,
  SearchResults,
  SeasonData,
  TagPageData,
  TrendingData,
  VideoDetail,
} from '@/types/api';
import { buildHanimeVideoUrl } from './utils';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiClientError extends Error {
  code: ApiErrorCode | string;
  statusCode: number;
  userMessage: string;

  constructor(code: ApiErrorCode | string, message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = getUserFriendlyMessage(code, message);
  }
}

/**
 * Mapping pesan error ramah pengguna dalam Bahasa Indonesia
 */
export function getUserFriendlyMessage(code: ApiErrorCode | string, fallbackMessage?: string): string {
  switch (code) {
    case 'RATE_LIMITED':
      return 'Terlalu banyak request. Mohon tunggu beberapa saat sebelum mencoba kembali.';
    case 'NOT_FOUND':
      return 'Data atau anime yang Anda cari tidak ditemukan.';
    case 'UPSTREAM_ERROR':
      return 'Server penyedia sumber sedang mengalami gangguan teknis.';
    case 'UPSTREAM_UNREACHABLE':
      return 'Tidak dapat terhubung ke server penyedia sumber.';
    case 'GATEWAY_TIMEOUT':
      return 'Waktu koneksi ke server sumber habis (timeout). Silakan coba lagi.';
    case 'INVALID_URL':
      return 'Tautan video yang diberikan tidak sah atau tidak didukung.';
    case 'INVALID_PARAMETER':
      return 'Parameter pencarian atau permintaan tidak valid.';
    case 'MISSING_PARAMETER':
      return 'Parameter wajib belum disertakan.';
    case 'INTERNAL_ERROR':
      return 'Terjadi kendala pada server backend Hakuma.';
    default:
      return fallbackMessage || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.';
  }
}

/**
 * Client HTTP terpusat dengan error parsing otomatis
 */
async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    });

    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

    if (!res.ok || (json && 'success' in json && !json.success)) {
      const errPayload = json as ApiErrorResponse | null;
      const code = errPayload?.error?.code || (res.status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR');
      const message = errPayload?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new ApiClientError(code, message, res.status);
    }

    if (!json || !('data' in json)) {
      // Beberapa endpoint mengembalikan data langsung atau di dalam root data
      if (json && 'success' in json && (json as any).data !== undefined) {
        return (json as any).data as T;
      }
      return json as unknown as T;
    }

    return json.data;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    // Network / fetch fail
    const errorMsg = err instanceof Error ? err.message : 'Koneksi ke backend Hakuma gagal';
    throw new ApiClientError('UPSTREAM_UNREACHABLE', errorMsg, 502);
  }
}

// ----------------------------------------------------------------------
// Specific API Endpoints
// ----------------------------------------------------------------------

/**
 * GET /api/home
 */
export async function fetchHome(revalidate: number = 300): Promise<HomeData> {
  return fetchApi<HomeData>('/api/home', {
    next: { revalidate },
  });
}

/**
 * GET /api/search
 */
export interface SearchApiParams {
  q?: string;
  order?: string;
  page?: number;
  page_size?: number;
  tags?: string | string[];
  brands?: string | string[];
  blacklist?: string | string[];
}

export async function fetchSearch(params: SearchApiParams = {}): Promise<SearchResults> {
  const qp = new URLSearchParams();

  if (params.q?.trim()) qp.set('q', params.q.trim());
  if (params.order) qp.set('order', params.order);
  if (params.page && params.page > 1) qp.set('page', String(params.page));
  if (params.page_size) qp.set('page_size', String(params.page_size));

  if (params.tags) {
    const t = Array.isArray(params.tags) ? params.tags.join(',') : params.tags;
    if (t.trim()) qp.set('tags', t.trim());
  }
  if (params.brands) {
    const b = Array.isArray(params.brands) ? params.brands.join(',') : params.brands;
    if (b.trim()) qp.set('brands', b.trim());
  }
  if (params.blacklist) {
    const bl = Array.isArray(params.blacklist) ? params.blacklist.join(',') : params.blacklist;
    if (bl.trim()) qp.set('blacklist', bl.trim());
  }

  const queryStr = qp.toString();
  const endpoint = `/api/search${queryStr ? `?${queryStr}` : ''}`;

  // /api/search returns a flat response (success, total, totalPages, data, etc.)
  // not wrapped in { data: ... }, so we handle it manually like fetchTrending
  const url = `${API_BASE_URL.replace(/\/+$/, '')}${endpoint}`;
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    // 404 means no results found — not a real error for search
    if (res.status === 404) {
      return {
        order: json?.order || 'recent_upload',
        total: 0,
        totalPages: 1,
        page: 1,
        pageSize: 24,
        filters: json?.filters || { query: null, tags: null, brands: null, blacklist: null },
        data: [],
      };
    }
    const code = json?.error?.code || (res.status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR');
    const message = json?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new ApiClientError(code, message, res.status);
  }

  return {
    order: json.order,
    total: json.total || 0,
    totalPages: json.totalPages || 1,
    page: json.page || 1,
    pageSize: json.pageSize || 24,
    filters: json.filters || { query: null, tags: null, brands: null, blacklist: null },
    data: json.data || [],
  };
}

/**
 * GET /api/video?url=
 * Mendukung masukan slug anime atau full URL hanime.tv
 */
export async function fetchVideo(slugOrUrl: string): Promise<VideoDetail> {
  const fullUrl = buildHanimeVideoUrl(slugOrUrl);
  const qp = new URLSearchParams({ url: fullUrl });
  return fetchApi<VideoDetail>(`/api/video?${qp.toString()}`, {
    cache: 'no-store', // video player links expire
  });
}

/**
 * GET /api/browse
 */
export async function fetchBrowse(revalidate: number = 3600): Promise<BrowseData> {
  return fetchApi<BrowseData>('/api/browse', {
    next: { revalidate },
  });
}

/**
 * GET /api/browse/tags/:slug
 */
export async function fetchTag(
  slug: string,
  page: number = 1,
  order: string = 'recent_upload',
  revalidate: number = 600
): Promise<TagPageData> {
  const encodedSlug = encodeURIComponent(slug.trim());
  const qp = new URLSearchParams({
    page: String(page),
    order,
  });
  const endpoint = `/api/browse/tags/${encodedSlug}?${qp.toString()}`;

  // browse/tags returns { success: true, items: [...], pagination: {...} }
  const url = `${API_BASE_URL.replace(/\/+$/, '')}${endpoint}`;
  const res = await fetch(url, { next: { revalidate } });
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const code = json?.error?.code || 'NOT_FOUND';
    const message = json?.error?.message || 'Gagal memuat tag';
    throw new ApiClientError(code, message, res.status);
  }

  return {
    items: json.data || [],
    pagination: json.pagination || {
      currentPage: page,
      totalPages: null,
      prevPage: null,
      nextPage: null,
    },
  };
}

/**
 * GET /api/browse/trending
 */
export async function fetchTrending(
  timespan: string = 'monthly',
  page: number = 1,
  revalidate: number = 600
): Promise<TrendingData> {
  const qp = new URLSearchParams({
    timespan,
    page: String(page),
  });
  const endpoint = `/api/browse/trending?${qp.toString()}`;

  // Endpoint returns { success: true, timespan, validTimespans, total, data: [...], pagination }
  const url = `${API_BASE_URL.replace(/\/+$/, '')}${endpoint}`;
  const res = await fetch(url, { next: { revalidate } });
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const code = json?.error?.code || 'NOT_FOUND';
    const message = json?.error?.message || 'Gagal memuat trending';
    throw new ApiClientError(code, message, res.status);
  }

  return {
    timespan: json.timespan,
    validTimespans: json.validTimespans || [],
    total: json.total || 0,
    data: json.data || [],
    pagination: json.pagination || {
      currentPage: page,
      totalPages: null,
      prevPage: null,
      nextPage: null,
    },
  };
}

/**
 * GET /api/browse/season
 */
export async function fetchSeason(
  year?: number,
  revalidate: number = 3600
): Promise<SeasonData> {
  const qp = new URLSearchParams();
  if (year) qp.set('year', String(year));
  const queryStr = qp.toString();
  const endpoint = `/api/browse/season${queryStr ? `?${queryStr}` : ''}`;

  return fetchApi<SeasonData>(endpoint, {
    next: { revalidate },
  });
}

/**
 * GET /api/browse/images
 */
export interface ImagesApiParams {
  channel?: string;
  page?: number;
  cursor?: string;
}

export async function fetchImages(params: ImagesApiParams = {}): Promise<ImagesData> {
  const qp = new URLSearchParams();
  if (params.channel && params.channel !== 'all') qp.set('channel', params.channel);
  if (params.page && params.page > 1) qp.set('page', String(params.page));
  if (params.cursor) qp.set('cursor', params.cursor);

  const queryStr = qp.toString();
  const endpoint = `/api/browse/images${queryStr ? `?${queryStr}` : ''}`;

  const url = `${API_BASE_URL.replace(/\/+$/, '')}${endpoint}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const code = json?.error?.code || 'NOT_FOUND';
    const message = json?.error?.message || 'Gagal memuat gambar';
    throw new ApiClientError(code, message, res.status);
  }

  return {
    channel: json.channel,
    availableChannels: json.availableChannels || [],
    perPage: json.perPage || 24,
    total: json.total,
    totalAll: json.totalAll,
    data: json.data || [],
    pagination: json.pagination || {
      currentPage: 1,
      totalPages: null,
      prevPage: null,
      nextPage: null,
    },
  };
}
