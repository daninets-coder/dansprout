import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import Stripe from 'stripe';
import { z } from 'zod';
import { pool } from './db.js';

const app = express();
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
const trustProxy = String(process.env.TRUST_PROXY || '').trim();
if (trustProxy) app.set('trust proxy', trustProxy === 'true' ? true : trustProxy);

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || process.env.APP_BASE_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (!allowedOrigins.length) {
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }
  return allowedOrigins.includes(normalizeOrigin(origin));
}

async function ensureBaseSchema() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  await pool.query('UPDATE accounts SET ai_external_opt_in = TRUE, ai_opt_in_at = COALESCE(ai_opt_in_at, consented_at) WHERE ai_external_opt_in = FALSE');
}

const priceConfig = {
  family_500: { cents: 500, trialDays: 0, lookupEnv: 'STRIPE_PRICE_FAMILY_500' },
  family_800: { cents: 800, trialDays: 7, lookupEnv: 'STRIPE_PRICE_FAMILY_800' },
  family_1200: { cents: 1200, trialDays: 14, lookupEnv: 'STRIPE_PRICE_FAMILY_1200' },
  classroom_1800: { cents: 1800, trialDays: 14, lookupEnv: 'STRIPE_PRICE_CLASSROOM_1800' },
};

pool.on('error', (err) => {
  console.error('Pool error:', err.message);
});

app.use(helmet({
  contentSecurityPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));
app.use(cors({
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error('CORS origin not allowed.'));
  },
}));
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !stripeWebhookSecret) return res.status(501).json({ error: 'Stripe is not configured.' });
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe signature.' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    const object = event.data?.object;
    if (event.type === 'checkout.session.completed') {
      const accountId = object?.metadata?.accountId;
      if (accountId) {
        await upsertSubscriptionFromStripe({
          accountId,
          plan: object?.metadata?.plan || 'family',
          status: 'active',
          customerId: object?.customer || null,
          subscriptionId: object?.subscription || null,
        });
        await trackGrowthEvent(accountId, 'plan_selected', { plan: object?.metadata?.plan || 'family', status: 'active', source: 'stripe_checkout' });
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = object;
      const customerId = subscription?.customer;
      if (customerId) {
        const accountRes = await pool.query('SELECT id FROM accounts WHERE id = (SELECT account_id FROM subscriptions WHERE provider_customer_id = $1 ORDER BY updated_at DESC LIMIT 1)', [String(customerId)]);
        const accountId = accountRes.rows?.[0]?.id;
        if (accountId) {
          const active = ['active', 'trialing', 'past_due'].includes(subscription?.status);
          await upsertSubscriptionFromStripe({
            accountId,
            plan: subscription?.metadata?.plan || 'family',
            status: active ? 'active' : 'canceled',
            customerId: String(customerId),
            subscriptionId: subscription?.id || null,
          });
        }
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler error:', error.message);
    return res.status(500).json({ error: 'Webhook handler failed.' });
  }
});
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
const storyGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.STORY_GEN_RATE_LIMIT || 30),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many story requests. Please try again shortly.' },
});
app.use('/api/stories/generate', storyGenerationLimiter);

const registerSchema = z.object({
  email: z.string().email().max(120).transform(value => value.trim().toLowerCase()),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(60),
  role: z.enum(['parent', 'teacher']).default('parent'),
  guardianConsent: z.literal(true),
  aiExternalConsent: z.literal(true),
  policyVersion: z.string().trim().min(1).max(40).default('2026-09-01'),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const learnerSchema = z.object({ firstName: z.string().trim().min(1).max(32), ageBand: z.enum(['3-5', '6-8', '9-11']), interests: z.string().trim().max(160).default(''), topicsToAvoid: z.string().trim().max(160).default(''), goals: z.array(z.string().trim().min(1).max(40)).max(8).default([]) });
const planSchema = z.object({ plan: z.enum(['explorer', 'family', 'classroom']) });
const storySchema = z.object({
  learnerId: z.string().uuid(),
  title: z.string().trim().min(1).max(140),
  theme: z.enum(['Moonlight', 'Rainforest', 'Ocean', 'Castle']),
  learningGoal: z.enum(['Kindness', 'Bravery', 'Big feelings', 'Curiosity', 'Early literacy']),
  prompt: z.string().trim().min(1).max(300),
  content: z.object({
    pages: z.array(z.string().trim().min(1).max(2000)).min(1).max(24),
    questions: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
    words: z.array(z.object({ word: z.string().trim().min(1).max(80), meaning: z.string().trim().min(1).max(300) })).max(12).default([]),
  }),
});
const storyLanguageSchema = z.literal('English');

function tokenFor(account) { return jwt.sign({ sub: account.id, role: account.role }, jwtSecret, { expiresIn: '8h', issuer: 'story-sprout' }); }
function requireAuth(req, res, next) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: 'Authentication required.' }); try { req.auth = jwt.verify(token, jwtSecret, { issuer: 'story-sprout' }); return next(); } catch { return res.status(401).json({ error: 'Session expired. Please sign in again.' }); } }
function validate(schema, source) { return (req, res, next) => { const result = schema.safeParse(req[source]); if (!result.success) return res.status(400).json({ error: 'Please check the submitted information.', details: result.error.flatten() }); req[source] = result.data; return next(); }; }

