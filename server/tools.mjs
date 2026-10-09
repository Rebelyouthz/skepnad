// ffmpeg: hitta, ladda ner vid behov och välj bästa H.264-kodare.
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { spawn } from 'node:child_process';
import { isWin, run, toolsDir } from './sys.mjs';

const FF_URL = {
  win32: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz',
  linux: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-x64.gz',
  darwin: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-x64.gz',
};

export const ffState = { state: 'unknown', progress: 0, path: null, error: null, encoder: null };

function localFfmpeg() {
  const exe = join(toolsDir(), isWin ? 'ffmpeg.exe' : 'ffmpeg');
  return existsSync(exe) && statSync(exe).size > 1e6 ? exe : null;
}

export async function findFfmpeg() {
  if (ffState.path && existsSync(ffState.path)) return ffState.path;
  const candidates = [process.env.SKEPNAD_FFMPEG, localFfmpeg()].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) {
      ffState.path = c;
      ffState.state = 'ready';
      return c;
    }
  }
  try {
    await run(isWin ? 'ffmpeg.exe' : 'ffmpeg', ['-hide_banner', '-version']);
    ffState.path = isWin ? 'ffmpeg.exe' : 'ffmpeg';
    ffState.state = 'ready';
    return ffState.path;
  } catch {
    ffState.state = ffState.state === 'downloading' ? 'downloading' : 'missing';
    return null;
  }
}

let downloading = null;
export function downloadFfmpeg() {
  if (downloading) return downloading;
  downloading = (async () => {
    const url = FF_URL[process.platform];
    if (!url) throw new Error('Plattformen stöds inte');
    ffState.state = 'downloading';
    ffState.progress = 0;
    ffState.error = null;
    const dir = toolsDir();
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, isWin ? 'ffmpeg.exe' : 'ffmpeg');
    const tmp = `${dest}.part`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length')) || 30e6;
      let got = 0;
      const counter = new Transform({
        transform(chunk, _enc, cb) {
          got += chunk.length;
          ffState.progress = Math.min(got / total, 0.99);
          cb(null, chunk);
        },
      });
      await pipeline(Readable.fromWeb(res.body), counter, createGunzip(), createWriteStream(tmp, { mode: 0o755 }));
      renameSync(tmp, dest);
      ffState.path = dest;
      ffState.state = 'ready';
      ffState.progress = 1;
      return dest;
    } catch (err) {
      rmSync(tmp, { force: true });
      ffState.state = 'error';
      ffState.error = err.message;
      throw err;
    } finally {
      downloading = null;
    }
  })();
  return downloading;
}

export async function ensureFfmpeg() {
  return (await findFfmpeg()) || downloadFfmpeg();
}

function tryEncoder(ff, args) {
  return new Promise((resolve) => {
    const p = spawn(ff, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=640x360:r=30', '-t', '0.3', ...args, '-f', 'null', '-'], { windowsHide: true });
    const t = setTimeout(() => p.kill(), 8000);
    p.on('exit', (code) => {
      clearTimeout(t);
      resolve(code === 0);
    });
    p.on('error', () => resolve(false));
  });
}

/** Välj hårdvarukodare om den fungerar, annars x264. */
export async function pickEncoder(ff) {
  if (ffState.encoder) return ffState.encoder;
  const hw = [
    ['nvenc', ['-c:v', 'h264_nvenc']],
    ['amf', ['-c:v', 'h264_amf']],
    ['qsv', ['-c:v', 'h264_qsv']],
  ];
  for (const [name, args] of hw) {
    if (await tryEncoder(ff, args)) {
      ffState.encoder = name;
      return name;
    }
  }
  ffState.encoder = 'x264';
  return 'x264';
}

export function encoderArgs(name, kbps, fps) {
  const g = String(Math.round(fps * 2));
  const b = `${kbps}k`;
  switch (name) {
    case 'nvenc':
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-tune', 'll', '-rc', 'cbr', '-b:v', b, '-maxrate', b, '-bufsize', `${kbps * 2}k`, '-g', g, '-bf', '0'];
    case 'amf':
      return ['-c:v', 'h264_amf', '-usage', 'lowlatency', '-quality', 'speed', '-rc', 'cbr', '-b:v', b, '-maxrate', b, '-bufsize', `${kbps * 2}k`, '-g', g, '-bf', '0'];
    case 'qsv':
      return ['-c:v', 'h264_qsv', '-preset', 'veryfast', '-b:v', b, '-maxrate', b, '-bufsize', `${kbps * 2}k`, '-g', g, '-bf', '0'];
    default:
      return ['-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-b:v', b, '-maxrate', b, '-bufsize', `${kbps * 2}k`, '-g', g, '-keyint_min', g, '-sc_threshold', '0'];
  }
}

/**
 * Gör om en WebM-inspelning till MP4 (H.264/AAC) så att den spelas överallt:
 * Messenger, telefoner, YouTube. Returnerar sökvägen till MP4-filen eller null.
 */
export async function convertToMp4(input) {
  const ff = await ensureFfmpeg().catch(() => null);
  if (!ff) return null;
  const output = input.replace(/\.webm$/i, '.mp4');
  const enc = await pickEncoder(ff);
  const HW = { nvenc: 'h264_nvenc', amf: 'h264_amf', qsv: 'h264_qsv' };
  const video = HW[enc] ? ['-c:v', HW[enc], '-b:v', '8000k', '-maxrate', '10000k', '-bufsize', '16000k'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'];
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, ...video, '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', output];
  const ok = await new Promise((resolve) => {
    const p = spawn(ff, args, { windowsHide: true });
    const t = setTimeout(() => p.kill(), 10 * 60 * 1000);
    p.on('exit', (code) => {
      clearTimeout(t);
      resolve(code === 0);
    });
    p.on('error', () => resolve(false));
  });
  if (!ok || !existsSync(output) || statSync(output).size < 1000) {
    rmSync(output, { force: true });
    return null;
  }
  rmSync(input, { force: true });
  return output;
}
