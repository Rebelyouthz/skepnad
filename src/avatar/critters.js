// Tecknade djur och figurer byggda av ansiktskitet i parts.js.
// Varje figur är en spec: build() bygger geometrin (this = avataren),
// animate() lägger till egna rörelser utöver kitets miner.
import * as THREE from 'three';
import { AvatarBase, Spring } from './base.js';
import { MATS, FaceKit, ball, tube, torso, shade, tint } from './parts.js';
import { ACCESSORY_MAP, HEAD } from '../render/ar/accessories.js';

const ZERO_CTX = { angVel: new THREE.Vector3(), audio: 0 };

export class Critter extends AvatarBase {
  build() {
    this.kit = new FaceKit(this.head);
    this.hatUpdates = [];
    this.constructor.spec.build.call(this, this.kit, this.colors);
  }

  /** Fäst ett inbyggt tillbehör (hatt, glasögon) från AR-biblioteket. */
  addGear(id) {
    const def = ACCESSORY_MAP[id];
    if (!def) return;
    const built = def.build();
    const off = new THREE.Group();
    off.add(built.group);
    if (['head', 'above', 'hair'].includes(def.slot)) off.position.set(0, -HEAD.crownY, -HEAD.crownZ);
    this.anchorFor(def.slot).add(off);
    if (built.update) this.hatUpdates.push(built.update);
  }

  animate(rig, dt, t, audio) {
    this.kit.update(rig, dt, t);
    this.constructor.spec.animate?.call(this, rig, dt, t, audio);
    for (const u of this.hatUpdates) u(dt, t, { ...ZERO_CTX, audio });
  }
}

function critterClass(spec) {
  const K = class extends Critter {};
  K.meta = { id: spec.id, name: spec.name, icon: spec.icon, desc: spec.desc, group: spec.group ?? 'animals' };
  K.defaults = spec.defaults;
  K.spec = spec;
  return K;
}

const HY = 0.62; // huvudets mitt

/** Gungande fjäderpivot för öron/flikar. */
function earPivot(x, y, z, side) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.userData.side = side;
  return p;
}

const wag = (list, rig, dt, t, k = 1) => {
  for (const p of list) {
    const u = p.userData;
    u.sp ??= new Spring(70, 6);
    u.sp2 ??= new Spring(70, 6);
    const tgt = -rig.euler.z * 0.8 * k - rig.pos.x * 0.12 + rig.talk * Math.sin(t * 13 + u.side) * 0.05;
    p.rotation.z = (u.baseZ ?? 0) + u.sp.update(tgt, dt);
    p.rotation.x = (u.baseX ?? 0) + u.sp2.update(-rig.euler.x * 0.6 * k + rig.browUp * 0.25 * k - rig.browDown * 0.3 * k, dt);
  }
};

const SPECS = [];

// ============================================================ Kvacke (anka)
SPECS.push({
  id: 'duck',
  name: 'Kvacke',
  icon: '🦆',
  desc: 'Tecknad anka med en stor näbb som klapprar när du pratar. Kvack! Bäst ihop med Ankröst.',
  defaults: { primary: '#fbfbff', accent: '#ff9a1f', glow: '#2b5fd0' },
  build(k, c) {
    const white = MATS.fur(c.primary, 0.7);
    this.head.add(ball(0.7, white, [0, 0.7, 0], [1, 1.02, 0.94], 64));
    // fjädertofs
    this.tuft = new THREE.Group();
    for (const [a, l] of [[-0.45, 0.2], [0, 0.3], [0.45, 0.18]]) {
      this.tuft.add(tube([[0, 0, 0], [Math.sin(a) * 0.05, l * 0.55, 0.03], [Math.sin(a) * 0.17, l, -0.05]], 0.055, 0.004, white, { ease: (x) => Math.pow(x, 0.7) }));
    }
    this.tuft.position.set(0, 1.38, 0.0);
    this.head.add(this.tuft);
    k.eyes({ r: 0.17, x: 0.19, y: 0.92, z: 0.5, white: true, scale: [0.82, 1.32, 0.62], yaw: 0.1, lid: white });
    k.brows({ x: 0.2, y: 1.18, z: 0.5, w: 0.15, r: 0.02, mat: MATS.matte(0x2a2a33), angle: 0.05 });
    k.beak({ y: 0.58, z: 0.5, w: 0.35, len: 0.44, thick: 0.1, mat: MATS.gloss(c.accent, 0.35), upturn: 0.12, open: 0.55 });
    k.blush({ x: 0.44, y: 0.66, z: 0.48, r: 0.075 });
    torso(this.body, { mat: white, r: 0.6, arms: false });
    // vingar
    this.wings = [];
    for (const s of [-1, 1]) {
      const w = ball(0.3, white, [0, -0.2, 0], [0.42, 1, 0.75], 32);
      const p = earPivot(s * 0.58, -0.25, 0.05, s);
      p.userData.baseZ = s * 0.35;
      p.add(w);
      this.body.add(p);
      this.wings.push(p);
    }
    // sjömanskrage + knut
    const cloth = MATS.cloth(c.glow);
    cloth.side = THREE.DoubleSide;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.66, 0.3, 48, 1, true), cloth);
    collar.position.y = -0.14;
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.012, 8, 64), MATS.matte(0xffffff, 0.6));
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = -0.24;
    const knot = ball(0.07, MATS.satin(0xffd23f), [0, -0.12, 0.38], [1.3, 1, 0.8], 20);
    this.body.add(collar, stripe, knot);
    this.headFrac = 0.85;
    this.framing.target.y = 0.5;
    this.setAnchors({ eyeY: 0.92, eyeZ: 0.55, faceScale: 0.66, crownY: 1.3, crownZ: -0.02, crownScale: 0.95 });
  },
  animate(rig, dt, t) {
    this.tuft.rotation.z = Math.sin(t * 3) * 0.05 - rig.euler.z * 0.4;
    this.tuft.rotation.x = rig.talk * Math.sin(t * 18) * 0.08;
    for (const w of this.wings) w.rotation.z = w.userData.baseZ + Math.sin(t * (2 + rig.talk * 14)) * (0.04 + rig.talk * 0.22) * w.userData.side;
  },
});

