// Fler procedurella tillbehör: hattar, masker, skägg m.m.
// Samma koordinater som accessories.js: 1 = avståndet mellan ögonens yttre
// hörn, origo mellan ögonen, +y upp, +z mot kameran.
import * as THREE from 'three';
import { taperedTube, wrapZ, MAT, HEAD } from './geometry.js';

const mirrorX = (obj) => {
  obj.position.x *= -1;
  obj.rotation.y *= -1;
  obj.rotation.z *= -1;
  obj.scale.x *= -1;
  return obj;
};

const felt = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.78, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.3) });
const cloth = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, sheen: 0.7, sheenColor: new THREE.Color(0xffffff) });

/** Sätt en hatt på huvudtoppen. */
const onCrown = (g, dy = 0, dz = 0, tilt = -0.2) => {
  g.position.set(0, HEAD.crownY + dy, HEAD.crownZ + dz);
  g.rotation.x = tilt;
  return g;
};

// ---------- Hattar ----------
function buildTiara() {
  const g = new THREE.Group();
  const silver = MAT.silver();
  const N = 9;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.025, 10, 64, Math.PI * 0.95), silver);
  band.rotation.set(Math.PI / 2, 0, Math.PI * 0.025);
  g.add(band);
  for (let i = 0; i < N; i++) {
    const k = (i / (N - 1)) * 2 - 1;
    const a = k * 1.35;
    const h = 0.12 + (1 - Math.abs(k)) * 0.22;
    const spike = new THREE.Mesh(taperedTube([[0, 0, 0], [0, h * 0.6, 0.01], [0, h, 0]], 0.03, 0.006, { segs: 10, radial: 6 }), silver);
    spike.position.set(Math.sin(a) * 0.64, 0, Math.cos(a) * 0.64);
    spike.rotation.y = a;
    g.add(spike);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(i === (N - 1) / 2 ? 0.07 : 0.035), MAT.gem(i === (N - 1) / 2 ? 0xff2d7a : 0xbfe9ff));
    gem.position.set(Math.sin(a) * 0.645, h + 0.02, Math.cos(a) * 0.645);
    g.add(gem);
  }
  return { group: onCrown(g, -0.06, 0.06, -0.35) };
}

function buildWizardHat() {
  const g = new THREE.Group();
  const mat = felt(0x3b2a8f);
  mat.side = THREE.DoubleSide;
  const cone = new THREE.Mesh(
    taperedTube([[0, 0, 0], [0, 0.55, 0], [0.04, 1.0, -0.05], [0.25, 1.3, -0.12], [0.5, 1.35, -0.1]], 0.66, 0.02, { ease: (t) => Math.pow(t, 0.8), segs: 48, radial: 40 }),
    mat,
  );
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.035, 64), mat);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.67, 0.14, 48, 1, true), MAT.gold());
  band.position.y = 0.08;
  g.add(cone, brim, band);
  const starMat = MAT.glow(0xffd84a, 1.6);
  const stars = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), starMat);
    const a = i * 2.3;
    const y = 0.15 + (i / 9) * 0.75;
    const r = 0.66 * (1 - y / 1.25) + 0.02;
    s.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    g.add(s);
    stars.push(s);
  }
  onCrown(g, -0.05, 0, -0.22);
  return {
    group: g,
    update(dt, t) {
      stars.forEach((s, i) => s.rotation.set(t * 1.2 + i, t * 0.8, 0));
      starMat.emissiveIntensity = 1.3 + Math.sin(t * 3) * 0.4;
    },
  };
}

