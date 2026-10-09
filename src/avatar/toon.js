// Tecknade människor: ett parametriskt huvud + frisyr, skägg och kläder.
// Arketyper (kungen, presidenten, rockstjärnan…) är bara olika inställningar.
// Inga verkliga personer – alla är påhittade figurer.
import * as THREE from 'three';
import { Critter } from './critters.js';
import { MATS, ball, tube, shade, tint } from './parts.js';
import { canvasTexture } from '../render/ar/geometry.js';

const HC = [0, 0.68, 0]; // huvudets mitt
const HS = [0.92, 1.06, 0.94]; // huvudets form

// ---------------------------------------------------------------- Frisyrer
function cap(hairMat, theta = 0.52, tilt = -0.38, grow = 1.04) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.6 * grow, 48, 24, 0, Math.PI * 2, 0, Math.PI * theta), hairMat);
  m.position.set(...HC);
  m.scale.set(...HS);
  m.rotation.x = tilt;
  return m;
}

const HAIR = {
  none: () => [],
  short: (m) => [cap(m, 0.5, -0.42)],
  buzz: (m) => [cap(m, 0.48, -0.45, 1.015)],
  sidepart: (m) => {
    const swoop = ball(0.2, m, [0.1, 1.12, 0.32], [1.45, 0.42, 0.7], 28);
    swoop.rotation.set(-0.35, 0, -0.18);
    return [cap(m, 0.52, -0.38), swoop];
  },
  slick: (m) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), m);
    peak.position.set(0, 1.07, 0.47);
    peak.rotation.set(Math.PI + 0.5, Math.PI / 4, 0);
    peak.scale.z = 0.4;
    return [cap(m, 0.5, -0.28), peak];
  },
  pompadour: (m) => {
    const front = ball(0.3, m, [0, 1.14, 0.22], [1.15, 0.72, 1.1], 32);
    front.rotation.x = -0.35;
    return [cap(m, 0.5, -0.35), front];
  },
  long: (m) => {
    const out = [cap(m, 0.55, -0.4), ball(0.6, m, [0, 0.5, -0.2], [1.02, 1.3, 0.62], 40)];
    for (const s of [-1, 1]) out.push(ball(0.2, m, [s * 0.5, 0.42, 0.04], [0.55, 1.7, 0.75], 28));
    return out;
  },
  messy: (m) => {
    const out = [cap(m, 0.52, -0.4)];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const t = tube([[0, 0, 0], [Math.sin(a) * 0.06, 0.1, Math.cos(a) * 0.06], [Math.sin(a) * 0.16, 0.14, Math.cos(a) * 0.14]], 0.07, 0.01, m);
      t.position.set(Math.sin(a) * 0.35, 1.18 - Math.abs(Math.cos(a)) * 0.05, Math.cos(a) * 0.25 - 0.05);
      out.push(t);
    }
    return out;
  },
  bun: (m) => [cap(m, 0.52, -0.33), ball(0.21, m, [0, 1.3, -0.22], [1, 0.9, 1], 28)],
  bob: (m) => {
    const out = [cap(m, 0.55, -0.3), ball(0.42, m, [0, 1.02, 0.26], [1.12, 0.42, 0.72], 32)];
    for (const s of [-1, 1]) out.push(ball(0.25, m, [s * 0.46, 0.6, 0.06], [0.62, 1.15, 0.95], 28));
    return out;
  },
  afro: (m) => [ball(0.78, m, [0, 1.06, -0.3], [1.2, 0.92, 1], 40)],
  rainbowAfro: () => {
    const cols = ['#ff3b5c', '#ffb020', '#ffe94d', '#3ddc84', '#2fa8ff', '#9b5cff'];
    const out = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 * 2.3;
      const y = 1.0 + Math.sin(i * 1.7) * 0.32;
      out.push(ball(0.26, MATS.fur(cols[i % cols.length], 0.4), [Math.cos(a) * 0.62, y, Math.sin(a) * 0.5 - 0.25], [1, 1, 1], 18));
    }
    return out;
  },
  spiky: (m) => {
    const out = [cap(m, 0.5, -0.4)];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const up = 0.55 + (i % 2) * 0.15;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 8), m);
      const dir = new THREE.Vector3(Math.sin(a) * 0.55, up, Math.cos(a) * 0.45 - 0.25).normalize();
      c.position.set(dir.x * 0.6, 0.68 + dir.y * 0.62, dir.z * 0.6);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      out.push(c);
    }
    return out;
  },
  baldSides: (m) => [-1, 1].map((s) => ball(0.17, m, [s * 0.5, 0.8, -0.12], [0.6, 0.85, 1.1], 24)),
};

// ---------------------------------------------------------------- Skägg
function mustache(m, curl = 0) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(tube([[0, 0.5, 0.585], [s * 0.1, 0.49, 0.57], [s * 0.17, 0.46, 0.53], [s * 0.21, 0.44 + curl, 0.49]], 0.034, 0.012, m));
  return g;
}

