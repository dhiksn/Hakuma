'use strict';

const express = require('express');
const { scrapeSeason } = require('../scrapers/seasonScraper');
const { handleRequestError, sendError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/browse/season
 * GET /api/browse/season?year=2025
 *
 * Scrape the hanime.tv seasons page for the given year.
 * Defaults to the current year if ?year is omitted.
 *
 * Returns:
 *  - year        : the scraped year
 *  - availableYears : all years available in the year selector
 *  - seasons     : array of { name, year, videoCount, items[] }
 */
router.get('/', async (req, res) => {
  const rawYear = req.query.year;

  // Validate year if provided
  if (rawYear !== undefined) {
    const y = parseInt(rawYear, 10);
    if (isNaN(y) || y < 1900 || y > 2100) {
      return sendError(res, 400, 'INVALID_PARAMETER', "Parameter 'year' harus berupa angka tahun yang valid.");
    }
  }

  const year = rawYear ? parseInt(rawYear, 10) : new Date().getFullYear();

  try {
    const data = await scrapeSeason(year);

    if (!data.seasons || data.seasons.length === 0) {
      return sendError(res, 404, 'NOT_FOUND', `Tidak ada data season untuk tahun ${year}.`);
    }

    return res.json({ success: true, data });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

module.exports = router;
