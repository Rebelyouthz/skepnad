// Inbyggda procedurella 3D-avatarer.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AvatarBase, Spring, CanvasFace, roundedRectShape, shapeGeoUV, phys, glossBlack, emissive } from './base.js';
import { taperedTube } from '../render/ar/geometry.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/** Ett glansigt tecknat öga (svart med två ljusreflexer). */
function cartoonEye(r, { white = false, pupil = 0x07070a } = {}) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), white ? phys(0xffffff, { roughness: 0.2, clearcoat: 1 }) : glossBlack());
  g.add(ball);
  let pupilMesh = null;
  if (white) {
    pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 24, 16), new THREE.MeshPhysicalMaterial({ color: pupil, roughness: 0.05, clearcoat: 1 }));
    pupilMesh.position.z = r * 0.86;
    pupilMesh.scale.z = 0.45;
    g.add(pupilMesh);
  }
  const hl = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const h1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 12, 8), hl);
  h1.position.set(-r * 0.32, r * 0.38, r * 0.82);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 10, 6), hl);
  h2.position.set(r * 0.3, -r * 0.25, r * 0.9);
  g.add(h1, h2);
  g.userData = { ball, pupil: pupilMesh, h1, h2, r };
  return g;
}

function blushDisc(r, opacity = 0.45) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 32),
    new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity, depthWrite: false }),
  );
  return m;
}

// ============================================================ Robo
export class Robot extends AvatarBase {
  static meta = { id: 'robot', name: 'Robo', icon: '🤖', desc: 'Gullig robot med LED-ansikte som visar dina miner – munnen blir en equalizer när du pratar.' };
  static defaults = { primary: '#eef1f8', accent: '#7c5cff', glow: '#22d3ee' };

