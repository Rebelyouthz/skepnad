// Mappning mellan skärm (utdata) och kamerabild: täckande beskärning,
// spegling och auto-inramning. Alla koordinater normaliserade med origo uppe
// till vänster (som MediaPipe-landmärken).
import { springStep } from '../media/oneEuro.js';

export class ViewTransform {
  constructor() {
    this.outW = 1280;
    this.outH = 720;
    this.vidW = 1280;
    this.vidH = 720;
    this.mirror = true;
    this.scale = { x: 1, y: 1 };
    this.center = { x: 0.5, y: 0.5 };
    this._zoom = { x: 1, v: 0 };
    this._cx = { x: 0.5, v: 0 };
    this._cy = { x: 0.5, v: 0 };
  }

  update({ outW, outH, vidW, vidH, mirror, autoFrame, zoom = 1.35, face, dt }) {
    this.outW = outW;
    this.outH = outH;
    this.vidW = vidW || this.vidW;
    this.vidH = vidH || this.vidH;
    this.mirror = mirror;
    const outA = outW / outH;
    const vidA = this.vidW / this.vidH;
    let sx = 1;
    let sy = 1;
    if (vidA > outA) sx = outA / vidA;
    else sy = vidA / outA;

    let tz = 1;
    let tx = 0.5;
    let ty = 0.5;
    if (autoFrame && face?.present) {
      tz = zoom;
      tx = face.eyeMid.x;
      ty = face.eyeMid.y + 0.13 * (sy / tz);
    }
    const z = springStep(this._zoom, tz, dt, 3.2);
    const cx = springStep(this._cx, tx, dt, 3.2);
    const cy = springStep(this._cy, ty, dt, 3.2);
    sx /= z;
    sy /= z;
    this.scale.x = sx;
    this.scale.y = sy;
    this.center.x = Math.min(Math.max(cx, sx / 2), 1 - sx / 2);
    this.center.y = Math.min(Math.max(cy, sy / 2), 1 - sy / 2);
  }

  /** videokoordinat (0..1, y ner) → skärmkoordinat (0..1, y ner) */
  videoToScreen(vx, vy) {
    let x = (vx - this.center.x) / this.scale.x + 0.5;
    const y = (vy - this.center.y) / this.scale.y + 0.5;
    if (this.mirror) x = 1 - x;
    return { x, y };
  }

  /** pixelstorlek i video → pixelstorlek i utdata */
  videoPxToOutPx(px) {
    return (px / this.vidW / this.scale.x) * this.outW;
  }
}
