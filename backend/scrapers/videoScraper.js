'use strict';

const cheerio = require('cheerio');
const axios = require('axios');
const { fetchHtml } = require('../lib/httpClient');

/**
 * Scrape detail page of a single hentai video on hanime.tv.
 *
 * hanime.tv renders video pages with Astro (SSR). Key data sources:
 *
 * 1. JSON-LD <script type="application/ld+json"> — name, thumbnail, uploadDate, duration
 * 2. Astro island props — video_id, likes, dislikes, slug, next_video_href, poster_url
 * 3. HTML body — tags (a[href*="/browse/tags/"]), brand (a[href*="/browse/brands/"]),
 *                release date (data-tip), episodes (a[href*="/videos/hentai/"]),
 *                related franchise videos
 * 4. Player island — the video player is loaded client-side, but the HLS manifest
 *                    URL is injected via a <script> or window variable we can extract
 *
 * @param {string} videoUrl - Full URL of the video page.
 * @returns {Promise<object>}
 */
async function scrapeVideo(videoUrl) {
  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';
  const html = await fetchHtml(videoUrl);
  const $ = cheerio.load(html);

  // ------------------------------------------------------------------ //
  // 1. JSON-LD — basic info                                             //
  // ------------------------------------------------------------------ //
  let jsonLd = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '');
      if (parsed['@type'] === 'VideoObject') jsonLd = parsed;
    } catch (_) {}
  });

  // ------------------------------------------------------------------ //
  // 2. Astro island props                                               //
  // ------------------------------------------------------------------ //
  let videoId    = null;
  let likes      = null;
  let dislikes   = null;
  let slug       = null;
  let astroPosterUrl  = null;
  let nextHref   = null;

  const propsRe = /props="(\{[^"]+\})"/g;
  let pm;
  while ((pm = propsRe.exec(html)) !== null) {
    const raw = pm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    try {
      const p = JSON.parse(raw);
      const dec = (v) => Array.isArray(v) ? v[1] : v;

      if (p.video_id != null)    videoId  = dec(p.video_id);
      if (p.likes    != null)    likes    = dec(p.likes);
      if (p.dislikes != null)    dislikes = dec(p.dislikes);
      if (p.slug     != null)    slug     = dec(p.slug);
      if (p.poster_url != null)  astroPosterUrl = dec(p.poster_url);
      if (p.next_video_href != null) nextHref = dec(p.next_video_href);
    } catch (_) {}
  }

  // ------------------------------------------------------------------ //
  // 3. HTML body parsing                                                //
  // ------------------------------------------------------------------ //

  // Title
  const title =
    jsonLd.name ||
    $('h1').first().text().trim() ||
    $('title').text().replace(/\s*[-|].*$/, '').trim() ||
    null;

  // Thumbnail (cover portrait) — untuk card/list
  const thumbnail =
    jsonLd.thumbnailUrl ||
    $('meta[property="og:image"]').attr('content') ||
    null;

  // Poster (landscape preview) — khusus untuk video player background
  // Posters live at hanime-cdn.com/images/posters/<slug>-poster...
  let poster = null;
  const posterMatch = html.match(
    new RegExp(`hanime-cdn\\.com/images/posters/${slug}[^"'\\s&<]+\\.(?:webp|jpg|jpeg|png)`, 'i')
  );
  if (posterMatch) {
    poster = `https://${posterMatch[0]}`;
  }

  // Description — ambil dari section Synopsis di HTML
  // Struktur: <h2>Synopsis</h2> → <div data-expand-content> → <span> → <p>...</p><p>...</p>
  let description = null;

  // Cari h2 dengan teks "Synopsis" lalu ambil semua <p> di dalam section-nya
  $('h2').each((_, h2El) => {
    if ($(h2El).text().trim() !== 'Synopsis') return;
    // Ambil parent section/div lalu cari semua <p> di dalamnya
    const $section = $(h2El).parent();
    const paragraphs = [];
    $section.find('p').each((_, pEl) => {
      const text = $(pEl).text().trim();
      if (text) paragraphs.push(text);
    });
    if (paragraphs.length > 0) {
      description = paragraphs.join('\n\n');
      return false;
    }
  });

  // Duration — parse ISO 8601 PT16M25S → "16:25"
  const durationIso = jsonLd.duration || null;
  const duration = durationIso ? parseIsoDuration(durationIso) : null;

  // Upload / release dates
  const uploadedAt = jsonLd.uploadDate || null;

  // Release date from data-tip attribute on date tooltip button
  // Markup: <button data-tip="August 27, 2026">
  let releasedAt = null;
  $('button[data-tip]').each((_, el) => {
    const tip = $(el).attr('data-tip') || '';
    // Match "August 27, 2026" format
    if (/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(tip)) {
      const d = new Date(tip);
      if (!isNaN(d)) { releasedAt = d.toISOString().slice(0, 10); return false; }
    }
  });

  // Tags — only the badge-style tag links in the video info section
  // They have class "badge badge-outline badge-lg" (not the footer text links)
  // Also filter by "title" attribute "Browse more videos with X tag"
  const tags = [];
  const seenTags = new Set();
  $('a[href*="/browse/tags/"][title*="Browse more videos with"]').each((_, el) => {
    const tag = $(el).text().trim();
    if (tag && !seenTags.has(tag.toLowerCase())) {
      seenTags.add(tag.toLowerCase());
      tags.push(tag);
    }
  });

  // Brand / Studio — a[href*="/browse/brands/"]
  let brand = null;
  const brandEl = $('a[href*="/browse/brands/"]').first();
  if (brandEl.length) {
    brand = brandEl.find('strong').text().trim() || brandEl.text().trim() || null;
  }

  // Likes / Dislikes (from props above, or try HTML)
  if (likes === null) {
    const likesText = $('[data-likes], [class*="like-count"]').first().text().trim();
    likes = likesText ? parseInt(likesText.replace(/[^0-9]/g, ''), 10) || null : null;
  }

  // Views — look for view count near eye icon
  let views = null;
  $('[class*="views"], [class*="view-count"]').each((_, el) => {
    const t = $(el).text().trim().replace(/[^0-9]/g, '');
    if (t) { views = parseInt(t, 10); return false; }
  });

  // Episode list — build from search API using the base slug
  // e.g. "kanojo-saimin-1" → search for "kanojo-saimin" → all episodes
  const episodes = await fetchEpisodes(slug, baseUrl);

  // If search returned nothing, fall back to next_video_href from props
  if (episodes.length === 0 && nextHref) {
    const nextSlug = nextHref.replace(/.*\/videos\/hentai\//, '');
    episodes.push({
      title: null,
      slug: nextSlug,
      url: nextHref.startsWith('http') ? nextHref : `${baseUrl}${nextHref}`,
    });
  }

  // Related franchise — series thumbnails shown below the player
  // Look for video cards that are NOT the current video
  const related = [];
  const seenRelated = new Set([slug]);
  $('[class*="franchise"] a[href*="/videos/hentai/"], [class*="related"] a[href*="/videos/hentai/"], [class*="series"] a[href*="/videos/hentai/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const relSlug = href.replace(/.*\/videos\/hentai\//, '');
    if (!relSlug || seenRelated.has(relSlug)) return;
    seenRelated.add(relSlug);
    related.push({
      title: $a.find('h3, img').first().attr('alt') || $a.text().trim() || null,
      slug: relSlug,
      url: href.startsWith('http') ? href : `${baseUrl}${href}`,
      thumbnail: $a.find('img').first().attr('src') || null,
    });
  });

  // Player sources via handshake
  const { resolvePlayer } = require('../services/playerService');
  const player = await resolvePlayer(slug, '', poster);

  return {
    id:          videoId,
    title,
    slug,
    thumbnail,   // cover portrait — untuk card/list
    poster,      // landscape preview — untuk video player
    description,
    tags,
    brand,
    duration,
    rating: (likes !== null || dislikes !== null) ? { likes, dislikes } : null,
    episodes,
    player,
  };
}

