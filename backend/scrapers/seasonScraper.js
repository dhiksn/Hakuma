'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('../lib/httpClient');

/**
 * Scrape the seasons page at https://hanime.tv/browse/seasons?year=YYYY.
 *
 * Page structure:
 *  - Year selector: <a href="/browse/seasons?year=YYYY"> links — used to build
 *    the list of available years.
 *  - Season sections: each season (Summer, Spring, Winter, Fall) has a header
 *    block containing:
 *      - An iconify-icon (sun / leaf / snowflake / etc.)
 *      - <h2>SeasonName<span> YYYY</span></h2>
 *      - <span class="badge ...">COUNT</span>  ← video count
 *    followed immediately by a grid of video cards identical to the home page.
 *
 * Strategy (same as homeScraper):
 *  1. Find all season-header positions in the raw HTML by matching the h2 text.
 *  2. Slice HTML between consecutive headers so each slice belongs to one season.
 *  3. Parse video cards from each slice with Cheerio.
 *  4. Also collect the available years from the year-selector links.
 *
 * @param {number|string} year  - 4-digit year (defaults to current year).
 * @returns {Promise<{ year: number, availableYears: number[], seasons: object[] }>}
 */
async function scrapeSeason(year) {
  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';
  const targetYear = parseInt(year, 10) || new Date().getFullYear();
  const url = `${baseUrl}/browse/seasons?year=${targetYear}`;

  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // ------------------------------------------------------------------ //
  // 1. Available years from the year-selector                           //
  // ------------------------------------------------------------------ //
  const availableYears = [];
  const yearSeen = new Set();
  $('a[href*="/browse/seasons?year="]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/year=(\d{4})/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (!yearSeen.has(y)) { yearSeen.add(y); availableYears.push(y); }
    }
  });
  availableYears.sort((a, b) => b - a); // descending (newest first)

  // ------------------------------------------------------------------ //
  // 2. Season section boundaries                                        //
  // ------------------------------------------------------------------ //
  // Season headers look like:
  //   <h2 class="font-cormorant ...">Summer<span class="text-base-content/40"> 2026</span></h2>
  //   <span class="badge badge-primary ...">19</span>
  //
  // We locate each season name in the HTML, record its position, then slice.

  const SEASON_NAMES = ['Summer', 'Spring', 'Winter', 'Fall'];
  const SEASON_ICONS = {
    Summer: 'mdi:white-balance-sunny',
    Spring: 'mdi:leaf',
    Winter: 'mdi:snowflake',
    Fall:   'mdi:leaf-maple',
  };

  // Find positions of each season header (h2 tag containing the season name)
  const boundaries = [];
  for (const name of SEASON_NAMES) {
    // Look for the season name inside an <h2> tag
    let searchFrom = 0;
    while (true) {
      const idx = html.indexOf(`>${name}<`, searchFrom);
      if (idx === -1) break;
      // Confirm it's inside an <h2> by checking nearby context
      const ctx = html.substring(Math.max(0, idx - 200), idx + name.length + 200);
      if (ctx.includes('<h2') || ctx.includes('font-cormorant')) {
        boundaries.push({ name, startIndex: idx });
        break;
      }
      searchFrom = idx + 1;
    }
  }

  // Sort by position in the document (order they appear)
  boundaries.sort((a, b) => a.startIndex - b.startIndex);

  // ------------------------------------------------------------------ //
  // 3. Parse each season slice                                          //
  // ------------------------------------------------------------------ //
  const seasons = [];

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const sliceEnd = boundaries[i + 1] ? boundaries[i + 1].startIndex : html.length;
    const slice = html.slice(b.startIndex, sliceEnd);

    const $s = cheerio.load(slice);

    // Video count from badge immediately after the h2
    const badgeText = $s('.badge.badge-primary, [class*="badge-primary"]').first().text().trim();
    const videoCount = badgeText ? parseInt(badgeText, 10) : null;

    // Video cards — same structure as home page cards
    const items = parseCardsFromSlice($s, baseUrl);

    seasons.push({
      name: b.name,
      year: targetYear,
      videoCount: isNaN(videoCount) ? null : videoCount,
      items,
    });
  }

  return { year: targetYear, availableYears, seasons };
}

/**
 * Parse video cards from a Cheerio-loaded HTML slice.
 * Cards: <a href="/videos/hentai/..."> with <img>, <h3>, views <span>.
 */
function parseCardsFromSlice($, baseUrl) {
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
      $a.attr('title')?.replace(/^Watch\s+/i, '').replace(/\s+hentai.*$/i, '').trim() ||
      null;

    const thumbnail =
      $a.find('img').first().attr('src') ||
      $a.find('img').first().attr('data-src') ||
      null;

    let views = null;
    $a.find('span').each((_, spanEl) => {
      const text = $(spanEl).text().trim();
      if (/^\d+(\.\d+)?[KMB]?$/.test(text)) { views = text; return false; }
    });

    const item = { title, thumbnail, url, views };
    Object.keys(item).forEach((k) => item[k] == null && delete item[k]);
    items.push(item);
  });

  return items;
}

module.exports = { scrapeSeason };
