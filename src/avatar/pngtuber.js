// PNG-tuber: en bild när du är tyst, en när du pratar (+ valfria blinkbilder).
import * as THREE from 'three';
import { AvatarBase, Spring, CanvasFace } from './base.js';

function drawDefault(g, s, { talk, blink, primary, accent }) {
  g.clearRect(0, 0, s, s);
  const cx = s / 2;
  const cy = s * 0.56;
  // skugga
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath();
  g.ellipse(cx, s * 0.93, s * 0.26, s * 0.035, 0, 0, Math.PI * 2);
  g.fill();
  // öron/horn
  g.fillStyle = accent;
  for (const d of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + d * s * 0.18, cy - s * 0.26);
    g.quadraticCurveTo(cx + d * s * 0.3, cy - s * 0.48, cx + d * s * 0.34, cy - s * 0.44);
    g.quadraticCurveTo(cx + d * s * 0.33, cy - s * 0.28, cx + d * s * 0.3, cy - s * 0.18);
    g.fill();
  }
  // kropp
  const grad = g.createRadialGradient(cx - s * 0.1, cy - s * 0.15, s * 0.05, cx, cy, s * 0.38);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, primary);
  grad.addColorStop(1, accent);
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(cx, cy, s * 0.34, s * 0.32, 0, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = s * 0.014;
  g.strokeStyle = 'rgba(40,20,60,0.85)';
  g.stroke();
  // ögon
  for (const d of [-1, 1]) {
    const ex = cx + d * s * 0.12;
    const ey = cy - s * 0.04;
    if (blink) {
      g.lineWidth = s * 0.018;
      g.beginPath();
      g.arc(ex, ey, s * 0.045, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    } else {
      g.fillStyle = '#1b1030';
      g.beginPath();
      g.ellipse(ex, ey, s * 0.05, s * 0.065, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(ex - s * 0.015, ey - s * 0.022, s * 0.018, 0, Math.PI * 2);
      g.fill();
    }
  }
  // kinder
  g.fillStyle = 'rgba(255,110,160,0.45)';
  for (const d of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + d * s * 0.21, cy + s * 0.05, s * 0.05, s * 0.028, 0, 0, Math.PI * 2);
    g.fill();
  }
  // mun
  g.fillStyle = '#5a1030';
  g.strokeStyle = 'rgba(40,20,60,0.85)';
  g.lineWidth = s * 0.012;
  if (talk) {
    g.beginPath();
    g.ellipse(cx, cy + s * 0.1, s * 0.06, s * 0.055, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff7aa0';
    g.beginPath();
    g.ellipse(cx, cy + s * 0.13, s * 0.035, s * 0.02, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.arc(cx, cy + s * 0.06, s * 0.05, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
  }
}

export class PngTuber extends AvatarBase {
  static meta = { id: 'png', name: 'PNG-tuber', icon: '🖼️', desc: 'Klassisk PNG-tuber: en bild när du är tyst och en när du pratar. Ladda gärna upp egna bilder!' };
  static defaults = { primary: '#b9a4ff', accent: '#7c5cff' };

  build() {
    this.frames = {};
    const make = (talk, blink) => {
      const f = new CanvasFace(512, 512);
      drawDefault(f.ctx, 512, { talk, blink, primary: this.colors.primary, accent: this.colors.accent });
      f.commit();
      return f.texture;
    };
    this.defaults = { idle: make(false, false), talk: make(true, false), blink: make(false, true), blinkTalk: make(true, true) };
    this.mat = new THREE.MeshBasicMaterial({ map: this.defaults.idle, transparent: true, depthWrite: false });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), this.mat);
    this.plane.position.y = 0.35;
    this.head.add(this.plane);
    this.jump = new Spring(140, 10);
    this.dimSilent = false;
    this.setAnchors({ eyeY: 0.35, eyeZ: 0.2, faceScale: 0.6, crownY: 0.95, crownZ: -0.2, crownScale: 0.9 });
  }

  /** frames: { idle, talk, blink?, blinkTalk? } som THREE.Texture */
  setFrames(frames) {
    this.frames = frames || {};
    const any = frames?.idle || frames?.talk;
    if (any?.image) {
      const a = any.image.width / any.image.height;
      this.plane.scale.set(a >= 1 ? 1 : a, a >= 1 ? 1 / a : 1, 1);
    }
  }

  applyRig(rig, dt, t) {
    if (rig.speaking && !this._wasSpeaking) this.jump.kick(3.2);
    this._wasSpeaking = rig.speaking;
    const j = this.jump.update(0, dt);
    this.head.position.y = Math.max(j, -0.2) * 0.35 + Math.sin(t * 1.8) * 0.015;
    this.head.rotation.z = rig.euler.z * 0.6 + rig.hit.x;
    this.head.scale.set(1 - j * 0.08, 1 + j * 0.08, 1);
    this.root.position.x = rig.pos.x * 0.45;
    this.root.position.y = rig.pos.y * 0.2;
  }

  animate(rig, dt, t) {
    const blink = Math.max(rig.blinkL, rig.blinkR) > 0.6;
    const talk = rig.speaking || rig.jaw > 0.25;
    const set = this.frames.idle || this.frames.talk ? this.frames : this.defaults;
    const key = blink ? (talk ? 'blinkTalk' : 'blink') : talk ? 'talk' : 'idle';
    this.mat.map = set[key] || set[talk ? 'talk' : 'idle'] || set.idle || set.talk;
    const shake = talk ? Math.sin(t * 40) * 0.01 : 0;
    this.plane.position.x = shake;
    this.mat.color.setScalar(this.dimSilent && !talk ? 0.55 : 1);
  }

  dispose() {
    Object.values(this.defaults).forEach((t) => t.dispose());
    super.dispose();
  }
}