app.post('/api/auth/register', validate(registerSchema, 'body'), async (req, res, next) => { try { const account = { id: randomUUID(), ...req.body }; const variant = pickPricingVariant(); const variantConfig = priceConfig[variant] || priceConfig.family_800; const passwordHash = await bcrypt.hash(account.password, 12); await pool.query('INSERT INTO accounts (id, email, password_hash, display_name, "role", consented_at, ai_external_opt_in, ai_opt_in_at, privacy_policy_version, guardian_consent_version, pricing_variant, family_price_cents, trial_days) VALUES ($1, $2, $3, $4, $5, NOW(), TRUE, NOW(), $6, $7, $8, $9, $10)', [account.id, account.email, passwordHash, account.displayName, account.role, account.policyVersion, account.policyVersion, variant, variantConfig.cents, variantConfig.trialDays]); await pool.query('INSERT INTO reminder_preferences (account_id, weekly_email_enabled) VALUES ($1, $2) ON CONFLICT (account_id) DO UPDATE SET weekly_email_enabled = EXCLUDED.weekly_email_enabled, updated_at = NOW()', [account.id, false]); await logConsentEvent(account.id, 'register_consent', account.policyVersion, { role: account.role, externalAi: true }); await trackGrowthEvent(account.id, 'account_registered', { role: account.role, variant }); return res.status(201).json({ token: tokenFor(account), account: { id: account.id, email: account.email, displayName: account.displayName, role: account.role } }); } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'An account already exists for this email.' }); return next(error); } });
app.post('/api/auth/login', validate(loginSchema, 'body'), async (req, res, next) => { try { const { rows } = await pool.query('SELECT id, email, password_hash, display_name, "role" FROM accounts WHERE email = $1', [req.body.email.trim().toLowerCase()]); const account = rows[0]; if (!account || !(await bcrypt.compare(req.body.password, account.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' }); await trackGrowthEvent(account.id, 'account_login'); return res.json({ token: tokenFor(account), account: { id: account.id, email: account.email, displayName: account.display_name, role: account.role } }); } catch (error) { return next(error); } });
app.get('/api/me', requireAuth, async (req, res, next) => { try { const { rows } = await pool.query('SELECT id, email, display_name, "role", created_at, ai_external_opt_in, ai_opt_in_at, privacy_policy_version, pricing_variant, family_price_cents, trial_days FROM accounts WHERE id = $1', [req.auth.sub]); if (!rows[0]) return res.status(404).json({ error: 'Account not found.' }); return res.json({ account: rows[0] }); } catch (error) { return next(error); } });
app.get('/api/learners', requireAuth, async (req, res, next) => { try { const { rows } = await pool.query(`SELECT l.id, l.first_name, l.age_band, l.interests, l.topics_to_avoid, l.created_at, COALESCE(json_agg(g.goal) FILTER (WHERE g.goal IS NOT NULL), '[]') AS goals FROM learners l LEFT JOIN learner_goals g ON g.learner_id = l.id WHERE l.account_id = $1 GROUP BY l.id ORDER BY l.created_at`, [req.auth.sub]); return res.json({ learners: rows }); } catch (error) { return next(error); } });
app.post('/api/learners', requireAuth, validate(learnerSchema, 'body'), async (req, res, next) => { const client = await pool.connect(); try { await client.query('BEGIN'); const learnerId = randomUUID(); await client.query('INSERT INTO learners (id, account_id, first_name, age_band, interests, topics_to_avoid) VALUES ($1, $2, $3, $4, $5, $6)', [learnerId, req.auth.sub, req.body.firstName, req.body.ageBand, req.body.interests, req.body.topicsToAvoid]); for (const goal of req.body.goals) await client.query('INSERT INTO learner_goals (learner_id, goal) VALUES ($1, $2)', [learnerId, goal]); await client.query('COMMIT'); await trackGrowthEvent(req.auth.sub, 'learner_created', { learnerId, ageBand: req.body.ageBand }); return res.status(201).json({ learner: { id: learnerId, ...req.body } }); } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); } });
app.delete('/api/learners/:learnerId', requireAuth, async (req, res, next) => { try { const result = await pool.query('DELETE FROM learners WHERE id = $1 AND account_id = $2', [req.params.learnerId, req.auth.sub]); if (!result.rowCount) return res.status(404).json({ error: 'Learner not found.' }); return res.status(204).end(); } catch (error) { return next(error); } });
app.get('/api/stories', requireAuth, async (req, res, next) => { try { const { rows } = await pool.query(`SELECT s.id, s.title, s.theme, s.learning_goal, s.prompt, s.content, s.completed_at, s.created_at, s.created_by, l.id AS learner_id, l.first_name AS learner_name FROM stories s INNER JOIN learners l ON l.id = s.learner_id WHERE l.account_id = $1 ORDER BY s.created_at DESC`, [req.auth.sub]); return res.json({ stories: rows }); } catch (error) { return next(error); } });
app.post('/api/stories', requireAuth, validate(storySchema, 'body'), async (req, res) => {
  return res.status(410).json({
    error: 'Direct story creation is disabled. Use /api/stories/generate to create stories via OpenAI.',
  });
});
app.patch('/api/stories/:storyId/complete', requireAuth, async (req, res, next) => { try { const result = await pool.query(`UPDATE stories s SET completed_at = COALESCE(s.completed_at, NOW()) FROM learners l WHERE s.id = $1 AND s.learner_id = l.id AND l.account_id = $2 RETURNING s.id, s.completed_at`, [req.params.storyId, req.auth.sub]); if (!result.rowCount) return res.status(404).json({ error: 'Story not found.' }); await trackGrowthEvent(req.auth.sub, 'story_completed', { storyId: req.params.storyId }); return res.json({ story: result.rows[0] }); } catch (error) { return next(error); } });
app.post('/api/stories/:storyId/assessment', requireAuth, async (req, res, next) => {
  try {
    const bodySchema = z.object({ responses: z.array(z.string().trim().max(1000)).min(1).max(8) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please answer at least one question.' });
    const storyRes = await pool.query('SELECT s.id, s.content, s.learner_id FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.id = $1 AND l.account_id = $2', [req.params.storyId, req.auth.sub]);
    if (!storyRes.rowCount) return res.status(404).json({ error: 'Story not found.' });
    const questions = Array.isArray(storyRes.rows[0].content?.questions) ? storyRes.rows[0].content.questions : [];
    const total = Math.min(questions.length, parsed.data.responses.length);
    const answered = parsed.data.responses.slice(0, total).filter(Boolean).length;
    const score = total ? Math.round((answered / total) * 100) : 0;
    await pool.query('INSERT INTO reading_assessments (id, story_id, learner_id, responses, score, mastered) VALUES ($1, $2, $3, $4, $5, $6)', [randomUUID(), req.params.storyId, storyRes.rows[0].learner_id, parsed.data.responses.slice(0, total), score, score >= 80]);
    await pool.query('UPDATE stories SET completed_at = COALESCE(completed_at, NOW()) WHERE id = $1', [req.params.storyId]);
    await trackGrowthEvent(req.auth.sub, 'story_completed', { storyId: req.params.storyId, assessmentScore: score });
    return res.status(201).json({ score, mastered: score >= 80, answered: total });
  } catch (error) {
    return next(error);
  }
});
app.get('/api/progress', requireAuth, async (req, res, next) => { try { const { rows } = await pool.query(`SELECT l.id, l.first_name, l.age_band, COUNT(s.id)::int AS stories_created, COUNT(s.completed_at)::int AS stories_completed, COALESCE(json_agg(DISTINCT s.learning_goal) FILTER (WHERE s.learning_goal IS NOT NULL), '[]') AS learning_goals, (SELECT COUNT(*)::int FROM reading_assessments ra WHERE ra.learner_id = l.id AND ra.mastered = TRUE) AS mastered_assessments, COALESCE((SELECT ROUND(AVG(ra.score))::int FROM reading_assessments ra WHERE ra.learner_id = l.id), 0) AS average_assessment_score FROM learners l LEFT JOIN stories s ON s.learner_id = l.id WHERE l.account_id = $1 GROUP BY l.id ORDER BY l.created_at`, [req.auth.sub]); return res.json({ learners: rows }); } catch (error) { return next(error); } });
app.get('/api/subscription', requireAuth, async (req, res, next) => { try { const { rows } = await pool.query('SELECT plan, status, created_at, updated_at FROM subscriptions WHERE account_id = $1 ORDER BY updated_at DESC LIMIT 1', [req.auth.sub]); return res.json({ subscription: rows[0] || { plan: 'explorer', status: 'active' } }); } catch (error) { return next(error); } });
app.post('/api/subscription/demo', requireAuth, validate(planSchema, 'body'), async (req, res, next) => { try { await pool.query('UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE account_id = $2', ['canceled', req.auth.sub]); const subscription = { id: randomUUID(), plan: req.body.plan }; await pool.query('INSERT INTO subscriptions (id, account_id, plan, status) VALUES ($1, $2, $3, $4)', [subscription.id, req.auth.sub, subscription.plan, 'demo']); const variantRes = await pool.query('SELECT pricing_variant FROM accounts WHERE id = $1', [req.auth.sub]); await trackGrowthEvent(req.auth.sub, 'plan_selected', { plan: subscription.plan, status: 'demo', variant: variantRes.rows?.[0]?.pricing_variant || null }); return res.status(201).json({ subscription: { plan: subscription.plan, status: 'demo' } }); } catch (error) { return next(error); } });
app.post('/api/subscription/cancel', requireAuth, async (req, res, next) => { try { const result = await pool.query('UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE account_id = $2 AND status IN ($3, $4) RETURNING plan, status', ['canceled', req.auth.sub, 'active', 'demo']); return res.json({ subscription: result.rows[0] || { plan: 'explorer', status: 'canceled' } }); } catch (error) { return next(error); } });
app.delete('/api/account', requireAuth, async (req, res, next) => { const client = await pool.connect(); try { const bodySchema = z.object({ currentPassword: z.string().min(1).max(128), confirmText: z.literal('DELETE') }); const parsed = bodySchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Please confirm deletion with password and DELETE text.' }); const acctRes = await client.query('SELECT password_hash FROM accounts WHERE id = $1', [req.auth.sub]); if (!acctRes.rowCount) return res.status(404).json({ error: 'Account not found.' }); const ok = await bcrypt.compare(parsed.data.currentPassword, acctRes.rows[0].password_hash); if (!ok) return res.status(401).json({ error: 'Password is incorrect.' }); await client.query('BEGIN'); const result = await client.query('DELETE FROM accounts WHERE id = $1 RETURNING id', [req.auth.sub]); if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Account not found.' }); } await client.query('COMMIT'); return res.status(204).end(); } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); } });

app.post('/api/account/ai-opt-in', requireAuth, async (req, res, next) => {
  try {
    const bodySchema = z.object({ allow: z.boolean() });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request.' });
    const allow = parsed.data.allow === true;
    await pool.query('UPDATE accounts SET ai_external_opt_in = $1, ai_opt_in_at = CASE WHEN $1 THEN NOW() ELSE NULL END, updated_at = NOW() WHERE id = $2', [allow, req.auth.sub]);
    await logConsentEvent(req.auth.sub, 'ai_opt_in_changed', null, { allow });
    return res.json({ ai_external_opt_in: allow, ai_opt_in_at: allow ? new Date().toISOString() : null });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/account/export', requireAuth, async (req, res, next) => {
  try {
    const accountRes = await pool.query('SELECT id, email, display_name, "role", created_at, privacy_policy_version, pricing_variant, family_price_cents, trial_days FROM accounts WHERE id = $1', [req.auth.sub]);
    if (!accountRes.rowCount) return res.status(404).json({ error: 'Account not found.' });
    const learnersRes = await pool.query('SELECT id, first_name, age_band, interests, topics_to_avoid, created_at FROM learners WHERE account_id = $1', [req.auth.sub]);
    const storiesRes = await pool.query('SELECT id, learner_id, title, theme, learning_goal, prompt, content, created_by, created_at FROM stories WHERE learner_id IN (SELECT id FROM learners WHERE account_id = $1) ORDER BY created_at DESC', [req.auth.sub]);
    const consentRes = await pool.query('SELECT event_type, policy_version, metadata, created_at FROM consent_audit_log WHERE account_id = $1 ORDER BY created_at DESC', [req.auth.sub]);
    const reminderRes = await pool.query('SELECT weekly_email_enabled, updated_at FROM reminder_preferences WHERE account_id = $1', [req.auth.sub]);
    return res.json({ generatedAt: new Date().toISOString(), account: accountRes.rows[0], learners: learnersRes.rows, stories: storiesRes.rows, consentAudit: consentRes.rows, reminderPreference: reminderRes.rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/account/privacy-ack', requireAuth, async (req, res, next) => {
  try {
    const bodySchema = z.object({ policyVersion: z.string().trim().min(1).max(40) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid policy version.' });
    await pool.query('UPDATE accounts SET privacy_policy_version = $1, updated_at = NOW() WHERE id = $2', [parsed.data.policyVersion, req.auth.sub]);
    await logConsentEvent(req.auth.sub, 'privacy_acknowledged', parsed.data.policyVersion, null);
    return res.json({ policyVersion: parsed.data.policyVersion });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/subscription/offer', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT pricing_variant, family_price_cents, trial_days FROM accounts WHERE id = $1', [req.auth.sub]);
    const account = rows[0];
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    const variant = process.env.STRIPE_PRICE_FAMILY_500 ? 'family_500' : (account.pricing_variant || 'family_800');
    const configuredOffer = priceConfig[variant] || priceConfig.family_800;
    const cents = process.env.STRIPE_PRICE_FAMILY_500 ? configuredOffer.cents : Number(account.family_price_cents || configuredOffer.cents);
    const trialDays = process.env.STRIPE_PRICE_FAMILY_500 ? configuredOffer.trialDays : Number(account.trial_days || configuredOffer.trialDays);
    return res.json({ offer: { variant, familyPriceCents: cents, familyPriceDollars: (cents / 100).toFixed(2), trialDays } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/subscription/checkout', requireAuth, async (req, res, next) => {
  try {
    if (!stripe) return res.status(501).json({ error: 'Stripe is not configured yet.' });
    const bodySchema = z.object({ plan: z.enum(['family', 'classroom']) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid checkout plan.' });

    const accountRes = await pool.query('SELECT id, email, pricing_variant FROM accounts WHERE id = $1', [req.auth.sub]);
    if (!accountRes.rowCount) return res.status(404).json({ error: 'Account not found.' });
    const account = accountRes.rows[0];
    const plan = parsed.data.plan;

    const key = plan === 'classroom'
      ? 'classroom_1800'
      : (process.env.STRIPE_PRICE_FAMILY_500 ? 'family_500' : (account.pricing_variant || 'family_800'));
    const cfg = priceConfig[key] || priceConfig.family_800;
    const priceId = process.env[cfg.lookupEnv];
    if (!priceId) return res.status(400).json({ error: `Missing ${cfg.lookupEnv} in environment.` });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${appBaseUrl}/index.html?billing=success`,
      cancel_url: `${appBaseUrl}/index.html?billing=cancel`,
      customer_email: account.email,
      metadata: { accountId: account.id, plan },
      subscription_data: {
        metadata: { accountId: account.id, plan },
        trial_period_days: cfg.trialDays,
      },
      line_items: [{ price: priceId, quantity: 1 }],
    });

    return res.status(201).json({ checkoutUrl: session.url });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/learners/:learnerId/next-story', requireAuth, async (req, res, next) => {
  try {
    const learnerRes = await pool.query('SELECT id, first_name, age_band, interests FROM learners WHERE id = $1 AND account_id = $2', [req.params.learnerId, req.auth.sub]);
    if (!learnerRes.rowCount) return res.status(404).json({ error: 'Learner not found.' });
    const learner = learnerRes.rows[0];
    const suggestionRes = await pool.query(`
      SELECT domain, objective, suggested_story_type
      FROM curriculum_tracks
      WHERE grade_level = CASE
        WHEN $1 = '3-5' THEN 'PreK'
        WHEN $1 = '6-8' THEN '2'
        ELSE '5'
      END
      ORDER BY domain
      LIMIT 1
    `, [learner.age_band]);
    const suggestion = suggestionRes.rows[0] || null;
    return res.json({
      learner: { id: learner.id, firstName: learner.first_name, ageBand: learner.age_band },
      nextBestStory: suggestion ? {
        domain: suggestion.domain,
        objective: suggestion.objective,
        suggestedStoryType: suggestion.suggested_story_type,
        promptStarter: `${learner.first_name} explores ${learner.interests || 'a surprising new place'} and practices ${suggestion.domain.replaceAll('_', ' ')}.`,
      } : null,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/reminders/preferences', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT weekly_email_enabled FROM reminder_preferences WHERE account_id = $1', [req.auth.sub]);
    return res.json({ weeklyEmailEnabled: rows[0]?.weekly_email_enabled === true });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/reminders/preferences', requireAuth, async (req, res, next) => {
  try {
    const bodySchema = z.object({ weeklyEmailEnabled: z.boolean() });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid reminder setting.' });
    await pool.query('INSERT INTO reminder_preferences (account_id, weekly_email_enabled) VALUES ($1, $2) ON CONFLICT (account_id) DO UPDATE SET weekly_email_enabled = EXCLUDED.weekly_email_enabled, updated_at = NOW()', [req.auth.sub, parsed.data.weeklyEmailEnabled]);
    return res.json({ weeklyEmailEnabled: parsed.data.weeklyEmailEnabled });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/reminders/weekly-preview', requireAuth, async (req, res, next) => {
  try {
    const accountRes = await pool.query('SELECT display_name FROM accounts WHERE id = $1', [req.auth.sub]);
    const learnerRes = await pool.query('SELECT id, first_name, age_band, interests FROM learners WHERE account_id = $1 ORDER BY created_at LIMIT 5', [req.auth.sub]);
    const streakRes = await pool.query(`
      SELECT DATE_TRUNC('day', s.completed_at) AS completed_day
      FROM stories s
      JOIN learners l ON l.id = s.learner_id
      WHERE l.account_id = $1 AND s.completed_at IS NOT NULL AND s.completed_at >= NOW() - INTERVAL '60 days'
      ORDER BY completed_day DESC
    `, [req.auth.sub]);
    const streak = calculateReadingStreak((streakRes.rows || []).map(row => row.completed_day));
    const suggestions = learnerRes.rows.map((learner) => ({
      learnerId: learner.id,
      learnerName: learner.first_name,
      suggestedPrompt: `${learner.first_name} explores ${learner.interests || 'a new world'} and practices confidence reading.`,
    }));
    return res.json({
      subject: `Your Story Sprout weekly reading plan`,
      greeting: `Hi ${accountRes.rows?.[0]?.display_name || 'Reader'},`,
      currentStreak: streak,
      suggestions,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/classroom/roster/import', requireAuth, async (req, res, next) => {
  try {
    const roleRes = await pool.query('SELECT "role" FROM accounts WHERE id = $1', [req.auth.sub]);
    if (!roleRes.rowCount || roleRes.rows[0].role !== 'teacher') return res.status(403).json({ error: 'Teacher account required.' });
    const bodySchema = z.object({ csv: z.string().min(1).max(20000) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'CSV content is required.' });

    const rows = parseRosterCsv(parsed.data.csv);
    if (!rows.length) return res.status(400).json({ error: 'No valid learner rows found.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let importedCount = 0;
      for (const row of rows.slice(0, 100)) {
        const learnerId = randomUUID();
        await client.query('INSERT INTO learners (id, account_id, first_name, age_band, interests, topics_to_avoid) VALUES ($1, $2, $3, $4, $5, $6)', [learnerId, req.auth.sub, row.firstName, row.ageBand, row.interests || '', row.topicsToAvoid || '']);
        importedCount += 1;
      }
      await client.query('INSERT INTO classroom_imports (id, account_id, imported_count) VALUES ($1, $2, $3)', [randomUUID(), req.auth.sub, importedCount]);
      await client.query('COMMIT');
      await trackGrowthEvent(req.auth.sub, 'learner_created', { source: 'csv_import', importedCount });
      return res.status(201).json({ importedCount });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
});

app.get('/api/classroom/progress-summary.pdf', requireAuth, async (req, res, next) => {
  try {
    const roleRes = await pool.query('SELECT "role", display_name FROM accounts WHERE id = $1', [req.auth.sub]);
    if (!roleRes.rowCount || roleRes.rows[0].role !== 'teacher') return res.status(403).json({ error: 'Teacher account required.' });
    const learnersRes = await pool.query(`
      SELECT l.first_name, l.age_band, COUNT(s.id)::int AS stories_created, COUNT(s.completed_at)::int AS stories_completed
      FROM learners l
      LEFT JOIN stories s ON s.learner_id = l.id
      WHERE l.account_id = $1
      GROUP BY l.id
      ORDER BY l.first_name
    `, [req.auth.sub]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="classroom-progress-summary.pdf"');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text('Story Sprout Classroom Progress Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#444').text(`Teacher: ${roleRes.rows[0].display_name}`);
    doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();
    doc.fillColor('#111');

    learnersRes.rows.forEach((row, index) => {
      doc.fontSize(12).text(`${index + 1}. ${row.first_name} (Ages ${row.age_band})`);
      doc.fontSize(10).fillColor('#555').text(`Stories created: ${row.stories_created} | Stories completed: ${row.stories_completed}`);
      doc.fillColor('#111').moveDown(0.4);
    });

    doc.end();
  } catch (error) {
    return next(error);
  }
});

const gradeLevelChoices = ['PreK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'];
const readingDomains = [
  { value: 'oral_language', label: 'Oral Language' },
  { value: 'phonics', label: 'Phonics' },
  { value: 'fluency', label: 'Fluency' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'comprehension', label: 'Comprehension' },
  { value: 'writing_response', label: 'Writing Response' },
  { value: 'social_emotional_reading', label: 'Reading Confidence & SEL' },
];

const growthEventSchema = z.enum(['account_registered', 'account_login', 'learner_created', 'story_generated', 'story_completed', 'plan_selected']);
const growthEventNames = new Set(growthEventSchema.options);

async function trackGrowthEvent(accountId, eventName, metadata = null) {
  try {
    if (!accountId || !growthEventNames.has(eventName)) return;
    await pool.query('INSERT INTO growth_events (id, account_id, event_name, metadata) VALUES ($1, $2, $3, $4)', [randomUUID(), accountId, eventName, metadata || null]);
  } catch (error) {
    console.warn('Growth event log failed:', error.message);
  }
}

async function ensureGrowthSchema() {
  await pool.query("ALTER TABLE stories ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'local_app'");
  await pool.query('ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_customer_id TEXT');
  await pool.query('ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT');
  await pool.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT');
  await pool.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS guardian_consent_version TEXT');
  await pool.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pricing_variant TEXT');
  await pool.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS family_price_cents INTEGER NOT NULL DEFAULT 800');
  await pool.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 7');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS growth_events (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      event_name TEXT NOT NULL CHECK (event_name IN ('account_registered', 'account_login', 'learner_created', 'story_generated', 'story_completed', 'plan_selected')),
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS consent_audit_log (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN ('register_consent', 'privacy_acknowledged', 'ai_opt_in_changed')),
      policy_version TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminder_preferences (
      account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      weekly_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS classroom_imports (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      imported_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_consent_audit_account_created ON consent_audit_log(account_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_growth_events_account_created ON growth_events(account_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_growth_events_event_created ON growth_events(event_name, created_at DESC)');
}

function pickPricingVariant() {
  if (process.env.STRIPE_PRICE_FAMILY_500) return 'family_500';
  return Math.random() < 0.5 ? 'family_800' : 'family_1200';
}

async function logConsentEvent(accountId, eventType, policyVersion, metadata) {
  await pool.query('INSERT INTO consent_audit_log (id, account_id, event_type, policy_version, metadata) VALUES ($1, $2, $3, $4, $5)', [randomUUID(), accountId, eventType, policyVersion, metadata || null]);
}

async function upsertSubscriptionFromStripe({ accountId, plan, status, customerId, subscriptionId }) {
  await pool.query('UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE account_id = $2', ['canceled', accountId]);
  await pool.query('INSERT INTO subscriptions (id, account_id, plan, status, provider_customer_id, provider_subscription_id) VALUES ($1, $2, $3, $4, $5, $6)', [randomUUID(), accountId, plan === 'classroom' ? 'classroom' : 'family', status, customerId, subscriptionId]);
}

function parseRosterCsv(csv) {
  const lines = String(csv || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const maybeHeader = lines[0].toLowerCase();
  const hasHeader = maybeHeader.includes('first') || maybeHeader.includes('name');
  const content = hasHeader ? lines.slice(1) : lines;
  return content.map((line) => {
    const [firstNameRaw, ageBandRaw, interestsRaw, topicsToAvoidRaw] = line.split(',').map(part => (part || '').trim());
    const firstName = firstNameRaw || '';
    const ageBand = ['3-5', '6-8', '9-11'].includes(ageBandRaw) ? ageBandRaw : '6-8';
    return { firstName, ageBand, interests: interestsRaw || '', topicsToAvoid: topicsToAvoidRaw || '' };
  }).filter(row => row.firstName.length > 0 && row.firstName.length <= 32);
}

function calculateReadingStreak(days) {
  const daySet = new Set(days.map(day => String(day).slice(0, 10)));
  let streak = 0;
  for (let i = 0; i < 60; i += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function pickCurriculumRow(rows, gradeLevel, domain) {
  if (!rows.length) return null;
  const exact = rows.find(row => row.grade_level === gradeLevel && row.domain === domain);
  if (exact) return exact;
  const sameDomain = rows.filter(row => row.domain === domain);
  if (sameDomain.length) return sameDomain[0];
  return rows[0];
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractTextValue(item) {
  if (typeof item === 'string') return cleanText(item);
  if (item && typeof item === 'object') {
    const candidate = item.text || item.content || item.page || item.value || '';
    return cleanText(candidate);
  }
  return cleanText(item);
}

const blockedPromptPatterns = [
  /\b(sex|sexual|nude|porn)\b/i,
  /\b(kill|murder|suicide|self-harm|harm myself)\b/i,
  /\b(drug making|bomb|weapon instructions|hate speech)\b/i,
];

function failsLocalSafetyCheck(value) {
  const text = String(value || '');
  return blockedPromptPatterns.some((pattern) => pattern.test(text));
}

async function failsOpenAIModeration(value, apiKey) {
  if (!apiKey || String(process.env.OPENAI_ENABLE_MODERATION || 'false') !== 'true') return false;
  try {
    const moderationModel = process.env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest';
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: moderationModel, input: String(value || '') }),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return payload?.results?.[0]?.flagged === true;
  } catch {
    return false;
  }
}



async function generateStoryContent({ learnerName, prompt, gradeLevel, domain, theme, language, curriculumRow, allowExternalAI = false }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !allowExternalAI) {
    throw new Error('OpenAI is required for story generation. Enable AI opt-in and configure OPENAI_API_KEY.');
  }

  if (failsLocalSafetyCheck(prompt)) {
    throw new Error('Prompt rejected by child-safety filter. Please use a gentler adventure prompt.');
  }
  const moderationBlocked = await failsOpenAIModeration(prompt, apiKey);
  if (moderationBlocked) {
    throw new Error('Prompt blocked by safety moderation. Please rewrite and try again.');
  }

  const gradeProfiles = {
    PreK: {
      sentenceStyle: 'Very short, mostly simple present-tense sentences (3-6 words).',
      vocabularyLevel: 'Concrete everyday words with repetition and sound play.',
      structure: 'Strong repetition and predictable phrasing.',
    },
    K: {
      sentenceStyle: 'Short sentences (4-8 words), clear punctuation, direct actions.',
      vocabularyLevel: 'Early-reader words, light repetition, one new word at a time.',
      structure: 'Simple sequence with obvious beginning-middle-end.',
    },
    '1': {
      sentenceStyle: 'Short sentences (5-10 words), mostly one idea per sentence.',
      vocabularyLevel: 'High-frequency words with 1-2 beginner challenge words.',
      structure: 'Clear event order and easy transitions.',
    },
    '2': {
      sentenceStyle: 'Short-to-medium sentences (6-12 words).',
      vocabularyLevel: 'Simple descriptive words and familiar verbs.',
      structure: 'Single clear problem and solution arc.',
    },
    '3': {
      sentenceStyle: 'Mixed sentence lengths (8-14 words), still clear and direct.',
      vocabularyLevel: 'Age-appropriate academic words with context clues.',
      structure: 'Stronger character motivation and cause/effect links.',
    },
    '4': {
      sentenceStyle: 'Medium sentences (9-16 words) with varied structure.',
      vocabularyLevel: 'Richer descriptive language and content words.',
      structure: 'Include inference opportunities and nuanced detail.',
    },
    '5': {
      sentenceStyle: 'Medium sentences (10-18 words), occasional complex sentence.',
      vocabularyLevel: 'Subject-linked terminology explained in context.',
      structure: 'Multi-step problem solving and clear reflection.',
    },
    '6': {
      sentenceStyle: 'Medium-to-long sentences (10-20 words), controlled complexity.',
      vocabularyLevel: 'Middle-grade tiered vocabulary with context support.',
      structure: 'Subtle character growth and evidence-based comprehension signals.',
    },
    '7': {
      sentenceStyle: 'Varied sentence lengths with moderate complexity.',
      vocabularyLevel: 'Domain-linked vocabulary and figurative language used carefully.',
      structure: 'Theme and perspective should be explicit but age-appropriate.',
    },
    '8': {
      sentenceStyle: 'Varied sentence structures with stronger cohesion.',
      vocabularyLevel: 'Middle-grade academic language balanced with clarity.',
      structure: 'Deeper reflection and analytical comprehension opportunities.',
    },
  };
  const gradeProfile = gradeProfiles[gradeLevel] || gradeProfiles['2'];

  try {
    const safeLearner = 'A curious reader';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'system',
          content: `You write child-safe, developmentally appropriate K-8 stories for reading practice. Never include sexual content, hate speech, graphic violence, self-harm, or instructions for wrongdoing. Use the curriculum objective exactly. Write the story and all questions and definitions in ${language}. Output valid JSON with keys: title, pages, questions, words, readingGoal.`
        }, {
          role: 'user',
          content: JSON.stringify({
            learnerName: safeLearner,
            gradeLevel,
            domain,
            theme,
            language,
            prompt,
            curriculumObjective: curriculumRow?.objective || 'Support comprehension and confidence in reading.',
            constraints: [
              'Warm, child-safe, age-appropriate language',
              'Short pages, 3-4 pages only',
              'Include exactly 3 open-ended comprehension questions that can be answered from the story',
              'Include 2-3 vocabulary words with meanings',
              'Keep it suitable for early elementary or middle-grade reading based on grade',
              'Focus on reading growth, confidence, and one clear learning goal',
              `Sentence guidance: ${gradeProfile.sentenceStyle}`,
              `Vocabulary guidance: ${gradeProfile.vocabularyLevel}`,
              `Structure guidance: ${gradeProfile.structure}`,
            ],
          })
        }],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI HTTP error ${response.status}`);
    const payload = await response.json();
    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error('No content from OpenAI');
    const parsed = JSON.parse(text);
    
    // Validate that OpenAI returned required fields - do NOT fall back to local stories
    if (!parsed.title || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      throw new Error('OpenAI returned incomplete story data');
    }
    
    return {
      title: cleanText(parsed.title),
      pages: parsed.pages.map(item => extractTextValue(item)).filter(Boolean),
      questions: Array.isArray(parsed.questions) && parsed.questions.length ? parsed.questions.map(item => extractTextValue(item)).filter(Boolean) : [],
      words: Array.isArray(parsed.words) && parsed.words.length ? parsed.words.map(item => ({ word: cleanText(item.word), meaning: cleanText(item.meaning) })).filter(item => item.word && item.meaning) : [],
      readingGoal: cleanText(parsed.readingGoal) || 'Reading practice',
      curriculumObjective: curriculumRow?.objective || null,
      curriculumId: curriculumRow?.id || null,
      createdBy: 'openai',
    };
  } catch (error) {
    throw new Error(`OpenAI story generation failed: ${error.message}`);
  }
}

async function reviseStoryContent({ story, revisionPrompt, gradeLevel, domain, language = 'English', curriculumRow, allowExternalAI = false }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !allowExternalAI) throw new Error('OpenAI is required for story revisions. Enable AI opt-in and configure the OpenAI key.');
  if (failsLocalSafetyCheck(revisionPrompt)) throw new Error('Revision rejected by child-safety filter. Please request a gentler change.');
  if (await failsOpenAIModeration(revisionPrompt, apiKey)) throw new Error('Revision blocked by safety moderation. Please rewrite the request.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `You revise child-safe K-8 reading stories. Never add sexual content, hate speech, graphic violence, self-harm, or instructions for wrongdoing. Keep the reading level at grade ${gradeLevel}, preserve the curriculum objective, and write all output in ${language}. Return valid JSON with title, pages, questions, words, and readingGoal.`
      }, {
        role: 'user',
        content: JSON.stringify({
          originalStory: { title: story.title, pages: story.content?.pages || [], questions: story.content?.questions || [], words: story.content?.words || [] },
          revisionRequest: revisionPrompt,
          gradeLevel,
          domain,
          curriculumObjective: curriculumRow?.objective || story.content?.meta?.curriculumObjective || 'Support comprehension and confidence in reading.',
          constraints: ['Keep the story warm and school-appropriate.', 'Keep 3-4 short pages.', 'Keep exactly 3 answerable comprehension questions.', 'Keep 2-3 vocabulary words with simple definitions.', 'Change only what is needed for the revision request.'],
        }),
      }],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI HTTP error ${response.status}`);
  const payload = await response.json();
  const parsed = JSON.parse(payload.choices?.[0]?.message?.content || '{}');
  if (!parsed.title || !Array.isArray(parsed.pages) || !parsed.pages.length) throw new Error('OpenAI returned incomplete revised story data.');
  return {
    title: cleanText(parsed.title),
    pages: parsed.pages.map(item => extractTextValue(item)).filter(Boolean),
    questions: Array.isArray(parsed.questions) ? parsed.questions.map(item => extractTextValue(item)).filter(Boolean) : [],
    words: Array.isArray(parsed.words) ? parsed.words.map(item => ({ word: cleanText(item.word), meaning: cleanText(item.meaning) })).filter(item => item.word && item.meaning) : [],
    readingGoal: cleanText(parsed.readingGoal) || 'Reading practice',
  };
}

app.get('/api/curriculum', requireAuth, async (req, res, next) => {
  try {
    const gradeLevel = req.query.gradeLevel || null;
    const domain = req.query.domain || null;
    let query = 'SELECT * FROM curriculum_tracks ORDER BY grade_level, domain, standard_code';
    const params = [];
    if (gradeLevel || domain) {
      const clauses = [];
      if (gradeLevel) { clauses.push('grade_level = $1'); params.push(gradeLevel); }
      if (domain) { clauses.push('domain = $' + (params.length + 1)); params.push(domain); }
      query = `SELECT * FROM curriculum_tracks WHERE ${clauses.join(' AND ')} ORDER BY grade_level, domain, standard_code`;
    }
    const { rows } = await pool.query(query, params);
    return res.json({ curriculum: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/healthz', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, service: 'story-sprout-web', time: new Date().toISOString() });
  } catch {
    return res.status(503).json({ ok: false, service: 'story-sprout-web' });
  }
});

app.post('/api/events', requireAuth, async (req, res, next) => {
  try {
    const bodySchema = z.object({
      eventName: growthEventSchema,
      metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid event payload.' });
    await trackGrowthEvent(req.auth.sub, parsed.data.eventName, parsed.data.metadata || null);
    return res.status(202).json({ accepted: true });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/business/scorecard', requireAuth, async (req, res, next) => {
  try {
    const [countsRes, retentionRes, myRes, streakRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_accounts,
          COUNT(*) FILTER (WHERE role = 'teacher')::int AS teacher_accounts,
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.account_id = accounts.id AND s.status = 'active'))::int AS paying_accounts,
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.account_id = accounts.id AND s.status = 'demo'))::int AS demo_accounts
        FROM accounts
      `),
      pool.query(`
        WITH eligible AS (
          SELECT id, created_at
          FROM accounts
          WHERE created_at <= NOW() - INTERVAL '28 days'
        ),
        w1 AS (
          SELECT DISTINCT e.id
          FROM eligible e
          JOIN growth_events g ON g.account_id = e.id
          WHERE g.created_at >= e.created_at
            AND g.created_at < e.created_at + INTERVAL '7 days'
        ),
        w4 AS (
          SELECT DISTINCT e.id
          FROM eligible e
          JOIN growth_events g ON g.account_id = e.id
          WHERE g.created_at >= e.created_at + INTERVAL '22 days'
            AND g.created_at < e.created_at + INTERVAL '29 days'
        )
        SELECT
          (SELECT COUNT(*)::int FROM w1) AS activated_accounts,
          (SELECT COUNT(*)::int FROM w1 w JOIN w4 r ON r.id = w.id) AS retained_accounts
      `),
      pool.query(`
        SELECT
          a.created_at,
          COALESCE((SELECT COUNT(*)::int FROM stories s JOIN learners l ON l.id = s.learner_id WHERE l.account_id = a.id AND s.created_at >= NOW() - INTERVAL '28 days'), 0) AS stories_created_28d,
          COALESCE((SELECT COUNT(*)::int FROM stories s JOIN learners l ON l.id = s.learner_id WHERE l.account_id = a.id AND s.completed_at >= NOW() - INTERVAL '28 days'), 0) AS stories_completed_28d,
          COALESCE((SELECT plan FROM subscriptions s WHERE s.account_id = a.id ORDER BY updated_at DESC LIMIT 1), 'explorer') AS current_plan,
          COALESCE((SELECT status FROM subscriptions s WHERE s.account_id = a.id ORDER BY updated_at DESC LIMIT 1), 'active') AS current_status
        FROM accounts a
        WHERE a.id = $1
      `, [req.auth.sub]),
      pool.query(`
        SELECT DATE_TRUNC('day', s.completed_at) AS completed_day
        FROM stories s
        JOIN learners l ON l.id = s.learner_id
        WHERE l.account_id = $1 AND s.completed_at IS NOT NULL AND s.completed_at >= NOW() - INTERVAL '60 days'
        ORDER BY completed_day DESC
      `, [req.auth.sub]),
    ]);

    const counts = countsRes.rows[0] || { total_accounts: 0, teacher_accounts: 0, paying_accounts: 0, demo_accounts: 0 };
    const retention = retentionRes.rows[0] || { activated_accounts: 0, retained_accounts: 0 };
    const mine = myRes.rows[0] || null;
    const activated = Number(retention.activated_accounts || 0);
    const retained = Number(retention.retained_accounts || 0);
    const retention4wRate = activated > 0 ? retained / activated : 0;
    const pilotCustomers = Number(counts.paying_accounts || 0) + Number(counts.demo_accounts || 0);
    const currentReadingStreak = calculateReadingStreak((streakRes.rows || []).map(row => row.completed_day));

    return res.json({
      scorecard: {
        targets: { pilotCustomers: 10, schoolPilots: 2, retention4wRate: 0.35 },
        current: {
          totalAccounts: Number(counts.total_accounts || 0),
          teacherAccounts: Number(counts.teacher_accounts || 0),
          payingCustomers: Number(counts.paying_accounts || 0),
          pilotCustomers,
          retention4wRate,
        },
        status: {
          pilotCustomersMet: pilotCustomers >= 10,
          schoolPilotSignalMet: Number(counts.teacher_accounts || 0) >= 2,
          retentionMet: retention4wRate >= 0.35,
        },
        myAccount: mine ? {
          createdAt: mine.created_at,
          storiesCreated28d: Number(mine.stories_created_28d || 0),
          storiesCompleted28d: Number(mine.stories_completed_28d || 0),
          currentReadingStreak,
          currentPlan: mine.current_plan,
          currentPlanStatus: mine.current_status,
        } : null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/stories/generate', requireAuth, async (req, res, next) => {
  try {
    const createSchema = z.object({
      learnerId: z.string().uuid(),
      prompt: z.string().trim().min(1).max(300),
      gradeLevel: z.enum(['PreK', 'K', '1', '2', '3', '4', '5', '6', '7', '8']).default('K'),
      domain: z.enum(['oral_language', 'phonics', 'fluency', 'vocabulary', 'comprehension', 'writing_response', 'social_emotional_reading']).default('comprehension'),
      theme: z.enum(['Moonlight', 'Rainforest', 'Ocean', 'Castle']).default('Moonlight'),
      language: storyLanguageSchema.default('English'),
    });
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check the story generation details.', details: parsed.error.flatten() });

    const data = parsed.data;
    const learnerQuery = await pool.query('SELECT id, first_name, age_band FROM learners WHERE id = $1 AND account_id = $2', [data.learnerId, req.auth.sub]);
    if (!learnerQuery.rowCount) return res.status(404).json({ error: 'Learner not found.' });
    const learner = learnerQuery.rows[0];

    const acct = await pool.query('SELECT ai_external_opt_in FROM accounts WHERE id = $1', [req.auth.sub]);
    const allowExternalAI = acct.rows?.[0]?.ai_external_opt_in === true;
    if (!allowExternalAI || !process.env.OPENAI_API_KEY) {
      return res.status(403).json({ error: 'OpenAI is required for story generation. Please enable AI opt-in and add the OpenAI key.' });
    }

    const curriculumRows = await pool.query('SELECT * FROM curriculum_tracks WHERE grade_level = $1 AND domain = $2 ORDER BY standard_code', [data.gradeLevel, data.domain]);
    const curriculumRow = pickCurriculumRow(curriculumRows.rows, data.gradeLevel, data.domain);
    
    // OpenAI ONLY - no fallback
    const generated = await generateStoryContent({
      learnerName: learner.first_name,
      prompt: data.prompt,
      gradeLevel: data.gradeLevel,
      domain: data.domain,
      theme: data.theme,
      language: data.language,
      curriculumRow,
      allowExternalAI,
    });

    const story = {
      id: randomUUID(),
      learnerId: learner.id,
      title: generated.title,
      theme: data.theme,
      learningGoal: curriculumRow ? curriculumRow.strand : 'Reading growth',
      prompt: data.prompt,
      content: {
        pages: generated.pages,
        questions: generated.questions,
        words: generated.words,
        meta: {
          gradeLevel: data.gradeLevel,
          domain: data.domain,
          language: data.language,
          curriculumObjective: generated.curriculumObjective,
          model: 'gpt-4o-mini',
        },
      },
    };

    await pool.query('INSERT INTO stories (id, learner_id, title, theme, learning_goal, prompt, content, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [story.id, story.learnerId, story.title, story.theme, story.learningGoal, story.prompt, story.content, generated.createdBy || 'openai']);
    await trackGrowthEvent(req.auth.sub, 'story_generated', { source: generated.createdBy || 'openai', gradeLevel: data.gradeLevel, domain: data.domain });

    if (generated.createdBy === 'openai') {
      try {
        await pool.query('INSERT INTO ai_invocations (id, account_id, story_id, provider, model) VALUES ($1, $2, $3, $4, $5)', [randomUUID(), req.auth.sub, story.id, 'openai', 'gpt-4o-mini']);
      } catch (logErr) {
        console.warn('Failed to log AI invocation', logErr.message);
      }
    }

    if (curriculumRow) {
      await pool.query('INSERT INTO story_curriculum (story_id, curriculum_id, alignment_note) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [story.id, curriculumRow.id, `Generated to support ${curriculumRow.objective}`]);
    }

    return res.status(201).json({
      story: {
        ...story,
        curriculumId: curriculumRow?.id || null,
        readingGoal: generated.readingGoal,
        curriculumObjective: generated.curriculumObjective,
      },
    });
  } catch (error) {
    return res.status(503).json({ error: error.message || 'OpenAI story generation failed.' });
  }
});

app.patch('/api/stories/:storyId/revise', requireAuth, async (req, res, next) => {
  try {
    const bodySchema = z.object({ revisionPrompt: z.string().trim().min(3).max(500) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Describe the change you want to make to this story.' });
    const storyRes = await pool.query('SELECT s.id, s.title, s.prompt, s.theme, s.learning_goal, s.content, s.learner_id FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.id = $1 AND l.account_id = $2', [req.params.storyId, req.auth.sub]);
    if (!storyRes.rowCount) return res.status(404).json({ error: 'Story not found.' });
    const accountRes = await pool.query('SELECT ai_external_opt_in FROM accounts WHERE id = $1', [req.auth.sub]);
    if (accountRes.rows?.[0]?.ai_external_opt_in !== true || !process.env.OPENAI_API_KEY) return res.status(403).json({ error: 'OpenAI is required for story revisions. Please enable AI opt-in and add the OpenAI key.' });
    const story = storyRes.rows[0];
    const gradeLevel = story.content?.meta?.gradeLevel || 'K';
    const domain = story.content?.meta?.domain || 'comprehension';
    const curriculumRes = await pool.query('SELECT * FROM curriculum_tracks WHERE grade_level = $1 AND domain = $2 ORDER BY standard_code', [gradeLevel, domain]);
    const revised = await reviseStoryContent({ story, revisionPrompt: parsed.data.revisionPrompt, gradeLevel, domain, curriculumRow: pickCurriculumRow(curriculumRes.rows, gradeLevel, domain), allowExternalAI: true });
    const content = { ...story.content, pages: revised.pages, questions: revised.questions, words: revised.words, meta: { ...story.content.meta, revisedAt: new Date().toISOString(), model: 'gpt-4o-mini' } };
    const updated = await pool.query('UPDATE stories SET title = $1, prompt = $2, content = $3, created_by = $4 WHERE id = $5 RETURNING id, title, prompt, content, theme, learning_goal, completed_at, created_at, created_by', [revised.title, parsed.data.revisionPrompt, content, 'openai_revision', story.id]);
    return res.json({ story: updated.rows[0] });
  } catch (error) {
    return res.status(503).json({ error: `Story revision failed: ${error.message}` });
  }
});

app.use(express.static(rootDir));
app.use('/api/', (req, res, next) => next());
app.use((req, res) => {
  return res.sendFile(path.join(rootDir, 'index.html'));
});

app.use((error, req, res, next) => {
  console.error('Error:', error?.message);
  res.status(500).json({ error: error?.message || 'Server error' });
});

ensureBaseSchema()
  .then(() => ensureGrowthSchema())
  .then(() => {
    app.listen(port, () => {
      console.log(`Story Sprout is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Startup schema error:', error?.message || error);
    process.exit(1);
  });
