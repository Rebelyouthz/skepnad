// One Euro-filter (Casiez m.fl. 2012): lite fördröjning vid snabba rörelser,
// mycket utjämning när det står still.
const alpha = (cutoff, dt) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuro {
  constructor({ minCutoff = 1.2, beta = 0.02, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = null;
    this.dx = 0;
  }

  reset() {
    this.x = null;
    this.dx = 0;
  }

  filter(value, dt) {
    if (this.x === null || !(dt > 0)) {
      this.x = value;
      return value;
    }
    const dValue = (value - this.x) / dt;
    this.dx += alpha(this.dCutoff, dt) * (dValue - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}

// Kritiskt dämpad fjäder för mjuka övergångar (t.ex. auto-inramning).
export function springStep(state, target, dt, omega = 6) {
  const x = state.x - target;
  const exp = Math.exp(-omega * dt);
  const nx = (x + (state.v + omega * x) * dt) * exp;
  const nv = (state.v - omega * (state.v + omega * x) * dt) * exp;
  state.x = nx + target;
  state.v = nv;
  return state.x;
}
