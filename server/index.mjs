/**
 * Production server for Render (Web Service).
 * Serves the Vite build and rate-limits the YouTube InnerTube proxy.
 *
 * Start: npm run build && npm start
 * Render: Build Command `npm install && npm run build` / Start Command `npm start`
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_BODY_BYTES, rejectIfNotAllowedInnertube } from './innertubeGuard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 10000;
const YT_INNERTUBE_ORIGIN = 'https://www.youtube.com';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const err = new Error('payload_too_large');
      err.code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proxyInnertube(req, res) {
  if (rejectIfNotAllowedInnertube(req, res)) return;

  let body;
  try {
    body = await readBody(req, MAX_BODY_BYTES);
  } catch (err) {
    if (err?.code === 'PAYLOAD_TOO_LARGE') {
      sendJson(res, 413, { error: 'Search request is too large.' });
      return;
    }
    sendJson(res, 400, { error: 'Could not read search request.' });
    return;
  }

  const incomingUrl = new URL(req.url || '/', 'http://localhost');
  const targetPath = incomingUrl.pathname.replace(/^\/api\/innertube/, '/youtubei/v1') + incomingUrl.search;
  const targetUrl = YT_INNERTUBE_ORIGIN + targetPath;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://www.youtube.com',
        Referer: 'https://www.youtube.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body,
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.writeHead(upstream.status, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  } catch (err) {
    console.error('[innertube proxy]', err);
    sendJson(res, 502, { error: 'Song search is temporarily unavailable.' });
  }
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded === '/' ? '/index.html' : decoded;
  const resolved = path.resolve(DIST, '.' + relative);
  if (!resolved.startsWith(DIST)) return null;
  return resolved;
}

function serveStatic(req, res) {
  const filePath = safeStaticPath(req.url || '/');
  if (!filePath) {
    res.writeHead(403);
    res.end();
    return;
  }

  const fallback = path.join(DIST, 'index.html');
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  const finalPath = exists ? filePath : fallback;

  if (!fs.existsSync(finalPath)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output missing. Run npm run build before npm start.');
    return;
  }

  const ext = path.extname(finalPath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(exists ? 200 : 200, { 'Content-Type': type });
  fs.createReadStream(finalPath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath.startsWith('/api/innertube')) {
    void proxyInnertube(req, res);
    return;
  }

  if (urlPath.startsWith('/api/')) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`[Karaoke Go] listening on port ${PORT}`);
});
