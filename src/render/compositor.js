// Huvudrenderaren: bakgrund → förgrund (person/avatar, AR, partiklar) → filter → overlay.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ViewTransform } from './view.js';
import { BackgroundLayer } from './backgrounds/layer.js';
import { SCENE_MAP } from './backgrounds/scenes.js';
import { PersonLayer, MAX_WARPS } from './person.js';
import { PostPass, FILTER_MAP } from './filters.js';
import { QuadPass } from './glsl.js';
import { Blur, makeRT } from './blur.js';
import { computeAllWarps } from './faceWarp.js';
import { ArLayer } from './ar/arLayer.js';
import { Particles } from './fx/particles.js';
import { Throwables } from './fx/throwables.js';
import { Overlay } from './overlay.js';
import { AvatarLayer } from '../avatar/avatarLayer.js';
import { FaceSwapLayer } from './faceSwap/faceSwap.js';
import { MakeupLayer } from './faceSwap/makeup.js';
import { LM } from '../media/tracker.js';

export const QUALITY = {
  high: { w: 1920, h: 1080, samples: 4 },
  balanced: { w: 1280, h: 720, samples: 4 },
  fast: { w: 960, h: 540, samples: 0 },
};

export class Compositor {
  constructor(canvas, { tracker, video }) {
    this.canvas = canvas;
    this.tracker = tracker;
    this.video = video;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.autoClear = false;
    r.setPixelRatio(1);
    r.toneMapping = THREE.NoToneMapping;
    this.renderer = r;
    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.view = new ViewTransform();
    this.bg = new BackgroundLayer();
    this.person = new PersonLayer();
    this.personPass = new QuadPass(this.person.material);
    this.post = new PostPass();
    this.ar = new ArLayer();
    this.ar.setEnvironment(this.envTex);
    this.avatar = new AvatarLayer();
    this.avatar.setEnvironment(this.envTex);
    this.particles = new Particles();
    this.throwables = new Throwables(this.particles);
    this.overlay = new Overlay();
    this.swap = new FaceSwapLayer();
    this.makeup = new MakeupLayer();
    this._skinTick = 0;
    this.camBlur = new Blur(4);
    this.bgBlur = new Blur(8);

    this.videoTex = new THREE.VideoTexture(video);
    this.videoTex.colorSpace = THREE.NoColorSpace;
    this.videoTex.minFilter = THREE.LinearFilter;
    this.videoTex.magFilter = THREE.LinearFilter;
    this.videoTex.generateMipmaps = false;

    this.shakeState = { amp: 0, dir: 0, x: 0, y: 0 };
    this._rollEuler = new THREE.Euler();
    this.parallax = new THREE.Vector2();
    this.audioSmooth = 0;
    this.tint = '#ffffff';
    this._wantShot = null;
    this.quality = null;
    this.setQuality('balanced');
  }

  setQuality(q, aspect = this.aspect || 'landscape') {
    const Q = QUALITY[q] ?? QUALITY.balanced;
    const key = `${q}:${aspect}`;
    if (this.qualityKey === key) return;
    this.qualityKey = key;
    this.quality = q;
    this.aspect = aspect;
    const portrait = aspect === 'portrait';
    const w = portrait ? Q.h : Q.w;
    const h = portrait ? Q.w : Q.h;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.bgRT?.dispose();
    this.fgRT?.dispose();
    this.stackA?.dispose();
    this.stackB?.dispose();
    this.stackA = this.stackB = null;
    this.bgRT = makeRT(w, h);
    this.fgRT = makeRT(w, h, { depthBuffer: true, samples: Q.samples });
    this.camBlur.setSize(w, h);
    this.bgBlur.setSize(w, h);
    this.ar.setSize(w, h);
    this.particles.setSize(w, h);
    this.overlay.setSize(w, h);
    this.swap.setSize(w, h);
    this.makeup.setSize(w, h);
    this.avatar.setAspect(w / h);
    this.post.uniforms.uRes.value.set(w, h);
  }

  setTint(color) {
    if (this.tint === color) return;
    this.tint = color;
    this.ar.setTint(color);
    this.avatar.setTint(color);
  }

  shake(amount = 1, dir = 0) {
    this.shakeState.amp = Math.max(this.shakeState.amp, amount);
    this.shakeState.dir = dir;
  }

