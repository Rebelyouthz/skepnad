// Ansikts-, segmenterings- och gestspårning med MediaPipe Tasks Vision.
import { FilesetResolver, FaceLandmarker, ImageSegmenter, GestureRecognizer } from '@mediapipe/tasks-vision';
import * as THREE from 'three';

const MP_VERSION = '1.0.1';
const local = (p) => new URL(p, document.baseURI).href;

const SOURCES = {
  wasm: [local('mediapipe/wasm'), `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`],
  face: [
    local('models/face_landmarker.task'),
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
  ],
  segment: [
    local('models/selfie_segmenter_landscape.tflite'),
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite',
  ],
  gesture: [
    local('models/gesture_recognizer.task'),
    'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task',
  ],
};

// Viktiga landmärken (MediaPipe Face Mesh-index)
export const LM = {
  eyeOuterR: 33, // motivets höger öga (bildens vänster)
  eyeOuterL: 263,
  irisR: 468,
  irisL: 473,
  noseTip: 1,
  noseBridge: 168,
  forehead: 10,
  chin: 152,
  mouthTop: 13,
  mouthBottom: 14,
  mouthLeft: 61,
  mouthRight: 291,
  cheekR: 234,
  cheekL: 454,
  eyeTopR: 159,
  eyeBotR: 145,
  eyeTopL: 386,
  eyeBotL: 374,
};

async function firstWorking(urls, create) {
  let lastErr;
  for (const url of urls) {
    try {
      return await create(url);
    } catch (err) {
      lastErr = err;
      console.warn('[tracker] misslyckades med', url, err?.message || err);
    }
  }
  throw lastErr;
}

async function createTask(Klass, fileset, modelUrls, options, delegate = 'GPU') {
  return firstWorking(modelUrls, async (modelAssetPath) => {
    try {
      return await Klass.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath, delegate },
      });
    } catch (err) {
      console.warn('[tracker] GPU-delegat misslyckades, provar CPU', err?.message || err);
      return Klass.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath, delegate: 'CPU' },
      });
    }
  });
}

const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

export class Tracker {
  constructor() {
    this.ready = { face: false, segment: false, gesture: false };
    this.face = {
      present: false,
      lostFor: 0,
      lm: new Float32Array(478 * 3),
      blend: {},
      quat: new THREE.Quaternion(),
      videoW: 1280,
      videoH: 720,
      eyeMid: { x: 0.5, y: 0.45, z: 0 },
      unitPx: 100,
      earR: 0.3,
      earL: 0.3,
      version: 0,
    };
    this.mask = { data: null, width: 0, height: 0, version: 0 };
    this.gesture = { name: 'None', score: 0, x: 0.5, y: 0.5, tipX: 0.5, tipY: 0.5, present: false, version: 0 };
    this._maskF = null;
    this._lastTs = 0;
    this._lastVideoTime = -1;
    this._frame = 0;
    this._hasLm = false;
    this.stats = { faceMs: 0, segMs: 0, gestureMs: 0 };
  }