// ============================================================ Kyckis (kyckling)
SPECS.push({
  id: 'chick',
  name: 'Kyckis',
  icon: '🐥',
  desc: 'Fluffig liten kyckling med pipande näbb och fjädertofs som guppar.',
  defaults: { primary: '#ffd93d', accent: '#ff8a1f', glow: '#ff6f9f' },
  build(k, c) {
    const fluff = MATS.fur(c.primary, 0.6);
    this.head.add(ball(0.72, fluff, [0, HY, 0], [1.02, 0.98, 0.98], 64));
    this.tuft = new THREE.Group();
    for (const [a, l] of [[-0.5, 0.18], [-0.15, 0.26], [0.25, 0.22]]) {
      this.tuft.add(tube([[0, 0, 0], [Math.sin(a) * 0.06, l * 0.6, 0.02], [Math.sin(a) * 0.15 + 0.05, l, 0.06]], 0.045, 0.004, fluff));
    }
    this.tuft.position.set(0, 1.32, 0.05);
    this.head.add(this.tuft);
    k.eyes({ r: 0.1, x: 0.25, y: 0.78, z: 0.6, scale: [1, 1.18, 0.62] });
    k.beak({ y: 0.58, z: 0.6, w: 0.1, len: 0.22, thick: 0.065, mat: MATS.gloss(c.accent, 0.35), pointed: true, open: 0.5 });
    k.blush({ x: 0.45, y: 0.58, z: 0.55, r: 0.09, color: c.glow });
    const { arms } = torso(this.body, { mat: fluff, r: 0.6, arms: true, armR: 0.11 });
    this.arms = arms;
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.78, eyeZ: 0.62, faceScale: 0.8, crownY: 1.2, crownZ: -0.02, crownScale: 0.95 });
  },
  animate(rig, dt, t) {
    this.tuft.rotation.z = Math.sin(t * 4) * 0.07 - rig.euler.z * 0.5;
    this.arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (0.32 + Math.abs(Math.sin(t * 16)) * rig.talk * 0.5)));
  },
});

// ============================================================ Vovve (hund)
SPECS.push({
  id: 'dog',
  name: 'Vovve',
  icon: '🐶',
  desc: 'Glad hund med fladdrande öron och tunga som hänger ut när du ler eller gapar.',
  defaults: { primary: '#c98b4e', accent: '#f6e2c4', glow: '#5b3a22' },
  build(k, c) {
    const fur = MATS.fur(c.primary);
    const cream = MATS.fur(c.accent, 0.7);
    this.head.add(ball(0.72, fur, [0, HY, 0], [1.04, 0.96, 0.95], 64));
    this.head.add(ball(0.3, cream, [0, 0.46, 0.55], [1.1, 0.78, 0.95], 40));
    this.head.add(ball(0.22, cream, [0.1, 0.92, 0.55], [1, 1, 0.5], 28));
    this.head.add(ball(0.095, MATS.gloss(0x111114, 0.15), [0, 0.6, 0.83], [1.25, 0.85, 0.9], 24));
    k.eyes({ r: 0.1, x: 0.25, y: 0.8, z: 0.58, scale: [1, 1.15, 0.62] });
    k.brows({ x: 0.25, y: 0.97, z: 0.6, w: 0.11, mat: MATS.matte(c.glow) });
    this.mouth = k.mouth({ y: 0.38, z: 0.78, w: 0.11, open: 0.15 });
    this.tongue = ball(0.07, MATS.tongue(), [0, 0.33, 0.8], [1, 0.5, 1.2], 20);
    this.head.add(this.tongue);
    k.blush({ x: 0.46, y: 0.56, z: 0.52 });
    this.ears = [];
    for (const s of [-1, 1]) {
      const p = earPivot(s * 0.6, 1.0, -0.02, s);
      p.userData.baseZ = s * 0.25;
      const e = ball(0.3, MATS.fur(c.glow), [0, -0.32, 0], [0.48, 1, 0.24], 32);
      p.add(e);
      this.head.add(p);
      this.ears.push(p);
    }
    torso(this.body, { mat: fur, belly: cream });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 12, 48), MATS.satin(0xff3f6c));
    collar.rotation.x = Math.PI / 2 - 0.2;
    collar.position.y = -0.1;
    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 24), MATS.metal(0xffc444));
    tag.rotation.x = Math.PI / 2;
    tag.position.set(0, -0.2, 0.42);
    this.body.add(collar, tag);
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.8, eyeZ: 0.6, faceScale: 0.78, crownY: 1.06, crownZ: -0.04, crownScale: 0.98 });
  },
  animate(rig, dt, t) {
    wag(this.ears, rig, dt, t, 1.2);
    const out = Math.max(rig.jaw * 1.2, rig.smile > 0.7 ? 0.6 : 0);
    this.tongue.visible = out > 0.15;
    this.tongue.position.y = 0.36 - out * 0.12;
    this.tongue.scale.set(1, 0.5, 1.2 + out * 0.8);
  },
});

// ============================================================ Rävis (räv)
SPECS.push({
  id: 'fox',
  name: 'Rävis',
  icon: '🦊',
  desc: 'Listig räv med spetsiga öron, vit nos och sneda glänsande ögon.',
  defaults: { primary: '#ff7a1f', accent: '#ffffff', glow: '#1c1414' },
  build(k, c) {
    const fur = MATS.fur(c.primary);
    const white = MATS.fur(c.accent, 0.8);
    this.head.add(ball(0.7, fur, [0, HY, 0], [1.08, 0.94, 0.95], 64));
    for (const s of [-1, 1]) this.head.add(ball(0.22, white, [s * 0.32, 0.42, 0.4], [1, 0.8, 0.8], 32));
    this.head.add(ball(0.2, white, [0, 0.48, 0.6], [1, 0.75, 1.35], 32));
    this.head.add(ball(0.065, MATS.gloss(0x111114, 0.15), [0, 0.56, 0.92], [1.2, 0.85, 0.9], 20));
    k.eyes({ r: 0.1, x: 0.23, y: 0.76, z: 0.56, scale: [1.25, 0.85, 0.6], tilt: 0.28 });
    k.brows({ x: 0.24, y: 0.92, z: 0.56, w: 0.11, mat: MATS.matte(shade(c.primary, 0.55)), angle: 0.1 });
    k.mouth({ y: 0.4, z: 0.78, w: 0.08, open: 0.13 });
    this.ears = [];
    for (const s of [-1, 1]) {
      const p = earPivot(s * 0.4, 1.1, -0.05, s);
      p.userData.baseZ = -s * 0.32;
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.5, 32), fur);
      ear.scale.z = 0.45;
      ear.position.y = 0.2;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 24), white);
      inner.scale.z = 0.3;
      inner.position.set(0, 0.15, 0.05);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.17, 24), MATS.fur(c.glow, 0.3));
      tip.scale.z = 0.47;
      tip.position.y = 0.38;
      p.add(ear, inner, tip);
      this.head.add(p);
      this.ears.push(p);
    }
    torso(this.body, { mat: fur, belly: white, bellyScale: [1.05, 1.2, 0.6] });
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.76, eyeZ: 0.6, faceScale: 0.76, crownY: 1.05, crownZ: -0.04, crownScale: 0.95 });
  },
  animate(rig, dt, t) {
    wag(this.ears, rig, dt, t, 0.7);
  },
});

