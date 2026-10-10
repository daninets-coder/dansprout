// Estimated OpenAI costs, in US dollars, for the calls that do not return a bill.
// Prices checked against OpenAI's published pricing on 2026-10-10. They are ESTIMATES for the admin page.

// gpt-image-1, 1024x1024: flat price per image
const IMAGE_PRICES = {
  'gpt-image-1': { low: 0.011, medium: 0.042, high: 0.167 },
};

// gpt-image-2.5 models are billed per image output token ($30 per million, standard processing).
// A low-quality 1024x1024 picture used 196 tokens in our test (about $0.006).
const IMAGE_TOKEN_PRICE_PER_MILLION = {
  'gpt-image-2.5-flare': 30,
  'gpt-image-2.5-sunburst': 30,
};

// quality may be 'low' | 'medium' | 'high'. overrideUsd (> 0) wins, so the owner can set the price of any model.
// outputTokens is the usage OpenAI reports back; it prices the token-billed models.
export function estimateImageCost({ model, quality = 'low', overrideUsd = 0, outputTokens = null } = {}) {
  if (Number(overrideUsd) > 0) return Number(overrideUsd);
  const name = String(model || '').toLowerCase();
  const row = IMAGE_PRICES[name];
  if (row && row[quality] !== undefined) return row[quality];
  const perMillion = IMAGE_TOKEN_PRICE_PER_MILLION[name];
  if (perMillion && Number(outputTokens) > 0) return Math.round(Number(outputTokens) * perMillion) / 1e6;
  return null; // price unknown for this model
}

// gpt-4o-mini-tts is billed per token (text in $0.60/M, audio out $12/M). OpenAI estimates about
// 1.5 cents per minute of audio; about 150 spoken words per minute and 5.5 characters per word.
export function estimateSpeechCost(text) {
  const chars = String(text || '').length;
  if (!chars) return 0;
  const minutes = (chars / 5.5) / 150;
  return Math.round(minutes * 0.015 * 1e6) / 1e6;
}
