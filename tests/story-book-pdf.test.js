import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import { renderStoryBook, paletteFor } from '../server/modules/story-book-pdf.js';

function build(over = {}) {
  const story = { id: 'abcd1234-0', title: 'The Brave Little Kite', theme: 'Sky', learning_goal: 'Vocabulary', age_band: '5-6', learner_name: 'Ava', created_at: '2026-10-12T10:00:00Z', ...over };
  const pages = ['Ava had a red kite. The wind was strong.', 'The kite flew high above the hill.', 'Ava smiled all the way home.'];
  const words = [{ word: 'strong', meaning: 'having a lot of force' }];
  const questions = ['What did Ava have?', 'How did Ava feel at the end?'];
  const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false, compress: false });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks).toString('latin1'))));
  renderStoryBook(doc, { story, pages, words, questions, meta: {} });
  doc.end();
  return done;
}

test('story book has the front matter, disclosure and back cover', async () => {
  const pdf = await build();
  assert.ok(pdf.startsWith('%PDF'));
  const pageCount = (pdf.match(/\/Type \/Page\b/g) || []).length;
  assert.ok(pageCount >= 11, `expected a full book, got ${pageCount} pages`);
  // cover, title, about/disclosure, dedication, contents, 3 story pages, The End, word garden, talk about, notes, back cover = 13
  assert.equal(pageCount, 13);
});

test('theme palettes fall back to the default', () => {
  assert.equal(paletteFor('Ocean').deep, paletteFor('ocean adventure').deep);
  assert.equal(paletteFor('Unknown Theme').deep, paletteFor('').deep);
});