// ============================================================ Knorre (gris)
SPECS.push({
  id: 'pig',
  name: 'Knorre',
  icon: '🐷',
  desc: 'Rosa gris med vickande tryne, flipöron och rosiga kinder. Nöff!',
  defaults: { primary: '#ffb2c6', accent: '#ff7fa3', glow: '#7a2d45' },
  build(k, c) {
    const skin = MATS.skin(c.primary);
    this.head.add(ball(0.72, skin, [0, HY, 0], [1.08, 0.95, 0.95], 64));
    this.snout = new THREE.Group();
    const sn = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.16, 48), MATS.skin(c.accent));
    sn.rotation.x = Math.PI / 2;
    this.snout.add(sn);
    for (const s of [-1, 1]) this.snout.add(ball(0.04, MATS.gloss(c.glow, 0.4), [s * 0.065, 0, 0.075], [0.8, 1.3, 0.4], 16));
    this.snout.position.set(0, 0.54, 0.7);
    this.head.add(this.snout);
    k.eyes({ r: 0.075, x: 0.27, y: 0.84, z: 0.6, scale: [1, 1.2, 0.62] });
    k.brows({ x: 0.27, y: 0.98, z: 0.6, w: 0.1, mat: MATS.matte(shade(c.primary, 0.5)) });
    k.mouth({ y: 0.34, z: 0.7, w: 0.12, open: 0.14 });
    k.blush({ x: 0.44, y: 0.55, z: 0.56, r: 0.1, color: c.accent });
    this.ears = [];
    for (const s of [-1, 1]) {
      const p = earPivot(s * 0.48, 1.08, 0.08, s);
      p.userData.baseZ = -s * 0.55;
      p.userData.baseX = 0.7;
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 3), skin);
      ear.scale.z = 0.35;
      ear.position.y = 0.14;
      p.add(ear);
      this.head.add(p);
      this.ears.push(p);
    }
    torso(this.body, { mat: skin });
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.84, eyeZ: 0.6, faceScale: 0.8, crownY: 1.06, crownZ: -0.04, crownScale: 1.0 });
  },
  animate(rig, dt, t) {
    wag(this.ears, rig, dt, t, 1);
    this.snout.position.y = 0.54 + rig.talk * Math.sin(t * 20) * 0.012;
    this.snout.rotation.z = Math.sin(t * 1.5) * 0.04;
    this.snout.scale.setScalar(1 + rig.pucker * 0.15);
  },
});

// ============================================================ Kväkis (groda)
SPECS.push({
  id: 'frog',
  name: 'Kväkis',
  icon: '🐸',
  desc: 'Blank groda med bulliga ögon på toppen och en jättebred mun. Kväk!',
  defaults: { primary: '#58c84a', accent: '#d8f39a', glow: '#ff7aa8' },
  build(k, c) {
    const skin = MATS.gloss(c.primary, 0.32);
    this.head.add(ball(0.72, skin, [0, 0.56, 0], [1.3, 0.82, 0.95], 64));
    for (const s of [-1, 1]) this.head.add(ball(0.21, skin, [s * 0.37, 0.98, 0.22], [1, 0.95, 1], 40));
    k.eyes({ r: 0.16, x: 0.37, y: 1.01, z: 0.33, white: true, scale: [1, 1, 0.75], yaw: 0.3, lid: skin });
    k.mouth({ y: 0.46, z: 0.66, w: 0.48, depth: 0.09, open: 0.3, lineR: 0.016, line: MATS.matte(shade(c.primary, 0.6)) });
    k.blush({ x: 0.62, y: 0.6, z: 0.42, r: 0.11, color: c.glow, yaw: 0.9 });
    for (const s of [-1, 1]) this.head.add(ball(0.025, MATS.gloss(shade(c.primary, 0.6)), [s * 0.07, 0.68, 0.7], [1, 0.6, 0.5], 12));
    torso(this.body, { mat: skin, belly: MATS.gloss(c.accent, 0.4) });
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.95, eyeZ: 0.4, faceScale: 0.95, crownY: 1.1, crownZ: -0.04, crownScale: 1.05 });
  },
});

// ============================================================ Bambu (panda)
SPECS.push({
  id: 'panda',
  name: 'Bambu',
  icon: '🐼',
  desc: 'Mjuk panda med svarta ögonlappar, runda öron och en bambukvist.',
  defaults: { primary: '#f7f7f4', accent: '#17171c', glow: '#6fd06a' },
  build(k, c) {
    const white = MATS.fur(c.primary, 0.8);
    const black = MATS.fur(c.accent, 0.25);
    this.head.add(ball(0.72, white, [0, HY, 0], [1.08, 0.96, 0.95], 64));
    for (const s of [-1, 1]) {
      this.head.add(ball(0.21, black, [s * 0.54, 1.12, -0.05], [1, 1, 0.65], 32));
      const patch = ball(0.15, black, [s * 0.23, 0.76, 0.56], [0.85, 1.25, 0.5], 32);
      patch.rotation.z = -s * 0.45;
      this.head.add(patch);
    }
    k.eyes({ r: 0.06, x: 0.24, y: 0.78, z: 0.63, white: true, scale: [1, 1.1, 0.7] });
    this.head.add(ball(0.27, white, [0, 0.47, 0.54], [1.1, 0.8, 0.75], 36));
    this.head.add(ball(0.075, MATS.gloss(c.accent, 0.15), [0, 0.57, 0.74], [1.3, 0.85, 0.8], 20));
    k.mouth({ y: 0.4, z: 0.73, w: 0.08, open: 0.12 });
    k.blush({ x: 0.45, y: 0.55, z: 0.55 });
    torso(this.body, { mat: white, armMat: black });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 16, 48), black);
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.22;
    band.scale.set(1.05, 0.84, 1);
    this.body.add(band);
    // bambukvist
    this.bamboo = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 16), MATS.gloss(c.glow, 0.4));
    this.bamboo.add(stalk);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.01, 6, 16), MATS.gloss(shade(c.glow, 0.3), 0.4));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.25 + i * 0.25;
      this.bamboo.add(ring);
    }
    const leaf = ball(0.12, MATS.gloss(tint(c.glow, 0.1), 0.5), [0.08, 0.38, 0], [0.3, 1, 0.08], 16);
    leaf.rotation.z = -0.6;
    this.bamboo.add(leaf);
    this.bamboo.position.set(0.55, -0.45, 0.4);
    this.bamboo.rotation.z = -0.35;
    this.body.add(this.bamboo);
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.78, eyeZ: 0.62, faceScale: 0.78, crownY: 1.05, crownZ: -0.04, crownScale: 1.0 });
  },
  animate(rig, dt, t) {
    this.bamboo.rotation.z = -0.35 + Math.sin(t * 1.4) * 0.05;
  },
});

