import { createSlidingWindowLimiter } from './rateLimit.mjs';

/** Keep in sync with LIMITS.search in src/lib/limits.ts (server is slightly more generous). */
export const innertubeLimiter = createSlidingWindowLimiter({
  windowMs: 60_000,
  max: 25,
});

const MAX_BODY_BYTES = 8 * 1024;

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function isInnertubeSearchRequest(req) {
  const path = (req.url || '').split('?')[0];
  return req.method === 'POST' && /(^|\/)search$/.test(path);
}

/**
 * @returns {boolean} true if the response was already sent (caller must stop)
 */
export function rejectIfNotAllowedInnertube(req, res) {
  if (!isInnertubeSearchRequest(req)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
    return true;
  }

  const ip = getClientIp(req);
  const result = innertubeLimiter.check(ip);
  if (!result.ok) {
    const retrySec = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
    res.statusCode = 429;
    res.setHeader('Retry-After', String(retrySec));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        error: 'Too many search requests. Please wait a moment and try again.',
        retryAfterSeconds: retrySec,
      }),
    );
    return true;
  }

  return false;
}

export { MAX_BODY_BYTES };
