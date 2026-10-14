'use strict';

const express = require('express');
const { scrapeHome } = require('../scrapers/homeScraper');
const { handleRequestError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/home
 * Fetch anime cards from the hanime.tv home page.
 */
router.get('/', async (req, res) => {
  try {
    const data = await scrapeHome();

    if (!data || (data.sections.length === 0 && data.total === 0)) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tidak ada data yang ditemukan di halaman utama.' },
      });
    }

    return res.json({ success: true, data });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

module.exports = router;