// ============================================================ Leo (lejon)
SPECS.push({
  id: 'lion',
  name: 'Leo',
  icon: '🦁',
  desc: 'Kunglig lejonkung med en stor fluffig man som gungar när du ryter.',
  defaults: { primary: '#efb04a', accent: '#a5481c', glow: '#fff1d0' },
  build(k, c) {
    const fur = MATS.fur(c.primary);
    this.mane = new THREE.Group();
    const maneMat = MATS.fur(c.accent, 0.3);
    const maneMat2 = MATS.fur(shade(c.accent, 0.2), 0.3);
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 16 : 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.12;
        const r = ring ? 0.72 : 0.62;
        const tuft = ball(0.2, ring ? maneMat2 : maneMat, [Math.sin(a) * r, Math.cos(a) * r * 0.98, -0.15 - ring * 0.12], [0.75, 1.35, 0.7], 20);
        tuft.rotation.z = -a;
        this.mane.add(tuft);
      }
    }
    this.mane.position.y = HY;
    this.head.add(this.mane);
    this.head.add(ball(0.62, fur, [0, HY, 0.05], [1.05, 0.98, 0.95], 64));
    for (const s of [-1, 1]) this.head.add(ball(0.13, fur, [s * 0.46, 1.08, 0], [1, 1, 0.6], 24));
    const cream = MATS.fur(c.glow, 0.8);
    this.head.add(ball(0.28, cream, [0, 0.45, 0.5], [1.15, 0.8, 0.8], 36));
    const nose = ball(0.08, MATS.gloss(0x3a1d14, 0.25), [0, 0.58, 0.71], [1.35, 0.8, 0.8], 20);
    this.head.add(nose);
    k.eyes({ r: 0.085, x: 0.22, y: 0.78, z: 0.58, white: true, iris: 0xd99a25, scale: [1, 1, 0.65] });
    k.brows({ x: 0.22, y: 0.92, z: 0.6, w: 0.12, r: 0.03, mat: maneMat, angle: 0.15 });
    k.mouth({ y: 0.36, z: 0.72, w: 0.12, open: 0.2, teeth: true });
    torso(this.body, { mat: fur, belly: cream });
    this.headFrac = 0.8;
    this.setAnchors({ eyeY: 0.78, eyeZ: 0.62, faceScale: 0.76, crownY: 1.12, crownZ: -0.02, crownScale: 1.0 });
  },
  animate(rig, dt, t) {
    this.mane.rotation.z = Math.sin(t * 2) * 0.02 + rig.talk * Math.sin(t * 22) * 0.03;
    this.mane.scale.setScalar(1 + rig.jaw * 0.08);
  },
});

// ============================================================ Ostis (mus)
SPECS.push({
  id: 'mouse',
  name: 'Ostis',
  icon: '🐭',
  desc: 'Liten mus med jättestora öron, morrhår och framtänder som syns när du pratar.',
  defaults: { primary: '#a7a9b8', accent: '#ff9eb8', glow: '#ffd23f' },
  build(k, c) {
    const fur = MATS.fur(c.primary);
    const pink = MATS.skin(c.accent);
    this.head.add(ball(0.66, fur, [0, HY, 0], [1.02, 0.95, 1.0], 64));
    this.head.add(ball(0.27, MATS.fur(tint(c.primary, 0.3)), [0, 0.5, 0.5], [1, 0.82, 1.15], 36));
    this.head.add(ball(0.06, pink, [0, 0.57, 0.8], [1.1, 0.9, 0.9], 20));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 48), fur);
      ear.rotation.x = Math.PI / 2;
      ear.position.set(s * 0.56, 1.1, -0.12);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 40), pink);
      inner.rotation.x = Math.PI / 2;
      inner.position.set(s * 0.56, 1.1, -0.085);
      this.head.add(ear, inner);
    }
    k.eyes({ r: 0.1, x: 0.22, y: 0.76, z: 0.53, scale: [1, 1.2, 0.62] });
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.02), MATS.tooth());
    teeth.position.set(0, 0.42, 0.74);
    this.head.add(teeth);
    k.mouth({ y: 0.4, z: 0.72, w: 0.07, open: 0.12 });
    const wm = new THREE.MeshBasicMaterial({ color: 0x3a3a46 });
    this.whiskers = new THREE.Group();
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.42, 6), wm);
        w.rotation.z = s * (Math.PI / 2 + (i - 1) * 0.16);
        w.position.set(s * 0.28, 0.53 - (i - 1) * 0.03, 0.66);
        this.whiskers.add(w);
      }
    }
    this.head.add(this.whiskers);
    k.blush({ x: 0.42, y: 0.56, z: 0.5, r: 0.08, color: c.accent });
    torso(this.body, { mat: fur, r: 0.55 });
    // ostbit
    const cheese = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 3, 1, false, 0, Math.PI * 0.6), MATS.gloss(c.glow, 0.5));
    cheese.position.set(-0.5, -0.5, 0.42);
    cheese.rotation.set(0.3, 0.4, 0);
    this.body.add(cheese);
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.76, eyeZ: 0.58, faceScale: 0.72, crownY: 1.04, crownZ: -0.04, crownScale: 0.92 });
  },
  animate(rig, dt, t) {
    this.whiskers.rotation.z = Math.sin(t * 9) * 0.02 * (1 + rig.talk * 3);
  },
});

