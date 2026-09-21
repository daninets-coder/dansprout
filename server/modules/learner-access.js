export function createLearnerAccess({ pool }) {
async function requireChildLearnerScope(req, res, next) {
  if (req.auth?.childMode !== true) return next();
  if (req.params.learnerId !== req.auth.learnerId) return res.status(404).json({ error: 'Learner not found.' });
  return next();
}
async function requireChildStoryScope(req, res, next) {
  if (req.params.storyId === 'deleted' || req.params.storyId === 'generate') return next();
  // restore/permanent act on already soft-deleted stories, so they must not be blocked by the "not deleted" scope check below
  if (req.path.endsWith('/restore') || req.path.endsWith('/permanent')) return next();
  if (typeof req.params.storyId === 'string' && req.params.storyId.endsWith('.pdf')) req.params.storyId = req.params.storyId.slice(0, -4);
  try {
    const childScope = req.auth?.childMode === true ? ' AND s.learner_id = $3' : '';
    const params = req.auth?.childMode === true ? [req.params.storyId, req.auth.sub, req.auth.learnerId] : [req.params.storyId, req.auth.sub];
    const result = await pool.query(`SELECT s.id FROM stories s JOIN learners l ON l.id = s.learner_id WHERE s.id = $1 AND l.account_id = $2 AND s.deleted_at IS NULL${childScope}`, params);
    if (!result.rowCount) return res.status(404).json({ error: 'Story not found.' });
    return next();
  } catch (error) {
    return next(error);
  }
}

return { requireChildLearnerScope, requireChildStoryScope };
}
