// Builds static, crawlable legal pages (terms.html, privacy.html, children-privacy.html) from the text in legal.js
// so the in-app modals and the public pages always say the same thing. Run: node scripts/build-legal-pages.js
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'legal.js'), 'utf8');
const pick = name => {
  const start = source.indexOf(`const ${name} = `);
  const match = start < 0 ? null : source.slice(start).match(/^const \w+ = (`[\s\S]*?`|'[^\n]*');/);
  if (!match) throw new Error(`Cannot find ${name} in legal.js`);
  return match[1];
};
const reviewStatus = new Function(`return ${pick('reviewStatus')}`)();
const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = text => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
// Minimal markdown for the subscriber agreement: #/## headings, ---, "- " lists, **bold**, paragraphs.
const markdown = text => {
  const out = []; let list = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const item = line.match(/^- (?:☐ )?(.*)$/);
    if (!item && list) { out.push('</ul>'); list = false; }
    if (!line || line === '---') continue;
    if (item) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(item[1])}</li>`); continue; }
    const heading = line.match(/^(#{1,3}) (.*)$/);
    if (heading) { out.push(heading[1].length === 1 ? `<h2>${inline(heading[2])}</h2>` : `<h3>${inline(heading[2])}</h3>`); continue; }
    out.push(`<p>${inline(line.replace(/ {2}$/, ''))}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('\n');
};
const render = name => name === 'termsContent'
  ? markdown(readFileSync(path.join(root, 'legal', 'SUBSCRIBER_AGREEMENT.md'), 'utf8'))
  : new Function('reviewStatus', `return ${pick(name)}`)(reviewStatus);
const pages = [
  ['terms.html', 'Subscriber Agreement and Terms of Service', 'termsContent'],
  ['privacy.html', 'Privacy Policy', 'privacyContent'],
  ['children-privacy.html', "Children's Privacy Statement (COPPA)", 'childrenContent'],
];
const nav = pages.map(([file, title]) => `<a href="/${file}">${title}</a>`).join(' &middot; ');
for (const [file, title, variable] of pages) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — DanSprout Stories</title>
<meta name="description" content="${title} for DanSprout Stories, operated by 4Learn Motto LLC.">
<link rel="icon" type="image/png" href="images/brand/favicon-64.png">
<style>
body{margin:0;background:#fff7ea;color:#21383d;font:17px/1.6 Georgia,'Times New Roman',serif}
header,main,footer{max-width:760px;margin:0 auto;padding:20px 20px}
header a.brand{font-weight:bold;font-size:22px;color:#21383d;text-decoration:none}
h2{font-size:30px;margin:8px 0 12px}h3{font-size:19px;margin:26px 0 6px}p{margin:0 0 12px}
a{color:#1f6f78}a:focus-visible{outline:3px solid #0b57d0;outline-offset:2px}
footer{font:14px/1.5 Arial,sans-serif;color:#5b6580;border-top:1px solid #eadbc9}
</style>
</head>
<body>
<header><a class="brand" href="/">DanSprout Stories</a></header>
<main>
${render(variable)}
</main>
<footer><nav aria-label="Legal">${nav}</nav><p>&copy; 2026 4Learn Motto LLC, Maryland.</p></footer>
</body>
</html>
`;
  writeFileSync(path.join(root, file), html);
}
console.log('Built', pages.map(page => page[0]).join(', '));
