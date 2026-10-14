'use strict';

const express = require('express');
const { scrapeImages, VALID_CHANNELS } = require('../scrapers/imagesScraper');
const { handleRequestError, sendError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/browse/images
 * GET /api/browse/images?channel=nsfw-general
 * GET /api/browse/images?channel=all&page=2
 * GET /api/browse/images?cursor=/browse/images/2?before=1873180
 *
 * Query params:
 *   channel   all | media | nsfw-general | furry | futa | yaoi | yuri | traps | irl-3d
 *   page      page number, default 1 (takes precedence over cursor)
 *   cursor    cursor dari pagination.nextCursor / prevCursor (opsional)
 */
router.get('/', async (req, res) => {
  const { channel, page: rawPage, cursor } = req.query;

  // Validate channel — "all" treated as no filter
  if (channel && channel !== 'all' && !VALID_CHANNELS.includes(channel)) {
    return sendError(
      res, 400, 'INVALID_PARAMETER',
      `Channel tidak valid. Pilihan: all, ${VALID_CHANNELS.join(', ')}.`
    );
  }

  // Validate page
  const page = rawPage !== undefined ? parseInt(rawPage, 10) : 1;
  if (isNaN(page) || page < 1) {
    return sendError(res, 400, 'INVALID_PARAMETER', "Parameter 'page' harus berupa angka positif.");
  }

  // Validate cursor if provided (only when page is not explicitly set)
  if (cursor && rawPage === undefined) {
    if (!cursor.startsWith('/browse/images/')) {
      return sendError(
        res, 400, 'INVALID_PARAMETER',
        "Parameter 'cursor' tidak valid. Gunakan nilai dari pagination.nextCursor atau prevCursor."
      );
    }
  }

  try {
    const result = await scrapeImages({
      channel: (channel && channel !== 'all') ? channel : null,
      page,
      cursor: (rawPage === undefined && cursor) ? cursor : null,
    });

    if (!result.data || result.data.length === 0) {
      return sendError(res, 404, 'NOT_FOUND', 'Tidak ada gambar yang ditemukan.');
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

module.exports = router;
