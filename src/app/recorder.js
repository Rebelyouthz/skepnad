// Inspelning av utdata (bild + bearbetat ljud) till WebM.
export class Recorder {
  constructor() {
    this.rec = null;
    this.chunks = [];
    this.startedAt = 0;
  }

  get active() {
    return this.rec?.state === 'recording';
  }

  get elapsed() {
    return this.active ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  start(videoStream, audioStream) {
    const tracks = [...videoStream.getVideoTracks(), ...(audioStream?.getAudioTracks() ?? [])];
    const stream = new MediaStream(tracks);
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    this.chunks = [];
    this.rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 192_000 });
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000);
    this.startedAt = performance.now();
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.rec) return resolve(null);
      this.rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.rec = null;
        resolve(blob);
      };
      this.rec.stop();
    });
  }
}

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
