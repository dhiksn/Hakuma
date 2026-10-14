export type ApiErrorCode =
  | 'MISSING_PARAMETER'
  | 'INVALID_PARAMETER'
  | 'INVALID_URL'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_UNREACHABLE'
  | 'GATEWAY_TIMEOUT';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode | string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AnimeItem {
  title: string | null;
  slug?: string | null;
  url: string;
  thumbnail: string | null;
  views?: string | number | null;
  rank?: number;
  episode?: string | null;
  status?: string | null;
  likes?: number | null;
  brand?: string | null;
  tags?: string[];
  releasedAt?: string | null;
  createdAt?: string | null;
}

export interface HomeSection {
  title: string;
  subtitle?: string | null;
  allUrl?: string | null;
  items: AnimeItem[];
}

export interface HomeData {
  sections: HomeSection[];
  total: number;
}

export interface Pagination {
  currentPage: number;
  totalPages: number | null;
  prevPage: number | null;
  nextPage: number | null;
  prevCursor?: string | null;
  nextCursor?: string | null;
}

export interface SearchFilters {
  query: string | null;
  tags: string[] | null;
  brands: string[] | null;
  blacklist: string[] | null;
}

export interface SearchResults {
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  order: string;
  filters: SearchFilters;
  data: AnimeItem[];
}

export interface FeaturedCategory {
  title: string;
  slug: string;
  url: string;
  description: string | null;
  thumbnail: string | null;
}

export interface TagItem {
  name: string;
  url: string;
  description: string | null;
  videoCount: number | null;
  thumbnail: string | null;
}

export interface BrowseData {
  featured: FeaturedCategory[];
  tags: TagItem[];
}

export interface TagPageData {
  items: AnimeItem[];
  pagination: Pagination;
}

export interface TrendingData {
  timespan: string;
  validTimespans: string[];
  total: number;
  data: AnimeItem[];
  pagination: Pagination;
}

export interface SeasonGroup {
  name: string;
  year: number;
  videoCount?: number | null;
  items: AnimeItem[];
}

export interface SeasonData {
  year: number;
  availableYears: number[];
  seasons: SeasonGroup[];
}

export interface ImageItem {
  url: string;
  thumbnail: string | null;
  uploader: string | null;
  channel: string | null;
  width: number | null;
  height: number | null;
}

export interface ChannelOption {
  name: string;
  count: number | null;
}

export interface ImagesData {
  channel: string | string[] | null;
  availableChannels: ChannelOption[];
  perPage: number;
  total: number | null;
  totalAll: number | null;
  data: ImageItem[];
  pagination: Pagination;
}

export interface Episode {
  title: string | null;
  slug: string;
  url: string;
  thumbnail?: string | null;
}

export interface PlayerSource {
  quality: string;
  height: number;
  url: string;
  type: 'hls' | string;
  thumbnail?: string | null;
}

export interface VideoDetail {
  id: number | null;
  title: string;
  slug: string;
  thumbnail: string | null;  // cover portrait — untuk card/list
  poster: string | null;     // landscape preview — untuk video player
  description: string | null;
  tags: string[];
  brand: string | null;
  duration: string | null;
  releasedAt?: string | null;
  uploadedAt?: string | null;
  rating: {
    likes: number | null;
    dislikes: number | null;
  } | null;
  views: number | string | null;
  episodes: Episode[];
  player: PlayerSource[];
}

export type SearchOrder =
  | 'recent_upload'
  | 'old_upload'
  | 'most_views'
  | 'least_views'
  | 'most_likes'
  | 'least_likes'
  | 'newest'
  | 'oldest'
  | 'title_az'
  | 'title_za';

export type TrendingTimespan =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi-annual'
  | 'yearly';
