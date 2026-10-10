import express from 'express';

const publicFiles = new Set([
  '/index.html', '/app.js', '/auth.js', '/child-mode.js', '/reading-experience.js',
  '/api-app.js', '/privacy.js', '/legal.js', '/error-reporting.js',
  '/app.css', '/enterprise.css', '/workspace.css', '/story-shelf.css',
  '/deleted-stories.css', '/reader.css', '/mobile-nav.css', '/story-preview.css',
  '/auth.css', '/privacy.css', '/assessment.css', '/landing.css',
  '/story-sprout-ad.mp4'
]);

// storageDir: where generated files (illustrations, narration audio, the story library) live. On Railway it is a
// persistent volume (STORAGE_DIR); locally it defaults to the project folder.
export function createPublicFiles(rootDir, { storageDir = rootDir } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
    if (!['GET', 'HEAD'].includes(req.method)) return res.sendStatus(404);
    if (pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) return res.sendStatus(404);
    const image = /^\/(?:images|imagesAI|story-illustrations)\/.+\.(?:png|jpe?g|webp|gif|svg|ico)$/i.test(pathname);
    const audio = /^\/story-audio\/[^/]+\.mp3$/i.test(pathname);
    const video = /^\/video\/[^/]+\.mp4$/i.test(pathname);
    // one folder per library story: /library/<story-id>/<file>.(png|mp3)
    const library = /^\/library\/[a-z0-9_-]+\/[a-z0-9_.-]+\.(?:png|jpe?g|webp|mp3)$/i.test(pathname);
    if (pathname !== '/' && !publicFiles.has(pathname) && !image && !audio && !video && !library) return res.sendStatus(404);
    if (pathname === '/' || /\.(?:html|js|css)$/.test(pathname)) res.setHeader('Cache-Control', 'no-store, max-age=0');
    next();
  });
  if (storageDir !== rootDir) {
    const storageFiles = express.static(storageDir, { dotfiles: 'deny', index: false, redirect: false });
    router.use((req, res, next) => (/^\/(?:story-illustrations|story-audio|library)\//.test(req.path) ? storageFiles(req, res, next) : next()));
  }
  router.use(express.static(rootDir, { dotfiles: 'deny', index: 'index.html', redirect: false }));
  router.use((req, res) => res.sendStatus(404));
  return router;
}
