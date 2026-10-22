import { randomUUID } from 'node:crypto';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Story privacy checkpoint: generated stories start as drafts, only a parent can save or permanently delete them,
// and a delete removes the story row (cascading to assessments, preferences, etc.), its illustration and its
// narration audio. The audit table keeps ids and timestamps only -- never story content.
export const DRAFT_RETENTION_DAYS = 30;
const SOURCES = ['save-prompt', 'close-prompt', 'library', 'drafts', 'auto-expire'];
const PRIVACY_EVENTS = ['prompt_shown', 'choice_review', 'choice_save', 'choice_delete', 'close_prompt_shown', 'close_save', 'close_delete'];

export function createStoryPrivacy({ pool, illustrationsDir, audioDir, trackGrowthEvent }) {
  async function removeFiles(storyId) {
    const illustration = `${storyId}.png`;
    // A continuation may reuse this story's cover; only remove the picture when nothing else references it.
    const shared = await pool.query("SELECT 1 FROM stories WHERE content::text LIKE $1 LIMIT 1", [`%${illustration}%`]);
    if (!shared.rowCount) await unlink(path.join(illustrationsDir, illustration)).catch(() => {});
    const files = await readdir(audioDir).catch(() => []);
    await Promise.all(files.filter(name => name.startsWith(`${storyId}-`)).map(name => unlink(path.join(audioDir, name)).catch(() => {})));
  }

  // Hard delete. accountId must already have been verified as the owner (or be the auto-expire job).
  async function hardDeleteStory(storyId, accountId, source) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const removed = await client.query('DELETE FROM stories WHERE id = $1 AND learner_id IN (SELECT id FROM learners WHERE account_id = $2) RETURNING id', [storyId, accountId]);
      if (!removed.rowCount) { await client.query('ROLLBACK'); return false; }
      await client.query('INSERT INTO story_deletion_audit (id, story_id, account_id, source) VALUES ($1, $2, $3, $4)', [randomUUID(), storyId, accountId, source]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    await removeFiles(storyId);
    return true;
  }

  async function purgeExpiredDrafts() {
    const expired = await pool.query(`SELECT s.id, l.account_id FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.status = 'draft' AND s.created_at < $1`, [new Date(Date.now() - DRAFT_RETENTION_DAYS * 86400000)]);
    let count = 0;
    for (const row of expired.rows) {
      try { if (await hardDeleteStory(row.id, row.account_id, 'auto-expire')) count += 1; } catch (error) { console.warn('draft purge failed', error.message); }
    }
    if (count) console.log(JSON.stringify({ level: 'info', event: 'drafts_auto_expired', count }));
    return count;
  }

  function startDraftPurgeJob() {
    const run = () => purgeExpiredDrafts().catch(error => console.warn('draft purge job failed', error.message));
    setTimeout(run, 60 * 1000).unref();
    setInterval(run, 24 * 60 * 60 * 1000).unref();
  }

  function registerRoutes(app, { requireAuth, requireAdultAccount }) {
    // All routes are grown-up only: requireAdultAccount answers 403 for any child-mode session.
    app.get('/api/stories/drafts', requireAuth, requireAdultAccount, async (req, res, next) => {
      try {
        const { rows } = await pool.query(`SELECT s.id, s.title, s.theme, s.learning_goal, s.prompt, s.content, s.created_at, s.created_by, l.id AS learner_id, l.first_name AS learner_name, s.status
          FROM stories s JOIN learners l ON l.id = s.learner_id WHERE l.account_id = $1 AND s.status = 'draft' AND s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 50`, [req.auth.sub]);
        return res.json({ stories: rows.map(row => ({ ...row, expires_at: new Date(new Date(row.created_at).getTime() + DRAFT_RETENTION_DAYS * 86400000).toISOString() })) });
      } catch (error) { return next(error); }
    });

    app.post('/api/stories/:storyId/save', requireAuth, requireAdultAccount, async (req, res, next) => {
      try {
        if (!z.object({ reviewConfirmed: z.literal(true) }).safeParse(req.body).success) return res.status(400).json({ error: 'Please review the story before saving.' });
        const result = await pool.query("UPDATE stories SET status = 'saved', review_confirmed_at = NOW(), review_confirmed_by = $2 WHERE id = $1 AND status = 'draft' AND learner_id IN (SELECT id FROM learners WHERE account_id = $2) RETURNING id, review_confirmed_at", [req.params.storyId, req.auth.sub]);
        if (!result.rowCount) return res.status(404).json({ error: 'Draft story not found.' });
        return res.json({ id: result.rows[0].id, status: 'saved', reviewConfirmedAt: result.rows[0].review_confirmed_at });
      } catch (error) { return next(error); }
    });

    app.post('/api/stories/:storyId/discard', requireAuth, requireAdultAccount, async (req, res, next) => {
      try {
        const parsed = z.object({ source: z.enum(['save-prompt', 'close-prompt', 'library', 'drafts']) }).safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'Please check the submitted information.' });
        const deleted = await hardDeleteStory(req.params.storyId, req.auth.sub, parsed.data.source);
        if (!deleted) return res.status(404).json({ error: 'Story not found.' });
        return res.status(204).end();
      } catch (error) { return next(error); }
    });

    // Aggregate counters only: event name, never story content.
    app.post('/api/stories/privacy-events', requireAuth, requireAdultAccount, async (req, res) => {
      const parsed = z.object({ event: z.enum(PRIVACY_EVENTS) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Unknown event.' });
      await trackGrowthEvent(req.auth.sub, `story_privacy_${parsed.data.event}`, null).catch(() => {});
      return res.status(204).end();
    });
  }

  return { hardDeleteStory, purgeExpiredDrafts, startDraftPurgeJob, registerRoutes, SOURCES };
}