// ============================================================ Abbe (apa)
SPECS.push({
  id: 'monkey',
  name: 'Apan Abbe',
  icon: '🐵',
  desc: 'Busig apa med hjärtformat ansikte, stora öron och ett brett flin.',
  defaults: { primary: '#7a4a2c', accent: '#f0c9a0', glow: '#ffd23f' },
  build(k, c) {
    const fur = MATS.fur(c.primary);
    const face = MATS.skin(c.accent);
    this.head.add(ball(0.72, fur, [0, HY, 0], [1.04, 0.96, 0.92], 64));
    for (const s of [-1, 1]) this.head.add(ball(0.25, face, [s * 0.17, 0.76, 0.42], [1, 1.12, 0.62], 32));
    this.head.add(ball(0.3, face, [0, 0.46, 0.52], [1.18, 0.82, 0.72], 36));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 32), fur);
      ear.rotation.z = Math.PI / 2;
      ear.position.set(s * 0.76, 0.66, 0);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 28), face);
      inner.rotation.z = Math.PI / 2;
      inner.position.set(s * 0.79, 0.66, 0);
      this.head.add(ear, inner);
    }
    k.eyes({ r: 0.085, x: 0.17, y: 0.78, z: 0.6, scale: [1, 1.15, 0.62] });
    k.brows({ x: 0.17, y: 0.92, z: 0.62, w: 0.11, mat: MATS.matte(shade(c.primary, 0.4)) });
    for (const s of [-1, 1]) this.head.add(ball(0.025, MATS.gloss(0x2a1a12), [s * 0.045, 0.56, 0.79], [1, 0.7, 0.6], 12));
    k.mouth({ y: 0.42, z: 0.78, w: 0.17, depth: 0.07, open: 0.2, teeth: true });
    this.tuft = tube([[0, 0, 0], [0.04, 0.12, 0.03], [-0.03, 0.2, 0.08]], 0.05, 0.005, fur);
    this.tuft.position.set(0, 1.3, 0.08);
    this.head.add(this.tuft);
    torso(this.body, { mat: fur, belly: face });
    // banan
    this.banana = tube([[0, 0, 0], [0.08, 0.15, 0.02], [0.05, 0.32, 0.04], [-0.04, 0.42, 0.05]], 0.06, 0.02, MATS.gloss(c.glow, 0.45));
    this.banana.position.set(-0.6, -0.65, 0.45);
    this.body.add(this.banana);
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.78, eyeZ: 0.62, faceScale: 0.66, crownY: 1.06, crownZ: -0.04, crownScale: 0.98 });
  },
  animate(rig, dt, t) {
    this.tuft.rotation.z = Math.sin(t * 3) * 0.1;
    this.banana.rotation.z = Math.sin(t * 1.2) * 0.08;
  },
});

// ============================================================ Pingis (pingvin)
SPECS.push({
  id: 'penguin',
  name: 'Pingis',
  icon: '🐧',
  desc: 'Knubbig pingvin med frack, gul halsfläck och flaxande vingar.',
  defaults: { primary: '#1f2433', accent: '#ffffff', glow: '#ffb020' },
  build(k, c) {
    const black = MATS.fur(c.primary, 0.25);
    const white = MATS.fur(c.accent, 0.8);
    this.head.add(ball(0.7, black, [0, HY, 0], [1.04, 0.98, 0.96], 64));
    for (const s of [-1, 1]) this.head.add(ball(0.25, white, [s * 0.18, 0.74, 0.5], [1, 1.12, 0.62], 32));
    this.head.add(ball(0.33, white, [0, 0.48, 0.47], [1.2, 0.74, 0.7], 36));
    k.eyes({ r: 0.085, x: 0.19, y: 0.77, z: 0.66, scale: [1, 1.2, 0.62] });
    k.beak({ y: 0.6, z: 0.66, w: 0.085, len: 0.22, thick: 0.055, mat: MATS.gloss(c.glow, 0.35), pointed: true, open: 0.5 });
    k.blush({ x: 0.36, y: 0.56, z: 0.6, r: 0.07 });
    for (const s of [-1, 1]) this.head.add(ball(0.12, MATS.fur(c.glow, 0.5), [s * 0.5, 0.32, 0.25], [0.6, 1, 0.6], 20));
    torso(this.body, { mat: black, belly: white, arms: false });
    this.flippers = [];
    for (const s of [-1, 1]) {
      const p = earPivot(s * 0.6, -0.15, 0.05, s);
      p.userData.baseZ = s * 0.25;
      p.add(ball(0.32, black, [0, -0.25, 0], [0.3, 1, 0.55], 28));
      this.body.add(p);
      this.flippers.push(p);
    }
    const bow = new THREE.Group();
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 20), MATS.satin(0xff2d55));
      wing.rotation.z = (s * Math.PI) / 2;
      wing.position.x = s * 0.08;
      bow.add(wing);
    }
    bow.add(ball(0.04, MATS.satin(0xff2d55), [0, 0, 0], [1, 1, 1], 12));
    bow.position.set(0, -0.08, 0.45);
    this.body.add(bow);
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.76, eyeZ: 0.62, faceScale: 0.68, crownY: 1.06, crownZ: -0.04, crownScale: 0.96 });
  },
  animate(rig, dt, t) {
    for (const f of this.flippers) f.rotation.z = f.userData.baseZ + f.userData.side * Math.abs(Math.sin(t * 12)) * rig.talk * 0.5;
  },
});

