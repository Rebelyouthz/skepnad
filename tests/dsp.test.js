import { describe, it, expect } from 'vitest';
import { PitchShifter, yin, snapMidi } from '../public/worklets/voice-processor.js';

const SR = 48000;
const sine = (f, n, sr = SR) => Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f * i) / sr));

function zeroCrossFreq(buf, sr = SR) {
  let crossings = 0;
  for (let i = 1; i < buf.length; i++) if (buf[i - 1] < 0 && buf[i] >= 0) crossings++;
  return (crossings * sr) / buf.length;
}

describe('yin', () => {
  it('hittar grundtonen i en sinus', () => {
    for (const f of [110, 220, 330, 440]) {
      const d = yin(sine(f, 2048, 24000), 24000);
      expect(Math.abs(d - f) / f).toBeLessThan(0.02);
    }
  });
  it('returnerar -1 för tystnad', () => {
    expect(yin(new Float32Array(1024), 24000)).toBe(-1);
  });
});

describe('snapMidi', () => {
  it('snappar till närmaste ton i C-dur', () => {
    const cs = 440 * Math.pow(2, (61 - 69) / 12); // C#4 finns inte i C-dur
    const { target } = snapMidi(cs * 1.001, 0, 'major');
    expect([60, 62]).toContain(target);
  });
  it('behåller en ton som redan ligger i skalan', () => {
    const { target } = snapMidi(440, 0, 'major');
    expect(target).toBe(69);
  });
});

describe('PitchShifter', () => {
  const run = (ratio, f = 200) => {
    const ps = new PitchShifter(SR, { windowMs: 42, voices: 2 });
    const input = sine(f, SR);
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      ps.write(input[i]);
      out[i] = ps.voice(0, ratio);
    }
    return out.subarray(SR / 4);
  };
  it('en oktav upp dubblar frekvensen', () => {
    expect(Math.abs(zeroCrossFreq(run(2)) - 400)).toBeLessThan(25);
  });
  it('en oktav ner halverar frekvensen', () => {
    expect(Math.abs(zeroCrossFreq(run(0.5)) - 100)).toBeLessThan(15);
  });
  it('förhållande 1 är genomsläpp', () => {
    expect(Math.abs(zeroCrossFreq(run(1)) - 200)).toBeLessThan(5);
  });
  it('ger aldrig NaN och håller nivån', () => {
    const out = run(1.5);
    let peak = 0;
    for (const v of out) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeGreaterThan(0.5);
    expect(peak).toBeLessThan(1.3);
  });
});
