// Diskreta, premiumkänsliga gränssnittsljud. Spelas bara lokalt – aldrig i sändningen.

export class UiSounds {
  constructor() {
    this.ctx = null;
    this.out = null;
    this.enabled = true;
    this.volume = 0.55;
    this._lastHover = 0;
  }

  attach(ctx, destination) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.out.connect(comp).connect(destination);
  }

  setVolume(v) {
    this.volume = v;
    if (this.out) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  _ok() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  _tone(t, { f, f2, dur = 0.08, peak = 0.1, type = 'sine', a = 0.004 }) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(t, { dur = 0.15, f = 1200, f2 = 3000, peak = 0.05, q = 1 }) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * (dur + 0.02));
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource();
    s.buffer = b;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f, t);
    bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(this.out);
    s.start(t);
  }

  play(name) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'hover': {
        const now = performance.now();
        if (now - this._lastHover < 45) return;
        this._lastHover = now;
        this._tone(t, { f: 2400 + Math.random() * 300, dur: 0.035, peak: 0.018 });
        break;
      }
      case 'click':
        this._tone(t, { f: 900, f2: 420, dur: 0.07, peak: 0.07 });
        this._tone(t, { f: 2600, dur: 0.02, peak: 0.02 });
        break;
      case 'select':
        this._tone(t, { f: 660, dur: 0.09, peak: 0.05, type: 'triangle' });
        this._tone(t + 0.055, { f: 990, dur: 0.14, peak: 0.05, type: 'triangle' });
        break;
      case 'on':
        this._tone(t, { f: 740, dur: 0.07, peak: 0.05 });
        this._tone(t + 0.06, { f: 1108, dur: 0.1, peak: 0.05 });
        break;
      case 'off':
        this._tone(t, { f: 1108, dur: 0.07, peak: 0.045 });
        this._tone(t + 0.06, { f: 740, dur: 0.1, peak: 0.045 });
        break;
      case 'tab':
        this._noise(t, { dur: 0.16, f: 500, f2: 2600, peak: 0.035, q: 0.9 });
        this._tone(t + 0.04, { f: 1320, dur: 0.06, peak: 0.02 });
        break;
      case 'open':
        this._noise(t, { dur: 0.22, f: 300, f2: 1800, peak: 0.04 });
        this._tone(t + 0.05, { f: 520, f2: 780, dur: 0.18, peak: 0.035, type: 'triangle' });
        break;
      case 'close':
        this._noise(t, { dur: 0.18, f: 1800, f2: 300, peak: 0.035 });
        break;
      case 'success':
        [523, 659, 784, 1047].forEach((f, i) => this._tone(t + i * 0.07, { f, dur: 0.25, peak: 0.045, type: 'triangle' }));
        break;
      case 'error':
        this._tone(t, { f: 200, f2: 150, dur: 0.12, peak: 0.08, type: 'square' });
        this._tone(t + 0.14, { f: 170, f2: 120, dur: 0.16, peak: 0.08, type: 'square' });
        break;
      case 'shutter':
        this._noise(t, { dur: 0.05, f: 3000, f2: 2000, peak: 0.12, q: 0.6 });
        this._noise(t + 0.08, { dur: 0.06, f: 2500, f2: 1500, peak: 0.1, q: 0.6 });
        break;
      case 'recStart':
        this._tone(t, { f: 880, dur: 0.1, peak: 0.06 });
        this._tone(t + 0.12, { f: 1320, dur: 0.18, peak: 0.06 });
        break;
      case 'recStop':
        this._tone(t, { f: 1320, dur: 0.1, peak: 0.06 });
        this._tone(t + 0.12, { f: 660, dur: 0.2, peak: 0.06 });
        break;
      case 'transform':
        this._noise(t, { dur: 0.5, f: 200, f2: 4000, peak: 0.06, q: 0.7 });
        [392, 523, 659, 784, 1047].forEach((f, i) => this._tone(t + 0.1 + i * 0.05, { f, dur: 0.3, peak: 0.03, type: 'triangle' }));
        break;
      default:
        break;
    }
  }
}

export const uiSounds = new UiSounds();
