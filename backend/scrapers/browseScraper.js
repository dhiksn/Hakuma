'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('../lib/httpClient');

/**
 * Scrape the browse page at https://hanime.tv/browse.
 *
 * The page has two sections:
 *  1. Featured categories — 4 big hero cards: Trending, Seasons, Random, Images.
 *     Each is an <a href="/browse/(trending|seasons|random|images)" class="group block relative aspect-[8/13] ...">
 *     containing a background image, title text, and description text.
 *
 *  2. Categories & Tags — a grid of tag tiles.
 *     Each is an <a href="/browse/tags/..." class="tile ..."> containing:
 *       - .tile-title        → tag name
 *       - .tile-description  → tag description blurb
 *       - .tile-count        → video count (e.g. "13")
 *       - CSS var --tile-art-wide on .tile-bg → wide banner image URL
 *
 * @returns {Promise<{ featured: object[], tags: object[] }>}
 */
async function scrapeBrowse() {
  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';
  const browseUrl = `${baseUrl}/browse`;

  const html = await fetchHtml(browseUrl);
  const $ = cheerio.load(html);

  // ------------------------------------------------------------------ //
  // 1. Featured categories                                              //
  // ------------------------------------------------------------------ //
  const featured = [];

  // Selector: <a> pointing to /browse/(trending|seasons|random|images)
  // that also carries the "group block" hero-card classes.
  $('a[href^="/browse/"]').filter((_, el) => {
    const href = $(el).attr('href') || '';
    // Only the big hero cards — they carry "group block relative aspect-[8/13]" in their class
    const cls = $(el).attr('class') || '';
    return /^\/browse\/(trending|seasons|random|images)$/.test(href) && cls.includes('aspect-[8/13]');
  }).each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href');
    const url = `${baseUrl}${href}`;
    const slug = href.replace('/browse/', '');

    // Thumbnail: the <img> inside carries src like "bg-trending.min.jpg"
    const thumbnail =
      $a.find('img').first().attr('src') ||
      $a.find('img').first().attr('data-src') ||
      null;

    // Title & description live in <div> elements deep inside .absolute.flex
    // Rather than fighting multiline Tailwind classes, grab all <div> text nodes
    // that are direct text content (not nested in other tags) and pick by length.
    const textDivs = [];
    $a.find('div').each((_, div) => {
      // Only divs whose *direct* text (not children) is non-empty
      const directText = $(div).clone().children().remove().end().text().trim();
      if (directText.length > 0) textDivs.push(directText);
    });

    // The title div is typically the shortest non-trivial text (1–3 words),
    // the description is a bit longer. Both appear in order in the DOM.
    // We also know the title matches the slug (e.g. "Trending" / "Seasons").
    const slugTitle = slug.charAt(0).toUpperCase() + slug.slice(1);
    let title = slugTitle;
    let description = null;

    // Find the div whose text equals the slug title (case-insensitive)
    const titleIdx = textDivs.findIndex(
      (t) => t.toLowerCase() === slug.toLowerCase()
    );
    if (titleIdx !== -1) {
      title = textDivs[titleIdx];
      // Description is the next non-empty text div after the title
      if (titleIdx + 1 < textDivs.length) {
        description = textDivs[titleIdx + 1] || null;
      }
    }

    featured.push({ title, slug, url, description, thumbnail });
  });

  // Filter out "random" from featured — it's not a browseable category
  const featuredSeen = new Set();
  const featuredDeduped = featured.filter((f) => {
    if (featuredSeen.has(f.slug)) return false;
    featuredSeen.add(f.slug);
    return f.slug !== 'random';
  });

  // ------------------------------------------------------------------ //
  // 2. Tag tiles                                                        //
  // ------------------------------------------------------------------ //
  const tags = [];

  $('a.tile[href^="/browse/tags/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const url = `${baseUrl}${href}`;

    // Slug: /browse/tags/blow%20job → decode → "blow job"
    const rawSlug = href.replace('/browse/tags/', '');
    const slug = decodeURIComponent(rawSlug);

    // Name
    const name = $a.find('.tile-title').first().text().trim() || slug;

    // Description blurb
    const description = $a.find('.tile-description').first().text().trim() || null;

    // Video count: .tile-count contains an icon + number text, e.g. "🎬13"
    // We strip non-digit leading chars and parse the number.
    const countRaw = $a.find('.tile-count').first().text().trim();
    const countMatch = countRaw.match(/(\d[\d,]*)/);
    const videoCount = countMatch ? parseInt(countMatch[1].replace(',', ''), 10) : null;

    // Wide banner image from the CSS custom property on .tile-bg:
    //   style="--tile-art-wide:url('https://...')"
    const tileBgStyle = $a.find('.tile-bg').first().attr('style') || '';
    const wideMatch = tileBgStyle.match(/--tile-art-wide:url\(['"]?([^'")]+)['"]?\)/);
    const tallMatch = tileBgStyle.match(/--tile-art-tall:url\(['"]?([^'")]+)['"]?\)/);
    const thumbnail = wideMatch ? wideMatch[1] : (tallMatch ? tallMatch[1] : null);

    tags.push({ name, url, description, videoCount, thumbnail });
  });

  return {
    featured: featuredDeduped,
    tags,
  };
}

// ------------------------------------------------------------------ //

