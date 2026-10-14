'use strict';

const crypto = require('crypto');
const axios  = require('axios');
const signatureService = require('./signatureService');

const HANDSHAKE_URL = process.env.HTV_HANDSHAKE_URL;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

// AES-256-GCM envelope — key/AAD extracted from hanime.tv's public app_init bundle.
// These strings are NOT secrets owned by this project — they are embedded in hanime's
// own JavaScript (visible to anyone who inspects their bundle) and must remain unchanged
// for the relay protocol to work. The actual access control is provided by HTV_RELAY_SECRET.
// NOSONAR: intentional use of known public protocol strings, not a hardcoded credential.
const MSG_KEY = crypto.createHash('sha256').update('htv-insecure-handshake-v1').digest(); // NOSONAR
const MSG_AAD = Buffer.from('htv-insecure-v1'); // NOSONAR

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlDecode = (str) =>
  Buffer.from(
    String(str).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '='),
    'base64'
  );

function sealMessage(obj) {
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MSG_KEY, iv, { authTagLength: 16 });
  cipher.setAAD(MSG_AAD);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const envelope = { v: 1, alg: 'AES-256-GCM', iv: b64url(iv), tag: b64url(cipher.getAuthTag()), data: b64url(data) };
  return b64url(Buffer.from(JSON.stringify(envelope)));
}

function openMessage(token) {
  const envelope = JSON.parse(b64urlDecode(token).toString('utf8'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', MSG_KEY, b64urlDecode(envelope.iv), { authTagLength: 16 });
  decipher.setAAD(MSG_AAD);
  decipher.setAuthTag(b64urlDecode(envelope.tag));
  return JSON.parse(Buffer.concat([decipher.update(b64urlDecode(envelope.data)), decipher.final()]).toString('utf8'));
}

/**
 * Resolve playable HLS streams for a video slug via hanime's handshake flow.
 *
 * Flow:
 *  1. Generate web2 signature (WASM)
 *  2. Seal { timestamp_unix, directive, slug } with AES-256-GCM
 *  3. POST { token } to handshake endpoint
 *  4. Decrypt x-token response header → { sources: [{ url, height }] }
 *
 * @param {string} slug           - Video slug e.g. "kanojo-saimin-1"
 * @param {string} [sessionToken] - Optional session token for premium qualities
 * @returns {Promise<object[]>} Array of { height, url, quality }
 */
async function resolvePlayer(slug, sessionToken = '', posterUrl = null) {
  if (!slug) return [];

  if (!HANDSHAKE_URL) {
    console.warn('[playerService] HTV_HANDSHAKE_URL not set — skipping player resolution');
    return [];
  }

  const sig = await signatureService.getSignature();
  if (!sig) {
    console.warn('[playerService] No signature available');
    return [];
  }

  const token = sealMessage({
    timestamp_unix: Math.floor(Date.now() / 1000),
    directive: 'htv_player_handshake',
    slug,
  });

  const headers = {
    'content-type':          'application/json',
    'accept':                'application/json',
    'user-agent':            UA,
    'referer':               'https://hanime.tv/',
    'origin':                'https://hanime.tv',
    'x-signature-version':  'web2',
    'x-signature':           sig.signature,
    'x-time':                String(sig.time),
  };
  if (sessionToken) headers['x-session-token'] = sessionToken;

  const relaySecret = process.env.HTV_RELAY_SECRET;
  if (relaySecret) headers['authorization'] = `Bearer ${relaySecret}`;

  let response;
  try {
    response = await axios.post(
      HANDSHAKE_URL,
      { token },
      { headers, timeout: 15000, validateStatus: () => true }
    );
  } catch (err) {
    console.warn('[playerService] Handshake request failed:', err.message);
    return [];
  }

  const xToken = response.headers['x-token'];
  if (response.status !== 200 || !xToken) {
    console.warn('[playerService] Handshake failed:', response.status, response.data?.error_id);
    return [];
  }

  let payload;
  try {
    payload = openMessage(xToken);
  } catch (err) {
    console.warn('[playerService] x-token decode failed:', err.message);
    return [];
  }

  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  return sources
    .map((s) => {
      const url = s.url || s.src || '';
      if (!url) return null;
      const height = s.height || s.label || null;
      return {
        quality:   height ? `${height}p` : null,
        height:    height ? parseInt(height, 10) : null,
        url:       url.startsWith('http') ? url : `https://hanime.tv${url}`,
        type:      url.includes('.m3u8') ? 'hls' : 'mp4',
        thumbnail: posterUrl || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.height || 0) - (a.height || 0));
}

module.exports = { resolvePlayer };
