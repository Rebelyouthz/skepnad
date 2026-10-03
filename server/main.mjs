// Skepnad-motorn: lokal server som serverar appen och ger den "superkrafter"
// (spara klipp, dela, livesändning via ffmpeg, mobilkontroll).
import http from 'node:http';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { basename, extname, join, normalize, sep } from 'node:path';
import { acceptWebSocket } from './ws.mjs';
import { handleStreamSocket } from './stream.mjs';
import { RemoteHub } from './remote.mjs';
import { ffState, findFfmpeg, downloadFfmpeg } from './tools.mjs';
import { videosDir, reveal, openFolder, copyFileToClipboard, openInBrowser, lanAddresses, isWin } from './sys.mjs';

export const VERSION = '1.1.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.task': 'application/octet-stream',
  '.tflite': 'application/octet-stream',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
};

const CLIP_EXT = new Set(['.mp4', '.webm', '.mkv', '.png', '.jpg']);

const OPEN_URLS = [/^chrome:\/\/extensions\/?$/, /^edge:\/\/extensions\/?$/, /^https:\/\/(www\.)?youtube\.com\//, /^https:\/\/studio\.youtube\.com\//, /^https:\/\/(dashboard\.)?twitch\.tv\//, /^https:\/\/(www\.)?(messenger|facebook)\.com\//, /^https:\/\/(www\.)?kick\.com\//, /^https:\/\/(www\.)?tiktok\.com\//, /^https:\/\/vb-audio\.com\//, /^https:\/\/obsproject\.com\//, /^https:\/\/meet\.google\.com\//, /^https:\/\/discord\.com\//];

function sendFile(req, res, file, { cache = 'no-cache' } = {}) {
  const st = statSync(file);
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    if (start >= st.size || start > end) {
      res.writeHead(416, { 'content-range': `bytes */${st.size}` }).end();
      return;
    }
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'no-cache' });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', 'cache-control': cache });
  createReadStream(file).pipe(res);
}

/** Bara appen själv (samma dator, localhost-ursprung) får använda API:t. */
export function isTrusted(req) {
  const ra = req.socket.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ra)) return false;
  if (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']) return false;
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      const u = new URL(origin);
      if (!['localhost', '127.0.0.1'].includes(u.hostname)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

const safeName = (n) =>
  basename(String(n || ''))
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .slice(0, 120);

function uniquePath(dir, name) {
  let p = join(dir, name);
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let i = 2; existsSync(p); i++) p = join(dir, `${stem}-${i}${ext}`);
  return p;
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1e5) throw new Error('för stor');
  }
  return body ? JSON.parse(body) : {};
}

const json = (res, code, obj) => res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }).end(JSON.stringify(obj));

