'use strict';

const express = require('express');
const axios = require('axios');

const router = express.Router();

// Allow hanime CDN, HLS delivery, and key server domains — anchored to prevent substring bypass
const ALLOWED_HOST_PATTERN = /^(hanime(?:-cdn)?\.com|hanime\.tv|(?:[^.]+\.)?htv-services\.com|htv-hydaelyn[^.]*\.com|etheirys\.[^.]+\.com)$/i;

const PROXY_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Referer: 'https://hanime.tv/',
  Origin: 'https://hanime.tv',
};

/**
 * GET /api/proxy/hls?url=<encoded_m3u8_or_ts_url>
 *
 * Proxies HLS manifests (.m3u8), video segments (.ts), and AES-128 keys
 * from hanime CDN. Rewrites all URIs in manifests to go through this proxy.
 */
router.get('/hls', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing url parameter.' });
  }

  let target;
  try {
    target = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid url parameter.' });
  }

  // Security: only proxy allowed hosts
  if (!ALLOWED_HOST_PATTERN.test(target.hostname)) {
    return res.status(403).json({ success: false, error: `Host not allowed: ${target.hostname}` });
  }

  try {
    const upstream = await axios.get(target.toString(), {
      responseType: 'arraybuffer',
      headers: PROXY_HEADERS,
      timeout: 20000,
    });

    const contentType = upstream.headers['content-type'] || '';
    const isM3U8 =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL') ||
      target.pathname.endsWith('.m3u8') ||
      target.pathname.endsWith('.m3u');

    if (isM3U8) {
      const text = Buffer.from(upstream.data).toString('utf-8');
      const baseUrl = target.toString().replace(/\/[^/]*$/, '/');

      const rewritten = text
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Rewrite #EXT-X-KEY URI="..." so key is also proxied
          if (trimmed.startsWith('#EXT-X-KEY')) {
            return line.replace(/URI="([^"]+)"/, (_, keyUri) => {
              let absKeyUri;
              try {
                absKeyUri = new URL(keyUri, baseUrl).toString();
              } catch {
                absKeyUri = keyUri;
              }
              return `URI="/api/proxy/hls?url=${encodeURIComponent(absKeyUri)}"`;
            });
          }

          // Skip other # directives
          if (trimmed.startsWith('#')) return line;

          // Rewrite segment/playlist URIs
          let absUrl;
          try {
            absUrl = new URL(trimmed, baseUrl).toString();
          } catch {
            return line;
          }

          return `/api/proxy/hls?url=${encodeURIComponent(absUrl)}`;
        })
        .join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewritten);
    }

    // Binary (segment or key) — pipe through
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(Buffer.from(upstream.data));
  } catch (err) {
    const status = err.response?.status || 502;
    return res.status(status).json({ success: false, error: 'Proxy upstream error.', detail: err.message });
  }
});

module.exports = router;
