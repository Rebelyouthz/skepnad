// Gemensam grund för avatarer: hierarki, rig-applicering, fjädrar och studs.
import * as THREE from 'three';

export class Spring {
  constructor(stiffness = 120, damping = 12) {
    this.k = stiffness;
    this.d = damping;
    this.x = 0;
    this.v = 0;
  }
  update(target, dt) {
    this.v += (-(this.x - target) * this.k - this.v * this.d) * dt;
    this.x += this.v * dt;
    return this.x;
  }
  kick(v) {
    this.v += v;
  }
}

/** 2D-canvas som textur (LED-ansikte, snidat pumpaansikte, PNG-tuber). */
export class CanvasFace {
  constructor(w, h) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }
  commit() {
    this.texture.needsUpdate = true;
  }
  dispose() {
    this.texture.dispose();
  }
}

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry med normaliserade UV (0..1 över formens bredd/höjd). */
export function shapeGeoUV(shape, w, h, segs = 24) {
  const g = new THREE.ShapeGeometry(shape, segs);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

export const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, ...o });
export const glossBlack = () => new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
export const emissive = (color, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3 });

export class AvatarBase {
  static meta = { id: 'base', name: 'Avatar', icon: '🙂', desc: '' };
  static defaults = { primary: '#ffffff', accent: '#7c5cff' };

  constructor(colors = {}) {
    this.colors = { ...this.constructor.defaults, ...colors };
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.neck = new THREE.Group();
    this.head = new THREE.Group();
    this.root.add(this.body);
    this.body.add(this.neck);
    this.neck.add(this.head);
    this.anchorFace = new THREE.Group();
    this.anchorCrown = new THREE.Group();
    this.head.add(this.anchorFace, this.anchorCrown);
    this.bounce = new Spring(160, 11);
    this.lean = new Spring(60, 10);
    this.headFrac = 1; // andel av rotationen på huvudet (resten på halsen)
    this.framing = { target: new THREE.Vector3(0, 0.45, 0), distance: 4.4 };
    this._wasSpeaking = false;
    this.build();
  }

  build() {}

  /** Placera tillbehörsankare: ögonmitt (face) och huvudtopp (crown). */
  setAnchors({ eyeY, eyeZ, faceScale, crownY, crownZ, crownScale }) {
    this.anchorFace.position.set(0, eyeY, eyeZ);
    this.anchorFace.scale.setScalar(faceScale);
    this.anchorCrown.position.set(0, crownY, crownZ);
    this.anchorCrown.scale.setScalar(crownScale);
  }

  anchorFor(slot) {
    return ['head', 'above'].includes(slot) ? this.anchorCrown : this.anchorFace;
  }

  applyRig(rig, dt, t) {
    const hq = rig.quat;
    this.head.quaternion.copy(hq);
    if (this.headFrac < 1) {
      this.neck.quaternion.identity().slerp(hq, 1 - this.headFrac);
      this.head.quaternion.identity().slerp(hq, this.headFrac);
    }
    if (rig.speaking && !this._wasSpeaking) this.bounce.kick(2.2);
    this._wasSpeaking = rig.speaking;
    const b = this.bounce.update(rig.talk * 0.25, dt);
    this.body.position.y = b * 0.12 + Math.sin(t * 1.8) * 0.012;
    this.body.rotation.z = this.lean.update(rig.euler.z * 0.22, dt);
    this.body.rotation.y = rig.euler.y * 0.18;
    this.root.position.x = rig.pos.x * 0.45;
    this.root.position.y = rig.pos.y * 0.2;
  }

  animate() {}

  update(rig, dt, t, audio = 0) {
    this.applyRig(rig, dt, t);
    this.animate(rig, dt, t, audio);
  }

  dispose() {
    this.root.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const m of [].concat(o.material)) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
}
