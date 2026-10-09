// 2D-overlay ovanpå den filtrerade bilden: namnskylt, LIVE, klocka, textning,
// chattnotiser, serietidningstexter och VHS-OSD.
import * as THREE from 'three';
import { FULLSCREEN_VERT, QuadPass } from './glsl.js';
import { StickerLayer } from './stickers.js';

const FRAG = /* glsl */ `
uniform sampler2D tOverlay;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tOverlay, vUv); }`;

const easeOut = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
const easeBack = (x) => {
  x = Math.min(Math.max(x, 0), 1);
  const c1 = 1.70158;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const DISPLAY = '"Sora Variable", Sora, "Segoe UI", sans-serif';
const TEXT = '"Inter Variable", Inter, "Segoe UI", sans-serif';

export class Overlay {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.pass = new QuadPass(
      new THREE.ShaderMaterial({
        uniforms: { tOverlay: { value: this.texture } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );
    this.pops = [];
    this.alerts = [];
    this.stickers = new StickerLayer();
    this.caption = { text: '', final: true, at: 0 };
    this.lower = { key: '', t: 0 };
    this.liveSince = performance.now();
    this.visible = false;
    this.setSize(1280, 720);
  }

  setSize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.W = w;
    this.H = h;
    this.s = Math.min(w, h) / 720;
  }

  /** Serietidningstext. at = {x, y} i pixlar med y upp. */
  pop(text, at, color = '#ffd23f') {
    this.pops.push({ text, x: at.x, y: this.H - at.y, t: 0, color, rot: (Math.random() - 0.5) * 0.35 });
  }

  alert(icon, user, text) {
    this.alerts.unshift({ icon, user, text, t: 0 });
    this.alerts.length = Math.min(this.alerts.length, 4);
  }

  setCaption(text, final) {
    this.caption = { text, final, at: performance.now() };
  }

  update(dt, t, st, { vhs = false, face = null } = {}) {
    const g = this.ctx;
    const { W, H, s } = this;
    const ov = st.overlays;
    const lt = ov.lowerThird;
    const capAge = (performance.now() - this.caption.at) / 1000;
    const showCap = ov.captions.enabled && this.caption.text && capAge < 4.5;
    this.pops = this.pops.filter((p) => (p.t += dt) < 1.1);
    this.alerts = this.alerts.filter((a) => (a.t += dt) < 5);
    const stickers = st.stickers?.items ?? [];
    const hasStickers = stickers.some((i) => !i.hidden);
    const any = hasStickers || lt.enabled || ov.live || ov.clock || showCap || this.pops.length || this.alerts.length || vhs || ov.frame === 'neon';
    this.visible = any;
    if (!any) {
      this.stickers.bounds = [];
      return;
    }
    g.clearRect(0, 0, W, H);
    if (hasStickers) this.stickers.draw(g, stickers, { W, H, face, t, dt });
    else this.stickers.bounds = [];

    if (ov.frame === 'neon') this._neonFrame(g, t);

    // Namnskylt
    if (lt.enabled) {
      const key = `${lt.name}|${lt.title}|${lt.style}`;
      if (key !== this.lower.key) this.lower = { key, t: 0 };
      this.lower.t += dt;
      this._lowerThird(g, lt, this.lower.t, t);
    } else {
      this.lower.key = '';
    }

    // LIVE-märke
    if (ov.live) {
      const x = 28 * s;
      const y = 26 * s;
      const secs = Math.floor((performance.now() - this.liveSince) / 1000);
      const time = `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
      g.font = `700 ${22 * s}px ${DISPLAY}`;
      const w1 = g.measureText('LIVE').width;
      g.font = `600 ${20 * s}px ${TEXT}`;
      const w2 = g.measureText(time).width;
      const h = 42 * s;
      const wTot = w1 + w2 + 78 * s;
      g.fillStyle = 'rgba(10,10,18,0.55)';
      this._rr(g, x, y, wTot, h, h / 2);
      g.fill();
      g.fillStyle = '#ff2d55';
      this._rr(g, x, y, w1 + 52 * s, h, h / 2);
      g.fill();
      const pulse = 0.55 + 0.45 * Math.sin(t * 4);
      g.fillStyle = `rgba(255,255,255,${pulse})`;
      g.beginPath();
      g.arc(x + 20 * s, y + h / 2, 6 * s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `700 ${22 * s}px ${DISPLAY}`;
      g.textBaseline = 'middle';
      g.fillText('LIVE', x + 34 * s, y + h / 2 + 1);
      g.font = `600 ${20 * s}px ${TEXT}`;
      g.fillText(time, x + w1 + 64 * s, y + h / 2 + 1);
    }

    // Klocka
    if (ov.clock) {
      const now = new Date();
      const txt = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      g.font = `600 ${30 * s}px ${DISPLAY}`;
      const w = g.measureText(txt).width + 36 * s;
      const h = 50 * s;
      const x = W - w - 28 * s;
      const y = 24 * s;
      g.fillStyle = 'rgba(10,10,18,0.5)';
      this._rr(g, x, y, w, h, 16 * s);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.lineWidth = 1.5 * s;
      g.stroke();
      g.fillStyle = '#fff';
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      g.fillText(txt, x + w / 2, y + h / 2 + 1);
      g.textAlign = 'left';
    }

    // Chattnotiser
    this.alerts.forEach((a, i) => {
      const inK = easeOut(a.t / 0.35);
      const outK = a.t > 4.4 ? easeOut((a.t - 4.4) / 0.5) : 0;
      const w = 360 * s;
      const h = 58 * s;
      const x = W - (w + 26 * s) * inK + outK * (w + 40 * s);
      const y = (ov.clock ? 92 : 24) * s + i * (h + 10 * s);
      g.globalAlpha = 1 - outK;
      g.fillStyle = 'rgba(14,12,28,0.78)';
      this._rr(g, x, y, w, h, 18 * s);
      g.fill();
      const grad = g.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, '#7c5cff');
      grad.addColorStop(1, '#22d3ee');
      g.strokeStyle = grad;
      g.lineWidth = 2 * s;
      g.stroke();
      g.font = `${28 * s}px "Segoe UI Emoji", sans-serif`;
      g.textBaseline = 'middle';
      g.fillText(a.icon, x + 14 * s, y + h / 2 + 1);
      g.fillStyle = '#b9a4ff';
      g.font = `700 ${18 * s}px ${TEXT}`;
      g.fillText(this._clip(g, a.user, 150 * s), x + 58 * s, y + h / 2 - 10 * s);
      g.fillStyle = '#fff';
      g.font = `500 ${17 * s}px ${TEXT}`;
      g.fillText(this._clip(g, a.text, w - 74 * s), x + 58 * s, y + h / 2 + 12 * s);
      g.globalAlpha = 1;
    });

    // Textning
    if (showCap) {
      const fade = capAge > 3.8 ? 1 - (capAge - 3.8) / 0.7 : 1;
      g.globalAlpha = fade;
      g.font = `600 ${32 * s}px ${TEXT}`;
      const lines = this._wrap(g, this.caption.text, W * 0.7).slice(-2);
      const lh = 44 * s;
      const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 44 * s;
      const bh = lines.length * lh + 20 * s;
      const by = H - bh - (lt.enabled ? 150 : 48) * s;
      g.fillStyle = 'rgba(0,0,0,0.62)';
      this._rr(g, (W - bw) / 2, by, bw, bh, 16 * s);
      g.fill();
      g.fillStyle = this.caption.final ? '#fff' : 'rgba(255,255,255,0.78)';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lines.forEach((l, i) => g.fillText(l, W / 2, by + 10 * s + lh * (i + 0.5)));
      g.textAlign = 'left';
      g.globalAlpha = 1;
    }

    // VHS-OSD
    if (vhs) {
      g.font = `700 ${34 * s}px Consolas, "Courier New", monospace`;
      g.fillStyle = '#fff';
      g.shadowColor = 'rgba(0,0,0,0.8)';
      g.shadowBlur = 6 * s;
      g.textBaseline = 'top';
      if (Math.floor(t * 1.2) % 2 === 0) g.fillText('PLAY ▶', 44 * s, 40 * s);
      const secs = Math.floor(t);
      g.fillText(`SP ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, 44 * s, H - 84 * s);
      g.shadowBlur = 0;
    }

    // Serietidningstexter
    for (const p of this.pops) {
      const k = easeBack(p.t / 0.25);
      const fade = p.t > 0.75 ? 1 - (p.t - 0.75) / 0.35 : 1;
      g.save();
      g.translate(p.x, p.y - p.t * 40 * s);
      g.rotate(p.rot);
      g.scale(k, k);
      g.globalAlpha = Math.max(fade, 0);
      g.font = `900 ${64 * s}px ${DISPLAY}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 14 * s;
      g.strokeStyle = '#1a0f2e';
      g.strokeText(p.text, 0, 0);
      g.fillStyle = p.color;
      g.fillText(p.text, 0, 0);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillText(p.text, -2 * s, -3 * s);
      g.restore();
    }
    this.texture.needsUpdate = true;
  }

  render(renderer) {
    if (this.visible) this.pass.render(renderer, null);
  }

  _lowerThird(g, lt, age, t) {
    const { W, H, s } = this;
    const k = easeOut(age / 0.6);
    const x0 = 48 * s;
    const y0 = H - 138 * s;
    g.textBaseline = 'alphabetic';
    if (lt.style === 'news') {
      g.font = `800 ${34 * s}px ${DISPLAY}`;
      const nw = g.measureText(lt.name.toUpperCase()).width + 48 * s;
      g.font = `500 ${22 * s}px ${TEXT}`;
      const tw = g.measureText(lt.title).width + 48 * s;
      const w = Math.max(nw, tw) * k;
      g.fillStyle = '#d7102e';
      g.fillRect(x0, y0, w, 58 * s);
      g.fillStyle = 'rgba(15,15,25,0.88)';
      g.fillRect(x0, y0 + 58 * s, w * 0.95, 40 * s);
      g.save();
      g.beginPath();
      g.rect(x0, y0, w, 100 * s);
      g.clip();
      g.fillStyle = '#fff';
      g.font = `800 ${34 * s}px ${DISPLAY}`;
      g.fillText(lt.name.toUpperCase(), x0 + 22 * s, y0 + 42 * s);
      g.font = `500 ${22 * s}px ${TEXT}`;
      g.fillText(lt.title, x0 + 22 * s, y0 + 86 * s);
      g.restore();
      return;
    }
    if (lt.style === 'neon') {
      g.globalAlpha = k;
      g.font = `800 ${46 * s}px ${DISPLAY}`;
      g.shadowColor = '#ff4fd8';
      g.shadowBlur = 24 * s;
      g.lineWidth = 3 * s;
      g.strokeStyle = '#ff9bf0';
      g.strokeText(lt.name, x0, y0 + 50 * s);
      g.fillStyle = '#fff';
      g.fillText(lt.name, x0, y0 + 50 * s);
      g.shadowColor = '#22d3ee';
      g.font = `600 ${24 * s}px ${TEXT}`;
      g.fillStyle = '#b9f3ff';
      g.fillText(lt.title, x0 + 4 * s, y0 + 88 * s);
      g.shadowBlur = 0;
      g.globalAlpha = 1;
      return;
    }
    if (lt.style === 'minimal') {
      g.globalAlpha = k;
      g.fillStyle = '#7c5cff';
      g.fillRect(x0, y0 + 12 * s, 6 * s, 76 * s * k);
      g.shadowColor = 'rgba(0,0,0,0.6)';
      g.shadowBlur = 10 * s;
      g.fillStyle = '#fff';
      g.font = `700 ${40 * s}px ${DISPLAY}`;
      g.fillText(lt.name, x0 + 22 * s, y0 + 50 * s);
      g.font = `500 ${22 * s}px ${TEXT}`;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillText(lt.title, x0 + 22 * s, y0 + 84 * s);
      g.shadowBlur = 0;
      g.globalAlpha = 1;
      return;
    }
    // glass (standard)
    g.font = `700 ${38 * s}px ${DISPLAY}`;
    const nw = g.measureText(lt.name).width;
    g.font = `500 ${22 * s}px ${TEXT}`;
    const tw = g.measureText(lt.title).width;
    const w = (Math.max(nw, tw) + 64 * s) * k;
    const h = 104 * s;
    g.save();
    g.fillStyle = 'rgba(16,14,30,0.62)';
    this._rr(g, x0, y0, w, h, 22 * s);
    g.fill();
    g.clip();
    const grad = g.createLinearGradient(x0, y0, x0 + w, y0 + h);
    grad.addColorStop(0, 'rgba(124,92,255,0.35)');
    grad.addColorStop(1, 'rgba(34,211,238,0.12)');
    g.fillStyle = grad;
    g.fillRect(x0, y0, w, h);
    const sweep = ((t * 0.25) % 1.6) - 0.3;
    const sg = g.createLinearGradient(x0 + w * sweep - 80 * s, 0, x0 + w * sweep + 80 * s, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg;
    g.fillRect(x0, y0, w, h);
    const bar = g.createLinearGradient(0, y0, 0, y0 + h);
    bar.addColorStop(0, '#7c5cff');
    bar.addColorStop(1, '#22d3ee');
    g.fillStyle = bar;
    g.fillRect(x0, y0, 7 * s, h);
    g.fillStyle = '#fff';
    g.font = `700 ${38 * s}px ${DISPLAY}`;
    g.fillText(lt.name, x0 + 30 * s, y0 + 50 * s);
    g.fillStyle = 'rgba(230,225,255,0.85)';
    g.font = `500 ${22 * s}px ${TEXT}`;
    g.fillText(lt.title, x0 + 30 * s, y0 + 84 * s);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = 1.5 * s;
    this._rr(g, x0, y0, w, h, 22 * s);
    g.stroke();
  }

  _neonFrame(g, t) {
    const { W, H, s } = this;
    const m = 14 * s;
    const grad = g.createLinearGradient(0, 0, W, H);
    const o = (t * 0.15) % 1;
    grad.addColorStop(0, '#7c5cff');
    grad.addColorStop((0.33 + o) % 1, '#22d3ee');
    grad.addColorStop((0.66 + o) % 1, '#ff4fd8');
    grad.addColorStop(1, '#7c5cff');
    g.save();
    g.strokeStyle = grad;
    g.lineWidth = 5 * s;
    g.shadowColor = '#ff4fd8';
    g.shadowBlur = 24 * s;
    this._rr(g, m, m, W - m * 2, H - m * 2, 26 * s);
    g.stroke();
    g.restore();
  }

  _rr(g, x, y, w, h, r) {
    g.beginPath();
    g.roundRect(x, y, Math.max(w, 0), h, Math.min(r, Math.abs(w) / 2, h / 2));
  }

  _clip(g, text, max) {
    if (g.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1);
    return `${t}…`;
  }

  _wrap(g, text, max) {
    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (g.measureText(test).width > max && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
}
