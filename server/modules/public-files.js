import express from 'express';

const publicFiles = new Set([
  '/index.html', '/app.js', '/auth.js', '/child-mode.js', '/reading-experience.js',
  '/api-app.js', '/privacy.js', '/legal.js', '/error-reporting.js',
  '/app.css', '/enterprise.css', '/workspace.css', '/story-shelf.css',
  '/deleted-stories.css', '/reader.css', '/mobile-nav.css', '/story-preview.css',
  '/auth.css', '/privacy.css', '/assessment.css', '/landing.css',
  '/story-sprout-ad.mp4'
]);

export function createPublicFiles(rootDir) {
  const router = express.Router();
  router.use((req, res, next) => {
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
    if (!['GET', 'HEAD'].includes(req.method)) return res.sendStatus(404);
    if (pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) return res.sendStatus(404);
    const image = /^\/(?:images|imagesAI|story-illustrations)\/.+\.(?:png|jpe?g|webp|gif|svg|ico)$/i.test(pathname);
    const audio = /^\/story-audio\/[^/]+\.mp3$/i.test(pathname);
    const video = /^\/video\/[^/]+\.mp4$/i.test(pathname);
    if (pathname !== '/' && !publicFiles.has(pathname) && !image && !audio && !video) return res.sendStatus(404);
    if (pathname === '/' || /\.(?:html|js|css)$/.test(pathname)) res.setHeader('Cache-Control', 'no-store, max-age=0');
    next();
  });
  router.use(express.static(rootDir, { dotfiles: 'deny', index: 'index.html', redirect: false }));
  router.use((req, res) => res.sendStatus(404));
  return router;
}
