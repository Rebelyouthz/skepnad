// Procedurella 3D-tillbehör. Enheter: 1 = avståndet mellan ögonens yttre hörn.
// Origo i mitten mellan ögonen, +y upp, +z mot kameran, +x = motivets vänster.
import * as THREE from 'three';
import { taperedTube, heartShape, wrapZ, canvasTexture, MAT } from './geometry.js';

import { MORE_ACCESSORIES } from './accessoriesMore.js';
import { HEAD } from './geometry.js';
export { HEAD };

// Full spegling i x: M·(T·R·S) ⇒ x-position, y/z-rotation och x-skala byter tecken.
const mirrorX = (obj) => {
  obj.position.x *= -1;
  obj.rotation.y *= -1;
  obj.rotation.z *= -1;
  obj.scale.x *= -1;
  return obj;
};

const pair = (make, x) => {
  const g = new THREE.Group();
  const a = make();
  a.position.x += x;
  const b = mirrorX(make());
  b.position.x -= x;
  g.add(a, b);
  return g;
};

function outlineTube(shape, radius, z = 0, wrap = 0) {
  const pts = shape.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, z - wrap * p.x * p.x));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, radius, 8, true);
}

// ---------- Glasögon ----------
function buildSunglasses() {
  const g = new THREE.Group();
  const lens = new THREE.Shape();
  lens.moveTo(-0.22, 0.13);
  lens.bezierCurveTo(-0.05, 0.17, 0.15, 0.18, 0.25, 0.14);
  lens.bezierCurveTo(0.31, 0.02, 0.24, -0.17, 0.08, -0.2);
  lens.bezierCurveTo(-0.08, -0.22, -0.22, -0.1, -0.23, 0.02);
  lens.bezierCurveTo(-0.235, 0.07, -0.23, 0.11, -0.22, 0.13);
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x16121f,
    metalness: 0.4,
    roughness: 0.04,
    clearcoat: 1,
    iridescence: 1,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [200, 800],
    envMapIntensity: 2.2,
  });
  const gold = MAT.gold();
  const make = () => {
    const s = new THREE.Group();
    const lg = new THREE.ExtrudeGeometry(lens, { depth: 0.012, bevelEnabled: false, curveSegments: 24 });
    s.add(new THREE.Mesh(lg, lensMat), new THREE.Mesh(outlineTube(lens, 0.014, 0.012), gold));
    s.rotation.y = 0.14;
    return s;
  };
  g.add(pair(make, HEAD.eyeX));
  const bridge = taperedTube([[-0.11, 0.1, 0.01], [0, 0.13, 0.03], [0.11, 0.1, 0.01]], 0.013, 0.013, { segs: 16, radial: 8 });
  const top = taperedTube([[-0.12, 0.16, 0.012], [0, 0.165, 0.03], [0.12, 0.16, 0.012]], 0.011, 0.011, { segs: 16, radial: 8 });
  g.add(new THREE.Mesh(bridge, gold), new THREE.Mesh(top, gold));
  const temple = () => new THREE.Mesh(taperedTube([[0.57, 0.12, -0.04], [0.7, 0.1, -0.4], [0.8, 0.05, -0.9]], 0.014, 0.012, { segs: 16, radial: 8 }), gold);
  g.add(temple(), mirrorX(temple()));
  g.position.set(0, -0.02, 0.22);
  return { group: g };
}

