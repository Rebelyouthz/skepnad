// Beroendefri server för den byggda appen (dist/). Används av "Starta Skepnad.cmd".
//   node serve.mjs [--open] [--port 5174]
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 5174;
const url = `http://localhost:${port}/`;

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
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.task': 'application/octet-stream',
  '.tflite': 'application/octet-stream',
};

function openBrowser() {
  if (process.platform !== 'win32') {
    spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  const la = process.env.LOCALAPPDATA || '';
  const candidates = [
    `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${la}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ];
  const exe = candidates.find((p) => p && existsSync(p));
  if (exe) {
    spawn(exe, [`--app=${url}`, '--window-size=1600,1000', '--autoplay-policy=no-user-gesture-required'], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  }
}

if (!existsSync(join(root, 'index.html'))) {
  console.error('Hittar inte dist/. Bygg först med: npm run build');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, url).pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root + sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Hittades inte');
    return;
  }
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const cache = path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  res.writeHead(200, { 'content-type': type, 'cache-control': cache });
  createReadStream(file).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Skepnad körs redan på ${url} – öppnar fönstret.`);
    if (args.includes('--open')) openBrowser();
    setTimeout(() => process.exit(0), 500);
  } else throw err;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`\n  🎭  Skepnad körs på ${url}\n  Stäng det här fönstret för att avsluta.\n`);
  if (args.includes('--open')) openBrowser();
});
