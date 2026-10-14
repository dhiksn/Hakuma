'use strict';

const axios = require('axios');

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Cache-Control': 'max-age=0',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a URL, routing through the Cloudflare Worker scrape proxy when
 * SCRAPE_PROXY_URL is set (needed on Vercel where hanime.tv blocks AWS IPs).
 *
 * @param {string} url - Full URL to fetch.
 * @param {object} [options] - Extra axios config.
 * @returns {Promise<string>} Raw HTML string.
 */
async function fetchHtml(url, options = {}) {
  const maxRetries = parseInt(process.env.MAX_RETRIES || '3', 10);
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '15000', 10);

  // If SCRAPE_PROXY_URL is set, route through CF Worker to bypass IP blocks
  const proxyBase = process.env.SCRAPE_PROXY_URL; // e.g. https://hanime.dhiksn.my.id/api/scrape
  const relaySecret = process.env.HTV_RELAY_SECRET;

  let fetchUrl = url;
  let extraHeaders = {};

  if (proxyBase && relaySecret) {
    fetchUrl = `${proxyBase}?url=${encodeURIComponent(url)}`;
    extraHeaders['Authorization'] = `Bearer ${relaySecret}`;
  }

  const config = {
    timeout,
    headers: {
      ...DEFAULT_HEADERS,
      Referer: process.env.BASE_URL || 'https://hanime.tv',
      ...extraHeaders,
      ...options.headers,
    },
    ...options,
  };

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(fetchUrl, config);
      return response.data;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;

      // Do not retry on client errors except 429
      if (status && status !== 429 && status >= 400 && status < 500) {
        throw err;
      }

      if (attempt < maxRetries) {
        const delay = 500 * attempt;
        console.warn(
          `[httpClient] Attempt ${attempt}/${maxRetries} failed for ${url} — retrying in ${delay}ms (${err.message})`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

module.exports = { fetchHtml };