function buildPirateHat() {
  const g = new THREE.Group();
  const black = felt(0x15131a);
  black.side = THREE.DoubleSide;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.68, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), black);
  crown.scale.y = 0.7;
  const brimGeo = new THREE.CylinderGeometry(1.12, 1.12, 0.04, 120, 3);
  const p = brimGeo.attributes.position;
  const lift = (x, z) => {
    const r = Math.hypot(x, z);
    const a = Math.atan2(x, z);
    const k = Math.max(0, r - 0.62);
    return k * 1.1 * Math.pow(0.5 + 0.5 * Math.cos(3 * a), 0.6);
  };
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + lift(p.getX(i), p.getZ(i)));
  brimGeo.computeVertexNormals();
  const brim = new THREE.Mesh(brimGeo, black);
  brim.rotation.y = Math.PI / 3;
  const edge = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const x = Math.sin(a) * 1.12;
    const z = Math.cos(a) * 1.12;
    edge.push([x, lift(x, z) + 0.02, z]);
  }
  const trim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge.map((e) => new THREE.Vector3(...e)), true), 240, 0.025, 6, true), MAT.gold());
  trim.rotation.y = Math.PI / 3;
  g.add(crown, brim, trim);
  // dödskalle
  const bone = MAT.gloss(0xf4efe2);
  const skull = new THREE.Group();
  skull.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), bone));
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), MAT.black());
    eye.position.set(s * 0.04, 0.01, 0.09);
    skull.add(eye);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.26, 4, 8), bone);
    b.rotation.z = s * 0.8;
    b.position.set(0, -0.13, -0.01);
    skull.add(b);
  }
  skull.position.set(0, 0.42, 0.62);
  skull.rotation.x = -0.3;
  g.add(skull);
  return { group: onCrown(g, -0.08, 0.02, -0.22) };
}

function buildCowboyHat() {
  const g = new THREE.Group();
  const mat = felt(0x9a6a3c);
  mat.side = THREE.DoubleSide;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 48), mat);
  crown.position.y = 0.3;
  const dent = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 12), mat);
  dent.scale.set(1, 0.25, 1.05);
  dent.position.y = 0.6;
  const brimGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.04, 96, 3);
  const p = brimGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    p.setY(i, p.getY(i) + Math.max(0, Math.abs(x) - 0.55) ** 2 * 0.75 - Math.max(0, r - 0.7) * Math.max(0, z) * 0.08);
  }
  brimGeo.computeVertexNormals();
  const brim = new THREE.Mesh(brimGeo, mat);
  brim.scale.z = 0.85;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.585, 0.59, 0.1, 48, 1, true), MAT.matte(0x3b2414, 0.6));
  band.position.y = 0.06;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), MAT.silver());
  buckle.position.set(0, 0.06, 0.59);
  g.add(crown, dent, brim, band, buckle);
  return { group: onCrown(g, -0.06, 0.02, -0.18) };
}

function buildChefHat() {
  const g = new THREE.Group();
  const white = cloth(0xfbfbfd);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.32, 48, 1, true), white);
  band.material.side = THREE.DoubleSide;
  band.position.y = 0.16;
  g.add(band);
  const puffs = [[0, 0.62, 0, 0.5], [0.38, 0.55, 0.12, 0.33], [-0.38, 0.55, 0.12, 0.33], [0.2, 0.58, -0.35, 0.34], [-0.22, 0.58, -0.33, 0.34], [0, 0.5, 0.42, 0.3]];
  for (const [x, y, z, r] of puffs) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), white);
    m.position.set(x, y, z);
    m.scale.y = 0.85;
    g.add(m);
  }
  return { group: onCrown(g, -0.04, 0, -0.16) };
}

function buildPilotCap() {
  const g = new THREE.Group();
  const navy = felt(0x14213d);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.66, 0.36, 48), navy);
  crown.position.y = 0.2;
  crown.scale.z = 0.95;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.665, 0.665, 0.14, 48, 1, true), MAT.black());
  band.position.y = 0.07;
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.03, 48, 1, false, -Math.PI / 2, Math.PI), MAT.black());
  visor.position.set(0, 0.0, 0.18);
  visor.rotation.x = 0.25;
  visor.scale.z = 0.75;
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.016, 8, 48, Math.PI * 0.7), MAT.gold());
  cord.rotation.set(Math.PI / 2, 0, Math.PI * 0.15);
  cord.position.y = 0.12;
  const badge = new THREE.Group();
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), MAT.gold());
    wing.scale.set(1.4, 0.35, 0.3);
    wing.position.x = s * 0.12;
    wing.rotation.z = -s * 0.25;
    badge.add(wing);
  }
  badge.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), MAT.gold()));
  badge.position.set(0, 0.24, 0.73);
  g.add(crown, band, visor, cord, badge);
  return { group: onCrown(g, -0.1, 0.05, -0.25) };
}