const BEARD = {
  none: () => [],
  mustache: (m) => [mustache(m, 0.04)],
  stubble: (hair) => {
    const mat = new THREE.MeshStandardMaterial({ color: hair, transparent: true, opacity: 0.32, roughness: 1, depthWrite: false });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.49, 40, 20, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), mat);
    s.position.set(0, 0.46, 0.065);
    s.scale.set(1.03, 0.86, 1.02);
    return [s];
  },
  goatee: (m) => [ball(0.09, m, [0, 0.31, 0.5], [1, 1.3, 0.8], 20), mustache(m)],
  full: (m) => {
    const out = [ball(0.2, m, [0, 0.27, 0.42], [1.3, 0.85, 0.75], 28), mustache(m)];
    for (const s of [-1, 1]) out.push(ball(0.22, m, [s * 0.32, 0.4, 0.25], [0.75, 1.15, 0.95], 28));
    return out;
  },
  long: (m) => {
    const out = BEARD.full(m);
    for (let i = 0; i < 4; i++) out.push(ball(0.2 - i * 0.03, m, [0, 0.12 - i * 0.16, 0.42 - i * 0.03], [1.2, 1, 0.75], 24));
    return out;
  },
  braids: (m) => {
    const out = BEARD.full(m);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) out.push(ball(0.05, m, [s * 0.1, 0.12 - i * 0.09, 0.45], [1, 1.2, 1], 12));
      out.push(ball(0.03, MATS.metal(0xffc444), [s * 0.1, -0.24, 0.45], [1.3, 0.8, 1.3], 10));
    }
    return out;
  },
};

// ---------------------------------------------------------------- Kläder
function stripes(a, b, n = 8, vertical = false) {
  return canvasTexture(256, 256, (g, w, h) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? b : a;
      if (vertical) g.fillRect((i * w) / n, 0, w / n + 1, h);
      else g.fillRect(0, (i * h) / n, w, h / n + 1);
    }
  });
}

function polka(bg, dots) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        g.fillStyle = dots[(x + y) % dots.length];
        g.beginPath();
        g.arc(x * 52 + (y % 2) * 26 + 12, y * 52 + 12, 11, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

function baseBody(body, mat, skin, { arms = true } = {}) {
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.32, 24), skin);
  neck.position.y = 0.12;
  body.add(neck);
  const t = ball(0.62, mat, [0, -0.6, -0.02], [1.16, 0.82, 0.72], 48);
  body.add(t);
  if (arms) {
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 6, 16), mat);
      a.position.set(s * 0.72, -0.72, 0.0);
      a.rotation.z = s * 0.18;
      body.add(a);
    }
  }
  return t;
}

function vNeck(body, mat) {
  const v = ball(0.3, mat, [0, -0.2, 0.3], [0.5, 0.95, 0.42], 24);
  body.add(v);
  return v;
}

function lapels(body, mat) {
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.035), mat);
    l.position.set(s * 0.12, -0.27, 0.42);
    l.rotation.set(-0.3, 0, s * 0.38);
    body.add(l);
  }
}

function tie(body, mat) {
  body.add(ball(0.045, mat, [0, -0.08, 0.41], [1.2, 1, 0.8], 14));
  const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.44, 4), mat);
  t.position.set(0, -0.33, 0.43);
  t.rotation.set(-0.25, Math.PI / 4, 0);
  t.scale.z = 0.3;
  body.add(t);
}

function bowTie(body, mat) {
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 16), mat);
    w.rotation.z = (s * Math.PI) / 2;
    w.position.set(s * 0.065, -0.07, 0.41);
    body.add(w);
  }
  body.add(ball(0.03, mat, [0, -0.07, 0.42], [1, 1, 1], 10));
}

