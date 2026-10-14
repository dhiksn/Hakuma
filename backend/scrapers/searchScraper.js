'use strict';

const axios = require('axios');

/**
 * Valid sort orders — match hanime.tv UI labels exactly.
 */
const VALID_ORDERS = [
  'recent_upload',  // created_at_unix desc (default)
  'old_upload',     // created_at_unix asc
  'most_views',     // views desc
  'least_views',    // views asc
  'most_likes',     // likes desc
  'least_likes',    // likes asc
  'newest',         // released_at_unix desc
  'oldest',         // released_at_unix asc
  'title_az',       // name asc  (Alphabetical A-Z)
  'title_za',       // name desc (Alphabetical Z-A)
];

const DEFAULT_ORDER    = 'recent_upload';
const DEFAULT_PAGE_SIZE = 24;

const SORTERS = {
  recent_upload: (a, b) => (b.created_at_unix || 0) - (a.created_at_unix || 0),
  old_upload:    (a, b) => (a.created_at_unix || 0) - (b.created_at_unix || 0),
  most_views:    (a, b) => (b.views || 0)           - (a.views || 0),
  least_views:   (a, b) => (a.views || 0)           - (b.views || 0),
  most_likes:    (a, b) => (b.likes || 0)           - (a.likes || 0),
  least_likes:   (a, b) => (a.likes || 0)           - (b.likes || 0),
  newest:        (a, b) => (b.released_at_unix || 0) - (a.released_at_unix || 0),
  oldest:        (a, b) => (a.released_at_unix || 0) - (b.released_at_unix || 0),
  title_az:      (a, b) => (a.name || '').localeCompare(b.name || ''),
  title_za:      (a, b) => (b.name || '').localeCompare(a.name || ''),
};

/**
 * Search hentai videos via hanime.tv's internal search API.
 *
 * The search API (guest.freeanimehentai.net/api/v11/search_hvs) returns ALL
 * database entries loosely matching the query. We apply:
 *   1. Title filter   — keep only items whose name/alt-titles contain the query
 *                       (empty query = no title filter → browse all)
 *   2. Tags filter    — keep items that have ALL specified tags (AND logic)
 *   3. Brands filter  — keep items whose brand matches any specified brand (OR logic)
 *   4. Blacklist      — remove items that have ANY blacklisted tag
 *   5. Sort           — client-side by the chosen order
 *   6. Paginate
 *
 * @param {object}   opts
 * @param {string}   opts.query      - Search keyword. Empty = browse all.
 * @param {string}   opts.order      - Sort order. Default: 'recent_upload'.
 * @param {number}   opts.page       - 1-based page number. Default: 1.
 * @param {number}   opts.pageSize   - Items per page. Default: 24.
 * @param {string[]} opts.tags       - Tag slugs to include (AND). Default: [].
 * @param {string[]} opts.brands     - Brand names to include (OR). Default: [].
 * @param {string[]} opts.blacklist  - Tag slugs to exclude (OR). Default: [].
 */
async function scrapeSearch({
  query     = '',
  order     = DEFAULT_ORDER,
  page      = 1,
  pageSize  = DEFAULT_PAGE_SIZE,
  tags      = [],
  brands    = [],
  blacklist = [],
} = {}) {
  const response = await axios.get('https://guest.freeanimehentai.net/api/v11/search_hvs', {
    params: { search_text: query || '' },
    headers: {
      'Referer':    'https://hanime.tv/',
      'Origin':     'https://hanime.tv',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '15000', 10),
  });

  let items = Object.values(response.data?.data || {});

  if (items.length === 0) {
    return { total: 0, totalPages: 0, page, pageSize, order, data: [] };
  }

  const queryLower     = query.trim().toLowerCase();
  const tagsLower      = tags.map((t) => t.toLowerCase());
  const brandsLower    = brands.map((b) => b.toLowerCase());
  const blacklistLower = blacklist.map((t) => t.toLowerCase());

  // ------------------------------------------------------------------ //
  // 1. Title filter (skip if query is empty)                            //
  // ------------------------------------------------------------------ //
  if (queryLower) {
    items = items.filter((v) => {
      const name = (v.name || '').toLowerCase();
      const searchTitles = Array.isArray(v.search_titles)
        ? v.search_titles.join(' ').toLowerCase()
        : (v.search_titles || '').toLowerCase();
      return name.includes(queryLower) || searchTitles.includes(queryLower);
    });
  }

  // ------------------------------------------------------------------ //
  // 2. Tags filter — item must have ALL specified tags (AND)            //
  // ------------------------------------------------------------------ //
  if (tagsLower.length > 0) {
    items = items.filter((v) => {
      const itemTags = (v.tags || []).map((t) => (t.text || t).toLowerCase());
      return tagsLower.every((tag) => itemTags.includes(tag));
    });
  }

  // ------------------------------------------------------------------ //
  // 3. Brands filter — item must match ANY specified brand (OR)         //
  // ------------------------------------------------------------------ //
  if (brandsLower.length > 0) {
    items = items.filter((v) => {
      const itemBrand = (v.brand || '').toLowerCase();
      return brandsLower.some((b) => itemBrand === b || itemBrand.includes(b));
    });
  }

  // ------------------------------------------------------------------ //
  // 4. Blacklist — remove items with ANY blacklisted tag                //
  // ------------------------------------------------------------------ //
  if (blacklistLower.length > 0) {
    items = items.filter((v) => {
      const itemTags = (v.tags || []).map((t) => (t.text || t).toLowerCase());
      return !blacklistLower.some((tag) => itemTags.includes(tag));
    });
  }

  // ------------------------------------------------------------------ //
  // 5. Sort                                                             //
  // ------------------------------------------------------------------ //
  items = [...items].sort(SORTERS[order] || SORTERS.recent_upload);

  // ------------------------------------------------------------------ //
  // 6. Paginate                                                         //
  // ------------------------------------------------------------------ //
  const total      = items.length;
  const totalPages = Math.ceil(total / pageSize) || 0;
  const offset     = (page - 1) * pageSize;
  const pageItems  = items.slice(offset, offset + pageSize);

  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';

  return {
    total,
    totalPages,
    page,
    pageSize,
    order,
    filters: {
      query:     query || null,
      tags:      tagsLower.length   > 0 ? tagsLower   : null,
      brands:    brandsLower.length > 0 ? brandsLower : null,
      blacklist: blacklistLower.length > 0 ? blacklistLower : null,
    },
    data: pageItems.map((v) => normalizeItem(v, baseUrl)),
  };
}

function normalizeItem(v, baseUrl) {
  return {
    title:      v.name      || null,
    slug:       v.slug      || null,
    url:        v.slug ? `${baseUrl}/videos/hentai/${v.slug}` : null,
    thumbnail:  v.cover_url || v.poster_url || null,
    views:      v.views     ?? null,
    likes:      v.likes     ?? null,
    brand:      v.brand     || null,
    tags:       Array.isArray(v.tags) ? v.tags.map((t) => t.text || t).filter(Boolean) : [],
    releasedAt: v.released_at || null,
    createdAt:  v.created_at  || null,
  };
}

module.exports = { scrapeSearch, VALID_ORDERS, DEFAULT_ORDER, DEFAULT_PAGE_SIZE };
