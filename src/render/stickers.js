// Klistermärken i bilden: emojis, Skepnads egna neon-emojis, text/pratbubblor
// och egna bilder. Förankras i ansiktet (följer position, storlek och lutning)
// eller fritt i bilden. Ritas i overlay-canvasen så att de syns i sändningen.
import { SKEP_MAP, svgUrl } from '../ui/emojis.js';

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const DISPLAY = '"Sora Variable", Sora, "Segoe UI", sans-serif';
const IMPACT = 'Impact, "Anton", "Arial Black", sans-serif';

const easeBack = (x) => {
  x = Math.min(Math.max(x, 0), 1);
  const c1 = 2.2;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h & 0xffff) / 0xffff;
};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Ritar en textskylt i vald stil. Returnerar canvas. */
function drawText(text, style, color = '#ff2bd6') {
  const fs = 64;
  const probe = canvas(4, 4).getContext('2d');
  const lines = String(text || '').slice(0, 80).split('\n').slice(0, 3);
  const font = style === 'meme' ? `${fs}px ${IMPACT}` : `800 ${fs}px ${DISPLAY}`;
  probe.font = font;
  const shown = style === 'meme' || style === 'shout' ? lines.map((l) => l.toUpperCase()) : lines;
  const tw = Math.max(...shown.map((l) => probe.measureText(l).width), fs);
  const lh = fs * 1.1;
  const th = lh * shown.length;
  const pad = style === 'meme' ? 16 : style === 'shout' ? 70 : 40;
  const w = tw + pad * 2;
  const h = th + pad * 2 + (style === 'bubble' || style === 'think' ? 50 : 0);
  const c = canvas(w + 40, h + 40);
  const g = c.getContext('2d');
  g.translate(20, 20);
  g.lineJoin = 'round';
  const bodyH = th + pad * 2;
  if (style === 'bubble') {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#12061f';
    g.lineWidth = 8;
    rr(g, 4, 4, w - 8, bodyH - 8, 44);
    g.moveTo(w * 0.22, bodyH - 6);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.18, bodyH - 12);
    g.lineTo(w * 0.1, h - 4);
    g.lineTo(w * 0.36, bodyH - 12);
    g.closePath();
    g.fill();
    g.stroke();
    rr(g, 4, 4, w - 8, bodyH - 8, 44);
    g.stroke();
    g.fillRect(w * 0.18 + 2, bodyH - 18, w * 0.18 - 4, 12);
  } else if (style === 'think') {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#12061f';
    g.lineWidth = 7;
    const cx = w / 2;
    const cy = bodyH / 2;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.moveTo(cx + Math.cos(a) * (w / 2 - 30) + 28, cy + Math.sin(a) * (bodyH / 2 - 26));
      g.arc(cx + Math.cos(a) * (w / 2 - 30), cy + Math.sin(a) * (bodyH / 2 - 26), 28, 0, Math.PI * 2);
    }
    g.stroke();
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy, w / 2 - 28, bodyH / 2 - 22, 0, 0, Math.PI * 2);
    g.fill();
    for (const [x, y, r] of [
      [w * 0.2, bodyH + 8, 14],
      [w * 0.12, bodyH + 34, 9],
    ]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  } else if (style === 'shout') {
    g.beginPath();
    const n = 18;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const k = i % 2 ? 0.78 : 1;
      const x = w / 2 + Math.cos(a) * (w / 2 - 6) * k;
      const y = bodyH / 2 + Math.sin(a) * (bodyH / 2 - 6) * k;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.fillStyle = '#fcee0a';
    g.strokeStyle = '#12061f';
    g.lineWidth = 8;
    g.fill();
    g.stroke();
  } else if (style === 'neon') {
    g.fillStyle = 'rgba(12,6,26,0.85)';
    rr(g, 6, 6, w - 12, bodyH - 12, 22);
    g.fill();
    g.shadowColor = color;
    g.shadowBlur = 26;
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.stroke();
    g.shadowBlur = 0;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = font;
  shown.forEach((l, i) => {
    const y = pad + lh * (i + 0.5) + (style === 'meme' ? 4 : 2);
    if (style === 'meme') {
      g.lineWidth = 12;
      g.strokeStyle = '#000';
      g.strokeText(l, w / 2, y);
      g.fillStyle = '#fff';
      g.fillText(l, w / 2, y);
    } else if (style === 'neon') {
      g.shadowColor = color;
      g.shadowBlur = 22;
      g.fillStyle = '#ffffff';
      g.fillText(l, w / 2, y);
      g.shadowBlur = 0;
    } else if (style === 'shout') {
      g.lineWidth = 10;
      g.strokeStyle = '#12061f';
      g.strokeText(l, w / 2, y);
      g.fillStyle = '#ff2d55';
      g.fillText(l, w / 2, y);
    } else {
      g.fillStyle = '#12061f';
      g.fillText(l, w / 2, y);
    }
  });
  return c;
}

export class StickerLayer {
  constructor() {
    this.cache = new Map();
    this.images = new Map();
    this.bounds = [];
    this.live = null; // { id, patch } under pågående dragning
    this.anchor = null;
    this.born = new Map();
  }

  setImage(id, img) {
    this.images.set(id, img);
  }