const OUTFIT = {
  suit(body, c, skin) {
    const jacket = MATS.cloth(c.primary);
    baseBody(body, jacket, skin);
    vNeck(body, MATS.cloth('#f7f7fa'));
    lapels(body, MATS.satin(shade(c.primary, 0.25)));
    tie(body, MATS.satin(c.accent));
    body.add(ball(0.025, MATS.metal(0xffc444), [0.21, -0.2, 0.45], [1.3, 1, 0.6], 10));
  },
  tux(body, c, skin) {
    baseBody(body, MATS.cloth(c.primary), skin);
    vNeck(body, MATS.cloth('#ffffff'));
    lapels(body, MATS.satin(shade(c.primary, 0.1)));
    bowTie(body, MATS.satin(c.accent));
    for (let i = 0; i < 3; i++) body.add(ball(0.018, MATS.gloss(0x111111), [0, -0.2 - i * 0.09, 0.44], [1, 1, 0.6], 8));
  },
  royal(body, c, skin) {
    baseBody(body, MATS.satin(c.primary), skin);
    const ermine = MATS.fur('#fbfaf6', 0.9);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 16, 64), ermine);
    collar.rotation.x = Math.PI / 2 + 0.12;
    collar.position.set(0, -0.16, 0.02);
    collar.scale.set(1.08, 1, 0.45);
    body.add(collar);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      body.add(ball(0.028, MATS.gloss(0x111111), [Math.sin(a) * 0.58, -0.12 - Math.cos(a) * 0.06, Math.cos(a) * 0.5 + 0.02], [0.6, 1.5, 0.6], 8));
    }
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 8, 48), MATS.metal(c.accent));
    chain.rotation.x = Math.PI / 2 + 0.6;
    chain.position.set(0, -0.32, 0.2);
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24), MATS.metal(c.accent));
    medal.rotation.x = Math.PI / 2 - 0.3;
    medal.position.set(0, -0.5, 0.44);
    const gem = ball(0.03, MATS.glow(0xff2d55, 0.8), [0, -0.5, 0.46], [1, 1, 0.6], 10);
    body.add(chain, medal, gem);
  },
  dress(body, c, skin) {
    baseBody(body, MATS.satin(c.primary), skin, { arms: false });
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 6, 16), skin);
      a.position.set(s * 0.7, -0.72, 0.0);
      a.rotation.z = s * 0.15;
      body.add(a);
      body.add(ball(0.17, MATS.satin(tint(c.primary, 0.2)), [s * 0.62, -0.36, 0], [1.1, 0.8, 1], 20));
    }
    const pearl = MATS.gloss(0xfffaf0, 0.12);
    for (let i = 0; i < 16; i++) {
      const a = ((i - 7.5) / 16) * Math.PI * 1.25;
      body.add(ball(0.026, pearl, [Math.sin(a) * 0.23, -0.04 - Math.cos(a) * 0.08, Math.cos(a) * 0.2 + 0.03], [1, 1, 1], 10));
    }
  },
  leather(body, c, skin) {
    baseBody(body, MATS.gloss(c.primary, 0.32), skin);
    vNeck(body, MATS.cloth('#e8e8ee'));
    lapels(body, MATS.gloss(shade(c.primary, 0.2), 0.3));
    for (const s of [-1, 1]) body.add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.012), MATS.metal(0xd8dde6)).translateX(s * 0.2).translateY(-0.5).translateZ(0.42));
    body.add(ball(0.03, MATS.metal(c.accent), [-0.26, -0.22, 0.44], [1, 1, 0.6], 10));
  },
  hoodie(body, c, skin) {
    baseBody(body, MATS.cloth(c.primary), skin);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.14, 14, 40), MATS.cloth(shade(c.primary, 0.15)));
    hood.rotation.x = Math.PI / 2 + 0.3;
    hood.position.set(0, -0.06, -0.08);
    body.add(hood);
    for (const s of [-1, 1]) body.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), MATS.cloth(c.accent)).translateX(s * 0.09).translateY(-0.3).translateZ(0.42));
    const print = new THREE.Mesh(new THREE.CircleGeometry(0.11, 6), MATS.glow(c.accent, 1.6));
    print.position.set(0, -0.48, 0.45);
    body.add(print);
  },
  tshirt(body, c, skin) {
    baseBody(body, MATS.cloth(c.primary), skin, { arms: false });
    for (const s of [-1, 1]) {
      body.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 6, 16), skin).translateX(s * 0.72).translateY(-0.74));
      body.add(ball(0.17, MATS.cloth(c.primary), [s * 0.66, -0.42, 0], [1, 0.9, 1], 18));
    }
    const bolt = new THREE.Shape();
    bolt.moveTo(0.03, 0.12);
    bolt.lineTo(-0.06, -0.01);
    bolt.lineTo(0.0, -0.01);
    bolt.lineTo(-0.03, -0.12);
    bolt.lineTo(0.07, 0.02);
    bolt.lineTo(0.01, 0.02);
    bolt.lineTo(0.03, 0.12);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(bolt), MATS.glow(c.accent, 2));
    m.scale.setScalar(1.3);
    m.position.set(0, -0.45, 0.455);
    body.add(m);
  },
  spacesuit(body, c, skin) {
    baseBody(body, MATS.cloth('#f2f4f8'), skin);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 12, 40), MATS.metal(0xb8c2d0));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.02;
    body.add(ring);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.05), MATS.gloss(0x22262f, 0.3));
    panel.position.set(0, -0.42, 0.43);
    body.add(panel);
    [0xff2d55, 0x39ff88, 0x00f0ff].forEach((col, i) => body.add(ball(0.025, MATS.glow(col, 2.5), [-0.09 + i * 0.09, -0.42, 0.46], [1, 1, 0.5], 10)));
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), MATS.cloth(c.accent));
    patch.position.set(0.3, -0.28, 0.4);
    patch.rotation.y = 0.5;
    body.add(patch);
  },
  robe(body, c, skin) {
    baseBody(body, MATS.satin(c.primary), skin);
    const star = MATS.glow(c.accent, 1.2);
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), star);
      const a = i * 1.9 - 2;
      s.position.set(Math.sin(a) * 0.55, -0.35 - (i % 3) * 0.13, Math.cos(a) * 0.4);
      body.add(s);
    }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 8, 48), MATS.metal(0xd9a640, 0.4));
    rope.rotation.x = Math.PI / 2;
    rope.position.y = -0.82;
    body.add(rope);
  },
  hero(body, c, skin) {
    baseBody(body, MATS.gloss(c.primary, 0.35), skin);
    const s = new THREE.Shape();
    s.moveTo(0, 0.12);
    s.lineTo(0.16, 0);
    s.lineTo(0, -0.13);
    s.lineTo(-0.16, 0);
    s.lineTo(0, 0.12);
    const em = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }), MATS.gloss(c.accent, 0.25));
    em.position.set(0, -0.36, 0.42);
    body.add(em);
    const capeMat = MATS.satin(c.accent);
    capeMat.side = THREE.DoubleSide;
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.0, 1.3, 32, 1, true, Math.PI / 2, Math.PI), capeMat);
    cape.position.set(0, -0.68, -0.08);
    body.add(cape);
    this.cape = cape;
  },
  fur(body, c, skin) {
    baseBody(body, MATS.cloth(c.primary), skin);
    const fur = MATS.fur('#8c8378', 0.4);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      body.add(ball(0.13, fur, [Math.sin(a) * 0.5, -0.14 + Math.sin(i * 3.1) * 0.03, Math.cos(a) * 0.42], [1, 0.8, 1], 14));
    }
    body.add(ball(0.06, MATS.metal(c.accent), [0, -0.42, 0.44], [1, 1, 0.5], 14));
  },
  torn(body, c, skin) {
    baseBody(body, MATS.cloth(c.primary), skin);
    const dark = MATS.matte(shade(c.primary, 0.55), 0.9);
    [[0.18, -0.38], [-0.24, -0.52], [0.05, -0.68], [-0.4, -0.3]].forEach(([x, y]) => body.add(ball(0.07, dark, [x, y, 0.42], [1.4, 0.8, 0.3], 12)));
    for (let i = 0; i < 6; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), MATS.cloth(c.primary));
      tooth.position.set(-0.3 + i * 0.12, -0.08, 0.35);
      tooth.rotation.x = Math.PI;
      body.add(tooth);
    }
  },
  vampire(body, c, skin) {
    baseBody(body, MATS.cloth('#121016'), skin);
    vNeck(body, MATS.cloth('#f2eef6'));
    lapels(body, MATS.satin('#1e1a24'));
    const collarShape = new THREE.Shape();
    collarShape.moveTo(0, 0);
    collarShape.lineTo(0.45, 0.05);
    collarShape.lineTo(0.38, 0.62);
    collarShape.quadraticCurveTo(0.2, 0.4, 0, 0.3);
    for (const s of [-1, 1]) {
      const outer = new THREE.Mesh(new THREE.ShapeGeometry(collarShape), new THREE.MeshPhysicalMaterial({ color: 0x0d0b10, roughness: 0.5, side: THREE.FrontSide }));
      const inner = new THREE.Mesh(new THREE.ShapeGeometry(collarShape), MATS.satin(c.accent));
      inner.material.side = THREE.BackSide;
      for (const m of [outer, inner]) {
        m.position.set(s * 0.12, -0.12, -0.18);
        m.rotation.y = s * 0.5 + (s < 0 ? Math.PI : 0);
        m.rotation.x = -0.15;
        body.add(m);
      }
    }
    body.add(ball(0.045, MATS.glow(c.accent, 1), [0, -0.1, 0.42], [1, 1.2, 0.6], 12));
  },
  clown(body, c, skin) {
    const tex = polka(c.primary, ['#ffe94d', '#2fa8ff', '#3ddc84']);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    baseBody(body, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.7, sheen: 0.5 }), skin);
    const ruffle = MATS.satin('#ffffff');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = ball(0.11, ruffle, [Math.sin(a) * 0.42, -0.08, Math.cos(a) * 0.36], [1, 0.45, 1], 14);
      r.rotation.y = a;
      body.add(r);
    }
    for (let i = 0; i < 3; i++) body.add(ball(0.05, MATS.fur(['#ff3b5c', '#2fa8ff', '#3ddc84'][i]), [0, -0.3 - i * 0.14, 0.44], [1, 1, 1], 14));
  },
  santa(body, c, skin) {
    baseBody(body, MATS.fur(c.primary, 0.3), skin);
    const white = MATS.fur('#fbfaf6', 0.9);
    body.add(ball(0.08, white, [0, -0.45, 0.4], [1, 4, 0.6], 16));
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 48), MATS.gloss(0x111111, 0.3));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = -0.82;
    belt.scale.set(1.12, 0.7, 1);
    body.add(belt);
  },
  chef(body, c, skin) {
    baseBody(body, MATS.cloth('#fbfbfd'), skin);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) body.add(ball(0.025, MATS.gloss(0x111111), [s * 0.12, -0.28 - i * 0.12, 0.44], [1, 1, 0.5], 10));
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 32), MATS.cloth(c.accent));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = -0.02;
    body.add(scarf);
    body.add(ball(0.06, MATS.cloth(c.accent), [0.05, -0.1, 0.24], [1, 1.2, 0.6], 12));
  },
  pirate(body, c, skin) {
    const tex = stripes('#f4f1ea', c.accent, 10);
    baseBody(body, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.8, sheen: 0.4 }), skin);
    for (const s of [-1, 1]) {
      const v = ball(0.3, MATS.cloth(c.primary), [s * 0.36, -0.55, 0.22], [0.6, 1.05, 0.55], 24);
      body.add(v);
    }
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 48), MATS.satin('#c8102e'));
    sash.rotation.x = Math.PI / 2;
    sash.position.y = -0.82;
    sash.scale.set(1.12, 0.72, 1);
    body.add(sash);
  },
  pilot(body, c, skin) {
    baseBody(body, MATS.cloth('#f7f8fb'), skin);
    tie(body, MATS.satin('#121522'));
    for (const s of [-1, 1]) {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.14), MATS.cloth('#121522'));
      ep.position.set(s * 0.5, -0.22, 0);
      ep.rotation.z = -s * 0.25;
      body.add(ep);
      for (let i = 0; i < 3; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 0.145), MATS.metal(c.accent));
        st.position.set(s * (0.44 + i * 0.05), -0.2 + i * 0.012 * -s * -1, 0);
        st.rotation.z = -s * 0.25;
        body.add(st);
      }
    }
    for (const s of [-1, 1]) body.add(ball(0.06, MATS.metal(c.accent), [-0.22 + s * 0.06, -0.3, 0.44], [1.4, 0.4, 0.3], 10));
  },
  sparkle(body, c, skin) {
    const m = new THREE.MeshPhysicalMaterial({ color: c.primary, metalness: 0.65, roughness: 0.25, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 });
    baseBody(body, m, skin);
    vNeck(body, MATS.cloth('#16131c'));
    const glitter = MATS.glow('#ffffff', 2);
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4;
      body.add(ball(0.012, glitter, [Math.sin(a) * 0.6, -0.3 - (i % 5) * 0.08, Math.cos(a) * 0.42], [1, 1, 1], 6));
    }
  },
  ninja(body, c, skin) {
    baseBody(body, MATS.cloth(c.primary), skin);
    const lapel = MATS.cloth(tint(c.primary, 0.12));
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.04), lapel);
      l.position.set(s * 0.08, -0.3, 0.42);
      l.rotation.set(-0.3, 0, s * 0.45);
      body.add(l);
    }
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 48), MATS.cloth(c.accent));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = -0.82;
    belt.scale.set(1.12, 0.72, 1);
    body.add(belt);
  },
  cowboy(body, c, skin) {
    const tex = stripes('#3a6ea5', '#2c5687', 16, true);
    baseBody(body, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.85 }), skin);
    for (const s of [-1, 1]) body.add(ball(0.3, MATS.cloth(c.primary), [s * 0.36, -0.55, 0.22], [0.6, 1.05, 0.55], 24));
    const scarf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 3), MATS.cloth(c.accent));
    scarf.position.set(0, -0.12, 0.34);
    scarf.rotation.set(Math.PI, 0, 0);
    scarf.scale.z = 0.4;
    body.add(scarf);
    const sheriff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 6), MATS.metal(0xffc444));
    sheriff.rotation.x = Math.PI / 2;
    sheriff.position.set(-0.3, -0.36, 0.42);
    body.add(sheriff);
  },
};

