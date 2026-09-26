// Effektbibliotek + triggers (gester, ansiktsuttryck). Används av knappar,
// snabbtangenter, gester, uttryck och Twitch-chatt.
import { SPR } from '../render/fx/particles.js';
import { bus } from './bus.js';

const PARTY = ['#ff3fa4', '#ffd23f', '#22d3ee', '#9b5cff', '#5cff9b', '#ff7a3f', '#ffffff'];

export const EFFECTS = [
  { id: 'confetti', name: 'Konfetti', icon: '🎊', desc: 'Konfettikanoner från båda hörnen.', cmd: 'konfetti' },
  { id: 'hearts', name: 'Hjärtan', icon: '💖', desc: 'Hjärtan som svävar upp runt dig.', cmd: 'hjärtan' },
  { id: 'fireworks', name: 'Fyrverkeri', icon: '🎆', desc: 'Tre färgsprakande raketer.', cmd: 'fyrverkeri' },
  { id: 'sparkles', name: 'Gnistor', icon: '✨', desc: 'Glittrande gnistor runt ansiktet.', cmd: 'gnistor' },
  { id: 'thumbs', name: 'Tummen upp', icon: '👍', desc: 'En stor tumme upp med stjärnor.', cmd: 'tummen' },
  { id: 'party', name: 'Fest', icon: '🎉', desc: 'Tuta, konfetti och partyemojis!', cmd: 'fest' },
  { id: 'boom', name: 'Boom', icon: '💥', desc: 'Explosion med rök och skakande bild.', cmd: 'boom' },
  { id: 'fire', name: 'Eldsprutare', icon: '🔥', desc: 'Spruta eld ur munnen som en drake.', cmd: 'eld' },
  { id: 'kiss', name: 'Puss', icon: '💋', desc: 'Slängpussar som flyger iväg.', cmd: 'puss' },
  { id: 'surprise', name: 'Chock', icon: '❗', desc: 'Ett stort utropstecken ovanför huvudet.', cmd: 'chock' },
  { id: 'sad', name: 'Regnmoln', icon: '🌧️', desc: 'Ett litet regnmoln över huvudet + sorgtrombon.', cmd: 'ledsen' },
  { id: 'laugh', name: 'Skratt', icon: '😂', desc: 'Skrattande emojis överallt.', cmd: 'skratt' },
  { id: 'money', name: 'Pengaregn', icon: '💸', desc: 'Det regnar sedlar!', cmd: 'pengar' },
  { id: 'snow', name: 'Snöfall', icon: '❄️', desc: 'Stilla snöfall över bilden.', cmd: 'snö' },
  { id: 'stars', name: 'Stjärnregn', icon: '🌟', desc: 'Glittrande stjärnor faller.', cmd: 'stjärnor' },
  { id: 'ghosts', name: 'Spöken', icon: '👻', desc: 'Små spöken svävar förbi.', cmd: 'spöken' },
  { id: 'bonk', name: 'Kasta sak', icon: '🍅', desc: 'Något flyger in och träffar huvudet. BONK!', cmd: 'bonk' },
  { id: 'wink', name: 'Blink', icon: '😉', desc: 'Ett glittrande stjärnblink.', cmd: 'blink' },
];
export const EFFECT_MAP = Object.fromEntries(EFFECTS.map((e) => [e.id, e]));

export class EffectsEngine {
  /**
   * env: { particles, throwables, sfx(name), overlay, anchor(), mouth(), hand(), size(), shake(amount) }
   */
  constructor(env) {
    this.env = env;
    this.timers = [];
    this.breath = 0;
    this.rainFrom = null;
    this.wand = false;
    this._gesture = { name: 'None', held: 0, lastFire: {} };
    this._expr = { jawHeld: 0, lastFire: {}, winkHeld: 0 };
  }

  later(sec, fn) {
    this.timers.push({ at: sec, fn });
  }

  trigger(id, opts = {}) {
    const fn = this[`fx_${id}`];
    if (!fn) return false;
    fn.call(this, opts);
    bus.emit('effect', { id, ...opts });
    return true;
  }

