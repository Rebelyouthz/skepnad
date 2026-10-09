// Cyberpunk-gränssnittsljud: digitala klick med tyngd, glitchiga svep och
// nedräkningspip. Spelas bara lokalt – aldrig i sändningen.

export class UiSounds {
  constructor() {
    this.ctx = null;
    this.out = null;
    this.enabled = true;
    this.volume = 0.55;
    this._lastHover = 0;
    this._noiseBuf = null;
  }

  attach(ctx, destination) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.out.connect(comp).connect(destination);
    const len = ctx.sampleRate;
    this._noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this._noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolume(v) {
    this.volume = v;
    if (this.out) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  _ok() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  _tone(t, { f, f2, dur = 0.08, peak = 0.1, type = 'sine', a = 0.003 }) {
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

  _noise(t, { dur = 0.15, f = 1200, f2 = 3000, peak = 0.05, q = 1, type = 'bandpass', attack = 0.4 }) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this._noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = type;
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f, t);
    bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.max(0.002, dur * attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  /** Tung digital knapptryckning: dov duns + skarp transient + brusklick. */
  _press(t, pitch = 1, peak = 1) {
    this._tone(t, { f: 160 * pitch, f2: 62 * pitch, dur: 0.07, peak: 0.11 * peak });
    this._tone(t, { f: 2600 * pitch, dur: 0.014, peak: 0.028 * peak, type: 'square' });
    this._noise(t, { dur: 0.03, f: 5200, f2: 3000, peak: 0.05 * peak, q: 0.8, type: 'highpass', attack: 0.05 });
  }

  play(name) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime + 0.004;
    switch (name) {
      case 'hover': {
        const now = performance.now();
        if (now - this._lastHover < 50) return;
        this._lastHover = now;
        this._tone(t, { f: 3400 + Math.random() * 400, dur: 0.018, peak: 0.012, type: 'square' });
        break;
      }
      case 'click':
        this._press(t);
        break;
      case 'select':
        this._press(t, 1.15, 0.8);
        this._tone(t + 0.03, { f: 880, f2: 1320, dur: 0.12, peak: 0.035, type: 'triangle' });
        this._tone(t + 0.07, { f: 1760, dur: 0.16, peak: 0.02 });
        break;
      case 'on':
        this._press(t, 1.2, 0.7);
        this._tone(t + 0.02, { f: 660, f2: 1320, dur: 0.09, peak: 0.04, type: 'square' });
        break;
      case 'off':
        this._press(t, 0.9, 0.7);
        this._tone(t + 0.02, { f: 1320, f2: 520, dur: 0.1, peak: 0.035, type: 'square' });
        break;
      case 'tab':
        this._noise(t, { dur: 0.14, f: 700, f2: 4200, peak: 0.03, q: 1.4 });
        this._tone(t + 0.03, { f: 1500, f2: 2200, dur: 0.05, peak: 0.018, type: 'square' });
        break;
      case 'open':
        this._noise(t, { dur: 0.24, f: 260, f2: 2600, peak: 0.04, q: 0.9 });
        this._tone(t + 0.06, { f: 440, f2: 880, dur: 0.16, peak: 0.03, type: 'triangle' });
        break;
      case 'close':
        this._noise(t, { dur: 0.18, f: 2600, f2: 260, peak: 0.032, q: 0.9 });
        break;
      case 'success':
        [523, 784, 1047, 1568].forEach((f, i) => this._tone(t + i * 0.065, { f, dur: 0.22, peak: 0.04, type: i % 2 ? 'square' : 'triangle' }));
        break;
      case 'error':
        this._tone(t, { f: 220, f2: 160, dur: 0.12, peak: 0.07, type: 'square' });
        this._tone(t + 0.13, { f: 180, f2: 110, dur: 0.16, peak: 0.07, type: 'square' });
        break;
      case 'shutter':
        this._noise(t, { dur: 0.05, f: 3200, f2: 2000, peak: 0.12, q: 0.6 });
        this._tone(t, { f: 140, f2: 60, dur: 0.05, peak: 0.08 });
        this._noise(t + 0.08, { dur: 0.06, f: 2600, f2: 1500, peak: 0.1, q: 0.6 });
        break;
      case 'count':
        this._tone(t, { f: 880, dur: 0.16, peak: 0.07, type: 'square', a: 0.002 });
        this._tone(t, { f: 1760, dur: 0.08, peak: 0.02 });
        this._noise(t, { dur: 0.08, f: 6000, f2: 3000, peak: 0.02, q: 0.6 });
        break;
      case 'go':
        this._tone(t, { f: 1760, dur: 0.4, peak: 0.07, type: 'square', a: 0.002 });
        this._tone(t, { f: 880, f2: 1760, dur: 0.25, peak: 0.05, type: 'sawtooth' });
        this._noise(t, { dur: 0.35, f: 400, f2: 6000, peak: 0.05, q: 0.7 });
        this._tone(t, { f: 90, f2: 45, dur: 0.3, peak: 0.12 });
        break;
      case 'recStart':
        this._tone(t, { f: 880, dur: 0.1, peak: 0.06, type: 'square' });
        this._tone(t + 0.11, { f: 1320, dur: 0.18, peak: 0.06, type: 'square' });
        break;
      case 'recStop':
        this._tone(t, { f: 1320, dur: 0.1, peak: 0.06, type: 'square' });
        this._tone(t + 0.11, { f: 660, dur: 0.2, peak: 0.06, type: 'square' });
        break;
      case 'transform':
        this._noise(t, { dur: 0.5, f: 180, f2: 5000, peak: 0.055, q: 0.7 });
        [392, 523, 659, 784, 1047].forEach((f, i) => this._tone(t + 0.08 + i * 0.045, { f, dur: 0.26, peak: 0.028, type: i % 2 ? 'square' : 'triangle' }));
        break;
      case 'pop':
        this._tone(t, { f: 320, f2: 1100, dur: 0.08, peak: 0.08 });
        this._noise(t, { dur: 0.04, f: 4000, f2: 2500, peak: 0.03, q: 1 });
        break;
      case 'drop':
        this._tone(t, { f: 900, f2: 300, dur: 0.07, peak: 0.05 });
        break;
      case 'delete':
        this._noise(t, { dur: 0.2, f: 3000, f2: 200, peak: 0.05, q: 0.8 });
        this._tone(t, { f: 500, f2: 120, dur: 0.18, peak: 0.05, type: 'square' });
        break;
      case 'glitch':
        for (let i = 0; i < 6; i++) this._tone(t + i * 0.028, { f: 200 + Math.random() * 3000, dur: 0.025, peak: 0.03, type: 'square' });
        break;
      case 'dice':
        for (let i = 0; i < 7; i++) this._noise(t + i * 0.05 + Math.random() * 0.02, { dur: 0.035, f: 1800 + Math.random() * 2000, f2: 1200, peak: 0.06, q: 2 });
        this._tone(t + 0.4, { f: 1047, dur: 0.2, peak: 0.04, type: 'triangle' });
        this._tone(t + 0.46, { f: 1568, dur: 0.25, peak: 0.04, type: 'triangle' });
        break;
      default:
        break;
    }
  }
}

export const uiSounds = new UiSounds();
