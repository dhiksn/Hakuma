'use strict';

const axios = require('axios');

/**
 * Standardised error response helper.
 * Always returns { success: false, error: { code, message } }.
 *
 * @param {import('express').Response} res
 * @param {number} httpStatus
 * @param {string} code     - Machine-readable error code (SCREAMING_SNAKE).
 * @param {string} message  - Human-readable description.
 */
function sendError(res, httpStatus, code, message) {
  return res.status(httpStatus).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Map an Axios error (or any thrown error) to the appropriate HTTP status
 * and error code, then send the standardised response.
 *
 * @param {Error} err
 * @param {import('express').Response} res
 */
function handleRequestError(err, res) {
  // Axios network error — target site unreachable
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;

    if (!err.response) {
      // No response at all: timeout, DNS failure, connection refused
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        return sendError(res, 502, 'GATEWAY_TIMEOUT', 'Request to target website timed out.');
      }
      return sendError(res, 502, 'UPSTREAM_UNREACHABLE', 'Target website could not be reached.');
    }

    if (status === 404) {
      return sendError(res, 404, 'NOT_FOUND', 'The requested page was not found on the target website.');
    }
    if (status === 429) {
      return sendError(res, 429, 'RATE_LIMITED', 'Too many requests to the target website. Try again later.');
    }
    if (status >= 500) {
      return sendError(res, 502, 'UPSTREAM_ERROR', `Target website returned an error (HTTP ${status}).`);
    }

    return sendError(res, 502, 'UPSTREAM_ERROR', `Upstream HTTP error: ${status}.`);
  }

  // Generic server error
  console.error('[errorHandler]', err);
  return sendError(res, 500, 'INTERNAL_ERROR', err.message || 'An unexpected error occurred.');
}

/**
 * Express global error-handling middleware (4-argument signature).
 * Register AFTER all routes: app.use(globalErrorMiddleware)
 */
function globalErrorMiddleware(err, req, res, _next) {
  // Avoid double-sending if headers were already sent
  if (res.headersSent) return;
  handleRequestError(err, res);
}

module.exports = { sendError, handleRequestError, globalErrorMiddleware };