function buildDealWithIt() {
  const rows = ['XXXXXXXXXXXXXXXXX', 'XWWXXXX...XWWXXXX', '.XWXXX.....XWXXX.', '..XXX.......XXX..'];
  const cell = 0.082;
  const box = new THREE.BoxGeometry(cell, cell, 0.04);
  const cells = { X: [], W: [] };
  rows.forEach((r, ri) => [...r].forEach((ch, ci) => ch !== '.' && cells[ch].push([(ci - 8) * cell, (1.5 - ri) * cell])));
  const g = new THREE.Group();
  const inner = new THREE.Group();
  for (const [key, mat] of [
    ['X', new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.35, metalness: 0.2 })],
    ['W', new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.4 })],
  ]) {
    const im = new THREE.InstancedMesh(box, mat, cells[key].length);
    const d = new THREE.Object3D();
    cells[key].forEach(([x, y], i) => {
      d.position.set(x, y, 0);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    inner.add(im);
  }
  g.add(inner);
  g.position.set(0, -0.02, 0.3);
  let drop = 0;
  return {
    group: g,
    update(dt) {
      if (drop >= 1) return;
      drop = Math.min(drop + dt / 1.1, 1);
      const e = 1 - Math.pow(1 - drop, 3);
      const bounce = drop > 0.85 ? Math.sin((drop - 0.85) / 0.15 * Math.PI) * 0.05 : 0;
      inner.position.y = (1 - e) * 2.4 + bounce;
    },
  };
}

function buildNerd() {
  const g = new THREE.Group();
  const rr = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const frame = rr(0.5, 0.36, 0.08);
  frame.holes.push(rr(0.39, 0.26, 0.05));
  const frameGeo = new THREE.ExtrudeGeometry(frame, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 });
  const black = MAT.black();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0, clearcoat: 1, depthWrite: false });
  const make = () => {
    const s = new THREE.Group();
    s.add(new THREE.Mesh(frameGeo, black));
    const l = new THREE.Mesh(new THREE.ShapeGeometry(rr(0.4, 0.27, 0.05)), glass);
    l.position.z = 0.02;
    s.add(l);
    s.rotation.y = 0.1;
    return s;
  };
  g.add(pair(make, 0.31));
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.04), black);
  bridge.position.set(0, 0.06, 0.02);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.085, 0.07), MAT.matte(0xf4f1e8, 0.9));
  tape.position.set(0, 0.06, 0.02);
  g.add(bridge, tape);
  const temple = () => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.95), black);
    m.position.set(0.56, 0.1, -0.45);
    m.rotation.y = -0.12;
    return m;
  };
  g.add(temple(), mirrorX(temple()));
  g.position.set(0, -0.02, 0.24);
  return { group: g };
}

function buildHeartEyes() {
  const geo = new THREE.ExtrudeGeometry(heartShape(0.17), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 4, curveSegments: 24 });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xff1f5a, roughness: 0.18, clearcoat: 1, emissive: 0xff1f5a, emissiveIntensity: 0.35 });
  const a = new THREE.Mesh(geo, mat);
  const b = new THREE.Mesh(geo, mat);
  a.position.set(HEAD.eyeX, 0.0, 0.3);
  b.position.set(-HEAD.eyeX, 0.0, 0.3);
  const g = new THREE.Group();
  g.add(a, b);
  return {
    group: g,
    update(dt, t) {
      const beat = Math.pow(Math.max(Math.sin(t * 7.5), 0), 6);
      const s = 1 + beat * 0.22;
      a.scale.setScalar(s);
      b.scale.setScalar(s);
    },
  };
}

function buildMask() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0.1);
  s.bezierCurveTo(0.14, 0.2, 0.44, 0.27, 0.68, 0.19);
  s.bezierCurveTo(0.76, 0.1, 0.73, -0.07, 0.6, -0.15);
  s.bezierCurveTo(0.44, -0.25, 0.2, -0.2, 0.09, -0.1);
  s.bezierCurveTo(0.05, -0.06, -0.05, -0.06, -0.09, -0.1);
  s.bezierCurveTo(-0.2, -0.2, -0.44, -0.25, -0.6, -0.15);
  s.bezierCurveTo(-0.73, -0.07, -0.76, 0.1, -0.68, 0.19);
  s.bezierCurveTo(-0.44, 0.27, -0.14, 0.2, 0, 0.1);
  for (const x of [HEAD.eyeX, -HEAD.eyeX]) {
    const h = new THREE.Path();
    h.absellipse(x, 0.0, 0.15, 0.085, 0, Math.PI * 2, x < 0, x > 0 ? -0.15 : 0.15);
    s.holes.push(h);
  }
  const geo = wrapZ(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 32 }), 0.55);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x5a1f8c, metalness: 0.55, roughness: 0.28, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.5 });
  g.add(new THREE.Mesh(geo, mat));
  const gold = MAT.gold();
  const trim = new THREE.Shape(s.getPoints(64));
  g.add(new THREE.Mesh(outlineTube(trim, 0.014, 0.045, 0.55), gold));
  const colors = [0xff3fa4, 0x9b5cff, 0x22d3ee];
  colors.forEach((c, i) => {
    const f = new THREE.Mesh(taperedTube([[0, 0, 0], [0.05, 0.25, -0.02], [0.02, 0.55, -0.05]], 0.05, 0.004, { segs: 20, radial: 6 }), MAT.matte(c, 0.6));
    f.scale.set(1, 1, 0.3);
    f.position.set(0.62, 0.12, -0.2);
    f.rotation.z = -0.55 + i * 0.3;
    g.add(f);
  });
  for (let i = 0; i < 5; i++) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), MAT.gem([0x22d3ee, 0xff3fa4][i % 2]));
    const x = -0.4 + i * 0.2;
    gem.position.set(x, 0.2 - Math.abs(x) * 0.05, 0.06 - 0.55 * x * x);
    g.add(gem);
  }
  g.position.set(0, 0.0, 0.26);
  return { group: g };
}

