// Syntetiserade ljudeffekter: ljudbord + effektljud. Inga ljudfiler behövs.

export const SOUNDS = [
  { id: 'airhorn', name: 'Tuta', icon: '📯', desc: 'Klassisk MLG-tuta. BWAAA!' },
  { id: 'applause', name: 'Applåder', icon: '👏', desc: 'En publik som jublar och klappar.' },
  { id: 'badum', name: 'Ba-dum-tss', icon: '🥁', desc: 'Trumvirveln efter ett dåligt skämt.' },
  { id: 'sadTrombone', name: 'Sorgtrombon', icon: '🎺', desc: 'Wah wah wah waaah… för misslyckanden.' },
  { id: 'drumroll', name: 'Trumvirvel', icon: '🪘', desc: 'Spänning! Virvel som slutar i ett cymbalslag.' },
  { id: 'tada', name: 'Tada!', icon: '🎉', desc: 'Pampig fanfar när något lyckas.' },
  { id: 'ding', name: 'Rätt svar', icon: '🔔', desc: 'Frågesportens pling-plong.' },
  { id: 'buzzer', name: 'Fel svar', icon: '❌', desc: 'Surrande fel-summer.' },
  { id: 'explosion', name: 'Explosion', icon: '💥', desc: 'Mullrande smäll med efterskalv.' },
  { id: 'laser', name: 'Laser', icon: '🔫', desc: 'Pew pew! Rymdlaser.' },
  { id: 'boing', name: 'Boing', icon: '🪀', desc: 'Tecknad fjäderstuds.' },
  { id: 'chaching', name: 'Kassaapparat', icon: '💰', desc: 'Ka-tsching! Pengar in.' },
  { id: 'crickets', name: 'Syrsor', icon: '🦗', desc: 'Pinsam tystnad…' },
  { id: 'dramatic', name: 'Dramatisk', icon: '😱', desc: 'Dun dun DUUUN!' },
  { id: 'siren', name: 'Siren', icon: '🚨', desc: 'Ylande larmsiren.' },
  { id: 'magic', name: 'Magi', icon: '🪄', desc: 'Glittrande trollspö.' },
];

let noiseBuf = null;
function noise(ctx) {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

function env(ctx, gainNode, t, { a = 0.005, peak = 1, d = 0.2, s = 0, hold = 0, r = 0.1 }) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t);
  g.linearRampToValueAtTime(peak, t + a);
  if (hold > 0) {
    g.setTargetAtTime(Math.max(s * peak, 0.0001), t + a, d / 3);
    g.setValueAtTime(Math.max(s * peak, 0.0001), t + a + hold);
    g.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
    return t + a + hold + r;
  }
  g.exponentialRampToValueAtTime(0.0001, t + a + d);
  return t + a + d;
}

function tone(ctx, out, t, { type = 'sine', f = 440, f2 = null, dur = 0.2, a = 0.005, peak = 0.3, detune = 0 }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  o.detune.value = detune;
  const g = ctx.createGain();
  const end = env(ctx, g, t, { a, peak, d: dur });
  o.connect(g).connect(out);
  o.start(t);
  o.stop(end + 0.05);
  return g;
}

function burst(ctx, out, t, { dur = 0.05, type = 'bandpass', f = 2000, q = 1, peak = 0.5, f2 = null, a = 0.001 }) {
  const n = noise(ctx);
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(f, t);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
  flt.Q.value = q;
  const g = ctx.createGain();
  const end = env(ctx, g, t, { a, peak, d: dur });
  n.connect(flt).connect(g).connect(out);
  n.start(t, Math.random());
  n.stop(end + 0.05);
}

function brass(ctx, out, t, freqs, dur, peak = 0.12) {
  const flt = ctx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.Q.value = 1.5;
  flt.frequency.setValueAtTime(400, t);
  flt.frequency.linearRampToValueAtTime(3200, t + 0.06);
  flt.frequency.setTargetAtTime(1600, t + 0.08, 0.2);
  const g = ctx.createGain();
  const end = env(ctx, g, t, { a: 0.03, peak, d: 0.15, s: 0.75, hold: Math.max(dur - 0.1, 0.02), r: 0.12 });
  flt.connect(g).connect(out);
  for (const f of freqs) {
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(flt);
      o.start(t);
      o.stop(end + 0.05);
    }
  }
}

function bell(ctx, out, t, f, dur = 1.2, peak = 0.2) {
  for (const [ratio, amp] of [
    [1, 1],
    [2.0, 0.5],
    [2.76, 0.35],
    [5.4, 0.15],
  ]) {
    tone(ctx, out, t, { f: f * ratio, dur: dur / ratio ** 0.4, peak: peak * amp, a: 0.002 });
  }
}

