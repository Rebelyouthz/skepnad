// Personlagret: kamerabild → (förvrängning, skönhet) → mask med kantförfining
// → ljusomslag från bakgrunden → premultiplicerad linjär färg.
import * as THREE from 'three';
import { COLOR, FULLSCREEN_VERT } from './glsl.js';

export const MAX_WARPS = 6;

const FRAG = /* glsl */ `
uniform sampler2D tVideo;
uniform sampler2D tMask;
uniform sampler2D tBgBlur;
uniform vec2 uViewScale;
uniform vec2 uViewCenter;
uniform float uMirror;
uniform vec2 uVideoRes;
uniform vec2 uMaskRes;
uniform float uUseMask;
uniform float uFeather;
uniform float uBeauty;
uniform float uLightWrap;
uniform vec3 uRelight;
uniform vec4 uWarp[${MAX_WARPS}];
uniform int uWarpCount;
uniform vec2 uShake;
varying vec2 vUv;
${COLOR}

const vec2 DIRS[8] = vec2[8](
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0),
  vec2(0.7071, 0.7071), vec2(-0.7071, 0.7071), vec2(0.7071, -0.7071), vec2(-0.7071, -0.7071)
);

vec2 toVideo(vec2 s) {
  vec2 sd = vec2(s.x, 1.0 - s.y);
  if (uMirror > 0.5) sd.x = 1.0 - sd.x;
  return (sd - 0.5) * uViewScale + uViewCenter;
}
vec3 vid(vec2 v) { return texture2D(tVideo, vec2(v.x, 1.0 - v.y)).rgb; }
float msk(vec2 v) { return texture2D(tMask, v).r; }

vec2 warp(vec2 v) {
  float asp = uVideoRes.x / uVideoRes.y;
  for (int i = 0; i < ${MAX_WARPS}; i++) {
    if (i >= uWarpCount) break;
    vec4 w = uWarp[i];
    vec2 d = v - w.xy;
    d.x *= asp;
    float r = length(d);
    if (r < w.z) {
      float t = r / w.z;
      float k = max(1.0 - w.w * (1.0 - smoothstep(0.0, 1.0, t)), 0.18);
      v = w.xy + (v - w.xy) * k;
    }
  }
  return v;
}

float skinMask(vec3 c) {
  float cb = -0.1687 * c.r - 0.3313 * c.g + 0.5 * c.b + 0.5;
  float cr = 0.5 * c.r - 0.4187 * c.g - 0.0813 * c.b + 0.5;
  return smoothstep(0.06, 0.0, abs(cr - 0.6) - 0.07) * smoothstep(0.08, 0.0, abs(cb - 0.41) - 0.09);
}

void main() {
  vec2 s = vUv - uShake;
  vec2 v = warp(toVideo(s));
  vec3 c = vid(v);
  vec2 px = 1.0 / uVideoRes;

  if (uBeauty > 0.01) {
    vec3 acc = c;
    float wsum = 1.0;
    for (int i = 0; i < 8; i++) {
      for (int ring = 1; ring <= 2; ring++) {
        vec2 o = DIRS[i] * px * (float(ring) * 2.2);
        vec3 ci = vid(v + o);
        vec3 dc = ci - c;
        float w = exp(-dot(dc, dc) * 90.0);
        acc += ci * w;
        wsum += w;
      }
    }
    vec3 soft = acc / wsum;
    float skin = skinMask(c);
    c = mix(c, soft, uBeauty * (0.35 + 0.65 * skin));
    c = mix(c, c * 1.03 + 0.012, uBeauty * skin);
  }

  float a = 1.0;
  if (uUseMask > 0.5) {
    vec2 mt = 1.0 / uMaskRes;
    float m = msk(v);
    float msum = m;
    float ws = 1.0;
    for (int i = 0; i < 8; i++) {
      vec2 vv = v + DIRS[i] * mt * 1.2;
      vec3 ci = vid(vv);
      vec3 dc = ci - c;
      float w = exp(-dot(dc, dc) * 30.0);
      msum += msk(vv) * w;
      ws += w;
    }
    m = msum / ws;
    float lo = mix(0.52, 0.3, uFeather);
    float hi = mix(0.58, 0.8, uFeather);
    a = smoothstep(lo, hi, m);

    // Kanttvätt: hämta färg lite längre in i personen så att rummets ljus inte blöder i kanten
    if (a > 0.01 && a < 0.99) {
      vec2 g = vec2(msk(v + vec2(mt.x * 2.0, 0.0)) - msk(v - vec2(mt.x * 2.0, 0.0)), msk(v + vec2(0.0, mt.y * 2.0)) - msk(v - vec2(0.0, mt.y * 2.0)));
      float gl = length(g);
      if (gl > 0.001) {
        vec3 inner = vid(v + (g / gl) * mt * 2.2 * (1.0 - a));
        c = mix(c, inner, (1.0 - a) * 0.8);
      }
    }

    if (uLightWrap > 0.01) {
      float wide = 0.0;
      for (int i = 0; i < 8; i++) wide += msk(v + DIRS[i] * mt * 5.0);
      wide /= 8.0;
      float edge = clamp((1.0 - wide) * 1.8, 0.0, 1.0);
      vec3 bgc = linearToSrgb(texture2D(tBgBlur, s).rgb);
      c = 1.0 - (1.0 - c) * (1.0 - bgc * edge * uLightWrap);
      c = mix(c, c * (0.75 + bgc * 0.5), edge * uLightWrap * 0.35);
    }
  }
  c *= uRelight;
  gl_FragColor = vec4(srgbToLinear(c) * a, a);
}`;

