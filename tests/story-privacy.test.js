import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { newDb } from 'pg-mem';
import { createStoryPrivacy } from '../server/modules/story-privacy.js';
import { createAuthentication } from '../server/modules/authentication.js';

test('drafts need a parent to save, delete removes everything, expired drafts are purged', async t => {
  const db = newDb();
  db.public.none(`CREATE TABLE accounts(id UUID PRIMARY KEY, role TEXT); CREATE TABLE learners(id UUID PRIMARY KEY, account_id UUID REFERENCES accounts(id), first_name TEXT);
    CREATE TABLE stories(id UUID PRIMARY KEY, learner_id UUID REFERENCES learners(id), title TEXT, theme TEXT, learning_goal TEXT, created_by TEXT, prompt TEXT, content JSONB, deleted_at TIMESTAMPTZ, status TEXT DEFAULT 'saved', review_confirmed_at TIMESTAMPTZ, review_confirmed_by UUID, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE story_deletion_audit(id UUID PRIMARY KEY, story_id UUID, account_id UUID REFERENCES accounts(id), deleted_at TIMESTAMPTZ DEFAULT NOW(), source TEXT);`);
  const { Pool } = db.adapters.createPg(); const pool = new Pool();
  const dir = await mkdtemp(path.join(os.tmpdir(), 'story-privacy-'));
  const illustrationsDir = path.join(dir, 'ill'); const audioDir = path.join(dir, 'audio');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(illustrationsDir); await mkdir(audioDir);
  const events = [];
  const privacy = createStoryPrivacy({ pool, illustrationsDir, audioDir, trackGrowthEvent: async (account, name) => { events.push(name); } });
  const parent = randomUUID(), learner = randomUUID(), draft = randomUUID(), old = randomUUID(), saved = randomUUID();
  await pool.query("INSERT INTO accounts VALUES($1,'parent')", [parent]);
  await pool.query('INSERT INTO learners VALUES($1,$2,$3)', [learner, parent, 'Mia']);
  const insert = (id, status, ageDays) => pool.query(`INSERT INTO stories(id,learner_id,title,prompt,content,status,created_at) VALUES($1,$2,'T','private prompt',$3,$4,NOW() - ($5 || ' days')::interval)`, [id, learner, { pages: ['x'] }, status, String(ageDays)]);
  await insert(draft, 'draft', 0); await insert(old, 'draft', 31); await insert(saved, 'saved', 90);
  await writeFile(path.join(illustrationsDir, `${draft}.png`), 'x'); await writeFile(path.join(audioDir, `${draft}-full-v1.mp3`), 'x'); await writeFile(path.join(audioDir, `${saved}-full-v1.mp3`), 'x');

  const auth = createAuthentication({ pool, jwtSecret: 'test-secret-more-than-thirty-two-characters' });
  const app = express(); app.use(express.json()); app.use(auth.requireAuth);
  privacy.registerRoutes(app, { requireAuth: (req, res, next) => next(), requireAdultAccount: auth.requireAdultAccount });
  app.use((e, req, res, next) => res.status(500).json({ error: e.message }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); server.close(); await pool.end(); await rm(dir, { recursive: true, force: true }); });
  const parentToken = auth.tokenFor({ id: parent, role: 'parent' }); const childToken = auth.childModeTokenFor(parent, learner);
  const request = async (token, route, method = 'GET', body) => { const r = await fetch(`http://127.0.0.1:${server.address().port}${route}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) }; };

  // child sessions can never save, delete, list drafts, or send events
  assert.equal((await request(childToken, `/api/stories/${draft}/save`, 'POST', { reviewConfirmed: true })).status, 403);
  assert.equal((await request(childToken, `/api/stories/${draft}/discard`, 'POST', { source: 'library' })).status, 403);
  assert.equal((await request(childToken, '/api/stories/drafts')).status, 403);
  assert.equal((await request(childToken, '/api/stories/privacy-events', 'POST', { event: 'prompt_shown' })).status, 403);
  // saving requires explicit review confirmation
  assert.equal((await request(parentToken, `/api/stories/${draft}/save`, 'POST', {})).status, 400);
  const list = await request(parentToken, '/api/stories/drafts');
  assert.equal(list.status, 200, JSON.stringify(list.data)); assert.equal(list.data.stories.length, 2);
  // a draft saves once, with a review timestamp
  const ok = await request(parentToken, `/api/stories/${draft}/save`, 'POST', { reviewConfirmed: true });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal((await request(parentToken, `/api/stories/${draft}/save`, 'POST', { reviewConfirmed: true })).status, 404);
  const row = (await pool.query('SELECT status, review_confirmed_at, review_confirmed_by FROM stories WHERE id=$1', [draft])).rows[0];
  assert.equal(row.status, 'saved'); assert.ok(row.review_confirmed_at); assert.equal(row.review_confirmed_by, parent);
  // hard delete: row, picture and narration are gone; audit holds ids only
  assert.equal((await request(parentToken, `/api/stories/${draft}/discard`, 'POST', { source: 'library' })).status, 204);
  assert.equal((await pool.query('SELECT 1 FROM stories WHERE id=$1', [draft])).rowCount, 0);
  const files = await readdir(illustrationsDir); assert.deepEqual(files, []);
  assert.deepEqual((await readdir(audioDir)).sort(), [`${saved}-full-v1.mp3`]);
  const audit = (await pool.query('SELECT * FROM story_deletion_audit')).rows;
  assert.equal(audit.length, 1); assert.deepEqual(Object.keys(audit[0]).sort(), ['account_id', 'deleted_at', 'id', 'source', 'story_id']);
  assert.equal((await request(parentToken, `/api/stories/${draft}/discard`, 'POST', { source: 'bogus' })).status, 400);
  // another family cannot delete it
  const stranger = randomUUID(); await pool.query("INSERT INTO accounts VALUES($1,'parent')", [stranger]);
  assert.equal((await request(auth.tokenFor({ id: stranger, role: 'parent' }), `/api/stories/${saved}/discard`, 'POST', { source: 'library' })).status, 404);
  // nightly purge removes only drafts older than 30 days, never saved stories
  assert.equal(await privacy.purgeExpiredDrafts(), 1);
  assert.equal((await pool.query('SELECT 1 FROM stories WHERE id=$1', [old])).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM stories WHERE id=$1', [saved])).rowCount, 1);
  assert.equal((await request(parentToken, '/api/stories/privacy-events', 'POST', { event: 'prompt_shown' })).status, 204);
  assert.ok(events.includes('story_privacy_prompt_shown'));
});
