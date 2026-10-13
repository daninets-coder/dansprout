// Designs a finished picture-book style PDF for one story (2026-10-12).
// Front cover, title page, copyright and AI disclosure page, dedication, contents, the story (one page per story page, page numbers, running
// header), "The End", word garden, talk-about page with answer lines, notes for grown-ups, back cover. PDFKit built-in fonts only (no files to deploy).
// Usage: renderStoryBook(doc, { story, pages, words, questions, meta }) where doc is a new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true }).

const W = 612;
const H = 792;
const MARGIN = 64;

const PALETTES = {
  default: { deep: '#14504f', mid: '#2f8f83', light: '#bfe8dc', accent: '#f2a541', ink: '#1f3b3a', paper: '#fffaf0' },
  moonlight: { deep: '#1b2450', mid: '#3d4a94', light: '#c9d1ff', accent: '#ffd36e', ink: '#1c2347', paper: '#fbf9ff' },
  space: { deep: '#150f3d', mid: '#4b3fa6', light: '#d3c9ff', accent: '#ff8fa3', ink: '#1b1646', paper: '#faf8ff' },
  ocean: { deep: '#0b4a6f', mid: '#1b8bb5', light: '#bfe9f7', accent: '#ffb347', ink: '#0f3a56', paper: '#f6fcff' },
  arctic: { deep: '#245a7a', mid: '#5aa6c9', light: '#dff3fb', accent: '#ff8c69', ink: '#1d4a66', paper: '#f8fdff' },
  rainforest: { deep: '#1e5a2d', mid: '#3d9a4f', light: '#cdeccb', accent: '#ffcb47', ink: '#1c4426', paper: '#fbfff6' },
  garden: { deep: '#2d6a3a', mid: '#6bb26f', light: '#e3f5d8', accent: '#f26d8f', ink: '#25502f', paper: '#fffdf4' },
  farm: { deep: '#6a4a1f', mid: '#c48a3a', light: '#f8e4bd', accent: '#d9534f', ink: '#4a3414', paper: '#fffaf0' },
  castle: { deep: '#4a2b6b', mid: '#8a5bb5', light: '#ead9fb', accent: '#ffc857', ink: '#38204f', paper: '#fdf9ff' },
  sky: { deep: '#2b5fa6', mid: '#5ba3e8', light: '#d6eafc', accent: '#ffd166', ink: '#1f4678', paper: '#f7fbff' },
  dinosaurs: { deep: '#4a5a1f', mid: '#8fa83a', light: '#eaf2c4', accent: '#e8743b', ink: '#3a4718', paper: '#fcfdf3' },
};

export function paletteFor(theme) {
  const key = String(theme || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const name of Object.keys(PALETTES)) if (key.includes(name)) return PALETTES[name];
  return PALETTES.default;
}

function ornamentSprout(doc, cx, cy, size, colors, onDark = false) {
  // a small sprout: curved stem and two leaves
  const s = size / 100;
  doc.save();
  doc.translate(cx - 50 * s, cy - 60 * s);
  doc.lineWidth(5 * s).strokeColor(onDark ? colors.light : colors.deep).lineCap('round');
  doc.moveTo(50 * s, 118 * s).bezierCurveTo(50 * s, 90 * s, 48 * s, 70 * s, 50 * s, 48 * s).stroke();
  doc.fillColor(onDark ? colors.light : colors.mid);
  doc.moveTo(50 * s, 60 * s).bezierCurveTo(22 * s, 62 * s, 6 * s, 44 * s, 8 * s, 22 * s).bezierCurveTo(32 * s, 20 * s, 50 * s, 34 * s, 50 * s, 60 * s).fill();
  doc.fillColor(colors.accent);
  doc.moveTo(50 * s, 48 * s).bezierCurveTo(78 * s, 50 * s, 94 * s, 32 * s, 92 * s, 10 * s).bezierCurveTo(68 * s, 8 * s, 50 * s, 22 * s, 50 * s, 48 * s).fill();
  doc.restore();
}

