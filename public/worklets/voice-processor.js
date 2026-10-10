// Skepnad – röstprocessor (AudioWorklet). Fristående fil utan importer.
// DSP-klasserna exporteras också för enhetstester i Node.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/** Tonhöjdsförskjutning med fördröjningslinje och två korsfadade läshuvuden per röst. */
export class PitchShifter {
  constructor(sampleRate, { windowMs = 42, voices = 4 } = {}) {
    this.size = 1 << 14;
    this.mask = this.size - 1;
    this.buf = new Float32Array(this.size);
    this.w = 0;
    this.win = Math.round((sampleRate * windowMs) / 1000);
    this.phase = new Float64Array(voices);
    for (let v = 0; v < voices; v++) this.phase[v] = (v * 0.37) % 1;
  }

  write(x) {
    this.buf[this.w] = x;
    this.w = (this.w + 1) & this.mask;
  }

  _read(delay) {
    const pos = this.w - 1 - delay;
    const i = Math.floor(pos);
    const f = pos - i;
    const a = this.buf[i & this.mask];
    const b = this.buf[(i + 1) & this.mask];
    return a + (b - a) * f;
  }

  /** Läs röst v med förhållande ratio (efter write). */
  voice(v, ratio) {
    if (ratio === 1) return this.buf[(this.w - 1) & this.mask];
    let ph = this.phase[v] + (1 - ratio) / this.win;
    ph -= Math.floor(ph);
    this.phase[v] = ph;
    const ph2 = (ph + 0.5) % 1;
    const g1 = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
    const g2 = 1 - g1;
    return this._read(ph * this.win) * g1 + this._read(ph2 * this.win) * g2;
  }
}

/** Radix-2 FFT på plats (re/im). inv = true ger invers (utan 1/N-skalning). */
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inv ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/**
 * Röstbyte (tjej/kille): faskodare som flyttar grundtonen med `ratio` och
 * formanterna (röströrets klang) separat med `formant`. Spektrumet delas i
 * fint harmoniskt innehåll och ett utjämnat hölje; bara innehållet tonhöjdsflyttas,
 * höljet sträcks för sig. Latens = N sampel.
 */
export class FormantShifter {
  constructor(sampleRate, { size = 1024, osamp = 4 } = {}) {
    const N = size;
    this.N = N;
    this.hop = N / osamp;
    this.osamp = osamp;
    this.binHz = sampleRate / N;
    this.win = new Float64Array(N);
    for (let k = 0; k < N; k++) this.win[k] = 0.5 - 0.5 * Math.cos((2 * Math.PI * k) / N);
    this.inF = new Float64Array(N);
    this.outF = new Float64Array(N);
    this.acc = new Float64Array(2 * N);
    this.re = new Float64Array(N);
    this.im = new Float64Array(N);
    const H = N / 2 + 1;
    this.lastPh = new Float64Array(H);
    this.sumPh = new Float64Array(H);
    this.mag = new Float64Array(H);
    this.freq = new Float64Array(H);
    this.env = new Float64Array(H);
    this.tmp = new Float64Array(H);
    this.sMag = new Float64Array(H);
    this.sFreq = new Float64Array(H);
    this.rover = N - this.hop;
  }

  _smooth(src, dst, r) {
    // två lådfilter efter varandra ≈ triangel – ger höljet utan övertonerna
    const H = src.length;
    const t = this.tmp;
    for (let pass = 0; pass < 2; pass++) {
      const a = pass ? t : src;
      const b = pass ? dst : t;
      let s = 0;
      let n = 0;
      for (let k = -r; k <= r; k++) if (k >= 0 && k < H) (s += a[k]), n++;
      for (let k = 0; k < H; k++) {
        b[k] = s / n;
        const add = k + r + 1;
        const rem = k - r;
        if (add < H) (s += a[add]), n++;
        if (rem >= 0) (s -= a[rem]), n--;
      }
    }
  }

