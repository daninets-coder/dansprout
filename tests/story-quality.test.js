import test from 'node:test';
import assert from 'node:assert/strict';
import { storyQualityIssues } from '../server/story-quality.js';
const fixture = () => ({ pages: ['A fox lost a map.', 'An owl found it by the tree.', 'They used the map to get home.'], questions: [
  { prompt: 'Who lost the map?', options: ['A fox', 'An owl'], answer: 'A fox' },
  { prompt: 'Where was the map?', options: ['By the tree', 'In a boat'], answer: 'By the tree' },
  { prompt: 'Where did they go?', options: ['To the moon', 'Home'], answer: 'Home' }
] });
test('accepts distinct questions with usable answer keys', () => assert.deepEqual(storyQualityIssues(fixture()), []));
test('rejects ambiguous options even when capitalization differs', () => { const s=fixture(); s.questions[0].options=['A fox', ' a FOX ']; assert.match(storyQualityIssues(s).join(' '), /duplicate options/); });
test('rejects answer keys outside the options', () => { const s=fixture(); s.questions[0].answer='A bear'; assert.match(storyQualityIssues(s).join(' '), /matching answer/); });
test('rejects repeated pages and questions', () => { const s=fixture(); s.pages[1]=s.pages[0]; s.questions[1]=s.questions[0]; assert.equal(storyQualityIssues(s).length, 2); });
test('rejects missing content', () => assert.ok(storyQualityIssues({}).length));
