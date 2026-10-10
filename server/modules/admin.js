// Owner-only admin API (mounted at /api/admin). Reporting for the whole site, customer list,
// database-backed settings and an audit log.
//
// Security model:
//  - every route requires a signed-in, email-verified adult account whose email equals OWNER_EMAIL;
//    anyone else gets 404 (not 403), so the area does not advertise itself
//  - changes also require the owner to re-enter their password, and every change is written to admin_audit_log
//  - reports show counts and account emails only: never children's names, story text, or passwords
import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { SETTING_DEFS } from './settings.js';

const DAY = 24 * 60 * 60 * 1000;

export function createAdminRouter({ pool, bcrypt, settingsStore, ownerEmail, requireAuth, requireAdultAccount, isPricingComingSoon, systemInfo = () => ({}) }) {
  const router = express.Router();
  const notFound = res => res.status(404).json({ error: 'Not found.' });

  router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.use(requireAuth, requireAdultAccount);
  router.use(async (req, res, next) => {
    try {
      if (!ownerEmail) return notFound(res);
      const { rows } = await pool.query('SELECT email, email_verified_at FROM accounts WHERE id = $1', [req.auth.sub]);
      const row = rows[0];
      if (!row || !row.email_verified_at || String(row.email).toLowerCase() !== ownerEmail) return notFound(res);
      req.owner = { id: req.auth.sub, email: String(row.email).toLowerCase() };
      return next();
    } catch (error) { return next(error); }
  });
  const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

  async function audit(owner, action, target, detail) {
    try {
      await pool.query('INSERT INTO admin_audit_log (id, actor_email, action, target, detail) VALUES ($1, $2, $3, $4, $5)', [randomUUID(), owner.email, action, target || null, JSON.stringify(detail || {})]);
    } catch (error) { console.warn('admin audit write failed:', error.message); }
  }

  async function passwordOk(owner, password) {
    if (typeof password !== 'string' || !password) return false;
    const { rows } = await pool.query('SELECT password_hash FROM accounts WHERE id = $1', [owner.id]);
    if (!rows[0]) return false;
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) await audit(owner, 'password_check_failed', null, {});
    return ok;
  }

  // A report section must never take the page down: failures become null + a console warning.
  async function safe(label, fn) {
    try { return await fn(); } catch (error) { console.warn(`admin report "${label}" failed:`, error.message); return null; }
  }

  const rules = () => ({
    days: settingsStore.get('free_period_days'),
    exempt: new Set([ownerEmail, ...settingsStore.get('plan_exempt_emails')]),
  });

  const ACCOUNT_BASE = `
    SELECT a.id, a.email, a.display_name, a."role", a.created_at, a.email_verified_at, a.free_started_at, s.plan, s.status
    FROM accounts a
    LEFT JOIN LATERAL (SELECT plan, status FROM subscriptions WHERE account_id = a.id ORDER BY updated_at DESC LIMIT 1) s ON TRUE`;

  function accountState(row, r, now = Date.now()) {
    const plan = row.plan || 'explorer';
    const exempt = r.exempt.has(String(row.email).toLowerCase());
    const paid = plan !== 'explorer' && row.status === 'active';
    const endsAt = new Date(new Date(row.free_started_at).getTime() + r.days * DAY);
    const freeActive = now < endsAt.getTime();
    let label = 'Free ended';
    if (exempt) label = 'Never limited';
    else if (paid) label = `Paid: ${plan}`;
    else if (plan !== 'explorer' && row.status === 'demo') label = freeActive ? 'Free (demo plan)' : 'Free ended (demo plan)';
    else if (freeActive) label = `Free: ${Math.max(1, Math.ceil((endsAt.getTime() - now) / DAY))}d left`;
    return { plan, planStatus: row.status || 'none', exempt, paid, freeEndsAt: endsAt.toISOString(), freeActive, label };
  }

  // ------------------------------------------------------------------ overview
  router.get('/overview', async (req, res, next) => {
    try {
      const days = Math.min(90, Math.max(7, Number.parseInt(req.query.days, 10) || 30));
      const r = rules();
      const q = (text, params = []) => pool.query(text, params).then(result => result.rows);

      const [accounts, learners, stories, ai, assessments, reading, signups, storiesDaily, aiDaily, readingDaily, weekly, funnel, plans, ageBands, readingLevels, themes, domains, sources, growth, safety, opsBySeverity, recentOps, webhooks, housekeeping, models] = await Promise.all([
        safe('accounts', () => q(`
          WITH acct AS (${ACCOUNT_BASE})
          SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL)::int AS verified,
            COUNT(*) FILTER (WHERE "role" = 'parent')::int AS parents,
            COUNT(*) FILTER (WHERE "role" = 'teacher')::int AS teachers,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS new1,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new7,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new30,
            COUNT(*) FILTER (WHERE COALESCE(plan, 'explorer') <> 'explorer' AND status = 'active')::int AS paid_active,
            COUNT(*) FILTER (WHERE COALESCE(plan, 'explorer') <> 'explorer' AND status = 'demo')::int AS demo_paid,
            COUNT(*) FILTER (WHERE NOT (COALESCE(plan, 'explorer') <> 'explorer' AND status = 'active') AND free_started_at + ($1 * INTERVAL '1 day') > NOW())::int AS free_active,
            COUNT(*) FILTER (WHERE NOT (COALESCE(plan, 'explorer') <> 'explorer' AND status = 'active') AND free_started_at + ($1 * INTERVAL '1 day') > NOW() AND free_started_at + ($1 * INTERVAL '1 day') <= NOW() + INTERVAL '3 days')::int AS free_ending3,
            COUNT(*) FILTER (WHERE NOT (COALESCE(plan, 'explorer') <> 'explorer' AND status = 'active') AND free_started_at + ($1 * INTERVAL '1 day') <= NOW())::int AS free_expired
          FROM acct`, [r.days]).then(rows => rows[0])),
        safe('learners', () => q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE child_username IS NOT NULL)::int AS with_child_login, COUNT(DISTINCT account_id)::int AS families FROM learners`).then(rows => rows[0])),
        safe('stories', () => q(`
          SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
            COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted,
            COUNT(*) FILTER (WHERE deleted_at IS NULL AND completed_at IS NOT NULL)::int AS completed,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS new1,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new7,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new30,
            COUNT(*) FILTER (WHERE shared_from_story_id IS NOT NULL)::int AS sibling_copies
          FROM stories`).then(rows => rows[0])),
        safe('ai', () => q(`
          SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS month_calls,
            COALESCE(SUM(estimated_cost_usd) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::float AS month_cost,
            COALESCE(SUM(estimated_cost_usd), 0)::float AS total_cost,
            COALESCE(SUM(input_tokens) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::bigint AS month_input_tokens,
            COALESCE(SUM(output_tokens) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::bigint AS month_output_tokens,
            COUNT(DISTINCT account_id) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS month_accounts
          FROM ai_invocations`).then(rows => rows[0])),
        safe('assessments', () => q(`SELECT COUNT(*)::int AS total, COALESCE(AVG(score), 0)::float AS avg_score, COUNT(*) FILTER (WHERE mastered)::int AS mastered, COUNT(*) FILTER (WHERE review_status = 'pending')::int AS pending_review FROM reading_assessments`).then(rows => rows[0])),
        safe('reading', () => q(`SELECT COUNT(*)::int AS sessions, COALESCE(SUM(active_seconds), 0)::bigint AS seconds, COUNT(DISTINCT account_id)::int AS accounts FROM reading_sessions`).then(rows => rows[0])),
        safe('signups daily', () => q(`SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS n FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day') d LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n FROM accounts GROUP BY 1) c ON c.day = d::date ORDER BY 1`, [days])),
        safe('stories daily', () => q(`SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS n FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day') d LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n FROM stories WHERE shared_from_story_id IS NULL GROUP BY 1) c ON c.day = d::date ORDER BY 1`, [days])),
        safe('ai daily', () => q(`SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS n, COALESCE(c.cost, 0)::float AS cost FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day') d LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n, SUM(estimated_cost_usd) AS cost FROM ai_invocations GROUP BY 1) c ON c.day = d::date ORDER BY 1`, [days])),
        safe('reading daily', () => q(`SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(c.minutes, 0)::float AS n FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day') d LEFT JOIN (SELECT created_at::date AS day, SUM(active_seconds) / 60.0 AS minutes FROM reading_sessions GROUP BY 1) c ON c.day = d::date ORDER BY 1`, [days])),
        safe('weekly active', () => q(`
          WITH activity AS (
            SELECT l.account_id AS account_id, s.created_at AS at FROM stories s JOIN learners l ON l.id = s.learner_id
            UNION ALL SELECT account_id, updated_at FROM reading_sessions)
          SELECT to_char(w::date, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS n
          FROM generate_series(date_trunc('week', NOW()) - INTERVAL '7 weeks', date_trunc('week', NOW()), '1 week') w
          LEFT JOIN (SELECT date_trunc('week', at) AS wk, COUNT(DISTINCT account_id) AS n FROM activity GROUP BY 1) c ON c.wk = w
          ORDER BY 1`)),
        safe('funnel', () => q(`
          SELECT (SELECT COUNT(*) FROM accounts)::int AS registered,
            (SELECT COUNT(*) FROM accounts WHERE email_verified_at IS NOT NULL)::int AS verified,
            (SELECT COUNT(DISTINCT account_id) FROM learners)::int AS added_learner,
            (SELECT COUNT(DISTINCT l.account_id) FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.shared_from_story_id IS NULL)::int AS created_story,
            (SELECT COUNT(DISTINCT l.account_id) FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.completed_at IS NOT NULL)::int AS finished_story,
            (SELECT COUNT(DISTINCT account_id) FROM subscriptions WHERE plan <> 'explorer' AND status = 'active')::int AS paid`).then(rows => rows[0])),
        safe('plans', () => q(`WITH acct AS (${ACCOUNT_BASE}) SELECT COALESCE(plan, 'explorer') AS plan, COALESCE(status, 'none') AS status, COUNT(*)::int AS n FROM acct GROUP BY 1, 2 ORDER BY n DESC`)),
        safe('age bands', () => q(`SELECT age_band AS label, COUNT(*)::int AS n FROM learners GROUP BY 1 ORDER BY 1`)),
        safe('reading levels', () => q(`SELECT COALESCE(reading_level, 'unset') AS label, COUNT(*)::int AS n FROM learners GROUP BY 1 ORDER BY n DESC`)),
        safe('themes', () => q(`SELECT theme AS label, COUNT(*)::int AS n FROM stories WHERE deleted_at IS NULL GROUP BY 1 ORDER BY n DESC LIMIT 10`)),
        safe('domains', () => q(`SELECT ct.domain AS label, COUNT(*)::int AS n FROM story_curriculum sc JOIN curriculum_tracks ct ON ct.id = sc.curriculum_id GROUP BY 1 ORDER BY n DESC`)),
        safe('sources', () => q(`SELECT created_by AS label, COUNT(*)::int AS n FROM stories WHERE deleted_at IS NULL GROUP BY 1 ORDER BY n DESC`)),
        safe('growth', () => q(`SELECT event_name AS label, COUNT(*)::int AS n FROM growth_events WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day') GROUP BY 1 ORDER BY n DESC LIMIT 12`, [days])),
        safe('safety', () => q(`SELECT event_type AS label, COUNT(*)::int AS n FROM ai_safety_events WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day') GROUP BY 1 ORDER BY n DESC`, [days])),
        safe('ops by severity', () => q(`SELECT severity AS label, COUNT(*)::int AS n FROM ops_events WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY n DESC`)),
        safe('recent ops', () => q(`SELECT event_type, severity, LEFT(message, 200) AS message, created_at FROM ops_events WHERE severity IN ('warn', 'error') ORDER BY created_at DESC LIMIT 10`)),
        safe('webhooks', () => q(`SELECT status AS label, COUNT(*)::int AS n FROM stripe_webhook_events WHERE received_at >= NOW() - INTERVAL '30 days' GROUP BY 1`)),
        safe('housekeeping', () => q(`
          SELECT (SELECT COUNT(*) FROM accounts WHERE email_verified_at IS NULL AND created_at < NOW() - INTERVAL '1 day')::int AS unverified_over_1d,
            (SELECT COUNT(*) FROM password_reset_tokens WHERE created_at >= NOW() - INTERVAL '30 days')::int AS password_resets_30d,
            (SELECT COUNT(*) FROM account_deletion_tokens WHERE created_at >= NOW() - INTERVAL '30 days')::int AS deletion_requests_30d,
            (SELECT COUNT(*) FROM subscription_cancellation_tokens WHERE created_at >= NOW() - INTERVAL '30 days')::int AS cancellation_requests_30d,
            (SELECT COUNT(*) FROM classroom_imports)::int AS classroom_imports,
            (SELECT COUNT(*) FROM story_preferences WHERE is_favorite)::int AS favorites,
            (SELECT COALESCE(AVG(rating), 0) FROM story_preferences WHERE rating IS NOT NULL)::float AS avg_rating,
            (SELECT COUNT(*) FROM accounts a WHERE NOT EXISTS (SELECT 1 FROM learners l WHERE l.account_id = a.id))::int AS accounts_without_learner,
            (SELECT COUNT(*) FROM accounts WHERE ai_external_opt_in = FALSE)::int AS ai_not_enabled`).then(rows => rows[0])),
        safe('models', () => q(`SELECT COALESCE(model, 'unknown') AS label, COUNT(*)::int AS n, COALESCE(SUM(estimated_cost_usd), 0)::float AS cost, COUNT(*) FILTER (WHERE estimated_cost_usd IS NULL)::int AS unpriced FROM ai_invocations WHERE created_at >= date_trunc('month', NOW()) GROUP BY 1 ORDER BY n DESC`)),
      ]);

      const exemptTotal = await safe('exempt', async () => {
        const list = [...r.exempt];
        if (!list.length) return 0;
        const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM accounts WHERE lower(email) = ANY($1::text[])', [list]);
        return rows[0].n;
      });

      return res.json({
        generatedAt: new Date().toISOString(),
        days,
        rules: { freePeriodDays: r.days, freeStoryLimit: settingsStore.get('free_story_limit'), freeLearnerLimit: settingsStore.get('free_learner_limit') },
        accounts: accounts && { ...accounts, exempt: exemptTotal },
        learners, stories, ai, assessments, reading,
        series: { signups, stories: storiesDaily, aiCalls: aiDaily, readingMinutes: readingDaily, weeklyActive: weekly },
        funnel, plans, ageBands, readingLevels, themes, domains, sources, growth, safety, opsBySeverity, recentOps, webhooks, housekeeping, models,
        system: await safe('system', async () => {
          const size = await pool.query('SELECT pg_database_size(current_database())::bigint AS bytes');
          const migrations = await pool.query('SELECT COUNT(*)::int AS n, MAX(applied_at) AS latest FROM schema_migrations');
          return { ...systemInfo(), pricingComingSoon: isPricingComingSoon(), dbBytes: Number(size.rows[0].bytes), migrations: migrations.rows[0] };
        }),
      });
    } catch (error) { return next(error); }
  });

  // ------------------------------------------------------------------ customers
  const SORTS = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
    email: 'lower(email) ASC',
    stories: 'stories DESC, created_at DESC',
    learners: 'learners DESC, created_at DESC',
    active: 'last_active DESC NULLS LAST',
    ending: 'free_started_at ASC',
  };
  async function customerRows({ search, sort, limit, offset }) {
    const like = `%${search.replace(/[\\%_]/g, match => `\\${match}`)}%`;
    const { rows } = await pool.query(`
      WITH base AS (${ACCOUNT_BASE})
      SELECT b.*,
        (SELECT COUNT(*)::int FROM learners l WHERE l.account_id = b.id) AS learners,
        (SELECT COUNT(*)::int FROM stories st JOIN learners l ON l.id = st.learner_id WHERE l.account_id = b.id AND st.deleted_at IS NULL) AS stories,
        (SELECT COUNT(*)::int FROM stories st JOIN learners l ON l.id = st.learner_id WHERE l.account_id = b.id AND st.shared_from_story_id IS NULL AND st.created_at >= b.free_started_at) AS stories_in_free_period,
        (SELECT MAX(x) FROM (SELECT MAX(st.created_at) AS x FROM stories st JOIN learners l ON l.id = st.learner_id WHERE l.account_id = b.id UNION ALL SELECT MAX(rs.updated_at) FROM reading_sessions rs WHERE rs.account_id = b.id) t) AS last_active,
        (SELECT COUNT(*)::int FROM ai_invocations ai WHERE ai.account_id = b.id AND ai.created_at >= date_trunc('month', NOW())) AS ai_this_month
      FROM base b
      WHERE ($1 = '' OR b.email ILIKE $2 OR b.display_name ILIKE $2)
      ORDER BY ${SORTS[sort] || SORTS.newest}
      LIMIT $3 OFFSET $4`, [search, like, limit, offset]);
    return rows;
  }
  const shapeCustomer = (row, r) => ({
    id: row.id, email: row.email, name: row.display_name, role: row.role,
    createdAt: row.created_at, verified: Boolean(row.email_verified_at),
    freeStartedAt: row.free_started_at, learners: row.learners, stories: row.stories,
    storiesInFreePeriod: row.stories_in_free_period, lastActive: row.last_active, aiThisMonth: row.ai_this_month,
    ...accountState(row, r),
  });

  router.get('/customers', async (req, res, next) => {
    try {
      const search = String(req.query.q || '').trim().slice(0, 80);
      const sort = SORTS[req.query.sort] ? req.query.sort : 'newest';
      const pageSize = 25;
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const r = rules();
      const like = `%${search.replace(/[\\%_]/g, match => `\\${match}`)}%`;
      const [rows, count] = await Promise.all([
        customerRows({ search, sort, limit: pageSize, offset: (page - 1) * pageSize }),
        pool.query("SELECT COUNT(*)::int AS n FROM accounts WHERE ($1 = '' OR email ILIKE $2 OR display_name ILIKE $2)", [search, like]),
      ]);
      return res.json({ page, pageSize, total: count.rows[0].n, sort, customers: rows.map(row => shapeCustomer(row, r)) });
    } catch (error) { return next(error); }
  });

  router.get('/export/customers.csv', async (req, res, next) => {
    try {
      const r = rules();
      const rows = (await customerRows({ search: '', sort: 'newest', limit: 5000, offset: 0 })).map(row => shapeCustomer(row, r));
      const cell = value => {
        let text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // stop spreadsheet formula injection
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      const header = ['email', 'name', 'role', 'created_at', 'verified', 'status', 'plan', 'plan_status', 'free_ends_at', 'learners', 'stories', 'stories_in_free_period', 'last_active', 'ai_this_month'];
      const lines = [header.join(',')].concat(rows.map(c => [c.email, c.name, c.role, c.createdAt, c.verified, c.label, c.plan, c.planStatus, c.freeEndsAt, c.learners, c.stories, c.storiesInFreePeriod, c.lastActive, c.aiThisMonth].map(cell).join(',')));
      await audit(req.owner, 'export_customers', null, { rows: rows.length });
      res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="customers.csv"').set('Cache-Control', 'no-store');
      return res.send(lines.join('\n'));
    } catch (error) { return next(error); }
  });

  // Give an account N more free days from today (also restarts the free-story count).
  router.post('/customers/:id/free-days', writeLimiter, express.json({ limit: '4kb' }), async (req, res, next) => {
    try {
      const days = Number(req.body?.days);
      if (!Number.isInteger(days) || days < 1 || days > 90) return res.status(400).json({ error: 'Days must be a whole number from 1 to 90.' });
      if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return notFound(res);
      if (!(await passwordOk(req.owner, req.body?.currentPassword))) return res.status(401).json({ error: 'Password is incorrect.' });
      const freeDays = settingsStore.get('free_period_days');
      const { rows } = await pool.query('SELECT email, free_started_at FROM accounts WHERE id = $1', [req.params.id]);
      if (!rows[0]) return notFound(res);
      const currentEnd = new Date(rows[0].free_started_at).getTime() + freeDays * DAY;
      const newEnd = Math.max(currentEnd, Date.now()) + days * DAY;
      const newStart = new Date(newEnd - freeDays * DAY);
      await pool.query('UPDATE accounts SET free_started_at = $2, updated_at = NOW() WHERE id = $1', [req.params.id, newStart]);
      await audit(req.owner, 'give_free_days', rows[0].email, { days, newFreeEnd: new Date(newEnd).toISOString() });
      return res.json({ ok: true, freeEndsAt: new Date(newEnd).toISOString() });
    } catch (error) { return next(error); }
  });

  // ------------------------------------------------------------------ settings
  router.get('/settings', (req, res) => res.json({ settings: settingsStore.all(), ownerEmail, pricingComingSoonNow: isPricingComingSoon() }));

  router.put('/settings', writeLimiter, express.json({ limit: '16kb' }), async (req, res, next) => {
    try {
      const changes = req.body?.changes;
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return res.status(400).json({ error: 'Nothing to change.' });
      for (const key of Object.keys(changes)) if (!SETTING_DEFS[key]) return res.status(400).json({ error: `Unknown setting: ${key}` });
      if (!(await passwordOk(req.owner, req.body?.currentPassword))) return res.status(401).json({ error: 'Password is incorrect.' });
      const before = Object.fromEntries(Object.keys(changes).map(key => [key, settingsStore.get(key)]));
      const result = await settingsStore.setMany(changes, req.owner.email);
      if (!result.ok) return res.status(400).json({ error: result.error });
      const after = Object.fromEntries(result.changed.map(key => [key, settingsStore.get(key)]));
      await audit(req.owner, 'change_settings', null, { before, after });
      return res.json({ ok: true, settings: settingsStore.all(), pricingComingSoonNow: isPricingComingSoon() });
    } catch (error) { return next(error); }
  });

  // ------------------------------------------------------------------ story library (review before families see anything)
  const LIBRARY_STATUSES = ['draft', 'approved', 'rejected'];

  router.get('/library/summary', async (req, res, next) => {
    try {
      const [counts, byGrade, run] = await Promise.all([
        pool.query("SELECT status, COUNT(*)::int AS n, COALESCE(SUM(cost_usd), 0)::float AS cost FROM library_stories GROUP BY status"),
        pool.query("SELECT grade_level AS label, COUNT(*)::int AS n FROM library_stories GROUP BY 1 ORDER BY 1"),
        pool.query('SELECT started_at, finished_at, requested, created, failed, skipped, cost_usd::float AS cost_usd, budget_usd::float AS budget_usd, image_model, image_style, note FROM library_build_runs ORDER BY started_at DESC LIMIT 1'),
      ]);
      const by = Object.fromEntries(counts.rows.map(r => [r.status, r]));
      return res.json({
        draft: by.draft?.n || 0, approved: by.approved?.n || 0, rejected: by.rejected?.n || 0,
        totalCost: counts.rows.reduce((sum, r) => sum + r.cost, 0), byGrade: byGrade.rows, lastRun: run.rows[0] || null,
      });
    } catch (error) { return next(error); }
  });

  router.get('/library', async (req, res, next) => {
    try {
      const status = LIBRARY_STATUSES.includes(req.query.status) ? req.query.status : null;
      const pageSize = 50;
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const [rows, count] = await Promise.all([
        pool.query(`SELECT id, slug, title, grade_level, domain, theme, story_length, status, cost_usd::float AS cost_usd, (assets->>'cover') IS NOT NULL AS has_cover,
                           jsonb_array_length(COALESCE(assets->'pages', '[]'::jsonb)) AS audio_pages, checks->>'attempts' AS attempts, created_at
                    FROM library_stories WHERE ($1::text IS NULL OR status = $1) ORDER BY slug LIMIT $2 OFFSET $3`, [status, pageSize, (page - 1) * pageSize]),
        pool.query('SELECT COUNT(*)::int AS n FROM library_stories WHERE ($1::text IS NULL OR status = $1)', [status]),
      ]);
      return res.json({ page, pageSize, total: count.rows[0].n, stories: rows.rows });
    } catch (error) { return next(error); }
  });

  router.get('/library/:id', async (req, res, next) => {
    try {
      if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return notFound(res);
      const { rows } = await pool.query('SELECT id, slug, title, grade_level, age_band, domain, theme, story_length, status, content, assets, checks, cost_usd::float AS cost_usd, curriculum_standard, curriculum_objective, review_note, reviewed_by, reviewed_at, created_at FROM library_stories WHERE id = $1', [req.params.id]);
      if (!rows[0]) return notFound(res);
      return res.json({ story: rows[0] });
    } catch (error) { return next(error); }
  });

  // Approve, reject or return to draft, one story or many at once. Needs the owner's password.
  router.post('/library/review', writeLimiter, express.json({ limit: '16kb' }), async (req, res, next) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200) : [];
      const decision = { approve: 'approved', reject: 'rejected', draft: 'draft' }[req.body?.decision];
      const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
      if (!ids.length || !decision) return res.status(400).json({ error: 'Choose at least one story and a decision.' });
      if (!(await passwordOk(req.owner, req.body?.currentPassword))) return res.status(401).json({ error: 'Password is incorrect.' });
      const result = await pool.query(
        `UPDATE library_stories SET status = $2, review_note = NULLIF($3, ''), reviewed_by = $4, reviewed_at = NOW() WHERE id = ANY($1::uuid[]) RETURNING id`,
        [ids, decision, note, req.owner.email]);
      await audit(req.owner, `library_${req.body.decision}`, `${result.rowCount} stories`, { ids: result.rows.map(r => r.id).slice(0, 50), note });
      return res.json({ ok: true, updated: result.rowCount });
    } catch (error) { return next(error); }
  });

  // ------------------------------------------------------------------ audit log
  router.get('/audit', async (req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT created_at, actor_email, action, target, detail FROM admin_audit_log ORDER BY created_at DESC LIMIT 200');
      return res.json({ entries: rows });
    } catch (error) { return next(error); }
  });

  return router;
}