  /** Nästa renderade bild som PNG-blob. */
  screenshot() {
    return new Promise((resolve) => (this._wantShot = resolve));
  }

  captureStream(fps = 30) {
    return this.canvas.captureStream(fps);
  }

  /** Förkompilera shaders i bakgrunden så att byten blir hackfria. */
  precompile() {
    try {
      this.bg.precompile(this.renderer);
      this.post.precompile(this.renderer);
    } catch (err) {
      console.warn('[compositor] precompile', err);
    }
  }

  // ---------- Skärmpositioner för effekter (pixlar, y upp) ----------
  faceAnchor(mode) {
    const W = this.width;
    const H = this.height;
    if (mode === 'avatar') return { ...this.avatar.headScreen(W, H), present: true };
    const f = this.tracker.face;
    if (!f.present) return { x: W / 2, y: H * 0.62, unit: H * 0.14, present: false };
    const p = this.view.videoToScreen(f.eyeMid.x, f.eyeMid.y);
    return { x: p.x * W, y: (1 - p.y) * H, unit: this.view.videoPxToOutPx(f.unitPx), present: true };
  }

  /** Ansiktets ankare för klistermärken: position, enhet och lutning (radianer, moturs). */
  stickerAnchor(mode) {
    const a = this.faceAnchor(mode);
    let roll = 0;
    if (mode === 'avatar') roll = this.avatar.rig.euler.z;
    else if (this.tracker.face.present) {
      const e = this._rollEuler.setFromQuaternion(this.tracker.face.quat, 'YXZ');
      roll = this.view.mirror ? -e.z : e.z;
    }
    return { ...a, roll };
  }

  mouthAnchor(mode) {
    const W = this.width;
    const H = this.height;
    if (mode === 'avatar') {
      const m = this.avatar.mouthScreen(W, H);
      return { ...m, facing: Math.abs(Math.sin(m.dir) + 1) < 0.02 };
    }
    const f = this.tracker.face;
    if (!f.present) return { x: W / 2, y: H * 0.45, unit: H * 0.14, dir: -Math.PI / 2, facing: true };
    const a = this.tracker.landmark(LM.mouthTop);
    const b = this.tracker.landmark(LM.mouthBottom);
    const p = this.view.videoToScreen((a.x + b.x) / 2, (a.y + b.y) / 2);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(f.quat);
    let dx = fwd.x * (this.view.mirror ? -1 : 1);
    const dy = fwd.y;
    const len = Math.hypot(dx, dy);
    return {
      x: p.x * W,
      y: (1 - p.y) * H,
      unit: this.view.videoPxToOutPx(f.unitPx),
      dir: len > 0.25 ? Math.atan2(dy, dx) : -Math.PI / 2,
      facing: len <= 0.25,
    };
  }

  handAnchor(mode, tip = false) {
    const g = this.tracker.gesture;
    if (!g.present) return null;
    const p = this.view.videoToScreen(tip ? g.tipX : g.x, tip ? g.tipY : g.y);
    const unit = this.faceAnchor(mode).unit;
    return { x: p.x * this.width, y: (1 - p.y) * this.height, unit };
  }