// ---------------------------------------------------------------- Ansiktsdetaljer
const EXTRAS = {
  fangs(head) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 8), MATS.tooth());
      f.rotation.x = Math.PI;
      f.position.set(s * 0.04, 0.43, 0.565);
      g.add(f);
    }
    head.add(g);
    return (rig) => (g.visible = rig.jaw > 0.06 || rig.smile > 0.5);
  },
  stitches(head) {
    const mat = MATS.matte(0x2a1a22);
    const g = new THREE.Group();
    g.add(tube([[-0.12, 0, 0], [0, 0.02, 0.01], [0.12, 0, 0]], 0.007, 0.007, mat));
    for (let i = 0; i < 4; i++) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.01), mat).translateX(-0.09 + i * 0.06));
    g.position.set(0.2, 1.02, 0.43);
    g.rotation.set(-0.5, 0.3, 0.2);
    head.add(g);
  },
  freckles(head) {
    const mat = MATS.matte(0xc47a4a, 0.8);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) head.add(ball(0.009, mat, [s * (0.2 + (i % 3) * 0.04), 0.6 - Math.floor(i / 3) * 0.04, 0.505], [1, 1, 0.4], 6));
  },
  facepaint(head) {
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), MATS.gloss(0x2f6bff, 0.3));
      d.scale.set(0.6, 1.4, 0.25);
      d.position.set(s * 0.2, 0.62, 0.515);
      head.add(d);
    }
  },
  earrings(head) {
    for (const s of [-1, 1]) head.add(ball(0.032, MATS.gloss(0xfffaf0, 0.12), [s * 0.55, 0.53, 0.0], [1, 1, 1], 12));
  },
  bigNose(head, c) {
    head.add(ball(0.11, MATS.skin(shade(c.skin, 0.06)), [0, 0.6, 0.64], [0.9, 1.1, 1.3], 24));
  },
  micHeadset(head) {
    const black = MATS.gloss(0x16161c, 0.3);
    head.add(tube([[0.55, 0.62, 0.0], [0.5, 0.48, 0.25], [0.32, 0.42, 0.48], [0.15, 0.42, 0.56]], 0.012, 0.012, black));
    head.add(ball(0.03, black, [0.14, 0.42, 0.57], [1.4, 1, 1], 12));
    head.add(ball(0.06, black, [0.56, 0.64, 0], [0.5, 1, 1], 14));
  },
};

