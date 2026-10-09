// Livesändning till YouTube, Twitch, Kick, TikTok, Facebook eller egen RTMP –
// även till flera samtidigt. Kräver motorn (ffmpeg laddas ner automatiskt).
import { bus } from './bus.js';

export const SERVICES = [
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#ff2d55', url: 'rtmp://a.rtmp.youtube.com/live2', keyUrl: 'https://studio.youtube.com/', keyHelp: 'YouTube Studio → Skapa → Sänd live → Streamnyckel.', note: 'Första gången måste livesändning aktiveras på kontot – det kan ta upp till 24 timmar.' },
  { id: 'twitch', name: 'Twitch', icon: '💜', color: '#9146ff', url: 'rtmp://live.twitch.tv/app', keyUrl: 'https://dashboard.twitch.tv/settings/stream', keyHelp: 'Twitch → Skaparpanelen → Inställningar → Stream → Primär streamnyckel.' },
  { id: 'kick', name: 'Kick', icon: '🟩', color: '#53fc18', url: '', editableUrl: true, keyUrl: 'https://kick.com/dashboard/settings/stream', keyHelp: 'Kick → Dashboard → Settings → Stream: kopiera både Stream URL och Stream Key.' },
  { id: 'tiktok', name: 'TikTok LIVE', icon: '🎵', color: '#25f4ee', url: '', editableUrl: true, keyUrl: 'https://www.tiktok.com/live/producer', keyHelp: 'TikTok LIVE Producer → Server URL och Stream Key (kräver att kontot har tillgång).' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2', url: 'rtmps://live-api-s.facebook.com:443/rtmp', keyUrl: 'https://www.facebook.com/live/producer', keyHelp: 'Facebook → Live Producer → Streamnyckel.' },
  { id: 'custom', name: 'Egen server', icon: '🛰️', color: '#7c5cff', url: '', editableUrl: true, keyHelp: 'Valfri RTMP/RTMPS-adress, t.ex. från Restream.' },
];
export const SERVICE_MAP = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

export function outputUrl(def, cfg) {
  const base = (def.editableUrl ? cfg.url : cfg.url || def.url || '').trim().replace(/\/+$/, '');
  const key = (cfg.key || '').trim();
  if (!base || !key) return null;
  return `${base}/${key}`;
}

function pickMime() {
  // VP8 först: motorn kodar ändå om till H.264 för tjänsterna, och Chromes H.264-kodare kan krascha på vissa datorer.
  const types = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export class LiveController {
  constructor() {
    this.state = 'idle'; // idle | preparing | live | stopping | error
    this.stats = null;
    this.startedAt = 0;
    this.error = null;
    this.warn = null;
    this.targets = [];
  }

  get elapsed() {
    return this.state === 'live' ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  _set(state, extra = {}) {
    Object.assign(this, { state, ...extra });
    bus.emit('live:update', this);
  }

  /** targets: [{ id, name, url }] */
  start({ host, videoStream, audioStream, targets, saveCopy, kbps }) {
    if (this.state === 'live' || this.state === 'preparing') return;
    this.targets = targets;
    this.error = null;
    this.warn = null;
    this.stats = null;
    this._set('preparing');
    const stream = new MediaStream([...videoStream.getVideoTracks(), ...(audioStream?.getAudioTracks() ?? [])]);
    this.conn = host.openStream({ outputs: targets.map((t) => ({ url: t.url })), saveCopy, fps: 30, kbps }, (ev) => this._onEvent(ev));
    const mimeType = pickMime();
    this.rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 9_000_000, audioBitsPerSecond: 192_000 });
    let chain = Promise.resolve();
    this.rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      chain = chain.then(async () => this.conn?.send(await e.data.arrayBuffer()));
    };
    this.rec.start(250);
  }

  _onEvent(ev) {
    if (ev.type === 'status' && ev.state === 'live') this._set('live', { startedAt: performance.now(), encoder: ev.encoder, recordPath: ev.recordPath });
    else if (ev.type === 'status') this._set('preparing', { text: ev.text });
    else if (ev.type === 'stats') this._set(this.state, { stats: ev });
    else if (ev.type === 'warn') this._set(this.state, { warn: ev.text });
    else if (ev.type === 'ended') {
      this._stopRecorder();
      this._set(ev.error ? 'error' : 'idle', { error: ev.error, recordPath: ev.recordPath });
    } else if (ev.type === 'closed' && this.state !== 'idle' && this.state !== 'error') {
      this._stopRecorder();
      this._set('idle');
    }
  }

  _stopRecorder() {
    if (this.rec?.state === 'recording') this.rec.stop();
    this.rec = null;
  }

  stop() {
    if (this.state === 'idle') return;
    this._set('stopping');
    this._stopRecorder();
    this.conn?.stop();
    this.conn = null;
  }
}