  // ---------- Rendering ----------
  render({ dt, t, s, audio, hasVideo }) {
    const r = this.renderer;
    const W = this.width;
    const H = this.height;
    const face = this.tracker.face;
    const mode = s.video.mode;
    const bgType = s.background.type;
    const cameraMode = mode === 'camera' && hasVideo;
    const mirror = s.video.mirror;

    this.audioSmooth += (audio - this.audioSmooth) * (audio > this.audioSmooth ? 0.5 : 0.08);
    if (hasVideo) this.videoTex.image = this.video;

    this.view.update({
      outW: W,
      outH: H,
      vidW: this.video.videoWidth,
      vidH: this.video.videoHeight,
      mirror,
      autoFrame: s.video.autoFrame && cameraMode,
      zoom: s.video.autoFrameZoom,
      face,
      dt,
    });
    const pm = this.person.material.uniforms;
    this.person.setView(this.view);
    this.person.updateMask(this.tracker.mask);
    pm.tVideo.value = this.videoTex;

    // Parallax från huvudets position
    let px = 0;
    let py = 0;
    if (s.background.parallax && face.present) {
      px = -(face.eyeMid.x - 0.5) * 2 * (mirror ? -1 : 1);
      py = (face.eyeMid.y - 0.45) * 2;
    } else if (s.background.parallax && mode === 'avatar') {
      px = -this.avatar.rig.pos.x * 0.6;
      py = -this.avatar.rig.pos.y * 0.6;
    }
    this.parallax.x += (px - this.parallax.x) * Math.min(dt * 4, 1);
    this.parallax.y += (py - this.parallax.y) * Math.min(dt * 4, 1);
    const bu = this.bg.uniforms;
    bu.uTime.value = t;
    bu.uAudio.value = s.background.reactive ? Math.min(this.audioSmooth * 2.5, 1) : 0;
    bu.uPar.value.copy(this.parallax);

    // Skakning
    const sh = this.shakeState;
    sh.amp *= Math.exp(-dt * 7);
    sh.x = (Math.random() - 0.5) * sh.amp * 0.035 + sh.dir * sh.amp * 0.02;
    sh.y = (Math.random() - 0.5) * sh.amp * 0.035;

    // ---- 1. Bakgrund
    const setPersonRaw = () => {
      pm.uUseMask.value = 0;
      pm.uWarpCount.value = 0;
      pm.uBeauty.value = 0;
      pm.uLightWrap.value = 0;
      pm.uRelight.value.set(1, 1, 1);
      pm.uShake.value.set(0, 0);
    };
    if (bgType === 'blur' && hasVideo) {
      setPersonRaw();
      this.personPass.render(r, this.camBlur.a);
      const k = s.background.blur;
      this.camBlur.run(r, this.camBlur.a.texture, { iterations: 2 + Math.round(k * 3), radius: 0.8 + k * 2.2 });
      this.bg.render(r, this.bgRT, { type: 'blur', blurTexture: this.camBlur.texture, outW: W, outH: H });
    } else if (bgType === 'none' && hasVideo && mode === 'avatar') {
      setPersonRaw();
      this.personPass.render(r, this.bgRT);
    } else {
      const type = bgType === 'none' ? 'solid' : bgType;
      this.bg.render(r, this.bgRT, { type, sceneId: s.background.scene, outW: W, outH: H });
    }

    // ---- 2. Förgrund
    r.setRenderTarget(this.fgRT);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, false);
    const f = s.filter;
    const tint = bgType === 'scene' ? SCENE_MAP[s.background.scene]?.tint ?? '#ffffff' : '#ffffff';
    this.setTint(tint);

    if (cameraMode) {
      const useMask = bgType !== 'none';
      if (useMask && f.lightWrap > 0.01) {
        this.bgBlur.run(r, this.bgRT.texture, { iterations: 2, radius: 1.5 });
        pm.tBgBlur.value = this.bgBlur.texture;
      }
      pm.uUseMask.value = useMask ? 1 : 0;
      pm.uFeather.value = s.video.feather;
      pm.uBeauty.value = f.beauty;
      pm.uLightWrap.value = useMask && bgType !== 'green' ? f.lightWrap : 0;
      const tc = new THREE.Color(tint);
      const mx = Math.max(tc.r, tc.g, tc.b, 0.001);
      const k = useMask && bgType === 'scene' ? f.relight * 0.22 : 0;
      pm.uRelight.value.set(1 + (tc.r / mx - 1) * k, 1 + (tc.g / mx - 1) * k, 1 + (tc.b / mx - 1) * k);
      // AI-ansikte: förvrängningar stängs av (ansiktsnätet följer de ospårade punkterna)
      const swapping = s.face.swap && s.face.swap !== 'none' && this.swap.current?.id === s.face.swap;
      const warpIds = swapping ? [] : [s.face.warp, ...(s.face.warps || [])].filter((w, i, a) => w && w !== 'none' && a.indexOf(w) === i);
      const warps = computeAllWarps(warpIds, s.face.warpStrength, face);
      pm.uWarpCount.value = warps.length;
      for (let i = 0; i < MAX_WARPS; i++) pm.uWarp.value[i].set(...(warps[i] ?? [0, 0, 0, 0]));
      pm.uShake.value.set(sh.x, sh.y);
      this.personPass.render(r, this.fgRT);
      if (swapping && this.swap.update(face, this.view, W, H, { dt, opacity: s.face.swapAmount ?? 1, shade: s.face.swapLight ?? 0.75 })) {
        if (this._skinTick++ % 10 === 0) this.swap.measureSkin(this.tracker._faceCv, face.lm);
        this.swap.render(r, this.fgRT, this.videoTex);
      } else if (!swapping) this.swap.hide();
      if (this.makeup.update(face, this.view, W, H, s.face.makeup)) this.makeup.render(r, this.fgRT);
      this.ar.attach(null);
      this.ar.update(face, this.view, dt, t, { audio: this.audioSmooth });
      if (this.ar.visible) r.render(this.ar.scene, this.ar.camera);
    } else if (mode === 'avatar') {
      this.avatar.update(face, this.audioSmooth, {
        mirror,
        follow: s.avatar.headFollow,
        scale: s.avatar.scale,
        offsetY: s.avatar.offsetY + sh.y * 3,
        dt,
        t,
      });
      this.avatar.holder.position.x = sh.x * 3;
      this.ar.attach(this.avatar.current);
      this.ar.update(face, this.view, dt, t, { audio: this.audioSmooth });
      r.setRenderTarget(this.fgRT);
      r.render(this.avatar.scene, this.avatar.camera);
    }
    this.particles.update(dt, t);
    r.setRenderTarget(this.fgRT);
    r.render(this.particles.scene, this.particles.camera);

