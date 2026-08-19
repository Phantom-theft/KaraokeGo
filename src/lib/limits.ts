/** Application-level limits. Client UX + hook checks. Not a substitute for Firestore rules. */

export const LIMITS = {
  search: {
    minQueryLength: 2,
    debounceMs: 500,
    maxPerWindow: 15,
    windowMs: 60_000,
  },
  queue: {
    maxPerWindow: 8,
    windowMs: 60_000,
    maxPerUser: 12,
    maxRoomQueue: 40,
    maxTitleLength: 200,
    maxArtistLength: 100,
  },
  roomCreate: {
    maxPerWindow: 4,
    windowMs: 30 * 60_000,
    cooldownMs: 8_000,
    maxNameLength: 32,
  },
  roomJoin: {
    maxPerWindow: 8,
    windowMs: 5 * 60_000,
    maxNameLength: 32,
  },
  contact: {
    maxPerWindow: 3,
    windowMs: 15 * 60_000,
    minMessageLength: 10,
    maxMessageLength: 2000,
    maxNameLength: 80,
    maxEmailLength: 120,
  },
} as const;