  // ---------- Effekter ----------
  fx_confetti() {
    const { particles: p, sfx } = this.env;
    const { W } = this.env.size();
    for (const [x, ang] of [
      [0, 1.1],
      [W, Math.PI - 1.1],
    ]) {
      p.emit({ x, y: -10, count: 110, slot: SPR.rect, angle: ang, spread: 0.55, speed: [900, 1700], gravity: -950, drag: 1.5, life: [2.6, 4.2], size: [13, 24], flutter: [5, 13], spin: [2, 9], colors: PARTY });
    }
    sfx('pop');
    sfx('confetti');
  }

  fx_hearts(o = {}) {
    const a = o.at ?? this.env.anchor();
    this.env.particles.emit({ x: a.x, y: a.y, jitter: a.unit, count: 24, chars: ['❤️', '💖', '💕', '💗', '💘'], angle: Math.PI / 2, spread: 2.2, speed: [90, 300], gravity: 60, drag: 1.6, life: [1.8, 3.0], size: [a.unit * 0.45, a.unit * 0.9], sway: 50, pop: true });
    this.env.sfx('sparkle');
  }

  fx_fireworks() {
    const { W, H } = this.env.size();
    const { particles: p, sfx } = this.env;
    for (let k = 0; k < 3; k++) {
      this.later(k * 0.45, () => {
        const x = W * (0.2 + Math.random() * 0.6);
        const y = H * (0.6 + Math.random() * 0.3);
        const hue = Math.random() * 360;
        const cols = [`hsl(${hue},100%,65%)`, `hsl(${(hue + 40) % 360},100%,70%)`, '#ffffff'];
        p.emit({ x, y, count: 110, slot: SPR.glow, speed: [180, 560], gravity: -260, drag: 1.7, life: [1.0, 1.7], size: [12, 22], sizeEnd: 0.3, colors: cols, additive: true });
        p.emit({ x, y, count: 30, slot: SPR.spark, speed: [60, 300], gravity: -120, drag: 2, life: [0.6, 1.1], size: [20, 40], sizeEnd: 0, colors: ['#fff'], additive: true, spin: [1, 4] });
        p.emit({ x, y, count: 1, slot: SPR.glow, speed: 0, life: 0.35, size: 420, sizeEnd: 1.4, colors: cols, additive: true, alpha: 0.7 });
        sfx('firework');
      });
    }
  }

  fx_sparkles(o = {}) {
    const a = o.at ?? this.env.anchor();
    const p = this.env.particles;
    p.emit({ x: a.x, y: a.y, jitter: a.unit * 2.6, count: 34, slot: SPR.spark, speed: [10, 70], angle: Math.PI / 2, spread: Math.PI * 2, life: [0.6, 1.3], size: [18, 52], sizeEnd: 0, colors: ['#ffffff', '#ffe38a', '#b9f3ff'], additive: true, spin: [0.5, 3] });
    p.emit({ x: a.x, y: a.y, jitter: a.unit * 2.2, count: 6, chars: ['✨'], speed: [20, 60], life: [0.8, 1.4], size: [a.unit * 0.3, a.unit * 0.6], pop: true });
    this.env.sfx('sparkle');
  }

  fx_thumbs(o = {}) {
    const a = o.at ?? this.env.hand() ?? this.env.anchor();
    const p = this.env.particles;
    p.emit({ x: a.x, y: a.y + a.unit * 0.3, count: 1, chars: ['👍'], speed: 30, angle: Math.PI / 2, spread: 0, life: 1.5, size: a.unit * 1.6, pop: true, gravity: 40 });
    p.emit({ x: a.x, y: a.y, count: 18, slot: SPR.star, speed: [260, 520], drag: 3, life: [0.7, 1.1], size: [22, 36], sizeEnd: 0.2, colors: ['#ffd23f', '#fff3b0'], additive: true, spin: [3, 8] });
    this.env.sfx('ding');
  }

  fx_party() {
    this.fx_confetti();
    const { W, H } = this.env.size();
    this.env.particles.emit({ x: [W * 0.2, W * 0.8], y: H * 0.15, count: 8, chars: ['🎉', '🥳', '🎈', '🎊'], angle: Math.PI / 2, spread: 0.8, speed: [500, 800], gravity: -700, drag: 0.6, life: [1.8, 2.6], size: [60, 90], spin: [1, 3], pop: true });
    this.env.sfx('airhorn');
  }

