// Byggklossar för procedurella figurer: material, ögon, munnar och en
// "ansiktskit" som animerar allt från riggen (blink, blick, käke, miner).
import * as THREE from 'three';
import { Spring, phys, glossBlack } from './base.js';
import { taperedTube } from '../render/ar/geometry.js';

export const col = (c) => new THREE.Color(c);
export const mix = (a, b, k) => `#${col(a).lerp(col(b), k).getHexString()}`;
export const shade = (c, k) => mix(c, '#000000', k);
export const tint = (c, k) => mix(c, '#ffffff', k);

export const MATS = {
  fur: (c, sheen = 0.5) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.88, sheen: 1, sheenRoughness: 0.45, sheenColor: col(c).lerp(col('#ffffff'), sheen) }),
  skin: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.52, clearcoat: 0.18, clearcoatRoughness: 0.6, sheen: 0.5, sheenRoughness: 0.6, sheenColor: col(c).lerp(col('#ffd9c4'), 0.5) }),
  gloss: (c, r = 0.3) => phys(c, { roughness: r, clearcoat: 1, clearcoatRoughness: 0.12 }),
  matte: (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r }),
  cloth: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.82, sheen: 0.8, sheenRoughness: 0.5, sheenColor: col(c).lerp(col('#ffffff'), 0.35) }),
  satin: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.38, sheen: 1, sheenRoughness: 0.25, sheenColor: col(c).lerp(col('#ffffff'), 0.6), clearcoat: 0.2 }),
  metal: (c, r = 0.22) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: r }),
  glow: (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.3, toneMapped: false }),
  inner: () => phys(0x4a0d1a, { roughness: 0.65 }),
  tongue: () => phys(0xff6f8e, { roughness: 0.45, clearcoat: 0.4 }),
  tooth: () => phys(0xfffdf6, { roughness: 0.25, clearcoat: 0.8 }),
};

/** Sfär (ellipsoid) på plats. */
export function ball(r, mat, pos = [0, 0, 0], scl = [1, 1, 1], seg = 40) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), mat);
  m.position.set(...pos);
  m.scale.set(...scl);
  return m;
}

/** Rör längs punkter (enkel wrapper). */
export function tube(points, r0, r1, mat, opts = {}) {
  return new THREE.Mesh(taperedTube(points, r0, r1, { segs: 20, radial: 10, ...opts }), mat);
}

/** Glansigt tecknat öga – svart eller vitt med pupill, två ljusreflexer. */
export function cartoonEye(r, { white = false, pupil = 0x07070a, iris = null, slit = false } = {}) {
  const g = new THREE.Group();
  const ball_ = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), white ? phys(0xffffff, { roughness: 0.2, clearcoat: 1 }) : glossBlack());
  g.add(ball_);
  let pupilMesh = null;
  if (white) {
    const holder = new THREE.Group();
    if (iris) {
      const ir = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 24, 16), phys(iris, { roughness: 0.1, clearcoat: 1 }));
      ir.position.z = r * 0.8;
      ir.scale.z = 0.4;
      holder.add(ir);
    }
    pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(r * (iris ? 0.36 : 0.55), 24, 16), new THREE.MeshPhysicalMaterial({ color: pupil, roughness: 0.05, clearcoat: 1 }));
    pupilMesh.position.z = r * 0.88;
    pupilMesh.scale.set(slit ? 0.35 : 1, slit ? 1.5 : 1, 0.45);
    holder.add(pupilMesh);
    g.add(holder);
    g.userData.holder = holder;
  }
  const hl = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const h1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.24, 12, 8), hl);
  h1.position.set(-r * 0.32, r * 0.38, r * 0.86);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.11, 10, 6), hl);
  h2.position.set(r * 0.3, -r * 0.25, r * 0.92);
  g.add(h1, h2);
  g.userData.r = r;
  return g;
}

export function blushDisc(r, opacity = 0.45, color = 0xff7aa8) {
  return new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
}

/** Båge (leende-linje) i xy-planet, centrerad i origo. */
export function smileArc(w, depth, r, mat) {
  return tube([[-w, depth * 0.35, 0], [-w * 0.5, -depth * 0.2, 0.01], [0, -depth * 0.45, 0.015], [w * 0.5, -depth * 0.2, 0.01], [w, depth * 0.35, 0]], r, r, mat, { segs: 24, radial: 8 });
}