  build() {
    const c = this.colors;
    this.mWhite = phys(c.primary, { roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
    this.mAccent = phys(c.accent, { roughness: 0.35, metalness: 0.15, clearcoat: 1 });
    const dark = phys(0x1b1e2b, { roughness: 0.5 });
    const head = new THREE.Mesh(new RoundedBoxGeometry(1.36, 1.08, 1.02, 6, 0.3), this.mWhite);
    head.position.y = 0.62;
    this.head.add(head);
    const W = 1.08;
    const H = 0.74;
    const screenShape = roundedRectShape(W, H, 0.2);
    const glass = new THREE.Mesh(shapeGeoUV(screenShape, W, H), new THREE.MeshPhysicalMaterial({ color: 0x0a0d18, roughness: 0.06, clearcoat: 1, metalness: 0.2 }));
    glass.position.set(0, 0.6, 0.512);
    this.face = new CanvasFace(512, 351);
    const display = new THREE.Mesh(
      shapeGeoUV(screenShape, W, H),
      new THREE.MeshBasicMaterial({ map: this.face.texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    display.position.set(0, 0.6, 0.516);
    this.head.add(glass, display);
    this.ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 40), this.mAccent);
      cyl.rotation.z = Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 10, 32), dark);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = s * 0.085;
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.05), dark);
      bolt.position.x = s * 0.085;
      ear.add(cyl, ring, bolt);
      ear.position.set(s * 0.74, 0.62, 0);
      this.head.add(ear);
      this.ears.push(bolt);
    }
    this.antenna = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.34, 12), dark);
    stalk.position.y = 0.17;
    this.mGlow = emissive(c.glow, 2.2);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16), this.mGlow);
    this.ball.position.y = 0.37;
    this.antenna.add(stalk, this.ball);
    this.antenna.position.y = 1.15;
    this.head.add(this.antenna);
    this.antX = new Spring(70, 5);
    this.antZ = new Spring(70, 5);
    // hals + kropp
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.22, 24), dark);
    neck.position.y = 0.0;
    this.body.add(neck);
    const torso = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.95, 0.78, 5, 0.3), this.mWhite);
    torso.position.y = -0.58;
    this.body.add(torso);
    const panel = new THREE.Mesh(shapeGeoUV(roundedRectShape(0.62, 0.42, 0.12), 0.62, 0.42), this.mAccent);
    panel.position.set(0, -0.5, 0.395);
    this.heart = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), this.mGlow);
    this.heart.position.set(0, -0.5, 0.4);
    this.body.add(panel, this.heart);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 6, 16), this.mWhite);
      arm.position.set(s * 0.74, -0.62, 0);
      arm.rotation.z = s * 0.22;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), this.mAccent);
      hand.position.set(s * 0.82, -0.95, 0.02);
      this.body.add(arm, hand);
    }
    this.headFrac = 0.8;
    this.setAnchors({ eyeY: 0.64, eyeZ: 0.5, faceScale: 0.78, crownY: 1.12, crownZ: 0, crownScale: 1.05 });
  }

  animate(rig, dt, t, audio) {
    const ang = new THREE.Euler().setFromQuaternion(this.head.quaternion);
    this.antenna.rotation.x = this.antX.update(-ang.x * 0.8, dt);
    this.antenna.rotation.z = this.antZ.update(-ang.z * 0.9 - rig.pos.x * 0.2, dt);
    this.mGlow.emissiveIntensity = 1.6 + rig.talk * 4;
    this.heart.scale.setScalar(1 + rig.talk * 0.6 + Math.sin(t * 3) * 0.05);
    this.ears.forEach((b, i) => (b.rotation.x = t * (i ? 1.2 : -1.2)));
    this.drawFace(rig, t, audio);
  }

  drawFace(rig, t, audio) {
    const f = this.face;
    const g = f.ctx;
    const w = f.canvas.width;
    const h = f.canvas.height;
    g.clearRect(0, 0, w, h);
    const col = this.colors.glow;
    g.fillStyle = col;
    g.strokeStyle = col;
    g.shadowColor = col;
    g.shadowBlur = 22;
    g.lineCap = 'round';
    const ex = w * 0.24;
    const ey = h * 0.42 - rig.lookY * 14;
    const lx = rig.lookX * 20;
    const happy = rig.smile > 0.55 && rig.jaw < 0.35;
    const surprised = rig.browUp > 0.6;
    const angry = rig.browDown > 0.45;
    for (const s of [-1, 1]) {
      const cx = w / 2 + s * ex + lx;
      const blink = s < 0 ? rig.blinkL : rig.blinkR;
      if (happy && blink < 0.6) {
        g.lineWidth = 18;
        g.beginPath();
        g.arc(cx, ey + 18, 34, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
        continue;
      }
      const ew = surprised ? 78 : 62;
      const eh = Math.max(10, (surprised ? 100 : 92) * (1 - blink));
      g.beginPath();
      g.roundRect(cx - ew / 2, ey - eh / 2, ew, eh, Math.min(ew, eh) / 2);
      g.fill();
      if (angry) {
        g.save();
        g.shadowBlur = 0;
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        const inner = cx - s * ew * 0.6;
        g.moveTo(inner, ey - eh / 2 - 10);
        g.lineTo(cx + s * ew * 0.7, ey - eh / 2 - 10);
        g.lineTo(inner, ey + eh * 0.15);
        g.fill();
        g.restore();
      }
    }
    // kinder
    if (rig.smile > 0.2) {
      g.save();
      g.shadowBlur = 30;
      g.fillStyle = `rgba(255,120,180,${(rig.smile * 0.55).toFixed(3)})`;
      g.shadowColor = '#ff78b4';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(w / 2 + s * w * 0.36, h * 0.66, 38, 20, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    // mun
    const my = h * 0.74;
    if (rig.jaw > 0.12 || rig.speaking) {
      const bars = 9;
      const bw = 16;
      const gap = 9;
      const total = bars * bw + (bars - 1) * gap;
      const amp = clamp(rig.jaw * 0.8 + rig.talk * 0.8, 0.08, 1);
      for (let i = 0; i < bars; i++) {
        const center = 1 - Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2);
        const n = 0.55 + 0.45 * Math.sin(t * (13 + i * 1.7) + i * 2.3);
        const bh = 10 + 88 * amp * (0.35 + 0.65 * center) * n;
        const x = w / 2 - total / 2 + i * (bw + gap);
        g.beginPath();
        g.roundRect(x, my - bh / 2, bw, bh, 7);
        g.fill();
      }
    } else if (rig.pucker > 0.5) {
      g.lineWidth = 12;
      g.beginPath();
      g.arc(w / 2, my, 16, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.lineWidth = 13;
      g.beginPath();
      const curve = (rig.smile - rig.frown) * 34 + 10;
      g.moveTo(w / 2 - 60, my - curve * 0.3);
      g.quadraticCurveTo(w / 2, my + curve, w / 2 + 60, my - curve * 0.3);
      g.stroke();
    }
    // skannlinjer
    g.shadowBlur = 0;
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = (t * 40) % 6; y < h; y += 6) g.fillRect(0, y, w, 2);
    g.globalCompositeOperation = 'source-over';
    f.commit();
  }

  dispose() {
    this.face.dispose();
    super.dispose();
  }
}

// ============================================================ Mjau (katt)
export class Cat extends AvatarBase {
  static meta = { id: 'cat', name: 'Mjau', icon: '🐱', desc: 'Mjuk katt med öron som spetsas när du höjer ögonbrynen och fälls bakåt när du blir arg.' };
  static defaults = { primary: '#ffab52', accent: '#ffffff' };

  build() {
    const c = this.colors;
    this.mFur = new THREE.MeshPhysicalMaterial({ color: c.primary, roughness: 0.85, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(c.primary).lerp(new THREE.Color('#ffffff'), 0.5) });
    this.mWhite = new THREE.MeshPhysicalMaterial({ color: c.accent, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#ffffff') });
    const stripe = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.primary).multiplyScalar(0.55), roughness: 0.9 });
    const pink = phys(0xff8fb5, { roughness: 0.55 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 64, 48), this.mFur);
    head.scale.set(1.1, 0.95, 0.95);
    head.position.y = 0.62;
    this.head.add(head);
    for (const s of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), this.mWhite);
      cheek.scale.set(1, 0.78, 0.7);
      cheek.position.set(s * 0.13, 0.43, 0.56);
      this.head.add(cheek);
    }
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), stripe);
      const a = (i - 1) * 0.22;
      st.position.set(Math.sin(a) * 0.55, 1.13 - Math.abs(i - 1) * 0.04, 0.38);
      st.rotation.set(-0.5, 0, -a * 1.2);
      this.head.add(st);
    }
    this.earPivots = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.46, 32), this.mFur);
      ear.scale.z = 0.5;
      ear.position.y = 0.2;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 24), pink);
      inner.scale.z = 0.35;
      inner.position.set(0, 0.16, 0.06);
      piv.add(ear, inner);
      piv.position.set(s * 0.45, 1.06, -0.02);
      piv.rotation.z = -s * 0.36;
      piv.userData.side = s;
      piv.userData.spring = new Spring(90, 8);
      this.head.add(piv);
      this.earPivots.push(piv);
    }
    this.eyes = [];
    for (const s of [-1, 1]) {
      const e = cartoonEye(0.125);
      e.scale.set(1, 1.18, 0.62);
      e.position.set(s * 0.27, 0.69, 0.58);
      e.userData.base = e.position.clone();
      this.head.add(e);
      this.eyes.push(e);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), phys(0xff6f9f, { roughness: 0.3, clearcoat: 1 }));
    nose.scale.set(1.2, 0.8, 0.8);
    nose.position.set(0, 0.52, 0.72);
    this.head.add(nose);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x3a2320, roughness: 0.7 });
    this.wMouth = new THREE.Group();
    for (const s of [-1, 1]) {
      const arc = new THREE.Mesh(taperedTube([[0, 0.02, 0], [s * 0.05, -0.035, 0.005], [s * 0.1, 0.0, 0]], 0.011, 0.011, { segs: 12, radial: 6 }), lineMat);
      this.wMouth.add(arc);
    }
    this.wMouth.position.set(0, 0.43, 0.73);
    this.head.add(this.wMouth);
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), phys(0x5a1020, { roughness: 0.6 }));
    this.mouth.position.set(0, 0.39, 0.66);
    this.tongue = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), pink);
    this.tongue.position.set(0, 0.34, 0.69);
    this.head.add(this.mouth, this.tongue);
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xfff8f2 });
    this.whiskers = new THREE.Group();
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, 0.5, 6), whiskerMat);
        w.rotation.z = s * (Math.PI / 2 + (k - 1) * 0.17);
        w.position.set(s * 0.46, 0.47 - (k - 1) * 0.045, 0.6);
        this.whiskers.add(w);
      }
    }
    this.head.add(this.whiskers);
    this.blush = [];
    for (const s of [-1, 1]) {
      const b = blushDisc(0.09);
      b.position.set(s * 0.46, 0.53, 0.55);
      b.rotation.y = s * 0.6;
      this.head.add(b);
      this.blush.push(b);
    }
    // kropp
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), this.mFur);
    torso.scale.set(1, 0.88, 0.82);
    torso.position.y = -0.5;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), this.mWhite);
    belly.scale.set(1, 1.1, 0.6);
    belly.position.set(0, -0.52, 0.3);
    this.body.add(torso, belly);
    for (const s of [-1, 1]) {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), this.mWhite);
      paw.scale.set(1, 0.8, 1.1);
      paw.position.set(s * 0.3, -0.9, 0.42);
      this.body.add(paw);
    }
    this.tail = [];
    for (let i = 0; i < 9; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.1 - i * 0.004, 16, 12), i > 6 ? this.mWhite : this.mFur);
      this.body.add(seg);
      this.tail.push(seg);
    }
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.69, eyeZ: 0.55, faceScale: 0.82, crownY: 1.0, crownZ: -0.04, crownScale: 0.98 });
  }

  animate(rig, dt, t) {
    for (const p of this.earPivots) {
      const s = p.userData.side;
      const target = rig.browUp * 0.35 - rig.browDown * 0.7;
      const v = p.userData.spring.update(target, dt);
      p.rotation.x = -v * 0.6;
      p.rotation.z = -s * (0.36 + Math.max(-v, 0) * 0.6) + Math.sin(t * 9 + s) * 0.02 * rig.talk;
    }
    this.eyes.forEach((e, i) => {
      const blink = i === 0 ? rig.blinkL : rig.blinkR;
      const happy = rig.smile > 0.6 && rig.jaw < 0.3 ? 0.45 : 1;
      const surprise = 1 + rig.browUp * 0.25;
      e.scale.set(surprise, 1.18 * surprise * Math.max(0.08, (1 - blink) * happy), 0.62);
      e.position.x = e.userData.base.x + rig.lookX * 0.03;
      e.position.y = e.userData.base.y + rig.lookY * 0.025 + (1 - happy) * 0.03;
    });
    const open = rig.jaw;
    this.wMouth.visible = open < 0.12;
    this.mouth.visible = open >= 0.08;
    this.mouth.scale.set(0.11 + rig.wide * 0.05 - rig.pucker * 0.05, 0.02 + open * 0.17 + rig.funnel * 0.05, 0.06);
    this.mouth.position.y = 0.4 - open * 0.08;
    this.tongue.visible = open > 0.3;
    this.tongue.position.y = 0.36 - open * 0.13;
    this.blush.forEach((b) => (b.material.opacity = 0.2 + rig.smile * 0.5));
    this.whiskers.rotation.z = Math.sin(t * 2.5) * 0.02;
    const wag = t * (2.5 + rig.talk * 6);
    this.tail.forEach((s, i) => {
      const k = i / 8;
      s.position.set(0.45 + k * 0.35 + Math.sin(wag - i * 0.5) * 0.08 * k, -0.8 + k * k * 0.9, -0.45 - k * 0.1);
    });
  }
}

