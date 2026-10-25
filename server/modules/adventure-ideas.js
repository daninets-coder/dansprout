import { NARRATION_VERSION, narrationRequest } from './narration-voices.js';

// Picture adventure choices for early readers. Each label has one natural-voice recording (same voice family as
// story narration), generated once, stored in the database, and served from there.
export function createAdventureIdeas({ pool, getWarmVoice = () => 'marin', log = () => {} }) {
  const inFlight = new Map();

  async function generateAudio(id) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const idea = await pool.query('SELECT label FROM adventure_ideas WHERE id = $1 AND active = TRUE', [id]);
    if (!idea.rowCount) return null;
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(narrationRequest({ style: 'playful', text: idea.rows[0].label, warmVoice: getWarmVoice() })),
    });
    if (!response.ok) { log('warn', 'adventure_audio_failed', { id, status: response.status }); return null; }
    const audio = Buffer.from(await response.arrayBuffer());
    await pool.query('UPDATE adventure_ideas SET audio = $2, audio_version = $3, audio_updated_at = NOW() WHERE id = $1', [id, audio, NARRATION_VERSION]);
    return audio;
  }

  // One generation at a time per card, even if several children tap it together.
  function ensureAudio(id) {
    if (!inFlight.has(id)) inFlight.set(id, generateAudio(id).finally(() => inFlight.delete(id)));
    return inFlight.get(id);
  }

  async function warmAudio() {
    try {
      const missing = await pool.query('SELECT id FROM adventure_ideas WHERE active = TRUE AND (audio IS NULL OR audio_version IS DISTINCT FROM $1) ORDER BY sort_order', [NARRATION_VERSION]);
      for (const row of missing.rows) await ensureAudio(row.id).catch(() => {});
    } catch (error) { log('warn', 'adventure_audio_warm_failed', { message: error.message }); }
  }

  function registerRoutes(app, { requireAuth, audioLimiter }) {
    app.get('/api/adventure-ideas', requireAuth, async (req, res, next) => {
      try {
        const { rows } = await pool.query('SELECT id, icon, label, prompt FROM adventure_ideas WHERE active = TRUE ORDER BY sort_order, id');
        return res.json({ ideas: rows });
      } catch (error) { return next(error); }
    });

    // Public on purpose: it is a few words of generic audio, and an <audio> tag cannot send a login header.
    app.get('/api/adventure-ideas/:id/audio', audioLimiter, async (req, res, next) => {
      try {
        const found = await pool.query('SELECT audio, audio_version FROM adventure_ideas WHERE id = $1 AND active = TRUE', [req.params.id]);
        if (!found.rowCount) return res.sendStatus(404);
        let audio = found.rows[0].audio_version === NARRATION_VERSION ? found.rows[0].audio : null;
        if (!audio) audio = await ensureAudio(req.params.id);
        if (!audio) return res.sendStatus(503);
        res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400', 'Content-Length': audio.length });
        return res.send(audio);
      } catch (error) { return next(error); }
    });
  }

  return { registerRoutes, warmAudio };
}