const VALID_TAG_ORDERS = [
  'recent_upload',   // created_at_desc (default)
  'old_upload',      // created_at_asc
  'newest',          // released_at_desc
  'oldest',          // released_at_asc
  'most_views',      // views_desc
  'least_views',     // views_asc
  'most_likes',      // likes_desc
  'title_az',        // name_asc
  'title_za',        // name_desc
];
const DEFAULT_TAG_ORDER = 'recent_upload';

// Map dari nama order API kita → nilai ?order= yang diterima hanime.tv
const TAG_ORDER_MAP = {
  recent_upload: 'created_at_desc',
  old_upload:    'created_at_asc',
  newest:        'released_at_desc',
  oldest:        'released_at_asc',
  most_views:    'views_desc',
  least_views:   'views_asc',
  most_likes:    'likes_desc',
  title_az:      'name_asc',
  title_za:      'name_desc',
};

/**
 * Scrape a tag-filtered browse page.
 *
 * @param {string} slug  - Tag slug, e.g. "blow job" (will be URI-encoded).
 * @param {number} page  - 1-based page number.
 * @param {string} order - Sort order. Default: 'created_at_desc'.
 * @returns {Promise<{ items: object[], pagination: object }>}
 */
async function scrapeTagPage(slug, page = 1, order = DEFAULT_TAG_ORDER) {
  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';

  const encodedSlug = encodeURIComponent(slug);
  const params = new URLSearchParams();
  if (page > 1) params.set('page', page);
  const hanimeOrder = TAG_ORDER_MAP[order] || TAG_ORDER_MAP[DEFAULT_TAG_ORDER];
  if (hanimeOrder !== TAG_ORDER_MAP[DEFAULT_TAG_ORDER]) params.set('order', hanimeOrder);
  const query = params.toString();
  const url = `${baseUrl}/browse/tags/${encodedSlug}${query ? '?' + query : ''}`;

  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const items = [];
  const seen = new Set();

  // Video card selectors
  const cardSelectors = [
    '.video-card-wrapper',
    '.video-card',
    '[class*="video-card"]',
    'a[href*="/videos/hentai"]',
  ];

  let $cards = $();
  for (const sel of cardSelectors) {
    $cards = $(sel);
    if ($cards.length > 0) break;
  }

  $cards.each((_, cardEl) => {
    const $card = $(cardEl);

    const href =
      $card.is('a') ? $card.attr('href') : $card.find('a[href*="/videos/hentai"]').first().attr('href');
    if (!href) return;

    const itemUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
    if (seen.has(itemUrl)) return;
    seen.add(itemUrl);

    const title =
      $card.find('h3').first().text().trim() ||
      $card.find('img').first().attr('alt')?.trim() ||
      null;

    const thumbnail =
      $card.find('img').first().attr('src') ||
      $card.find('img').first().attr('data-src') ||
      null;

    // Views
    let views = null;
    $card.find('span').each((_, spanEl) => {
      const text = $(spanEl).text().trim();
      if (/^\d+(\.\d+)?[KMB]?$/.test(text)) {
        views = text;
        return false;
      }
    });

    const episode =
      $card.find('[class*="episode"], [class*="ep-"]').first().text().trim() || null;

    const status =
      $card.find('[class*="status"]').first().text().trim() || null;

    const item = { title, thumbnail, url: itemUrl, views, episode, status };
    Object.keys(item).forEach((k) => (item[k] == null || item[k] === '') && delete item[k]);
    items.push(item);
  });

  const pagination = buildPagination($, html, page);

  return { items, pagination };
}

/**
 * Build pagination metadata from the rendered page.
 *
 * Priority order for total_pages:
 *  1. Astro island props  →  props="...&quot;total_pages&quot;:[0,105]..."
 *  2. Pagination button text  →  "Page 1 / 105"
 *  3. Highest ?page=N href found on the page
 */
function buildPagination($, html, currentPage) {
  let totalPages = null;

  // --- Strategy 1: Astro island props (most reliable) ---
  // The tag page embeds: {"page_number":[0,1],"total_pages":[0,105],...}
  const propsRegex = /props="(\{[^"]*&quot;total_pages&quot;[^"]*\})"/g;
  let propsMatch;
  while ((propsMatch = propsRegex.exec(html)) !== null) {
    const raw = propsMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    try {
      const props = JSON.parse(raw);
      // Astro encodes as [type, value]
      const tp = Array.isArray(props.total_pages) ? props.total_pages[1] : props.total_pages;
      if (typeof tp === 'number' && tp > 0) {
        totalPages = tp;
        break;
      }
    } catch (_) {}
  }

  // --- Strategy 2: "Page N / TOTAL" button text ---
  if (totalPages === null) {
    $('button[aria-label*="page"], button[aria-label*="Page"]').each((_, el) => {
      const text = $( el).text().trim(); // e.g. "Page 1 / 105"
      const m = text.match(/page\s+\d+\s*\/\s*(\d+)/i);
      if (m) { totalPages = parseInt(m[1], 10); return false; }
    });
  }

  // --- Strategy 3: highest ?page=N in any href ---
  if (totalPages === null) {
    $('a[href*="page="]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/page=(\d+)/);
      if (m) {
        const p = parseInt(m[1], 10);
        if (!totalPages || p > totalPages) totalPages = p;
      }
    });
  }

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = (totalPages === null || currentPage < totalPages) ? currentPage + 1 : null;

  return {
    currentPage,
    totalPages,
    prevPage,
    nextPage,
  };
}

module.exports = { scrapeBrowse, scrapeTagPage, VALID_TAG_ORDERS, DEFAULT_TAG_ORDER };