    // ---- 3. Efterbehandling till skärm
    const u = this.post.uniforms;
    u.tBg.value = this.bgRT.texture;
    u.tFg.value = this.fgRT.texture;
    u.uTime.value = t;
    u.uAudio.value = Math.min(this.audioSmooth * 2, 1);
    u.uFilterAll.value = s.background.filterAffectsBg && bgType !== 'green' ? 1 : 0;
    u.uIntensity.value = f.intensity;
    u.uBrightness.value = f.brightness;
    u.uContrast.value = f.contrast;
    u.uSaturation.value = f.saturation;
    u.uWarmth.value = f.warmth;
    u.uVignette.value = bgType === 'green' ? 0 : f.vignette;
    u.uGrain.value = f.grain;
    u.uSharpen.value = f.sharpen;
    u.uLetterbox.value = s.overlays.frame === 'cinema' ? 1 : 0;
    u.uFlash.value = Math.max(0, u.uFlash.value - dt * 3);
    u.uGlitchBoost.value = Math.max(0, u.uGlitchBoost.value - dt * 1.5);
    this.post.setFilter(s.filter.id);
    const extras = (s.filter.extra || []).filter((e) => e && e.on !== false && e.id !== 'none' && FILTER_MAP[e.id]);
    if (extras.length) this._renderStack(r, extras, s.filter.id, W, H);
    else {
      r.setRenderTarget(null);
      r.setClearColor(0x000000, 1);
      r.clear(true, false, false);
      this.post.render(r, null);
    }

    // ---- 4. Overlay
    this.overlay.update(dt, t, s, { vhs: s.filter.id === 'vhs' || (s.filter.extra || []).some((e) => e.id === 'vhs' && e.on !== false), face: s.stickers?.items?.length ? this.stickerAnchor(mode) : null });
    this.overlay.render(r);

