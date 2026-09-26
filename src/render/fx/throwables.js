// Kastföremål som flyger i en ballistisk bana mot huvudet och studsar av.
export const THROWABLES = [
  { id: 'tomato', char: '🍅', name: 'Tomat', hit: 'splat', splat: ['#ff2a2a', '#c40000', '#ff6b4a'], text: 'SPLAT!' },
  { id: 'egg', char: '🥚', name: 'Ägg', hit: 'splat', splat: ['#fff6d6', '#ffcf33', '#ffe680'], text: 'KRASS!' },
  { id: 'duck', char: '🦆', name: 'Badanka', hit: 'squeak', text: 'KVACK!' },
  { id: 'shoe', char: '👟', name: 'Sko', hit: 'bonk', text: 'BONK!' },
  { id: 'teddy', char: '🧸', name: 'Nalle', hit: 'boing', text: 'BOING!' },
  { id: 'fish', char: '🐟', name: 'Fisk', hit: 'slap', text: 'SMACK!' },
  { id: 'flowers', char: '💐', name: 'Blommor', hit: 'sparkle', text: 'ÅÅH!' },
  { id: 'cake', char: '🍰', name: 'Tårta', hit: 'splat', splat: ['#fff', '#ffc2d6', '#ff5c8a'], text: 'TÅRTA!' },
];

export class Throwables {
  constructor(particles) {
    this.p = particles;
    this.items = [];
    this.gravity = -2300;
  }

  throw(kindId, target, W, H) {
    const kind = THROWABLES.find((k) => k.id === kindId) ?? THROWABLES[(Math.random() * THROWABLES.length) | 0];
    const fromLeft = Math.random() < 0.5;
    const x0 = fromLeft ? -80 : W + 80;
    const y0 = H * (0.15 + Math.random() * 0.35);
    const T = 0.5 + Math.random() * 0.18;
    const vx = (target.x - x0) / T;
    const vy = (target.y - y0 - 0.5 * this.gravity * T * T) / T;
    this.items.push({
      kind,
      slot: this.p.slotFor(kind.char),
      x0,
      y0,
      vx,
      vy,
      t: 0,
      T,
      tx0: target.x,
      ty0: target.y,
      x: x0,
      y: y0,
      rot: 0,
      spin: (fromLeft ? -1 : 1) * (8 + Math.random() * 6),
      state: 'fly',
      life: 1.4,
      size: Math.max(70, (target.r ?? 80) * 0.9),
    });
    return kind;
  }

  /** getTarget(): {x, y, r} i pixlar (y upp). onHit(item, dirX) anropas vid träff. */
  update(dt, getTarget, onHit) {
    const target = getTarget();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.state === 'fly') {
        it.t += dt;
        const k = Math.min(it.t / it.T, 1);
        const bx = it.x0 + it.vx * it.t;
        const by = it.y0 + it.vy * it.t + 0.5 * this.gravity * it.t * it.t;
        // styr mot aktuell huvudposition om den flyttat sig
        it.x = bx + (target.x - it.tx0) * k * k;
        it.y = by + (target.y - it.ty0) * k * k;
        it.rot += it.spin * dt;
        if (it.t >= it.T) {
          it.state = 'fall';
          const dir = Math.sign(it.vx) || 1;
          it.vx = -dir * (180 + Math.random() * 160);
          it.vy = 500 + Math.random() * 250;
          it.spin *= -1.4;
          onHit?.(it, dir);
        }
      } else {
        it.vy += this.gravity * 0.8 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.spin * dt;
        it.life -= dt;
        if (it.life <= 0 || it.y < -200) {
          this.items.splice(i, 1);
          continue;
        }
      }
      const alpha = it.state === 'fall' ? Math.min(it.life / 0.4, 1) : 1;
      this.p.sprite(it.slot, it.x, it.y, it.rot, it.size, alpha);
    }
  }
}
