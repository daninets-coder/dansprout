-- Old picture and narration calls were saved without a cost, so the admin page undercounted AI spend.
-- Fill them in with estimates (new calls record their own estimate).
--   pictures: gpt-image-1 at low quality was $0.011 each (OpenAI list price)
--   narration: input_tokens holds the number of characters spoken; about 1.5 cents per spoken minute,
--              150 words a minute and 5.5 characters a word
UPDATE ai_invocations SET estimated_cost_usd = 0.011
 WHERE model = 'gpt-image-1' AND estimated_cost_usd IS NULL;

UPDATE ai_invocations SET estimated_cost_usd = ROUND((input_tokens / 5.5 / 150.0 * 0.015)::numeric, 6)
 WHERE model = 'gpt-4o-mini-tts' AND estimated_cost_usd IS NULL AND input_tokens IS NOT NULL;
