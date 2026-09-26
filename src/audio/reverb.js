// Genererar ett stereo-impulssvar (avklingande brus med tidiga reflexer).
export function makeImpulse(ctx, size = 0.5) {
  const seconds = 0.35 + size * 4.2;
  const decay = 2.2 + size * 1.5;
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const white = Math.random() * 2 - 1;
      // mörkare svans: enkel lågpass som stängs över tid
      const k = 0.9 - t * 0.75;
      lp = lp + (white - lp) * k;
      d[i] = lp * Math.pow(1 - t, decay);
    }
    // tidiga reflexer
    for (let r = 0; r < 8; r++) {
      const at = Math.floor(rate * (0.008 + r * 0.011 * (1 + size) + Math.random() * 0.004));
      if (at < len) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.7 - r * 0.07);
    }
  }
  return ir;
}
