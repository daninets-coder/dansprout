import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function runMigrations() {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const files = (await readdir(migrationsDir)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  for (const file of files) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
    if (applied.rowCount) continue;
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
}