// ---------- Ansikte ----------
function buildMustache() {
  const mat = MAT.matte(0x2a1a10, 0.7);
  const half = () =>
    new THREE.Mesh(
      taperedTube([[0.0, -0.64, 0.44], [0.14, -0.67, 0.41], [0.3, -0.63, 0.34], [0.42, -0.52, 0.27], [0.38, -0.43, 0.27]], 0.07, 0.012, {
        ease: (t) => Math.pow(t, 0.8),
      }),
      mat,
    );
  const g = new THREE.Group();
  g.add(half(), mirrorX(half()));
  return { group: g };
}

function buildMonocle() {
  const g = new THREE.Group();
  const gold = MAT.gold();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 16, 48), gold);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 40),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, roughness: 0, clearcoat: 1, depthWrite: false }),
  );
  const m = new THREE.Group();
  m.add(ring, glass);
  m.position.set(HEAD.eyeX, 0.0, 0.22);
  const chain = new THREE.Mesh(taperedTube([[HEAD.eyeX + 0.12, -0.12, 0.2], [0.55, -0.5, 0.1], [0.62, -0.95, -0.1]], 0.008, 0.008, { segs: 30, radial: 6 }), gold);
  g.add(m, chain);
  return { group: g };
}

function buildClownNose() {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 24), new THREE.MeshPhysicalMaterial({ color: 0xff1a1a, roughness: 0.15, clearcoat: 1, emissive: 0x550000, emissiveIntensity: 0.4 }));
  mesh.position.set(HEAD.noseTip[0], HEAD.noseTip[1], HEAD.noseTip[2] + 0.04);
  const g = new THREE.Group();
  g.add(mesh);
  let squish = 0;
  return {
    group: g,
    update(dt, t, ctx) {
      squish = Math.max(0, squish - dt * 3);
      if (ctx.fresh) squish = 1;
      const s = 1 + Math.sin(squish * 18) * squish * 0.25;
      mesh.scale.set(s, 2 - s, s);
    },
  };
}

