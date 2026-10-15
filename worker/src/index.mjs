const RELAY_PATH = '/api/v11/handshake';
const SEARCH_PATH = '/api/v11/search_hvs';
const SCRAPE_PATH = '/api/scrape';
const HLS_PROXY_PATH = '/api/proxy/hls';
const UPSTREAM_URL = 'https://auth.hanime.tv/api/v11/handshake';
const SEARCH_UPSTREAM_URL = 'https://guest.freeanimehentai.net/api/v11/search_hvs';
const MAX_BODY_BYTES = 16 * 1024;

const ALLOWED_SCRAPE_HOSTS = new Set([
  'hanime.tv',
  'hanime-cdn.com',
  'guest.freeanimehentai.net',
]);

// HLS proxy: allow hanime HLS delivery + key server — anchored hostname check
const ALLOWED_HLS_PATTERN = /^(hanime\.tv|hanime-cdn\.com|(?:[^.]+\.)?htv-services\.com|htv-hydaelyn[^.]*\.com|etheirys\.[^.]+\.com)$/i;

const FORWARDED_REQUEST_HEADERS = [
  'x-signature', 'x-signature-version', 'x-claim', 'x-time', 'x-session-token'
];

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://hanime.tv/',
  'Origin': 'https://hanime.tv',
};

const HLS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'Referer': 'https://hanime.tv/',
  'Origin': 'https://hanime.tv',
};

async function secretsEqual(actual, expected) {
  if (!actual || !expected) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const ab = new Uint8Array(a), bb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function jsonResponse(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

// Build worker base URL for rewriting m3u8 segment URIs
function workerBase(requestUrl) {
  const u = new URL(requestUrl);
  return `${u.protocol}//${u.host}${HLS_PROXY_PATH}`;
}

async function handleHlsProxy(request, fetchImpl) {
  if (request.method !== 'GET') return jsonResponse(405, 'Method not allowed');

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) return jsonResponse(400, 'Missing url parameter');

  let target;
  try { target = new URL(decodeURIComponent(targetUrl)); } catch {
    return jsonResponse(400, 'Invalid url parameter');
  }

  if (!ALLOWED_HLS_PATTERN.test(target.hostname)) {
    return jsonResponse(403, `Host not allowed: ${target.hostname}`);
  }

  let upstream;
  try {
    upstream = await fetchImpl(target.toString(), { headers: HLS_HEADERS });
  } catch {
    return jsonResponse(502, 'Upstream unavailable');
  }

  const ct = upstream.headers.get('content-type') || '';
  const isM3U8 = ct.includes('mpegurl') || ct.includes('x-mpegURL') ||
    target.pathname.endsWith('.m3u8') || target.pathname.endsWith('.m3u');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'cache-control': 'no-store',
  };

  if (isM3U8) {
    const text = await upstream.text();
    const baseUrl = target.toString().replace(/\/[^/]*$/, '/');
    const proxyBase = workerBase(request.url);

    const rewritten = text.split('\n').map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Rewrite EXT-X-KEY URI
      if (trimmed.startsWith('#EXT-X-KEY')) {
        return line.replace(/URI="([^"]+)"/, (_, keyUri) => {
          let absKeyUri;
          try { absKeyUri = new URL(keyUri, baseUrl).toString(); } catch { absKeyUri = keyUri; }
          return `URI="${proxyBase}?url=${encodeURIComponent(absKeyUri)}"`;
        });
      }

      if (trimmed.startsWith('#')) return line;

      // Rewrite segment URIs
      let absUrl;
      try { absUrl = new URL(trimmed, baseUrl).toString(); } catch { return line; }
      return `${proxyBase}?url=${encodeURIComponent(absUrl)}`;
    }).join('\n');

    return new Response(rewritten, {
      status: upstream.status,
      headers: { 'content-type': 'application/vnd.apple.mpegurl', ...corsHeaders },
    });
  }

  // Binary (segment or key) — pipe through
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': ct || 'application/octet-stream', ...corsHeaders },
  });
}

export function createRelay({ fetchImpl = fetch } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);

      // Handle CORS preflight for all endpoints
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Signature, X-Signature-Version, X-Claim, X-Time, X-Session-Token',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      // ── HLS proxy — no auth needed (called directly by browser) ──────────
      if (url.pathname === HLS_PROXY_PATH) {
        return handleHlsProxy(request, fetchImpl);
      }

      const isHandshake = url.pathname === RELAY_PATH;
      const isSearch = url.pathname === SEARCH_PATH;
      const isScrape = url.pathname === SCRAPE_PATH;

      if (!isHandshake && !isSearch && !isScrape) {
        return jsonResponse(404, 'Not found');
      }

      // All other endpoints require auth
      const authorized = await secretsEqual(
        request.headers.get('authorization'),
        env.RELAY_SECRET && `Bearer ${env.RELAY_SECRET}`
      );
      if (!authorized) return jsonResponse(401, 'Unauthorized');

      // ── Scrape proxy ──────────────────────────────────────────────────────
      if (isScrape) {
        if (request.method !== 'GET') return jsonResponse(405, 'Method not allowed');
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return jsonResponse(400, 'Missing url parameter');
        let target;
        try { target = new URL(targetUrl); } catch { return jsonResponse(400, 'Invalid url parameter'); }
        const hostBase = target.hostname.replace(/^www\./, '');
        if (!ALLOWED_SCRAPE_HOSTS.has(hostBase)) return jsonResponse(403, `Host not allowed: ${target.hostname}`);
        let upstream;
        try { upstream = await fetchImpl(target.toString(), { headers: SCRAPE_HEADERS }); }
        catch { return jsonResponse(502, 'Upstream unavailable'); }
        const ct = upstream.headers.get('content-type') || 'text/html';
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { 'content-type': ct, 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
        });
      }

      // ── Handshake / Search relay ──────────────────────────────────────────
      const expectedMethod = isHandshake ? 'POST' : 'GET';
      if (request.method !== expectedMethod) return jsonResponse(405, 'Method not allowed');

      let body;
      if (isHandshake) {
        if (!request.headers.get('content-type')?.startsWith('application/json')) return jsonResponse(415, 'JSON body required');
        body = await request.arrayBuffer();
        if (body.byteLength > MAX_BODY_BYTES) return jsonResponse(413, 'Request body too large');
      }

      const headers = new Headers({
        accept: 'application/json', 'content-type': 'application/json',
        origin: 'https://hanime.tv', referer: 'https://hanime.tv/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
      });
      for (const name of FORWARDED_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }

      let upstream;
      try {
        upstream = await fetchImpl(new Request(
          isHandshake ? UPSTREAM_URL : SEARCH_UPSTREAM_URL,
          { method: expectedMethod, headers, body }
        ));
      } catch { return jsonResponse(502, 'Upstream unavailable'); }

      const responseHeaders = new Headers({
        'cache-control': 'no-store',
        'content-type': upstream.headers.get('content-type') || 'application/json'
      });
      const token = upstream.headers.get('x-token');
      if (token) responseHeaders.set('x-token', token);

      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    }
  };
}

export default createRelay();
