// Planning, writing instructions and validation for building the pre-made story library.
// The tool that calls OpenAI lives in server/tools/build-library.mjs; everything here is plain logic and is unit tested.
import { storyQualityIssues } from '../story-quality.js';
import { blockedTopicMatches, CONTENT_RULES_FOR_PROMPT } from './library-safety.js';
import { slotProblems, defaultRender, slotsIn } from './library-slots.js';

export const GRADES = ['PreK', 'K', '1', '2', '3', '4', '5'];
export const AGE_BAND = { PreK: '3-5', K: '3-5', '1': '6-8', '2': '6-8', '3': '6-8', '4': '9-11', '5': '9-11' };
export const DOMAINS = ['comprehension', 'vocabulary', 'fluency', 'phonics', 'oral_language', 'writing_response', 'social_emotional_reading'];
export const THEMES = ['Moonlight', 'Rainforest', 'Ocean', 'Castle', 'Garden', 'Sky', 'Space', 'Dinosaurs', 'Arctic', 'Farm', 'City', 'Jungle', 'Desert', 'Underwater', 'Mystery'];

const COMPANIONS = ['Pip the fox', 'Bolt the robot', 'Dot the ladybug', 'Moss the turtle', 'Nova the owl', 'Biscuit the puppy', 'Fizz the frog', 'Maple the squirrel', 'Echo the bunny', 'Pebble the hedgehog', 'Zip the bee', 'Willow the deer'];
const DEFAULT_CHILD_NAMES = ['Sam', 'Alex', 'Kai', 'Robin', 'Jules', 'Taylor'];
const DEFAULT_FRIEND_NAMES = ['Riley', 'Casey', 'Quinn', 'Jamie', 'Avery', 'Morgan'];

// Gentle story ideas. None is religious, political, romantic or about holidays.
const PREMISES = [
  'finding a glowing map under a bench', 'a lost kite that needs to get home', 'planting a tiny seed and waiting for it to grow', 'a puddle that becomes a pretend pond',
  'a shy firefly that learns to shine', 'baking bread for a neighbor', 'a hidden little door at the bottom of a tree', 'a talking stone that only knows one word',
  'building a bridge out of leaves', 'a cloud that is too heavy to float', 'sharing the last berry', 'a lighthouse that lost its light', 'a music box that plays by itself',
  'a snowman who wants to see the sea', 'a boat made from a boot', 'a garden where the flowers answer back', 'the smallest star learning to twinkle',
  'a rainy day with a very big umbrella', 'a treehouse that needs a new rope', 'a lantern that glows when someone is kind', 'a snail racing to a birthday picnic',
  'a robot learning how to whistle', 'a picnic where the sandwiches roll away', 'a quiet cave full of echoes', 'a squirrel who forgot where the nuts are',
  'a paper airplane that wants to go far', 'a pond that needs cleaning up', 'a lost button with a big adventure', 'the first snow of the year',
  'a scarecrow who gets a new hat', 'a turtle who is never in a hurry', 'a library with a sleepy book', 'a tiny boat on a big river', 'a sandcastle against the tide',
  'a moon that follows a child home', 'a mystery of missing socks', 'a train that whistles a tune', 'a wagon full of apples', 'a pillow fort for a rainy afternoon',
  'a beehive that needs a new home', 'a rocket made from a cardboard box', 'a sunflower that follows the sun', 'a big storm that turns out to be thunder and giggles',
  'a market where everything is round', 'a river that sings', 'a shell that holds the sound of the sea', 'a blanket that is big enough for everyone',
  'a flashlight that finds a surprise', 'a clock that runs backwards for one afternoon', 'a puppet show for the farm animals',
];

const GRADE_PROFILES = {
  PreK: { sentences: 'Very short sentences (3-6 words) with repetition.', words: [30, 90], pages: [3, 3] },
  K: { sentences: 'Short sentences (4-8 words), simple actions.', words: [45, 110], pages: [3, 4] },
  '1': { sentences: 'Short sentences (5-10 words), one idea each.', words: [70, 160], pages: [3, 4] },
  '2': { sentences: 'Short-to-medium sentences (6-12 words).', words: [100, 230], pages: [3, 4] },
  '3': { sentences: 'Mixed sentence lengths (8-14 words), clear and direct.', words: [130, 280], pages: [3, 5] },
  '4': { sentences: 'Medium sentences (9-16 words) with varied structure and some inference.', words: [160, 340], pages: [3, 5] },
  '5': { sentences: 'Medium sentences (10-18 words), an occasional complex sentence, explained new words.', words: [190, 400], pages: [3, 5] },
};

