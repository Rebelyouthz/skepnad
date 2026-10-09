// Procedurella stämningsljud som matchar bakgrunderna.

let TRACK = null; // alla startade källor under uppbyggnad, så att de kan stoppas

function noiseSource(ctx, color = 'white') {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    } else if (color === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  TRACK?.push(s);
  return s;
}

function filt(ctx, type, f, q = 0.7) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

function gain(ctx, v) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function lfo(ctx, rate, depth, target, type = 'sine') {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = rate;
  const g = gain(ctx, depth);
  o.connect(g).connect(target);
  o.start();
  TRACK?.push(o);
  return o;
}

function blip(ctx, out, t, { f = 3000, f2 = null, dur = 0.05, peak = 0.1, type = 'sine' }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + Math.min(0.01, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function click(ctx, out, t, { f = 3000, dur = 0.01, peak = 0.1, noiseBuf }) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const hp = filt(ctx, 'highpass', f, 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(hp).connect(g).connect(out);
  s.start(t, Math.random() * 2);
  s.stop(t + dur + 0.01);
}

function pad(ctx, out, freqs, { cutoff = 900, level = 0.05, type = 'sawtooth' } = {}) {
  const lp = filt(ctx, 'lowpass', cutoff, 0.8);
  const g = gain(ctx, level);
  lp.connect(g).connect(out);
  const nodes = [lfo(ctx, 0.07, cutoff * 0.5, lp.frequency)];
  for (const f of freqs) {
    for (const det of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start();
      TRACK?.push(o);
      nodes.push(o);
    }
  }
  return nodes;
}

/** Varje ambience: (ctx, out, events) → lista av noder att stoppa. events(fn, minMs, maxMs) schemalägger slumpade händelser. */
const AMBIENCES = {
  fire(ctx, out, ev, nb) {
    const rumble = noiseSource(ctx, 'brown');
    const lp = filt(ctx, 'lowpass', 420);
    const g = gain(ctx, 0.5);
    rumble.connect(lp).connect(g).connect(out);
    rumble.start();
    lfo(ctx, 0.3, 0.15, g.gain);
    ev((t) => click(ctx, out, t, { f: 1500 + Math.random() * 4000, dur: 0.004 + Math.random() * 0.02, peak: 0.08 + Math.random() * 0.25, noiseBuf: nb }), 30, 180);
    ev((t) => click(ctx, out, t, { f: 600, dur: 0.05, peak: 0.35, noiseBuf: nb }), 900, 3500);
    return [rumble];
  },
  rain(ctx, out, ev) {
    const n = noiseSource(ctx, 'pink');
    const hp = filt(ctx, 'highpass', 500);
    const lp = filt(ctx, 'lowpass', 6000);
    const g = gain(ctx, 0.6);
    n.connect(hp).connect(lp).connect(g).connect(out);
    n.start();
    const r = noiseSource(ctx, 'brown');
    const rg = gain(ctx, 0.25);
    r.connect(filt(ctx, 'lowpass', 200)).connect(rg).connect(out);
    r.start();
    ev((t) => blip(ctx, out, t, { f: 1800 + Math.random() * 3000, f2: 900, dur: 0.03, peak: 0.04 }), 40, 220);
    return [n, r];
  },
  wind(ctx, out) {
    const n = noiseSource(ctx, 'pink');
    const bp = filt(ctx, 'bandpass', 500, 1.2);
    const g = gain(ctx, 0.5);
    n.connect(bp).connect(g).connect(out);
    n.start();
    const l1 = lfo(ctx, 0.08, 300, bp.frequency);
    const l2 = lfo(ctx, 0.13, 0.3, g.gain);
    return [n, l1, l2];
  },
  forest(ctx, out, ev) {
    const nodes = AMBIENCES.wind(ctx, out);
    const bird = (t) => {
      const base = 2500 + Math.random() * 2000;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) blip(ctx, out, t + i * 0.09, { f: base * (1 + Math.random() * 0.3), f2: base * 0.7, dur: 0.07, peak: 0.05 });
    };
    ev(bird, 1200, 5000);
    ev((t) => {
      for (let i = 0; i < 3; i++) blip(ctx, out, t + i * 0.04, { f: 4600, dur: 0.02, peak: 0.02 });
    }, 500, 1500);
    return nodes;
  },
  underwater(ctx, out, ev) {
    const n = noiseSource(ctx, 'brown');
    const lp = filt(ctx, 'lowpass', 260);
    const g = gain(ctx, 0.7);
    n.connect(lp).connect(g).connect(out);
    n.start();
    const l = lfo(ctx, 0.1, 80, lp.frequency);
    ev((t) => blip(ctx, out, t, { f: 300 + Math.random() * 300, f2: 1200 + Math.random() * 800, dur: 0.05, peak: 0.08 }), 150, 900);
    return [n, l];
  },
  space(ctx, out, ev) {
    const nodes = pad(ctx, out, [55, 82.4, 110], { cutoff: 500, level: 0.035 });
    ev((t) => blip(ctx, out, t, { f: 1760 + Math.random() * 1760, dur: 1.2, peak: 0.012 }), 1500, 4000);
    return nodes;
  },
  synth(ctx, out) {
    return pad(ctx, out, [110, 164.8, 196, 261.6], { cutoff: 1100, level: 0.03 });
  },
  pad(ctx, out) {
    return pad(ctx, out, [130.8, 164.8, 196, 246.9], { cutoff: 900, level: 0.03, type: 'triangle' });
  },
  city(ctx, out, ev, nb) {
    const n = noiseSource(ctx, 'brown');
    const g = gain(ctx, 0.45);
    n.connect(filt(ctx, 'lowpass', 320)).connect(g).connect(out);
    n.start();
    ev((t) => {
      const s = ctx.createBufferSource();
      s.buffer = nb;
      const bp = filt(ctx, 'bandpass', 400, 0.8);
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(1200, t + 1.2);
      bp.frequency.exponentialRampToValueAtTime(300, t + 2.5);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.0001, t);
      cg.gain.linearRampToValueAtTime(0.12, t + 1.2);
      cg.gain.linearRampToValueAtTime(0.0001, t + 2.5);
      s.connect(bp).connect(cg).connect(out);
      s.start(t, Math.random());
      s.stop(t + 2.6);
    }, 3000, 9000);
    return [n];
  },
  digital(ctx, out, ev) {
    const nodes = pad(ctx, out, [55, 110], { cutoff: 300, level: 0.03, type: 'square' });
    ev((t) => blip(ctx, out, t, { type: 'square', f: 800 + Math.floor(Math.random() * 8) * 220, dur: 0.04, peak: 0.02 }), 120, 700);
    return nodes;
  },
  hall(ctx, out, ev, nb) {
    const n = noiseSource(ctx, 'pink');
    const g = gain(ctx, 0.1);
    n.connect(filt(ctx, 'lowpass', 220)).connect(g).connect(out);
    n.start();
    const nodes = pad(ctx, out, [65.4, 98, 130.8], { cutoff: 380, level: 0.018, type: 'triangle' });
    ev((t) => {
      for (let i = 0; i < 2; i++) click(ctx, out, t + i * 0.55, { f: 300, dur: 0.08, peak: 0.05, noiseBuf: nb });
    }, 6000, 14000);
    return [n, ...nodes];
  },
  crowd(ctx, out, ev, nb) {
    const n = noiseSource(ctx, 'pink');
    const bp = filt(ctx, 'bandpass', 700, 0.6);
    const g = gain(ctx, 0.35);
    n.connect(bp).connect(g).connect(out);
    n.start();
    lfo(ctx, 0.17, 0.12, g.gain);
    lfo(ctx, 0.11, 250, bp.frequency);
    ev((t) => {
      const s = ctx.createBufferSource();
      s.buffer = nb;
      s.loop = true;
      const f = filt(ctx, 'bandpass', 1400, 0.5);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.0001, t);
      cg.gain.linearRampToValueAtTime(0.22, t + 0.6);
      cg.gain.linearRampToValueAtTime(0.0001, t + 2.8);
      s.connect(f).connect(cg).connect(out);
      s.start(t);
      s.stop(t + 3);
      for (let i = 0; i < 40; i++) click(ctx, out, t + 0.3 + Math.random() * 2.2, { f: 1800, dur: 0.012, peak: 0.05 + Math.random() * 0.08, noiseBuf: nb });
    }, 6000, 15000);
    return [n];
  },
  press(ctx, out, ev, nb) {
    const nodes = AMBIENCES.room(ctx, out);
    const n = noiseSource(ctx, 'pink');
    const g = gain(ctx, 0.07);
    n.connect(filt(ctx, 'bandpass', 600, 0.8)).connect(g).connect(out);
    n.start();
    ev((t) => {
      const k = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < k; i++) {
        click(ctx, out, t + i * 0.11, { f: 2500, dur: 0.02, peak: 0.16, noiseBuf: nb });
        click(ctx, out, t + i * 0.11 + 0.045, { f: 1200, dur: 0.03, peak: 0.1, noiseBuf: nb });
      }
    }, 800, 3200);
    return [...nodes, n];
  },
  paparazzi(ctx, out, ev, nb) {
    const nodes = AMBIENCES.crowd(ctx, out, () => {}, nb);
    ev((t) => {
      const k = 2 + Math.floor(Math.random() * 5);
      for (let i = 0; i < k; i++) {
        const tt = t + i * (0.07 + Math.random() * 0.1);
        click(ctx, out, tt, { f: 2800, dur: 0.018, peak: 0.18, noiseBuf: nb });
        click(ctx, out, tt + 0.04, { f: 1300, dur: 0.025, peak: 0.12, noiseBuf: nb });
      }
      if (Math.random() < 0.3) blip(ctx, out, t, { f: 3000, f2: 9000, dur: 0.35, peak: 0.012 });
    }, 300, 1400);
    return nodes;
  },
  waves(ctx, out, ev) {
    const n = noiseSource(ctx, 'brown');
    const lp = filt(ctx, 'lowpass', 500);
    const g = gain(ctx, 0.5);
    n.connect(lp).connect(g).connect(out);
    n.start();
    lfo(ctx, 0.09, 0.4, g.gain);
    lfo(ctx, 0.09, 350, lp.frequency);
    const w = noiseSource(ctx, 'pink');
    const hp = filt(ctx, 'highpass', 2500);
    const wg = gain(ctx, 0.1);
    w.connect(hp).connect(wg).connect(out);
    w.start();
    lfo(ctx, 0.09, 0.09, wg.gain);
    ev((t) => {
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) blip(ctx, out, t + i * 0.32, { f: 2400, f2: 1300, dur: 0.25, peak: 0.025 });
    }, 5000, 12000);
    return [n, w];
  },
  neonrain(ctx, out, ev) {
    const nodes = AMBIENCES.rain(ctx, out, ev);
    nodes.push(...pad(ctx, out, [55, 82.4], { cutoff: 260, level: 0.02, type: 'square' }));
    ev((t) => blip(ctx, out, t, { type: 'square', f: 440 * 2 ** (Math.floor(Math.random() * 12) / 12), dur: 0.12, peak: 0.012 }), 1500, 5000);
    return nodes;
  },
  room(ctx, out) {
    const n = noiseSource(ctx, 'pink');
    const g = gain(ctx, 0.12);
    n.connect(filt(ctx, 'lowpass', 280)).connect(g).connect(out);
    n.start();
    const o = ctx.createOscillator();
    o.frequency.value = 50;
    const og = gain(ctx, 0.01);
    o.connect(og).connect(out);
    o.start();
    return [n, o];
  },
};