// ============================================================ Glitter (enhörning)
SPECS.push({
  id: 'unicorn',
  group: 'fantasy',
  name: 'Glitter',
  icon: '🦄',
  desc: 'Pastellenhörning med guldspiralhorn, regnbågsman och långa ögonfransar.',
  defaults: { primary: '#fff6ff', accent: '#ffb6d9', glow: '#ffc444' },
  build(k, c) {
    const coat = new THREE.MeshPhysicalMaterial({ color: c.primary, roughness: 0.6, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color('#ffd6f4'), iridescence: 0.35 });
    this.head.add(ball(0.7, coat, [0, 0.66, 0], [1, 1.02, 1.0], 64));
    this.head.add(ball(0.3, MATS.skin(tint(c.accent, 0.35)), [0, 0.42, 0.52], [0.95, 0.72, 1.05], 36));
    for (const s of [-1, 1]) this.head.add(ball(0.025, MATS.gloss(shade(c.accent, 0.5)), [s * 0.08, 0.47, 0.78], [1.2, 0.7, 0.6], 12));
    k.eyes({ r: 0.11, x: 0.24, y: 0.82, z: 0.56, white: true, iris: 0x8a5cff, scale: [1, 1.2, 0.62] });
    // fransar
    const lashMat = MATS.matte(0x2a1840, 0.5);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const l = tube([[0, 0, 0], [s * 0.02, 0.04, 0.01], [s * 0.06, 0.06, 0]], 0.009, 0.002, lashMat, { segs: 8, radial: 5 });
        l.position.set(s * (0.3 + i * 0.03), 0.93 - i * 0.025, 0.6 - i * 0.03);
        this.head.add(l);
      }
    }
    k.mouth({ y: 0.34, z: 0.74, w: 0.1, open: 0.12 });
    k.blush({ x: 0.45, y: 0.6, z: 0.52, color: c.accent });
    // horn
    this.horn = new THREE.Group();
    const gold = MATS.metal(c.glow, 0.2);
    this.horn.add(new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.56, 32), gold));
    const helix = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const rr = 0.098 * (1 - u) + 0.004;
      helix.push([Math.cos(u * Math.PI * 7) * rr, -0.28 + u * 0.54, Math.sin(u * Math.PI * 7) * rr]);
    }
    this.horn.add(tube(helix, 0.016, 0.004, MATS.metal(tint(c.glow, 0.4), 0.15), { segs: 120, radial: 6 }));
    this.horn.position.set(0, 1.4, 0.4);
    this.horn.rotation.x = 0.32;
    this.head.add(this.horn);
    this.hornGlow = MATS.glow(tint(c.glow, 0.5), 1.5);
    const sparkle = ball(0.03, this.hornGlow, [0, 0.3, 0], [1, 1, 1], 10);
    this.horn.add(sparkle);
    this.sparkle = sparkle;
    // öron
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 24), coat);
      ear.scale.z = 0.5;
      ear.position.set(s * 0.36, 1.27, -0.05);
      ear.rotation.z = -s * 0.25;
      this.head.add(ear);
    }
    // regnbågsman
    const rainbow = ['#ff5fa2', '#ffb347', '#fff275', '#7dffa1', '#6ec6ff', '#b48cff'];
    this.mane = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const a = 0.25 + u * 2.3;
      const m = ball(0.15 - u * 0.02, MATS.satin(rainbow[i % 6]), [0.06, 0.66 + Math.cos(a) * 0.74, Math.sin(a) * -0.74 + 0.12], [1, 1.25, 1], 20);
      this.mane.add(m);
    }
    for (let i = 0; i < 3; i++) this.mane.add(ball(0.1, MATS.satin(rainbow[i * 2]), [0.2 + i * 0.09, 1.2 - i * 0.07, 0.4 - i * 0.05], [1, 1.2, 0.9], 18));
    this.head.add(this.mane);
    torso(this.body, { mat: coat });
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.82, eyeZ: 0.6, faceScale: 0.78, crownY: 1.12, crownZ: -0.04, crownScale: 0.95 });
  },
  animate(rig, dt, t) {
    this.hornGlow.emissiveIntensity = 1.2 + Math.sin(t * 4) * 0.5 + rig.talk * 2;
    this.sparkle.position.y = -0.25 + ((t * 0.4) % 1) * 0.5;
    this.mane.rotation.z = Math.sin(t * 2.2) * 0.03 - rig.euler.z * 0.2;
  },
});

// ============================================================ Glöd (drake)
SPECS.push({
  id: 'dragon',
  group: 'fantasy',
  name: 'Draken Glöd',
  icon: '🐲',
  desc: 'Liten drake med horn, taggar och flaxande vingar. Gapa stort för att spruta eld!',
  defaults: { primary: '#22b07d', accent: '#ffcf5a', glow: '#8a4dff' },
  build(k, c) {
    const scale = MATS.gloss(c.primary, 0.38);
    const belly = MATS.gloss(c.accent, 0.5);
    this.head.add(ball(0.66, scale, [0, 0.66, -0.02], [1, 0.92, 1.0], 64));
    k.jaw({ y: 0.5, z: 0.45, w: 0.32, len: 0.42, thick: 0.17, mat: scale, lowerMat: belly, teeth: 5, open: 0.6 });
    for (const s of [-1, 1]) this.head.add(ball(0.035, MATS.gloss(shade(c.primary, 0.6)), [s * 0.08, 0.64, 0.86], [1, 0.6, 0.6], 12));
    k.eyes({ r: 0.11, x: 0.26, y: 0.86, z: 0.48, white: true, iris: 0xffc21a, slit: true, scale: [1, 1.05, 0.65], tilt: 0.12, lid: scale });
    for (const s of [-1, 1]) {
      const horn = tube([[0, 0, 0], [s * 0.02, 0.12, -0.06], [s * 0.06, 0.24, -0.2], [s * 0.1, 0.3, -0.36]], 0.07, 0.006, MATS.gloss(0xf1e4c6, 0.4));
      horn.position.set(s * 0.3, 1.14, -0.05);
      horn.rotation.z = -s * 0.35;
      this.head.add(horn);
    }
    const spikeMat = MATS.gloss(c.glow, 0.35);
    for (let i = 0; i < 5; i++) {
      const a = 0.15 + i * 0.36;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06 - i * 0.004, 0.18, 4), spikeMat);
      sp.position.set(0, 0.66 + Math.cos(a) * 0.62, -Math.sin(a) * 0.64);
      sp.rotation.x = -a;
      this.head.add(sp);
    }
    torso(this.body, { mat: scale, belly });
    this.wings = [];
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.3, 0.35, 0.65, 0.5, 0.95, 0.55);
    wingShape.lineTo(0.8, 0.22);
    wingShape.quadraticCurveTo(0.68, 0.18, 0.62, 0.02);
    wingShape.quadraticCurveTo(0.5, 0.0, 0.42, -0.14);
    wingShape.quadraticCurveTo(0.24, -0.06, 0, 0);
    const wingMat = new THREE.MeshPhysicalMaterial({ color: c.glow, roughness: 0.45, side: THREE.DoubleSide, transmission: 0.2, thickness: 0.1, sheen: 0.6, sheenColor: new THREE.Color(tint(c.glow, 0.5)) });
    for (const s of [-1, 1]) {
      const p = earPivot(s * 0.35, -0.15, -0.4, s);
      const w = new THREE.Mesh(new THREE.ShapeGeometry(wingShape, 16), wingMat);
      w.scale.x = s;
      p.add(w);
      p.rotation.y = s * 0.55;
      this.body.add(p);
      this.wings.push(p);
    }
    this.headFrac = 0.8;
    this.setAnchors({ eyeY: 0.86, eyeZ: 0.55, faceScale: 0.8, crownY: 1.12, crownZ: -0.06, crownScale: 0.95 });
  },
  animate(rig, dt, t) {
    const f = Math.sin(t * (2.5 + rig.talk * 8)) * (0.18 + rig.talk * 0.25);
    for (const w of this.wings) w.rotation.y = w.userData.side * (0.55 + f);
  },
});