function buildSailorCap() {
  const g = new THREE.Group();
  const blue = felt(0x2b5fd0);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.64, 0.24, 48), blue);
  body.position.y = 0.14;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.72, 0.06, 48), blue);
  top.position.y = 0.28;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.646, 0.646, 0.1, 48, 1, true), MAT.black());
  band.position.y = 0.05;
  const ribbons = [];
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.01), MAT.black());
    r.position.set(s * 0.06, -0.12, -0.66);
    r.rotation.z = s * 0.15;
    ribbons.push(r);
  }
  g.add(body, top, band, ...ribbons);
  onCrown(g, -0.02, 0.0, -0.32);
  g.rotation.z = 0.12;
  return {
    group: g,
    update(dt, t) {
      ribbons.forEach((r, i) => (r.rotation.x = Math.sin(t * 2 + i) * 0.12));
    },
  };
}

function buildBaseballCap() {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x0f1220, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0x00f0ff) });
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.7, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  crown.scale.y = 0.72;
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 48, 1, false, -Math.PI / 2, Math.PI), mat);
  visor.position.set(0, 0.0, 0.42);
  visor.scale.z = 0.95;
  visor.rotation.x = 0.12;
  const edge = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 8, 48, Math.PI), MAT.glow(0xff2bd6, 2));
  edge.rotation.set(Math.PI / 2, 0, Math.PI);
  edge.position.set(0, 0.0, 0.42);
  edge.scale.y = 0.95;
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), MAT.glow(0x00f0ff, 2.2));
  logo.position.set(0, 0.28, 0.63);
  logo.rotation.x = -0.45;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat);
  button.position.y = 0.5;
  g.add(crown, visor, edge, logo, button);
  return { group: onCrown(g, -0.18, 0.06, -0.12) };
}

function buildBow() {
  const g = new THREE.Group();
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xff3fa4, roughness: 0.35, sheen: 1, sheenColor: new THREE.Color(0xffb6d9), clearcoat: 0.4 });
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), pink);
    loop.scale.set(1.25, 0.8, 0.45);
    loop.position.x = s * 0.2;
    loop.rotation.z = s * 0.25;
    g.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), pink);
  g.add(knot);
  g.position.set(0.48, HEAD.crownY + 0.05, HEAD.crownZ + 0.35);
  g.rotation.set(-0.2, 0.3, -0.35);
  return { group: g };
}

function buildAntennae() {
  const g = new THREE.Group();
  const stalkMat = MAT.gloss(0x39ff88);
  const balls = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    const stalk = new THREE.Mesh(taperedTube([[0, 0, 0], [s * 0.05, 0.25, 0.02], [s * 0.14, 0.48, 0.0]], 0.025, 0.015, { segs: 14, radial: 6 }), stalkMat);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), MAT.glow(0x39ff88, 2.4));
    ball.position.set(s * 0.14, 0.52, 0);
    piv.add(stalk, ball);
    piv.position.set(s * 0.28, HEAD.crownY + 0.05, HEAD.crownZ + 0.1);
    piv.userData = { s, v: 0, a: 0 };
    g.add(piv);
    balls.push(piv);
  }
  return {
    group: g,
    update(dt, t, ctx) {
      for (const p of balls) {
        const u = p.userData;
        const force = -(ctx.angVel?.z ?? 0) * 0.3 + Math.sin(t * 3 + u.s) * 0.2 + (ctx.audio ?? 0) * Math.sin(t * 20) * 2;
        u.v += (-u.a * 70 - u.v * 5 + force * 30) * dt;
        u.a += u.v * dt;
        p.rotation.z = u.a * 0.4;
      }
    },
  };
}

