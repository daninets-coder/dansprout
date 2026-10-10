import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateImageCost, estimateSpeechCost } from '../server/modules/ai-costs.js';
import { validateSetting, SETTING_DEFS } from '../server/modules/settings.js';

test('picture cost: known model price, unknown model is null, override wins', () => {
  assert.equal(estimateImageCost({ model: 'gpt-image-1', quality: 'low' }), 0.011);
  assert.equal(estimateImageCost({ model: 'gpt-image-1', quality: 'medium' }), 0.042);
  assert.equal(estimateImageCost({ model: 'gpt-image-1', quality: 'high' }), 0.167);
  assert.equal(estimateImageCost({ model: 'gpt-image-2.5-flare', quality: 'low' }), null); // no usage reported, no flat price
  assert.equal(estimateImageCost({ model: 'gpt-image-2.5-flare', quality: 'low', outputTokens: 196 }), 0.00588); // $30 per million tokens
  assert.equal(estimateImageCost({ model: 'some-future-model', quality: 'low', outputTokens: 196 }), null);
  assert.equal(estimateImageCost({ model: 'gpt-image-2.5-flare', quality: 'low', overrideUsd: 0.02 }), 0.02);
});

test('narration cost: about 1.5 cents per spoken minute', () => {
  assert.equal(estimateSpeechCost(''), 0);
  const oneMinute = 'a'.repeat(Math.round(150 * 5.5)); // about one minute of speech
  assert.ok(Math.abs(estimateSpeechCost(oneMinute) - 0.015) < 0.0005);
  assert.ok(estimateSpeechCost('brave') < 0.0005);
});

test('picture settings validate: model name pattern, quality choice, on/off, decimal price', () => {
  assert.equal(validateSetting('image_model', 'GPT-Image-2.5-Flare').value, 'gpt-image-2.5-flare');
  assert.equal(validateSetting('image_model', 'bad model!').ok, false);
  assert.equal(validateSetting('image_model', '../etc').ok, false);
  assert.equal(validateSetting('image_quality', 'high').ok, true);
  assert.equal(validateSetting('image_quality', 'ultra').ok, false);
  assert.equal(validateSetting('illustrations_enabled', 'off').ok, true);
  assert.equal(validateSetting('image_cost_usd', '0.0123').value, 0.0123);
  assert.equal(validateSetting('image_cost_usd', -1).ok, false);
  for (const [key, def] of Object.entries(SETTING_DEFS)) assert.equal(validateSetting(key, def.fallback).ok, true, key);
});

import { narrationRequest, NARRATION_VERSION } from '../server/modules/narration-voices.js';

test('narration requests carry a voice and a reading direction', () => {
  const warm = narrationRequest({ style: 'warm', text: 'Hello there.', warmVoice: 'marin' });
  assert.equal(warm.model, 'gpt-4o-mini-tts');
  assert.equal(warm.voice, 'marin');
  assert.match(warm.instructions, /never sound robotic/i);
  assert.equal(narrationRequest({ style: 'warm', text: 'x', warmVoice: 'cedar' }).voice, 'cedar'); // the setting changes the warm voice
  assert.equal(narrationRequest({ style: 'calm', text: 'x' }).voice, 'cedar');
  assert.equal(narrationRequest({ style: 'playful', text: 'x' }).voice, 'coral');
  assert.equal(narrationRequest({ style: 'nonsense', text: 'x', warmVoice: 'marin' }).voice, 'marin'); // unknown style falls back to warm
  assert.equal(narrationRequest({ style: 'warm', text: 'Hi.' }).input, 'Hi.');
  assert.ok(NARRATION_VERSION);
  assert.equal(validateSetting('narration_voice', 'Marin').value, 'marin');
  assert.equal(validateSetting('narration_voice', 'bad voice!').ok, false);
});