/**
 * Parse ISO 8601 duration "PT16M25S" → "16:25"
 */
function parseIsoDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const sec = parseInt(m[3] || '0', 10);
  if (h > 0) return `${h}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${min}:${String(sec).padStart(2,'0')}`;
}

/**
 * Try to extract HLS/video source URLs from inline <script> tags — fallback only.
 */
function extractPlayer() { return []; }

/**
 * Fetch episode list for a franchise using the search API.
 * Uses the base slug (strips trailing episode number) as search query.
 * e.g. "kanojo-saimin-1" → query "kanojo saimin" → filter matching slugs
 */
async function fetchEpisodes(slug, baseUrl) {
  if (!slug) return [];

  try {
    // Convert slug to search query: "kanojo-saimin-1" → "kanojo saimin"
    const baseSlug = slug.replace(/-\d+$/, '');
    const query = baseSlug.replace(/-/g, ' ');

    const res = await axios.get('https://guest.freeanimehentai.net/api/v11/search_hvs', {
      params: { search_text: query },
      headers: {
        'Referer': 'https://hanime.tv/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });

    const items = Object.values(res.data?.data || {});

    // Keep only items whose slug starts with the base slug
    const episodes = items
      .filter((v) => v.slug && v.slug.startsWith(baseSlug))
      .sort((a, b) => (a.created_at_unix || 0) - (b.created_at_unix || 0))
      .map((v) => ({
        title: v.name || null,
        slug:  v.slug,
        url:   `${baseUrl}/videos/hentai/${v.slug}`,
        thumbnail: v.poster_url || v.cover_url || null,
      }));

    return episodes;
  } catch (_) {
    return [];
  }
}

module.exports = { scrapeVideo };
