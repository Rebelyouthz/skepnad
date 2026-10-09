// Geometrihjälpare för procedurella 3D-föremål.
import * as THREE from 'three';

/** Ansiktets mått i AR-enheter (1 = avståndet mellan ögonens yttre hörn). */
export const HEAD = {
  crownY: 1.0,
  crownZ: -0.78,
  crownR: 0.66,
  noseTip: [0, -0.47, 0.42],
  eyeX: 0.33,
};

/** Rör längs en kurva med avsmalnande radie (horn, mustasch, luva…). */
export function taperedTube(points, r0, r1, { radial = 14, segs = 40, ease = (t) => t, capStart = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [];
  const nrm = [];
  const uvs = [];
  const idx = [];
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const P = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = r0 + (r1 - r0) * ease(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      n.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(B, Math.sin(a));
      pos.push(P.x + n.x * r, P.y + n.y * r, P.z + n.z * r);
      nrm.push(n.x, n.y, n.z);
      uvs.push(j / radial, t);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      // Moturs sett utifrån (normalen pekar utåt)
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  if (capStart) {
    const P = curve.getPointAt(0);
    const T = curve.getTangentAt(0);
    const c = pos.length / 3;
    pos.push(P.x, P.y, P.z);
    nrm.push(-T.x, -T.y, -T.z);
    uvs.push(0.5, 0);
    for (let j = 0; j < radial; j++) idx.push(c, j + 1, j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

export function heartShape(size = 1) {
  const s = new THREE.Shape();
  const k = size;
  s.moveTo(0, -0.9 * k);
  s.bezierCurveTo(-0.3 * k, -0.6 * k, -1.0 * k, -0.2 * k, -1.0 * k, 0.3 * k);
  s.bezierCurveTo(-1.0 * k, 0.8 * k, -0.35 * k, 1.0 * k, 0, 0.55 * k);
  s.bezierCurveTo(0.35 * k, 1.0 * k, 1.0 * k, 0.8 * k, 1.0 * k, 0.3 * k);
  s.bezierCurveTo(1.0 * k, -0.2 * k, 0.3 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}

/** Böj en geometri runt ansiktet: z -= k * x² (för masker och glasögon). */
export function wrapZ(geo, k) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - k * p.getX(i) * p.getX(i));
  geo.computeVertexNormals();
  return geo;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const MAT = {
  gold: () => new THREE.MeshStandardMaterial({ color: 0xffc444, metalness: 1, roughness: 0.18 }),
  silver: () => new THREE.MeshStandardMaterial({ color: 0xdfe4ec, metalness: 1, roughness: 0.22 }),
  steel: () => new THREE.MeshStandardMaterial({ color: 0x8f98a6, metalness: 0.9, roughness: 0.35 }),
  black: () => new THREE.MeshPhysicalMaterial({ color: 0x0a0a0f, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
  gloss: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
  matte: (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }),
  fur: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5), sheenRoughness: 0.5 }),
  glow: (color, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 }),
  gem: (color) =>
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.02, metalness: 0, clearcoat: 1, iridescence: 0.6, emissive: color, emissiveIntensity: 0.25 }),
};