  _frame(ratio, formant) {
    const { N, re, im, win, mag, freq, env, sMag, sFreq, binHz, osamp } = this;
    const H = N / 2 + 1;
    const expct = (2 * Math.PI * this.hop) / N;
    for (let k = 0; k < N; k++) {
      re[k] = this.inF[k] * win[k];
      im[k] = 0;
    }
    fft(re, im, false);
    for (let k = 0; k < H; k++) {
      const m = Math.hypot(re[k], im[k]);
      const ph = Math.atan2(im[k], re[k]);
      let d = ph - this.lastPh[k] - k * expct;
      this.lastPh[k] = ph;
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      freq[k] = (k + (d * osamp) / (2 * Math.PI)) * binHz;
      mag[k] = Math.log(m + 1e-9);
    }
    this._smooth(mag, env, 7);
    sMag.fill(0);
    sFreq.fill(0);
    for (let k = 0; k < H; k++) {
      const j = Math.round(k * ratio);
      if (j >= H) break;
      const flat = Math.exp(mag[k] - env[k]);
      if (flat > sMag[j]) {
        sMag[j] = flat;
        sFreq[j] = freq[k] * ratio;
      }
    }
    for (let k = 0; k < H; k++) {
      // nytt hölje: formanterna flyttas med `formant`
      const src = k / formant;
      const i0 = Math.floor(src);
      const e = i0 + 1 < H ? env[i0] + (env[i0 + 1] - env[i0]) * (src - i0) : env[H - 1] - 4;
      const m = sMag[k] * Math.exp(e);
      this.sumPh[k] += ((sFreq[k] - k * binHz) / binHz) * ((2 * Math.PI) / osamp) + k * expct;
      re[k] = m * Math.cos(this.sumPh[k]);
      im[k] = m * Math.sin(this.sumPh[k]);
    }
    for (let k = H; k < N; k++) {
      re[k] = re[N - k];
      im[k] = -im[N - k];
    }
    fft(re, im, true);
    const g = 2 / ((N / 2) * osamp);
    for (let k = 0; k < N; k++) this.acc[k] += win[k] * re[k] * g;
    for (let k = 0; k < this.hop; k++) this.outF[k] = this.acc[k];
    this.acc.copyWithin(0, this.hop);
    this.acc.fill(0, N);
    this.inF.copyWithin(0, this.hop);
  }

  /** Ett sampel in, ett ut. */
  process(x, ratio, formant) {
    this.inF[this.rover] = x;
    const y = this.outF[this.rover - (this.N - this.hop)];
    this.rover++;
    if (this.rover >= this.N) {
      this.rover = this.N - this.hop;
      this._frame(ratio, formant);
    }
    return y;
  }
}