    if (this._wantShot) {
      const done = this._wantShot;
      this._wantShot = null;
      this.canvas.toBlob((b) => done(b), 'image/png');
    }
  }

  /** Filterlager: huvudfiltret till en buffert, sedan varje extra filter ovanpå. */
  _renderStack(r, extras, mainId, W, H) {
    this.stackA ??= makeRT(W, H, { type: THREE.UnsignedByteType });
    this.stackB ??= makeRT(W, H, { type: THREE.UnsignedByteType });
    const u = this.post.uniforms;
    this.post.render(r, this.stackA);
    const keys = ['uBrightness', 'uContrast', 'uSaturation', 'uWarmth', 'uVignette', 'uGrain', 'uSharpen', 'uLetterbox', 'uFlash', 'uGlitchBoost'];
    const saved = keys.map((k) => u[k].value);
    const keepInt = u.uIntensity.value;
    keys.forEach((k) => (u[k].value = 0));
    u.uStack.value = 1;
    let src = this.stackA;
    let dst = this.stackB;
    extras.forEach((e, i) => {
      const last = i === extras.length - 1;
      u.tPrev.value = src.texture;
      u.uIntensity.value = e.intensity ?? 1;
      this.post.setFilter(e.id);
      if (last) {
        r.setRenderTarget(null);
        r.setClearColor(0x000000, 1);
        r.clear(true, false, false);
      }
      this.post.render(r, last ? null : dst);
      [src, dst] = [dst, src];
    });
    u.uStack.value = 0;
    u.uIntensity.value = keepInt;
    keys.forEach((k, i) => (u[k].value = saved[i]));
    this.post.setFilter(mainId);
  }

  // ---------- Miniatyrer (atlas + en enda pixelavläsning) ----------
  _atlas(ids, tileW, tileH, cols, drawTile) {
    const rows = Math.ceil(ids.length / cols);
    const W = tileW * cols;
    const H = tileH * rows;
    this._thumbRTs ??= new Map();
    const key = `${W}x${H}`;
    if (!this._thumbRTs.has(key)) this._thumbRTs.set(key, new THREE.WebGLRenderTarget(W, H, { depthBuffer: false }));
    const rt = this._thumbRTs.get(key);
    rt.scissorTest = true;
    ids.forEach((id, i) => {
      const x = (i % cols) * tileW;
      const y = H - (Math.floor(i / cols) + 1) * tileH;
      rt.viewport.set(x, y, tileW, tileH);
      rt.scissor.set(x, y, tileW, tileH);
      drawTile(id, rt);
    });
    rt.scissorTest = false;
    rt.viewport.set(0, 0, W, H);
    rt.scissor.set(0, 0, W, H);
    const buf = new Uint8ClampedArray(W * H * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    this.renderer.setRenderTarget(null);
    // vänd rader (WebGL läser nerifrån och upp)
    const row = W * 4;
    const flipped = new Uint8ClampedArray(buf.length);
    for (let y = 0; y < H; y++) flipped.set(buf.subarray((H - 1 - y) * row, (H - y) * row), y * row);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.getContext('2d').putImageData(new ImageData(flipped, W, H), 0, 0);
    const rects = Object.fromEntries(ids.map((id, i) => [id, { x: (i % cols) * tileW, y: Math.floor(i / cols) * tileH, w: tileW, h: tileH }]));
    return { canvas, rects };
  }

  sceneThumbs(ids, t = 3, tileW = 256, tileH = 160) {
    const u = this.bg.uniforms;
    const saved = [u.uTime.value, u.uRes.value.clone(), u.uPar.value.clone(), u.uAudio.value];
    u.uRes.value.set(1280, 800);
    u.uPar.value.set(0, 0);
    u.uAudio.value = 0;
    u.uSrgbOut.value = 1;
    u.uTime.value = t;
    const out = this._atlas(ids, tileW, tileH, 4, (id, rt) => {
      this.bg.pass.material = this.bg.sceneMaterial(id);
      this.bg.pass.render(this.renderer, rt);
    });
    u.uSrgbOut.value = 0;
    [u.uTime.value] = saved;
    u.uRes.value.copy(saved[1]);
    u.uPar.value.copy(saved[2]);
    u.uAudio.value = saved[3];
    return out;
  }

  filterThumbs(ids, tileW = 192, tileH = 120) {
    const u = this.post.uniforms;
    u.tBg.value = this.bgRT.texture;
    u.tFg.value = this.fgRT.texture;
    const keepFlash = u.uFlash.value;
    u.uFlash.value = 0;
    const out = this._atlas(ids, tileW, tileH, 5, (id, rt) => {
      this.post.pass.material = this.post.material(id);
      this.post.pass.render(this.renderer, rt);
    });
    u.uFlash.value = keepFlash;
    this.post.setFilter(this.post.current);
    return out;
  }

  flash(color = '#ffffff', amount = 1) {
    this.post.uniforms.uFlashColor.value.set(color);
    this.post.uniforms.uFlash.value = amount;
  }

  glitch(amount = 1.5) {
    this.post.uniforms.uGlitchBoost.value = amount;
  }
}
