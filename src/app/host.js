// Klient för Skepnad-motorn (den lokala servern). Om appen körs utan motorn
// (t.ex. på en webbadress eller i utvecklingsläge) faller funktionerna tillbaka
// på vanliga nedladdningar.
import { bus } from './bus.js';

const wsUrl = (path) => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${path}`;

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body && !(body instanceof Blob) ? { 'content-type': 'application/json' } : undefined,
    body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const host = {
  available: false,
  info: null,
  remoteCount: 0,
  _hostWs: null,

  async detect() {
    try {
      const info = await call('/api/info');
      this.available = info.app === 'skepnad';
      this.info = info;
      if (this.available) this.connectHost();
    } catch {
      this.available = false;
    }
    return this.available;
  },

  async refresh() {
    if (!this.available) return null;
    this.info = await call('/api/info');
    return this.info;
  },

  /** Värdkanal: håller servern vid liv och tar emot kommandon från mobilen. */
  connectHost() {
    const ws = new WebSocket(wsUrl('/ws/host'));
    this._hostWs = ws;
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === 'cmd') bus.emit('remote:cmd', msg);
      if (msg.type === 'remotes') {
        this.remoteCount = msg.count;
        bus.emit('remote:count', msg.count);
      }
    };
    ws.onclose = () => {
      this._hostWs = null;
      setTimeout(() => this.connectHost(), 2000);
    };
  },

  pushState(state) {
    if (this._hostWs?.readyState === 1) this._hostWs.send(JSON.stringify({ type: 'state', ...state }));
  },

  clips: () => call('/api/clips'),
  deleteClip: (name) => call(`/api/clips/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  reveal: (name) => call('/api/reveal', { method: 'POST', body: { name } }),
  openFolder: (what = 'videos') => call('/api/open-folder', { method: 'POST', body: { what } }),
  copyToClipboard: (name) => call('/api/clipboard', { method: 'POST', body: { name } }),
  openUrl: (url, browser) => call('/api/open-url', { method: 'POST', body: { url, browser } }),
  installFfmpeg: () => call('/api/ffmpeg/install', { method: 'POST' }),
  startRemote: () => call('/api/remote/start', { method: 'POST' }),
  stopRemote: () => call('/api/remote/stop', { method: 'POST' }),
  saveBlob: (name, blob) => call(`/api/clips?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob }),

  /** Strömma inspelningsbitar direkt till en fil i Videor\Skepnad. */
  openRecordSink(name) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl('/ws/record'));
      ws.binaryType = 'arraybuffer';
      let savedResolve = null;
      const sink = {
        name,
        write: (buf) => ws.readyState === 1 && ws.send(buf),
        end: () =>
          new Promise((r) => {
            savedResolve = r;
            ws.send(JSON.stringify({ type: 'end' }));
            setTimeout(() => r(null), 8000);
          }),
      };
      ws.onopen = () => ws.send(JSON.stringify({ type: 'start', name }));
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ready') {
          sink.name = msg.name;
          resolve(sink);
        }
        if (msg.type === 'saved') {
          savedResolve?.(msg);
          ws.close();
        }
      };
      ws.onerror = () => reject(new Error('Kunde inte spara via motorn'));
    });
  },

  /** Livesändning via ffmpeg. Returnerar { send(chunk), stop() }. */
  openStream(config, onEvent) {
    const ws = new WebSocket(wsUrl('/ws/stream'));
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => ws.send(JSON.stringify({ type: 'start', ...config }));
    ws.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        /* ignorera */
      }
    };
    ws.onclose = () => onEvent({ type: 'closed' });
    return {
      get buffered() {
        return ws.bufferedAmount;
      },
      send: (buf) => ws.readyState === 1 && ws.send(buf),
      stop: () => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'stop' }));
        setTimeout(() => ws.close(), 3000);
      },
    };
  },
};
