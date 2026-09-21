import jwt from 'jsonwebtoken';
export function createAuthentication({ pool, jwtSecret }) {
function tokenFor(account) { return jwt.sign({ sub: account.id, role: account.role }, jwtSecret, { expiresIn: '8h', issuer: 'story-sprout' }); }
function childModeTokenFor(accountId, learnerId) { return jwt.sign({ sub: accountId, role: 'child', childMode: true, learnerId }, jwtSecret, { expiresIn: '4h', issuer: 'story-sprout' }); }
function parentConfirmationTokenFor(account) { return jwt.sign({ sub: account.id, role: account.role, parentAction: true }, jwtSecret, { expiresIn: '10m', issuer: 'story-sprout' }); }
function requireAuth(req, res, next) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: 'Authentication required.' }); try { req.auth = jwt.verify(token, jwtSecret, { issuer: 'story-sprout' }); return next(); } catch { return res.status(401).json({ error: 'Session expired. Please sign in again.' }); } }
function requireChildSession(req, res, next) {
  if (req.auth?.childMode !== true || !req.auth.learnerId) return res.status(403).json({ error: 'Child Mode session required.' });
  return next();
}
function requireParentConfirmation(req, res, next) {
  const token = req.headers['x-parent-confirmation'];
  if (!token) return res.status(403).json({ error: 'Parent confirmation is required for this action.', code: 'PARENT_CONFIRMATION_REQUIRED' });
  try {
    const confirmation = jwt.verify(token, jwtSecret, { issuer: 'story-sprout' });
    if (confirmation.sub !== req.auth.sub || confirmation.parentAction !== true) throw new Error('Invalid parent confirmation.');
    return next();
  } catch {
    return res.status(403).json({ error: 'Parent confirmation expired. Please confirm again.', code: 'PARENT_CONFIRMATION_REQUIRED' });
  }
}
async function requireAdultAccount(req, res, next) {
  try {
    if (req.auth?.childMode === true) return res.status(403).json({ error: 'Parent session required for this action.' });
    const { rows } = await pool.query('SELECT "role" FROM accounts WHERE id = $1', [req.auth.sub]);
    if (!rows[0] || !['parent', 'teacher'].includes(rows[0].role)) return res.status(403).json({ error: 'An adult parent or teacher account is required for this action.' });
    return next();
  } catch (error) {
    return next(error);
  }
}
async function requireVerifiedEmail(req, res, next) { try { const { rows } = await pool.query('SELECT email_verified_at FROM accounts WHERE id = $1', [req.auth.sub]); if (!rows[0]) return res.status(404).json({ error: 'Account not found.' }); if (!rows[0].email_verified_at) return res.status(403).json({ error: 'Please verify your email before using Story Sprout.' , code: 'EMAIL_NOT_VERIFIED' }); return next(); } catch (error) { return next(error); } }

return { tokenFor, childModeTokenFor, parentConfirmationTokenFor, requireAuth, requireChildSession, requireParentConfirmation, requireAdultAccount, requireVerifiedEmail };
}
