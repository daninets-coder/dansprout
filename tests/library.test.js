import test from 'node:test';
import assert from 'node:assert/strict';
import { blockedTopicMatches } from '../server/modules/library-safety.js';
import { cleanName, renderTemplate, slotsIn, slotProblems, defaultRender } from '../server/modules/library-slots.js';

test('safety filter catches each blocked topic', () => {
  const cases = {
    religious: 'They said a prayer in the church before Christmas.',
    political: 'The president asked everyone to vote in the election.',
    sexual: 'The two had a romantic wedding and a kiss.',
    gender_and_sexuality: 'It was a story about gender and two moms.',
  };
  for (const [category, text] of Object.entries(cases)) {
    const found = blockedTopicMatches(text);
    assert.ok(found.some(f => f.category === category), `${category}: ${JSON.stringify(found)}`);
  }
  assert.ok(blockedTopicMatches('Girls are better at this than boys.').length > 0);
  assert.ok(blockedTopicMatches('Mia’s mom and dad said "God bless you".').length > 0); // curly apostrophes are handled
});

test('safety filter lets ordinary gentle stories through (no false alarms on common words)', () => {
  const good = [
    'Mia found a little lantern in the garden. The lantern glowed when she helped a friend carry the basket.',
    'Pip the fox and the robot looked at the map under the bench. They began to follow the river to the old oak tree.',
    'It was a sunny birthday afternoon. They shared a cake, played a game, and went home happy and tired.',
    'The class talked about the moon, the stars, and how plants grow. Everyone listened to the new word: curious.',
    'Please wait your turn, said the teacher. The dragon smiled and the party began.', // "party" and "dragon" are fine
  ];
  for (const text of good) assert.deepEqual(blockedTopicMatches(text), [], text);
});

test('names are cleaned and validated', () => {
  assert.equal(cleanName('  Maya  '), 'Maya');
  assert.equal(cleanName("D'Angelo"), "D'Angelo");
  assert.equal(cleanName('Mary-Jane'), 'Mary-Jane');
  assert.equal(cleanName('José'), 'José');
  assert.equal(cleanName('አበበ'), 'አበበ'); // letters from any language are fine
  for (const bad of ['', '   ', '1234', '<script>', 'Max{child}', 'x'.repeat(31), 'a\nb\tc'.replace(/\s/g, '') + '!', '-dash', null]) {
    assert.equal(cleanName(bad), null, String(bad));
  }
});

test('templates fill slots and refuse bad input', () => {
  assert.deepEqual(slotsIn('{child} met {friend} and {child} waved'), ['child', 'friend', 'child']);
  assert.equal(renderTemplate('{child} and {friend} ran home.', { child: 'Maya', friend: 'Leo' }), 'Maya and Leo ran home.');
  assert.throws(() => renderTemplate('{child} ran.', { child: '<b>hi</b>' }));
  assert.throws(() => renderTemplate('{child} and {friend} ran.', { child: 'Maya' }));
  assert.throws(() => renderTemplate('{hero} ran.', { child: 'Maya' }));
});

const goodStory = () => ({
  title: 'The Lantern of Little Wishes',
  defaultNames: { child: 'Mia', friend: 'Leo' },
  solo: { pages: ['{child} found a lantern with Pip the fox.', 'Pip and {child} followed its glow home.', '{child} smiled at the warm light.'] },
  duo: { pages: ['{child} and {friend} found a lantern.', '{child} and {friend} followed its glow home.', 'They smiled at the warm light.'] },
  questions: [{ prompt: 'What did Pip help find?', options: ['A lantern', 'A boat'], answer: 'A lantern' }],
  words: [{ word: 'glow', meaning: 'A soft light.', example: 'The glow was warm.' }],
});

test('slot rules: a well-formed story passes, and each rule is enforced', () => {
  assert.deepEqual(slotProblems(goodStory()), []);
  const noFriend = goodStory(); noFriend.duo.pages = ['{child} found a lantern.'];
  assert.ok(slotProblems(noFriend).some(p => /both/.test(p)));
  const friendInSolo = goodStory(); friendInSolo.solo.pages.push('{friend} waved.');
  assert.ok(slotProblems(friendInSolo).some(p => /must not use \{friend\}/.test(p)));
  const slotInQuestion = goodStory(); slotInQuestion.questions[0].prompt = 'What did {child} find?';
  assert.ok(slotProblems(slotInQuestion).some(p => /must not contain name slots/.test(p)));
  const unknown = goodStory(); unknown.solo.pages[0] = '{hero} found a lantern with {child}.';
  assert.ok(slotProblems(unknown).some(p => /Unknown slot/.test(p)));
});

