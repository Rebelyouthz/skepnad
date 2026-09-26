// Avatarscen: ljus, kamera, byte av avatar, rig och skärmprojektion.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { BUILTIN_AVATARS } from './builtin.js';
import { PngTuber } from './pngtuber.js';
import { CustomAvatar } from './custom.js';

export const AVATAR_TYPES = [...BUILTIN_AVATARS, PngTuber, CustomAvatar];
export const AVATAR_LIST = AVATAR_TYPES.map((A) => ({ ...A.meta, defaults: A.defaults }));

export class AvatarLayer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x2a2440, 0.55);
    this.key = new THREE.DirectionalLight(0xfff4e8, 1.8);
    this.key.position.set(-2.5, 3, 4);
    this.fill = new THREE.DirectionalLight(0xbfd4ff, 0.45);
    this.fill.position.set(3, 1, 3);
    this.rim = new THREE.DirectionalLight(0xffffff, 1.6);
    this.rim.position.set(2.5, 2.5, -3);
    this.rim2 = new THREE.DirectionalLight(0xffffff, 0.9);
    this.rim2.position.set(-3, 1, -2.5);
    this.scene.add(this.hemi, this.key, this.fill, this.rim, this.rim2);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    this.rig = new Rig();
    this.current = null;
    this.currentId = null;
    this.custom = null; // laddad egen modell (gltf)
    this.pngFrames = null;
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
  }

  setEnvironment(tex) {
    this.scene.environment = tex;
    this.scene.environmentIntensity = 0.45;
  }

  setTint(color) {
    const c = new THREE.Color(color);
    this.rim.color.copy(c);
    this.rim2.color.copy(c).lerp(new THREE.Color(0xffffff), 0.4);
    this.hemi.color.set(0xffffff).lerp(c, 0.2);
  }

  setAspect(a) {
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
  }

  setAvatar(id, colors = {}) {
    let Klass = AVATAR_TYPES.find((A) => A.meta.id === id) ?? AVATAR_TYPES[0];
    if (Klass === CustomAvatar && !this.custom) Klass = AVATAR_TYPES[0];
    if (this.current) {
      this.holder.remove(this.current.root);
      if (!(this.current instanceof CustomAvatar)) this.current.dispose();
    }
    if (Klass === CustomAvatar) {
      this.current = this.customInstance;
    } else {
      this.current = new Klass(colors);
      if (Klass === PngTuber && this.pngFrames) this.current.setFrames(this.pngFrames);
    }
    this.currentId = Klass.meta.id;
    this.holder.add(this.current.root);
    return this.currentId;
  }

  setCustomModel(gltf, name) {
    if (this.customInstance) {
      if (this.current === this.customInstance) this.holder.remove(this.current.root);
      this.customInstance.dispose();
    }
    this.custom = gltf;
    this.customInstance = new CustomAvatar(gltf, name);
  }

  setPngFrames(frames) {
    this.pngFrames = frames;
    if (this.current instanceof PngTuber) this.current.setFrames(frames);
  }

  update(face, audioLevel, { mirror, follow, scale = 1, offsetY = 0, dt, t }) {
    const rig = this.rig;
    rig._mirror = mirror;
    rig.update(face, audioLevel, { mirror, follow, dt, t });
    if (!this.current) return;
    this.current.update(rig, dt, t, audioLevel, face);
    this.holder.scale.setScalar(scale);
    this.holder.position.y = offsetY;
    const f = this.current.framing;
    this.camera.position.set(f.target.x, f.target.y + 0.05, f.distance);
    this.camera.lookAt(f.target);
  }

  /** Huvudets position i utdatapixlar (y upp) + ungefärlig ansiktsenhet i pixlar. */
  headScreen(W, H) {
    const a = this.current?.anchorFace;
    if (!a) return { x: W / 2, y: H * 0.6, unit: 100 };
    a.updateWorldMatrix(true, false);
    const p = this._v.setFromMatrixPosition(a.matrixWorld);
    const side = this._v2.set(1, 0, 0).applyMatrix4(a.matrixWorld);
    p.project(this.camera);
    side.project(this.camera);
    const x = (p.x * 0.5 + 0.5) * W;
    const y = (p.y * 0.5 + 0.5) * H;
    const unit = Math.hypot((side.x - p.x) * 0.5 * W, (side.y - p.y) * 0.5 * H);
    return { x, y, unit: Math.max(unit, 30) };
  }

  /** Munposition och riktning (radianer i skärmplan) för eldsprutare m.m. */
  mouthScreen(W, H) {
    const a = this.current?.anchorFace;
    if (!a) return { x: W / 2, y: H * 0.5, unit: 100, dir: -Math.PI / 2 };
    const head = this.headScreen(W, H);
    const m = this._v.set(0, -0.85, 0.4).applyMatrix4(a.matrixWorld).project(this.camera);
    const fwd = this._v2.set(0, -0.85, 2.5).applyMatrix4(a.matrixWorld).project(this.camera);
    const x = (m.x * 0.5 + 0.5) * W;
    const y = (m.y * 0.5 + 0.5) * H;
    const fx = (fwd.x * 0.5 + 0.5) * W - x;
    const fy = (fwd.y * 0.5 + 0.5) * H - y;
    const len = Math.hypot(fx, fy);
    const dir = len > 8 ? Math.atan2(fy, fx) : -Math.PI / 2 + 0.0001;
    return { x, y, unit: head.unit, dir: len > 8 ? dir : -Math.PI / 2 };
  }
}