// ============================================================ Tuffe (T-rex)
SPECS.push({
  id: 'dino',
  group: 'fantasy',
  name: 'T-rex Tuffe',
  icon: '🦖',
  desc: 'Tuff tyrannosaurus med jättekäft full av tänder – och pyttesmå armar.',
  defaults: { primary: '#76b83d', accent: '#e9e3b0', glow: '#3e6a1e' },
  build(k, c) {
    const scale = MATS.gloss(c.primary, 0.45);
    this.head.add(ball(0.6, scale, [0, 0.7, 0], [1, 0.9, 1.05], 64));
    k.jaw({ y: 0.52, z: 0.38, w: 0.38, len: 0.52, thick: 0.2, mat: scale, lowerMat: MATS.gloss(c.accent, 0.5), teeth: 7, open: 0.6 });
    for (const s of [-1, 1]) this.head.add(ball(0.03, MATS.gloss(c.glow), [s * 0.1, 0.72, 0.93], [1, 0.6, 0.6], 12));
    k.eyes({ r: 0.085, x: 0.3, y: 0.9, z: 0.4, white: true, iris: 0xffb01a, slit: true, scale: [1, 1, 0.65], yaw: 0.45, lid: scale });
    for (const s of [-1, 1]) {
      const ridge = ball(0.13, scale, [s * 0.3, 1.0, 0.36], [1.1, 0.45, 0.9], 20);
      ridge.rotation.z = -s * 0.2;
      this.head.add(ridge);
    }
    const spot = MATS.gloss(c.glow, 0.5);
    [[0.15, 1.23, 0.1], [-0.2, 1.2, 0.0], [0.3, 1.1, -0.25], [-0.05, 1.18, -0.3], [-0.35, 1.0, -0.3]].forEach(([x, y, z]) => this.head.add(ball(0.06, spot, [x, y, z], [1, 0.35, 1], 14)));
    for (let i = 0; i < 4; i++) {
      const a = 0.6 + i * 0.35;
      const plate = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), spot);
      plate.position.set(0, 0.7 + Math.cos(a) * 0.55, -Math.sin(a) * 0.62);
      plate.rotation.x = -a;
      plate.scale.z = 0.4;
      this.head.add(plate);
    }
    torso(this.body, { mat: scale, belly: MATS.gloss(c.accent, 0.5), arms: false });
    this.arms = [];
    for (const s of [-1, 1]) {
      const p = earPivot(s * 0.32, -0.42, 0.42, s);
      p.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), scale));
      p.rotation.x = -1.1;
      this.body.add(p);
      this.arms.push(p);
    }
    this.headFrac = 0.8;
    this.setAnchors({ eyeY: 0.9, eyeZ: 0.5, faceScale: 0.85, crownY: 1.16, crownZ: -0.06, crownScale: 0.92 });
  },
  animate(rig, dt, t) {
    this.arms.forEach((a, i) => (a.rotation.z = Math.sin(t * 10 + i * 2) * 0.3 * (0.2 + rig.talk)));
  },
});

// ============================================================ Bajsis
SPECS.push({
  id: 'poop',
  group: 'fantasy',
  name: 'Bajsis',
  icon: '💩',
  desc: 'En glad liten bajskorv med glänsande snurr, stora ögon – och flugor som surrar runt.',
  defaults: { primary: '#7b4a27', accent: '#ffffff', glow: '#1c1c22' },
  build(k, c) {
    const brown = MATS.gloss(c.primary, 0.32);
    const tiers = [
      [0.5, 0.24, 0.2],
      [0.39, 0.21, 0.55],
      [0.26, 0.17, 0.85],
    ];
    for (const [R, r, y] of tiers) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 24, 64), brown);
      t.rotation.x = Math.PI / 2;
      t.position.y = y;
      this.head.add(t);
      this.head.add(ball(R, brown, [0, y, 0], [1, 0.6, 1], 32));
    }
    this.head.add(tube([[0, 0, 0], [0.03, 0.12, 0.02], [0.1, 0.22, 0.0], [0.14, 0.26, -0.06]], 0.15, 0.01, brown));
    this.head.children.at(-1).position.set(0, 0.98, 0);
    k.eyes({ r: 0.13, x: 0.17, y: 0.6, z: 0.55, white: true, scale: [0.9, 1.15, 0.6], yaw: 0.15 });
    k.mouth({ y: 0.28, z: 0.72, w: 0.17, depth: 0.08, open: 0.2, line: MATS.matte(0x2a1508) });
    k.blush({ x: 0.36, y: 0.38, z: 0.66, r: 0.07 });
    this.flies = [];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Group();
      f.add(ball(0.025, MATS.gloss(c.glow), [0, 0, 0], [1.3, 1, 1], 10));
      const wingM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), wingM);
        w.position.set(s * 0.02, 0.02, 0);
        f.add(w);
      }
      this.head.add(f);
      this.flies.push(f);
    }
    this.headFrac = 1;
    this.framing.target.y = 0.55;
    this.setAnchors({ eyeY: 0.6, eyeZ: 0.6, faceScale: 0.66, crownY: 1.12, crownZ: -0.02, crownScale: 0.7 });
  },
  animate(rig, dt, t) {
    this.flies.forEach((f, i) => {
      const a = t * (2.5 + i * 0.7) + i * 2.1;
      f.position.set(Math.cos(a) * (0.75 + i * 0.08), 1.15 + Math.sin(a * 1.7) * 0.15 + i * 0.05, Math.sin(a) * (0.6 + i * 0.1));
      f.children[1].rotation.y = Math.sin(t * 60) * 0.8;
      f.children[2].rotation.y = -Math.sin(t * 60) * 0.8;
    });
  },
});

