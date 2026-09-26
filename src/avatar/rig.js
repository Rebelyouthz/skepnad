// Översätter spårning + röst till avatarparametrar i skärmtermer.
// blinkL/blinkR = ögat på skärmens vänster/höger sida (avatarens -x / +x).
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp = (a, b, k) => a + (b - a) * k;

export class Rig {
  constructor() {
    this.present = false;
    this.quat = new THREE.Quaternion();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.pos = { x: 0, y: 0 };
    this.blinkL = 0;
    this.blinkR = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.jaw = 0;
    this.smile = 0;
    this.frown = 0;
    this.pucker = 0;
    this.funnel = 0;
    this.wide = 0;
    this.browUp = 0;
    this.browDown = 0;
    this.cheekPuff = 0;
    this.talk = 0;
    this.speaking = false;
    this.hit = { x: 0, v: 0 }; // bonk-impuls (roll)
    this._autoBlink = { next: 2, t: 0 };
    this._votes = 0; // >0: MediaPipe "Left" = motivets vänster öga
    this._tmpQ = new THREE.Quaternion();
    this._idleQ = new THREE.Quaternion();
  }

  impulse(dir, strength = 1) {
    this.hit.v += dir * 9 * strength;
  }

  update(face, audioLevel, { mirror = true, follow = 1, dt = 1 / 60, t = 0 } = {}) {
    const k = 1 - Math.exp(-dt * 18);
    this.present = !!face?.present;
    // röstnivå → prat
    const target = clamp((audioLevel - 0.02) * 4, 0, 1);
    this.talk = lerp(this.talk, target, target > this.talk ? 0.6 : 0.18);
    this.speaking = this.talk > 0.12;
    // bonk-fjäder
    this.hit.v += (-this.hit.x * 90 - this.hit.v * 9) * dt;
    this.hit.x += this.hit.v * dt;

    if (this.present) {
      const b = face.blend;
      const q = face.quat;
      if (mirror) this._tmpQ.set(q.x, -q.y, -q.z, q.w);
      else this._tmpQ.copy(q);
      const e = new THREE.Euler().setFromQuaternion(this._tmpQ, 'YXZ');
      const f = follow;
      e.x = clamp(e.x * f, -0.6, 0.6);
      e.y = clamp(e.y * f, -0.9, 0.9);
      e.z = clamp(e.z * f + this.hit.x, -0.75, 0.75);
      this.euler.set(lerp(this.euler.x, e.x, k), lerp(this.euler.y, e.y, k), lerp(this.euler.z, e.z, k), 'YXZ');
      this.quat.setFromEuler(this.euler);
      // Position (mitt mellan ögonen) relativt bildmitt
      const px = (face.eyeMid.x - 0.5) * 2 * (mirror ? -1 : 1);
      const py = -(face.eyeMid.y - 0.45) * 2;
      this.pos.x = lerp(this.pos.x, clamp(px, -1, 1), k * 0.6);
      this.pos.y = lerp(this.pos.y, clamp(py, -1, 1), k * 0.6);

      // Självkalibrering: vilket öga är "Left" i MediaPipe?
      const bl = b.eyeBlinkLeft ?? 0;
      const br = b.eyeBlinkRight ?? 0;
      if (Math.abs(bl - br) > 0.3) {
        const leftMoreClosed = bl > br;
        const subjLeftMoreClosed = face.earL < face.earR * 0.85;
        const subjRightMoreClosed = face.earR < face.earL * 0.85;
        if (subjLeftMoreClosed || subjRightMoreClosed) {
          this._votes = clamp(this._votes + (leftMoreClosed === subjLeftMoreClosed ? 1 : -1), -20, 20);
        }
      }
      const subjL = this._votes >= 0 ? bl : br; // motivets vänstra öga
      const subjR = this._votes >= 0 ? br : bl;
      // motivets vänster = bildens höger (ospeglad) → skärm: speglad ? vänster : höger
      const screenL = mirror ? subjL : subjR;
      const screenR = mirror ? subjR : subjL;
      const shape = (v) => clamp((v - 0.12) / 0.55, 0, 1);
      this.blinkL = lerp(this.blinkL, shape(screenL), 0.7);
      this.blinkR = lerp(this.blinkR, shape(screenR), 0.7);

      const outL = b.eyeLookOutLeft ?? 0;
      const inL = b.eyeLookInLeft ?? 0;
      const outR = b.eyeLookOutRight ?? 0;
      const inR = b.eyeLookInRight ?? 0;
      const gazeSubjLeft = (outL + inR - inL - outR) / 2; // + = mot motivets vänster
      const gx = (this._votes >= 0 ? gazeSubjLeft : -gazeSubjLeft) * (mirror ? -1 : 1);
      const gy = ((b.eyeLookUpLeft ?? 0) + (b.eyeLookUpRight ?? 0) - (b.eyeLookDownLeft ?? 0) - (b.eyeLookDownRight ?? 0)) / 2;
      this.lookX = lerp(this.lookX, clamp(gx * 1.6, -1, 1), k);
      this.lookY = lerp(this.lookY, clamp(gy * 1.6, -1, 1), k);

      const avg = (a, c) => ((b[a] ?? 0) + (b[c] ?? 0)) / 2;
      const jawFace = clamp(((b.jawOpen ?? 0) - 0.04) * 1.5, 0, 1);
      this.jaw = lerp(this.jaw, Math.max(jawFace, this.talk * 0.25), 0.55);
      this.smile = lerp(this.smile, clamp(avg('mouthSmileLeft', 'mouthSmileRight') * 1.4, 0, 1), k);
      this.frown = lerp(this.frown, clamp(avg('mouthFrownLeft', 'mouthFrownRight') * 2, 0, 1), k);
      this.pucker = lerp(this.pucker, clamp((b.mouthPucker ?? 0) * 1.3, 0, 1), k);
      this.funnel = lerp(this.funnel, clamp((b.mouthFunnel ?? 0) * 1.6, 0, 1), k);
      this.wide = lerp(this.wide, clamp(avg('mouthStretchLeft', 'mouthStretchRight') * 2, 0, 1), k);
      this.browUp = lerp(this.browUp, clamp(((b.browInnerUp ?? 0) + avg('browOuterUpLeft', 'browOuterUpRight')) / 2 * 1.5, 0, 1), k);
      this.browDown = lerp(this.browDown, clamp((avg('browDownLeft', 'browDownRight') - 0.38) * 2.6, 0, 1), k);
      this.cheekPuff = lerp(this.cheekPuff, clamp((b.cheekPuff ?? 0) * 1.5, 0, 1), k);
    } else {
      // Tomgång: mjuk rörelse, automatisk blinkning, ljudstyrd mun
      this._idleQ.setFromEuler(new THREE.Euler(Math.sin(t * 0.7) * 0.05 + this.talk * 0.08, Math.sin(t * 0.43) * 0.12, Math.sin(t * 0.55) * 0.05 + this.hit.x, 'YXZ'));
      this.quat.slerp(this._idleQ, k * 0.3);
      this.euler.setFromQuaternion(this.quat, 'YXZ');
      this.pos.x = lerp(this.pos.x, 0, k * 0.2);
      this.pos.y = lerp(this.pos.y, 0, k * 0.2);
      const ab = this._autoBlink;
      ab.next -= dt;
      if (ab.next <= 0) {
        ab.t = 0.16;
        ab.next = 2.2 + Math.random() * 3.5;
      }
      ab.t = Math.max(0, ab.t - dt);
      const bl = ab.t > 0 ? Math.sin((ab.t / 0.16) * Math.PI) : 0;
      this.blinkL = this.blinkR = bl;
      this.lookX = lerp(this.lookX, Math.sin(t * 0.3) * 0.3, k * 0.2);
      this.lookY = lerp(this.lookY, 0, k * 0.2);
      this.jaw = lerp(this.jaw, this.talk * (0.55 + 0.45 * Math.abs(Math.sin(t * 17))), 0.5);
      this.smile = lerp(this.smile, 0.35, k * 0.2);
      for (const key of ['frown', 'pucker', 'funnel', 'wide', 'browUp', 'browDown', 'cheekPuff']) this[key] = lerp(this[key], 0, k * 0.3);
    }
  }
}
