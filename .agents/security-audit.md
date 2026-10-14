# Security Audit Report — hanime-api
**Date:** 2025-07-14  
**Scope:** `src/` (Express backend) and `web/` (Next.js frontend)  
**Auditor:** Kiro security investigation step

---

## Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | **Live secret (`HTV_RELAY_SECRET`) committed in `.env`** | 🔴 Critical | Exposed on disk |
| 2 | Hardcoded Cloudflare Workers URL leaks personal account identity | 🟠 Medium | In source file |
| 3 | CORS is wide-open (`*`) with no rate limiting | 🟠 Medium | Active |
| 4 | HLS proxy regex allows partial-hostname bypass | 🟡 Low–Medium | In source file |
| 5 | AES encryption key derived from a public string in source code | 🟡 Low | Design issue |
| 6 | `web/.env.local` excluded from git but not from `.gitignore` root scope | 🟡 Low | Risk of accidental commit |
| 7 | Next.js `images.remotePatterns` allows **any** hostname | 🟢 Informational | Config issue |
| 8 | No dangerous routes (eval, exec, path traversal) found | ✅ Clean | — |
| 9 | `/api/video` URL validation (SSRF guard) is correct | ✅ Clean | — |
| 10 | No server-side secrets exposed in Next.js client bundles | ✅ Clean | — |

---

## Detailed Findings

---

### 🔴 CRITICAL — Finding 1: Live secret in `.env` on disk

**File:** `.env` (root of repo)

The actual `.env` file contains a live value for `HTV_RELAY_SECRET`:

```
HTV_RELAY_SECRET=6f619a8a334b6f944019c44edd454fc7003d6f0c709b8730211b9b1d1144402b
```

This is the Bearer token sent as `Authorization: Bearer <secret>` to the Cloudflare Workers handshake relay (`playerService.js` line 83). Anyone with read access to this file — including collaborators, CI runners that clone the repo, or any process that reads the project root — obtains the relay secret.

`.gitignore` correctly lists `.env`, so it is **not tracked by git**. However:
- The file exists on the local developer machine with a real secret value.
- If the repo is ever accidentally shared (ZIP, cloud sync, deploy artifact), the `.env` travels with it.
- The `.env.example` does **not** include this key with a placeholder, so rotating it requires out-of-band communication.

**Recommendation:**
1. Rotate the `HTV_RELAY_SECRET` immediately on the Cloudflare Workers side — treat the current value as compromised.
2. Add `HTV_RELAY_SECRET=<your_secret_here>` to `.env.example` with an empty/placeholder value so the key's existence is documented without leaking the value.
3. Verify `.env` is not tracked: `git ls-files .env` should return nothing.

---

### 🟠 MEDIUM — Finding 2: Personal Cloudflare Workers subdomain hardcoded in source

**File:** `src/services/playerService.js`, line 8–9

```js
const HANDSHAKE_URL = process.env.HTV_HANDSHAKE_URL ||
  'https://hanime-handshake-relay.andhikarafi321.workers.dev/api/v11/handshake';
```

The subdomain `andhikarafi321` is the developer's personal Cloudflare account identifier. This is visible to anyone who reads the source code (including anyone who forks or receives the code). It does not expose a secret by itself, but:
- It ties a personal CF account to this open project.
- If the Workers service is deleted or the account is compromised, the fallback URL becomes a dead or hijackable endpoint.
- In production the env var should always be set; the hardcoded fallback should point to a placeholder or throw.

**Recommendation:** Replace the hardcoded fallback with a value that forces explicit configuration, e.g.:
```js
const HANDSHAKE_URL = process.env.HTV_HANDSHAKE_URL;
if (!HANDSHAKE_URL) throw new Error('HTV_HANDSHAKE_URL is required');
```

---

### 🟠 MEDIUM — Finding 3: CORS is wide-open (`*`) and no rate limiting

**File:** `src/index.js`, lines 21–26

```js
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET'],
  optionsSuccessStatus: 200,
};
```

**File:** `.env`
```
CORS_ORIGIN=*
```

