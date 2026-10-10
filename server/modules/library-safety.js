// Content rules for the pre-made story library (owner's rule, 2026-10-10):
// stories must stay clear of religious, sexual, political, and gender / sexuality topics.
//
// This is a word-and-phrase check. It catches the obvious cases and is only ONE layer: the writing
// instructions ask the AI to avoid these topics, OpenAI moderation runs on every story, and the owner
// reviews each story before it goes live.

const CATEGORIES = {
  religious: [
    'god', 'gods', 'goddess', 'lord', 'church', 'churches', 'mosque', 'temple', 'synagogue', 'cathedral', 'chapel', 'shrine',
    'pray', 'prays', 'prayed', 'praying', 'prayer', 'prayers', 'worship', 'worshipped', 'bible', 'quran', 'koran', 'torah', 'scripture',
    'heaven', 'heavens', 'hell', 'angel', 'angels', 'devil', 'demon', 'demons', 'satan', 'saint', 'saints', 'holy', 'sacred', 'divine',
    'jesus', 'christ', 'christian', 'christians', 'muslim', 'muslims', 'islam', 'islamic', 'jewish', 'judaism', 'hindu', 'buddhist', 'buddha', 'allah',
    'christmas', 'easter', 'hanukkah', 'ramadan', 'eid', 'diwali', 'passover', 'halloween', 'santa', 'religion', 'religious',
    'blessed', 'blessing', 'blessings', 'miracle', 'miracles', 'faith', 'priest', 'pastor', 'monk', 'nun', 'rabbi', 'imam', 'soul', 'souls', 'afterlife', 'reincarnation',
  ],
  political: [
    'politic', 'politics', 'political', 'politician', 'politicians', 'election', 'elections', 'elect', 'elected', 'vote', 'votes', 'voted', 'voting', 'ballot',
    'president', 'presidents', 'senator', 'congress', 'parliament', 'government', 'governments', 'democrat', 'republican', 'liberal', 'conservative',
    'protest', 'protesters', 'rally', 'campaign', 'candidate', 'candidates', 'immigration', 'immigrant', 'immigrants', 'refugee', 'refugees', 'border wall',
    'abortion', 'gun control', 'taxes', 'propaganda', 'revolution', 'regime', 'dictator', 'communist', 'socialism', 'capitalism',
  ],
  sexual: [
    'sex', 'sexy', 'sexual', 'naked', 'nude', 'nudity', 'underwear', 'kiss', 'kisses', 'kissed', 'kissing', 'romance', 'romantic', 'boyfriend', 'girlfriend',
    'crush', 'dating', 'date night', 'lover', 'lovers', 'wedding', 'weddings', 'bride', 'groom', 'married', 'marriage', 'husband', 'wife', 'pregnant', 'pregnancy',
    'puberty', 'private parts', 'breasts', 'penis', 'vagina', 'porn', 'seduce',
  ],
  gender_and_sexuality: [
    'gay', 'lesbian', 'bisexual', 'transgender', 'trans', 'queer', 'lgbt', 'lgbtq', 'homosexual', 'heterosexual', 'nonbinary', 'non-binary',
    'gender', 'genders', 'genderless', 'pronoun', 'pronouns', 'two moms', 'two dads', 'same-sex', 'sexuality', 'sexual orientation',
    'tomboy', 'sissy', 'man up', 'like a girl', 'like a boy', 'boys only', 'girls only', 'for boys', 'for girls', "boys can't", "girls can't", 'boys are', 'girls are',
  ],
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MATCHERS = Object.entries(CATEGORIES).map(([category, words]) => ({
  category,
  // whole words / phrases only, so "godfather"-style compounds are caught by their own entries and "begin" never matches "gin"
  pattern: new RegExp(`(?<![a-z0-9])(?:${words.map(escapeRegExp).join('|')})(?![a-z0-9])`, 'gi'),
}));

// Returns [{ category, word }], one entry per distinct match. Empty array = nothing found.
export function blockedTopicMatches(text) {
  const found = new Map();
  const normalized = String(text || '').replace(/[’‘]/g, "'");
  for (const { category, pattern } of MATCHERS) {
    pattern.lastIndex = 0;
    for (const match of normalized.matchAll(pattern)) {
      found.set(`${category}:${match[0].toLowerCase()}`, { category, word: match[0].toLowerCase() });
    }
  }
  return [...found.values()];
}

// The rules as plain text for the writing instructions.
export const CONTENT_RULES_FOR_PROMPT = [
  'This story is for a general family audience and must stay neutral on contested topics.',
  'Do NOT include, mention, or hint at: religion of any kind (no gods, prayer, worship, places of worship, religious holidays or figures, angels, miracles, heaven),',
  'politics of any kind (no elections, voting, leaders, governments, protests, laws as a topic, immigration),',
  'anything sexual or romantic (no kissing, crushes, dating, weddings, marriage, bodies, pregnancy),',
  'or gender or sexuality topics (no gender identity, no gender roles or "boy things / girl things", no pronoun discussion, nothing about family structure or who the grown-ups are to each other).',
  'No holidays at all (no Christmas, Easter, Halloween, Eid, Diwali, Hanukkah and similar). Birthdays and everyday seasons (summer, snow, autumn) are fine.',
  'Characters can be boys or girls, but never talk about it. Refer to the child hero only by their name slot or with singular "they / their".',
  'Keep the story kind, calm and light: friendship, curiosity, helping, problem solving, nature, animals, everyday adventures.',
  'No frightening scenes, no violence, no death, no meanness that is not gently resolved.',
].join(' ');