export function startServer({ root, port = 5174, open = false, exitWhenIdle = false, extensionDir = null, log = console.log }) {
  const serveStatic = (req, res, path) => {
    const file = normalize(join(root, path));
    if (!file.startsWith(root + sep) && file !== root) return res.writeHead(403).end();
    if (!existsSync(file) || !statSync(file).isFile()) return res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Hittades inte');
    sendFile(req, res, file, { cache: path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
  };
  const hub = new RemoteHub({ serveStatic });
  let appClients = 0;
  let idleTimer = null;
  const armIdle = () => {
    if (!exitWhenIdle) return;
    clearTimeout(idleTimer);
    if (appClients === 0) {
      idleTimer = setTimeout(() => {
        log('Skepnad stängdes – servern avslutas.');
        process.exit(0);
      }, 45000);
    }
  };

  const api = async (req, res, path) => {
    if (!isTrusted(req)) return json(res, 403, { error: 'Endast lokalt' });
    const dir = await videosDir();
    try {
      if (path === '/api/info' && req.method === 'GET') {
        await findFfmpeg();
        return json(res, 200, {
          app: 'skepnad',
          version: VERSION,
          platform: process.platform,
          videosDir: dir,
          ffmpeg: { state: ffState.state, progress: ffState.progress, encoder: ffState.encoder, error: ffState.error },
          remote: hub.info(),
          lan: lanAddresses(),
          extensionDir,
        });
      }
      if (path === '/api/clips' && req.method === 'GET') {
        if (!existsSync(dir)) return json(res, 200, { dir, clips: [] });
        const clips = readdirSync(dir)
          .filter((n) => CLIP_EXT.has(extname(n).toLowerCase()) && !n.endsWith('.part'))
          .map((n) => {
            const st = statSync(join(dir, n));
            return { name: n, size: st.size, mtime: st.mtimeMs, url: `/clips/${encodeURIComponent(n)}`, kind: /\.(png|jpg)$/i.test(n) ? 'image' : 'video' };
          })
          .sort((a, b) => b.mtime - a.mtime);
        return json(res, 200, { dir, clips });
      }
      if (path === '/api/clips' && req.method === 'POST') {
        const name = safeName(new URL(req.url, 'http://x').searchParams.get('name'));
        if (!CLIP_EXT.has(extname(name).toLowerCase())) return json(res, 400, { error: 'Ogiltig filtyp' });
        mkdirSync(dir, { recursive: true });
        const file = uniquePath(dir, name);
        const out = createWriteStream(file);
        req.pipe(out);
        await new Promise((r, j) => {
          out.on('finish', r);
          out.on('error', j);
        });
        return json(res, 200, { name: basename(file), path: file });
      }
      const m = /^\/api\/clips\/(.+)$/.exec(path);
      if (m && req.method === 'DELETE') {
        const file = join(dir, safeName(decodeURIComponent(m[1])));
        if (existsSync(file)) unlinkSync(file);
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/reveal') {
        const { name } = await readJson(req);
        const file = join(dir, safeName(name));
        if (existsSync(file)) reveal(file);
        else {
          mkdirSync(dir, { recursive: true });
          openFolder(dir);
        }
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/open-folder') {
        const { what } = await readJson(req);
        const target = what === 'extension' ? extensionDir : dir;
        if (!target) return json(res, 404, { error: 'Mappen saknas' });
        mkdirSync(target, { recursive: true });
        openFolder(target);
        return json(res, 200, { ok: true, path: target });
      }
      if (req.method === 'POST' && path === '/api/clipboard') {
        const { name } = await readJson(req);
        const file = join(dir, safeName(name));
        if (!existsSync(file)) return json(res, 404, { error: 'Filen finns inte' });
        await copyFileToClipboard(file);
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/open-url') {
        const { url, browser } = await readJson(req);
        if (!OPEN_URLS.some((r) => r.test(url))) return json(res, 400, { error: 'Adressen tillåts inte' });
        openInBrowser(url, { prefer: browser === 'edge' ? 'edge' : 'chrome' });
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/ffmpeg/install') {
        downloadFfmpeg().catch(() => {});
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/remote/start') {
        const info = await hub.start();
        return json(res, 200, info);
      }
      if (req.method === 'POST' && path === '/api/remote/stop') {
        hub.stop();
        return json(res, 200, hub.info());
      }
      return json(res, 404, { error: 'Okänt API' });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  };

  const server = http.createServer((req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      return res.writeHead(400).end();
    }
    if (path.startsWith('/api/')) return void api(req, res, path);
    if (path.startsWith('/clips/')) {
      if (!isTrusted(req)) return res.writeHead(403).end();
      return void videosDir().then((dir) => {
        const file = join(dir, safeName(path.slice(7)));
        if (!existsSync(file)) return res.writeHead(404).end();
        sendFile(req, res, file);
      });
    }
    if (path.endsWith('/')) path += 'index.html';
    serveStatic(req, res, path);
  });

  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url, 'http://x').pathname;
    if (!isTrusted(req)) return socket.destroy();
    const ws = acceptWebSocket(req, socket, head);
    if (!ws) return;
    if (path === '/ws/stream') return void handleStreamSocket(ws);
    if (path === '/ws/host') {
      appClients++;
      clearTimeout(idleTimer);
      ws.on('close', () => {
        appClients--;
        armIdle();
      });
      return hub.addHost(ws);
    }
    if (path === '/ws/record') return void handleRecordSocket(ws);
    ws.close();
  });

  async function handleRecordSocket(ws) {
    let out = null;
    let file = null;
    let size = 0;
    ws.on('message', async (data, bin) => {
      if (bin) {
        size += data.length;
        out?.write(data);
        return;
      }
      const msg = JSON.parse(data);
      if (msg.type === 'start') {
        const dir = await videosDir();
        mkdirSync(dir, { recursive: true });
        file = uniquePath(dir, safeName(msg.name));
        out = createWriteStream(file);
        ws.json({ type: 'ready', name: basename(file) });
      } else if (msg.type === 'end' && out) {
        out.end(() => ws.json({ type: 'saved', name: basename(file), path: file, size }));
        out = null;
      }
    });
    ws.on('close', () => out?.end());
  }

  return new Promise((resolve) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log(`Skepnad körs redan på http://localhost:${port}/ – öppnar fönstret.`);
        if (open) openInBrowser(`http://localhost:${port}/`, { app: true });
        setTimeout(() => process.exit(0), 800);
      } else throw err;
    });
    server.listen(port, '127.0.0.1', () => {
      const url = `http://localhost:${port}/`;
      log(`Skepnad körs på ${url}`);
      if (open) openInBrowser(url, { app: true });
      armIdle();
      resolve({ server, hub, url });
    });
  });
}

export { isWin };