  fx_boom(o = {}) {
    const a = o.at ?? this.env.anchor();
    const p = this.env.particles;
    p.emit({ x: a.x, y: a.y, jitter: a.unit * 0.8, count: 18, slot: SPR.puff, speed: [220, 460], drag: 2.4, life: [0.7, 1.4], size: [a.unit * 0.8, a.unit * 1.5], sizeEnd: 1.9, colors: ['#9a9aa8', '#6b6b78', '#c8c8d4'], alpha: 0.5, gravity: 60 });
    p.emit({ x: a.x, y: a.y, count: 1, chars: ['💥'], speed: 0, life: 0.9, size: a.unit * 3.2, pop: true });
    p.emit({ x: a.x, y: a.y, count: 40, slot: SPR.glow, speed: [300, 800], drag: 3, life: [0.3, 0.7], size: [20, 40], sizeEnd: 0, colors: ['#ffb347', '#ff5e3a', '#fff2a0'], additive: true });
    this.env.shake(1);
    this.env.sfx('explosion');
    this.env.overlay?.pop('BOOM!', a, '#ff7a3f');
  }

  fx_fire() {
    this.breath = Math.max(this.breath, 0.9);
    this.env.sfx('fireburst');
  }

  fx_kiss(o = {}) {
    const m = o.at ?? this.env.mouth();
    this.env.particles.emit({ x: m.x, y: m.y, count: 7, chars: ['💋', '😘', '💕'], angle: m.dir ?? Math.PI / 2, spread: 0.9, speed: [220, 420], gravity: 90, drag: 1.1, life: [1.4, 2.2], size: [m.unit * 0.45, m.unit * 0.7], sway: 40, pop: true });
    this.env.sfx('kiss');
  }

  fx_surprise(o = {}) {
    const a = o.at ?? this.env.anchor();
    this.env.particles.emit({ x: a.x, y: a.y + a.unit * 1.9, count: 1, chars: ['❗'], speed: 0, life: 1.3, size: a.unit * 1.2, pop: true });
    this.env.particles.emit({ x: a.x + a.unit * 0.8, y: a.y + a.unit * 1.7, count: 1, chars: ['❓'], speed: 0, life: 1.2, size: a.unit * 0.7, pop: true, rotation: 0.3 });
    this.env.sfx('boing');
  }

  fx_sad(o = {}) {
    const a = o.at ?? this.env.anchor();
    const p = this.env.particles;
    const cy = a.y + a.unit * 2.1;
    p.emit({ x: a.x, y: cy, count: 1, chars: ['🌧️'], speed: 0, life: 3, size: a.unit * 1.8, pop: true });
    this.rainFrom = { x: a.x, y: cy - a.unit * 0.4, w: a.unit * 1.3, left: 2.6 };
    this.env.sfx('sadTrombone');
  }

  fx_laugh(o = {}) {
    const a = o.at ?? this.env.anchor();
    this.env.particles.emit({ x: a.x, y: a.y, jitter: a.unit * 1.5, count: 16, chars: ['😂', '🤣', '😆', '😹'], angle: Math.PI / 2, spread: 2.6, speed: [250, 600], gravity: -500, drag: 0.8, life: [1.5, 2.2], size: [a.unit * 0.5, a.unit * 0.9], spin: [1, 4], pop: true });
    this.env.sfx('laugh');
  }

  _rain(chars, count, opts = {}) {
    const { W, H } = this.env.size();
    for (let k = 0; k < 4; k++) {
      this.later(k * 0.35, () =>
        this.env.particles.emit({ x: [0, W], y: H + 60, count: Math.ceil(count / 4), angle: -Math.PI / 2, spread: 0.3, speed: [80, 220], gravity: -260, drag: 0.8, life: [3.5, 5], size: [40, 70], spin: [0.5, 2], sway: 60, ...opts, chars }),
      );
    }
  }

  fx_money() {
    this._rain(['💸', '💰', '💵', '🤑'], 44, { flutter: [2, 5] });
    this.env.sfx('chaching');
  }

  fx_snow() {
    const { W, H } = this.env.size();
    this.env.particles.emit({ x: [0, W], y: [H, H + 300], count: 160, slot: SPR.circle, angle: -Math.PI / 2, spread: 0.4, speed: [30, 90], gravity: -40, drag: 0.4, life: [5, 7], size: [4, 11], colors: ['#ffffff', '#e8f4ff'], sway: 40, alpha: 0.9 });
    this._rain(['❄️'], 14, { size: [26, 44], gravity: -60, speed: [30, 60] });
    this.env.sfx('magic');
  }

