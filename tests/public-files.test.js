import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createPublicFiles } from '../server/modules/public-files.js';

test('only intentional browser assets are public', async t => {
 const app = express(); app.use(createPublicFiles(fileURLToPath(new URL('../', import.meta.url))));
 const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 for(const path of ['/', '/index.html', '/api-app.js', '/child-mode.js?v=1', '/reader.css']) {
   const r=await fetch(base+path); assert.equal(r.status,200,path); await r.arrayBuffer();
 }
 for(const path of ['/server/server.js','/server/modules/authentication.js','/server/schema.sql','/server-output.log','/logs/error.log','/.env','/%2eenv','/.git/config','/package.json','/package-lock.json','/AAA_chatgpt_Ai_01.md','/tests/browser/reading.spec.js','/node_modules/express/package.json','/imagesAI/avatars/SOURCES.txt','/api/nonexistent','/server%2fserver.js','/images/../server/server.js','/images/%2e%2e%5cserver%5cserver.js']) {
   const r=await fetch(base+path); assert.equal(r.status,404,path); await r.arrayBuffer();
 }
 const head=await fetch(base+'/server/server.js',{method:'HEAD'});assert.equal(head.status,404);
});

test('generated files are served from the storage folder, and nothing else in it is', async t => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'root-'));
  const storage = mkdtempSync(join(tmpdir(), 'storage-'));
  t.after(() => { rmSync(root, { recursive: true, force: true }); rmSync(storage, { recursive: true, force: true }); });
  writeFileSync(join(root, 'index.html'), '<html>home</html>');
  mkdirSync(join(storage, 'story-illustrations')); writeFileSync(join(storage, 'story-illustrations', 'a.png'), 'png');
  mkdirSync(join(storage, 'story-audio')); writeFileSync(join(storage, 'story-audio', 'b.mp3'), 'mp3');
  mkdirSync(join(storage, 'library', 'story-one'), { recursive: true }); writeFileSync(join(storage, 'library', 'story-one', 'page1.png'), 'png');
  writeFileSync(join(storage, 'library', 'story-one', 'notes.txt'), 'private notes');
  writeFileSync(join(storage, 'secret.txt'), 'secret');
  const app = express(); app.use(createPublicFiles(root, { storageDir: storage }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/story-illustrations/a.png', '/story-audio/b.mp3', '/library/story-one/page1.png', '/']) {
    const r = await fetch(base + path); assert.equal(r.status, 200, path); await r.arrayBuffer();
  }
  for (const path of ['/secret.txt', '/library/story-one/notes.txt', '/library/../secret.txt', '/library/story-one/../../secret.txt', '/story-illustrations/missing.png', '/story-illustrations/../secret.txt']) {
    const r = await fetch(base + path); assert.equal(r.status, 404, path); await r.arrayBuffer();
  }
});
