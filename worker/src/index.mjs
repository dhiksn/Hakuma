const RELAY_PATH = '/api/v11/handshake';
const SEARCH_PATH = '/api/v11/search_hvs';
const SCRAPE_PATH = '/api/scrape';
const UPSTREAM_URL = 'https://auth.hanime.tv/api/v11/handshake';
const SEARCH_UPSTREAM_URL = 'https://guest.freeanimehentai.net/api/v11/search_hvs';
const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_SCRAPE_HOSTS = new Set([
  'hanime.tv',
  'hanime-cdn.com',
  'guest.freeanimehentai.net',
]);
const FORWARDED_REQUEST_HEADERS = [
  'x-signature',
  'x-signature-version',
  'x-claim',
  'x-time',
  'x-session-token'
];

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://hanime.tv/',
  'Origin': 'https://hanime.tv',
};

async function secretsEqual(actual, expected) {
  if (!actual || !expected) return false;
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const actualBytes = new Uint8Array(actualHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < actualBytes.length; index++) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

function jsonResponse(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export function createRelay({ fetchImpl = fetch } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const isHandshake = url.pathname === RELAY_PATH;
      const isSearch = url.pathname === SEARCH_PATH;
      const isScrape = url.pathname === SCRAPE_PATH;

      if (!isHandshake && !isSearch && !isScrape) {
        return jsonResponse(404, 'Not found');
      }

      // All endpoints require auth
      const authorized = await secretsEqual(
        request.headers.get('authorization'),
        env.RELAY_SECRET && `Bearer ${env.RELAY_SECRET}`
      );
      if (!authorized) {
        return jsonResponse(401, 'Unauthorized');
      }

      // ── Scrape proxy ─────────────────────────────────────────────────────
      if (isScrape) {
        if (request.method !== 'GET') return jsonResponse(405, 'Method not allowed');

        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return jsonResponse(400, 'Missing url parameter');

        let target;
        try { target = new URL(targetUrl); } catch {
          return jsonResponse(400, 'Invalid url parameter');
        }

        // Security: only allow specific hosts
        const hostBase = target.hostname.replace(/^www\./, '');
        if (!ALLOWED_SCRAPE_HOSTS.has(hostBase)) {
          return jsonResponse(403, `Host not allowed: ${target.hostname}`);
        }

        let upstream;
        try {
          upstream = await fetchImpl(target.toString(), { headers: SCRAPE_HEADERS });
        } catch {
          return jsonResponse(502, 'Upstream unavailable');
        }

        const ct = upstream.headers.get('content-type') || 'text/html';
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            'content-type': ct,
            'cache-control': 'no-store',
            'access-control-allow-origin': '*',
          }
        });
      }

      // ── Handshake / Search relay ──────────────────────────────────────────
      const expectedMethod = isHandshake ? 'POST' : 'GET';
      if (request.method !== expectedMethod) return jsonResponse(405, 'Method not allowed');

      let body;
      if (isHandshake) {
        if (!request.headers.get('content-type')?.startsWith('application/json')) {
          return jsonResponse(415, 'JSON body required');
        }
        body = await request.arrayBuffer();
        if (body.byteLength > MAX_BODY_BYTES) return jsonResponse(413, 'Request body too large');
      }

      const headers = new Headers({
        accept: 'application/json',
        'content-type': 'application/json',
        origin: 'https://hanime.tv',
        referer: 'https://hanime.tv/',
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
      } catch {
        return jsonResponse(502, 'Upstream unavailable');
      }

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
