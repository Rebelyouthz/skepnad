// Livesändning: webbläsaren skickar WebM-bitar via WebSocket → ffmpeg → RTMP(S)
// till en eller flera tjänster samtidigt (+ valfri lokal kopia).
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ensureFfmpeg, pickEncoder, encoderArgs } from './tools.mjs';
import { videosDir } from './sys.mjs';

const teeEscape = (s) => s.replace(/\\/g, '/').replace(/([|\[\]])/g, '\\$1');

export function friendlyError(line) {
  if (/Connection refused|Connection timed out|No route to host|Network is unreachable/i.test(line)) return 'Kunde inte nå streamtjänsten – kolla internetanslutningen och serveradressen.';
  if (/Server returned 4\d\d|Unauthorized|Forbidden|Authentication/i.test(line)) return 'Tjänsten nekade anslutningen – kontrollera streamnyckeln.';
  if (/Input\/output error|Broken pipe|End of file/i.test(line)) return 'Anslutningen till streamtjänsten bröts.';
  if (/Invalid data found/i.test(line)) return 'Videodata kunde inte läsas.';
  return null;
}

export function buildArgs(cfg, encoder, recordPath) {
  const fps = cfg.fps || 30;
  const kbps = Math.round(cfg.kbps || 4000);
  const outs = (cfg.outputs || []).map((o) => `[f=flv:onfail=ignore]${teeEscape(o.url)}`);
  if (recordPath) outs.push(`[f=matroska:onfail=ignore]${teeEscape(recordPath)}`);
  return [
    '-hide_banner',
    '-loglevel', 'info',
    '-stats',
    '-fflags', '+genpts+discardcorrupt',
    '-thread_queue_size', '1024',
    '-f', 'webm',
    '-i', 'pipe:0',
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-vf', `fps=${fps},format=yuv420p`,
    ...encoderArgs(encoder, kbps, fps),
    '-c:a', 'aac',
    '-b:a', '160k',
    '-ar', '48000',
    '-ac', '2',
    '-flags', '+global_header',
    '-f', 'tee',
    outs.join('|'),
  ];
}

/** Hanterar en /ws/stream-anslutning. */
export function handleStreamSocket(ws) {
  let ff = null;
  let started = false;
  let queued = [];
  let lastErr = null;
  let bytes = 0;

  const stop = () => {
    if (ff && ff.stdin.writable) ff.stdin.end();
    setTimeout(() => ff?.kill('SIGKILL'), 5000);
  };

  ws.on('message', async (data, isBinary) => {
    if (isBinary) {
      bytes += data.length;
      if (!started) queued.push(data);
      else if (ff?.stdin.writable) ff.stdin.write(data);
      return;
    }
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.type === 'stop') return stop();
    if (msg.type !== 'start' || ff) return;
    try {
      ws.json({ type: 'status', state: 'preparing', text: 'Förbereder sändningen…' });
      const ffPath = await ensureFfmpeg();
      const encoder = await pickEncoder(ffPath);
      let recordPath = null;
      if (msg.saveCopy) {
        const dir = await videosDir();
        mkdirSync(dir, { recursive: true });
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        recordPath = join(dir, `live-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.mkv`);
      }
      const args = buildArgs(msg, encoder, recordPath);
      ff = spawn(ffPath, args, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
      ff.stdin.on('error', () => {});
      let tail = '';
      ff.stderr.on('data', (chunk) => {
        tail = (tail + chunk.toString()).slice(-4000);
        const lines = tail.split(/[\r\n]+/);
        tail = lines.pop();
        for (const line of lines) {
          const m = /frame=\s*(\d+).*?fps=\s*([\d.]+)(?:.*?bitrate=\s*([\d.]+)kbits\/s)?.*?speed=\s*([\d.]+)x/.exec(line);
          if (m) ws.json({ type: 'stats', frames: +m[1], fps: +m[2], kbps: m[3] ? +m[3] : null, speed: +m[4], encoder });
          const fe = friendlyError(line);
          if (fe) {
            lastErr = fe;
            ws.json({ type: 'warn', text: fe, detail: line.slice(0, 200) });
          }
        }
      });
      ff.on('exit', (code) => {
        ws.json({ type: 'ended', code, error: code ? lastErr || `ffmpeg avslutades (${code})` : null, recordPath });
        ff = null;
      });
      ff.on('error', (err) => ws.json({ type: 'ended', code: -1, error: err.message }));
      started = true;
      for (const q of queued) ff.stdin.write(q);
      queued = [];
      ws.json({ type: 'status', state: 'live', text: 'Du är live!', encoder, recordPath });
    } catch (err) {
      ws.json({ type: 'ended', code: -1, error: `Kunde inte starta: ${err.message}` });
    }
  });
  ws.on('close', stop);
  return { get bytes() {
    return bytes;
  } };
}
