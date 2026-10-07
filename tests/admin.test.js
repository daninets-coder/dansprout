import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { SETTING_DEFS, validateSetting, createSettingsStore } from '../server/modules/settings.js';
import { createAdminRouter } from '../server/modules/admin.js';

test('settings validation accepts good values and rejects bad ones', () => {
  assert.deepEqual(validateSetting('free_story_limit', '8'), { ok: true, value: 8 });
  assert.equal(validateSetting('free_story_limit', -1).ok, false);
  assert.equal(validateSetting('free_story_limit', 1.5).ok, false);
  assert.equal(validateSetting('free_period_days', 0).ok, false);
  assert.equal(validateSetting('free_period_days', 366).ok, false);
  assert.equal(validateSetting('pricing_coming_soon', 'ON').value, 'on');
  assert.equal(validateSetting('pricing_coming_soon', 'maybe').ok, false);
  assert.equal(validateSetting('nope', 1).ok, false);
  const emails = validateSetting('plan_exempt_emails', ' A@x.com\nb@y.org, a@x.com ');
  assert.deepEqual(emails.value, ['a@x.com', 'b@y.org']);
  assert.equal(validateSetting('plan_exempt_emails', 'not-an-email').ok, false);
});

function fakePool(rows = []) {
  const queries = [];
  const client = { query: async (text, params) => { queries.push({ text, params }); return { rows: [] }; }, release() {} };
  return { queries, query: async text => { if (/FROM app_settings/.test(text)) return { rows }; return { rows: [] }; }, connect: async () => client };
}

test('settings store: defaults, database values, invalid rows ignored, writes', async () => {
  const pool = fakePool([{ key: 'free_story_limit', value: 9, updated_at: new Date(), updated_by: 'me' }, { key: 'free_period_days', value: 'bad', updated_at: new Date(), updated_by: null }]);
  const store = createSettingsStore(pool, { fallbacks: { ai_monthly_limit: 250 } });
  assert.equal(store.get('free_story_limit'), SETTING_DEFS.free_story_limit.fallback); // before load: default
  await store.load();
  assert.equal(store.get('free_story_limit'), 9);          // from the database
  assert.equal(store.get('free_period_days'), 14);         // invalid row ignored -> default
  assert.equal(store.get('ai_monthly_limit'), 250);        // environment-supplied default
  const bad = await store.setMany({ free_story_limit: 'abc' }, 'me');
  assert.equal(bad.ok, false);
  const good = await store.setMany({ free_story_limit: 6, plan_exempt_emails: ['a@b.co'] }, 'me');
  assert.equal(good.ok, true);
  const writes = pool.queries.filter(q => /INSERT INTO app_settings/.test(q.text));
  assert.equal(writes.length, 2);
  assert.ok(pool.queries.some(q => q.text === 'COMMIT'));
});

async function startAdmin({ accountEmail }) {
  const pool = {
    query: async text => {
      if (/SELECT email, email_verified_at FROM accounts/.test(text)) return { rows: [{ email: accountEmail, email_verified_at: new Date() }] };
      return { rows: [] };
    },
  };
  const store = createSettingsStore(fakePool(), {});
  const app = express();
  const requireAuth = (req, res, next) => { req.auth = { sub: 'u1' }; next(); };
  app.use('/api/admin', createAdminRouter({
    pool, bcrypt: { compare: async () => false }, settingsStore: store, ownerEmail: 'owner@example.com',
    requireAuth, requireAdultAccount: (req, res, next) => next(), isPricingComingSoon: () => true,
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test('admin API is invisible (404) to anyone but the owner, for every route and method', async t => {
  const { server, base } = await startAdmin({ accountEmail: 'someone-else@example.com' });
  t.after(() => { server.closeAllConnections(); server.close(); });
  for (const [method, path] of [['GET', '/overview'], ['GET', '/customers'], ['GET', '/settings'], ['GET', '/audit'], ['GET', '/export/customers.csv'], ['PUT', '/settings'], ['POST', '/customers/00000000-0000-0000-0000-000000000000/free-days']]) {
    const r = await fetch(base + '/api/admin' + path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
    assert.equal(r.status, 404, `${method} ${path}`);
    await r.arrayBuffer();
  }
});

test('owner can read settings; changes need the password', async t => {
  const { server, base } = await startAdmin({ accountEmail: 'Owner@Example.com' }); // case-insensitive match
  t.after(() => { server.closeAllConnections(); server.close(); });
  const read = await fetch(base + '/api/admin/settings');
  assert.equal(read.status, 200);
  const body = await read.json();
  assert.ok(body.settings.some(s => s.key === 'free_story_limit'));
  const write = await fetch(base + '/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes: { free_story_limit: 9 }, currentPassword: 'wrong' }) });
  assert.equal(write.status, 401);
  await write.arrayBuffer();
  const unknown = await fetch(base + '/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes: { hack: 1 }, currentPassword: 'x' }) });
  assert.equal(unknown.status, 400);
  await unknown.arrayBuffer();
});
