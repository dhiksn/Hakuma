'use strict';

const axios = require('axios');

/**
 * Default headers to mimic a real browser request.
 */
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

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a URL with Axios, retrying up to MAX_RETRIES times on transient errors.
 *
 * @param {string} url - Full URL to fetch.
 * @param {object} [options] - Extra axios config (headers override, params, etc.).
 * @returns {Promise<string>} Raw HTML string.
 */
async function fetchHtml(url, options = {}) {
  const maxRetries = parseInt(process.env.MAX_RETRIES || '3', 10);
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '15000', 10);

  const config = {
    timeout,
    headers: {
      ...DEFAULT_HEADERS,
      Referer: process.env.BASE_URL || 'https://hanime.tv',
      ...options.headers,
    },
    ...options,
  };

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, config);
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