// ---------- Ansikte ----------
function buildEyePatch() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.2, 0.16, 0, Math.PI * 2);
  const patch = new THREE.Mesh(wrapZ(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 }), 0.6), MAT.matte(0x0d0c10, 0.6));
  patch.position.set(-HEAD.eyeX, 0.0, 0.28);
  const strap = MAT.matte(0x0d0c10, 0.6);
  const s1 = new THREE.Mesh(taperedTube([[-HEAD.eyeX + 0.15, 0.1, 0.27], [0.0, 0.32, 0.36], [0.4, 0.5, 0.25], [0.72, 0.55, -0.15], [0.86, 0.45, -0.6]], 0.016, 0.016, { segs: 40, radial: 6 }), strap);
  const s2 = new THREE.Mesh(taperedTube([[-HEAD.eyeX - 0.18, 0.02, 0.22], [-0.68, -0.02, -0.05], [-0.84, -0.06, -0.55]], 0.016, 0.016, { segs: 30, radial: 6 }), strap);
  g.add(patch, s1, s2);
  return { group: g };
}

function buildHeroMask() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.07);
  s.bezierCurveTo(0.15, 0.17, 0.45, 0.2, 0.66, 0.13);
  s.bezierCurveTo(0.76, 0.1, 0.74, -0.08, 0.62, -0.14);
  s.bezierCurveTo(0.45, -0.22, 0.2, -0.17, 0.1, -0.09);
  s.bezierCurveTo(0.05, -0.05, -0.05, -0.05, -0.1, -0.09);
  s.bezierCurveTo(-0.2, -0.17, -0.45, -0.22, -0.62, -0.14);
  s.bezierCurveTo(-0.74, -0.08, -0.76, 0.1, -0.66, 0.13);
  s.bezierCurveTo(-0.45, 0.2, -0.15, 0.17, 0, 0.07);
  for (const x of [HEAD.eyeX, -HEAD.eyeX]) {
    const h = new THREE.Path();
    h.absellipse(x, 0.0, 0.14, 0.08, 0, Math.PI * 2, x < 0, x > 0 ? -0.18 : 0.18);
    s.holes.push(h);
  }
  const geo = wrapZ(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 3, curveSegments: 32 }), 0.55);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xd61f3c, roughness: 0.3, clearcoat: 1, sheen: 0.5, sheenColor: new THREE.Color(0xff8090) });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  g.position.set(0, 0.0, 0.25);
  return { group: g };
}

function beardCurve() {
  return new THREE.CatmullRomCurve3(
    [
      [-0.78, -0.05, -0.62],
      [-0.72, -0.5, -0.28],
      [-0.55, -0.95, 0.05],
      [-0.28, -1.22, 0.24],
      [0, -1.3, 0.3],
      [0.28, -1.22, 0.24],
      [0.55, -0.95, 0.05],
      [0.72, -0.5, -0.28],
      [0.78, -0.05, -0.62],
    ].map((p) => new THREE.Vector3(...p)),
  );
}

function makeBeard(color, { long = 0 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4) });
  const curve = beardCurve();
  const geo = new THREE.SphereGeometry(1, 16, 12);
  const N = 46;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u);
    const mid = 1 - Math.abs(u - 0.5) * 2;
    for (let layer = 0; layer < 2; layer++) {
      const r = (0.12 + mid * 0.07) * (layer ? 0.8 : 1);
      const m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(r);
      const jitter = Math.sin(i * 12.9898 + layer * 4.1) * 0.03;
      m.position.set(p.x * (layer ? 0.9 : 1) + jitter, p.y - layer * 0.08 * mid, p.z + (layer ? 0.04 : 0));
      g.add(m);
    }
  }
  // mustasch
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(taperedTube([[0, -0.6, 0.46], [s * 0.15, -0.64, 0.43], [s * 0.3, -0.72, 0.34], [s * 0.4, -0.86, 0.24]], 0.07, 0.03, { segs: 20, radial: 10 }), mat);
    g.add(m);
  }
  // långt skägg (tomte/trollkarl)
  const tail = [];
  for (let i = 0; i < long; i++) {
    const k = i / Math.max(1, long - 1);
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(0.42 * (1 - k * 0.6), 0.3, 0.28 * (1 - k * 0.4));
    m.position.set(0, -1.35 - i * 0.24, 0.22 - k * 0.15);
    g.add(m);
    tail.push(m);
  }
  return {
    group: g,
    update(dt, t, ctx) {
      tail.forEach((m, i) => (m.position.x = Math.sin(t * 1.6 - i * 0.6) * 0.02 * i - (ctx.angVel?.z ?? 0) * 0.01 * i));
    },
  };
}

