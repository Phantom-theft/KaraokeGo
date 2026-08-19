const STORAGE_PREFIX = 'karaokego_rl_';

export class RateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs = 0) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

type PersistStore = 'memory' | 'session' | 'local';

interface RateLimitOptions {
  max: number;
  windowMs: number;
  persist?: PersistStore;
  message: string;
}

const memoryWindows = new Map<string, number[]>();

function getWebStorage(persist: PersistStore): Storage | null {
  if (persist === 'memory' || typeof window === 'undefined') return null;
  try {
    return persist === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readTimestamps(key: string, persist: PersistStore): number[] {
  const fromMemory = memoryWindows.get(key) ?? [];
  const storage = getWebStorage(persist);
  if (!storage) return fromMemory;
  try {
    const raw = storage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fromMemory;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is number => typeof t === 'number')
      : fromMemory;
  } catch {
    return fromMemory;
  }
}

function writeTimestamps(key: string, timestamps: number[], persist: PersistStore): void {
  memoryWindows.set(key, timestamps);
  const storage = getWebStorage(persist);
  if (!storage) return;
  try {
    storage.setItem(STORAGE_PREFIX + key, JSON.stringify(timestamps));
  } catch {
    // Quota / private mode — in-memory still applies for this tab.
  }
}

export function formatWait(retryAfterMs: number): string {
  const sec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (sec < 60) return `${sec} second${sec === 1 ? '' : 's'}`;
  const min = Math.ceil(sec / 60);
  return `${min} minute${min === 1 ? '' : 's'}`;
}

/** Sliding-window limiter. Throws RateLimitError when the caller should wait. */
export function enforceRateLimit(key: string, options: RateLimitOptions): void {
  const persist = options.persist ?? 'session';
  const now = Date.now();
  const timestamps = readTimestamps(key, persist).filter((t) => now - t < options.windowMs);

  if (timestamps.length >= options.max) {
    const retryAfterMs = Math.max(1000, options.windowMs - (now - timestamps[0]));
    throw new RateLimitError(
      `${options.message} Try again in ${formatWait(retryAfterMs)}.`,
      retryAfterMs,
    );
  }

  timestamps.push(now);
  writeTimestamps(key, timestamps, persist);
}

/** Minimum gap between two actions with the same key. */
export function enforceCooldown(key: string, cooldownMs: number, message: string): void {
  const persist: PersistStore = 'local';
  const now = Date.now();
  const timestamps = readTimestamps(key, persist);
  const last = timestamps[timestamps.length - 1];
  if (typeof last === 'number' && now - last < cooldownMs) {
    const retryAfterMs = cooldownMs - (now - last);
    throw new RateLimitError(`${message} Try again in ${formatWait(retryAfterMs)}.`, retryAfterMs);
  }
  writeTimestamps(key, [now], persist);
}