// ============================================================ Snögubben
SPECS.push({
  id: 'snowman',
  group: 'fantasy',
  name: 'Snöris',
  icon: '⛄',
  desc: 'Glittrande snögubbe med morotsnäsa, kolögon, stickad halsduk och hög hatt.',
  defaults: { primary: '#f5f9ff', accent: '#ff8a2a', glow: '#e0283c' },
  build(k, c) {
    const snow = new THREE.MeshPhysicalMaterial({ color: c.primary, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color('#cfe6ff'), sheenRoughness: 0.3 });
    this.head.add(ball(0.62, snow, [0, HY, 0], [1, 0.98, 0.98], 64));
    const coal = MATS.gloss(0x141418, 0.4);
    k.eyes({ r: 0.075, x: 0.2, y: 0.78, z: 0.53, scale: [1, 1, 0.8] });
    const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.42, 20), MATS.matte(c.accent, 0.55));
    carrot.rotation.x = Math.PI / 2 + 0.12;
    carrot.position.set(0, 0.62, 0.78);
    this.head.add(carrot);
    k.mouth({ y: 0.42, z: 0.58, w: 0.1, open: 0.18, line: new THREE.MeshBasicMaterial({ visible: false }), tongue: false });
    this.coals = [];
    for (let i = 0; i < 5; i++) {
      const m = ball(0.035, coal, [0, 0, 0], [1, 1, 1], 12);
      this.head.add(m);
      this.coals.push(m);
    }
    this.body.add(ball(0.74, snow, [0, -0.66, 0], [1, 0.95, 0.95], 48));
    for (let i = 0; i < 3; i++) this.body.add(ball(0.05, coal, [0, -0.35 - i * 0.22, 0.7 - i * 0.02], [1, 1, 0.7], 14));
    const knit = MATS.cloth(c.glow);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 16, 48), knit);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = -0.04;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.06), knit);
    tail.position.set(0.24, -0.3, 0.42);
    tail.rotation.z = 0.15;
    this.body.add(scarf, tail);
    this.scarfTail = tail;
    for (const s of [-1, 1]) {
      const arm = tube([[0, 0, 0], [s * 0.25, 0.08, 0], [s * 0.45, 0.25, 0.02], [s * 0.55, 0.4, 0]], 0.025, 0.01, MATS.matte(0x5b3a22));
      arm.position.set(s * 0.62, -0.45, 0.1);
      this.body.add(arm);
    }
    this.addGear('topHat');
    this.headFrac = 0.9;
    this.setAnchors({ eyeY: 0.78, eyeZ: 0.55, faceScale: 0.75, crownY: 1.1, crownZ: -0.02, crownScale: 0.9 });
  },
  animate(rig, dt, t) {
    const smile = 0.06 + (rig.smile - rig.frown) * 0.05;
    this.coals.forEach((m, i) => {
      const u = (i - 2) / 2;
      m.position.set(u * 0.17 * (1 + rig.wide * 0.25), 0.43 - (1 - u * u) * smile - rig.jaw * 0.12 * (1 - u * u * 0.5), 0.56 - Math.abs(u) * 0.06);
    });
    this.scarfTail.rotation.z = 0.15 + Math.sin(t * 1.6) * 0.06;
  },
});

// ============================================================ Benny (skelett)
SPECS.push({
  id: 'skeleton',
  group: 'spooky',
  name: 'Benny Ben',
  icon: '💀',
  desc: 'Skramlande skelett med glödande pupiller som följer din blick och en käke som klapprar.',
  defaults: { primary: '#efe8d6', accent: '#22e5ff', glow: '#16141c' },
  build(k, c) {
    const bone = new THREE.MeshPhysicalMaterial({ color: c.primary, roughness: 0.55, clearcoat: 0.3 });
    this.head.add(ball(0.62, bone, [0, 0.72, -0.02], [0.95, 1.0, 0.98], 64));
    for (const s of [-1, 1]) this.head.add(ball(0.16, bone, [s * 0.32, 0.5, 0.36], [1, 0.75, 0.9], 24));
    const dark = MATS.matte(0x0b0a0e, 0.9);
    this.pupils = [];
    for (const s of [-1, 1]) {
      this.head.add(ball(0.155, dark, [s * 0.22, 0.76, 0.5], [1, 1.1, 0.5], 32));
      const p = ball(0.04, MATS.glow(c.accent, 3), [s * 0.22, 0.76, 0.56], [1, 1, 1], 14);
      this.head.add(p);
      this.pupils.push(p);
    }
    for (const s of [-1, 1]) {
      const n = ball(0.04, dark, [s * 0.035, 0.56, 0.6], [0.7, 1.3, 0.5], 12);
      n.rotation.z = s * 0.4;
      this.head.add(n);
    }
    const toothGeo = new THREE.BoxGeometry(0.055, 0.075, 0.04);
    for (let i = 0; i < 8; i++) {
      const a = (i - 3.5) * 0.13;
      const tt = new THREE.Mesh(toothGeo, bone);
      tt.position.set(Math.sin(a) * 0.36, 0.42, Math.cos(a) * 0.36 + 0.14);
      tt.rotation.y = a;
      this.head.add(tt);
    }
    this.jaw = new THREE.Group();
    this.jaw.position.set(0, 0.42, 0.05);
    const jawBone = ball(0.32, bone, [0, -0.09, 0.15], [1.05, 0.38, 0.9], 32);
    this.jaw.add(jawBone);
    for (let i = 0; i < 8; i++) {
      const a = (i - 3.5) * 0.13;
      const tt = new THREE.Mesh(toothGeo, bone);
      tt.position.set(Math.sin(a) * 0.33, -0.02, Math.cos(a) * 0.33 + 0.08);
      tt.rotation.y = a;
      this.jaw.add(tt);
    }
    this.head.add(this.jaw);
    const hood = MATS.cloth(c.glow);
    torso(this.body, { mat: hood });
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        const rib = tube([[0, 0, 0], [s * 0.12, -0.02, -0.02], [s * 0.24, -0.08, -0.08]], 0.022, 0.016, bone, { segs: 10, radial: 6 });
        rib.position.set(s * 0.02, -0.28 - i * 0.13, 0.5);
        this.body.add(rib);
      }
    }
    this.body.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.04), bone));
    this.body.children.at(-1).position.set(0, -0.42, 0.51);
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.76, eyeZ: 0.55, faceScale: 0.78, crownY: 1.16, crownZ: -0.04, crownScale: 0.92 });
  },
  animate(rig, dt, t) {
    this.jaw.rotation.x = 0.03 + rig.jaw * 0.5 + rig.talk * Math.abs(Math.sin(t * 18)) * 0.12;
    this.pupils.forEach((p, i) => {
      p.position.x = (i ? 0.22 : -0.22) + rig.lookX * 0.05;
      p.position.y = 0.76 + rig.lookY * 0.04;
      const blink = i ? rig.blinkR : rig.blinkL;
      p.scale.setScalar(Math.max(0.15, 1 - blink) * (1 + rig.browUp * 0.5));
    });
  },
});

export const CRITTER_AVATARS = SPECS.map(critterClass);