const wordCount = text => String(text || '').trim().split(/\s+/).filter(Boolean).length;

export function gradeProfile(grade) {
  return GRADE_PROFILES[grade] || GRADE_PROFILES['2'];
}

// A balanced plan: every grade, reading focus and world gets used, and no two stories share a premise until the list runs out.
export function buildPlan(count) {
  const plan = [];
  for (let i = 0; i < count; i += 1) {
    const round = Math.floor(i / GRADES.length);
    const grade = GRADES[i % GRADES.length];
    plan.push({
      index: i,
      slug: `lib-${String(i + 1).padStart(3, '0')}`,
      grade,
      ageBand: AGE_BAND[grade],
      domain: DOMAINS[(i + round) % DOMAINS.length],
      theme: THEMES[(i * 4 + round) % THEMES.length],
      length: grade === 'PreK' || grade === 'K' ? 'quick' : (i % 2 === 0 ? 'quick' : 'standard'),
      premise: PREMISES[i % PREMISES.length],
      companion: COMPANIONS[i % COMPANIONS.length],
      defaultNames: { child: DEFAULT_CHILD_NAMES[i % DEFAULT_CHILD_NAMES.length], friend: DEFAULT_FRIEND_NAMES[(i + 2) % DEFAULT_FRIEND_NAMES.length] },
    });
  }
  return plan;
}

export function writerPrompt(spec, curriculum, problems = []) {
  const profile = gradeProfile(spec.grade);
  const pageRange = profile.pages[0] === profile.pages[1] ? `${profile.pages[0]}` : `${profile.pages[0]}-${profile.pages[1]}`;
  const objective = curriculum?.objective ? `Reading skill to support: ${curriculum.objective}` : `Reading focus: ${spec.domain.replace(/_/g, ' ')}.`;
  const fix = problems.length ? `\nYour previous attempt had these problems. Fix every one of them:\n- ${problems.join('\n- ')}\n` : '';
  return [
    `Write a short read-aloud story for a child in grade ${spec.grade === 'PreK' ? 'Pre-K' : spec.grade} (ages ${spec.ageBand}).`,
    `World: ${spec.theme}. Story idea: ${spec.premise}. The hero's companion is ${spec.companion} (a fixed character, always called by that exact name).`,
    objective,
    `Style: ${profile.sentences} Use friendly, concrete words. ${pageRange} short pages, ${profile.words[0]}-${profile.words[1]} words in total for each version.`,
    CONTENT_RULES_FOR_PROMPT,
    '',
    'NAME SLOTS. The story is personalized later. Write the child hero as the slot {child} (never a real name). Write every story twice with the SAME plot and the SAME number of pages:',
    `- "solo": {child} and ${spec.companion}. Use only the slot {child}.`,
    `- "duo": {child}, a second child written as the slot {friend}, and ${spec.companion}. Use both {child} and {friend}; use "they" or "their" for the two children together, and keep the grammar correct for two.`,
    'Never use he, she, him or her for {child} or {friend}. Use the name slot, or singular "they"/"their". Name slots must never appear anywhere except the story pages.',
    '',
    'QUESTIONS (exactly 3, multiple choice with 2 or 3 options). They must be answerable from BOTH versions, so ask about what, where, why or how (you may use the companion\'s fixed name), never about {child} or {friend}. No name slots in questions or answers. Each question has an "evidence" string: an exact slot-free phrase copied word for word from one page of the "solo" version. The answer must be exactly one of the options.',
    'WORDS (3 to 5): words that really appear in the story pages, each with a simple child-friendly "meaning" and a short "example" sentence. No name slots.',
    'SCENE: one sentence describing a single picture for the story: the setting, the key object and the companion, with NO people, children or faces.',
    fix,
    'Reply with ONE JSON object and nothing else, with exactly these keys:',
    '{"title": "...(no slots)", "solo": {"pages": ["..."]}, "duo": {"pages": ["..."]}, "questions": [{"prompt": "...", "options": ["...", "..."], "answer": "...", "evidence": "..."}], "words": [{"word": "...", "meaning": "...", "example": "..."}], "scene": "..."}',
  ].join('\n');
}

