'use strict';

const { sendError } = require('./errorHandler');

/**
 * Validate that a query parameter is a valid HTTP/HTTPS URL that belongs
 * to the configured BASE_URL host. Prevents open-redirect and SSRF issues.
 *
 * Usage:
 *   router.get('/video', validateUrlParam('url'), handler)
 *
 * @param {string} param - Name of the query parameter to validate.
 */
function validateUrlParam(param) {
  return (req, res, next) => {
    const raw = req.query[param];

    if (!raw) {
      return sendError(res, 400, 'MISSING_PARAMETER', `Query parameter '${param}' is required.`);
    }

    let parsed;
    try {
      parsed = new URL(raw);
    } catch (_) {
      return sendError(res, 400, 'INVALID_URL', `Query parameter '${param}' is not a valid URL.`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return sendError(res, 400, 'INVALID_URL', `URL must use http or https protocol.`);
    }

    // Only allow URLs from the configured target domain
    const allowedHost = new URL(process.env.BASE_URL || 'https://hanime.tv').hostname;
    if (parsed.hostname !== allowedHost) {
      return sendError(
        res,
        400,
        'INVALID_URL',
        `URL must be from ${allowedHost}.`
      );
    }

    next();
  };
}

module.exports = { validateUrlParam };
