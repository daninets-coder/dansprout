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