With `CORS_ORIGIN=*`, any website in any browser can make cross-origin fetch requests to this API and read the responses. The API intentionally scrapes and proxies content from hanime.tv. A wide-open CORS policy means:
- Any malicious website can use this API as a relay from a visitor's browser.
- Combined with the HLS proxy, any browser can be turned into a proxy client for hanime CDN content without the visitor's knowledge.

There is also no rate limiting middleware anywhere in `src/index.js` or the routes. This makes the proxy route especially abusable for high-volume automated scraping or CDN bandwidth theft.

**Recommendation:**
- In production, set `CORS_ORIGIN` to the specific frontend origin (e.g. `https://hakuma.yourdomain.com`).
- Add a rate-limiter (e.g. `express-rate-limit`) on all routes, especially `/api/proxy/hls`.

---

### 🟡 LOW–MEDIUM — Finding 4: HLS proxy hostname regex allows partial match bypass

**File:** `src/routes/proxy.js`, line 9

```js
const ALLOWED_HOST_PATTERN = /hanime(?:-cdn)?\.com|hanime\.tv|htv-services\.com|htv-hydaelyn[^.]*\.com|etheirys\.[^.]+\.com/i;
```

The regex is tested against `target.hostname` (line 39), but the pattern is **not anchored** with `^` and `$`. This means a hostname like:

- `evil.com?redirect=hanime.tv` — `URL` constructor would reject this, so not a risk via URL parsing.
- However, a crafted hostname such as `hanime.tv.evil.com` **would match** because `hanime.tv` appears as a substring of the full hostname.

Test: `ALLOWED_HOST_PATTERN.test('hanime.tv.evil.com')` → **true**

An attacker could craft a URL like `?url=https://hanime.tv.attacker.com/malware.m3u8` and the proxy would fetch from `attacker.com`, potentially serving malicious HLS manifests or conducting SSRF against internal resources.

Additionally, the `etheirys\.[^.]+\.com` sub-pattern is broad — it matches any single-label subdomain of `etheirys.*.com`, including `etheirys.localhost.com` if DNS is manipulated locally.

**Recommendation:** Anchor the regex with `^` and `$`:
```js
const ALLOWED_HOST_PATTERN = /^(hanime(?:-cdn)?\.com|hanime\.tv|htv-services\.com|htv-hydaelyn[^.]*\.com|etheirys\.[^.]+\.com)$/i;
```
Or, better, use an explicit allowlist of exact hostnames and check membership with a `Set`:
```js
const ALLOWED_HOSTS = new Set([
  'hanime.tv', 'hanime.com', 'hanime-cdn.com',
  'htv-services.com',
  // add exact CDN hostnames as discovered
]);
// then: if (!ALLOWED_HOSTS.has(target.hostname)) { ... }
```

---

### 🟡 LOW — Finding 5: AES key derived from a public string in source code

**File:** `src/services/playerService.js`, lines 13–14

```js
const MSG_KEY = crypto.createHash('sha256').update('htv-insecure-handshake-v1').digest();
const MSG_AAD = Buffer.from('htv-insecure-v1');
```

The comment itself calls this `htv-insecure`. The AES-256-GCM key is derived deterministically from a string that is now public in source. Anyone reading this file can reconstruct the key and decrypt any intercepted `x-token` response from the handshake relay, or forge a valid `token` payload to send to the relay.

The practical impact is limited because:
- The relay also requires `Authorization: Bearer <HTV_RELAY_SECRET>`.
- The relay itself calls hanime's upstream API, so forging `token` values without the relay secret is blocked there.

However, if the relay secret is also compromised (see Finding 1), this key provides zero additional protection.

**Recommendation:** This key was extracted from hanime's own bundle (per the comment), so it cannot be changed independently. Document this limitation clearly. Ensure `HTV_RELAY_SECRET` provides the real access control layer.

---

### 🟡 LOW — Finding 6: `web/.env.local` not in root `.gitignore`

**File:** `.gitignore` (root)
```
.env
web/.next/
web/.env*.local
```

`web/.env.local` is listed in the root `.gitignore` and is **not** currently tracked. This is correct. However:
- The root `.gitignore` entry covers `web/.env*.local` but NOT `web/.env` (without `.local` suffix). If someone creates `web/.env`, it would not be covered.
- The `web/` directory does not have its own `.gitignore`.