const textOfStory = story => [
  story.title,
  ...(story.solo?.pages || []), ...(story.duo?.pages || []),
  ...(story.questions || []).flatMap(q => [q.prompt, q.answer, q.evidence, ...(q.options || [])]),
  ...(story.words || []).flatMap(w => [w.word, w.meaning, w.example]),
  story.scene,
].filter(Boolean).join('\n');

export function storyText(story) {
  return textOfStory(story);
}

// Returns { story, problems }. story is the cleaned content when problems is empty.
export function validateLibraryStory(raw, spec) {
  const problems = [];
  const profile = gradeProfile(spec.grade);
  const asArray = value => (Array.isArray(value) ? value : []);
  const str = value => (typeof value === 'string' ? value.trim() : '');

  const story = {
    title: str(raw?.title),
    companion: spec.companion,
    defaultNames: spec.defaultNames,
    solo: { pages: asArray(raw?.solo?.pages).map(str) },
    duo: { pages: asArray(raw?.duo?.pages).map(str) },
    questions: asArray(raw?.questions).map(q => ({
      type: 'multiple_choice', prompt: str(q?.prompt), options: asArray(q?.options).map(str), answer: str(q?.answer), evidence: str(q?.evidence),
    })),
    words: asArray(raw?.words).map(w => ({ word: str(w?.word), meaning: str(w?.meaning), example: str(w?.example) })),
    scene: str(raw?.scene),
  };

  if (!story.title || story.title.length > 80) problems.push('The title is missing or too long.');
  if (!story.scene) problems.push('The picture scene is missing.');
  const [minPages, maxPages] = profile.pages;
  for (const key of ['solo', 'duo']) {
    const pages = story[key].pages;
    if (pages.length < minPages || pages.length > maxPages) problems.push(`The ${key} version needs ${minPages}${minPages === maxPages ? '' : `-${maxPages}`} pages, it has ${pages.length}.`);
    const total = pages.reduce((sum, page) => sum + wordCount(page), 0);
    if (total < profile.words[0] || total > profile.words[1]) problems.push(`The ${key} version has ${total} words; it needs ${profile.words[0]}-${profile.words[1]}.`);
  }
  if (story.solo.pages.length !== story.duo.pages.length) problems.push('The solo and duo versions must have the same number of pages.');
  if (story.questions.length !== 3) problems.push('There must be exactly 3 questions.');
  if (story.words.length < 3 || story.words.length > 5) problems.push('There must be 3 to 5 words.');

  problems.push(...slotProblems(story));

  // evidence must be a slot-free quote from the solo pages (checked here because the shared quality check expects one rendered version)
  const soloText = story.solo.pages.join(' ').toLowerCase();
  story.questions.forEach((q, i) => {
    if (!q.evidence) problems.push(`Question ${i + 1} needs an evidence quote.`);
    else if (slotsIn(q.evidence).length) problems.push(`Question ${i + 1} evidence must not contain a name slot.`);
    else if (!soloText.includes(q.evidence.toLowerCase())) problems.push(`Question ${i + 1} evidence is not an exact quote from the solo pages.`);
  });
  story.words.forEach((w, i) => {
    if (!w.word || !w.meaning) problems.push(`Word ${i + 1} needs a word and a meaning.`);
    else if (!new RegExp(`\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(`${soloText} ${story.duo.pages.join(' ').toLowerCase()}`)) problems.push(`The word "${w.word}" does not appear in the story.`);
  });

  if (!problems.length) {
    // the shared quality checks (distinct questions, a valid answer key, ...) run on the default rendering
    const rendered = defaultRender(story, 'solo');
    const quality = storyQualityIssues({ pages: rendered, questions: story.questions.map(q => ({ ...q, evidence: undefined })) });
    problems.push(...quality);
  }

  const blocked = blockedTopicMatches(textOfStory(story));
  for (const hit of blocked) problems.push(`Contains a blocked topic word (${hit.category}): "${hit.word}".`);

  return { story: problems.length ? null : story, problems };
}
