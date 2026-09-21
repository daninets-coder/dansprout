import express from 'express';
import path from 'node:path';
const app=express();
const root=process.cwd();
app.get('/',(req,res)=>res.sendFile(path.join(root,'index.html')));
app.use((req,res,next)=>{ if (/^\/[\w-]+\.(js|css)$/.test(req.path) || /^\/(images|imagesAI)\//.test(req.path)) return next(); res.sendStatus(404); });
app.use(express.static(root));
app.listen(3107,'127.0.0.1');