**Current `web/.env.local` content (not sensitive):**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

This is a `NEXT_PUBLIC_` variable and is safe to expose — it's baked into the client bundle by design. No issue here currently, but if future variables without the `NEXT_PUBLIC_` prefix are added to `.env.local`, they would be server-side only.

**Recommendation:** Add a `web/.gitignore` that explicitly ignores `.env` and `.env.local` to make this independent of the root `.gitignore`.

---

### 🟢 INFORMATIONAL — Finding 7: `images.remotePatterns` allows any hostname

**File:** `web/next.config.mjs`, lines 9–18

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**' },
    { protocol: 'http',  hostname: '**' },
  ],
},
```

Next.js `<Image>` will proxy/optimize images from **any** hostname. This disables the security benefit of `remotePatterns` entirely (it was designed to whitelist only trusted sources). In a private project this is less critical, but it means:
- If user-supplied image URLs are ever rendered via `<Image>`, the Next.js image optimization route can be abused to SSRF arbitrary hosts through the Next.js server.
- The `http://` wildcard allows fetching from plaintext HTTP sources.

**Recommendation:** Restrict to the actual CDN hostnames used:
```js
remotePatterns: [
  { protocol: 'https', hostname: '**.hanime-cdn.com' },
  { protocol: 'https', hostname: '**.hanime.tv' },
],
```

---

## Clean Checks

### ✅ No dangerous server routes

No calls to `eval()`, `exec()`, `execSync()`, `child_process`, or `new Function()` found in `src/routes/` or `src/scrapers/`. The `vm.runInContext()` call in `signatureService.js` executes a **hardcoded local file** (`src/vendor/htv_signature_wasm.js`) in a sandboxed context — no user input touches the `vm` call, and the WASM path is resolved at construction time from `__dirname`. This is acceptable.

### ✅ No `.env` / secrets exposed via HTTP routes

There is no `express.static()` call in `src/index.js` or any route file. No `sendFile`, `createReadStream`, or file-read endpoint exists that could serve `.env` or other sensitive files via HTTP.

### ✅ SSRF guard on `/api/video` is correct

`src/middleware/validateUrl.js` validates that the `url` parameter:
1. Is a valid URL.
2. Uses `http:` or `https:` protocol only.
3. Hostname matches `new URL(process.env.BASE_URL).hostname` — locked to `hanime.tv`.

This correctly prevents SSRF to arbitrary hosts via the video endpoint.

### ✅ No server-side secrets in Next.js client bundle

The only `process.env` variable used in Next.js client-side code is `NEXT_PUBLIC_API_URL` (`web/lib/api.ts` line 17, `web/components/player/*.tsx`). Variables prefixed with `NEXT_PUBLIC_` are intentionally baked into the client bundle. No server-only secrets (like `HTV_RELAY_SECRET` or `HTV_HANDSHAKE_URL`) are referenced anywhere under `web/`.

### ✅ No injection risks in search/browse parameters

`src/routes/search.js` validates `order` against a whitelist (`VALID_ORDERS`), and validates `page`/`page_size` as integers. Tag/brand/blacklist params are split by comma and passed to the scraper as arrays — they are used as URL query parameters to `hanime.tv`, not in SQL or shell commands. No injection surface found.

---

## Prioritized Recommendations

1. **Immediately rotate `HTV_RELAY_SECRET`** — the value `6f619a8a...` is in the `.env` file and must be treated as compromised. Generate a new secret on the Cloudflare Workers side and update `.env`.

2. **Fix the HLS proxy regex to be anchored** — add `^` and `$` to `ALLOWED_HOST_PATTERN` to prevent substring-match bypass attacks (`hanime.tv.evil.com`).

3. **Set `CORS_ORIGIN` to a specific origin in production** — do not ship with `*`.

4. **Add rate limiting** to the Express server, especially on `/api/proxy/hls`.

5. **Remove the hardcoded `andhikarafi321.workers.dev` fallback URL** from `playerService.js` and require the env var.

6. **Restrict `images.remotePatterns`** in `next.config.mjs` to the actual CDN hostnames.

7. **Add `HTV_RELAY_SECRET=` (empty placeholder) to `.env.example`** so the key is documented.