  _sprite(it) {
    if (it.kind === 'image') {
      const img = this.images.get(it.value);
      return img?.complete && img.naturalWidth ? { img, aspect: img.naturalWidth / img.naturalHeight } : null;
    }
    const key = it.kind === 'text' ? `t:${it.style}:${it.color}:${it.value}` : `${it.kind}:${it.value}`;
    let c = this.cache.get(key);
    if (!c) {
      if (it.kind === 'skep') {
        const img = new Image();
        img.src = svgUrl(SKEP_MAP[it.value]?.svg ?? SKEP_MAP.neonHeart.svg);
        c = { img, aspect: 1 };
      } else if (it.kind === 'text') {
        const cv = drawText(it.value, it.style, it.color);
        c = { img: cv, aspect: cv.width / cv.height };
      } else {
        const cv = canvas(176, 176);
        const g = cv.getContext('2d');
        g.font = `140px ${EMOJI_FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(it.value, 88, 96);
        c = { img: cv, aspect: 1 };
      }
      this.cache.set(key, c);
      if (this.cache.size > 160) this.cache.delete(this.cache.keys().next().value);
    }
    if (c.img instanceof HTMLImageElement && !(c.img.complete && c.img.naturalWidth)) return null;
    return c;
  }

  /** Utjämnat ansiktsankare (pixlar, y nedåt). Behåller sista läget om ansiktet tappas. */
  _updateAnchor(face, W, H, dt) {
    const target = face?.present ? { x: face.x, y: H - face.y, unit: face.unit, roll: face.roll ?? 0 } : null;
    if (!this.anchor) this.anchor = target ?? { x: W / 2, y: H * 0.4, unit: H * 0.14, roll: 0 };
    if (target) {
      const k = 1 - Math.exp(-dt * 22);
      const a = this.anchor;
      a.x += (target.x - a.x) * k;
      a.y += (target.y - a.y) * k;
      a.unit += (target.unit - a.unit) * k;
      a.roll += (target.roll - a.roll) * k;
    }
    return this.anchor;
  }

  /** Skärmposition för ett klistermärke. */
  place(it, W, H) {
    const A = this.anchor ?? { x: W / 2, y: H * 0.4, unit: H * 0.14, roll: 0 };
    if (it.anchor === 'face') {
      const c = Math.cos(A.roll);
      const s = Math.sin(A.roll);
      const dx = it.dx ?? 0;
      const dy = it.dy ?? 0;
      return { x: A.x + (dx * c - dy * s) * A.unit, y: A.y - (dx * s + dy * c) * A.unit, size: (it.scale ?? 1) * A.unit, rot: (it.rot ?? 0) - A.roll };
    }
    return { x: (it.x ?? 0.5) * W, y: (it.y ?? 0.5) * H, size: (it.scale ?? 0.2) * H, rot: it.rot ?? 0 };
  }

  /** Omvandla skärmposition (pixlar, y nedåt) till klistermärkets lagrade koordinater. */
  toStored(it, px, py, W, H) {
    if (it.anchor === 'face') {
      const A = this.anchor;
      const ux = (px - A.x) / A.unit;
      const uy = (A.y - py) / A.unit;
      const c = Math.cos(-A.roll);
      const s = Math.sin(-A.roll);
      return { dx: ux * c - uy * s, dy: ux * s + uy * c };
    }
    return { x: Math.min(Math.max(px / W, 0), 1), y: Math.min(Math.max(py / H, 0), 1) };
  }

  /** Storlek i lagrade enheter från pixlar. */
  scaleFromPx(it, sizePx, H) {
    return it.anchor === 'face' ? sizePx / (this.anchor?.unit || H * 0.14) : sizePx / H;
  }

  draw(g, items, { W, H, face, t, dt }) {
    this._updateAnchor(face, W, H, dt);
    this.bounds = [];
    const now = performance.now();
    for (const raw of items) {
      if (raw.hidden) continue;
      const it = this.live?.id === raw.id ? { ...raw, ...this.live.patch } : raw;
      const sp = this._sprite(it);
      if (!sp) continue;
      if (!this.born.has(it.id)) this.born.set(it.id, now);
      const age = (now - this.born.get(it.id)) / 1000;
      const p = this.place(it, W, H);
      let { x, y, size, rot } = p;
      const ph = hashStr(it.id) * 6.28;
      let k = easeBack(age / 0.45);
      if (it.anim === 'bob') y += Math.sin(t * 2.6 + ph) * size * 0.06;
      if (it.anim === 'pulse') k *= 1 + Math.sin(t * 5 + ph) * 0.08;
      if (it.anim === 'spin') rot += t * 1.6;
      if (it.anim === 'wiggle') rot += Math.sin(t * 7 + ph) * 0.18;
      if (it.anim === 'float') {
        x += Math.sin(t * 0.9 + ph) * size * 0.12;
        y += Math.cos(t * 1.3 + ph) * size * 0.1;
      }
      const h = size * k;
      const w = h * sp.aspect;
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      if (it.flip) g.scale(-1, 1);
      g.globalAlpha = it.opacity ?? 1;
      g.drawImage(sp.img, -w / 2, -h / 2, w, h);
      g.restore();
      this.bounds.push({ id: it.id, x, y, w: size * sp.aspect, h: size, rot });
    }
    for (const id of this.born.keys()) if (!items.some((i) => i.id === id)) this.born.delete(id);
  }

  /** Översta klistermärket under punkten (pixlar, y nedåt). */
  hit(px, py, pad = 1.15) {
    for (let i = this.bounds.length - 1; i >= 0; i--) {
      const b = this.bounds[i];
      const c = Math.cos(-b.rot);
      const s = Math.sin(-b.rot);
      const lx = (px - b.x) * c - (py - b.y) * s;
      const ly = (px - b.x) * s + (py - b.y) * c;
      if (Math.abs(lx) <= (b.w / 2) * pad && Math.abs(ly) <= (b.h / 2) * pad) return b;
    }
    return null;
  }

  boundsFor(id) {
    return this.bounds.find((b) => b.id === id) ?? null;
  }
}