const buildBeard = () => makeBeard(0x4a2c18);
const buildBeardWhite = () => makeBeard(0xf3f0ea, { long: 4 });

function buildNinjaMask() {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x111116, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0x3a3a55), side: THREE.DoubleSide });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.78, 1.15, 48, 6, true, -0.62 * Math.PI, 1.24 * Math.PI), mat);
  band.scale.set(0.82, 1, 0.96);
  band.position.set(0, -0.86, -0.45);
  g.add(band);
  const tieMat = MAT.matte(0xd61f3c, 0.7);
  const head = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 10, 64, Math.PI * 1.2), tieMat);
  head.rotation.set(Math.PI / 2, 0, -0.1 * Math.PI);
  head.scale.set(0.84, 1.0, 1);
  head.position.set(0, 0.42, -0.62);
  g.add(head);
  return { group: g };
}

export const MORE_ACCESSORIES = [
  { id: 'tiara', name: 'Tiara', icon: '👸', slot: 'head', desc: 'Glittrande silvertiara med diamanter – för prinsessor och drottningar.', build: buildTiara },
  { id: 'wizardHat', name: 'Trollkarlshatt', icon: '🧙', slot: 'head', desc: 'Spetsig trollkarlshatt med glödande stjärnor.', build: buildWizardHat },
  { id: 'pirateHat', name: 'Pirathatt', icon: '🏴‍☠️', slot: 'head', desc: 'Trekantig kaptenshatt med guldkant och dödskalle. Arrr!', build: buildPirateHat },
  { id: 'cowboyHat', name: 'Cowboyhatt', icon: '🤠', slot: 'head', desc: 'Läderhatt med uppvikt brätte. Yeehaw!', build: buildCowboyHat },
  { id: 'chefHat', name: 'Kockmössa', icon: '👨‍🍳', slot: 'head', desc: 'Pösig vit kockmössa – mästerkock!', build: buildChefHat },
  { id: 'pilotCap', name: 'Kaptensmössa', icon: '👨‍✈️', slot: 'head', desc: 'Pilotens mössa med guldvingar. "Kaptenen talar…"', build: buildPilotCap },
  { id: 'sailorCap', name: 'Sjömansmössa', icon: '⚓', slot: 'head', desc: 'Blå sjömansmössa med fladdrande band.', build: buildSailorCap },
  { id: 'baseballCap', name: 'Neonkeps', icon: '🧢', slot: 'head', desc: 'Svart keps med lysande neonkant.', build: buildBaseballCap },
  { id: 'bow', name: 'Rosett', icon: '🎀', slot: 'hair', desc: 'Stor rosa rosett i håret.', build: buildBow },
  { id: 'antennae', name: 'Antenner', icon: '👾', slot: 'hair', desc: 'Lysande gröna antenner som gungar när du pratar.', build: buildAntennae },
  { id: 'eyePatch', name: 'Ögonlapp', icon: '🏴', slot: 'eye1', desc: 'Piratens ögonlapp.', build: buildEyePatch },
  { id: 'heroMask', name: 'Hjältemask', icon: '🦸', slot: 'eyes', desc: 'Superhjältens röda ögonmask.', build: buildHeroMask },
  { id: 'beard', name: 'Helskägg', icon: '🧔', slot: 'beard', desc: 'Yvigt brunt helskägg med mustasch.', build: buildBeard },
  { id: 'beardWhite', name: 'Tomteskägg', icon: '🎅', slot: 'beard', desc: 'Långt vitt skägg – kung, tomte eller trollkarl.', build: buildBeardWhite },
  { id: 'ninjaMask', name: 'Ninjamask', icon: '🥷', slot: 'beard', desc: 'Svart ninjamask med rött pannband.', build: buildNinjaMask },
];