// ============================================================ Boo (spöke)
export class Ghost extends AvatarBase {
  static meta = { id: 'ghost', name: 'Boo', icon: '👻', desc: 'Svävande spöke med vågig kjol som fladdrar, små viftande armar och kusligt sken.' };
  static defaults = { primary: '#f4f7ff', accent: '#9bd0ff' };

  build() {
    const c = this.colors;
    const profile = [
      [0.001, 1.3], [0.25, 1.27], [0.46, 1.16], [0.6, 0.98], [0.67, 0.74], [0.69, 0.45], [0.72, 0.15], [0.78, -0.15], [0.84, -0.42], [0.86, -0.55],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(profile, 72);
    this.uTime = { value: 0 };
    this.uTalk = { value: 0 };
    this.mBody = new THREE.MeshPhysicalMaterial({ color: c.primary, roughness: 0.35, emissive: c.accent, emissiveIntensity: 0.28, sheen: 1, sheenColor: new THREE.Color(c.accent), side: THREE.DoubleSide, transparent: true, opacity: 0.94 });
    this.mBody.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uTime;
      shader.uniforms.uTalk = this.uTalk;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uTalk;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float wv = smoothstep(0.1, -0.55, position.y);
          float ang = atan(position.z, position.x);
          transformed.y += sin(ang * 7.0 + uTime * 4.0) * 0.07 * wv;
          transformed.xz *= 1.0 + sin(ang * 5.0 - uTime * 3.0) * 0.04 * wv + uTalk * 0.04 * wv;`,
        );
    };
    const body = new THREE.Mesh(geo, this.mBody);
    this.head.add(body);
    this.eyes = [];
    for (const s of [-1, 1]) {
      const e = cartoonEye(0.1);
      e.scale.set(1, 1.45, 0.45);
      e.position.set(s * 0.22, 0.8, 0.63);
      this.head.add(e);
      this.eyes.push(e);
    }
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), glossBlack());
    this.mouth.position.set(0, 0.5, 0.67);
    this.head.add(this.mouth);
    this.blush = [];
    for (const s of [-1, 1]) {
      const b = blushDisc(0.08, 0.4);
      b.position.set(s * 0.4, 0.62, 0.58);
      b.rotation.y = s * 0.55;
      this.head.add(b);
      this.blush.push(b);
    }
    this.arms = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), this.mBody);
      a.scale.set(1.35, 0.8, 0.8);
      a.position.set(s * 0.76, 0.2, 0.1);
      this.head.add(a);
      this.arms.push(a);
    }
    const glowTex = new CanvasFace(128, 128);
    const gg = glowTex.ctx;
    const grad = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = grad;
    gg.fillRect(0, 0, 128, 128);
    glowTex.commit();
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex.texture, color: c.accent, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
    this.glow.scale.set(3.2, 3.6, 1);
    this.glow.position.set(0, 0.4, -0.6);
    this.head.add(this.glow);
    this.head.position.y = -0.2;
    this.headFrac = 1;
    this.setAnchors({ eyeY: 0.8, eyeZ: 0.6, faceScale: 0.75, crownY: 1.0, crownZ: 0, crownScale: 0.92 });
    this.framing = { target: new THREE.Vector3(0, 0.35, 0), distance: 4.2 };
  }

  animate(rig, dt, t) {
    this.uTime.value = t;
    this.uTalk.value = rig.talk;
    this.head.position.y = -0.2 + Math.sin(t * 1.6) * 0.08;
    this.eyes.forEach((e, i) => {
      const blink = i === 0 ? rig.blinkL : rig.blinkR;
      const big = 1 + rig.browUp * 0.3;
      e.scale.set(big, 1.45 * big * Math.max(0.07, 1 - blink), 0.45);
      e.position.x = (i === 0 ? -0.22 : 0.22) + rig.lookX * 0.025;
    });
    this.mouth.scale.set(0.09 + rig.wide * 0.05 + rig.funnel * 0.02, 0.03 + rig.jaw * 0.18 + rig.funnel * 0.07, 0.04);
    this.blush.forEach((b) => (b.material.opacity = 0.15 + rig.smile * 0.5));
    this.arms.forEach((a, i) => {
      const s = i === 0 ? -1 : 1;
      a.position.y = 0.2 + Math.sin(t * 6 + i * Math.PI) * 0.06 * (0.3 + rig.talk * 2);
      a.rotation.z = s * (0.2 + Math.sin(t * 5 + i) * 0.2 * rig.talk);
    });
    this.glow.material.opacity = 0.4 + rig.talk * 0.4;
  }
}

// ============================================================ Zorp (utomjording)
export class Alien extends AvatarBase {
  static meta = { id: 'alien', name: 'Zorp', icon: '👽', desc: 'Utomjording med jättelika blanka ögon och antenner som gungar och lyser när du pratar.' };
  static defaults = { primary: '#8dfc9a', accent: '#ff4fd8' };

  build() {
    const c = this.colors;
    const prof = [
      [0.001, -0.02], [0.18, 0.0], [0.3, 0.1], [0.42, 0.32], [0.58, 0.62], [0.7, 0.92], [0.72, 1.16], [0.62, 1.38], [0.42, 1.53], [0.2, 1.6], [0.001, 1.61],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    this.mSkin = phys(c.primary, { roughness: 0.32, clearcoat: 0.8, iridescence: 0.35, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') });
    const head = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), this.mSkin);
    head.scale.z = 0.9;
    this.head.add(head);
    this.eyes = [];
    for (const s of [-1, 1]) {
      const e = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), glossBlack());
      ball.scale.set(0.27, 0.16, 0.12);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      hl.position.set(-0.06, 0.05, 0.1);
      e.add(ball, hl);
      e.position.set(s * 0.3, 0.8, 0.52);
      e.rotation.set(0, s * 0.38, s * 0.42);
      e.userData = { ball, hl };
      this.head.add(e);
      this.eyes.push(e);
    }
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), phys(0x1a0a1a, { roughness: 0.5 }));
    this.mouth.position.set(0, 0.3, 0.5);
    this.head.add(this.mouth);
    this.mGlow = emissive(c.accent, 2.5);
    this.antennae = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const stalk = new THREE.Mesh(taperedTube([[0, 0, 0], [s * 0.05, 0.2, 0], [s * 0.14, 0.38, 0.02]], 0.028, 0.012, { segs: 16, radial: 8 }), this.mSkin);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), this.mGlow);
      ball.position.set(s * 0.14, 0.42, 0.02);
      piv.add(stalk, ball);
      piv.position.set(s * 0.25, 1.5, 0);
      piv.userData = { sx: new Spring(80, 5), sz: new Spring(80, 5), s };
      this.head.add(piv);
      this.antennae.push(piv);
    }
    const suit = phys(0xdfe6f5, { metalness: 0.35, roughness: 0.28, clearcoat: 1, iridescence: 0.3 });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.34, 20), this.mSkin);
    neck.position.y = -0.05;
    const suitProfile = [[0.001, -0.12], [0.2, -0.14], [0.42, -0.24], [0.6, -0.4], [0.66, -0.62], [0.64, -1.0], [0.6, -1.5]].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = new THREE.Mesh(new THREE.LatheGeometry(suitProfile, 48), suit);
    torso.scale.z = 0.7;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 12, 40), this.mGlow);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -0.2;
    this.body.add(neck, torso, collar);
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.8, eyeZ: 0.5, faceScale: 0.85, crownY: 1.22, crownZ: 0, crownScale: 1.0 });
  }

  animate(rig, dt, t) {
    const ang = new THREE.Euler().setFromQuaternion(this.head.quaternion);
    for (const a of this.antennae) {
      const u = a.userData;
      a.rotation.x = u.sx.update(-ang.x * 0.9, dt);
      a.rotation.z = u.sz.update(-ang.z - u.s * rig.talk * 0.15, dt) + Math.sin(t * 3 + u.s) * 0.04;
    }
    this.mGlow.emissiveIntensity = 1.8 + rig.talk * 4 + Math.sin(t * 4) * 0.3;
    this.eyes.forEach((e, i) => {
      const blink = i === 0 ? rig.blinkL : rig.blinkR;
      const big = 1 + rig.browUp * 0.2;
      e.userData.ball.scale.set(0.27 * big, 0.16 * big * Math.max(0.06, 1 - blink), 0.12);
      e.userData.hl.visible = blink < 0.5;
      e.userData.hl.position.set(-0.06 + rig.lookX * 0.05, 0.05 + rig.lookY * 0.03, 0.1);
    });
    this.mouth.scale.set(0.07 + rig.wide * 0.05 + rig.smile * 0.03, 0.012 + rig.jaw * 0.12 + rig.funnel * 0.04, 0.03);
  }
}

// ============================================================ Slemmis (slime)
export class Blob extends AvatarBase {
  static meta = { id: 'blob', name: 'Slemmis', icon: '🟢', desc: 'Darrig geléklump som studsar, gungar och bubblar när du pratar.' };
  static defaults = { primary: '#5ef2c0', accent: '#1d8f78' };

  build() {
    const c = this.colors;
    this.uTime = { value: 0 };
    this.uTalk = { value: 0 };
    this.mJelly = new THREE.MeshPhysicalMaterial({ color: c.primary, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.4, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), transparent: true, opacity: 0.88, emissive: c.primary, emissiveIntensity: 0.12 });
    this.mJelly.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uTime;
      shader.uniforms.uTalk = this.uTalk;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uTalk;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float wob = sin(position.x * 3.1 + uTime * 1.7) * sin(position.y * 2.7 + uTime * 1.3) * sin(position.z * 3.3 + uTime * 1.1);
          transformed += normal * (wob * 0.07 + uTalk * 0.05 * sin(position.y * 9.0 - uTime * 14.0));`,
        );
    };
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.95, 96, 64), this.mJelly);
    blob.scale.set(1.05, 0.92, 0.95);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), phys(c.accent, { roughness: 0.4, emissive: c.accent, emissiveIntensity: 0.25 }));
    core.position.y = -0.1;
    this.jelly = new THREE.Group();
    this.jelly.add(core, blob);
    this.bubbles = [];
    const bubMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0, clearcoat: 1 });
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.03 + (i % 3) * 0.015, 12, 8), bubMat);
      b.userData = { x: (Math.random() - 0.5) * 0.9, z: (Math.random() - 0.5) * 0.5, speed: 0.15 + Math.random() * 0.2, off: Math.random() };
      this.jelly.add(b);
      this.bubbles.push(b);
    }
    this.eyes = [];
    for (const s of [-1, 1]) {
      const e = cartoonEye(0.16, { white: true });
      e.position.set(s * 0.28, 0.28, 0.84);
      this.jelly.add(e);
      this.eyes.push(e);
    }
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), phys(0x0d3d33, { roughness: 0.4 }));
    this.mouth.position.set(0, -0.08, 0.9);
    this.jelly.add(this.mouth);
    this.jelly.position.y = 0.25;
    this.head.add(this.jelly);
    this.squash = new Spring(120, 6);
    this.headFrac = 1;
    this.setAnchors({ eyeY: 0.53, eyeZ: 0.85, faceScale: 0.9, crownY: 0.86, crownZ: 0, crownScale: 1.1 });
    this.framing = { target: new THREE.Vector3(0, 0.3, 0), distance: 4.2 };
  }

  animate(rig, dt, t) {
    this.uTime.value = t;
    this.uTalk.value = rig.talk;
    if (rig.speaking && !this._sq) this.squash.kick(2.5);
    this._sq = rig.speaking;
    const s = this.squash.update(0, dt) * 0.12;
    this.jelly.scale.set(1 + s, 1 - s, 1 + s);
    this.eyes.forEach((e, i) => {
      const blink = i === 0 ? rig.blinkL : rig.blinkR;
      e.scale.set(1, Math.max(0.08, 1 - blink), 1);
      const p = e.userData.pupil;
      p.position.x = rig.lookX * 0.05;
      p.position.y = rig.lookY * 0.04;
    });
    this.mouth.scale.set(0.12 + rig.wide * 0.06 + rig.smile * 0.05 - rig.pucker * 0.05, 0.02 + rig.jaw * 0.2, 0.05);
    for (const b of this.bubbles) {
      const u = b.userData;
      const y = ((t * u.speed + u.off) % 1) * 1.5 - 0.8;
      b.position.set(u.x * (1 - Math.abs(y) * 0.5) + Math.sin(t * 2 + u.off * 9) * 0.03, y, u.z);
    }
  }
}

