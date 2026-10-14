'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const homeRoute = require('./routes/home');
const searchRoute = require('./routes/search');
const videoRoute = require('./routes/video');
const browseRoute = require('./routes/browse');
const seasonRoute = require('./routes/season');
const trendingRoute = require('./routes/trending');
const imagesRoute = require('./routes/images');
const proxyRoute = require('./routes/proxy');
const { rateLimit } = require('express-rate-limit');
const { globalErrorMiddleware, sendError } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------ //
// Security & CORS                                                     //
// ------------------------------------------------------------------ //

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ------------------------------------------------------------------ //
// Rate limiting                                                       //
// ------------------------------------------------------------------ //

// General API: 120 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Terlalu banyak request. Coba lagi dalam 1 menit.' } },
});

// HLS proxy: tighter — 300 segments per minute per IP (a single 16-min video ~96 segs)
const proxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Proxy rate limit tercapai. Coba lagi sebentar.' } },
});

app.use('/api/proxy', proxyLimiter);
app.use('/api', generalLimiter);

// ------------------------------------------------------------------ //
// Body parser (for completeness; this API only exposes GET endpoints) //
// ------------------------------------------------------------------ //
app.use(express.json());

// Pretty-print JSON responses
app.set('json spaces', 2);

// ------------------------------------------------------------------ //
// Routes                                                              //
// ------------------------------------------------------------------ //

// ------------------------------------------------------------------ //
// Root — API info                                                     //
// ------------------------------------------------------------------ //
app.get('/', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    name: 'Hakuma',
    description: 'REST API untuk scraping hanime.tv menggunakan Axios + Cheerio.',
    version: '1.0.0',
    source: process.env.BASE_URL || 'https://hanime.tv',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        description: 'Info API dan daftar endpoint.',
        example: `${base}/`,
      },
      {
        method: 'GET',
        path: '/api/health',
        description: 'Cek status server.',
        example: `${base}/api/health`,
      },
      {
        method: 'GET',
        path: '/api/home',
        description: 'Ambil daftar anime dari halaman utama (Recent Uploads, New Releases, Trending, Random).',
        example: `${base}/api/home`,
      },
      {
        method: 'GET',
        path: '/api/search',
        description: 'Cari anime. ?q=keyword (opsional), ?order=recent_upload|old_upload|most_views|least_views|most_likes|least_likes|newest|oldest|title_az|title_za, ?tags=big+boobs,vanilla (AND), ?brands=MS+Pictures (OR), ?blacklist=yaoi,scat, ?page=, ?page_size=.',
        example: `${base}/api/search?q=kanojo&order=most_views`,
      },
      {
        method: 'GET',
        path: '/api/video?url=',
        description: 'Ambil detail dan player dari halaman video. Parameter url wajib diisi dan harus dari hanime.tv.',
        example: `${base}/api/video?url=https://hanime.tv/videos/hentai/kanojo-saimin-1`,
      },
      {
        method: 'GET',
        path: '/api/browse',
        description: 'Ambil daftar semua tags/kategori yang tersedia.',
        example: `${base}/api/browse`,
      },
      {
        method: 'GET',
        path: '/api/browse/images',
        description: 'Ambil community image uploads (cursor-based pagination). ?channel=media|nsfw-general|furry|futa|yaoi|yuri|traps|irl-3d, ?cursor=<nextCursor dari response sebelumnya>.',
        example: `${base}/api/browse/images?channel=nsfw-general`,
      },
      {
        method: 'GET',
        path: '/api/browse/trending',
        description: 'Ambil daftar trending anime. ?timespan=daily|weekly|monthly|quarterly|semi-annual|yearly (default: monthly). Support ?page=.',
        example: `${base}/api/browse/trending?timespan=monthly`,
      },
      {
        method: 'GET',
        path: '/api/browse/season',
        description: 'Ambil daftar anime per season (Summer, Spring, Winter, Fall). Default tahun ini. Support ?year=YYYY.',
        example: `${base}/api/browse/season?year=${new Date().getFullYear()}`,
      },
      {
        method: 'GET',
        path: '/api/browse/tags/:slug',
        description: 'Ambil daftar anime berdasarkan tag. Support pagination via ?page=.',
        example: `${base}/api/browse/tags/blow%20job?page=1`,
      },
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      baseUrl: process.env.BASE_URL || 'https://hanime.tv',
    },
  });
});

app.use('/api/home', homeRoute);
app.use('/api/search', searchRoute);
app.use('/api/video', videoRoute);
app.use('/api/proxy', proxyRoute);
app.use('/api/browse/season', seasonRoute);
app.use('/api/browse/trending', trendingRoute);
app.use('/api/browse/images', imagesRoute);
app.use('/api/browse', browseRoute);

// ------------------------------------------------------------------ //
// 404 for unknown routes                                              //
// ------------------------------------------------------------------ //
app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} tidak ditemukan.`);
});

// ------------------------------------------------------------------ //
// Global error handler (must be last)                                //
// ------------------------------------------------------------------ //
app.use(globalErrorMiddleware);

// ------------------------------------------------------------------ //
// Start server                                                        //
// ------------------------------------------------------------------ //
app.listen(PORT, () => {
  console.log(`🚀 Hakuma running on http://localhost:${PORT}`);
  console.log(`📡 Base URL: ${process.env.BASE_URL || 'https://hanime.tv'}`);
  console.log(`🌍 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