// ---------------------------------------------------------------- Figurklass
export class Toon extends Critter {}

function toonClass(spec) {
  const look = spec.look;
  const K = class extends Toon {};
  K.meta = { id: spec.id, name: spec.name, icon: spec.icon, desc: spec.desc, group: spec.group };
  K.defaults = spec.defaults;
  K.spec = {
    build(k, c) {
      const skin = MATS.skin(c.skin);
      const hairMat = new THREE.MeshPhysicalMaterial({ color: c.hair, roughness: 0.62, sheen: 0.7, sheenRoughness: 0.55, sheenColor: new THREE.Color(c.hair).lerp(new THREE.Color('#ffffff'), 0.18), clearcoat: 0.15, clearcoatRoughness: 0.6 });
      this.head.add(ball(0.6, skin, HC, HS, 64));
      this.head.add(ball(0.48, skin, [0, 0.46, 0.06], [1.02, 0.85, 1], 48));
      for (const s of [-1, 1]) {
        this.head.add(ball(0.11, skin, [s * 0.54, 0.66, -0.02], [0.45, 1, 0.75], 20));
        this.head.add(ball(0.06, MATS.skin(shade(c.skin, 0.12)), [s * 0.57, 0.66, 0.0], [0.3, 0.7, 0.5], 12));
      }
      if (!look.extras?.includes('bigNose')) this.head.add(ball(0.065, MATS.skin(shade(c.skin, 0.04)), [0, 0.6, 0.6], [1, 1.15, 1.1], 24));
      k.eyes({ r: 0.085, x: 0.19, y: 0.74, z: 0.5, white: true, iris: look.iris ?? 0x5a3a22, scale: [1, 1.05, 0.6], lid: skin, yaw: 0.2 });
      k.brows({ x: 0.19, y: 0.865, z: 0.535, w: 0.13, r: 0.022, mat: look.hair === 'rainbowAfro' ? MATS.matte(0x2a1a22) : MATS.matte(c.hair, 0.8), angle: look.browAngle ?? 0 });
      const lips = MATS.gloss(look.lips ?? shade(tint(c.skin, 0), 0.32), 0.4);
      k.mouth({ y: 0.44, z: 0.553, w: 0.1, open: 0.16, teeth: true, line: lips, lineR: look.lips ? 0.018 : 0.012 });
      k.blush({ x: 0.33, y: 0.55, z: 0.47, r: 0.07, color: look.blush ?? 0xff7a8a });
      for (const m of HAIR[look.hair ?? 'short'](hairMat)) this.head.add(m);
      for (const m of BEARD[look.beard ?? 'none'](look.beard === 'stubble' ? c.hair : MATS.fur(look.beardColor ?? c.hair, 0.5))) this.head.add(m);
      OUTFIT[look.outfit ?? 'tshirt'].call(this, this.body, c, skin);
      this.extraUpdates = [];
      for (const e of look.extras ?? []) {
        const u = EXTRAS[e]?.(this.head, c);
        if (u) this.extraUpdates.push(u);
      }
      for (const g of look.gear ?? []) this.addGear(g);
      this.headFrac = 0.85;
      this.framing.target.y = 0.42;
      this.setAnchors({ eyeY: 0.74, eyeZ: 0.5, faceScale: 0.62, crownY: 1.1, crownZ: -0.06, crownScale: 0.9 });
    },
    animate(rig, dt, t) {
      for (const u of this.extraUpdates) u(rig);
      if (this.cape) this.cape.rotation.y = Math.sin(t * 1.8) * 0.05 + rig.euler.y * 0.2;
    },
  };
  return K;
}

