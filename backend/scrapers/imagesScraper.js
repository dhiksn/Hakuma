'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('../lib/httpClient');

const VALID_CHANNELS = ['media', 'nsfw-general', 'furry', 'futa', 'yaoi', 'yuri', 'traps', 'irl-3d'];

/**
 * Scrape https://hanime.tv/browse/images
 *
 * PAGINATION BEHAVIOUR:
 *
 * hanime.tv uses cursor-based pagination. The `before=<ID>` cursor in next_href
 * is required to get the CORRECT page when a channel filter is active.
 * Without it the server returns a different (wrong) slice of data.
 *
 * For the "all channels" view (no filter), page numbers work directly via
 * /browse/images/{N} — no cursor drift occurs.
 *
 * Strategy:
 *  - No channel filter  → /browse/images/{N}  (page number, fast, accurate)
 *  - Channel filter     → follow cursor chain from page 1 up to target page
 *                         (slower for large N, but guaranteed correct results)
 *  - Explicit cursor    → use it directly (fastest, always accurate)
 *
 * @param {object}      opts
 * @param {string|null} opts.channel  - Channel filter slug (optional).
 * @param {number}      opts.page     - Target page number (default: 1).
 * @param {string|null} opts.cursor   - Exact cursor from pagination.nextCursor/prevCursor.
 *                                      When provided, page param is ignored.
 */
async function scrapeImages({ channel = null, page = 1, cursor = null } = {}) {
  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';

  let targetUrl;

  if (cursor) {
    // Caller provided an exact cursor — use it directly
    const u = new URL(cursor, baseUrl);
    if (channel) u.searchParams.set('channels', channel);
    targetUrl = u.toString();
  } else if (!channel || page <= 1) {
    // No channel filter OR page 1 — page number works fine directly
    const params = new URLSearchParams();
    if (channel) params.set('channels', channel);
    const query = params.toString();
    targetUrl = `${baseUrl}/browse/images${page > 1 ? `/${page}` : ''}${query ? '?' + query : ''}`;
  } else {
    // Channel filter + page > 1 — must walk the cursor chain to get accurate results
    targetUrl = await resolveCursorForPage(baseUrl, channel, page);
  }

  return fetchAndParse(targetUrl, baseUrl);
}

/**
 * Walk the cursor chain from page 1 to reach the correct URL for `targetPage`.
 * Each iteration uses the `next_href` from the current page response.
 *
 * @param {string} baseUrl
 * @param {string} channel
 * @param {number} targetPage
 * @returns {Promise<string>} Resolved URL for targetPage
 */
async function resolveCursorForPage(baseUrl, channel, targetPage) {
  const params = new URLSearchParams({ channels: channel });
  let currentUrl = `${baseUrl}/browse/images?${params}`;

  for (let p = 1; p < targetPage; p++) {
    const html = await fetchHtml(currentUrl);
    const nextHref = extractNextHref(html);

    if (!nextHref) {
      // No more pages — just try direct URL as fallback
      return `${baseUrl}/browse/images/${targetPage}?channels=${encodeURIComponent(channel)}`;
    }

    const u = new URL(nextHref, baseUrl);
    currentUrl = u.toString();
  }

  return currentUrl;
}

/**
 * Extract next_href from Astro island props in raw HTML.
 */
function extractNextHref(html) {
  const re = /props="(\{[^"]*&quot;available_channels&quot;[^"]*\})"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    try {
      const props = JSON.parse(raw);
      const val = Array.isArray(props.next_href) ? props.next_href[1] : props.next_href;
      return val || null;
    } catch (_) {}
  }
  return null;
}

/**
 * Fetch a URL and parse the images page into a structured response.
 */
async function fetchAndParse(url, baseUrl) {
  const html = await fetchHtml(url);
  const $    = cheerio.load(html);

  // ------------------------------------------------------------------ //
  // Parse Astro island props                                            //
  // ------------------------------------------------------------------ //
  let props = {};
  const propsRe = /props="(\{[^"]*&quot;available_channels&quot;[^"]*\})"/g;
  let pm;
  while ((pm = propsRe.exec(html)) !== null) {
    const raw = pm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    try { props = JSON.parse(raw); break; } catch (_) {}
  }

  const decode    = (v) => Array.isArray(v) ? v[1] : v;
  const decodeArr = (v) => {
    if (!v) return [];
    const arr = decode(v);
    return Array.isArray(arr) ? arr.map(decode).filter(Boolean) : [];
  };
  const decodeObj = (v) => {
    if (!v) return {};
    const obj = decode(v);
    if (typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out = {};
    for (const [k, val] of Object.entries(obj)) out[k] = decode(val);
    return out;
  };

  const availableChannels = decodeArr(props.available_channels);
  const channelCounts     = decodeObj(props.channel_counts);
  const pageNumber        = decode(props.page_number) ?? 1;
  const totalPages        = decode(props.total_pages) ?? null;
  const total             = decode(props.total)       ?? null;
  const totalAll          = decode(props.total_all)   ?? null;
  const pageSize          = decode(props.page_size)   ?? 24;
  const activeChannels    = decodeArr(props.explicit_channels);
  const rawNextHref       = decode(props.next_href)   ?? null;
  const rawPrevHref       = decode(props.prev_href)   ?? null;

  // ------------------------------------------------------------------ //
  // Parse image cards                                                   //
  // ------------------------------------------------------------------ //
  const items = [];
  const $grid      = $('astro-slot[name="grid"]');
  const $container = $grid.length ? $grid : $('div.flex.flex-wrap');

  $container.find('a[href][target="_blank"]').each((_, el) => {
    const $a      = $(el);
    const fullUrl = $a.attr('href') || '';
    if (!fullUrl.includes('cu-images.') && !fullUrl.includes('hanime-cdn')) return;

    const thumbnail    = $a.find('img').first().attr('src') || null;
    const altText      = $a.find('img').first().attr('alt') || '';
    const uploader     = altText.match(/by\s+(.+)$/i)?.[1]?.trim() ?? null;
    const channelBadge = $a.find('span').first().text().trim().replace(/^#/, '') || null;
    const width        = parseInt($a.find('img').first().attr('width'),  10) || null;
    const height       = parseInt($a.find('img').first().attr('height'), 10) || null;

    const item = { url: fullUrl, thumbnail, uploader, channel: channelBadge, width, height };
    Object.keys(item).forEach((k) => item[k] == null && delete item[k]);
    items.push(item);
  });

  return {
    channel: activeChannels.length === 1
      ? activeChannels[0]
      : (activeChannels.length > 1 ? activeChannels : null),
    availableChannels: [
      { name: 'all', count: totalAll },
      ...availableChannels.map((ch) => ({ name: ch, count: channelCounts[ch] ?? null })),
    ],
    perPage: pageSize,
    total,
    totalAll,
    data: items,
    pagination: {
      currentPage: pageNumber,
      totalPages,
      prevPage: pageNumber > 1 ? pageNumber - 1 : null,
      nextPage: (totalPages === null || pageNumber < totalPages) ? pageNumber + 1 : null,
      prevCursor: rawPrevHref || null,
      nextCursor: rawNextHref || null,
    },
  };
}

module.exports = { scrapeImages, VALID_CHANNELS };
