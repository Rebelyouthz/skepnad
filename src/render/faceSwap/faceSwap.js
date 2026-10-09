// AI-ansikte: lägger ett fotorealistiskt (påhittat) ansikte över ditt i realtid.
// Ansiktsbildens 468 punkter trianguleras; varje bildruta flyttas hörnen till
// dina spårade punkter. Ögon- och munöppningar lämnas tomma så att dina riktiga
// ögon och mun syns (naturliga blinkningar och prat). Hudton och ljus/skuggor
// från kameran förs över så att ansiktet smälter in i ditt rum.
import * as THREE from 'three';
import { delaunay } from './delaunay.js';
import { COLOR } from '../glsl.js';

export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const EYE_L = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const EYE_R = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
const LIPS_IN = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
/** Punkter där hudtonen mäts (kinder, panna, hakan, näsryggen). */
export const SKIN_POINTS = [50, 280, 151, 9, 199, 123, 352, 205, 425];
const N = 468;

const VERT = /* glsl */ `
attribute float aAlpha;
attribute vec2 aVid;
varying vec2 vUv;
varying vec2 vVid;
varying float vA;
void main() {
  vUv = uv;
  vVid = aVid;
  vA = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D tFace;
uniform sampler2D tVideo;
uniform vec3 uGain;
uniform float uShade;
uniform float uOpacity;
uniform vec2 uRad;
varying vec2 vUv;
varying vec2 vVid;
varying float vA;
${COLOR}
vec3 vid(vec2 p) { return srgbToLinear(texture2D(tVideo, p).rgb); }
void main() {
  vec3 face = texture2D(tFace, vUv).rgb;
  // Ljus/skuggor från kameran: lokal ljushet i kamerabilden / i AI-bilden
  vec2 r = uRad;
  float live = luma(vid(vVid)) * 0.5;
  live += luma(vid(vVid + vec2(r.x, 0.0)));
  live += luma(vid(vVid - vec2(r.x, 0.0)));
  live += luma(vid(vVid + vec2(0.0, r.y)));
  live += luma(vid(vVid - vec2(0.0, r.y)));
  live += luma(vid(vVid + r * 0.7));
  live += luma(vid(vVid - r * 0.7));
  live += luma(vid(vVid + vec2(r.x, -r.y) * 0.7));
  live += luma(vid(vVid + vec2(-r.x, r.y) * 0.7));
  live += luma(vid(vVid + r * 0.45)) + luma(vid(vVid - r * 0.45));
  live /= 10.5;
  // Samma suddighet i AI-bilden (explicit mipnivå ≈ 7 % av ansiktsbredden)
  float base = luma(textureLod(tFace, vUv, 5.0).rgb * uGain) + 0.003;
  float shade = clamp((live + 0.003) / base, 0.6, 1.5);
  vec3 col = face * uGain * mix(1.0, shade, uShade);
  float a = vA * uOpacity;
  gl_FragColor = vec4(col * a, a);
}`;

