// Builds the pre-made story library: writes stories, makes one picture each, and records the voices.
//
//   node server/tools/build-library.mjs --count 100 --budget 7
//   node server/tools/build-library.mjs --count 2 --budget 0.5 --dry-run      (plan only, no OpenAI calls)
//
// Options: --count N  --budget USD  --start I (skip the first I planned stories)  --workers N  --writer MODEL  --no-image  --no-audio  --dry-run
// Needs OPENAI_API_KEY and DATABASE_URL (loaded from .env locally). Files go to STORAGE_DIR/library/<story id>/.
// Safe to re-run: stories that already exist (by slug) are skipped. It stops by itself when the budget is reached.
import 'dotenv/config';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
import { buildPlan, writerPrompt, validateLibraryStory, storyText } from '../modules/library-build.js';
import { defaultRender } from '../modules/library-slots.js';
import { illustrationPrompt } from '../modules/image-styles.js';
import { estimateImageCost, estimateSpeechCost } from '../modules/ai-costs.js';
import { createSettingsStore } from '../modules/settings.js';
import { narrationRequest } from '../modules/narration-voices.js';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const COUNT = Number(option('count', 100));
const BUDGET = Number(option('budget', 7));
const START = Number(option('start', 0));
const WORKERS = Math.max(1, Math.min(6, Number(option('workers', 3))));
const DRY = flag('dry-run');
const WITH_IMAGE = !flag('no-image');
const WITH_AUDIO = !flag('no-audio');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storageDir = path.resolve(process.env.STORAGE_DIR || rootDir);
const libraryDir = path.join(storageDir, 'library');
const apiKey = process.env.OPENAI_API_KEY;
const WRITER_MODEL = option('writer', 'gpt-6-luna');
// price per million tokens (input, output) for the models we know; gpt-6-luna and gpt-4o-mini were measured in tests on 2026-10-10
const WRITER_PRICES = { 'gpt-6-luna': [0.1, 0.5], 'gpt-6.1-sol': [2, 10], 'gpt-4o-mini': [0.15, 0.6] };

// settings (picture model, quality, style) come from the same place as the live app: database, then config file, then default
let fileDefaults = {};
try { fileDefaults = JSON.parse((await import('node:fs')).readFileSync(path.join(rootDir, 'config', 'settings.json'), 'utf8')); } catch { /* optional */ }
const settings = createSettingsStore(pool, { fileDefaults });
await settings.load().catch(() => {});
const IMAGE_MODEL = settings.get('image_model');
const IMAGE_QUALITY = settings.get('image_quality');
const IMAGE_STYLE = settings.get('image_style');
const VOICE = settings.get('narration_voice');

const log = (...parts) => console.log(new Date().toISOString().slice(11, 19), ...parts);
let spent = 0;
const inflightReserve = new Map();
const reserved = () => [...inflightReserve.values()].reduce((a, b) => a + b, 0);
const PER_STORY_RESERVE = 0.06; // generous estimate of one story's full cost, used to decide whether another can start

async function recordCost(model, inputTokens, outputTokens, cost) {
  spent += cost || 0;
  try {
    await pool.query('INSERT INTO ai_invocations (id, account_id, story_id, provider, model, input_tokens, output_tokens, estimated_cost_usd) VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6)',
      [randomUUID(), 'openai', model, inputTokens ?? null, outputTokens ?? null, cost ?? null]);
  } catch (error) { log('cost log failed:', error.message); }
}

