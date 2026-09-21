import { registerSiblingSharing } from './sibling-sharing.js';
import { Router } from 'express';
import { z } from 'zod';

export function createReadingRouter({ pool, requireAdultAccount }) {
  const router = Router();
  registerSiblingSharing(router, { pool, requireAdultAccount });
  const scope = async (req, res, next) => {
    try {
      const id = req.params.storyId;
      if (!z.string().uuid().safeParse(id).success) return res.status(400).json({ error: 'Invalid story.' });
      const result = await pool.query('SELECT s.* FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.id = $1 AND l.account_id = $2 AND s.deleted_at IS NULL', [id, req.auth.sub]);
      const story = result.rows[0];
      if (!story || (req.auth.childMode && story.learner_id !== req.auth.learnerId)) return res.status(404).json({ error: 'Story not found.' });
      req.readingStory = story; next();
    } catch (error) { next(error); }
  };
  router.put('/stories/:storyId/session', scope, async (req, res, next) => {
    const parsed = z.object({ sessionId: z.string().uuid(), activeSeconds: z.number().int().min(0).max(7200) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid reading session.' });
    try {
      const { sessionId, activeSeconds } = parsed.data;
      const result = await pool.query(`INSERT INTO reading_sessions (id, story_id, account_id, active_seconds) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET active_seconds = GREATEST(reading_sessions.active_seconds, EXCLUDED.active_seconds), updated_at = NOW() WHERE reading_sessions.story_id = EXCLUDED.story_id AND reading_sessions.account_id = EXCLUDED.account_id RETURNING active_seconds`, [sessionId, req.params.storyId, req.auth.sub, activeSeconds]);
      if (!result.rowCount) return res.status(409).json({ error: 'Session does not match this story.' });
      res.json({ activeSeconds: result.rows[0].active_seconds });
    } catch (error) { next(error); }
  });
  router.put('/stories/:storyId/observation', requireAdultAccount, scope, async (req, res, next) => {
    const parsed = z.object({ assistance: z.enum(['independent', 'some_help', 'read_together', 'not_observed']), note: z.string().trim().max(500).default('') }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose how much help was given; notes must be under 500 characters.' });
    try {
      await pool.query(`INSERT INTO reading_observations (story_id, account_id, assistance, note) VALUES ($1, $2, $3, $4) ON CONFLICT (story_id) DO UPDATE SET assistance = EXCLUDED.assistance, note = EXCLUDED.note, updated_at = NOW()`, [req.params.storyId, req.auth.sub, parsed.data.assistance, parsed.data.note]);
      res.json({ observation: parsed.data });
    } catch (error) { next(error); }
  });
  router.get('/learners/:learnerId', async (req, res, next) => {
    try {
      const id = req.params.learnerId;
      if (!z.string().uuid().safeParse(id).success) return res.status(400).json({ error: 'Invalid learner.' });
      if (req.auth.childMode && id !== req.auth.learnerId) return res.status(404).json({ error: 'Learner not found.' });
      const learner = await pool.query('SELECT id FROM learners WHERE id = $1 AND account_id = $2', [id, req.auth.sub]);
      if (!learner.rowCount) return res.status(404).json({ error: 'Learner not found.' });
      const sessions = await pool.query('SELECT COALESCE(SUM(rs.active_seconds), 0) AS seconds FROM reading_sessions rs JOIN stories s ON s.id = rs.story_id WHERE s.learner_id = $1 AND s.deleted_at IS NULL', [id]);
      const observations = await pool.query('SELECT o.*, s.title FROM reading_observations o JOIN stories s ON s.id = o.story_id WHERE s.learner_id = $1 AND s.deleted_at IS NULL ORDER BY o.updated_at DESC LIMIT 5', [id]);
      const assessments = await pool.query('SELECT ra.score, ra.standards_evidence, ra.review_status, ra.created_at, s.title, s.id AS story_id FROM reading_assessments ra JOIN stories s ON s.id = ra.story_id WHERE s.learner_id = $1 AND s.deleted_at IS NULL ORDER BY ra.created_at DESC LIMIT 5', [id]);
      const unfinished = await pool.query('SELECT s.* FROM stories s WHERE s.learner_id = $1 AND s.deleted_at IS NULL AND s.completed_at IS NULL ORDER BY s.created_at DESC LIMIT 1', [id]);
      res.json({ activeSeconds: Number(sessions.rows[0].seconds), observations: observations.rows, assessments: assessments.rows, continueStory: unfinished.rows[0] || null });
    } catch (error) { next(error); }
  });
  return router;
}