export class Ambience {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = gain(ctx, 1);
    this.out.connect(out);
    this.current = null;
    this.nodes = [];
    this.timers = [];
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  play(id) {
    if (id === this.current) return;
    this.stop();
    const make = AMBIENCES[id];
    if (!make) return;
    this.current = id;
    const bus = gain(this.ctx, 0);
    bus.connect(this.out);
    bus.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.2);
    this.bus = bus;
    const ev = (fn, minMs, maxMs) => {
      const loop = () => {
        const wait = minMs + Math.random() * (maxMs - minMs);
        const h = setTimeout(() => {
          if (this.bus !== bus) return;
          fn(this.ctx.currentTime + 0.05);
          loop();
        }, wait);
        this.timers.push(h);
      };
      loop();
    };
    TRACK = [];
    const extra = make(this.ctx, bus, ev, this.noiseBuf) || [];
    this.nodes = [...new Set([...TRACK, ...extra])];
    TRACK = null;
  }

  stop() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const old = this.bus;
    const nodes = this.nodes;
    if (old) {
      old.gain.cancelScheduledValues(this.ctx.currentTime);
      old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      setTimeout(() => {
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch {
            /* redan stoppad */
          }
        });
        old.disconnect();
      }, 1200);
    }
    this.bus = null;
    this.nodes = [];
    this.current = null;
  }
}