// ---------- Huvud ----------
function buildCatEars() {
  const g = new THREE.Group();
  const ear = new THREE.Shape();
  ear.moveTo(-0.22, 0);
  ear.quadraticCurveTo(-0.12, 0.3, 0.02, 0.46);
  ear.quadraticCurveTo(0.14, 0.28, 0.22, 0);
  ear.quadraticCurveTo(0, -0.04, -0.22, 0);
  const outer = new THREE.ExtrudeGeometry(ear, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  const inner = new THREE.ShapeGeometry(ear);
  const furMat = MAT.fur(0x2e2b36);
  const pink = MAT.matte(0xff8fb5, 0.6);
  const makeEar = () => {
    const piv = new THREE.Group();
    const o = new THREE.Mesh(outer, furMat);
    const i = new THREE.Mesh(inner, pink);
    i.scale.set(0.6, 0.62, 1);
    i.position.set(0.0, 0.06, 0.1);
    piv.add(o, i);
    piv.rotation.set(-0.25, 0, -0.32);
    return piv;
  };
  const r = makeEar();
  r.position.set(0.5, HEAD.crownY + 0.02, -0.5);
  const l = makeEar();
  l.position.copy(r.position);
  mirrorX(l);
  g.add(r, l);
  const noseShape = new THREE.Shape();
  noseShape.moveTo(-0.075, 0.03);
  noseShape.quadraticCurveTo(0, 0.05, 0.075, 0.03);
  noseShape.quadraticCurveTo(0.02, -0.05, 0, -0.055);
  noseShape.quadraticCurveTo(-0.02, -0.05, -0.075, 0.03);
  const nose = new THREE.Mesh(new THREE.ExtrudeGeometry(noseShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3 }), MAT.gloss(0xff7aa8));
  nose.position.set(HEAD.noseTip[0], HEAD.noseTip[1] + 0.01, HEAD.noseTip[2] + 0.02);
  g.add(nose);
  const whiskerMat = MAT.matte(0xf5f0ff, 0.5);
  const whiskers = new THREE.Group();
  for (const side of [1, -1]) {
    for (let k = 0; k < 3; k++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, 0.55, 6), whiskerMat);
      w.rotation.z = side * (Math.PI / 2 + (k - 1) * 0.16);
      w.position.set(side * 0.45, -0.6 + (1 - k) * 0.05 - (k - 1) * 0.02, 0.28);
      whiskers.add(w);
    }
  }
  g.add(whiskers);
  let twitch = 0;
  let next = 2;
  return {
    group: g,
    update(dt, t) {
      next -= dt;
      if (next < 0) {
        twitch = 1;
        next = 2 + Math.random() * 4;
      }
      twitch = Math.max(0, twitch - dt * 4);
      const k = Math.sin(twitch * 20) * twitch * 0.25;
      r.rotation.z = -0.32 - k;
      l.rotation.z = 0.32 + k * 0.5;
      whiskers.rotation.z = Math.sin(t * 3) * 0.02;
    },
  };
}

function buildBunnyEars() {
  const g = new THREE.Group();
  const outerGeo = new THREE.CapsuleGeometry(0.12, 0.75, 8, 20);
  const innerGeo = new THREE.CapsuleGeometry(0.07, 0.6, 8, 16);
  const white = MAT.fur(0xf6f2f8);
  const pink = MAT.matte(0xffa3c4, 0.6);
  const make = (side) => {
    const piv = new THREE.Group();
    const o = new THREE.Mesh(outerGeo, white);
    o.scale.z = 0.42;
    o.position.y = 0.47;
    const i = new THREE.Mesh(innerGeo, pink);
    i.scale.z = 0.3;
    i.position.set(0, 0.47, 0.04);
    piv.add(o, i);
    piv.position.set(side * 0.27, HEAD.crownY + 0.05, -0.62);
    piv.userData.base = side * -0.14;
    piv.userData.vel = 0;
    piv.userData.ang = 0;
    return piv;
  };
  const r = make(1);
  const l = make(-1);
  g.add(r, l);
  return {
    group: g,
    update(dt, t, ctx) {
      for (const e of [r, l]) {
        const u = e.userData;
        const force = -(ctx.angVel?.z ?? 0) * 0.35 - (ctx.angVel?.y ?? 0) * 0.1;
        u.vel += (-u.ang * 60 - u.vel * 6 + force * 40) * dt;
        u.ang += u.vel * dt;
        e.rotation.z = u.base + u.ang;
        e.rotation.x = -0.2 + Math.sin(t * 1.3 + u.base * 10) * 0.03;
      }
    },
  };
}

function buildCrown() {
  const g = new THREE.Group();
  const gold = MAT.gold();
  gold.side = THREE.DoubleSide;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.62, 0.26, 64, 1, true), gold);
  g.add(band);
  const spikeGeo = new THREE.ConeGeometry(0.085, 0.3, 4);
  const pearl = MAT.gloss(0xfff6ea);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sp = new THREE.Mesh(spikeGeo, gold);
    sp.position.set(Math.sin(a) * 0.645, 0.13 + 0.15, Math.cos(a) * 0.645);
    sp.rotation.y = a + Math.PI / 4;
    g.add(sp);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), pearl);
    p.position.set(Math.sin(a) * 0.645, 0.13 + 0.32, Math.cos(a) * 0.645);
    g.add(p);
  }
  const gemCols = [0xff2244, 0x2266ff, 0x22dd77, 0x2266ff, 0xff2244];
  gemCols.forEach((c, i) => {
    const a = (i - 2) * 0.42;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), MAT.gem(c));
    gem.scale.z = 0.5;
    gem.position.set(Math.sin(a) * 0.66, 0.0, Math.cos(a) * 0.66);
    gem.rotation.y = a;
    g.add(gem);
  });
  const velvet = new THREE.Mesh(new THREE.SphereGeometry(0.61, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), MAT.fur(0x9b0f2e));
  velvet.scale.y = 0.55;
  velvet.position.y = 0.1;
  g.add(velvet);
  g.position.set(0, HEAD.crownY + 0.12, HEAD.crownZ);
  g.rotation.x = -0.24;
  return { group: g };
}

