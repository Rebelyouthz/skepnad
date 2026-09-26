// GPU-instansade partiklar och sprites (emoji, konfetti, glöd) i en pixelscen.
// Koordinater i pixlar med y uppåt.
import * as THREE from 'three';
import { COLOR } from '../glsl.js';

const GRID = 8;
const CELL = 128;
const MAX = 2400;

// Specialsprites som ritas procedurellt i atlasen
export const SPR = { glow: 0, rect: 1, star: 2, spark: 3, ring: 4, puff: 5, drop: 6, circle: 7 };

const VERT = /* glsl */ `
attribute vec4 iPos;   // x, y, rotation, size
attribute vec4 iColor; // rgb-ton, alfa
attribute vec2 iMisc;  // slot, flutter
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec2 p = position.xy;
  p.x *= cos(iMisc.y);
  float c = cos(iPos.z);
  float s = sin(iPos.z);
  vec2 rp = vec2(p.x * c - p.y * s, p.x * s + p.y * c) * iPos.w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(iPos.xy + rp, 0.0, 1.0);
  float col = mod(iMisc.x, ${GRID}.0);
  float row = floor(iMisc.x / ${GRID}.0);
  vUv = vec2((col + uv.x) / ${GRID}.0, 1.0 - (row + 1.0 - uv.y) / ${GRID}.0);
  vColor = iColor;
}`;

const FRAG = /* glsl */ `
uniform sampler2D tAtlas;
varying vec2 vUv;
varying vec4 vColor;
${COLOR}
void main() {
  vec4 t = texture2D(tAtlas, vUv);
  float a = t.a * vColor.a;
  if (a < 0.002) discard;
  vec3 straight = t.rgb / max(t.a, 0.0001);
  vec3 lin = srgbToLinear(straight * vColor.rgb);
  gl_FragColor = vec4(lin * a, a);
}`;

function drawSpecials(g) {
  const cell = (i) => [(i % GRID) * CELL, Math.floor(i / GRID) * CELL];
  const C = CELL / 2;
  let [x, y] = cell(SPR.glow);
  let grad = g.createRadialGradient(x + C, y + C, 0, x + C, y + C, C);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(x, y, CELL, CELL);
  [x, y] = cell(SPR.rect);
  g.fillStyle = '#fff';
  g.fillRect(x + 34, y + 20, 60, 88);
  [x, y] = cell(SPR.star);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 22 : 56;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(x + C + Math.cos(a) * r, y + C + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  [x, y] = cell(SPR.spark);
  grad = g.createRadialGradient(x + C, y + C, 0, x + C, y + C, C);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0.1)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(x + C, y + 2);
  g.quadraticCurveTo(x + C + 14, y + C - 14, x + CELL - 2, y + C);
  g.quadraticCurveTo(x + C + 14, y + C + 14, x + C, y + CELL - 2);
  g.quadraticCurveTo(x + C - 14, y + C + 14, x + 2, y + C);
  g.quadraticCurveTo(x + C - 14, y + C - 14, x + C, y + 2);
  g.fill();
  grad = g.createRadialGradient(x + C, y + C, 0, x + C, y + C, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(x, y, CELL, CELL);
  [x, y] = cell(SPR.ring);
  g.strokeStyle = '#fff';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(x + C, y + C, 50, 0, Math.PI * 2);
  g.stroke();
  [x, y] = cell(SPR.puff);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const px = x + C + Math.cos(a) * 22;
    const py = y + C + Math.sin(a) * 22;
    grad = g.createRadialGradient(px, py, 0, px, py, 36);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(x, y, CELL, CELL);
  }
  [x, y] = cell(SPR.drop);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(x + C, y + 14);
  g.bezierCurveTo(x + C + 30, y + 60, x + C + 34, y + 104, x + C, y + 110);
  g.bezierCurveTo(x + C - 34, y + 104, x + C - 30, y + 60, x + C, y + 14);
  g.fill();
  [x, y] = cell(SPR.circle);
  g.beginPath();
  g.arc(x + C, y + C, 54, 0, Math.PI * 2);
  g.fill();
}

