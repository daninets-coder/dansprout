// Configuration, in three layers (first one that has a value wins):
//   1. the database table app_settings: edited from the owner-only admin page or with plain SQL,
//      changes apply without a deploy
//   2. the config file config/settings.json: project defaults, changing it needs a deploy
//   3. the built-in default in this file (or an environment variable for a few keys)
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
  paid_story_limit_monthly: { type: 'int', min: 0, max: 100000, fallback: 0, group: 'Paid plans', label: 'Paid plans: stories per month', help: 'New stories a paying account can create per calendar month. 0 means no plan limit (the AI cap below still applies).' },
  illustrations_enabled: { type: 'choice', choices: ['on', 'off'], fallback: 'on', group: 'Pictures', label: 'Story pictures', help: 'off = new stories are made without a picture (a cost and emergency switch).' },
  image_model: { type: 'text', pattern: /^[a-z0-9][a-z0-9._-]{2,59}$/, patternHelp: 'a model name such as gpt-image-1', fallback: 'gpt-image-1', group: 'Pictures', label: 'Picture model', help: 'OpenAI image model used for story pictures. gpt-image-1 is scheduled to shut down on 2026-12-01, so switch before then.' },
  image_quality: { type: 'choice', choices: ['low', 'medium', 'high'], fallback: 'low', group: 'Pictures', label: 'Picture quality', help: 'low is the cheapest (about 1.1 cents a picture on gpt-image-1); high costs about 15 times more.' },
  image_cost_usd: { type: 'decimal', min: 0, max: 5, fallback: 0, group: 'Pictures', label: 'Picture price override (USD)', help: 'Price per picture used for the cost report. 0 = use the built-in price list (only known for gpt-image-1). Set this when you switch to a new model.' },
  ai_monthly_limit: { type: 'int', min: 1, max: 100000, fallback: 100, group: 'Limits & safeguards', label: 'AI actions per account per month', help: 'Cost safeguard that applies to every account, including paying and exempt ones.' },
  story_requests_per_15min: { type: 'int', min: 1, max: 1000, fallback: 30, group: 'Limits & safeguards', label: 'Story requests per 15 minutes (whole site)', help: 'Abuse protection: how many story-generation requests the site accepts in any 15-minute window.' },
  roster_import_max: { type: 'int', min: 1, max: 1000, fallback: 100, group: 'Limits & safeguards', label: 'Classroom CSV import: max learners', help: 'Largest number of learners one CSV roster import can add.' },
};

export function validateSetting(key, raw) {
  const def = SETTING_DEFS[key];
  if (!def) return { ok: false, error: `Unknown setting: ${key}` };
  if (def.type === 'int') {
    const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
    if (!Number.isInteger(n) || n < def.min || n > def.max) return { ok: false, error: `${def.label} must be a whole number from ${def.min} to ${def.max}.` };
    return { ok: true, value: n };
  }
  if (def.type === 'text') {
    const v = String(raw ?? '').trim().toLowerCase();
    if (!def.pattern.test(v)) return { ok: false, error: `${def.label} must be ${def.patternHelp}.` };
    return { ok: true, value: v };
  }
  if (def.type === 'decimal') {
    const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
    if (!Number.isFinite(n) || n < def.min || n > def.max) return { ok: false, error: `${def.label} must be a number from ${def.min} to ${def.max}.` };
    return { ok: true, value: Math.round(n * 1e6) / 1e6 };
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

export function createSettingsStore(pool, { fallbacks = {}, fileDefaults = {} } = {}) {
  const cache = new Map(); // key -> value saved in the database
  const fileValues = new Map(); // key -> value from config/settings.json
  for (const [key, raw] of Object.entries(fileDefaults || {})) {
    if (key.startsWith('_')) continue; // _comment and similar
    const check = validateSetting(key, raw);
    if (check.ok) fileValues.set(key, check.value);
    else console.warn(`config/settings.json: ignoring ${key}: ${check.ok === false ? check.error : 'invalid'}`);
  }
  const meta = new Map();  // key -> { updatedAt, updatedBy }
  let timer = null;

  const baseFallback = key => (Object.prototype.hasOwnProperty.call(fallbacks, key) ? fallbacks[key] : SETTING_DEFS[key].fallback);
  // the value in effect when the database has nothing: the config file, else the built-in default
  const fallbackFor = key => (fileValues.has(key) ? fileValues.get(key) : baseFallback(key));

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
      source: cache.has(key) ? 'database' : fileValues.has(key) ? 'file' : 'default',
      builtIn: baseFallback(key),
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

  // Writes the readable catalog (table app_settings_catalog, shown through the settings_overview view)
  // so every setting, its description, default and config-file value can be read with plain SQL.
  async function syncCatalog() {
    for (const [key, def] of Object.entries(SETTING_DEFS)) {
      await pool.query(
        `INSERT INTO app_settings_catalog (key, group_name, label, help, type, choices, min_value, max_value, default_value, file_value, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET group_name = EXCLUDED.group_name, label = EXCLUDED.label, help = EXCLUDED.help, type = EXCLUDED.type,
           choices = EXCLUDED.choices, min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value,
           default_value = EXCLUDED.default_value, file_value = EXCLUDED.file_value, synced_at = NOW()`,
        [key, def.group, def.label, def.help, def.type, def.choices ? JSON.stringify(def.choices) : null, def.min ?? null, def.max ?? null,
          JSON.stringify(baseFallback(key)), fileValues.has(key) ? JSON.stringify(fileValues.get(key)) : null],
      );
    }
    await pool.query('DELETE FROM app_settings_catalog WHERE NOT (key = ANY($1::text[]))', [Object.keys(SETTING_DEFS)]);
  }

  function startRefresh(ms = 30000) {
    if (timer) return;
    timer = setInterval(() => { load().catch(error => console.warn('app_settings refresh failed:', error.message)); }, ms);
    timer.unref?.();
  }

  return { load, get, all, setMany, syncCatalog, startRefresh };
}
