#!/usr/bin/env node
/**
 * DATABASE BACKUP  —  npm run db:backup
 *
 * SQLite keeps recent writes in a `-wal` sidecar file. Copying only the .sqlite
 * while the server is running can therefore capture a stale snapshot. This uses
 * `VACUUM INTO`, which the engine performs as a consistent read — the copy is a
 * valid, fully-merged database even mid-write, and it needs no downtime.
 *
 * Restore is a file copy (see README): stop the server, replace the database,
 * delete any stale -wal/-shm, start again.
 */

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DB = resolve(ROOT, process.env.RSVP_DB_PATH || 'data/rsvp.sqlite');

if (!existsSync(DB)) {
  console.error(`✗ No database at ${DB}`);
  console.error('  Start the server once (npm start) to create it, then retry.');
  process.exit(1);
}

const backupsDir = join(ROOT, 'data', 'backups');
mkdirSync(backupsDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const target = join(backupsDir, `${basename(DB, '.sqlite')}_${stamp}.sqlite`);

// VACUUM INTO fails if the target exists; the timestamp makes collisions unlikely.
const db = new DatabaseSync(DB, { readOnly: true });
try {
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
} finally {
  db.close();
}

const kb = (statSync(target).size / 1024).toFixed(1);
console.log(`✓ backup written: ${target}  (${kb} kB)`);
console.log('  This single file is the complete register — store a copy off-machine.');
