// Skepnad-sidan av samtalsstödet: svarar tillägget "Skepnad Kamera" och
// skickar bild + röst till samtalssidor (Messenger, Meet, Discord …) via en
// lokal WebRTC-förbindelse i samma webbläsare.
import { bus } from './bus.js';

const iceDone = (pc) =>
  new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const t = setTimeout(resolve, 1500);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t);
        resolve();
      }
    });
  });

export class CallBridge {
  constructor({ videoStream, audioStream }) {
    this.videoStream = videoStream; // () => MediaStream
    this.audioStream = audioStream;
    this.calls = new Map();
    this.extPresent = false;
    this.extVersion = null;
    window.addEventListener('message', (e) => this._onMessage(e));
    const hello = () => window.postMessage({ __skepnad: 'app-hello' }, '*');
    hello();
    this._timer = setInterval(hello, 10000);
  }

  get activeCalls() {
    return [...this.calls.values()].filter((c) => c.connected).length;
  }

  _reply(msg) {
    window.postMessage({ __skepnad: 'app-reply', ...msg }, '*');
  }

  _changed() {
    bus.emit('calls:update', { active: this.activeCalls, pages: [...this.calls.values()].filter((c) => c.connected).map((c) => c.page) });
  }

  async _onMessage(e) {
    if (e.source !== window || !e.data) return;
    const d = e.data;
    if (d.__skepnad === 'ext-present') {
      const first = !this.extPresent;
      this.extPresent = true;
      this.extVersion = d.version;
      if (first) bus.emit('ext:present', d.version);
      return;
    }
    if (d.__skepnad !== 'to-app') return;
    try {
      if (d.type === 'offer-request') await this._offer(d);
      else if (d.type === 'answer') {
        const call = this.calls.get(d.callId);
        if (!call) return this._reply({ id: d.id, error: 'unknown-call' });
        await call.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
        this._reply({ id: d.id, ok: true });
      } else if (d.type === 'hangup') {
        this._close(d.callId);
        this._reply({ id: d.id, ok: true });
      }
    } catch (err) {
      this._reply({ id: d.id, error: String(err?.message || err) });
    }
  }

  async _offer(d) {
    const pc = new RTCPeerConnection({ iceServers: [] });
    const callId = `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const call = { pc, page: d.page || 'samtal', connected: false };
    this.calls.set(callId, call);
    if (d.video) {
      const vs = this.videoStream();
      const track = vs?.getVideoTracks()[0];
      if (track) {
        const sender = pc.addTrack(track, vs);
        const params = sender.getParameters();
        params.encodings = [{ ...(params.encodings?.[0] || {}), maxBitrate: 9_000_000, maxFramerate: 30, priority: 'high', networkPriority: 'high' }];
        params.degradationPreference = 'maintain-resolution';
        sender.setParameters(params).catch(() => {});
      }
    }
    if (d.audio) {
      const as = this.audioStream();
      const track = as?.getAudioTracks()[0];
      if (track) pc.addTrack(track, as);
    }
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'connected') {
        call.connected = true;
        this._changed();
      }
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this._close(callId);
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await iceDone(pc);
    this._reply({ id: d.id, callId, sdp: pc.localDescription.sdp });
  }

  _close(callId) {
    const call = this.calls.get(callId);
    if (!call) return;
    this.calls.delete(callId);
    try {
      call.pc.close();
    } catch {
      /* ok */
    }
    this._changed();
  }
}
