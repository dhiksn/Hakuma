'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('../lib/httpClient');

const VALID_TIMESPANS = ['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'yearly'];
const DEFAULT_TIMESPAN = 'monthly';

/**
 * Scrape https://hanime.tv/browse/trending.
 *
 * URL format:
 *   /browse/trending                      → monthly (default)
 *   /browse/trending?timespan=weekly
 *   /browse/trending?timespan=weekly&page=2
 *
 * Page structure:
 *  - Astro island props carry: page_number, total_pages, timespan
 *  - Rank badges: <span class="badge-primary ...>#N</span> followed by a card wrapper div
 *  - Cards: same <a href="/videos/hentai/..."> structure as home/season pages
 *
 * @param {string} timespan  - One of VALID_TIMESPANS. Default: 'monthly'.
 * @param {number} page      - 1-based page number.
 * @returns {Promise<object>}
 */
async function scrapeTrending(timespan = DEFAULT_TIMESPAN, page = 1) {
  const baseUrl = process.env.BASE_URL || 'https://hanime.tv';

  const ts = VALID_TIMESPANS.includes(timespan) ? timespan : DEFAULT_TIMESPAN;

  const params = new URLSearchParams({ timespan: ts });
  if (page > 1) params.set('page', page);

  const url = `${baseUrl}/browse/trending?${params.toString()}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // ------------------------------------------------------------------ //
  // Pagination from Astro props                                         //
  // ------------------------------------------------------------------ //
  let totalPages = null;
  let currentPageFromProps = page;
  let timespanFromProps = ts;

  const propsRe = /props="(\{[^"]*&quot;total_pages&quot;[^"]*\})"/g;
  let pm;
  while ((pm = propsRe.exec(html)) !== null) {
    const raw = pm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    try {
      const props = JSON.parse(raw);
      const tp = Array.isArray(props.total_pages) ? props.total_pages[1] : props.total_pages;
      const pn = Array.isArray(props.page_number) ? props.page_number[1] : props.page_number;
      const tsp = Array.isArray(props.timespan) ? props.timespan[1] : props.timespan;
      if (typeof tp === 'number' && tp > 0) { totalPages = tp; break; }
      if (typeof pn === 'number') currentPageFromProps = pn;
      if (typeof tsp === 'string') timespanFromProps = tsp;
    } catch (_) {}
  }

  // ------------------------------------------------------------------ //
  // Video cards — rank badge is a sibling <span> before the card <div> //
  // ------------------------------------------------------------------ //
  // Structure:
  //   <span class="badge badge-primary ...>#N</span>   ← rank
  //   <div class="group relative ...">                 ← card wrapper
  //     <a href="/videos/hentai/...">...</a>
  //   </div>
  //
  // Both the rank span and the card div share the same parent container.
  // We walk sibling pairs: for each rank badge, the NEXT sibling div holds the card.

  const items = [];

  // Find all rank badges by their text pattern (#N)
  $('span.badge-primary, span[class*="badge-primary"]').each((_, badgeEl) => {
    const rankText = $(badgeEl).text().trim();
    if (!/^#\d+$/.test(rankText)) return;

    const rank = parseInt(rankText.replace('#', ''), 10);

    // The card <a> is inside the next sibling div
    const $cardDiv = $(badgeEl).next('div');
    const $a = $cardDiv.find('a[href*="/videos/hentai/"]').first();
    if (!$a.length) return;

    const href = $a.attr('href') || '';
    const url = href.startsWith('http') ? href : `${baseUrl}${href}`;

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
      const t = $(spanEl).text().trim();
      if (/^\d+(\.\d+)?[KMB]?$/.test(t)) { views = t; return false; }
    });

    const item = { rank, title, thumbnail, url, views };
    Object.keys(item).forEach((k) => item[k] == null && delete item[k]);
    items.push(item);
  });

  // Fallback: if rank badges weren't found, grab all cards without rank
  if (items.length === 0) {
    $('a[href*="/videos/hentai/"]').each((i, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      if (!href) return;
      const url = href.startsWith('http') ? href : `${baseUrl}${href}`;
      const title = $a.find('h3').first().text().trim() || $a.find('img').first().attr('alt')?.trim() || null;
      const thumbnail = $a.find('img').first().attr('src') || null;
      let views = null;
      $a.find('span').each((_, s) => {
        const t = $(s).text().trim();
        if (/^\d+(\.\d+)?[KMB]?$/.test(t)) { views = t; return false; }
      });
      const item = { rank: i + 1, title, thumbnail, url, views };
      Object.keys(item).forEach((k) => item[k] == null && delete item[k]);
      items.push(item);
    });
  }

  const prevPage = currentPageFromProps > 1 ? currentPageFromProps - 1 : null;
  const nextPage = (totalPages === null || currentPageFromProps < totalPages)
    ? currentPageFromProps + 1
    : null;

  return {
    timespan: timespanFromProps,
    validTimespans: VALID_TIMESPANS,
    total: items.length,
    data: items,
    pagination: {
      currentPage: currentPageFromProps,
      totalPages,
      prevPage,
      nextPage,
    },
  };
}

module.exports = { scrapeTrending, VALID_TIMESPANS, DEFAULT_TIMESPAN };
