const normalized = value => String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');

// Mechanical checks supplement moderation and educator review; they do not certify pedagogy.
export function storyQualityIssues(story) {
  const issues = [];
  const pages = Array.isArray(story?.pages) ? story.pages : [];
  const questions = Array.isArray(story?.questions) ? story.questions : [];
  if (pages.length < 3 || pages.some(page => !normalized(page))) issues.push('Provide at least three non-empty story pages.');
  if (new Set(pages.map(normalized)).size !== pages.length) issues.push('Story pages must not repeat.');
  if (questions.length < 3) issues.push('Provide at least three story questions.');
  if (new Set(questions.map(q => normalized(q.prompt))).size !== questions.length) issues.push('Questions must be distinct.');
  questions.forEach((q, i) => {
    if (q.evidence !== undefined && (!normalized(q.evidence) || !pages.some(page => normalized(page).includes(normalized(q.evidence))))) issues.push(`Question ${i + 1} evidence must quote a story page.`);
    const options = Array.isArray(q.options) ? q.options : [];
    if (!normalized(q.prompt) || options.length < 2 || options.length > 3 || options.some(o => !normalized(o))) issues.push(`Question ${i + 1} needs a prompt and two or three non-empty options.`);
    if (new Set(options.map(normalized)).size !== options.length) issues.push(`Question ${i + 1} has duplicate options.`);
    if (options.filter(option => option === q.answer).length !== 1) issues.push(`Question ${i + 1} needs exactly one matching answer.`);
  });
  return issues;
}
