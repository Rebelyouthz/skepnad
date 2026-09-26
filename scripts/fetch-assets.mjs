// Hämtar MediaPipe-modeller och kopierar wasm-filer till public/ så att appen
// fungerar helt offline efter installation. Misslyckas en nedladdning faller
// appen tillbaka på Googles CDN vid körning.
import { mkdir, copyFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmDst = join(root, 'public', 'mediapipe', 'wasm');
const modelDst = join(root, 'public', 'models');

export const MODELS = {
  'face_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
  'selfie_segmenter_landscape.tflite':
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite',
  'gesture_recognizer.task':
    'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task',
};

async function copyWasm() {
  if (!existsSync(wasmSrc)) {
    console.warn('[skepnad] Hittade inte MediaPipe-wasm i node_modules – hoppar över.');
    return;
  }
  await mkdir(wasmDst, { recursive: true });
  for (const f of await readdir(wasmSrc)) {
    await copyFile(join(wasmSrc, f), join(wasmDst, f));
  }
  console.log('[skepnad] MediaPipe-wasm kopierad till public/mediapipe/wasm');
}

async function download(name, url) {
  const dst = join(modelDst, name);
  if (existsSync(dst) && (await stat(dst)).size > 1000) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dst, Buffer.from(await res.arrayBuffer()));
    console.log(`[skepnad] Laddade ner ${name}`);
  } catch (err) {
    console.warn(`[skepnad] Kunde inte ladda ner ${name} (${err.message}). Appen använder CDN istället.`);
  }
}

await copyWasm();
await mkdir(modelDst, { recursive: true });
await Promise.all(Object.entries(MODELS).map(([n, u]) => download(n, u)));
