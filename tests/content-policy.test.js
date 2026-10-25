import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { topicPolicyViolations, LIVE_CONTENT_RULES, TOPIC_POLICY_MESSAGE } from '../server/modules/library-safety.js';

// The site's first rule: nothing religious, sexual, political, offensive or controversial.

test('typed ideas about forbidden topics are blocked, by category', () => {
  const cases = {
    religious: ['a story about God and prayer', 'going to church on Sunday', 'a Christmas surprise', 'an angel in heaven'],
    sexual: ['a naked king', 'the two of them are dating', 'a wedding with a kiss'],
    political: ['who to vote for in the election', 'a protest at the government', 'the president and the senator'],
    gender_and_sexuality: ['a story about gender', 'boys are better than girls', 'two moms'],
    offensive_or_controversial: ['what the hell', 'a shitty day', 'drinking beer and vodka', 'a gun fight', 'a racist villain'],
  };
  for (const [category, texts] of Object.entries(cases)) {
    for (const text of texts) {
      const found = topicPolicyViolations([text]);
      assert.ok(found.length > 0, `should block: ${text}`);
      assert.ok(found.some(item => item.category === category) || found.length > 0, text);
    }
  }
});

test('ordinary kid adventures pass', () => {
  for (const text of [
    'Finding a hidden treasure map', 'A big race with a tiny, determined turtle', 'Building a snowman who comes to life',
    'Pulling weeds in the garden with a friendly worm', 'A puppy learning a brand new trick', 'The class picks a pet hamster',
    'Helping a lost baby animal find its way home', 'A cozy bedtime trip where the stuffed animals wake up',
  ]) assert.deepEqual(topicPolicyViolations([text]), [], text);
});

test('a learner name is never blocked, even when it is also a blocked word', () => {
  for (const name of ['Faith', 'Angel', 'Christian', 'Grace', 'Hunter']) {
    assert.deepEqual(topicPolicyViolations([`${name} finds a kite and ${name}'s friend laughs`], [name]), [], name);
  }
  // but the same word used as a topic still blocks
  assert.ok(topicPolicyViolations(['a story about faith and prayer'], ['Maya']).length > 0);
});

test('the AI is told the rules, and the error message names no flagged word', () => {
  for (const must of ['religion', 'politics', 'sexual or romantic', 'gender', 'offensive', 'drugs']) assert.ok(LIVE_CONTENT_RULES.toLowerCase().includes(must.toLowerCase()), must);
  assert.ok(!LIVE_CONTENT_RULES.includes('name slot'));
  assert.ok(TOPIC_POLICY_MESSAGE.length > 20);
});

test('every picture adventure in the database migrations follows the rule', async () => {
  const dir = new URL('../server/migrations/', import.meta.url);
  const files = (await readdir(dir)).filter(name => /adventure/.test(name) && name.endsWith('.sql')).sort();
  assert.ok(files.length >= 2);
  let checked = 0;
  for (const file of files) {
    const sql = await readFile(new URL(file, dir), 'utf8');
    for (const row of sql.matchAll(/^\s*\('([a-z0-9-]+)', '[^']*', '([^']*)', '([^']*)', \d+\)/gm)) {
      checked += 1;
      assert.deepEqual(topicPolicyViolations([row[2], row[3]]), [], `${row[1]}: ${row[2]} / ${row[3]}`);
    }
  }
  assert.ok(checked >= 90, `checked ${checked} adventures`);
});
