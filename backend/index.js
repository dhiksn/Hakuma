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

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
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
  res.json({
    success: true,
    name: 'Hakuma-API',
    description: 'REST API untuk scraping hanime.tv menggunakan Axios + Cheerio.',
    version: '1.0.0',
    endpoints: [
      { method: 'GET', path: '/api/health', description: 'Cek status server.' },
      { method: 'GET', path: '/api/home', description: 'Ambil daftar anime dari halaman utama (Recent Uploads, New Releases, Trending, Random).' },
      { method: 'GET', path: '/api/search', description: 'Cari anime. ?q=keyword, ?order=recent_upload|old_upload|most_views|least_views|most_likes|least_likes|newest|oldest|title_az|title_za, ?tags=, ?brands=, ?blacklist=, ?page=, ?page_size=.' },
      { method: 'GET', path: '/api/video?url=', description: 'Ambil detail dan player dari halaman video. Parameter url wajib diisi dan harus dari hanime.tv.' },
      { method: 'GET', path: '/api/browse', description: 'Ambil daftar semua tags/kategori yang tersedia.' },
      { method: 'GET', path: '/api/browse/images', description: 'Ambil community image uploads. ?channel=media|nsfw-general|furry|futa|yaoi|yuri|traps|irl-3d, ?cursor=.' },
      { method: 'GET', path: '/api/browse/trending', description: 'Ambil daftar trending anime. ?timespan=daily|weekly|monthly|quarterly|semi-annual|yearly, ?page=.' },
      { method: 'GET', path: '/api/browse/season', description: 'Ambil daftar anime per season. ?year=YYYY.' },
      { method: 'GET', path: '/api/browse/tags/:slug', description: 'Ambil daftar anime berdasarkan tag. ?page=.' },
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
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
  console.log(`🌍 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
