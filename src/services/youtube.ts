// ─────────────────────────────────────────────────────────────
// YouTube Karaoke Search — Uses YouTube's InnerTube API
// No API key needed. YouTube uses this internally in the browser.
// ─────────────────────────────────────────────────────────────

import { LIMITS } from '../lib/limits';
import { RateLimitError, enforceRateLimit } from '../lib/rateLimit';

export interface SongSearchResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  isKaraoke: boolean;
}

const KARAOKE_KEYWORDS = ['karaoke', 'instrumental', 'minus one', 'sing along', 'backing track', 'off vocal'];

// Proxied via Vite dev server (vite.config.ts) to avoid CORS.
// The Vite server forwards /api/innertube/* → https://www.youtube.com/youtubei/v1/*
const INNERTUBE_SEARCH_URL = '/api/innertube/search?prettyPrint=false';

const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20231219.04.00',
    hl: 'en',
    gl: 'US',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
};

const embedCache = new Map<string, boolean>();

function isKaraokeTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return KARAOKE_KEYWORDS.some(kw => lower.includes(kw));
}

function parseDurationText(text: string): number {
  if (!text) return 240;
  const parts = text.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 240;
}

/**
 * Fetch real video title & uploader via YouTube oEmbed (no CORS issues)
 */
export async function fetchYouTubeVideoInfo(videoId: string): Promise<{ title: string; artist: string }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || 'Karaoke Track',
        artist: data.author_name || 'YouTube',
      };
    }
  } catch (_) {}
  return { title: 'Karaoke Track', artist: 'Custom Request' };
}

/**
 * Returns true when a video allows embedding on external sites.
 * YouTube oEmbed returns 401 when the owner disabled embedding — that is
 * the same restriction that causes YT.Player error 101/150.
 */
export async function isVideoEmbeddable(videoId: string): Promise<boolean> {
  if (!videoId) return false;
  if (embedCache.has(videoId)) return embedCache.get(videoId)!;

  let embeddable = false;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    embeddable = res.ok;
  } catch (err) {
    console.warn('[EmbedCheck] oEmbed failed for', videoId, err);
    // On network failure, keep the song rather than emptying search results
    embeddable = true;
  }

  embedCache.set(videoId, embeddable);
  return embeddable;
}

/** Keep only videos that allow embedding (runs checks in parallel). */
export async function filterEmbeddableSongs(
  songs: SongSearchResult[],
  limit = 12
): Promise<SongSearchResult[]> {
  const checks = await Promise.all(
    songs.map(async (song) => ({
      song,
      ok: await isVideoEmbeddable(song.id),
    }))
  );
  return checks.filter((c) => c.ok).map((c) => c.song).slice(0, limit);
}

/**
 * Search YouTube using InnerTube API — the same API YouTube's website uses.
 * Results that disallow embedding are filtered out before returning.
 */
export async function searchKaraokeTracks(
  userQuery: string,
  signal?: AbortSignal,
): Promise<SongSearchResult[]> {
  const trimmed = userQuery.trim();
  if (!trimmed) return [];
  if (trimmed.length < LIMITS.search.minQueryLength) return [];

  enforceRateLimit('search', {
    max: LIMITS.search.maxPerWindow,
    windowMs: LIMITS.search.windowMs,
    persist: 'session',
    message: 'Too many song searches.',
  });

  const query = `${trimmed} karaoke`;

  try {
    const res = await fetch(INNERTUBE_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          query,
          params: 'EgIQAQ%3D%3D', // filter: videos only
        }),
        signal,
      });

    if (res.status === 429) {
      throw new RateLimitError('Too many song searches. Please wait a moment and try again.', 15_000);
    }
    if (!res.ok) throw new Error(`InnerTube responded with ${res.status}`);

    const data = await res.json();

    const sectionContents: any[] =
      data?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents ?? [];

    const results: SongSearchResult[] = [];

    for (const section of sectionContents) {
      const items: any[] = section?.itemSectionRenderer?.contents ?? [];
      for (const item of items) {
        const vr = item.videoRenderer;
        if (!vr?.videoId) continue;

        const videoId: string = vr.videoId;
        const title: string = vr.title?.runs?.[0]?.text ?? 'Karaoke Track';
        const artist: string = vr.ownerText?.runs?.[0]?.text ?? 'YouTube';
        const durationText: string = vr.lengthText?.simpleText ?? '';
        const thumbnails: any[] = vr.thumbnail?.thumbnails ?? [];
        const thumbnail: string =
          thumbnails[thumbnails.length - 1]?.url ??
          `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        results.push({
          id: videoId,
          title,
          artist,
          thumbnail,
          duration: parseDurationText(durationText),
          isKaraoke: isKaraokeTitle(title),
        });

        // Collect extras so embed filtering still leaves enough results
        if (results.length >= 20) break;
      }
      if (results.length >= 20) break;
    }

    results.sort((a, b) => (a.isKaraoke === b.isKaraoke ? 0 : a.isKaraoke ? -1 : 1));

    const embeddable = await filterEmbeddableSongs(results, 16);
    console.log(
      `[InnerTube] Found ${results.length} results for "${query}", ${embeddable.length} embeddable`
    );
    return embeddable;

  } catch (e: any) {
    if (e instanceof RateLimitError) throw e;
    if (e?.name === 'AbortError' || signal?.aborted) return [];
    console.error('[InnerTube Search] Failed:', e);
    return [];
  }
}