function glowSprite(color, size) {
  const tex = canvasTexture(128, 128, (c, w, h) => {
    const grad = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size);
  return s;
}

function buildHalo() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 20, 96), MAT.glow(0xffe38a, 3));
  ring.rotation.x = Math.PI / 2 - 0.4;
  const glow = glowSprite(0xffd966, 1.9);
  glow.scale.set(1.9, 0.9, 1);
  g.add(ring, glow);
  g.position.set(0, 1.75, -0.7);
  return {
    group: g,
    update(dt, t) {
      g.position.y = 1.75 + Math.sin(t * 2) * 0.04;
      ring.rotation.z = t * 0.4;
    },
  };
}

function buildDevilHorns() {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.25, clearcoat: 1, emissive: 0x400008, emissiveIntensity: 0.6 });
  const horn = () => {
    const m = new THREE.Mesh(
      taperedTube([[0, 0, 0], [0.05, 0.2, 0.02], [0.17, 0.38, 0.0], [0.33, 0.47, -0.04]], 0.12, 0.006, { ease: (t) => Math.pow(t, 0.75) }),
      mat,
    );
    m.position.set(0.36, HEAD.crownY - 0.02, -0.34);
    return m;
  };
  const g = new THREE.Group();
  g.add(horn(), mirrorX(horn()));
  return { group: g };
}

function buildPartyHat() {
  const tex = canvasTexture(512, 512, (c, w, h) => {
    const cols = ['#ff3fa4', '#ffd23f', '#22d3ee', '#9b5cff'];
    for (let i = -4; i < 14; i++) {
      c.fillStyle = cols[(i + 8) % cols.length];
      c.beginPath();
      c.moveTo(i * 64, 0);
      c.lineTo(i * 64 + 64, 0);
      c.lineTo(i * 64 + 64 - 200, h);
      c.lineTo(i * 64 - 200, h);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 40; i++) {
      c.beginPath();
      c.arc((i * 97) % w, (i * 53) % h, 9, 0, Math.PI * 2);
      c.fill();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.95, 48, 1, true), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.6, side: THREE.DoubleSide }));
  const pom = new THREE.Group();
  const pomCols = [0xff3fa4, 0xffd23f, 0x22d3ee, 0x9b5cff, 0x5cff9b, 0xff7a3f];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), MAT.matte(pomCols[i % pomCols.length], 0.9));
    const a = i * 2.4;
    const r = 0.06;
    s.position.set(Math.cos(a) * r, Math.sin(i * 1.7) * r, Math.sin(a) * r);
    pom.add(s);
  }
  pom.position.y = 0.52;
  const fringe = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 10, 48), MAT.gloss(0xffd23f));
  fringe.rotation.x = Math.PI / 2;
  fringe.position.y = -0.47;
  const g = new THREE.Group();
  g.add(hat, pom, fringe);
  g.position.set(0.28, HEAD.crownY + 0.44, -0.55);
  g.rotation.set(-0.12, 0, -0.38);
  return {
    group: g,
    update(dt, t, ctx) {
      pom.rotation.y = t * 1.5;
      pom.position.x = Math.sin(t * 3) * 0.01 + (ctx.angVel?.z ?? 0) * -0.02;
    },
  };
}

