import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

export function registerSiblingSharing(router, { pool, requireAdultAccount }) {
  router.get('/sharing/settings', async (req, res, next) => {
    try { const result = await pool.query('SELECT sibling_sharing_enabled FROM accounts WHERE id = $1', [req.auth.sub]); res.json({ enabled: result.rows[0]?.sibling_sharing_enabled === true }); } catch (e) { next(e); }
  });
  router.put('/sharing/settings', requireAdultAccount, async (req, res, next) => {
    const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose whether sibling sharing is enabled.' });
    try { await pool.query('UPDATE accounts SET sibling_sharing_enabled = $1 WHERE id = $2', [parsed.data.enabled, req.auth.sub]); res.json(parsed.data); } catch (e) { next(e); }
  });
  async function source(req, db) {
    if (!z.string().uuid().safeParse(req.params.storyId).success) return null;
    const result = await db.query('SELECT s.* FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.id = $1 AND l.account_id = $2 AND s.deleted_at IS NULL', [req.params.storyId, req.auth.sub]);
    const story = result.rows[0];
    return story && (!req.auth.childMode || story.learner_id === req.auth.learnerId) ? story : null;
  }
  router.get('/stories/:storyId/sharing', async (req, res, next) => {
    try {
      const story = await source(req, pool);
      if (!story) return res.status(404).json({ error: 'Story not found.' });
      const settings = await pool.query('SELECT sibling_sharing_enabled FROM accounts WHERE id = $1', [req.auth.sub]);
      const enabled = settings.rows[0]?.sibling_sharing_enabled === true;
      if (!enabled) return res.json({ enabled, learners: [] });
      const siblings = await pool.query('SELECT id, first_name FROM learners WHERE account_id = $1 AND id <> $2 ORDER BY first_name', [req.auth.sub, story.learner_id]);
      res.json({ enabled, learners: siblings.rows });
    } catch (e) { next(e); }
  });
  router.post('/stories/:storyId/sharing', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), async (req, res, next) => {
    const parsed = z.object({ learnerId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose a sibling.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const settings = await client.query('SELECT sibling_sharing_enabled FROM accounts WHERE id = $1 FOR UPDATE', [req.auth.sub]);
      if (settings.rows[0]?.sibling_sharing_enabled !== true) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'A parent needs to enable sibling sharing first.' }); }
      const story = await source(req, client);
      if (!story) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Story not found.' }); }
      const sibling = await client.query('SELECT id FROM learners WHERE id = $1 AND account_id = $2', [parsed.data.learnerId, req.auth.sub]);
      if (!sibling.rowCount || parsed.data.learnerId === story.learner_id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Choose another learner in your family.' }); }
      const previous = await client.query('SELECT id, deleted_at FROM stories WHERE shared_from_story_id = $1 AND learner_id = $2', [story.id, parsed.data.learnerId]);
      if (previous.rowCount) { await client.query('COMMIT'); return res.status(previous.rows[0].deleted_at ? 409 : 200).json(previous.rows[0].deleted_at ? { error: 'This copy was removed. A parent can restore it from Recently deleted.' } : { shared: true, alreadyShared: true }); }
      const meta = {};
      for (const key of ['gradeLevel','domain','language','illustrationUrl','curriculumStandard','curriculumObjective','standardsSource','model']) if (story.content?.meta?.[key] !== undefined) meta[key] = story.content.meta[key];
      const content = { pages: story.content.pages || [], questions: story.content.questions || [], words: story.content.words || [], reflectionPrompt: story.content.reflectionPrompt || '', meta };
      await client.query('INSERT INTO stories (id, learner_id, title, theme, learning_goal, prompt, content, created_by, shared_from_story_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [randomUUID(), parsed.data.learnerId, story.title, story.theme, story.learning_goal, 'Shared within the family', content, 'family_share', story.id]);
      await client.query('COMMIT'); res.status(201).json({ shared: true, alreadyShared: false });
    } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
  });
}