async function openai(pathname, body) {
  const response = await fetch(`https://api.openai.com/v1/${pathname}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body),
  });
  return response;
}

async function writeStory(spec, curriculum, problems) {
  const body = {
    model: WRITER_MODEL, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a children\'s picture-book author who writes calm, kind, simple read-aloud stories. You always reply with one valid JSON object.' },
      { role: 'user', content: writerPrompt(spec, curriculum, problems) },
    ],
  };
  let response = await openai('chat/completions', { ...body, temperature: 0.85 });
  if (response.status === 400) response = await openai('chat/completions', body); // some models do not accept a temperature
  if (!response.ok) throw new Error(`writer HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  const usage = payload.usage || {};
  const [inPrice, outPrice] = WRITER_PRICES[WRITER_MODEL] || WRITER_PRICES['gpt-6.1-sol']; // unknown model: assume the dearer price
  await recordCost(WRITER_MODEL, usage.prompt_tokens, usage.completion_tokens, ((usage.prompt_tokens || 0) * inPrice + (usage.completion_tokens || 0) * outPrice) / 1e6);
  return JSON.parse(payload.choices?.[0]?.message?.content || '{}');
}

async function moderate(text) {
  const response = await openai('moderations', { model: 'omni-moderation-latest', input: text });
  if (!response.ok) throw new Error(`moderation HTTP ${response.status}`);
  const result = (await response.json()).results?.[0];
  return { flagged: Boolean(result?.flagged), categories: Object.entries(result?.categories || {}).filter(([, v]) => v).map(([k]) => k) };
}

async function makePicture(spec, story, dir) {
  const prompt = illustrationPrompt({ style: IMAGE_STYLE, setting: spec.theme, scene: story.scene, noPeople: true });
  const response = await openai('images/generations', { model: IMAGE_MODEL, prompt, size: '1024x1024', quality: IMAGE_QUALITY, n: 1 });
  if (!response.ok) throw new Error(`image HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error('image: no picture returned');
  writeFileSync(path.join(dir, 'cover.png'), Buffer.from(b64, 'base64'));
  await recordCost(IMAGE_MODEL, payload.usage?.input_tokens, payload.usage?.output_tokens,
    estimateImageCost({ model: IMAGE_MODEL, quality: IMAGE_QUALITY, overrideUsd: settings.get('image_cost_usd'), outputTokens: payload.usage?.output_tokens }) ?? 0.011);
}

async function speak(text, file) {
  const response = await openai('audio/speech', narrationRequest({ style: 'warm', text, warmVoice: VOICE }));
  if (!response.ok) throw new Error(`speech HTTP ${response.status}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  await recordCost('gpt-4o-mini-tts', text.length, null, estimateSpeechCost(text));
}

async function buildOne(spec, runId) {
  const existing = await pool.query('SELECT 1 FROM library_stories WHERE slug = $1', [spec.slug]);
  if (existing.rowCount) { log(spec.slug, 'already exists, skipped'); return 'skipped'; }
  const curriculumRes = await pool.query('SELECT standard_code, objective FROM curriculum_tracks WHERE grade_level = $1 AND domain = $2 ORDER BY standard_code LIMIT 1', [spec.grade, spec.domain]);
  const curriculum = curriculumRes.rows[0] ? { standard: curriculumRes.rows[0].standard_code, objective: curriculumRes.rows[0].objective } : null;
  const costBefore = spent;

  // 1. write, check, and retry with the problems listed (at most 3 attempts)
  let story = null; let problems = []; let attempts = 0; let moderation = null;
  while (attempts < 3 && !story) {
    attempts += 1;
    let raw;
    try { raw = await writeStory(spec, curriculum, problems); } catch (error) { problems = [`The reply could not be read: ${error.message}`]; continue; }
    const result = validateLibraryStory(raw, spec);
    problems = result.problems;
    if (!problems.length) {
      moderation = await moderate(storyText(result.story));
      if (moderation.flagged) { problems = [`Moderation flagged the story (${moderation.categories.join(', ')}).`]; continue; }
      story = result.story;
    }
  }
  if (!story) { log(spec.slug, 'FAILED after', attempts, 'attempts:', problems.join(' | ').slice(0, 300)); return 'failed'; }

  // 2. save the story (draft), then add the picture and the voices
  const id = randomUUID();
  const dir = path.join(libraryDir, id);
  mkdirSync(dir, { recursive: true });
  const assets = { cover: null, pages: [], questions: [], words: {} };
  try {
    if (WITH_IMAGE && apiKey) { await makePicture(spec, story, dir); assets.cover = `/library/${id}/cover.png`; }
    if (WITH_AUDIO && apiKey) {
      const pages = defaultRender(story, 'solo');
      for (let i = 0; i < pages.length; i += 1) { await speak(pages[i], path.join(dir, `p${i + 1}.mp3`)); assets.pages.push(`/library/${id}/p${i + 1}.mp3`); }
      for (let i = 0; i < story.questions.length; i += 1) {
        const q = story.questions[i];
        await speak(`${q.prompt} ${q.options.join(', or ')}?`, path.join(dir, `q${i + 1}.mp3`));
        assets.questions.push(`/library/${id}/q${i + 1}.mp3`);
      }
      mkdirSync(path.join(libraryDir, 'words'), { recursive: true });
      for (const w of story.words) {
        const key = createHash('sha1').update(`${w.word.toLowerCase()}|${w.meaning}`).digest('hex').slice(0, 20);
        const file = path.join(libraryDir, 'words', `${key}.mp3`);
        if (!existsSync(file)) await speak(`${w.word}. ${w.meaning}`, file);
        assets.words[w.word] = `/library/words/${key}.mp3`;
      }
    }
  } catch (error) {
    log(spec.slug, 'asset step failed (the story is still saved as a draft):', error.message);
    assets.error = error.message;
  }

  const cost = Math.round((spent - costBefore) * 1e6) / 1e6; // approximate when stories run in parallel
  await pool.query(
    `INSERT INTO library_stories (id, slug, title, grade_level, age_band, domain, theme, story_length, status, content, assets, checks, cost_usd, curriculum_standard, curriculum_objective)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14)`,
    [id, spec.slug, story.title, spec.grade, spec.ageBand, spec.domain, spec.theme, spec.length, JSON.stringify(story), JSON.stringify(assets),
      JSON.stringify({ attempts, topicCheck: 'clean', moderation, writer: WRITER_MODEL, imageModel: IMAGE_MODEL, imageStyle: IMAGE_STYLE, voice: VOICE }), cost, curriculum?.standard || null, curriculum?.objective || null]);
  log(spec.slug, 'ok:', story.title, `($${cost.toFixed(4)})`);
  return 'created';
}

// ---------------------------------------------------------------------------------------------------
const plan = buildPlan(START + COUNT).slice(START);
log(`plan: ${plan.length} stories, budget $${BUDGET}, writer ${WRITER_MODEL}, pictures ${IMAGE_MODEL}/${IMAGE_QUALITY}/${IMAGE_STYLE}, voice ${VOICE}, storage ${libraryDir}`);
if (DRY) {
  for (const s of plan.slice(0, 12)) log(`${s.slug} grade ${s.grade} | ${s.domain} | ${s.theme} | ${s.length} | ${s.companion} | "${s.premise}"`);
  log('dry run: nothing written'); await pool.end(); process.exit(0);
}
if (!apiKey) { log('OPENAI_API_KEY is not set'); process.exit(1); }

const runId = randomUUID();
await pool.query('INSERT INTO library_build_runs (id, requested, budget_usd, image_model, image_style) VALUES ($1, $2, $3, $4, $5)', [runId, plan.length, BUDGET, IMAGE_MODEL, IMAGE_STYLE]);
const counts = { created: 0, failed: 0, skipped: 0 };
let next = 0; let stoppedForBudget = false;
async function worker(n) {
  while (true) {
    if (spent + reserved() + PER_STORY_RESERVE > BUDGET) { stoppedForBudget = true; return; }
    const spec = plan[next]; next += 1;
    if (!spec) return;
    inflightReserve.set(spec.slug, PER_STORY_RESERVE);
    try { counts[await buildOne(spec, runId)] += 1; }
    catch (error) { counts.failed += 1; log(spec.slug, 'ERROR', error.message); }
    finally { inflightReserve.delete(spec.slug); }
    await pool.query('UPDATE library_build_runs SET created = $2, failed = $3, skipped = $4, cost_usd = $5 WHERE id = $1', [runId, counts.created, counts.failed, counts.skipped, spent.toFixed(6)]);
    log(`progress: ${counts.created} created, ${counts.failed} failed, ${counts.skipped} skipped, spent $${spent.toFixed(3)} of $${BUDGET}`);
  }
}
await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
await pool.query('UPDATE library_build_runs SET finished_at = NOW(), created = $2, failed = $3, skipped = $4, cost_usd = $5, note = $6 WHERE id = $1',
  [runId, counts.created, counts.failed, counts.skipped, spent.toFixed(6), stoppedForBudget ? 'stopped: budget reached' : 'finished']);
log(`DONE: ${counts.created} created, ${counts.failed} failed, ${counts.skipped} skipped, total spend about $${spent.toFixed(3)}${stoppedForBudget ? ' (stopped at the budget)' : ''}`);
await pool.end();