function buildTopHat() {
  const g = new THREE.Group();
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0c0c12, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0x444455) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.47, 0.78, 48), black);
  body.position.y = 0.39;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.035, 64), black);
  brim.scale.z = 0.92;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.478, 0.476, 0.13, 48), MAT.matte(0x8c1024, 0.6));
  band.position.y = 0.1;
  g.add(body, brim, band);
  g.position.set(0, HEAD.crownY + 0.02, HEAD.crownZ);
  g.rotation.set(-0.16, 0, 0.1);
  return { group: g };
}

function buildViking() {
  const g = new THREE.Group();
  const steel = MAT.steel();
  steel.side = THREE.DoubleSide;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.83, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), steel);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.83, 0.065, 12, 64), MAT.gold());
  band.rotation.x = Math.PI / 2;
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.045, 10, 48, Math.PI), MAT.gold());
  ridge.rotation.y = Math.PI / 2;
  g.add(dome, band, ridge);
  const rivet = new THREE.SphereGeometry(0.03, 10, 8);
  const rivMat = MAT.silver();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = new THREE.Mesh(rivet, rivMat);
    r.position.set(Math.sin(a) * 0.885, 0, Math.cos(a) * 0.885);
    g.add(r);
  }
  const bone = new THREE.MeshPhysicalMaterial({ color: 0xf1e4c6, roughness: 0.35, clearcoat: 0.5 });
  const horn = () => {
    const m = new THREE.Mesh(
      taperedTube([[0, 0, 0], [0.25, 0.07, 0.04], [0.46, 0.3, 0.07], [0.52, 0.62, 0.02]], 0.13, 0.008, { ease: (t) => Math.pow(t, 0.8) }),
      bone,
    );
    m.position.set(0.72, 0.28, 0);
    return m;
  };
  g.add(horn(), mirrorX(horn()));
  g.position.set(0, 0.62, -0.8);
  g.rotation.x = -0.12;
  return { group: g };
}

function buildFlowerCrown() {
  const g = new THREE.Group();
  const petals = [];
  const centers = [];
  const leaves = [];
  const palette = [0xffffff, 0xffe14d, 0xff8fc7, 0x6fa8ff, 0xb98cff, 0xff5e6e, 0xffffff, 0xffb14d];
  const N = 16;
  const R = HEAD.crownR + 0.05;
  const up = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const pos = new THREE.Vector3(Math.sin(a) * R, Math.sin(a * 3) * 0.02, Math.cos(a) * R);
    const normal = new THREE.Vector3(Math.sin(a), 0.35, Math.cos(a)).normalize();
    const color = new THREE.Color(palette[i % palette.length]);
    const size = 0.9 + ((i * 37) % 10) / 25;
    const basis = new THREE.Matrix4().lookAt(new THREE.Vector3(), normal, up);
    const n = 6;
    for (let k = 0; k < n; k++) {
      const pa = (k / n) * Math.PI * 2 + i;
      const local = new THREE.Vector3(Math.cos(pa) * 0.075 * size, Math.sin(pa) * 0.075 * size, 0).applyMatrix4(basis);
      d.position.copy(pos).add(local);
      d.quaternion.setFromRotationMatrix(basis);
      d.rotateZ(pa);
      d.scale.set(1.1 * size, 0.55 * size, 0.3 * size);
      d.updateMatrix();
      petals.push([d.matrix.clone(), color]);
    }
    d.position.copy(pos).addScaledVector(normal, 0.02);
    d.quaternion.identity();
    d.scale.setScalar(size);
    d.updateMatrix();
    centers.push(d.matrix.clone());
    const la = a + Math.PI / N;
    d.position.set(Math.sin(la) * (R - 0.02), -0.02, Math.cos(la) * (R - 0.02));
    d.quaternion.setFromEuler(new THREE.Euler(0, la + Math.PI / 2, 0.4));
    d.scale.set(1.6, 0.5, 0.25);
    d.updateMatrix();
    leaves.push(d.matrix.clone());
  }
  const petalMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 14, 10), MAT.matte(0xffffff, 0.55), petals.length);
  petals.forEach(([m, c], i) => {
    petalMesh.setMatrixAt(i, m);
    petalMesh.setColorAt(i, c);
  });
  const centerMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.038, 12, 8), MAT.matte(0xffb300, 0.6), centers.length);
  centers.forEach((m, i) => centerMesh.setMatrixAt(i, m));
  const leafMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 12, 8), MAT.matte(0x3f9a4c, 0.5), leaves.length);
  leaves.forEach((m, i) => leafMesh.setMatrixAt(i, m));
  g.add(petalMesh, centerMesh, leafMesh);
  g.position.set(0, HEAD.crownY - 0.02, HEAD.crownZ);
  g.rotation.x = -0.26;
  return { group: g };
}