  async init({ onProgress = () => {}, gestures = true } = {}) {
    onProgress('Laddar AI-motorn…', 0.1);
    this.fileset = await firstWorking(SOURCES.wasm, (u) => FilesetResolver.forVisionTasks(u));
    onProgress('Laddar ansiktsspårning…', 0.35);
    try {
      this.faceTask = await createTask(FaceLandmarker, this.fileset, SOURCES.face, {
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.ready.face = true;
    } catch (err) {
      console.error('[tracker] ansiktsspårning kunde inte laddas', err);
    }
    onProgress('Laddar bakgrundsseparering…', 0.6);
    try {
      // Små indata (256×144) gör GPU-varianten snabbast; CPU kan väljas för felsökning.
      this.segTask = await createTask(
        ImageSegmenter,
        this.fileset,
        SOURCES.segment,
        { runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true },
        globalThis.SKEPNAD_SEG_DELEGATE || 'GPU',
      );
      this.ready.segment = true;
    } catch (err) {
      console.error('[tracker] segmentering kunde inte laddas', err);
    }
    if (gestures) {
      onProgress('Laddar gestigenkänning…', 0.8);
      try {
        this.gestureTask = await createTask(GestureRecognizer, this.fileset, SOURCES.gesture, {
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });
        this.ready.gesture = true;
      } catch (err) {
        console.error('[tracker] gester kunde inte laddas', err);
      }
    }
    onProgress('Klart!', 1);
    return this.ready;
  }

  /** Kör de modeller som behövs på en ny videobild. Returnerar true om något uppdaterades. */
  process(video, { segment = true, gesture = false, gestureEvery = 2 } = {}) {
    if (!video || video.readyState < 2 || !video.videoWidth) return false;
    if (video.currentTime === this._lastVideoTime) return false;
    this._lastVideoTime = video.currentTime;
    const now = performance.now();
    const ts = Math.max(now, this._lastTs + 1);
    const dt = this._lastTs ? Math.min((ts - this._lastTs) / 1000, 0.25) : 1 / 30;
    this._lastTs = ts;
    this._frame++;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    this.face.videoW = vw;
    this.face.videoH = vh;

    // Nedskalade kopior: mycket billigare för MediaPipe att ladda upp/läsa än full 720p/1080p.
    const small = this._scaled('_faceCv', video, 640, Math.round((640 * vh) / vw));
    if (this.faceTask) {
      const t0 = performance.now();
      try {
        this._updateFace(this.faceTask.detectForVideo(small, ts), dt);
      } catch (err) {
        console.warn('[tracker] face', err);
      }
      this.stats.faceMs = performance.now() - t0;
    }
    if (segment && this.segTask) {
      const t0 = performance.now();
      try {
        const segIn = this._scaled('_segCv', small, 256, Math.round((256 * vh) / vw));
        this.segTask.segmentForVideo(segIn, ts, (res) => this._updateMask(res));
      } catch (err) {
        console.warn('[tracker] segment', err);
      }
      this.stats.segMs = performance.now() - t0;
    }
    if (gesture && this.gestureTask && this._frame % gestureEvery === 0) {
      const t0 = performance.now();
      try {
        this._updateGesture(this.gestureTask.recognizeForVideo(small, ts));
      } catch (err) {
        console.warn('[tracker] gesture', err);
      }
      this.stats.gestureMs = performance.now() - t0;
    } else if (!gesture && this.gesture.present) {
      this.gesture.present = false;
      this.gesture.name = 'None';
    }
    return true;
  }

  _scaled(key, src, w, h) {
    let cv = this[key];
    if (!cv || cv.width !== w || cv.height !== h) {
      cv = this[key] = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      cv._ctx = cv.getContext('2d', { alpha: false, desynchronized: true });
    }
    cv._ctx.drawImage(src, 0, 0, w, h);
    return cv;
  }

  _updateFace(res, dt) {
    const f = this.face;
    const lms = res?.faceLandmarks?.[0];
    if (!lms || lms.length < 468) {
      f.lostFor += dt;
      if (f.lostFor > 0.35) {
        f.present = false;
        this._hasLm = false;
      }
      return;
    }
    const vw = f.videoW;
    const vh = f.videoH;
    const n = Math.min(lms.length, 478);

    // Adaptiv utjämning: rörelse i pixlar styr hur snabbt vi följer.
    const ex = ((lms[LM.eyeOuterR].x + lms[LM.eyeOuterL].x) / 2) * vw;
    const ey = ((lms[LM.eyeOuterR].y + lms[LM.eyeOuterL].y) / 2) * vh;
    let a = 1;
    if (this._hasLm) {
      const px = ((f.lm[LM.eyeOuterR * 3] + f.lm[LM.eyeOuterL * 3]) / 2) * vw;
      const py = ((f.lm[LM.eyeOuterR * 3 + 1] + f.lm[LM.eyeOuterL * 3 + 1]) / 2) * vh;
      const move = Math.hypot(ex - px, ey - py);
      const t = Math.min(Math.max((move - 0.4) / 7, 0), 1);
      a = 0.32 + t * 0.63;
    }
    const lm = f.lm;
    for (let i = 0; i < n; i++) {
      const p = lms[i];
      const j = i * 3;
      if (this._hasLm) {
        lm[j] += (p.x - lm[j]) * a;
        lm[j + 1] += (p.y - lm[j + 1]) * a;
        lm[j + 2] += (p.z - lm[j + 2]) * a;
      } else {
        lm[j] = p.x;
        lm[j + 1] = p.y;
        lm[j + 2] = p.z;
      }
    }
    this._hasLm = true;
    f.present = true;
    f.lostFor = 0;

    const cats = res.faceBlendshapes?.[0]?.categories;
    if (cats) {
      for (const c of cats) {
        const prev = f.blend[c.categoryName];
        const k = c.categoryName.startsWith('eyeBlink') ? 0.75 : 0.5;
        f.blend[c.categoryName] = prev === undefined ? c.score : prev + (c.score - prev) * k;
      }
    }

    const mat = res.facialTransformationMatrixes?.[0]?.data;
    if (mat) {
      tmpM.fromArray(mat);
      tmpM.decompose(tmpP, tmpQ, tmpS);
      const ang = f.quat.angleTo(tmpQ);
      const s = Math.min(Math.max(ang / 0.25, 0.3), 1);
      if (f.version === 0) f.quat.copy(tmpQ);
      else f.quat.slerp(tmpQ, s);
    }

    // Härledda mått
    const get = (i) => ({ x: lm[i * 3], y: lm[i * 3 + 1], z: lm[i * 3 + 2] });
    const r = get(LM.eyeOuterR);
    const l = get(LM.eyeOuterL);
    f.eyeMid = { x: (r.x + l.x) / 2, y: (r.y + l.y) / 2, z: (r.z + l.z) / 2 };
    const dx = (l.x - r.x) * vw;
    const dy = (l.y - r.y) * vh;
    const dz = (l.z - r.z) * vw;
    const unit = Math.hypot(dx, dy, dz);
    f.unitPx = f.version === 0 ? unit : f.unitPx + (unit - f.unitPx) * 0.3;
    const ear = (top, bot, a1, a2) => {
      const h = Math.hypot((lm[top * 3] - lm[bot * 3]) * vw, (lm[top * 3 + 1] - lm[bot * 3 + 1]) * vh);
      const w = Math.hypot((lm[a1 * 3] - lm[a2 * 3]) * vw, (lm[a1 * 3 + 1] - lm[a2 * 3 + 1]) * vh);
      return w > 0 ? h / w : 0.3;
    };
    f.earR = ear(LM.eyeTopR, LM.eyeBotR, 33, 133);
    f.earL = ear(LM.eyeTopL, LM.eyeBotL, 263, 362);
    f.version++;
  }

  _updateMask(res) {
    const m = res?.confidenceMasks?.[0];
    if (!m) return;
    const w = m.width;
    const h = m.height;
    const src = m.getAsFloat32Array();
    if (!this._maskF || this._maskF.length !== src.length) {
      this._maskF = new Float32Array(src);
      this.mask.data = new Uint8Array(src.length);
    } else {
      const prev = this._maskF;
      for (let i = 0; i < src.length; i++) {
        // Snabb upp, lite trögare ner → mindre fladder i kanterna
        const v = src[i];
        const k = v > prev[i] ? 0.75 : 0.55;
        prev[i] += (v - prev[i]) * k;
      }
    }
    // Mjuka upp masken (två pass binomial 1-2-1 horisontellt + vertikalt) → mjukare kontur
    const f = this._maskF;
    this._tmpA ??= new Float32Array(f.length);
    this._tmpB ??= new Float32Array(f.length);
    if (this._tmpA.length !== f.length) {
      this._tmpA = new Float32Array(f.length);
      this._tmpB = new Float32Array(f.length);
    }
    const A = this._tmpA;
    const B = this._tmpB;
    A.set(f);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        const r = y * w;
        B[r] = (A[r] * 3 + A[r + 1]) / 4;
        for (let x = 1; x < w - 1; x++) B[r + x] = (A[r + x - 1] + 2 * A[r + x] + A[r + x + 1]) / 4;
        B[r + w - 1] = (A[r + w - 2] + A[r + w - 1] * 3) / 4;
      }
      for (let x = 0; x < w; x++) {
        A[x] = (B[x] * 3 + B[x + w]) / 4;
        for (let y = 1; y < h - 1; y++) {
          const i = y * w + x;
          A[i] = (B[i - w] + 2 * B[i] + B[i + w]) / 4;
        }
        const last = (h - 1) * w + x;
        A[last] = (B[last - w] + B[last] * 3) / 4;
      }
    }
    const out = this.mask.data;
    for (let i = 0; i < A.length; i++) out[i] = A[i] * 255;
    this.mask.width = w;
    this.mask.height = h;
    this.mask.version++;
  }

  _updateGesture(res) {
    const g = this.gesture;
    const top = res?.gestures?.[0]?.[0];
    const lms = res?.landmarks?.[0];
    if (!top || !lms) {
      g.present = false;
      g.name = 'None';
      g.score = 0;
      return;
    }
    g.present = true;
    g.name = top.categoryName || 'None';
    g.score = top.score;
    g.handedness = res.handedness?.[0]?.[0]?.categoryName || '';
    const c = lms[9];
    const tip = lms[8];
    g.x = c.x;
    g.y = c.y;
    g.tipX = g.version === 0 ? tip.x : g.tipX + (tip.x - g.tipX) * 0.6;
    g.tipY = g.version === 0 ? tip.y : g.tipY + (tip.y - g.tipY) * 0.6;
    g.version++;
  }

  landmark(i) {
    const lm = this.face.lm;
    return { x: lm[i * 3], y: lm[i * 3 + 1], z: lm[i * 3 + 2] };
  }

  dispose() {
    this.faceTask?.close();
    this.segTask?.close();
    this.gestureTask?.close();
  }
}
