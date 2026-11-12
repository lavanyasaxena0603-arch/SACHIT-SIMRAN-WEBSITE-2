#!/usr/bin/env node
/**
 * ONE-COMMAND LOCAL DEVELOPMENT
 * =============================
 * Runs the Vite dev server (frontend, hot reload) and the RSVP backend together,
 * so `npm run dev` is all you need. Both children are killed when you press
 * Ctrl+C — no orphaned processes holding the port.
 *
 * WHY A PROXY INSTEAD OF A URL
 * ----------------------------
 * The frontend calls same-origin `/api/...` (see src/lib/rsvp.js). In dev, Vite
 * serves the page and proxies `/api` to this backend, so there is no base URL to
 * configure and no CORS to negotiate. In production the Node server serves both
 * the built files and `/api`, so the same relative paths work unchanged — which
 * is why nothing in `src/` has to know where the backend lives.
 *
 * Deliberately dependency-free: no `concurrently`, no `npm-run-all`. One less
 * thing to break on a fresh machine.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

// Ports come from the environment so a clashing port is a config change, not a
// code change.
const API_PORT = process.env.PORT || '3000';
const WEB_PORT = process.env.WEB_PORT || '5173';

const children = [];

function run(name, command, args, extraEnv = {}, colour = '36') {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin, // .cmd shims on Windows need a shell
  });
  children.push(child);

  const tag = `\x1b[${colour}m[${name}]\x1b[0m`;
  const pipe = (stream, out) => {
    let buf = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) out.write(`${tag} ${line}\n`);
    });
    stream.on('end', () => {
      if (buf) out.write(`${tag} ${buf}\n`);
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on('exit', (code, signal) => {
    if (signal) return; // we killed it during shutdown
    if (code !== 0) {
      console.error(`${tag} exited with code ${code}. Stopping the other process.`);
      shutdown(code ?? 1);
    }
  });

  return child;
}

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (c.exitCode === null) {
      try {
        c.kill(isWin ? undefined : 'SIGTERM');
      } catch {
        /* already gone */
      }
    }
  }
  // Give children a moment to close cleanly, then exit regardless.
  setTimeout(() => process.exit(code), 400);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (!existsSync(resolve(ROOT, '.env'))) {
  console.log(
    '\x1b[33m[dev]\x1b[0m No .env found — starting with defaults.\n' +
      '       For the admin view and WhatsApp, run:  npm run setup\n',
  );
}

console.log(
  `\x1b[1m[dev]\x1b[0m starting backend on :${API_PORT} and web on :${WEB_PORT}\n` +
    `\x1b[2m      site  → http://localhost:${WEB_PORT}\n` +
    `      admin → http://localhost:${API_PORT}/admin\n` +
    `      api   → http://localhost:${API_PORT}/api/health\x1b[0m\n`,
);

// Backend first so the proxy target exists before the browser asks for data.
run('api', process.execPath, ['server/server.mjs'], { PORT: API_PORT, NODE_ENV: 'development' }, '35');
run('web', npm, ['run', 'dev:client', '--', '--port', WEB_PORT], { WEB_PORT }, '36');
