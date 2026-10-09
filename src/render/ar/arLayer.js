// AR-lager: 3D-tillbehör förankrade i ansiktet (ortografisk pixelscen).
// I avatarläge flyttas innehållet till avatarens huvud.
import * as THREE from 'three';
import { ACCESSORY_MAP, HEAD } from './accessories.js';

const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export class ArLayer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1280, 720, 0, 1, 20000);
    this.camera.position.z = 8000;
    this.anchor = new THREE.Group();
    this.content = new THREE.Group();
    this.anchor.add(this.content);
    this.scene.add(this.anchor);

    const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), occMat);
    head.scale.set(0.8, 1.14, 0.97);
    head.position.set(0, 0.26, -0.86);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 1.4, 20), occMat);
    neck.position.set(0, -1.35, -0.95);
    this.occluder = new THREE.Group();
    this.occluder.add(head, neck);
    this.occluder.traverse((o) => (o.renderOrder = -10));
    this.content.add(this.occluder);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6);
    this.key = new THREE.DirectionalLight(0xfff4e8, 1.7);
    this.key.position.set(-0.4, 0.7, 1);
    this.rim = new THREE.DirectionalLight(0xffffff, 1.1);
    this.rim.position.set(0.8, 0.3, -0.6);
    this.scene.add(this.hemi, this.key, this.rim);

    this.items = new Map();
    this.ids = [];
    this.visible = false;
    this._prevQuat = new THREE.Quaternion();
    this._angVel = new THREE.Vector3();
    this._mirQ = new THREE.Quaternion();
    this.attachedTo = null;
  }

  setSize(w, h) {
    this.camera.right = w;
    this.camera.top = h;
    this.camera.updateProjectionMatrix();
  }

  setEnvironment(envTex) {
    this.scene.environment = envTex;
    this.scene.environmentIntensity = 0.75;
  }

  setTint(color) {
    this.rim.color.set(color);
    this.hemi.color.set(0xffffff).lerp(new THREE.Color(color), 0.25);
  }

  setAccessories(ids) {
    this.ids = ids.filter((id) => ACCESSORY_MAP[id]);
    for (const [id, item] of this.items) {
      if (!this.ids.includes(id)) {
        item.group.parent?.remove(item.group);
        item.group.traverse((o) => {
          o.geometry?.dispose();
          if (o.material) [].concat(o.material).forEach((m) => m.dispose());
        });
        this.items.delete(id);
      }
    }
    for (const id of this.ids) {
      if (this.items.has(id)) continue;
      const def = ACCESSORY_MAP[id];
      const built = def.build();
      const wrap = new THREE.Group();
      const offset = new THREE.Group();
      offset.add(built.group);
      wrap.add(offset);
      wrap.scale.setScalar(0.001);
      const item = { id, slot: def.slot, group: wrap, offset, update: built.update, appear: 0, fresh: true };
      this.items.set(id, item);
      this._place(item);
    }
  }

  _place(item) {
    const av = this.attachedTo;
    if (av) {
      const crown = ['head', 'above', 'hair'].includes(item.slot);
      av.anchorFor(item.slot).add(item.group);
      if (crown) item.offset.position.set(0, -HEAD.crownY, -HEAD.crownZ);
      else item.offset.position.set(0, 0, 0);
    } else {
      this.content.add(item.group);
      item.offset.position.set(0, 0, 0);
    }
  }

  /** Fäst tillbehören på en avatar (eller tillbaka på kameraansiktet när avatar = null). */
  attach(avatar) {
    if (this.attachedTo === avatar) return;
    this.attachedTo = avatar;
    for (const item of this.items.values()) this._place(item);
  }

  get hasItems() {
    return this.ids.length > 0;
  }

  /** Uppdatera förankring (kameraläge) och animationer. */
  update(face, view, dt, t, ctx = {}) {
    const W = view.outW;
    const H = view.outH;
    // Vinkelhastighet för fysik (öron, tofsar)
    if (face?.present && dt > 0) {
      const dq = this._prevQuat.clone().invert().multiply(face.quat);
      const e = new THREE.Euler().setFromQuaternion(dq);
      this._angVel.set(e.x / dt, e.y / dt, e.z / dt).clampLength(0, 20);
      this._prevQuat.copy(face.quat);
    } else {
      this._angVel.multiplyScalar(0.8);
    }
    if (!this.attachedTo) {
      this.visible = !!face?.present && this.hasItems;
      this.anchor.visible = this.visible;
      if (this.visible) {
        const p = view.videoToScreen(face.eyeMid.x, face.eyeMid.y);
        const unit = view.videoPxToOutPx(face.unitPx);
        this.anchor.position.set(p.x * W, (1 - p.y) * H, 0);
        const q = face.quat;
        if (view.mirror) {
          this._mirQ.set(q.x, -q.y, -q.z, q.w);
          this.anchor.quaternion.copy(this._mirQ);
          this.anchor.scale.set(-unit, unit, unit);
        } else {
          this.anchor.quaternion.copy(q);
          this.anchor.scale.set(unit, unit, unit);
        }
      }
    }
    const angVel = view.mirror ? new THREE.Vector3(this._angVel.x, -this._angVel.y, -this._angVel.z) : this._angVel;
    for (const item of this.items.values()) {
      item.appear = Math.min(item.appear + dt / 0.45, 1);
      item.group.scale.setScalar(Math.max(easeOutBack(item.appear), 0.001));
      item.update?.(dt, t, { ...ctx, angVel, fresh: item.fresh });
      item.fresh = false;
    }
  }
}