const note = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const SYNTH = {
  airhorn(ctx, out, t) {
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 1400;
    flt.Q.value = 0.8;
    const shaper = ctx.createWaveShaper();
    const c = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = i / 128 - 1;
      c[i] = Math.tanh(x * 3);
    }
    shaper.curve = c;
    const g = ctx.createGain();
    g.gain.value = 0;
    flt.connect(shaper).connect(g).connect(out);
    const blasts = [
      [0, 0.32],
      [0.4, 0.13],
      [0.6, 0.13],
      [0.8, 0.7],
    ];
    for (const [s, d] of blasts) {
      g.gain.setValueAtTime(0.0001, t + s);
      g.gain.linearRampToValueAtTime(0.25, t + s + 0.015);
      g.gain.setValueAtTime(0.25, t + s + d - 0.03);
      g.gain.linearRampToValueAtTime(0.0001, t + s + d);
    }
    for (const [f, det] of [
      [415, 0],
      [415, 12],
      [622, -8],
      [830, 5],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.setValueAtTime(f, t + 1.35);
      o.frequency.linearRampToValueAtTime(f * 0.94, t + 1.5);
      o.detune.value = det;
      o.connect(flt);
      o.start(t);
      o.stop(t + 1.55);
    }
    return 1.6;
  },
  applause(ctx, out, t) {
    const dur = 3;
    for (let i = 0; i < 160; i++) {
      const x = Math.random();
      const at = t + x * dur;
      const swell = Math.sin(Math.min(x / 0.3, 1) * Math.PI * 0.5) * (1 - Math.max(0, (x - 0.6) / 0.4));
      burst(ctx, out, at, { dur: 0.018 + Math.random() * 0.02, f: 900 + Math.random() * 1800, q: 1.2, peak: 0.25 * swell * (0.5 + Math.random() * 0.5) });
    }
    const crowd = noise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.value = 1200;
    lp.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.8);
    g.gain.setValueAtTime(0.08, t + 1.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    crowd.connect(lp).connect(g).connect(out);
    crowd.start(t);
    crowd.stop(t + dur + 0.1);
    return dur;
  },
  badum(ctx, out, t) {
    tone(ctx, out, t, { f: 210, f2: 120, dur: 0.25, peak: 0.5 });
    burst(ctx, out, t, { dur: 0.04, f: 1500, peak: 0.15 });
    tone(ctx, out, t + 0.2, { f: 150, f2: 90, dur: 0.3, peak: 0.5 });
    burst(ctx, out, t + 0.2, { dur: 0.04, f: 1200, peak: 0.15 });
    burst(ctx, out, t + 0.48, { dur: 1.4, type: 'highpass', f: 5000, q: 0.5, peak: 0.28 });
    burst(ctx, out, t + 0.48, { dur: 0.9, type: 'bandpass', f: 8000, q: 3, peak: 0.12 });
    return 2;
  },
  sadTrombone(ctx, out, t) {
    const notes = [
      [note(55), 0.42],
      [note(54), 0.42],
      [note(53), 0.42],
      [note(52), 1.4],
    ];
    let at = t;
    notes.forEach(([f, d], i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      if (i === 3) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const lg = ctx.createGain();
        lg.gain.value = 5;
        lfo.connect(lg).connect(o.frequency);
        lfo.start(at);
        lfo.stop(at + d + 0.1);
      }
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.Q.value = 4;
      flt.frequency.setValueAtTime(350, at);
      flt.frequency.linearRampToValueAtTime(1300, at + 0.12);
      flt.frequency.linearRampToValueAtTime(600, at + d);
      const g = ctx.createGain();
      env(ctx, g, at, { a: 0.03, peak: 0.28, d: 0.1, s: 0.8, hold: d - 0.12, r: 0.08 });
      o.connect(flt).connect(g).connect(out);
      o.start(at);
      o.stop(at + d + 0.1);
      at += d;
    });
    return at - t;
  },
  drumroll(ctx, out, t) {
    const len = 1.8;
    for (let x = 0; x < len; x += 0.045) {
      const k = 0.25 + (x / len) * 0.75;
      burst(ctx, out, t + x, { dur: 0.06, type: 'highpass', f: 1800, q: 0.7, peak: 0.22 * k });
      tone(ctx, out, t + x, { f: 190, f2: 160, dur: 0.05, peak: 0.08 * k });
    }
    tone(ctx, out, t + len, { f: 120, f2: 45, dur: 0.4, peak: 0.6 });
    burst(ctx, out, t + len, { dur: 1.8, type: 'highpass', f: 4500, q: 0.5, peak: 0.35 });
    return len + 1.8;
  },
  tada(ctx, out, t) {
    brass(ctx, out, t, [note(67), note(71), note(74)], 0.13, 0.1);
    brass(ctx, out, t + 0.17, [note(72), note(76), note(79), note(84)], 1.1, 0.1);
    burst(ctx, out, t + 0.17, { dur: 1.2, type: 'highpass', f: 6000, peak: 0.08 });
    return 1.5;
  },
  ding(ctx, out, t) {
    bell(ctx, out, t, 1318, 1.0, 0.18);
    bell(ctx, out, t + 0.16, 1661, 1.4, 0.18);
    return 1.6;
  },
  buzzer(ctx, out, t) {
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 1600;
    const g = ctx.createGain();
    env(ctx, g, t, { a: 0.01, peak: 0.22, d: 0.05, s: 1, hold: 0.75, r: 0.05 });
    flt.connect(g).connect(out);
    for (const f of [110, 116]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(flt);
      o.start(t);
      o.stop(t + 0.9);
    }
    return 0.9;
  },
  explosion(ctx, out, t) {
    const n = noise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4000, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 1.6);
    const g = ctx.createGain();
    env(ctx, g, t, { a: 0.005, peak: 0.9, d: 2.0 });
    n.connect(lp).connect(g).connect(out);
    n.start(t);
    n.stop(t + 2.2);
    tone(ctx, out, t, { f: 90, f2: 28, dur: 1.2, peak: 0.7 });
    return 2.2;
  },
  laser(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', f: 1900, f2: 180, dur: 0.22, peak: 0.12 });
    tone(ctx, out, t + 0.2, { type: 'square', f: 1700, f2: 160, dur: 0.22, peak: 0.12 });
    return 0.5;
  },
  boing(ctx, out, t) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 190;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 13;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(110, t);
    lg.gain.exponentialRampToValueAtTime(3, t + 0.8);
    lfo.connect(lg).connect(o.frequency);
    const g = ctx.createGain();
    env(ctx, g, t, { a: 0.005, peak: 0.35, d: 0.85 });
    o.connect(g).connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.9);
    lfo.stop(t + 0.9);
    return 0.9;
  },
  chaching(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.03, f: 2500, q: 2, peak: 0.4 });
    for (let i = 0; i < 5; i++) burst(ctx, out, t + 0.05 + i * 0.025, { dur: 0.02, f: 3500 + i * 300, q: 4, peak: 0.12 });
    bell(ctx, out, t + 0.18, 2093, 1.1, 0.12);
    bell(ctx, out, t + 0.2, 2637, 1.0, 0.1);
    return 1.4;
  },
  crickets(ctx, out, t) {
    for (let c = 0; c < 2; c++) {
      const f = c ? 4700 : 4300;
      for (let k = 0; k < 6; k++) {
        const at = t + k * 0.55 + c * 0.27;
        for (let p = 0; p < 4; p++) tone(ctx, out, at + p * 0.035, { f, dur: 0.025, peak: 0.06 });
      }
    }
    return 3.6;
  },
  dramatic(ctx, out, t) {
    brass(ctx, out, t, [note(50), note(57), note(62)], 0.22, 0.12);
    brass(ctx, out, t + 0.3, [note(48), note(55), note(60)], 0.22, 0.12);
    brass(ctx, out, t + 0.6, [note(47), note(53), note(59), note(35)], 1.6, 0.13);
    tone(ctx, out, t + 0.6, { f: 60, f2: 50, dur: 1.5, peak: 0.3 });
    return 2.4;
  },
  siren(ctx, out, t) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 900;
    const lfo = ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = 0.9;
    const lg = ctx.createGain();
    lg.gain.value = 380;
    lfo.connect(lg).connect(o.frequency);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 2500;
    const g = ctx.createGain();
    env(ctx, g, t, { a: 0.1, peak: 0.12, d: 0.1, s: 1, hold: 2.6, r: 0.3 });
    o.connect(flt).connect(g).connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 3.1);
    lfo.stop(t + 3.1);
    return 3.1;
  },
  magic(ctx, out, t) {
    const seq = [84, 88, 91, 96, 100, 103, 108];
    seq.forEach((m, i) => bell(ctx, out, t + i * 0.07, note(m), 0.8, 0.07));
    burst(ctx, out, t, { dur: 1.0, type: 'highpass', f: 7000, peak: 0.05 });
    return 1.3;
  },
  // ---- effektljud ----
  pop(ctx, out, t) {
    tone(ctx, out, t, { f: 700, f2: 180, dur: 0.07, peak: 0.35 });
    burst(ctx, out, t, { dur: 0.02, f: 3000, peak: 0.2 });
  },
  confetti(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.18, f: 2600, q: 0.8, peak: 0.35 });
    burst(ctx, out, t + 0.02, { dur: 0.6, type: 'highpass', f: 6000, peak: 0.05 });
  },
  sparkle(ctx, out, t) {
    for (let i = 0; i < 6; i++) tone(ctx, out, t + i * 0.06 + Math.random() * 0.02, { f: 2200 + Math.random() * 2400, dur: 0.12, peak: 0.05 });
  },
  firework(ctx, out, t) {
    tone(ctx, out, t, { f: 700, f2: 2200, dur: 0.35, peak: 0.04 });
    burst(ctx, out, t + 0.35, { dur: 0.9, type: 'lowpass', f: 900, peak: 0.5 });
    for (let i = 0; i < 18; i++) burst(ctx, out, t + 0.5 + Math.random() * 0.8, { dur: 0.012, type: 'highpass', f: 3000, peak: 0.12 });
  },
  fireburst(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.7, f: 300, f2: 1400, q: 0.6, peak: 0.35, a: 0.05 });
    burst(ctx, out, t, { dur: 0.8, type: 'lowpass', f: 250, peak: 0.3, a: 0.05 });
  },
  kiss(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.025, f: 1800, q: 2, peak: 0.3 });
    tone(ctx, out, t + 0.02, { f: 700, f2: 420, dur: 0.14, peak: 0.08 });
  },
  whoosh(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.35, f: 300, f2: 2600, q: 1.2, peak: 0.3, a: 0.08 });
  },
  bonk(ctx, out, t) {
    tone(ctx, out, t, { f: 920, dur: 0.07, peak: 0.35 });
    tone(ctx, out, t, { f: 1520, dur: 0.05, peak: 0.15 });
    tone(ctx, out, t, { f: 220, f2: 120, dur: 0.12, peak: 0.4 });
  },
  splat(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.28, type: 'lowpass', f: 1400, peak: 0.6 });
    burst(ctx, out, t + 0.03, { dur: 0.22, f: 900, f2: 250, q: 3, peak: 0.25 });
  },
  squeak(ctx, out, t) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(1300, t);
    o.frequency.linearRampToValueAtTime(1850, t + 0.08);
    o.frequency.linearRampToValueAtTime(1250, t + 0.26);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 3;
    const g = ctx.createGain();
    env(ctx, g, t, { a: 0.01, peak: 0.3, d: 0.28 });
    o.connect(bp).connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.32);
  },
  boing2(ctx, out, t) {
    SYNTH.boing(ctx, out, t);
  },
  slap(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.06, type: 'highpass', f: 1200, peak: 0.6 });
  },
  ting(ctx, out, t) {
    bell(ctx, out, t, 2637, 0.6, 0.1);
  },
  laugh(ctx, out, t) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = 850;
    bp1.Q.value = 5;
    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = 1250;
    bp2.Q.value = 5;
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(bp1).connect(g);
    o.connect(bp2).connect(g);
    g.connect(out);
    for (let i = 0; i < 5; i++) {
      const at = t + i * 0.16;
      o.frequency.setValueAtTime(330 - i * 18, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.5, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    }
    o.start(t);
    o.stop(t + 0.9);
  },
  spooky(ctx, out, t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t);
    o.frequency.linearRampToValueAtTime(420, t + 0.7);
    o.frequency.linearRampToValueAtTime(540, t + 1.4);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6;
    const lg = ctx.createGain();
    lg.gain.value = 14;
    lfo.connect(lg).connect(o.frequency);
    const g = ctx.createGain();
    env(ctx, g, t, { a: 0.2, peak: 0.12, d: 0.2, s: 1, hold: 1.1, r: 0.3 });
    o.connect(g).connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.8);
    lfo.stop(t + 1.8);
  },
  squelch(ctx, out, t) {
    burst(ctx, out, t, { dur: 0.09, f: 2500, q: 0.6, peak: 0.18 });
  },
  honk(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', f: 330, f2: 300, dur: 0.18, peak: 0.12 });
    tone(ctx, out, t + 0.2, { type: 'square', f: 330, f2: 290, dur: 0.22, peak: 0.12 });
  },
};