export class Particles {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = GRID * CELL;
    this.ctx = this.canvas.getContext('2d');
    drawSpecials(this.ctx);
    this.nextSlot = 8;
    this.slots = new Map();
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.premultiplyAlpha = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.anisotropy = 4;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1280, 720, 0, -10, 10);
    this.pools = {
      normal: this._makePool(false),
      add: this._makePool(true),
    };
    // Partikeldata (struktur av arrayer)
    this.n = 0;
    const f = () => new Float32Array(MAX);
    Object.assign(this, {
      px: f(), py: f(), vx: f(), vy: f(), g: f(), drag: f(), rot: f(), vr: f(), size: f(), size1: f(),
      life: f(), max: f(), slot: f(), r: f(), gg: f(), b: f(), alpha: f(), flut: f(), vflut: f(), add: new Uint8Array(MAX),
      sway: f(), pop: f(),
    });
    this.immediate = [];
  }

  _makePool(additive) {
    const geo = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    const iPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const iColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const iMisc = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', iPos);
    geo.setAttribute('iColor', iColor);
    geo.setAttribute('iMisc', iMisc);
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { tAtlas: { value: this.texture } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = additive ? 2 : 1;
    this.scene.add(mesh);
    return { geo, iPos, iColor, iMisc, mesh };
  }

  setSize(w, h) {
    this.camera.right = w;
    this.camera.top = h;
    this.camera.updateProjectionMatrix();
  }

  /** Hämta atlas-slot för en emoji (ritas vid första användning). */
  slotFor(ch) {
    if (typeof ch === 'number') return ch;
    if (this.slots.has(ch)) return this.slots.get(ch);
    let slot = this.nextSlot++;
    if (slot >= GRID * GRID) {
      // Återanvänd äldsta platsen (sällsynt)
      slot = 8 + ((slot - 8) % (GRID * GRID - 8));
      for (const [k, v] of this.slots) if (v === slot) this.slots.delete(k);
    }
    const x = (slot % GRID) * CELL;
    const y = Math.floor(slot / GRID) * CELL;
    const g = this.ctx;
    g.clearRect(x, y, CELL, CELL);
    g.font = `${CELL * 0.72}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, x + CELL / 2, y + CELL / 2 + CELL * 0.04);
    this.texture.needsUpdate = true;
    this.slots.set(ch, slot);
    return slot;
  }

  /**
   * Skapa partiklar. Alla värden kan vara tal eller [min, max].
   * opts: x, y, count, chars|slot, speed, angle, spread, gravity, drag, life, size, sizeEnd,
   *       spin, colors, additive, flutter, sway, alpha, pop
   */
  emit(o) {
    const rnd = (v, d = 0) => (Array.isArray(v) ? v[0] + Math.random() * (v[1] - v[0]) : v ?? d);
    const count = o.count ?? 1;
    const slots = o.chars ? o.chars.map((c) => this.slotFor(c)) : [o.slot ?? SPR.glow];
    const colors = (o.colors ?? ['#ffffff']).map((c) => new THREE.Color(c));
    for (let k = 0; k < count; k++) {
      if (this.n >= MAX) this._kill(0);
      const i = this.n++;
      const ang = rnd(o.angle, Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const sp = rnd(o.speed, 200);
      this.px[i] = rnd(o.x) + (Math.random() - 0.5) * (o.jitter ?? 0);
      this.py[i] = rnd(o.y) + (Math.random() - 0.5) * (o.jitter ?? 0);
      this.vx[i] = Math.cos(ang) * sp;
      this.vy[i] = Math.sin(ang) * sp;
      this.g[i] = rnd(o.gravity, 0);
      this.drag[i] = rnd(o.drag, 0.6);
      this.rot[i] = rnd(o.rotation, (Math.random() - 0.5) * 0.6);
      this.vr[i] = rnd(o.spin, 0) * (Math.random() < 0.5 ? -1 : 1);
      this.size[i] = rnd(o.size, 40);
      this.size1[i] = this.size[i] * rnd(o.sizeEnd, 1);
      this.max[i] = rnd(o.life, 1.5);
      this.life[i] = 0;
      this.slot[i] = slots[(Math.random() * slots.length) | 0];
      const c = colors[(Math.random() * colors.length) | 0];
      this.r[i] = c.r;
      this.gg[i] = c.g;
      this.b[i] = c.b;
      this.alpha[i] = rnd(o.alpha, 1);
      this.flut[i] = o.flutter ? Math.random() * 6.28 : 0;
      this.vflut[i] = o.flutter ? rnd(o.flutter, 6) : 0;
      this.add[i] = o.additive ? 1 : 0;
      this.sway[i] = rnd(o.sway, 0);
      this.pop[i] = o.pop ? 1 : 0;
    }
  }

  /** Rita en sprite bara denna bildruta (används av kastföremål). */
  sprite(slot, x, y, rot, size, alpha = 1, additive = false) {
    this.immediate.push([slot, x, y, rot, size, alpha, additive]);
  }

  _kill(i) {
    const last = --this.n;
    if (i === last) return;
    for (const k of ['px', 'py', 'vx', 'vy', 'g', 'drag', 'rot', 'vr', 'size', 'size1', 'life', 'max', 'slot', 'r', 'gg', 'b', 'alpha', 'flut', 'vflut', 'add', 'sway', 'pop']) {
      this[k][i] = this[k][last];
    }
  }

  clear() {
    this.n = 0;
  }

  update(dt, t) {
    for (let i = this.n - 1; i >= 0; i--) {
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) {
        this._kill(i);
        continue;
      }
      const d = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= d;
      this.vy[i] = this.vy[i] * d + this.g[i] * dt;
      this.px[i] += (this.vx[i] + Math.sin(t * 2.2 + i) * this.sway[i]) * dt;
      this.py[i] += this.vy[i] * dt;
      this.rot[i] += this.vr[i] * dt;
      this.flut[i] += this.vflut[i] * dt;
    }
    // Fyll GPU-buffertar
    const P = this.pools;
    let nN = 0;
    let nA = 0;
    const write = (pool, idx, x, y, rot, size, r, g, b, a, slot, fl) => {
      pool.iPos.array.set([x, y, rot, size], idx * 4);
      pool.iColor.array.set([r, g, b, a], idx * 4);
      pool.iMisc.array[idx * 2] = slot;
      pool.iMisc.array[idx * 2 + 1] = fl;
    };
    for (let i = 0; i < this.n; i++) {
      const k = this.life[i] / this.max[i];
      let size = this.size[i] + (this.size1[i] - this.size[i]) * k;
      if (this.pop[i]) size *= k < 0.15 ? 1.4 * Math.sin((k / 0.15) * Math.PI * 0.5) : 1 + 0.4 * Math.max(0, 1 - (k - 0.15) * 6);
      const fadeIn = Math.min(this.life[i] / 0.08, 1);
      const fadeOut = Math.min((1 - k) / 0.3, 1);
      const a = this.alpha[i] * fadeIn * fadeOut;
      const pool = this.add[i] ? P.add : P.normal;
      const idx = this.add[i] ? nA++ : nN++;
      write(pool, idx, this.px[i], this.py[i], this.rot[i], size, this.r[i], this.gg[i], this.b[i], a, this.slot[i], this.flut[i]);
    }
    for (const [slot, x, y, rot, size, a, additive] of this.immediate) {
      if (nN >= MAX || nA >= MAX) break;
      const pool = additive ? P.add : P.normal;
      const idx = additive ? nA++ : nN++;
      write(pool, idx, x, y, rot, size, 1, 1, 1, a, slot, 0);
    }
    this.immediate.length = 0;
    for (const [pool, count] of [
      [P.normal, nN],
      [P.add, nA],
    ]) {
      pool.geo.instanceCount = count;
      pool.iPos.needsUpdate = pool.iColor.needsUpdate = pool.iMisc.needsUpdate = true;
      pool.iPos.clearUpdateRanges();
      pool.iPos.addUpdateRange(0, count * 4);
      pool.iColor.clearUpdateRanges();
      pool.iColor.addUpdateRange(0, count * 4);
      pool.iMisc.clearUpdateRanges();
      pool.iMisc.addUpdateRange(0, count * 2);
    }
  }
}
