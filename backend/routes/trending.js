'use strict';

const express = require('express');
const { scrapeTrending, VALID_TIMESPANS, DEFAULT_TIMESPAN } = require('../scrapers/trendingScraper');
const { handleRequestError, sendError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/browse/trending
 * GET /api/browse/trending?timespan=weekly
 * GET /api/browse/trending?timespan=monthly&page=2
 *
 * Scrape the hanime.tv trending page.
 *
 * Query params:
 *   timespan  daily | weekly | monthly (default) | quarterly | semi-annual | yearly
 *   page      page number (default: 1)
 */
router.get('/', async (req, res) => {
  const { timespan = DEFAULT_TIMESPAN, page: rawPage = '1' } = req.query;

  // Validate timespan
  if (!VALID_TIMESPANS.includes(timespan)) {
    return sendError(
      res, 400, 'INVALID_PARAMETER',
      `Timespan tidak valid. Pilihan: ${VALID_TIMESPANS.join(', ')}.`
    );
  }

  // Validate page
  const page = parseInt(rawPage, 10);
  if (isNaN(page) || page < 1) {
    return sendError(res, 400, 'INVALID_PARAMETER', "Parameter 'page' harus berupa angka positif.");
  }

  try {
    const result = await scrapeTrending(timespan, page);

    if (!result.data || result.data.length === 0) {
      return sendError(res, 404, 'NOT_FOUND', `Tidak ada data trending untuk timespan "${timespan}".`);
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

module.exports = router;