export class FaceSwapLayer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1280, 720, 0, -10, 10);
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3);
    this.vid = new Float32Array(N * 2);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aVid', new THREE.BufferAttribute(this.vid, 2).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = {
      tFace: { value: null },
      tVideo: { value: null },
      uGain: { value: new THREE.Vector3(1, 1, 1) },
      uShade: { value: 0.75 },
      uOpacity: { value: 1 },
      uRad: { value: new THREE.Vector2(0.03, 0.05) },
    };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      premultipliedAlpha: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.current = null;
    this.loading = null;
    this.gain = new THREE.Vector3(1, 1, 1);
    this.appear = 0;
  }

  setSize(w, h) {
    this.camera.right = w;
    this.camera.top = h;
    this.camera.updateProjectionMatrix();
  }

  /** def: { id, url, lm: [[x,y],…468], skin: [r,g,b] (linjärt) } */
  async load(def) {
    if (this.current?.id === def?.id) return;
    if (!def) {
      this.current = null;
      return;
    }
    const token = (this.loading = def.id);
    const tex = await new THREE.TextureLoader().loadAsync(def.url);
    if (this.loading !== token) return tex.dispose();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    this.uniforms.tFace.value?.dispose();
    this.uniforms.tFace.value = tex;
    const pts = def.lm.slice(0, N);
    // Triangulera AI-ansiktet och hoppa över ögon- och munöppningarna
    const holes = [new Set(EYE_L), new Set(EYE_R), new Set(LIPS_IN)];
    const all = delaunay(pts);
    const idx = [];
    for (let i = 0; i < all.length; i += 3) {
      const t = [all[i], all[i + 1], all[i + 2]];
      if (holes.some((h) => t.every((v) => h.has(v)))) continue;
      idx.push(...t);
    }
    // Bara trianglar innanför ansiktets kontur
    const oval = FACE_OVAL.map((i) => pts[i]);
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = oval.length - 1; i < oval.length; j = i++) {
        const [xi, yi] = oval[i];
        const [xj, yj] = oval[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const ovalSet = new Set(FACE_OVAL);
    const final = [];
    for (let i = 0; i < idx.length; i += 3) {
      const t = [idx[i], idx[i + 1], idx[i + 2]];
      const cxp = (pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3;
      const cyp = (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3;
      if (t.every((v) => ovalSet.has(v)) && !inside(cxp, cyp)) continue;
      if (!inside(cxp, cyp)) continue;
      final.push(...t);
    }
    // UV och mjuk kant: alfa 0 på konturen, 1 en bit in i ansiktet
    const uv = new Float32Array(N * 2);
    const alpha = new Float32Array(N);
    const w = Math.hypot(pts[454][0] - pts[234][0], pts[454][1] - pts[234][1]);
    const distToOval = (x, y) => {
      let m = Infinity;
      for (let i = 0; i < oval.length; i++) {
        const [ax, ay] = oval[i];
        const [bx, by] = oval[(i + 1) % oval.length];
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
        m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy));
      }
      return m;
    };
    const ring = new Set([...EYE_L, ...EYE_R, ...LIPS_IN]);
    for (let i = 0; i < N; i++) {
      uv[i * 2] = pts[i][0];
      uv[i * 2 + 1] = 1 - pts[i][1];
      const d = ovalSet.has(i) ? 0 : distToOval(pts[i][0], pts[i][1]) / w;
      let a = Math.min(1, Math.max(0, d / 0.09));
      a = a * a * (3 - 2 * a);
      if (ring.has(i)) a *= 0.9;
      alpha[i] = a;
    }
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    this.geo.setIndex(final);
    this.targetSkin = new THREE.Vector3(...(def.skin || [0.5, 0.38, 0.32]));
    this.current = def;
    this.appear = 0;
  }

  /** Mät hudtonen i kamerabilden (litet canvas från spåraren). */
  measureSkin(canvas, lm) {
    if (!canvas || !lm) return;
    const g = canvas._ctx ?? canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    let r = 0;
    let gg = 0;
    let b = 0;
    let n = 0;
    const lin = (v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    for (const i of SKIN_POINTS) {
      x0 = Math.min(x0, lm[i * 3] * w);
      x1 = Math.max(x1, lm[i * 3] * w);
      y0 = Math.min(y0, lm[i * 3 + 1] * h);
      y1 = Math.max(y1, lm[i * 3 + 1] * h);
    }
    x0 = Math.max(0, Math.floor(x0) - 3);
    y0 = Math.max(0, Math.floor(y0) - 3);
    const bw = Math.min(w, Math.ceil(x1) + 4) - x0;
    const bh = Math.min(h, Math.ceil(y1) + 4) - y0;
    if (bw < 6 || bh < 6) return;
    const d = g.getImageData(x0, y0, bw, bh).data;
    for (const i of SKIN_POINTS) {
      const cx = Math.round(lm[i * 3] * w) - x0;
      const cy = Math.round(lm[i * 3 + 1] * h) - y0;
      for (let yy = cy - 2; yy <= cy + 2; yy++) {
        for (let xx = cx - 2; xx <= cx + 2; xx++) {
          if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue;
          const k = (yy * bw + xx) * 4;
          r += lin(d[k]);
          gg += lin(d[k + 1]);
          b += lin(d[k + 2]);
          n++;
        }
      }
    }
    if (!n || !this.targetSkin) return;
    const live = new THREE.Vector3(r / n, gg / n, b / n);
    const t = this.targetSkin;
    const want = new THREE.Vector3(live.x / Math.max(t.x, 0.01), live.y / Math.max(t.y, 0.01), live.z / Math.max(t.z, 0.01));
    // Behåll AI-ansiktets egen hudton (annars ser alla ut som du): ljusstyrkan
    // matchas till 60 %, färgtonen bara till 30 %
    const avg = (want.x + want.y + want.z) / 3;
    const lum = 1 + (avg - 1) * 0.6;
    want.set(lum + (want.x - avg) * 0.3, lum + (want.y - avg) * 0.3, lum + (want.z - avg) * 0.3);
    want.clampScalar(0.45, 2.2);
    this.gain.lerp(want, 0.25);
  }

  /** Flytta hörnen till dina spårade punkter. Returnerar false om inget ska ritas. */
  update(face, view, W, H, { dt = 1 / 30, opacity = 1, shade = 0.75 } = {}) {
    if (!this.current || !face?.present) {
      this.appear = Math.max(0, this.appear - dt * 4);
      return false;
    }
    this.appear = Math.min(1, this.appear + dt * 3);
    const lm = face.lm;
    for (let i = 0; i < N; i++) {
      const vx = lm[i * 3];
      const vy = lm[i * 3 + 1];
      const p = view.videoToScreen(vx, vy);
      this.pos[i * 3] = p.x * W;
      this.pos[i * 3 + 1] = (1 - p.y) * H;
      this.pos[i * 3 + 2] = 0;
      this.vid[i * 2] = vx;
      this.vid[i * 2 + 1] = 1 - vy;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aVid.needsUpdate = true;
    this.uniforms.uGain.value.copy(this.gain);
    this.uniforms.uOpacity.value = opacity * this.appear;
    this.uniforms.uShade.value = shade;
    // Suddradie i videons uv: ~7 % av ansiktets bredd, oavsett hur nära kameran du är
    const fw = Math.hypot(lm[454 * 3] - lm[234 * 3], (lm[454 * 3 + 1] - lm[234 * 3 + 1]) * (face.videoH / face.videoW || 0.5625));
    this.uniforms.uRad.value.set(fw * 0.07, (fw * 0.07 * (face.videoW || 16)) / (face.videoH || 9));
    return true;
  }

  /** Glöm att ansiktet syntes, så att det tonar in mjukt nästa gång det slås på. */
  hide() {
    this.appear = 0;
  }

  render(renderer, target, videoTex) {
    this.uniforms.tVideo.value = videoTex;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }
}
