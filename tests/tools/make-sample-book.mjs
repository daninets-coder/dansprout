// Writes a sample story book PDF for a visual check: node tests/tools/make-sample-book.mjs <out.pdf> [theme]
import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { renderStoryBook } from '../../server/modules/story-book-pdf.js';
const out = process.argv[2] || 'sample-book.pdf';
const theme = process.argv[3] || 'Ocean';
const story = { id: 'a1b2c3d4-0000', title: 'Mia and the Moonlight Whale', theme, learning_goal: 'Comprehension', age_band: '5-6', learner_name: 'Mia', created_at: new Date() };
const pages = [
  'Mia lived by the sea. Every night she looked out of her window at the silver waves.',
  'One evening, a huge shadow glided under the moon. It was a whale, and it was singing a soft, slow song.',
  'Mia put on her yellow coat and ran down to the shore. "Hello!" she called. The whale rose up and blew a little fountain of sparkles.',
  'Mia shared her apple with the whale\'s friend, a tiny crab. The crab waved a claw to say thank you, and the whale sang louder, as if to say it was happy.',
  'When the sun began to rise, the whale slid back into the deep. Mia waved goodbye. She knew that kind hearts can make friends anywhere, even in the sea.',
];
const words = [{ word: 'shore', meaning: 'the land right next to the sea' }, { word: 'glided', meaning: 'moved smoothly and quietly' }, { word: 'sparkles', meaning: 'tiny bright flashes of light' }];
const questions = ['Who did Mia meet on the shore?', 'How do you think Mia felt when she heard the whale sing? Why?', 'What kind thing did Mia do for the crab?'];
const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true, autoFirstPage: false });
doc.pipe(fs.createWriteStream(out));
renderStoryBook(doc, { story, pages, words, questions, meta: { curriculumObjective: 'Answer questions about key details in a story' } });
doc.end();
