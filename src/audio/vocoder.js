// Kanalvocoder: rösten styr amplituden på ett syntackord i 18 frekvensband.
export class Vocoder {
  constructor(ctx, bands = 18) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.output.gain.value = 14;
    this.carrier = ctx.createGain();
    this.carrier.gain.value = 0.35;
    this.oscs = [];
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = (i - 1.5) * 6;
      o.connect(this.carrier);
      o.start();
      this.oscs.push(o);
    }
    // lite brus för väsljud
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = ctx.createBufferSource();
    this.noise.buffer = nb;
    this.noise.loop = true;
    const ng = ctx.createGain();
    ng.gain.value = 0.08;
    this.noise.connect(ng).connect(this.carrier);
    this.noise.start();

    const rect = new Float32Array(1025);
    for (let i = 0; i < rect.length; i++) rect[i] = Math.abs((i / 512) - 1);
    const lo = 110;
    const hi = 7500;
    for (let b = 0; b < bands; b++) {
      const f = lo * Math.pow(hi / lo, b / (bands - 1));
      const mod = ctx.createBiquadFilter();
      mod.type = 'bandpass';
      mod.frequency.value = f;
      mod.Q.value = 6;
      const shaper = ctx.createWaveShaper();
      shaper.curve = rect;
      const env = ctx.createBiquadFilter();
      env.type = 'lowpass';
      env.frequency.value = 28;
      const car = ctx.createBiquadFilter();
      car.type = 'bandpass';
      car.frequency.value = f;
      car.Q.value = 6;
      const vca = ctx.createGain();
      vca.gain.value = 0;
      this.input.connect(mod);
      mod.connect(shaper).connect(env).connect(vca.gain);
      this.carrier.connect(car).connect(vca).connect(this.output);
    }
    this.setKey(0);
  }

  /** Mollackord (rot, kvint, oktav, ters) i tonart key (0 = C). */
  setKey(key = 0) {
    const root = 110 * Math.pow(2, (key - 9) / 12);
    const chord = [1, 1.5, 2, 2.378];
    this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(root * chord[i], this.ctx.currentTime, 0.05));
  }
}