// ============================================================ Nalle (björn)
export class Bear extends AvatarBase {
  static meta = { id: 'bear', name: 'Nalle', icon: '🐻', desc: 'Gosig björn med uttrycksfulla ögonbryn och en fluga som byter färg.' };
  static defaults = { primary: '#9a6440', accent: '#ff3f6c' };

  build() {
    const c = this.colors;
    this.mFur = new THREE.MeshPhysicalMaterial({ color: c.primary, roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(c.primary).lerp(new THREE.Color('#ffe0c0'), 0.6) });
    const beige = new THREE.MeshPhysicalMaterial({ color: 0xe9cda6, roughness: 0.85, sheen: 0.8, sheenColor: new THREE.Color('#fff4e0') });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 64, 48), this.mFur);
    head.scale.set(1.06, 0.95, 0.95);
    head.position.y = 0.62;
    this.head.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), this.mFur);
      ear.scale.z = 0.65;
      ear.position.set(s * 0.56, 1.13, -0.05);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), beige);
      inner.scale.z = 0.4;
      inner.position.set(s * 0.56, 1.12, 0.06);
      this.head.add(ear, inner);
    }
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 40, 28), beige);
    muzzle.scale.set(1.05, 0.76, 0.75);
    muzzle.position.set(0, 0.42, 0.52);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), glossBlack());
    nose.scale.set(1.15, 0.72, 0.7);
    nose.position.set(0, 0.54, 0.77);
    this.head.add(muzzle, nose);
    this.eyes = [];
    for (const s of [-1, 1]) {
      const e = cartoonEye(0.078);
      e.position.set(s * 0.25, 0.76, 0.62);
      e.userData.base = e.position.clone();
      this.head.add(e);
      this.eyes.push(e);
    }
    const browMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.primary).multiplyScalar(0.45), roughness: 0.9 });
    this.brows = [];
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.11, 4, 8), browMat);
      b.rotation.z = Math.PI / 2;
      b.position.set(s * 0.25, 0.92, 0.6);
      b.userData.s = s;
      this.head.add(b);
      this.brows.push(b);
    }
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.8 });
    this.smileLine = new THREE.Mesh(taperedTube([[-0.1, 0.02, 0], [0, -0.03, 0.01], [0.1, 0.02, 0]], 0.013, 0.013, { segs: 16, radial: 6 }), lineMat);
    this.smileLine.position.set(0, 0.38, 0.76);
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), phys(0x4a0d1a, { roughness: 0.6 }));
    this.mouth.position.set(0, 0.34, 0.72);
    this.head.add(this.smileLine, this.mouth);
    this.blush = [];
    for (const s of [-1, 1]) {
      const b = blushDisc(0.085, 0.35);
      b.position.set(s * 0.45, 0.55, 0.55);
      b.rotation.y = s * 0.6;
      this.head.add(b);
      this.blush.push(b);
    }
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.64, 48, 32), this.mFur);
    torso.scale.set(1.02, 0.9, 0.84);
    torso.position.y = -0.5;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), beige);
    belly.scale.set(1, 1.1, 0.55);
    belly.position.set(0, -0.55, 0.33);
    this.body.add(torso, belly);
    this.mBow = phys(c.accent, { roughness: 0.4, clearcoat: 0.6 });
    const bow = new THREE.Group();
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 24), this.mBow);
      wing.rotation.z = s * Math.PI / 2;
      wing.position.x = s * 0.1;
      bow.add(wing);
    }
    bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), this.mBow));
    bow.position.set(0, -0.06, 0.46);
    this.body.add(bow);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 6, 16), this.mFur);
      arm.position.set(s * 0.62, -0.62, 0.1);
      arm.rotation.z = s * 0.3;
      this.body.add(arm);
    }
    this.headFrac = 0.85;
    this.setAnchors({ eyeY: 0.76, eyeZ: 0.6, faceScale: 0.78, crownY: 1.0, crownZ: -0.04, crownScale: 0.95 });
  }

  animate(rig) {
    this.eyes.forEach((e, i) => {
      const blink = i === 0 ? rig.blinkL : rig.blinkR;
      const happy = rig.smile > 0.6 && rig.jaw < 0.3 ? 0.5 : 1;
      e.scale.set(1 + rig.browUp * 0.15, Math.max(0.08, (1 - blink) * happy) * (1 + rig.browUp * 0.2), 0.7);
      e.position.x = e.userData.base.x + rig.lookX * 0.02;
      e.position.y = e.userData.base.y + rig.lookY * 0.018;
    });
    for (const b of this.brows) {
      const s = b.userData.s;
      b.position.y = 0.92 + rig.browUp * 0.07 - rig.browDown * 0.04;
      b.rotation.z = Math.PI / 2 + s * (rig.browDown * 0.45 - rig.browUp * 0.15);
    }
    this.smileLine.visible = rig.jaw < 0.12;
    this.smileLine.scale.y = 1 + (rig.smile - rig.frown) * 1.5;
    this.mouth.visible = rig.jaw >= 0.08;
    this.mouth.scale.set(0.09 + rig.wide * 0.04 - rig.pucker * 0.03, 0.02 + rig.jaw * 0.14 + rig.funnel * 0.04, 0.05);
    this.mouth.position.y = 0.35 - rig.jaw * 0.06;
    this.blush.forEach((b) => (b.material.opacity = 0.15 + rig.smile * 0.45));
  }
}

