// Inspelning av utdata (bild + bearbetat ljud). MP4 (H.264/AAC) när webbläsaren
// klarar det – fungerar direkt på YouTube, i Messenger och på telefoner.
// Med motorn strömmas bitarna direkt till Videor\Skepnad (kraschsäkert).

const MP4 = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4'];
const WEBM = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];

// Självläkning: vissa webbläsare/grafikdrivrutiner kraschar fliken med MP4-
// kodaren. Vi skriver ner formatet innan inspelningen startar och stryker det
// när första biten kommit – finns det kvar vid nästa start kraschade det.
const BAD_KEY = 'skepnad:badMime';
const TRY_KEY = 'skepnad:recTry';
const ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* privat läge */
    }
  },
};
const badList = () => JSON.parse(ls.get(BAD_KEY) || '[]');

/** Anropas vid start. Returnerar formatet som kraschade förra gången (eller null). */
export function checkRecorderCrash() {
  const t = ls.get(TRY_KEY);
  if (!t) return null;
  ls.set(BAD_KEY, JSON.stringify([...new Set([...badList(), t])]));
  ls.set(TRY_KEY, null);
  return t;
}

const isPhone = () => /Android|iPhone|iPad/i.test(navigator.userAgent);

export function pickRecordingMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const bad = badList();
  // Telefon: MP4 först (bäst för galleri, Messenger, TikTok). Dator: WebM först –
  // motorn gör om klippet till MP4 efteråt, och Chromes MP4-kodare kan krascha på datorer.
  const order = isPhone() ? [...MP4, ...WEBM] : [...WEBM, ...MP4];
  return order.find((t) => !bad.includes(t) && MediaRecorder.isTypeSupported(t)) || '';
}

export class Recorder {
  constructor() {
    this.rec = null;
    this.chunks = [];
    this.startedAt = 0;
    this.sink = null;
    this.chain = Promise.resolve();
  }

  get active() {
    return this.rec?.state === 'recording';
  }

  get elapsed() {
    return this.active ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  /** host: klient för motorn (kan vara otillgänglig). */
  async start(videoStream, audioStream, { host, baseName, pixels = 1280 * 720 }) {
    const tracks = [...videoStream.getVideoTracks(), ...(audioStream?.getAudioTracks() ?? [])];
    const stream = new MediaStream(tracks);
    const mimeType = pickRecordingMime();
    this.ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    this.mime = mimeType;
    this.chunks = [];
    this.sink = null;
    this.chain = Promise.resolve();
    if (host?.available) {
      try {
        this.sink = await host.openRecordSink(`${baseName}.${this.ext}`);
      } catch {
        this.sink = null;
      }
    }
    const vbps = pixels > 1.5e6 ? 14_000_000 : 9_000_000;
    this.rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: vbps, audioBitsPerSecond: 192_000 });
    this.rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      ls.set(TRY_KEY, null);
      if (this.sink) {
        const sink = this.sink;
        this.chain = this.chain.then(async () => sink.write(await e.data.arrayBuffer()));
      } else this.chunks.push(e.data);
    };
    ls.set(TRY_KEY, mimeType);
    this.rec.start(1000);
    this.startedAt = performance.now();
  }

  /** Returnerar { saved: {name, path, size} } eller { blob, ext }. */
  stop() {
    return new Promise((resolve) => {
      if (!this.rec) return resolve(null);
      const duration = this.elapsed;
      this.rec.onstop = async () => {
        this.rec = null;
        if (this.sink) {
          await this.chain;
          const saved = await this.sink.end();
          this.sink = null;
          resolve({ saved, ext: this.ext, duration });
        } else {
          resolve({ blob: new Blob(this.chunks, { type: this.mime.split(';')[0] || 'video/webm' }), ext: this.ext, duration });
        }
      };
      this.rec.stop();
    });
  }
}

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Dela en fil via operativsystemets delningsmeny (Windows/Android). */
export async function shareFile(blob, name, title = 'Skepnad') {
  const file = new File([blob], name, { type: blob.type || 'video/mp4' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text: 'Gjord med Skepnad 🎭' });
    return true;
  }
  return false;
}
