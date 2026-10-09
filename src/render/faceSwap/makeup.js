// Realistiskt smink: läppstift och rouge som multipliceras in i bilden (som riktig
// färg på huden) i stället för att målas ovanpå. Följer dina spårade punkter.
import * as THREE from 'three';

// Läpparnas yttre och inre kontur – samma ordning (mungipa, underläpp, mungipa, överläpp)
const LIPS_OUT = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_IN = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
const L = LIPS_OUT.length;
// Kinderna: äppelkind, ansiktets kant (för riktning) och storlek
const CHEEKS = [
  { at: 205, edge: 234 },
  { at: 425, edge: 454 },
];

const multiply = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.DstColorFactor,
  blendDst: THREE.ZeroFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
};

const VERT = /* glsl */ `
attribute float aA;
attribute vec2 aL;
varying float vA;
varying vec2 vL;
void main() {
  vA = aA;
  vL = aL;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export class MakeupLayer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1280, 720, 0, -10, 10);

    // Läppar: tre ringar (mjuk utsida → full färg → lite svagare mot munöppningen)
    this.lipPos = new Float32Array(L * 3 * 3);
    const lipA = new Float32Array(L * 3);
    const idx = [];
    for (let i = 0; i < L; i++) {
      lipA[i] = 0;
      lipA[L + i] = 1;
      lipA[2 * L + i] = 0.8;
      const j = (i + 1) % L;
      for (const r of [0, L]) idx.push(r + i, r + j, r + L + j, r + i, r + L + j, r + L + i);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.lipPos, 3).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute('aA', new THREE.BufferAttribute(lipA, 1));
    lg.setAttribute('aL', new THREE.BufferAttribute(new Float32Array(L * 3 * 2), 2));
    lg.setIndex(idx);
    this.lipU = { uColor: { value: new THREE.Color('#a3242f') }, uAmount: { value: 0 } };
    this.lips = new THREE.Mesh(
      lg,
      new THREE.ShaderMaterial({
        ...multiply,
        uniforms: this.lipU,
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uAmount; varying float vA;
          void main() { gl_FragColor = vec4(mix(vec3(1.0), uColor, clamp(vA * uAmount, 0.0, 1.0)), 1.0); }`,
      }),
    );
    this.lips.frustumCulled = false;

    // Rouge: en mjuk oval per kind
    this.blushPos = new Float32Array(8 * 3);
    const bl = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1]);
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(this.blushPos, 3).setUsage(THREE.DynamicDrawUsage));
    bg.setAttribute('aL', new THREE.BufferAttribute(bl, 2));
    bg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(8).fill(1), 1));
    bg.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    this.blushU = { uColor: { value: new THREE.Color('#e0707a') }, uAmount: { value: 0 } };
    this.blush = new THREE.Mesh(
      bg,
      new THREE.ShaderMaterial({
        ...multiply,
        uniforms: this.blushU,
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uAmount; varying vec2 vL;
          void main() {
            float a = exp(-dot(vL, vL) * 2.6) * uAmount;
            gl_FragColor = vec4(mix(vec3(1.0), uColor, clamp(a, 0.0, 1.0)), 1.0);
          }`,
      }),
    );
    this.blush.frustumCulled = false;
    this.scene.add(this.blush, this.lips);
  }

  setSize(w, h) {
    this.camera.right = w;
    this.camera.top = h;
    this.camera.updateProjectionMatrix();
  }

  /** mk: { lips, lipColor, blush, blushColor } (0..1 + hex). Returnerar false om inget ska ritas. */
  update(face, view, W, H, mk) {
    if (!face?.present || !mk || (!(mk.lips > 0.01) && !(mk.blush > 0.01))) return false;
    const lm = face.lm;
    const P = (i) => {
      const p = view.videoToScreen(lm[i * 3], lm[i * 3 + 1]);
      return [p.x * W, (1 - p.y) * H];
    };
    // Läppar
    const out = LIPS_OUT.map(P);
    const inn = LIPS_IN.map(P);
    let cx = 0;
    let cy = 0;
    for (const [x, y] of out) {
      cx += x / L;
      cy += y / L;
    }
    for (let i = 0; i < L; i++) {
      const [ox, oy] = out[i];
      this.lipPos.set([cx + (ox - cx) * 1.07, cy + (oy - cy) * 1.1, 0], i * 3);
      this.lipPos.set([ox, oy, 0], (L + i) * 3);
      this.lipPos.set([...inn[i], 0], (2 * L + i) * 3);
    }
    this.lips.geometry.attributes.position.needsUpdate = true;
    this.lipU.uColor.value.set(mk.lipColor || '#a3242f');
    this.lipU.uAmount.value = (mk.lips ?? 0) * 0.85;
    this.lips.visible = mk.lips > 0.01;

    // Rouge: ovalen lutar med huvudet
    const [lx, ly] = P(234);
    const [rx, ry] = P(454);
    const fw = Math.hypot(rx - lx, ry - ly);
    const ax = [(rx - lx) / fw, (ry - ly) / fw];
    const ay = [-ax[1], ax[0]];
    CHEEKS.forEach((c, k) => {
      const [x, y] = P(c.at);
      const [ex, ey] = P(c.edge);
      // flytta lite ut mot kindbenet
      const mx = x + (ex - x) * 0.25;
      const my = y + (ey - y) * 0.25 + fw * 0.02;
      const rx2 = fw * 0.16;
      const ry2 = fw * 0.11;
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];
      corners.forEach(([u, v], n) => {
        this.blushPos.set([mx + ax[0] * u * rx2 + ay[0] * v * ry2, my + ax[1] * u * rx2 + ay[1] * v * ry2, 0], (k * 4 + n) * 3);
      });
    });
    this.blush.geometry.attributes.position.needsUpdate = true;
    this.blushU.uColor.value.set(mk.blushColor || '#e0707a');
    this.blushU.uAmount.value = (mk.blush ?? 0) * 0.55;
    this.blush.visible = mk.blush > 0.01;
    return true;
  }

  render(renderer, target) {
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }
}