  fx_stars() {
    this._rain(['⭐', '🌟', '✨'], 36, { gravity: -380 });
    this.env.sfx('magic');
  }

  fx_ghosts() {
    const { W } = this.env.size();
    this.env.particles.emit({ x: [0, W], y: -60, count: 9, chars: ['👻'], angle: Math.PI / 2, spread: 0.5, speed: [120, 260], gravity: 20, drag: 0.4, life: [3.5, 5], size: [60, 100], sway: 90, alpha: 0.85 });
    this.env.sfx('spooky');
  }

  fx_bonk(o = {}) {
    const a = this.env.anchor();
    const { W, H } = this.env.size();
    this.env.throwables.throw(o.kind, { x: a.x, y: a.y, r: a.unit * 1.2 }, W, H);
    this.env.sfx('whoosh');
  }

  fx_wink(o = {}) {
    const a = o.at ?? this.env.anchor();
    const p = this.env.particles;
    p.emit({ x: a.x + a.unit * 0.5, y: a.y + a.unit * 0.1, count: 1, slot: SPR.star, speed: 0, life: 0.8, size: a.unit * 0.9, colors: ['#ffe38a'], additive: true, spin: [4, 6], pop: true });
    p.emit({ x: a.x + a.unit * 0.5, y: a.y + a.unit * 0.1, count: 8, slot: SPR.spark, speed: [60, 160], life: [0.4, 0.8], size: [16, 30], sizeEnd: 0, colors: ['#fff'], additive: true });
    this.env.sfx('ting');
  }

  /** Kallas vid träff av kastföremål */
  onThrowHit(item, dir) {
    const a = this.env.anchor();
    const p = this.env.particles;
    const k = item.kind;
    if (k.splat) {
      p.emit({ x: item.x, y: item.y, count: 36, slot: SPR.circle, speed: [150, 520], drag: 2.5, gravity: -900, life: [0.5, 1.1], size: [10, 28], sizeEnd: 0.6, colors: k.splat });
    }
    p.emit({ x: a.x, y: a.y + a.unit * 1.1, count: 5, chars: ['💫', '⭐'], speed: [80, 160], angle: Math.PI / 2, spread: Math.PI * 2, life: [0.8, 1.2], size: [a.unit * 0.35, a.unit * 0.55], spin: [2, 5], pop: true });
    this.env.sfx(k.hit);
    this.env.overlay?.pop(k.text, { x: item.x, y: item.y + 40 }, '#ffd23f');
    this.env.shake(0.55, dir);
    bus.emit('fx:hit', { dir, strength: 1 });
  }

  // ---------- Triggers ----------
  /** Gester: måste hållas en stund, med nedkylning per gest. */
  handleGesture(g, dt, map, enabled) {
    const st = this._gesture;
    if (!enabled || !g?.present || g.name === 'None' || g.score < 0.6) {
      st.name = 'None';
      st.held = 0;
      return;
    }
    if (g.name !== st.name) {
      st.name = g.name;
      st.held = 0;
      st.fired = false;
    }
    st.held += dt;
    const now = performance.now() / 1000;
    const last = st.lastFire[g.name] ?? -99;
    if (!st.fired && st.held > 0.35 && now - last > 2.5) {
      st.fired = true;
      st.lastFire[g.name] = now;
      const effect = map[g.name];
      if (effect) this.trigger(effect, { at: this.env.hand() ?? undefined, source: 'gesture', gesture: g.name });
    }
  }

