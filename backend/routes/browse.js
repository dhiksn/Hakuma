'use strict';

const express = require('express');
const { scrapeBrowse, scrapeTagPage, VALID_TAG_ORDERS, DEFAULT_TAG_ORDER } = require('../scrapers/browseScraper');
const { handleRequestError, sendError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/browse
 * Return featured categories and all available tags.
 */
router.get('/', async (req, res) => {
  try {
    const result = await scrapeBrowse();
    const empty = result.featured.length === 0 && result.tags.length === 0;
    if (empty) return sendError(res, 404, 'NOT_FOUND', 'Tidak ada data browse yang ditemukan.');
    return res.json({ success: true, data: { featured: result.featured, tags: result.tags } });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

/**
 * GET /api/browse/tags/:slug
 * GET /api/browse/tags/:slug?page=2&order=views_desc
 *
 * Query params:
 *   page   page number (default: 1)
 *   order  created_at_desc (default) | created_at_asc | released_at_desc | released_at_asc |
 *          views_desc | views_asc | likes_desc | name_asc | name_desc
 */
router.get('/tags/:slug', async (req, res) => {
  const slug  = req.params.slug;
  const page  = parseInt(req.query.page  || '1', 10);
  const order = req.query.order || DEFAULT_TAG_ORDER;

  if (!slug || slug.trim() === '') {
    return sendError(res, 400, 'MISSING_PARAMETER', 'Tag slug tidak boleh kosong.');
  }
  if (isNaN(page) || page < 1) {
    return sendError(res, 400, 'INVALID_PARAMETER', "Parameter 'page' harus berupa angka positif.");
  }
  if (!VALID_TAG_ORDERS.includes(order)) {
    return sendError(
      res, 400, 'INVALID_PARAMETER',
      `Order tidak valid. Pilihan: ${VALID_TAG_ORDERS.join(', ')}.`
    );
  }

  try {
    const result = await scrapeTagPage(slug.trim(), page, order);

    if (!result.items || result.items.length === 0) {
      return sendError(
        res, 404, 'NOT_FOUND',
        `Tidak ada anime ditemukan untuk tag "${slug}"${page > 1 ? ` halaman ${page}` : ''}.`
      );
    }

    return res.json({
      success: true,
      tag: slug,
      order,
      validOrders: VALID_TAG_ORDERS,
      total: result.items.length,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

module.exports = router;
