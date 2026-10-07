// Config stored in the database (table app_settings) so it can be changed without a deploy:
// from the owner-only admin page, or with plain SQL. Code supplies a safe default for every key.
//
//   SELECT key, value FROM app_settings;
//   INSERT INTO app_settings (key, value) VALUES ('free_story_limit', '8')
//     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
//   DELETE FROM app_settings WHERE key = 'free_story_limit';   -- back to the default
//
// Values are re-read from the database about every 30 seconds.

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export const SETTING_DEFS = {
  free_period_days: { type: 'int', min: 1, max: 365, fallback: 14, group: 'Free Explorer', label: 'Free period (days)', help: 'How many days a new account can create stories for free.' },
  free_story_limit: { type: 'int', min: 0, max: 1000, fallback: 5, group: 'Free Explorer', label: 'Free stories', help: 'New stories a free account can create during the free period.' },
  free_learner_limit: { type: 'int', min: 1, max: 50, fallback: 1, group: 'Free Explorer', label: 'Free learners', help: 'Learner profiles a free account can have.' },
  learner_limit_individual: { type: 'int', min: 1, max: 500, fallback: 1, group: 'Paid plans', label: 'Individual plan: learners', help: 'Learner profiles on the Individual plan.' },
  learner_limit_family: { type: 'int', min: 1, max: 500, fallback: 5, group: 'Paid plans', label: 'Family plan: learners', help: 'Learner profiles on the Family plan.' },
  learner_limit_classroom: { type: 'int', min: 1, max: 5000, fallback: 30, group: 'Paid plans', label: 'Classroom plan: learners', help: 'Learner profiles on the Classroom plan.' },
  pricing_coming_soon: { type: 'choice', choices: ['default', 'on', 'off'], fallback: 'default', group: 'Pricing', label: 'Paid plans "Coming soon"', help: 'default = on in production and off elsewhere. on = hide prices and block checkout. off = paid plans are sold.' },
  plan_exempt_emails: { type: 'emails', fallback: [], group: 'Access', label: 'Never-limited accounts', help: 'Emails (one per line) that are never limited by plan rules. The owner email is always exempt.' },
  ai_monthly_limit: { type: 'int', min: 1, max: 100000, fallback: 100, group: 'Safety', label: 'AI actions per account per month', help: 'Cost safeguard that applies to every account.' },
};

export function validateSetting(key, raw) {
  const def = SETTING_DEFS[key];
  if (!def) return { ok: false, error: `Unknown setting: ${key}` };
  if (def.type === 'int') {
    const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
    if (!Number.isInteger(n) || n < def.min || n > def.max) return { ok: false, error: `${def.label} must be a whole number from ${def.min} to ${def.max}.` };
    return { ok: true, value: n };
  }
  if (def.type === 'choice') {
    const v = String(raw ?? '').trim().toLowerCase();
    if (!def.choices.includes(v)) return { ok: false, error: `${def.label} must be one of: ${def.choices.join(', ')}.` };
    return { ok: true, value: v };
  }
  if (def.type === 'emails') {
    const list = Array.isArray(raw) ? raw : String(raw ?? '').split(/[\s,;]+/);
    const emails = [...new Set(list.map(item => String(item).trim().toLowerCase()).filter(Boolean))];
    if (emails.length > 100) return { ok: false, error: 'Use 100 emails or fewer.' };
    const bad = emails.find(email => !EMAIL_RE.test(email) || email.length > 120);
    if (bad) return { ok: false, error: `"${bad}" is not a valid email address.` };
    return { ok: true, value: emails };
  }
  return { ok: false, error: 'Unsupported setting type.' };
}

export function createSettingsStore(pool, { fallbacks = {} } = {}) {
  const cache = new Map(); // key -> value saved in the database
  const meta = new Map();  // key -> { updatedAt, updatedBy }
  let timer = null;

  const fallbackFor = key => (Object.prototype.hasOwnProperty.call(fallbacks, key) ? fallbacks[key] : SETTING_DEFS[key].fallback);

  async function load() {
    const { rows } = await pool.query('SELECT key, value, updated_at, updated_by FROM app_settings');
    cache.clear();
    meta.clear();
    for (const row of rows) {
      const check = validateSetting(row.key, row.value);
      if (!check.ok) { console.warn(`app_settings: ignoring invalid value for ${row.key}`); continue; }
      cache.set(row.key, check.value);
      meta.set(row.key, { updatedAt: row.updated_at, updatedBy: row.updated_by });
    }
  }

  const get = key => (cache.has(key) ? cache.get(key) : fallbackFor(key));

  function all() {
    return Object.entries(SETTING_DEFS).map(([key, def]) => ({
      key,
      group: def.group,
      label: def.label,
      help: def.help,
      type: def.type,
      choices: def.choices || null,
      min: def.min ?? null,
      max: def.max ?? null,
      value: get(key),
      default: fallbackFor(key),
      source: cache.has(key) ? 'database' : 'default',
      updatedAt: meta.get(key)?.updatedAt || null,
      updatedBy: meta.get(key)?.updatedBy || null,
    }));
  }

  // changes: { key: value | null }.  null resets that key to its default.
  async function setMany(changes, actorEmail) {
    const prepared = [];
    for (const [key, raw] of Object.entries(changes || {})) {
      if (raw === null) { prepared.push({ key, reset: true }); continue; }
      const check = validateSetting(key, raw);
      if (!check.ok) return { ok: false, error: check.error };
      prepared.push({ key, value: check.value });
    }
    if (!prepared.length) return { ok: false, error: 'Nothing to change.' };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of prepared) {
        if (item.reset) await client.query('DELETE FROM app_settings WHERE key = $1', [item.key]);
        else await client.query('INSERT INTO app_settings (key, value, updated_by) VALUES ($1, $2::jsonb, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()', [item.key, JSON.stringify(item.value), actorEmail || null]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    await load();
    return { ok: true, changed: prepared.map(item => item.key) };
  }

  function startRefresh(ms = 30000) {
    if (timer) return;
    timer = setInterval(() => { load().catch(error => console.warn('app_settings refresh failed:', error.message)); }, ms);
    timer.unref?.();
  }

  return { load, get, all, setMany, startRefresh };
}
