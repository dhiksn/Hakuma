'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('../lib/httpClient');

/**
 * Scrape the home page of hanime.tv.
 *
 * hanime.tv is built with Astro. Each home section (Recent Uploads, New Releases,
 * Trending, Random) is an Astro island component whose title/metadata is stored
 * in the element's `props` attribute as HTML-encoded JSON, e.g.:
 *
 *   props="{&quot;title&quot;:[0,&quot;Trending&quot;], ...}"
 *
 * The video cards rendered inside each section are standard <a href="/videos/hentai/…">
 * anchors with an <img> and an <h3> inside.
 *
 * Strategy:
 *  1. Extract all section boundaries by finding astro-island elements that carry
 *     a "title" prop (these are the CardSlider islands).
 *  2. Slice the raw HTML between consecutive section start positions so that each
 *     slice belongs to exactly one section.
 *  3. Load each slice with Cheerio and pick up all video cards inside it.
 *  4. No cross-section deduplication — a video that appears in both "Recent Uploads"
 *     and "Trending" should show up in both sections with its correct rank.
 *
 * @returns {Promise<{ sections: object[], total: number }>}
 */
async function scrapeHome() {
  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';
  const html = await fetchHtml(baseUrl);

  // ------------------------------------------------------------------
  // Step 1: find section boundaries via astro-island props
  // ------------------------------------------------------------------
  // Regex matches the raw HTML-encoded props attribute that contains a title key.
  // Example raw attribute value:
  //   {"title":[0,"Trending"],"subtitle":[0,"Past 30 days"],...}
  // In the HTML it looks like:
  //   props="{&quot;title&quot;:[0,&quot;Trending&quot;],...}"
  const sectionRegex = /props="(\{[^"]*&quot;title&quot;[^"]*\})"/g;

  const sectionBoundaries = []; // [{ title, subtitle, allHref, startIndex }]
  let match;

  while ((match = sectionRegex.exec(html)) !== null) {
    const rawProps = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'");

    let props;
    try {
      props = JSON.parse(rawProps);
    } catch (_) {
      continue;
    }

    // Astro encodes prop values as [type, value] tuples — [0, "string"] for strings.
    const title = decodeAstroProp(props.title);
    if (!title) continue;

    const subtitle = decodeAstroProp(props.subtitle) || null;
    const allHref  = decodeAstroProp(props.all_href)  || null;

    // Map hanime.tv allHref → endpoint API kita
    const allApiUrl = mapAllHref(allHref);

    sectionBoundaries.push({
      title,
      subtitle,
      allUrl: allApiUrl,
      startIndex: match.index,
    });
  }

  // ------------------------------------------------------------------
  // Step 2: slice HTML per section and parse cards
  // ------------------------------------------------------------------
  const sections = [];
  let totalCount = 0;

  for (let i = 0; i < sectionBoundaries.length; i++) {
    const section = sectionBoundaries[i];
    const nextSection = sectionBoundaries[i + 1];

    // Slice from this section's start to the next section's start (or end of HTML)
    const sliceEnd = nextSection ? nextSection.startIndex : html.length;
    const slice = html.slice(section.startIndex, sliceEnd);

    const items = parseCardsFromSlice(slice, baseUrl);
    totalCount += items.length;

    sections.push({
      title: section.title,
      subtitle: section.subtitle,
      allUrl: section.allUrl,
      items,
    });
  }

  // ------------------------------------------------------------------
  // Fallback: if Astro parsing found nothing, use generic Cheerio parse
  // ------------------------------------------------------------------
  if (sections.length === 0) {
    return fallbackCheerioScrape(html, baseUrl);
  }

  return { sections, total: totalCount };
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Map hanime.tv's all_href prop value → endpoint API kita.
 */
function mapAllHref(allHref) {
  if (!allHref) return null;
  if (allHref.includes('/browse/trending'))       return '/api/browse/trending';
  if (allHref.includes('/browse/random'))         return null; // Random tidak punya "All"
  if (allHref.includes('order=created_at_desc'))  return '/api/search?order=recent_upload';
  if (allHref.includes('order=released_at_desc')) return '/api/search?order=newest';
  return null;
}

/**
 * Decode an Astro-encoded prop value.
 * Astro serialises props as [type, value] tuples — type 0 = plain value.
 * @param {*} prop
 * @returns {string|null}
 */
function decodeAstroProp(prop) {
  if (!prop) return null;
  if (Array.isArray(prop) && prop.length === 2) return prop[1] ?? null;
  if (typeof prop === 'string') return prop;
  return null;
}

/**
 * Parse all video cards from a HTML slice that corresponds to one home section.
 * Cards are <a href="/videos/hentai/…"> anchors containing:
 *   - <img src="…" alt="title">
 *   - <h3>title</h3>
 *   - <span>views</span>  (after an iconify-icon for the eye icon)
 *
 * @param {string} slice - Raw HTML chunk for one section.
 * @param {string} baseUrl
 * @returns {object[]}
 */
function parseCardsFromSlice(slice, baseUrl) {
  const $ = cheerio.load(slice);
  const items = [];
  const seen = new Set(); // deduplicate within the same section only

  // Each card is an <a> pointing to /videos/hentai/
  $('a[href*="/videos/hentai/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    if (!href) return;

    const url = href.startsWith('http') ? href : `${baseUrl}${href}`;
    if (seen.has(url)) return;
    seen.add(url);

    // Title: prefer <h3>, then img alt, then <a> title attribute
    const title =
      $a.find('h3').first().text().trim() ||
      $a.find('img').first().attr('alt')?.trim() ||
      $a.attr('title')?.replace(/^Watch\s+/, '').replace(/\s+hentai.*$/i, '').trim() ||
      null;

    // Thumbnail: img src inside the card
    const thumbnail =
      $a.find('img').first().attr('src') ||
      $a.find('img').first().attr('data-src') ||
      null;

    // Views: the <span> that comes after the eye iconify-icon
    // Markup: <iconify-icon icon="mdi:eye-outline">…</iconify-icon><span>3.1M</span>
    let views = null;
    $a.find('span').each((_, spanEl) => {
      const text = $(spanEl).text().trim();
      // Views are formatted like "3.1M", "120K", "900K"
      if (/^\d+(\.\d+)?[KMB]?$/.test(text)) {
        views = text;
        return false; // break
      }
    });

    // Type badge (OVA, Series, etc.) — shown as a small overlay on the thumbnail
    const type =
      $a.find('[class*="badge"], [class*="type"], [class*="tag"]').first().text().trim() || null;

    const item = {
      title,
      thumbnail,
      url,
      views: views || undefined,
      type: type || undefined,
    };

    // Remove undefined keys
    Object.keys(item).forEach((k) => item[k] === undefined && delete item[k]);
    items.push(item);
  });

  return items;
}

/**
 * Fallback when Astro island parsing finds no sections.
 * Generic Cheerio scrape — grabs all video cards without sectioning.
 */
function fallbackCheerioScrape(html, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('a[href*="/videos/hentai/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    if (!href) return;
    const url = href.startsWith('http') ? href : `${baseUrl}${href}`;
    if (seen.has(url)) return;
    seen.add(url);

    const title =
      $a.find('h3').first().text().trim() ||
      $a.find('img').first().attr('alt')?.trim() ||
      null;
    const thumbnail =
      $a.find('img').first().attr('src') ||
      $a.find('img').first().attr('data-src') ||
      null;

    items.push({ title, thumbnail, url });
  });

  return {
    sections: items.length > 0 ? [{ title: 'All', subtitle: null, allUrl: null, items }] : [],
    total: items.length,
  };
}

module.exports = { scrapeHome };
