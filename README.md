# Hakuma

REST API untuk mengambil data dari [hanime.tv](https://hanime.tv) menggunakan **Node.js**, **Express**, **Axios**, dan **Cheerio** — tanpa headless browser.

---

## Teknologi

| Paket      | Kegunaan                          |
|------------|-----------------------------------|
| Express    | HTTP framework                    |
| Axios      | HTTP client dengan retry          |
| Cheerio    | HTML parser (jQuery-style)        |
| CORS       | Cross-Origin Resource Sharing     |
| dotenv     | Konfigurasi via `.env`            |

---

## Instalasi

```bash
cd hakuma
npm install
cp .env.example .env
```

Edit `.env` sesuai kebutuhan, lalu jalankan:

```bash
npm run dev   # development (auto-reload)
npm start     # production
```

Server berjalan di `http://localhost:3000` secara default.

---

## Konfigurasi `.env`

| Variable            | Default                              | Keterangan                                         |
|---------------------|--------------------------------------|----------------------------------------------------|
| `PORT`              | `3000`                               | Port server                                        |
| `BASE_URL`          | `https://hanime.tv`                  | Target website                                     |
| `CORS_ORIGIN`       | `*`                                  | Izinkan origin tertentu                            |
| `REQUEST_TIMEOUT`   | `15000`                              | Timeout request (ms)                               |
| `MAX_RETRIES`       | `3`                                  | Jumlah retry pada error sementara                  |
| `HTV_HANDSHAKE_URL` | `https://auth.hanime.tv/api/v11/handshake` | Endpoint handshake untuk player stream       |
| `HTV_RELAY_SECRET`  | *(kosong)*                           | Secret untuk Cloudflare Worker relay (opsional)    |

---

## Endpoint

### `GET /`
Info API dan daftar semua endpoint.

---

### `GET /api/health`
Cek status server.

---

### `GET /api/home`
Ambil daftar anime dari halaman utama (Recent Uploads, New Releases, Trending, Random).

**Response:**
```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "title": "Trending",
        "subtitle": "Past 30 days",
        "allUrl": "/api/browse/trending",
        "items": [
          {
            "title": "Kanojo Saimin 1",
            "thumbnail": "https://hanime-cdn.com/...",
            "url": "https://hanime.tv/videos/hentai/kanojo-saimin-1",
            "views": "3.1M"
          }
        ]
      }
    ],
    "total": 96
  }
}
```

---

### `GET /api/search`

Cari anime dengan filter dan sort.

**Query params:**

| Parameter   | Default         | Keterangan                                             |
|-------------|-----------------|--------------------------------------------------------|
| `q`         | *(kosong)*      | Keyword pencarian (opsional — kosong = browse semua)   |
| `order`     | `recent_upload` | Urutan hasil                                           |
| `page`      | `1`             | Nomor halaman                                          |
| `page_size` | `24`            | Item per halaman (max 96)                              |
| `tags`      | *(kosong)*      | Filter tag, pisah koma — AND logic. e.g. `big boobs,vanilla` |
| `brands`    | *(kosong)*      | Filter brand, pisah koma — OR logic. e.g. `MS Pictures` |
| `blacklist` | *(kosong)*      | Tag yang dikecualikan, pisah koma                      |

**Valid `order`:**
`recent_upload` · `old_upload` · `most_views` · `least_views` · `most_likes` · `least_likes` · `newest` · `oldest` · `title_az` · `title_za`

**Contoh:**
```
GET /api/search?q=kanojo&order=most_views
GET /api/search?tags=vanilla,big+boobs&order=most_views
GET /api/search?brands=MS+Pictures&blacklist=ntr
GET /api/search               ← browse semua, recent upload
```

---

### `GET /api/video?url=`

Ambil detail video dari halaman video hanime.tv.

**Query params:**

| Parameter | Wajib | Keterangan                               |
|-----------|-------|------------------------------------------|
| `url`     | Ya    | URL halaman video (harus dari hanime.tv) |

**Contoh:**
```
GET /api/video?url=https://hanime.tv/videos/hentai/kanojo-saimin-1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3530,
    "title": "Kanojo Saimin 1",
    "slug": "kanojo-saimin-1",
    "thumbnail": "https://hanime-cdn.com/...",
    "description": "Koto Tenryuji acts completely indifferent...",
    "tags": ["filmed", "tsundere", "big boobs"],
    "brand": "T-Rex",
    "duration": "16:25",
    "releasedAt": "2026-08-26",
    "uploadedAt": "2026-08-27T15:00:00.000Z",
    "rating": { "likes": 8730, "dislikes": 245 },
    "views": null,
    "episodes": [
      {
        "title": "Kanojo Saimin 1",
        "slug": "kanojo-saimin-1",
        "url": "https://hanime.tv/videos/hentai/kanojo-saimin-1",
        "thumbnail": "https://hanime-cdn.com/..."
      }
    ],
    "player": [
      {
        "quality": "720p",
        "height": 720,
        "url": "https://hanime.tv/hls/3530/...",
        "type": "hls",
        "thumbnail": "https://hanime-cdn.com/..."
      }
    ]
  }
}
```

---

### `GET /api/browse`

Ambil featured categories (Trending, Seasons, Images) dan daftar semua tags.

---

### `GET /api/browse/tags/:slug`

Ambil daftar anime berdasarkan tag dengan sort dan paginasi.

**Path params:** `:slug` — nama tag, e.g. `blow%20job`

**Query params:**

| Parameter | Default         | Keterangan    |
|-----------|-----------------|---------------|
| `page`    | `1`             | Nomor halaman |
| `order`   | `recent_upload` | Urutan hasil  |

**Valid `order`:**
`recent_upload` · `old_upload` · `newest` · `oldest` · `most_views` · `least_views` · `most_likes` · `title_az` · `title_za`

**Contoh:**
```
GET /api/browse/tags/vanilla
GET /api/browse/tags/blow%20job?page=2&order=most_views
```

---

### `GET /api/browse/trending`

Ambil daftar trending anime dengan timespan dan paginasi.

**Query params:**

| Parameter   | Default   | Keterangan    |
|-------------|-----------|---------------|
| `timespan`  | `monthly` | Periode trend |
| `page`      | `1`       | Nomor halaman |

**Valid `timespan`:**
`daily` · `weekly` · `monthly` · `quarterly` · `semi-annual` · `yearly`

**Contoh:**
```
GET /api/browse/trending
GET /api/browse/trending?timespan=weekly&page=2
```

---

### `GET /api/browse/season`

Ambil daftar anime per season (Summer, Spring, Winter, Fall).

**Query params:**

| Parameter | Default       | Keterangan          |
|-----------|---------------|---------------------|
| `year`    | Tahun sekarang | Tahun yang ditampilkan |

**Contoh:**
```
GET /api/browse/season
GET /api/browse/season?year=2025
```

---

### `GET /api/browse/images`

Ambil community image uploads dengan filter channel dan paginasi cursor-based.

**Query params:**

| Parameter | Default | Keterangan                                                    |
|-----------|---------|---------------------------------------------------------------|
| `channel` | *(semua)* | `all` · `media` · `nsfw-general` · `furry` · `futa` · `yaoi` · `yuri` · `traps` · `irl-3d` |
| `page`    | `1`     | Nomor halaman                                                 |
| `cursor`  | *(kosong)* | Cursor dari `pagination.nextCursor` (untuk navigasi akurat) |

**Contoh:**
```
GET /api/browse/images
GET /api/browse/images?channel=furry&page=2
GET /api/browse/images?cursor=/browse/images/2?before=1873180
```

---

## Format Error

Semua error menggunakan format konsisten:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Deskripsi error."
  }
}
```

| HTTP Status | Code                   | Kondisi                               |
|-------------|------------------------|---------------------------------------|
| 400         | `MISSING_PARAMETER`    | Parameter wajib tidak disertakan      |
| 400         | `INVALID_PARAMETER`    | Nilai parameter tidak valid           |
| 400         | `INVALID_URL`          | URL tidak valid / bukan domain target |
| 404         | `NOT_FOUND`            | Data tidak ditemukan                  |
| 429         | `RATE_LIMITED`         | Terlalu banyak request                |
| 500         | `INTERNAL_ERROR`       | Error server internal                 |
| 502         | `UPSTREAM_ERROR`       | Target website error                  |
| 502         | `UPSTREAM_UNREACHABLE` | Target website tidak bisa dijangkau   |
| 502         | `GATEWAY_TIMEOUT`      | Request timeout                       |

---

## Struktur Project

```
hakuma/
├── src/
│   ├── index.js                  # Entry point, Express app
│   ├── lib/
│   │   └── httpClient.js         # Axios client dengan retry
│   ├── scrapers/
│   │   ├── homeScraper.js        # Scraper halaman utama
│   │   ├── searchScraper.js      # Scraper pencarian (via internal API)
│   │   ├── videoScraper.js       # Scraper detail video
│   │   ├── browseScraper.js      # Scraper browse & tags
│   │   ├── trendingScraper.js    # Scraper trending
│   │   ├── seasonScraper.js      # Scraper season
│   │   └── imagesScraper.js      # Scraper community images
│   ├── routes/
│   │   ├── home.js               # GET /api/home
│   │   ├── search.js             # GET /api/search
│   │   ├── video.js              # GET /api/video
│   │   ├── browse.js             # GET /api/browse[/tags/:slug]
│   │   ├── trending.js           # GET /api/browse/trending
│   │   ├── season.js             # GET /api/browse/season
│   │   └── images.js             # GET /api/browse/images
│   ├── services/
│   │   ├── signatureService.js   # WASM signature generator
│   │   └── playerService.js      # HLS stream resolver via handshake
│   ├── middleware/
│   │   ├── errorHandler.js       # Global error handler
│   │   └── validateUrl.js        # URL validation middleware
│   └── vendor/
│       └── htv_signature_wasm.js # Vendored WASM untuk signature
├── worker/
│   ├── src/index.mjs             # Cloudflare Worker (handshake relay)
│   └── wrangler.jsonc            # Deploy config
├── .env
├── .env.example
├── package.json
└── README.md
```

---

## Player / Stream

Player (HLS stream URLs) didapat via **hanime.tv handshake flow**:
1. Generate `web2` signature dari WASM module
2. Enkripsi `{ slug, directive, timestamp }` dengan AES-256-GCM
3. POST ke `auth.hanime.tv/api/v11/handshake`
4. Dekripsi header `x-token` response → dapat HLS URLs

Kalau server production kena block Cloudflare, deploy Cloudflare Worker dari folder `worker/`:

```bash
cd worker
npx wrangler deploy
npx wrangler secret put RELAY_SECRET
```

Lalu update `.env`:
```env
HTV_HANDSHAKE_URL=https://<worker-name>.<subdomain>.workers.dev/api/v11/handshake
HTV_RELAY_SECRET=your-secret
```

---

> Hakuma adalah proyek tidak resmi. Konten dewasa (+18). Gunakan secara bertanggung jawab sesuai hukum yang berlaku di wilayah Anda.