function hills(doc, colors, top, opacity = 1) {
  doc.save();
  doc.opacity(opacity);
  doc.fillColor(colors.mid).moveTo(0, top + 40).bezierCurveTo(140, top - 20, 300, top + 70, W, top + 10).lineTo(W, H).lineTo(0, H).fill();
  doc.fillColor(colors.deep).moveTo(0, top + 90).bezierCurveTo(180, top + 40, 380, top + 120, W, top + 70).lineTo(W, H).lineTo(0, H).fill();
  doc.restore();
}


function scene(doc, colors, n) {
  doc.save();
  const sunny = n % 2 === 0;
  doc.opacity(0.9).fillColor(sunny ? colors.accent : colors.light).circle(W - 118, H - 235, 26).fill();
  if (!sunny) doc.opacity(1).fillColor(colors.paper).circle(W - 108, H - 244, 22).fill();
  doc.opacity(0.55).fillColor(colors.light);
  doc.circle(110, H - 250, 16).fill().circle(130, H - 258, 20).fill().circle(152, H - 250, 15).fill().rect(110, H - 250, 42, 15).fill();
  doc.restore();
}

function stars(doc, colors, seed, count, yMax) {
  let x = seed;
  const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  doc.save();
  doc.fillColor(colors.light);
  for (let i = 0; i < count; i += 1) {
    const cx = 30 + rnd() * (W - 60);
    const cy = 30 + rnd() * yMax;
    const r = 1 + rnd() * 2.6;
    doc.opacity(0.35 + rnd() * 0.5).circle(cx, cy, r).fill();
  }
  doc.restore();
}

function paperPage(doc, colors) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, W, H).fill(colors.paper);
  doc.save().lineWidth(1).strokeColor(colors.light).rect(30, 30, W - 60, H - 60).stroke().restore();
}

function centeredText(doc, text, y, opts) {
  const { size = 14, font = 'Helvetica', color = '#000', width = W - 2 * MARGIN, gap = 4, spacing = 0, x = MARGIN } = opts || {};
  doc.font(font).fontSize(size).fillColor(color).lineGap(gap);
  doc.text(String(text), x, y, { width, align: 'center', characterSpacing: spacing });
  return doc.y;
}

function fitFont(doc, text, width, maxHeight, font, sizes, gapRatio = 0.5) {
  for (const size of sizes) {
    doc.font(font).fontSize(size);
    const gap = Math.round(size * gapRatio);
    if (doc.heightOfString(text, { width, lineGap: gap }) <= maxHeight) return { size, gap };
  }
  const size = sizes[sizes.length - 1];
  return { size, gap: Math.round(size * gapRatio) };
}

function pageNumber(doc, n, colors) {
  doc.save();
  doc.circle(W / 2, H - 48, 14).fill(colors.light);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.deep).text(String(n), W / 2 - 14, H - 53, { width: 28, align: 'center' });
  doc.restore();
}

function runningHeader(doc, title, colors) {
  doc.save();
  doc.font('Helvetica').fontSize(9).fillColor(colors.mid).text(String(title).toUpperCase(), MARGIN, 44, { width: W - 2 * MARGIN, align: 'center', characterSpacing: 1.4, lineBreak: false, ellipsis: true });
  doc.moveTo(W / 2 - 40, 60).lineTo(W / 2 + 40, 60).lineWidth(1).strokeColor(colors.light).stroke();
  doc.restore();
}