test('default rendering fills the slots with the default names', () => {
  assert.equal(defaultRender(goodStory(), 'solo')[0], 'Mia found a lantern with Pip the fox.');
  assert.equal(defaultRender(goodStory(), 'duo')[1], 'Mia and Leo followed its glow home.');
});

import { buildPlan, validateLibraryStory, writerPrompt, GRADES, DOMAINS, THEMES } from '../server/modules/library-build.js';

const spec = () => buildPlan(1)[0]; // PreK
const goodRaw = () => ({
  title: 'The Lantern in the Garden',
  solo: { pages: ['{child} found a lantern in the garden. It was small and round.', `It glowed by the gate. ${spec().companion} came to see. The glow was soft and kind.`, '{child} smiled at the warm light. {child} took the lantern home.'] },
  duo: { pages: ['{child} and {friend} found a lantern in the garden. It was small and round.', `It glowed by the gate. ${spec().companion} came to see. The glow was soft and kind.`, 'They smiled at the warm light. They took the lantern home.'] },
  questions: [
    { prompt: 'What was found?', options: ['A lantern', 'A boat'], answer: 'A lantern', evidence: 'found a lantern in the garden' },
    { prompt: 'Where did it glow?', options: ['By the gate', 'In the sea'], answer: 'By the gate', evidence: 'glowed by the gate' },
    { prompt: 'How did the light feel?', options: ['Warm', 'Cold'], answer: 'Warm', evidence: 'the warm light' },
  ],
  words: [{ word: 'lantern', meaning: 'A light you can carry.', example: 'She held the lantern up.' }, { word: 'glowed', meaning: 'Shone softly.', example: 'The moon glowed.' }, { word: 'warm', meaning: 'A little hot, in a nice way.', example: 'The soup is warm.' }],
  scene: 'A garden gate at dusk with a glowing lantern and a friendly animal beside it.',
});

test('the plan covers every grade, reading focus and world, and has no repeated slug', () => {
  const plan = buildPlan(100);
  assert.equal(plan.length, 100);
  assert.equal(new Set(plan.map(p => p.slug)).size, 100);
  for (const g of GRADES) assert.ok(plan.filter(p => p.grade === g).length >= 14, g);
  assert.equal(new Set(plan.map(p => p.domain)).size, DOMAINS.length);
  assert.equal(new Set(plan.map(p => p.theme)).size, THEMES.length);
  assert.ok(new Set(plan.map(p => p.premise)).size >= 48, 'premises are rarely reused');
  assert.ok(plan.every(p => p.companion && p.defaultNames.child && p.defaultNames.friend));
});

test('writer instructions contain the content rules, the slots and the problems to fix', () => {
  const text = writerPrompt(spec(), { objective: 'Name the characters and the setting.' }, ['The duo version has 40 words; it needs 30-90.']);
  assert.match(text, /religion of any kind/);
  assert.match(text, /\{child\}/);
  assert.match(text, /\{friend\}/);
  assert.match(text, /The duo version has 40 words/);
  assert.match(text, /No holidays at all/);
});

test('a well-formed story passes validation', () => {
  const { story, problems } = validateLibraryStory(goodRaw(), spec());
  assert.deepEqual(problems, []);
  assert.equal(story.questions.length, 3);
});

test('validation rejects blocked topics, slot mistakes, bad evidence and wrong sizes', () => {
  const bad = (mutate) => { const raw = goodRaw(); mutate(raw); return validateLibraryStory(raw, spec()).problems.join(' | '); };
  assert.match(bad(r => { r.solo.pages[1] = 'It glowed by the gate and they said a prayer.'; }), /blocked topic word \(religious\)/);
  assert.match(bad(r => { r.duo.pages[0] = '{child} found a lantern.'; }), /both \{child\} and \{friend\}/);
  assert.match(bad(r => { r.questions[0].prompt = 'What did {child} find?'; }), /must not contain name slots/);
  assert.match(bad(r => { r.questions[1].evidence = 'glowed in the sea'; }), /not an exact quote/);
  assert.match(bad(r => { r.questions.pop(); }), /exactly 3 questions/);
  assert.match(bad(r => { r.questions[0].answer = 'A truck'; }), /answer/i);
  assert.match(bad(r => { r.solo.pages = ['{child} ran.', 'Yes.', 'Fun.', 'Done.', 'End.']; }), /pages/);
  assert.match(bad(r => { r.words[0].word = 'rocket'; }), /does not appear/);
  assert.match(bad(r => { r.scene = ''; }), /scene/);
  assert.match(bad(r => { r.duo.pages.pop(); r.duo.pages.pop(); r.duo.pages.push('{child} and {friend} slept.'); }), /same number of pages|words|pages/);
});
