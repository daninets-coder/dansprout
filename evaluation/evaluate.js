import { readFile } from 'node:fs/promises';
import { storyQualityIssues } from '../server/story-quality.js';
const file = process.argv[2] || new URL('./benchmarks.json', import.meta.url);
const cases = JSON.parse(await readFile(file, 'utf8'));
let failures = 0;
for (const item of cases) {
 const issues = storyQualityIssues(item.story);
 const words = item.story.pages.join(' ').split(/\s+/).filter(Boolean).length;
 const sentences = item.story.pages.join(' ').split(/[.!?]+/).filter(s=>s.trim()).length;
 const missingEvidence=item.story.questions.some(q=>!q.evidence);
 if(missingEvidence) issues.push('Missing evidence quote.');
 failures += issues.length ? 1 : 0;
 console.log(JSON.stringify({id:item.id,grade:item.gradeLevel,structuralPass:!issues.length,issues,wordCount:words,averageWordsPerSentence:Math.round(words/Math.max(sentences,1)),educatorReview:item.review?.educatorStatus || 'pending'}));
}
console.log('Mechanical results only. Reading fit, coherence, distractor quality, and safety need human review.');
process.exitCode=failures?1:0;
