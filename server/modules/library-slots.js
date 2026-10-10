// Name slots for pre-made library stories.
//
// A library story is written once with two kinds of slots:
//   {child}   the child who is reading
//   {friend}  an optional second name (a brother, sister or friend)
// Each story has a SOLO version (uses {child} only; a fixed companion character fills the second role)
// and a DUO version (uses both {child} and {friend}). Questions and word meanings never contain slots,
// so their audio can be recorded once and reused for every child.

export const SLOT_NAMES = ['child', 'friend'];
const SLOT_PATTERN = /\{([a-z_]+)\}/g;

// Names typed by a family end up inside a child's story, so keep them simple and safe.
export function cleanName(raw) {
  const value = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (value.length < 1 || value.length > 30) return null;
  if (!/^[\p{L}][\p{L}\p{M}' -]*$/u.test(value)) return null; // letters, spaces, hyphen, apostrophe; must start with a letter
  return value;
}

export function slotsIn(text) {
  return [...String(text || '').matchAll(SLOT_PATTERN)].map(match => match[1]);
}

// Fills the slots. Throws if a slot is missing or a name is not allowed.
export function renderTemplate(text, names) {
  return String(text || '').replace(SLOT_PATTERN, (whole, slot) => {
    if (!SLOT_NAMES.includes(slot)) throw new Error(`Unknown name slot {${slot}}`);
    const name = cleanName(names?.[slot]);
    if (!name) throw new Error(`A valid name is needed for {${slot}}`);
    return name;
  });
}

// Checks the slot rules for one story's content. Returns a list of problems (empty = fine).
export function slotProblems(content) {
  const problems = [];
  const pagesOf = key => (Array.isArray(content?.[key]?.pages) ? content[key].pages : []);
  const solo = pagesOf('solo');
  const duo = pagesOf('duo');
  if (!solo.length) problems.push('Missing the single-child version.');
  if (!duo.length) problems.push('Missing the two-child version.');
  const soloSlots = new Set(solo.flatMap(slotsIn));
  const duoSlots = new Set(duo.flatMap(slotsIn));
  if (!soloSlots.has('child')) problems.push('The single-child version never uses {child}.');
  if (soloSlots.has('friend')) problems.push('The single-child version must not use {friend}.');
  if (!duoSlots.has('child') || !duoSlots.has('friend')) problems.push('The two-child version must use both {child} and {friend}.');
  for (const slot of [...soloSlots, ...duoSlots]) if (!SLOT_NAMES.includes(slot)) problems.push(`Unknown slot {${slot}}.`);
  const fixed = [
    ...(content?.questions || []).flatMap(q => [q.prompt, q.answer, ...(q.options || [])]),
    ...(content?.words || []).flatMap(w => [w.word, w.meaning, w.example]),
    content?.title,
  ];
  if (fixed.some(text => slotsIn(text).length)) problems.push('Questions, answers, word meanings and the title must not contain name slots.');
  return problems;
}

// The default rendering used for the pre-recorded voice and for previews.
export function defaultRender(content, version = 'solo') {
  const names = content?.defaultNames || { child: 'Mia', friend: 'Leo' };
  return (content?.[version]?.pages || []).map(page => renderTemplate(page, names));
}