const SKIN = { light: '#f3cfb3', fair: '#f7d9c4', tan: '#d9a27a', brown: '#a8704a', deep: '#6e4430', pale: '#ece7f2', green: '#9cc48a', white: '#fbf7f2', witch: '#a6cf8b' };

const TOONS = [
  // Kändisar & kungligheter (påhittade arketyper)
  { id: 'king', name: 'Kungen', icon: '🤴', group: 'famous', desc: 'Kunglig majestät med guldkrona, hermelinkappa och ståtligt skägg.', defaults: { primary: '#8e1330', accent: '#ffc444', skin: SKIN.light, hair: '#e6e1d8' }, look: { hair: 'baldSides', beard: 'full', outfit: 'royal', gear: ['crown'], iris: 0x3a6ea5 } },
  { id: 'queen', name: 'Drottningen', icon: '👑', group: 'famous', desc: 'Elegant drottning med tiara, pärlhalsband och silverknut.', defaults: { primary: '#4b1f7a', accent: '#ffc444', skin: SKIN.fair, hair: '#d9d2c8' }, look: { hair: 'bun', outfit: 'royal', gear: ['tiara'], extras: ['earrings'], lips: '#c2185b', iris: 0x3a6ea5 } },
  { id: 'princess', name: 'Prinsessan', icon: '👸', group: 'famous', desc: 'Sagoprinsessa med långt gyllene hår, tiara och rosa klänning.', defaults: { primary: '#ff8fc8', accent: '#ffc444', skin: SKIN.fair, hair: '#f3d27a' }, look: { hair: 'long', outfit: 'dress', gear: ['tiara'], lips: '#ff4f8b', iris: 0x2f8fd6, blush: 0xff6f9f } },
  { id: 'president', name: 'Presidenten', icon: '🏛️', group: 'famous', desc: 'Statsöverhuvud i mörk kostym, röd slips och flaggnål. "Mina landsmän…"', defaults: { primary: '#1b2a4a', accent: '#c8102e', skin: SKIN.light, hair: '#a9a59e' }, look: { hair: 'sidepart', outfit: 'suit', iris: 0x3a6ea5, browAngle: 0.08 } },
  { id: 'rockstar', name: 'Rockstjärnan', icon: '🎸', group: 'famous', desc: 'Läderjacka, långt rufsigt hår, skäggstubb och solglasögon. Rock\'n\'roll!', defaults: { primary: '#16161c', accent: '#ff2bd6', skin: SKIN.tan, hair: '#121014' }, look: { hair: 'long', beard: 'stubble', outfit: 'leather', gear: ['sunglasses'] } },
  { id: 'popstar', name: 'Popstjärnan', icon: '🎤', group: 'famous', desc: 'Glittrande scenjacka, rosa page och headsetmikrofon – redo för arenan.', defaults: { primary: '#b9a3ff', accent: '#ff3fa4', skin: SKIN.brown, hair: '#ff3fa4' }, look: { hair: 'bob', outfit: 'sparkle', extras: ['micHeadset'], lips: '#ff2d7a', iris: 0x6b3a22 } },
  { id: 'moviestar', name: 'Filmstjärnan', icon: '🎬', group: 'famous', desc: 'Smoking, fluga och perfekt frisyr – röda mattan väntar.', defaults: { primary: '#0f0f14', accent: '#c8102e', skin: SKIN.tan, hair: '#2b1b12' }, look: { hair: 'pompadour', beard: 'mustache', outfit: 'tux' } },
  { id: 'dj', name: 'DJ Neon', icon: '🎧', group: 'famous', desc: 'Neonfärgat taggigt hår, lysande t-shirt och RGB-hörlurar.', defaults: { primary: '#121420', accent: '#00f0ff', skin: SKIN.deep, hair: '#00f0ff' }, look: { hair: 'spiky', outfit: 'tshirt', gear: ['headset'], iris: 0x3a2214 } },
  { id: 'anchor', name: 'Nyhetsankaret', icon: '📺', group: 'famous', desc: 'Seriös nyhetsuppläsare i grå kostym. "God kväll och välkomna."', defaults: { primary: '#4a5160', accent: '#2f6bff', skin: SKIN.fair, hair: '#5b3a24' }, look: { hair: 'short', outfit: 'suit' } },
  // Äventyr & yrken
  { id: 'astronaut', name: 'Astronauten', icon: '🧑‍🚀', group: 'people', desc: 'Rymdfarare i vit dräkt med blinkande kontrollpanel och glashjälm.', defaults: { primary: '#f2f4f8', accent: '#2f6bff', skin: SKIN.tan, hair: '#3b2416' }, look: { hair: 'short', outfit: 'spacesuit', gear: ['spaceHelmet'] } },
  { id: 'pirate', name: 'Piraten', icon: '🏴‍☠️', group: 'people', desc: 'Kapten med trekantshatt, ögonlapp, svart skägg och randig tröja. Arrr!', defaults: { primary: '#2a1d14', accent: '#c8102e', skin: SKIN.tan, hair: '#141014' }, look: { hair: 'long', beard: 'full', outfit: 'pirate', gear: ['pirateHat', 'eyePatch'], browAngle: 0.15 } },
  { id: 'wizard', name: 'Trollkarlen', icon: '🧙', group: 'people', desc: 'Uråldrig trollkarl med stjärnhatt, långt vitt skägg och magisk mantel.', defaults: { primary: '#2a2a8f', accent: '#ffd84a', skin: SKIN.light, hair: '#eeeae2' }, look: { hair: 'long', beard: 'long', outfit: 'robe', gear: ['wizardHat'], iris: 0x5a7fa5 } },
  { id: 'hero', name: 'Superhjälten', icon: '🦸', group: 'people', desc: 'Hjälte med mask, emblem på bröstet och fladdrande röd mantel.', defaults: { primary: '#1d4fd8', accent: '#e11d48', skin: SKIN.light, hair: '#141014' }, look: { hair: 'slick', outfit: 'hero', gear: ['heroMask'], browAngle: 0.12 } },
  { id: 'viking', name: 'Vikingen', icon: '⚔️', group: 'people', desc: 'Rödhårig viking med flätat skägg, pälskrage och hornhjälm.', defaults: { primary: '#6b4a2e', accent: '#ffc444', skin: SKIN.fair, hair: '#c4501f' }, look: { hair: 'long', beard: 'braids', outfit: 'fur', gear: ['viking'], iris: 0x3a7fb0, browAngle: 0.1 } },
  { id: 'chef', name: 'Mästerkocken', icon: '👨‍🍳', group: 'people', desc: 'Kock med pösig mössa, mustasch och röd halsduk. Smaklig måltid!', defaults: { primary: '#fbfbfd', accent: '#d61f3c', skin: SKIN.light, hair: '#2b1b12' }, look: { hair: 'short', beard: 'mustache', outfit: 'chef', gear: ['chefHat'] } },
  { id: 'cowboy', name: 'Cowboyen', icon: '🤠', group: 'people', desc: 'Sheriff med cowboyhatt, väst, sheriffstjärna och skäggstubb.', defaults: { primary: '#6b4423', accent: '#c8102e', skin: SKIN.tan, hair: '#5b3a22' }, look: { hair: 'short', beard: 'stubble', outfit: 'cowboy', gear: ['cowboyHat'] } },
  { id: 'pilot', name: 'Piloten', icon: '👨‍✈️', group: 'people', desc: 'Flygkapten med guldvingar, epåletter och pilotglasögon.', defaults: { primary: '#121522', accent: '#ffc444', skin: SKIN.brown, hair: '#1a1210' }, look: { hair: 'short', outfit: 'pilot', gear: ['pilotCap', 'sunglasses'] } },
  { id: 'ninja', name: 'Ninjan', icon: '🥷', group: 'people', desc: 'Tyst och snabb ninja i svart dräkt med ansiktsmask och rött pannband.', defaults: { primary: '#15151c', accent: '#d61f3c', skin: SKIN.tan, hair: '#0d0d10' }, look: { hair: 'short', outfit: 'ninja', gear: ['ninjaMask'], browAngle: 0.2 } },
  { id: 'santa', name: 'Tomten', icon: '🎅', group: 'people', desc: 'God Jul! Röd dräkt, vitt yvigt skägg, tomteluva och rosiga kinder.', defaults: { primary: '#c8102e', accent: '#ffc444', skin: SKIN.light, hair: '#f3f0ea' }, look: { hair: 'short', beard: 'long', outfit: 'santa', gear: ['tomte'], blush: 0xff5a6a, iris: 0x3a6ea5 } },
  // Läskiga & galna
  { id: 'zombie', name: 'Zombien', icon: '🧟', group: 'spooky', desc: 'Grönaktig zombie med stygn, rufsigt hår och trasiga kläder. Hjäääärnor…', defaults: { primary: '#4d6b7a', accent: '#8b1a1a', skin: SKIN.green, hair: '#2a2a22' }, look: { hair: 'messy', outfit: 'torn', extras: ['stitches'], iris: 0xc0c8b0, browAngle: -0.15, blush: 0x6a8a4a } },
  { id: 'vampire', name: 'Vampyren', icon: '🧛', group: 'spooky', desc: 'Blek greve med hög krage, bakåtslickat hår och huggtänder.', defaults: { primary: '#121016', accent: '#b0102a', skin: SKIN.pale, hair: '#0d0b10' }, look: { hair: 'slick', outfit: 'vampire', extras: ['fangs'], iris: 0xc8102e, lips: '#7a1030', browAngle: 0.18 } },
  { id: 'clown', name: 'Clownen', icon: '🤡', group: 'spooky', desc: 'Regnbågsafro, röd näsa, prickig dräkt och krås. Tuta tuta!', defaults: { primary: '#ff3b5c', accent: '#ffe94d', skin: SKIN.white, hair: '#ff3b5c' }, look: { hair: 'rainbowAfro', outfit: 'clown', gear: ['clownNose'], extras: ['facepaint'], lips: '#e0102a' } },
  { id: 'witch', name: 'Häxan', icon: '🧙‍♀️', group: 'spooky', desc: 'Grön häxa med spetsig hatt, krokig näsa och svart mantel. Hihihi!', defaults: { primary: '#1c1424', accent: '#9b5cff', skin: SKIN.witch, hair: '#141018' }, look: { hair: 'long', outfit: 'robe', gear: ['wizardHat'], extras: ['bigNose'], iris: 0x7a3aff, lips: '#3a1a4a' } },
];

export const TOON_AVATARS = TOONS.map(toonClass);