/** YIN-tonhöjdsdetektering. Returnerar frekvens i Hz eller -1. */
export function yin(buf, sampleRate, { threshold = 0.15, minFreq = 70, maxFreq = 900 } = {}) {
  const n = buf.length;
  const half = n >> 1;
  const maxTau = Math.min(half, Math.floor(sampleRate / minFreq));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
  const d = new Float32Array(maxTau + 1);
  let energy = 0;
  for (let i = 0; i < half; i++) energy += buf[i] * buf[i];
  if (energy / half < 1e-6) return -1;
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < half; i++) {
      const diff = buf[i] - buf[i + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  let running = 0;
  d[0] = 1;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= maxTau && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return -1;
  const x0 = tau > 1 ? d[tau - 1] : d[tau];
  const x2 = tau < maxTau ? d[tau + 1] : d[tau];
  const denom = 2 * (2 * d[tau] - x2 - x0);
  const better = denom !== 0 ? tau + (x2 - x0) / denom : tau;
  return sampleRate / better;
}

/** Närmaste ton i skalan (MIDI-tal) för en frekvens. */
export function snapMidi(freq, key = 0, scale = 'major') {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const steps = SCALES[scale] ?? SCALES.major;
  let best = Math.round(midi);
  let bestDist = Infinity;
  const base = Math.floor(midi) - 13;
  for (let m = base; m <= base + 26; m++) {
    const pc = (((m - key) % 12) + 12) % 12;
    if (!steps.includes(pc)) continue;
    const dist = Math.abs(m - midi);
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return { midi, target: best };
}

const hasWorklet = typeof AudioWorkletProcessor !== 'undefined' && typeof registerProcessor === 'function';

if (hasWorklet) {
  class VoiceProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      const sr = sampleRate;
      this.sr = sr;
      this.shifter = new PitchShifter(sr, { windowMs: 42, voices: 5 });
      this.voc = new FormantShifter(sr);
      this.p = { pitch: 0, formant: 0, harmony: [], harmonyMix: 0.55, autotune: false, autotuneKey: 0, autotuneScale: 'major', autotuneSpeed: 0.85, robot: 0, ringFreq: 55, gate: -58, bypass: false };
      this.ringPhase = 0;
      // Autotune-analys
      this.decim = 2;
      this.anaSize = 1024;
      this.ana = new Float32Array(this.anaSize);
      this.anaW = 0;
      this.hop = 0;
      this.detected = -1;
      this.atRatio = 1;
      this.atTarget = 1;
      // Brusspärr
      this.env = 0;
      this.gateGain = 1;
      this.hold = 0;
      // Mätning
      this.rmsAcc = 0;
      this.rmsN = 0;
      this.reportEvery = Math.round(sr / 30);
      this.port.onmessage = (e) => {
        if (e.data?.type === 'params') Object.assign(this.p, e.data.params);
      };
    }

    process(inputs, outputs) {
      const input = inputs[0]?.[0];
      const out = outputs[0]?.[0];
      if (!out) return true;
      if (!input) {
        out.fill(0);
        return true;
      }
      const p = this.p;
      const sr = this.sr;
      const manual = Math.pow(2, p.pitch / 12);
      const fRatio = p.formant ? Math.pow(2, p.formant / 12) : 1;
      const harm = p.harmony || [];
      const hRatios = harm.map((s) => Math.pow(2, s / 12));
      const hGain = harm.length ? p.harmonyMix / Math.sqrt(harm.length) : 0;
      const thr = Math.pow(10, p.gate / 20);
      const atk = 1 - Math.exp(-1 / (0.002 * sr));
      const rel = 1 - Math.exp(-1 / (0.12 * sr));
      const ringInc = (2 * Math.PI * p.ringFreq) / sr;
      const speed = 0.02 + p.autotuneSpeed * 0.5;
      for (let i = 0; i < input.length; i++) {
        const x = input[i];
        // brusspärr
        const ax = Math.abs(x);
        this.env += (ax - this.env) * (ax > this.env ? atk : rel);
        if (this.env > thr) this.hold = 0.08 * sr;
        else if (this.hold > 0) this.hold--;
        const gTarget = this.hold > 0 ? 1 : 0;
        this.gateGain += (gTarget - this.gateGain) * (gTarget > this.gateGain ? 0.02 : 0.0015);
        const xg = x * this.gateGain;
        this.rmsAcc += x * x;
        this.rmsN++;
        if (p.bypass) {
          out[i] = xg;
          continue;
        }
        // autotune-analys (decimerad)
        if (p.autotune) {
          if ((this.hop & (this.decim - 1)) === 0) {
            this.ana[this.anaW] = xg;
            this.anaW = (this.anaW + 1) % this.anaSize;
          }
          this.hop++;
          if (this.hop >= 512) {
            this.hop = 0;
            this.ordered ??= new Float32Array(this.anaSize);
            const ordered = this.ordered;
            for (let k = 0; k < this.anaSize; k++) ordered[k] = this.ana[(this.anaW + k) % this.anaSize];
            const f = yin(ordered, sr / this.decim, { threshold: 0.18 });
            this.detected = f;
            if (f > 0) {
              const cur = f * manual;
              const { midi, target } = snapMidi(cur, p.autotuneKey, p.autotuneScale);
              this.atTarget = Math.pow(2, (target - midi) / 12);
            } else this.atTarget = 1;
          }
          this.atRatio += (this.atTarget - this.atRatio) * speed * 0.01;
        } else {
          this.atRatio = 1;
        }
        this.shifter.write(xg);
        const main = manual * this.atRatio;
        // Med formantflytt (tjej/kille): faskodaren, annars den snabba fördröjningslinjen
        let y = fRatio !== 1 ? this.voc.process(xg, main, fRatio) : this.shifter.voice(0, main);
        for (let h = 0; h < hRatios.length && h < 4; h++) y += this.shifter.voice(h + 1, hRatios[h] * main) * hGain;
        if (p.robot > 0) {
          this.ringPhase += ringInc;
          if (this.ringPhase > 6.283185307) this.ringPhase -= 6.283185307;
          y *= 1 - p.robot + p.robot * Math.sin(this.ringPhase) * 1.4;
        }
        out[i] = y;
      }
      if (this.rmsN >= this.reportEvery) {
        this.port.postMessage({ type: 'meter', rms: Math.sqrt(this.rmsAcc / this.rmsN), gate: this.gateGain, pitch: this.detected, correction: this.atRatio });
        this.rmsAcc = 0;
        this.rmsN = 0;
      }
      for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
      return true;
    }
  }
  registerProcessor('skepnad-voice', VoiceProcessor);
}
