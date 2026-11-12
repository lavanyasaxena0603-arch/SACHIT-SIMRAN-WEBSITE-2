/**
 * STATIC FILE SERVING — with HTTP Range support.
 *
 * WHY RANGE MATTERS (not optional)
 * --------------------------------
 * This site's chapters are MP4 films. Safari — and every iOS device — will not
 * play a progressive MP4 served with a plain 200 and no `Accept-Ranges`. It
 * requests `Range: bytes=0-1` first to sniff, and a server that ignores that
 * returns the whole file, which Safari treats as unplayable. So:
 *
 *   • `Accept-Ranges: bytes` on every media response
 *   • 206 + `Content-Range` for a real range request
 *   • 416 for an unsatisfiable one
 *
 * Path traversal is blocked by resolving the path and requiring the result to
 * stay inside the root, then checking it is a regular file.
 */

import { createReadStream, statSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const IMMUTABLE = new Set(['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.mp4', '.webm', '.mp3', '.m4a']);

export function contentType(file) {
  return MIME[extname(file).toLowerCase()] || 'application/octet-stream';
}

/** Resolve a URL path inside `root`, or null when it escapes the root. */
export function safePath(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null; // malformed %-escape
  }
  if (decoded.includes('\0')) return null;

  // Normalise the join, then confirm containment with a separator boundary so
  // "/public-secrets" cannot pass as a child of "/public".
  const full = resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  const base = resolve(root);
  if (full !== base && !full.startsWith(base + sep)) return null;
  return full;
}

export function fileExists(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Serve one file. Honours Range, HEAD, conditional GET and correct MIME.
 * @returns {boolean} true when a response was written
 */
export function serveFile(req, res, filePath, { cacheBust = false, extraHeaders = {} } = {}) {
  let st;
  try {
    st = statSync(filePath);
  } catch {
    return false;
  }
  if (!st.isFile()) return false;

  const type = contentType(filePath);
  const ext = extname(filePath).toLowerCase();
  const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;

  const headers = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Last-Modified': st.mtime.toUTCString(),
    ETag: etag,
    // Hashed Vite bundles never change; HTML must always revalidate.
    'Cache-Control':
      IMMUTABLE.has(ext) && cacheBust
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extraHeaders,
  };

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return true;
  }

  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${st.size}` });
      res.end();
      return true;
    }

    let start;
    let end;
    if (m[1] === '' && m[2] === '') {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${st.size}` });
      res.end();
      return true;
    }
    if (m[1] === '') {
      // Suffix form: last N bytes.
      const n = Number(m[2]);
      start = Math.max(0, st.size - n);
      end = st.size - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === '' ? st.size - 1 : Math.min(Number(m[2]), st.size - 1);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= st.size) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${st.size}` });
      res.end();
      return true;
    }

    headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
    headers['Content-Length'] = end - start + 1;
    res.writeHead(206, headers);
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    createReadStream(filePath, { start, end }).on('error', () => res.destroy()).pipe(res);
    return true;
  }

  headers['Content-Length'] = st.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  createReadStream(filePath).on('error', () => res.destroy()).pipe(res);
  return true;
}

export { existsSync };
