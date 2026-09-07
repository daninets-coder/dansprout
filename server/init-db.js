import { readFile } from 'node:fs/promises';
import { pool } from './db.js';

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
await pool.end();
console.log('Story Sprout PostgreSQL schema is ready.');
