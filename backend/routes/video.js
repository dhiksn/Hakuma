'use strict';

const express = require('express');
const { scrapeVideo } = require('../scrapers/videoScraper');
const { validateUrlParam } = require('../middleware/validateUrl');
const { handleRequestError, sendError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/video?url=<video_page_url>
 * Fetch detail and player information for a specific hentai video.
 *
 * Example:
 *   GET /api/video?url=https://hanime.tv/videos/hentai/oniisan-ohitori-desu-ka-1
 */
router.get('/', validateUrlParam('url'), async (req, res) => {
  const { url } = req.query;

  try {
    const data = await scrapeVideo(url);

    if (!data || !data.title) {
      return sendError(res, 404, 'NOT_FOUND', 'Data video tidak ditemukan.');
    }

    return res.json({ success: true, data });
  } catch (err) {
    return handleRequestError(err, res);
  }
});

module.exports = router;