function buildTomte() {
  const g = new THREE.Group();
  const red = MAT.fur(0xc8102e);
  const hat = new THREE.Mesh(
    taperedTube([[0, 0, 0], [0, 0.35, 0.0], [0.08, 0.65, -0.06], [0.33, 0.82, -0.1], [0.56, 0.72, -0.06]], 0.64, 0.05, {
      ease: (t) => Math.pow(t, 0.72),
      segs: 48,
      radial: 32,
    }),
    red,
  );
  const white = MAT.fur(0xfaf7f2);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.13, 18, 64), white);
  rim.rotation.x = Math.PI / 2;
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), white);
  pom.position.set(0.58, 0.68, -0.05);
  g.add(hat, rim, pom);
  g.position.set(0, HEAD.crownY - 0.08, HEAD.crownZ);
  g.rotation.x = -0.2;
  return {
    group: g,
    update(dt, t, ctx) {
      pom.position.y = 0.68 + Math.sin(t * 2.2) * 0.02 - (ctx.angVel?.x ?? 0) * 0.02;
    },
  };
}

function buildHeadset() {
  const g = new THREE.Group();
  const black = MAT.black();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.065, 14, 64, Math.PI), black);
  arc.scale.y = 1.42;
  arc.position.set(0, -0.12, -0.8);
  g.add(arc);
  const ringMat = MAT.glow(0x22d3ee, 2.5);
  const cup = (side) => {
    const c = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.31, 0.24, 48), black);
    shell.rotation.z = Math.PI / 2;
    const pad = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 14, 40), MAT.matte(0x1b1b24, 0.9));
    pad.rotation.y = Math.PI / 2;
    pad.position.x = -side * 0.12;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 10, 48), ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * 0.125;
    c.add(shell, pad, ring);
    c.position.set(side * 0.96, -0.18, -0.8);
    return c;
  };
  g.add(cup(1), cup(-1));
  const boom = new THREE.Mesh(taperedTube([[-1.0, -0.3, -0.62], [-0.85, -0.62, -0.2], [-0.5, -0.86, 0.18], [-0.22, -0.9, 0.3]], 0.028, 0.022, { segs: 30, radial: 8 }), black);
  const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.08, 6, 12), black);
  tip.rotation.z = Math.PI / 2;
  tip.position.set(-0.2, -0.9, 0.31);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), MAT.glow(0xff2040, 3));
  led.position.set(-0.16, -0.86, 0.34);
  g.add(boom, tip, led);
  const col = new THREE.Color();
  return {
    group: g,
    update(dt, t, ctx) {
      col.setHSL((t * 0.12) % 1, 0.9, 0.55);
      ringMat.color.copy(col);
      ringMat.emissive.copy(col);
      ringMat.emissiveIntensity = 1.8 + (ctx.audio ?? 0) * 4;
    },
  };
}