// ============================================================ Pumpa
export class Pumpkin extends AvatarBase {
  static meta = { id: 'pumpkin', name: 'Pumpa', icon: '🎃', desc: 'Snidad lyktpumpa med fladdrande levande ljus inuti – ansiktet följer dina miner.' };
  static defaults = { primary: '#ff8a1f', accent: '#ffd35c' };

  build() {
    const c = this.colors;
    const R = 0.78;
    const ridge = (geo) => {
      const p = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const ang = Math.atan2(v.z, v.x);
        const lat = 1 - Math.abs(v.y) / (R * 1.05);
        const k = 1 - 0.07 * (1 - Math.cos(ang * 10)) * 0.5 * Math.max(lat, 0);
        p.setXYZ(i, v.x * k, v.y * 0.82, v.z * k);
      }
      geo.computeVertexNormals();
      return geo;
    };
    this.mSkin = phys(c.primary, { roughness: 0.45, clearcoat: 0.4 });
    const pumpkin = new THREE.Mesh(ridge(new THREE.SphereGeometry(R, 96, 48)), this.mSkin);
    pumpkin.position.y = 0.6;
    this.head.add(pumpkin);
    const stem = new THREE.Mesh(taperedTube([[0, 0, 0], [0.02, 0.14, 0], [0.1, 0.25, 0.02]], 0.08, 0.05, { segs: 12, radial: 10 }), phys(0x5b7d2a, { roughness: 0.8 }));
    stem.position.set(0, 0.6 + R * 0.8, 0);
    this.head.add(stem);
    this.face = new CanvasFace(512, 512);
    const faceGeo = ridge(new THREE.SphereGeometry(R * 1.006, 64, 32, Math.PI / 2 - 0.85, 1.7, Math.PI / 2 - 0.75, 1.5));
    this.faceMesh = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: this.face.texture, transparent: true, depthWrite: false, toneMapped: false }));
    this.faceMesh.position.y = 0.6;
    this.head.add(this.faceMesh);
    const cloakProfile = [[0.001, -0.02], [0.24, -0.06], [0.42, -0.22], [0.62, -0.55], [0.8, -1.0], [0.92, -1.5]].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = new THREE.Mesh(new THREE.LatheGeometry(cloakProfile, 48), new THREE.MeshPhysicalMaterial({ color: 0x2b1740, roughness: 0.75, sheen: 1, sheenColor: new THREE.Color(0x8a5cff) }));
    torso.scale.z = 0.72;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 12, 40), phys(0x4c2a6b, { roughness: 0.7 }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -0.08;
    this.body.add(torso, collar);
    this.headFrac = 0.8;
    this.setAnchors({ eyeY: 0.72, eyeZ: 0.62, faceScale: 0.85, crownY: 0.98, crownZ: 0, crownScale: 0.92 });
  }

  animate(rig, dt, t) {
    const f = this.face;
    const g = f.ctx;
    const w = 512;
    g.clearRect(0, 0, w, w);
    const flick = 0.82 + 0.1 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29.3) + rig.talk * 0.25;
    const grad = g.createRadialGradient(w / 2, w * 0.56, 10, w / 2, w * 0.56, w * 0.5);
    grad.addColorStop(0, `rgba(255,250,190,${Math.min(flick, 1)})`);
    grad.addColorStop(0.45, `rgba(255,196,70,${Math.min(flick, 1)})`);
    grad.addColorStop(1, `rgba(255,120,20,${Math.min(flick * 0.95, 1)})`);
    const carve = (path) => {
      g.save();
      path();
      g.lineJoin = 'round';
      g.lineWidth = 18;
      g.strokeStyle = 'rgba(60,18,0,0.95)';
      g.stroke();
      g.shadowColor = '#ffb030';
      g.shadowBlur = 26;
      g.fillStyle = grad;
      g.fill();
      g.restore();
    };
    const eyeY = w * 0.38 - rig.lookY * 8;
    for (const s of [-1, 1]) {
      const blink = s < 0 ? rig.blinkL : rig.blinkR;
      const cx = w / 2 + s * w * 0.2 + rig.lookX * 10;
      const eh = 104 * Math.max(0.1, 1 - blink) * (1 + rig.browUp * 0.25);
      const slant = rig.browDown * 34;
      carve(() => {
        g.beginPath();
        g.moveTo(cx - 62, eyeY + eh * 0.45 + (s > 0 ? slant : 0) * 0.5);
        g.lineTo(cx + 62, eyeY + eh * 0.45 + (s < 0 ? slant : 0) * 0.5);
        g.lineTo(cx - s * 8, eyeY - eh * 0.55 + slant * 0.5);
        g.closePath();
      });
    }
    carve(() => {
      g.beginPath();
      g.moveTo(w / 2 - 26, w * 0.58);
      g.lineTo(w / 2 + 26, w * 0.58);
      g.lineTo(w / 2, w * 0.5);
      g.closePath();
    });
    const my = w * 0.7;
    const open = 16 + rig.jaw * 100;
    const smile = 34 + (rig.smile - rig.frown) * 44;
    const mw = 200 + rig.wide * 30 - rig.pucker * 70;
    const teeth = 6;
    carve(() => {
      g.beginPath();
      for (let i = 0; i <= teeth; i++) {
        const x = w / 2 - mw + (i / teeth) * mw * 2;
        const curve = Math.pow((x - w / 2) / mw, 2) * smile;
        const y = my - curve + (i % 2 ? 18 : 0);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      for (let i = teeth; i >= 0; i--) {
        const x = w / 2 - mw + (i / teeth) * mw * 2;
        const curve = Math.pow((x - w / 2) / mw, 2) * smile;
        const y = my - curve + open * (1 - Math.pow((x - w / 2) / mw, 2) * 0.7) + (i % 2 ? 0 : -14);
        g.lineTo(x, y);
      }
      g.closePath();
    });
    f.commit();
  }

  dispose() {
    this.face.dispose();
    super.dispose();
  }
}

export const BUILTIN_AVATARS = [Robot, Cat, Ghost, Alien, Blob, Bear, Pumpkin];