  /** Ansiktsuttryck → effekter */
  handleExpressions(face, dt, map, enabled) {
    if (!enabled || !face?.present) {
      this._expr.jawHeld = 0;
      return;
    }
    const b = face.blend;
    const st = this._expr;
    const now = performance.now() / 1000;
    const ready = (k, cd) => now - (st.lastFire[k] ?? -99) > cd;
    const fire = (k, effect, cd) => {
      if (ready(k, cd)) {
        st.lastFire[k] = now;
        this.trigger(effect, { source: 'expression' });
      }
    };
    const jaw = b.jawOpen ?? 0;
    if (map.breath) {
      st.jawHeld = jaw > 0.55 ? st.jawHeld + dt : 0;
      if (st.jawHeld > 0.55) this.breath = Math.max(this.breath, 0.25);
      if (st.jawHeld > 0.55 && ready('breathSfx', 2)) {
        st.lastFire.breathSfx = now;
        this.env.sfx('fireburst');
      }
    }
    const smile = ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2;
    if (map.sparkle && smile > 0.78) fire('smile', 'sparkles', 5);
    const pucker = b.mouthPucker ?? 0;
    if (map.kiss && pucker > 0.8 && jaw < 0.25) fire('kiss', 'kiss', 3);
    const brows = ((b.browInnerUp ?? 0) + ((b.browOuterUpLeft ?? 0) + (b.browOuterUpRight ?? 0)) / 2) / 2;
    if (map.surprise && brows > 0.75 && jaw > 0.25) fire('surprise', 'surprise', 4);
    const bl = b.eyeBlinkLeft ?? 0;
    const br = b.eyeBlinkRight ?? 0;
    const wink = Math.abs(bl - br) > 0.45 && Math.min(bl, br) < 0.35;
    st.winkHeld = wink ? st.winkHeld + dt : 0;
    if (map.wink && st.winkHeld > 0.12 && st.winkHeld < 0.9) fire('wink', 'wink', 2.5);
  }

  update(dt, t) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.at -= dt;
      if (tm.at <= 0) {
        this.timers.splice(i, 1);
        tm.fn();
      }
    }
    const p = this.env.particles;
    if (this.breath > 0) {
      const m = this.env.mouth();
      const n = Math.ceil(5 * Math.min(this.breath * 2, 1));
      const fc = m.facing;
      const spread = fc ? Math.PI * 2 : 0.45;
      const speed = fc ? [m.unit * 2.2, m.unit * 4.2] : [m.unit * 5, m.unit * 9];
      const size = fc ? [m.unit * 0.22, m.unit * 0.42] : [m.unit * 0.5, m.unit * 0.9];
      p.emit({ x: m.x, y: m.y, count: fc ? Math.max(1, n - 2) : n, slot: SPR.glow, angle: m.dir, spread, speed, drag: 1.6, gravity: 220, life: [0.4, 0.7], size, sizeEnd: fc ? 2.4 : 2.2, colors: ['#ffcf4a', '#ff7a1f', '#ff3a1a', '#ffb070'], additive: true, alpha: fc ? 0.65 : 0.9 });
      if (Math.random() < 0.25) p.emit({ x: m.x, y: m.y, count: 1, chars: ['🔥'], angle: m.dir, spread: fc ? Math.PI * 2 : 0.3, speed: fc ? [m.unit, m.unit * 2] : [m.unit * 4, m.unit * 7], drag: 1.2, gravity: 150, life: [0.5, 0.8], size: [m.unit * 0.4, m.unit * 0.6], sizeEnd: fc ? 2.4 : 1.5 });
      this.breath = Math.max(0, this.breath - dt);
    }
    if (this.rainFrom) {
      const r = this.rainFrom;
      p.emit({ x: [r.x - r.w / 2, r.x + r.w / 2], y: r.y, count: 1, slot: SPR.drop, angle: -Math.PI / 2, spread: 0.05, speed: [250, 350], gravity: -600, drag: 0.2, life: 0.9, size: [10, 16], colors: ['#7ac8ff', '#b9e3ff'] });
      r.left -= dt;
      if (r.left <= 0) this.rainFrom = null;
    }
    if (this.wand) {
      const h = this.env.fingertip?.();
      if (h) {
        p.emit({ x: h.x, y: h.y, count: 2, slot: SPR.spark, speed: [5, 40], life: [0.5, 0.9], size: [14, 30], sizeEnd: 0, colors: ['#ffffff', '#ffe38a', '#ff9bf0', '#9bf0ff'], additive: true, spin: [1, 4], gravity: -80 });
        p.emit({ x: h.x, y: h.y, count: 1, slot: SPR.glow, speed: 5, life: 0.35, size: 34, sizeEnd: 0.2, colors: ['#ffe38a'], additive: true });
      }
    }
  }
}