function buildSpaceHelmet() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1.62, 64, 40),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0.1, clearcoat: 1, depthWrite: false, envMapIntensity: 3 }),
  );
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(1.625, 64, 40),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; void main(){ float f = pow(1.0 - abs(vN.z), 3.0); gl_FragColor = vec4(vec3(0.55, 0.85, 1.0) * f * 0.9, f); }`,
    }),
  );
  glass.position.set(0, -0.05, -0.72);
  rim.position.copy(glass.position);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 20, 64), MAT.silver());
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, -1.5, -0.72);
  const goldRing = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.05, 12, 64), MAT.gold());
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.set(0, -1.34, -0.72);
  g.add(glass, rim, collar, goldRing);
  return { group: g };
}

export const ACCESSORIES = [
  { id: 'sunglasses', name: 'Solglasögon', icon: '🕶️', slot: 'eyes', desc: 'Pilotglasögon i guld med regnbågsskimrande glas.', build: buildSunglasses },
  { id: 'dealwithit', name: 'Deal with it', icon: '😎', slot: 'eyes', desc: 'Pixelglasögon som faller ner från himlen. Legendariskt.', build: buildDealWithIt },
  { id: 'nerd', name: 'Nördglasögon', icon: '🤓', slot: 'eyes', desc: 'Tjocka svarta bågar med tejp på mitten.', build: buildNerd },
  { id: 'heartEyes', name: 'Hjärtögon', icon: '😍', slot: 'eyes', desc: 'Pulserande hjärtan över ögonen – kär!', build: buildHeartEyes },
  { id: 'mask', name: 'Maskeradmask', icon: '🎭', slot: 'eyes', desc: 'Mystisk venetiansk mask med fjädrar och ädelstenar.', build: buildMask },
  { id: 'crown', name: 'Krona', icon: '👑', slot: 'head', desc: 'Guldkrona med pärlor, ädelstenar och sammetsinsida.', build: buildCrown },
  { id: 'catEars', name: 'Kattöron', icon: '🐱', slot: 'head', desc: 'Kattöron som vickar, nos och morrhår.', build: buildCatEars },
  { id: 'bunnyEars', name: 'Kaninöron', icon: '🐰', slot: 'head', desc: 'Långa öron som svajar med fysik när du rör huvudet.', build: buildBunnyEars },
  { id: 'devilHorns', name: 'Djävulshorn', icon: '😈', slot: 'head', desc: 'Blanka röda horn för den lilla busen.', build: buildDevilHorns },
  { id: 'partyHat', name: 'Partyhatt', icon: '🥳', slot: 'head', desc: 'Randig kalashatt med snurrande pompom.', build: buildPartyHat },
  { id: 'topHat', name: 'Cylinderhatt', icon: '🎩', slot: 'head', desc: 'Klassisk gentlemannahatt.', build: buildTopHat },
  { id: 'viking', name: 'Vikingahjälm', icon: '⚔️', slot: 'head', desc: 'Stålhjälm med guldband och horn (historiskt fel, men snyggt).', build: buildViking },
  { id: 'flowerCrown', name: 'Midsommarkrans', icon: '🌼', slot: 'head', desc: 'Blomsterkrans med prästkragar, blåklint och smörblommor.', build: buildFlowerCrown },
  { id: 'tomte', name: 'Tomteluva', icon: '🎅', slot: 'head', desc: 'Röd tomteluva i sammet med vit pälskant och tofs.', build: buildTomte },
  { id: 'halo', name: 'Gloria', icon: '😇', slot: 'above', desc: 'Svävande glödande gloria.', build: buildHalo },
  { id: 'clownNose', name: 'Clownnäsa', icon: '🔴', slot: 'nose', desc: 'Blank röd clownnäsa som studsar när den dyker upp.', build: buildClownNose },
  { id: 'mustache', name: 'Mustasch', icon: '🥸', slot: 'mouth', desc: 'Pampig styrstångsmustasch med uppvridna spetsar.', build: buildMustache },
  { id: 'monocle', name: 'Monokel', icon: '🧐', slot: 'eye1', desc: 'Guldmonokel med kedja. Mycket distingerat.', build: buildMonocle },
  { id: 'headset', name: 'Gamer-headset', icon: '🎧', slot: 'ears', desc: 'Headset med RGB-ringar som pulserar med rösten.', build: buildHeadset },
  { id: 'spaceHelmet', name: 'Rymdhjälm', icon: '🧑‍🚀', slot: 'helmet', desc: 'Glaskupa med skimrande kant – redo för rymdpromenad.', build: buildSpaceHelmet },
  ...MORE_ACCESSORIES,
];
export const ACCESSORY_MAP = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a]));

/** Hanterar val: bara ett föremål per plats (huvud, ögon). */
export function toggleAccessory(list, id) {
  const def = ACCESSORY_MAP[id];
  if (!def) return list;
  if (list.includes(id)) return list.filter((x) => x !== id);
  const exclusive = ['head', 'eyes', 'beard'];
  const kept = exclusive.includes(def.slot) ? list.filter((x) => ACCESSORY_MAP[x]?.slot !== def.slot) : list;
  return [...kept, id];
}
