'use strict';

const express = require('express');
const { scrapeSearch, VALID_ORDERS, DEFAULT_ORDER, DEFAULT_PAGE_SIZE } = require('../scrapers/searchScraper');
const { sendError, handleRequestError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/search
 * GET /api/search?q=kanojo
 * GET /api/search?q=kanojo&order=most_views&page=2
 * GET /api/search?q=kanojo&tags=big+boobs,vanilla
 * GET /api/search?tags=big+boobs&brands=MS+Pictures
 * GET /api/search?blacklist=yaoi,scat
 *
 * Query params:
 *   q           keyword pencarian (opsional — kosong = browse semua)
 *   order       recent_upload (default) | old_upload | most_views | least_views |
 *               most_likes | least_likes | newest | oldest | title_az | title_za
 *   page        halaman (default: 1)
 *   page_size   jumlah item per halaman (default: 24, max: 96)
 *   tags        filter tag, pisah koma: "big boobs,vanilla" (AND — semua harus ada)
 *   brands      filter brand, pisah koma: "MS Pictures,PoRO" (OR — salah satu cocok)
 *   blacklist   tag yang dikecualikan, pisah koma: "yaoi,scat"
 */
router.get('/', async (req, res) => {
  const {
    q = '',
    order    = DEFAULT_ORDER,
    page:         rawPage     = '1',
    page_size:    rawPageSize,
    tags:         rawTags,
    brands:       rawBrands,
    blacklist:    rawBlacklist,
  } = req.query;

  // Validate order
  if (!VALID_ORDERS.includes(order)) {
    return sendError(
      res, 400, 'INVALID_PARAMETER',
      `Order tidak valid. Pilihan: ${VALID_ORDERS.join(', ')}.`
    );
  }

  // Validate page
  const page = parseInt(rawPage, 10);
  if (isNaN(page) || page < 1) {
    return sendError(res, 400, 'INVALID_PARAMETER', "Parameter 'page' harus berupa angka positif.");
  }

  // Validate page_size
  const pageSize = rawPageSize ? parseInt(rawPageSize, 10) : DEFAULT_PAGE_SIZE;
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 96) {
    return sendError(res, 400, 'INVALID_PARAMETER', "Parameter 'page_size' harus antara 1 dan 96.");
  }

  // Parse comma-separated filter params
  const parseCsv = (raw) =>
    raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const tags      = parseCsv(rawTags);
  const brands    = parseCsv(rawBrands);
  const blacklist = parseCsv(rawBlacklist);

  // Require at least q or one filter — browse all is allowed (no restriction needed)

  try {
    const result = await scrapeSearch({
      query: q.trim(),
      order,
      page,
      pageSize,
      tags,
      brands,
      blacklist,
    });

    if (!result.data || result.data.length === 0) {
      return sendError(
        res, 404, 'NOT_FOUND',
        q.trim()
          ? `Tidak ada hasil untuk pencarian "${q}".`
          : 'Tidak ada hasil ditemukan.'
      );
    }

    return res.json({
      success:    true,
      order,
      validOrders: VALID_ORDERS,
      filters:    result.filters,
      total:      result.total,
      totalPages: result.totalPages,
      page:       result.page,
      pageSize:   result.pageSize,
      data:       result.data,
    });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

module.exports = router;
