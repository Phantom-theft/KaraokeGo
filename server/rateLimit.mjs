/**
 * In-memory sliding-window limiter for the Node/Render process.
 *
 * Limitations on Render:
 * - State lives in this process only. A restart, deploy, or free-tier spin-down resets counts.
 * - Multiple instances each have their own counters (Render free is typically one instance).
 * - For stronger shared limits, use Redis / Upstash / a dedicated rate-limit service.
 */
export function createSlidingWindowLimiter({ windowMs, max }) {
  /** @type {Map<string, number[]>} */
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => now - t < windowMs);
      if (fresh.length) hits.set(key, fresh);
      else hits.delete(key);
    }
  }, Math.min(windowMs, 60_000)).unref?.();

  return {
    /**
     * @param {string} key
     * @returns {{ ok: true } | { ok: false, retryAfterMs: number }}
     */
    check(key) {
      const now = Date.now();
      const times = (hits.get(key) || []).filter((t) => now - t < windowMs);
      if (times.length >= max) {
        return { ok: false, retryAfterMs: Math.max(1000, windowMs - (now - times[0])) };
      }
      times.push(now);
      hits.set(key, times);
      return { ok: true };
    },
  };
}