export class PersonLayer {
  constructor() {
    this.maskTex = new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
    this.maskTex.minFilter = THREE.LinearFilter;
    this.maskTex.magFilter = THREE.LinearFilter;
    this.maskTex.unpackAlignment = 1;
    this.maskTex.needsUpdate = true;
    this.maskVersion = -1;
    const warps = [];
    for (let i = 0; i < MAX_WARPS; i++) warps.push(new THREE.Vector4());
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tVideo: { value: null },
        tMask: { value: this.maskTex },
        tBgBlur: { value: null },
        uViewScale: { value: new THREE.Vector2(1, 1) },
        uViewCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uMirror: { value: 1 },
        uVideoRes: { value: new THREE.Vector2(1280, 720) },
        uMaskRes: { value: new THREE.Vector2(256, 144) },
        uUseMask: { value: 1 },
        uFeather: { value: 0.5 },
        uBeauty: { value: 0 },
        uLightWrap: { value: 0 },
        uRelight: { value: new THREE.Vector3(1, 1, 1) },
        uWarp: { value: warps },
        uWarpCount: { value: 0 },
        uShake: { value: new THREE.Vector2() },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
  }

  updateMask(mask) {
    if (!mask.data || mask.version === this.maskVersion) return;
    this.maskVersion = mask.version;
    const img = this.maskTex.image;
    if (img.width !== mask.width || img.height !== mask.height) {
      this.maskTex.dispose();
      this.maskTex = new THREE.DataTexture(mask.data, mask.width, mask.height, THREE.RedFormat, THREE.UnsignedByteType);
      this.maskTex.minFilter = THREE.LinearFilter;
      this.maskTex.magFilter = THREE.LinearFilter;
      this.maskTex.unpackAlignment = 1;
      this.material.uniforms.tMask.value = this.maskTex;
      this.material.uniforms.uMaskRes.value.set(mask.width, mask.height);
    } else {
      this.maskTex.image.data = mask.data;
    }
    this.maskTex.needsUpdate = true;
  }

  setView(view) {
    const u = this.material.uniforms;
    u.uViewScale.value.set(view.scale.x, view.scale.y);
    u.uViewCenter.value.set(view.center.x, view.center.y);
    u.uMirror.value = view.mirror ? 1 : 0;
    u.uVideoRes.value.set(view.vidW, view.vidH);
  }
}