/**
 * Ansiktskit: lägger till ögon, ögonbryn, mun m.m. på ett huvud och animerar
 * dem från riggen. Varje del registrerar sin egen uppdatering.
 */
export class FaceKit {
  constructor(head) {
    this.head = head;
    this.updaters = [];
  }

  /** Två ögon. o: { r, x, y, z, white, scale:[sx,sy,sz], tilt, look, iris, slit, lids } */
  eyes(o) {
    const { r, x, y, z, white = false, scale = [1, 1.15, 0.62], tilt = 0, look = 0.03, iris = null, slit = false, lid = null } = o;
    const eyes = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * x, y, z);
      pivot.rotation.y = s * (o.yaw ?? 0.18);
      pivot.rotation.z = s * tilt;
      const e = cartoonEye(r, { white, iris, slit });
      e.scale.set(...scale);
      pivot.add(e);
      let lidMesh = null;
      if (lid) {
        lidMesh = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), lid);
        lidMesh.scale.set(...scale);
        lidMesh.rotation.x = -Math.PI / 2 + 0.2;
        pivot.add(lidMesh);
      }
      this.head.add(pivot);
      eyes.push({ s, pivot, e, lid: lidMesh, base: [...scale], baseY: y });
    }
    this.eyeList = eyes;
    this.updaters.push((rig) => {
      for (const it of eyes) {
        const blink = it.s < 0 ? rig.blinkL : rig.blinkR;
        const happy = rig.smile > 0.6 && rig.jaw < 0.3 ? 0.45 : 1;
        const sur = 1 + rig.browUp * 0.22;
        const open = Math.max(0.07, (1 - blink) * happy);
        if (it.lid) {
          it.e.scale.set(it.base[0] * sur, it.base[1] * sur, it.base[2]);
          it.lid.rotation.x = -1.45 + (1 - open) * 2.75 + rig.browDown * 0.22 - rig.browUp * 0.15;
        } else {
          it.e.scale.set(it.base[0] * sur, it.base[1] * sur * open, it.base[2]);
        }
        it.pivot.position.y = it.baseY + (1 - happy) * r * 0.25;
        it.pivot.rotation.z = it.s * (tilt + rig.browDown * 0.32 - rig.browUp * 0.05);
        const h = it.e.userData.holder;
        if (h) {
          h.position.x = rig.lookX * r * 0.28;
          h.position.y = rig.lookY * r * 0.24;
        } else {
          it.e.position.x = rig.lookX * look;
          it.e.position.y = rig.lookY * look * 0.8;
        }
      }
    });
    return eyes;
  }

  /** Ögonbryn. o: { x, y, z, w, r, color, mat, angle } */
  brows(o) {
    const { x, y, z, w = 0.12, r = 0.026, mat, angle = 0, arch = 0.02 } = o;
    const list = [];
    for (const s of [-1, 1]) {
      const b = tube([[-w / 2, -arch, 0], [0, arch, 0.01], [w / 2, -arch, 0]], r, r * 0.8, mat, { segs: 12, radial: 8 });
      b.position.set(s * x, y, z);
      b.rotation.y = s * 0.25;
      this.head.add(b);
      list.push({ b, s });
    }
    this.updaters.push((rig) => {
      for (const { b, s } of list) {
        b.position.y = y + rig.browUp * 0.07 - rig.browDown * 0.035;
        b.rotation.z = s * (angle + rig.browDown * 0.42 - rig.browUp * 0.12);
      }
    });
    return list;
  }

  /** Enkel mun: leende-linje när stängd, mörk öppning + tunga när öppen. */
  mouth(o) {
    const { x = 0, y, z, w = 0.1, line = MATS.matte(0x2a1a12, 0.7), depth = 0.05, open = 0.15, tongue = true, teeth = false, lineR = 0.013, scaleOpen = 1 } = o;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const arc = smileArc(w, depth, lineR, line);
    const cavity = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), MATS.inner());
    const tng = tongue ? ball(0.6, MATS.tongue(), [0, -0.35, 0.25], [1, 0.45, 0.6], 20) : null;
    if (tng) cavity.add(tng);
    let tth = null;
    if (teeth) {
      tth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.4), MATS.tooth());
      tth.position.set(0, 0.62, 0.55);
      cavity.add(tth);
    }
    g.add(arc, cavity);
    this.head.add(g);
    this.updaters.push((rig) => {
      const j = rig.jaw;
      arc.visible = j < 0.12;
      arc.scale.set(1 + rig.wide * 0.3 - rig.pucker * 0.4, 0.35 + (rig.smile - rig.frown) * 1.4, 1);
      cavity.visible = j >= 0.08;
      cavity.scale.set((w * 0.9 + rig.wide * w * 0.4 - rig.pucker * w * 0.4) * scaleOpen, (0.015 + j * open + rig.funnel * open * 0.3) * scaleOpen, 0.05 * scaleOpen);
      cavity.position.y = -j * open * 0.45;
      if (tng) tng.visible = j > 0.25;
    });
    return g;
  }

  /** Näbb: övre fast, undre fäst i ett gångjärn. o: { y, z, w, len, thick, mat, lowerMat, tip } */
  beak(o) {
    const { y, z, w = 0.32, len = 0.34, thick = 0.09, mat, upturn = 0.12, open = 0.6, pointed = false } = o;
    const lowerMat = o.lowerMat ?? MATS.gloss(`#${mat.color.clone().multiplyScalar(0.8).getHexString()}`, 0.4);
    let upper;
    let lower;
    if (pointed) {
      // spetsig fågelnäbb (kyckling, pingvin)
      const cone = (r, h, m) => {
        const g = new THREE.ConeGeometry(r, h, 28);
        g.rotateX(Math.PI / 2);
        g.translate(0, 0, h / 2);
        return new THREE.Mesh(g, m);
      };
      upper = cone(w, len, mat);
      upper.scale.y = thick / w;
      upper.position.set(0, y + thick * 0.35, z);
      lower = cone(w * 0.8, len * 0.75, lowerMat);
      lower.scale.y = (thick * 0.7) / (w * 0.8);
      lower.position.set(0, -thick * 0.1, 0);
    } else {
      // platt ank-näbb: bredare mot spetsen, lätt uppvikt
      const spatula = (k) => {
        const g = new THREE.SphereGeometry(1, 56, 32);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const yy = p.getY(i);
          const zz = p.getZ(i);
          const tip = (zz + 1) / 2;
          p.setXYZ(i, x * (0.78 + 0.34 * tip), (yy > 0 ? yy : yy * 0.55) + k * Math.max(zz, 0) ** 2 * 0.35, zz);
        }
        g.computeVertexNormals();
        return g;
      };
      upper = new THREE.Mesh(spatula(1), mat);
      upper.scale.set(w, thick, len);
      upper.position.set(0, y + thick * 0.45, z + len * 0.55);
      upper.rotation.x = -upturn;
      lower = new THREE.Mesh(spatula(-0.4), lowerMat);
      lower.scale.set(w * 0.84, thick * 0.62, len * 0.84);
      lower.position.set(0, -thick * 0.05, len * 0.44);
    }
    const hinge = new THREE.Group();
    hinge.position.set(0, y - thick * 0.3, z);
    hinge.add(lower);
    const inside = ball(1, MATS.inner(), [0, y, z + len * 0.4], [w * 0.78, thick * 0.55, len * 0.75], 24);
    const tng = ball(1, MATS.tongue(), [0, 0, 0], [1, 1, 1], 18);
    tng.scale.set(w * 0.45, thick * 0.3, len * 0.45);
    tng.position.set(0, y - thick * 0.05, z + len * 0.42);
    this.head.add(upper, hinge, inside, tng);
    if (!pointed) {
      for (const s of [-1, 1]) {
        const n = ball(0.02, MATS.gloss(0x1a0f0a), [s * w * 0.2, y + thick * 1.18, z + len * 0.86], [1.3, 0.6, 1], 12);
        this.head.add(n);
      }
    }
    this.updaters.push((rig) => {
      hinge.rotation.x = 0.06 + rig.jaw * open + rig.funnel * 0.15;
      upper.rotation.z = (rig.smile - rig.frown) * 0.05;
    });
    return { upper, lower, hinge };
  }

  /** Krokodilkäke: lång övre nos + undre käke med tänder. */
  jaw(o) {
    const { y, z, w = 0.3, len = 0.42, thick = 0.16, mat, teeth = 6, open = 0.55, toothMat = MATS.tooth() } = o;
    const upper = ball(1, mat, [0, y + thick * 0.45, z + len * 0.5], [w, thick, len], 40);
    const hinge = new THREE.Group();
    hinge.position.set(0, y - thick * 0.2, z - len * 0.05);
    const lower = ball(1, o.lowerMat ?? mat, [0, -thick * 0.25, len * 0.55], [w * 0.88, thick * 0.6, len * 0.95], 36);
    hinge.add(lower);
    const inside = ball(1, MATS.inner(), [0, y - thick * 0.05, z + len * 0.45], [w * 0.8, thick * 0.35, len * 0.82], 24);
    const cone = new THREE.ConeGeometry(0.028, 0.08, 8);
    for (let i = 0; i < teeth; i++) {
      const k = i / (teeth - 1);
      for (const s of [-1, 1]) {
        const ang = 0.35 + k * 1.0;
        const tx = s * Math.sin(ang) * w * 0.86;
        const tz = z + len * 0.5 + Math.cos(ang) * len * 0.82;
        const tu = new THREE.Mesh(cone, toothMat);
        tu.position.set(tx, y - thick * 0.15, tz);
        tu.rotation.x = Math.PI;
        this.head.add(tu);
        const tl = new THREE.Mesh(cone, toothMat);
        tl.position.set(tx * 0.9, thick * 0.05, len * 0.55 + Math.cos(ang) * len * 0.72);
        tl.scale.setScalar(0.8);
        hinge.add(tl);
      }
    }
    this.head.add(upper, hinge, inside);
    this.updaters.push((rig) => {
      hinge.rotation.x = 0.04 + rig.jaw * open;
    });
    return { upper, hinge, lower };
  }

  blush(o) {
    const { x, y, z, r = 0.09, yaw = 0.6 } = o;
    const list = [];
    for (const s of [-1, 1]) {
      const b = blushDisc(r, 0.35, o.color ?? 0xff7aa8);
      b.position.set(s * x, y, z);
      b.rotation.y = s * yaw;
      this.head.add(b);
      list.push(b);
    }
    this.updaters.push((rig) => list.forEach((b) => (b.material.opacity = 0.18 + rig.smile * 0.5)));
    return list;
  }

  /** Öron/flikar på fjäder som gungar med huvudets rörelse. */
  floppy(pivots, { amount = 1, base = 0 } = {}) {
    const sp = pivots.map(() => ({ z: new Spring(60, 6), x: new Spring(60, 6) }));
    this.updaters.push((rig, dt, t) => {
      pivots.forEach((p, i) => {
        const tz = -rig.euler.z * 0.9 * amount - rig.pos.x * 0.15 + Math.sin(t * 2 + i) * 0.03 + rig.talk * Math.sin(t * 14 + i) * 0.06;
        p.rotation.z = (p.userData.baseZ ?? 0) + sp[i].z.update(tz, dt);
        p.rotation.x = (p.userData.baseX ?? 0) + sp[i].x.update(-rig.euler.x * 0.8 * amount + rig.browUp * 0.25 - rig.browDown * 0.3, dt) + base;
      });
    });
  }

  update(rig, dt, t) {
    for (const u of this.updaters) u(rig, dt, t);
  }
}

/** Gemensam överkropp: rundad torso, ev. mage, armar. */
export function torso(body, { mat, r = 0.62, scale = [1, 0.9, 0.84], y = -0.52, belly = null, bellyScale = [1, 1.1, 0.55], arms = true, armMat = null, armR = 0.13 }) {
  const t = ball(r, mat, [0, y, 0], scale, 48);
  body.add(t);
  if (belly) body.add(ball(r * 0.66, belly, [0, y - 0.03, r * 0.5], bellyScale, 36));
  const armsOut = [];
  if (arms) {
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(armR, 0.36, 6, 16), armMat ?? mat);
      a.position.set(s * r * 1.0, y - 0.1, 0.08);
      a.rotation.z = s * 0.32;
      body.add(a);
      armsOut.push(a);
    }
  }
  return { torso: t, arms: armsOut };
}