// splits long page text so a page never overflows; returns an array of chunks
function chunkText(doc, text, width, maxHeight, size, gap) {
  doc.font('Helvetica').fontSize(size);
  if (doc.heightOfString(text, { width, lineGap: gap }) <= maxHeight) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    const trial = (current + s).trim();
    if (current && doc.heightOfString(trial, { width, lineGap: gap }) > maxHeight) { chunks.push(current.trim()); current = s; } else { current = trial + ' '; }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function renderStoryBook(doc, { story, pages, words, questions, meta }) {
  const colors = paletteFor(story.theme);
  const learner = String(story.learner_name || '').trim();
  const created = story.created_at ? new Date(story.created_at) : new Date();
  const year = created.getFullYear();
  const monthYear = created.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const title = String(story.title || 'A DanSprout Story');
  const goal = `${story.learning_goal || 'Reading practice'}${meta && meta.curriculumObjective ? `: ${meta.curriculumObjective}` : ''}`;
  const publisher = 'DanSprout Stories';
  let bookPage = 0;

  doc.info.Title = title;
  doc.info.Author = publisher;
  doc.info.Subject = `A personalized reading story${learner ? ` for ${learner}` : ''}`;
  doc.info.Keywords = 'children, reading, story, DanSprout';
  doc.info.Creator = 'DanSprout Stories';
  doc.info.CreationDate = new Date();

  // ---------------- front cover
  doc.addPage({ size: 'LETTER', margin: 0 });
  const sky = doc.linearGradient(0, 0, 0, H);
  sky.stop(0, colors.mid).stop(0.55, colors.deep).stop(1, colors.ink);
  doc.rect(0, 0, W, H).fill(sky);
  stars(doc, colors, 11, 70, 330);
  doc.save().opacity(0.18).circle(W - 120, 150, 90).fill(colors.light).restore();
  hills(doc, { ...colors, mid: colors.mid, deep: colors.ink }, 560, 1);
  doc.save().lineWidth(3).strokeColor(colors.accent).roundedRect(34, 34, W - 68, H - 68, 18).stroke().restore();
  centeredText(doc, publisher.toUpperCase(), 78, { size: 12, font: 'Helvetica-Bold', color: colors.light, spacing: 4 });
  ornamentSprout(doc, W / 2, 190, 120, colors, true);
  const tSize = fitFont(doc, title, W - 150, 200, 'Times-Bold', [50, 44, 38, 32, 28], 0.18);
  doc.font('Times-Bold').fontSize(tSize.size).fillColor('#ffffff').lineGap(tSize.gap);
  doc.text(title, 75, 290, { width: W - 150, align: 'center' });
  const afterTitle = doc.y;
  doc.save().lineWidth(2).strokeColor(colors.accent).moveTo(W / 2 - 60, afterTitle + 18).lineTo(W / 2 + 60, afterTitle + 18).stroke().restore();
  centeredText(doc, learner ? `A story for ${learner}` : 'A personalized story', afterTitle + 34, { size: 20, font: 'Times-Italic', color: colors.accent });
  centeredText(doc, `${story.theme ? `${story.theme} adventure` : 'A reading adventure'}  •  Ages ${story.age_band || ''}`.trim(), afterTitle + 70, { size: 12, font: 'Helvetica', color: colors.light });
  centeredText(doc, `${monthYear}`, H - 92, { size: 11, font: 'Helvetica', color: '#ffffff', spacing: 1 });

  // ---------------- title page
  paperPage(doc, colors);
  ornamentSprout(doc, W / 2, 170, 70, colors);
  const tp = fitFont(doc, title, W - 160, 130, 'Times-Bold', [36, 32, 28, 24], 0.18);
  doc.font('Times-Bold').fontSize(tp.size).fillColor(colors.ink).lineGap(tp.gap).text(title, 80, 250, { width: W - 160, align: 'center' });
  const y1 = doc.y + 18;
  doc.save().lineWidth(1).strokeColor(colors.accent).moveTo(W / 2 - 50, y1).lineTo(W / 2 + 50, y1).stroke().restore();
  centeredText(doc, learner ? `Written for ${learner}` : 'A personalized story', y1 + 18, { size: 16, font: 'Times-Italic', color: colors.mid });
  centeredText(doc, `A ${publisher} story`, y1 + 50, { size: 12, font: 'Helvetica-Bold', color: colors.deep, spacing: 1.5 });
  centeredText(doc, `${monthYear}`, H - 120, { size: 11, color: colors.mid });
  centeredText(doc, publisher, H - 100, { size: 11, font: 'Helvetica-Bold', color: colors.deep, spacing: 2 });

  // ---------------- copyright and AI disclosure
  paperPage(doc, colors);
  doc.font('Times-Bold').fontSize(20).fillColor(colors.ink).text('About this book', MARGIN, 80, { width: W - 2 * MARGIN });
  doc.moveDown(0.8);
  const small = (head, body) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.mid).text(head.toUpperCase(), { width: W - 2 * MARGIN, characterSpacing: 1.1 });
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).fillColor(colors.ink).lineGap(3).text(body, { width: W - 2 * MARGIN });
    doc.moveDown(0.9);
  };
  small('Copyright', `© ${year} ${publisher}. All rights reserved. This personalized story is for the private, non-commercial use of the family that created it. Please do not sell, publish or post it publicly.`);
  small('Created with artificial intelligence', `This story was created with the help of artificial intelligence (AI) from choices a grown-up made${learner ? ` for ${learner}` : ''}: an age band, a theme and a reading focus. It was not written by a human author, and it may contain mistakes or ideas that do not suit every child.`);
  small('Grown-up review', 'A parent, guardian or qualified educator should read this story before sharing it with a child, and decide whether it is right for that child. Stories have no pictures drawn by an artist; any pictures you add are your own.');
  small('Practice feedback', 'Any score connected to this story measures understanding of this story’s questions only. It is not a complete reading assessment, a diagnosis, proof of mastery or a guarantee of educational outcomes. DanSprout Stories is not a substitute for a teacher, a school curriculum or professional advice.');
  small('Privacy', `This PDF contains personalized learner information${learner ? ` (the first name “${learner}”)` : ''}. Keep it secure, do not share it publicly, and delete it when it is no longer needed.`);
  small('Edition', `Created ${monthYear}.  Story reference ${String(story.id || '').slice(0, 8) || 'n/a'}.  Printed from the DanSprout Stories website, dansprout.com.`);

  // ---------------- dedication
  paperPage(doc, colors);
  ornamentSprout(doc, W / 2, 300, 90, colors);
  centeredText(doc, learner ? `For ${learner}` : 'For a growing reader', 390, { size: 28, font: 'Times-Italic', color: colors.ink });
  centeredText(doc, 'May every page bring a new idea, a little courage and a lot of fun.', 440, { size: 13, font: 'Times-Roman', color: colors.mid, width: 380, x: (W - 380) / 2, gap: 6 });

  // ---------------- contents
  paperPage(doc, colors);
  doc.font('Times-Bold').fontSize(22).fillColor(colors.ink).text('Inside this book', MARGIN, 90, { width: W - 2 * MARGIN, align: 'center' });
  const storyPageCount = pages.length;
  const toc = [
    ['The story', `${storyPageCount} ${storyPageCount === 1 ? 'page' : 'pages'}`],
    ['Word garden', `${words.length} ${words.length === 1 ? 'word' : 'words'}`],
    ['Talk about the story', `${questions.length} ${questions.length === 1 ? 'question' : 'questions'}`],
    ['Notes for grown-ups', 'reading focus and tips'],
  ];
  let ty = 170;
  toc.forEach(([name, note]) => {
    doc.font('Times-Roman').fontSize(18).fillColor(colors.ink).text(name, 120, ty, { width: 250, lineBreak: false });
    doc.font('Helvetica').fontSize(11).fillColor(colors.mid).text(note, 380, ty + 5, { width: 120, align: 'right', lineBreak: false });
    doc.save().dash(1, { space: 4 }).lineWidth(0.7).strokeColor(colors.light).moveTo(120, ty + 30).lineTo(W - 112, ty + 30).stroke().undash().restore();
    ty += 56;
  });

  // ---------------- the story
  let outlineAdded = false;
  pages.forEach((text, index) => {
    const boxW = W - 2 * 78;
    const maxH = 420;
    const fit = fitFont(doc, text, boxW, maxH, 'Helvetica', [24, 22, 20, 18, 16], 0.55);
    const chunks = chunkText(doc, text, boxW, maxH, fit.size, fit.gap);
    chunks.forEach((chunk, ci) => {
      paperPage(doc, colors);
      bookPage += 1;
      if (!outlineAdded && doc.outline) { doc.outline.addItem('The story'); outlineAdded = true; }
      runningHeader(doc, title, colors);
      hills(doc, colors, H - 150, 0.5);
      scene(doc, colors, bookPage);
      doc.font('Helvetica').fontSize(fit.size).lineGap(fit.gap);
      const h = doc.heightOfString(chunk, { width: boxW, lineGap: fit.gap });
      const top = Math.max(120, 120 + (maxH - h) / 2);
      if (index === 0 && ci === 0) {
        // opening initial in the theme colour
        const first = chunk.charAt(0);
        doc.font('Times-Bold').fontSize(fit.size * 2.6).fillColor(colors.accent).text(first, 78, top - 6, { lineBreak: false });
        const initialW = doc.widthOfString(first) + 2;
        doc.font('Helvetica').fontSize(fit.size).fillColor(colors.ink).lineGap(fit.gap);
        const rest = chunk.slice(1);
        const firstLineW = boxW - initialW;
        doc.text(rest, 78 + initialW, top, { width: firstLineW });
        doc.y = Math.max(doc.y, top + fit.size * 2.2);
      } else {
        doc.fillColor(colors.ink).text(chunk, 78, top, { width: boxW, align: 'left' });
      }
      pageNumber(doc, bookPage, colors);
    });
  });

  // ---------------- the end
  paperPage(doc, colors);
  bookPage += 1;
  hills(doc, colors, H - 230, 0.9);
  ornamentSprout(doc, W / 2, 250, 110, colors);
  centeredText(doc, 'The End', 350, { size: 44, font: 'Times-Bold', color: colors.ink });
  centeredText(doc, learner ? `Great reading, ${learner}!` : 'Great reading!', 420, { size: 20, font: 'Times-Italic', color: colors.mid });

  // ---------------- word garden
  paperPage(doc, colors);
  bookPage += 1;
  if (doc.outline) doc.outline.addItem('Word garden');
  runningHeader(doc, title, colors);
  doc.font('Times-Bold').fontSize(26).fillColor(colors.ink).text('Word garden', MARGIN, 90, { width: W - 2 * MARGIN, align: 'center' });
  doc.font('Helvetica').fontSize(11).fillColor(colors.mid).text('New words from the story. Read each word, then use it in a sentence of your own.', MARGIN, 128, { width: W - 2 * MARGIN, align: 'center' });
  let wy = 170;
  const cardW = W - 2 * 84;
  words.forEach((w) => {
    const word = String((w && w.word) || '');
    const meaning = String((w && w.meaning) || '');
    doc.font('Helvetica').fontSize(11);
    const mh = doc.heightOfString(meaning, { width: cardW - 40 });
    const cardH = 28 + 8 + mh + 16;
    if (wy + cardH > H - 90) {
      pageNumber(doc, bookPage, colors);
      paperPage(doc, colors);
      bookPage += 1;
      runningHeader(doc, title, colors);
      wy = 100;
    }
    doc.save().roundedRect(84, wy, cardW, cardH, 12).fill('#ffffff').lineWidth(1).strokeColor(colors.light).roundedRect(84, wy, cardW, cardH, 12).stroke().restore();
    doc.save().rect(84, wy + 10, 5, cardH - 20).fill(colors.accent).restore();
    doc.font('Times-Bold').fontSize(17).fillColor(colors.deep).text(word, 104, wy + 10, { width: cardW - 40 });
    doc.font('Helvetica').fontSize(11).fillColor(colors.ink).text(meaning, 104, wy + 34, { width: cardW - 40 });
    wy += cardH + 12;
  });
  pageNumber(doc, bookPage, colors);

  // ---------------- talk about the story
  paperPage(doc, colors);
  bookPage += 1;
  if (doc.outline) doc.outline.addItem('Talk about the story');
  runningHeader(doc, title, colors);
  doc.font('Times-Bold').fontSize(26).fillColor(colors.ink).text('Talk about the story', MARGIN, 90, { width: W - 2 * MARGIN, align: 'center' });
  doc.font('Helvetica').fontSize(11).fillColor(colors.mid).text('Read each question aloud together. Say your answer, then write or draw it here.', MARGIN, 128, { width: W - 2 * MARGIN, align: 'center' });
  let qy = 175;
  questions.forEach((q, i) => {
    const prompt = typeof q === 'string' ? q : (q && (q.prompt || q.question || q.text)) || '';
    doc.font('Helvetica-Bold').fontSize(12);
    const qh = doc.heightOfString(`${i + 1}. ${prompt}`, { width: W - 2 * MARGIN - 36 });
    const need = qh + 62;
    if (qy + need > H - 90) {
      pageNumber(doc, bookPage, colors);
      paperPage(doc, colors);
      bookPage += 1;
      runningHeader(doc, title, colors);
      qy = 100;
    }
    doc.circle(MARGIN + 11, qy + 8, 11).fill(colors.accent);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text(String(i + 1), MARGIN, qy + 3, { width: 22, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.ink).text(prompt, MARGIN + 36, qy, { width: W - 2 * MARGIN - 36 });
    const ly = qy + qh + 22;
    doc.save().lineWidth(0.7).strokeColor(colors.light);
    doc.moveTo(MARGIN + 36, ly).lineTo(W - MARGIN, ly).stroke();
    doc.moveTo(MARGIN + 36, ly + 22).lineTo(W - MARGIN, ly + 22).stroke();
    doc.restore();
    qy += need + 8;
  });
  pageNumber(doc, bookPage, colors);

  // ---------------- notes for grown-ups
  paperPage(doc, colors);
  bookPage += 1;
  if (doc.outline) doc.outline.addItem('Notes for grown-ups');
  runningHeader(doc, title, colors);
  doc.font('Times-Bold').fontSize(26).fillColor(colors.ink).text('Notes for grown-ups', MARGIN, 90, { width: W - 2 * MARGIN, align: 'center' });
  doc.y = 150;
  const note = (head, body) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.mid).text(head.toUpperCase(), MARGIN, doc.y, { width: W - 2 * MARGIN, characterSpacing: 1.1 });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor(colors.ink).lineGap(3).text(body, { width: W - 2 * MARGIN });
    doc.moveDown(1);
  };
  note('Reading focus', goal);
  note('How to read it together', 'Read a page, then pause. Ask what the child noticed, what might happen next, and how a character feels. Let the child read as much as they can, and read the rest to them. Re-reading the same story another day builds fluency and confidence.');
  note('Review before sharing', 'This story was created with AI. Please read it first and make sure it suits your child. If something does not seem right, skip it and tell us at dansprout.com.');
  note('Keep it private', 'This book includes your child’s first name. Store it securely and delete it when you no longer need it.');
  pageNumber(doc, bookPage, colors);

  // ---------------- back cover
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, W, H).fill(colors.deep);
  stars(doc, colors, 29, 55, 200);
  hills(doc, { ...colors, deep: colors.ink }, 580, 1);
  doc.save().lineWidth(3).strokeColor(colors.accent).roundedRect(34, 34, W - 68, H - 68, 18).stroke().restore();
  ornamentSprout(doc, W / 2, 200, 100, colors, true);
  centeredText(doc, title, 320, { size: 26, font: 'Times-Bold', color: '#ffffff', width: W - 180, x: 90 });
  const by = doc.y + 14;
  centeredText(doc, `A personalized reading story${learner ? ` made for ${learner}` : ''}. Created with AI and meant to be read together with a grown-up.`, by, { size: 13, font: 'Times-Italic', color: colors.light, width: W - 200, x: 100, gap: 5 });
  centeredText(doc, `${publisher}  •  dansprout.com`, H - 118, { size: 12, font: 'Helvetica-Bold', color: colors.accent, spacing: 1 });
  centeredText(doc, `© ${year} ${publisher}. Personal, non-commercial use only. Created with artificial intelligence.`, H - 96, { size: 8.5, font: 'Helvetica', color: '#ffffff' });
}

