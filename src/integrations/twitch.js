// Läser Twitch-chatt anonymt (ingen inloggning behövs) via IRC över WebSocket.
import { bus } from '../app/bus.js';

export function parseIrc(line) {
  let rest = line;
  const tags = {};
  if (rest.startsWith('@')) {
    const sp = rest.indexOf(' ');
    for (const kv of rest.slice(1, sp).split(';')) {
      const [k, v = ''] = kv.split('=');
      tags[k] = v.replace(/\\s/g, ' ');
    }
    rest = rest.slice(sp + 1);
  }
  let prefix = '';
  if (rest.startsWith(':')) {
    const sp = rest.indexOf(' ');
    prefix = rest.slice(1, sp);
    rest = rest.slice(sp + 1);
  }
  const trail = rest.indexOf(' :');
  const text = trail >= 0 ? rest.slice(trail + 2) : '';
  const parts = (trail >= 0 ? rest.slice(0, trail) : rest).split(' ');
  const command = parts[0];
  const user = tags['display-name'] || prefix.split('!')[0] || '';
  return { tags, prefix, command, params: parts.slice(1), text, user };
}

export class TwitchChat {
  constructor() {
    this.ws = null;
    this.channel = '';
    this.status = 'off';
    this._retry = null;
  }

  connect(channel) {
    this.disconnect();
    this.channel = channel.trim().toLowerCase().replace(/^#/, '');
    if (!this.channel) return;
    this._setStatus('connecting');
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    this.ws = ws;
    ws.onopen = () => {
      ws.send('CAP REQ :twitch.tv/tags');
      ws.send('PASS SCHMOOPIIE');
      ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`);
      ws.send(`JOIN #${this.channel}`);
    };
    ws.onmessage = (e) => {
      for (const line of String(e.data).split('\r\n')) {
        if (!line) continue;
        if (line.startsWith('PING')) {
          ws.send('PONG :tmi.twitch.tv');
          continue;
        }
        const m = parseIrc(line);
        if (m.command === '366' || m.command === 'JOIN') this._setStatus('on');
        if (m.command === 'PRIVMSG') bus.emit('twitch:message', { user: m.user, text: m.text, color: m.tags.color });
      }
    };
    ws.onerror = () => this._setStatus('error');
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this._setStatus('error');
      this._retry = setTimeout(() => this.connect(this.channel), 5000);
    };
  }

  disconnect() {
    clearTimeout(this._retry);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this._setStatus('off');
  }

  _setStatus(s) {
    this.status = s;
    bus.emit('twitch:status', s);
  }
}
