// Snabb separabel gaussisk oskärpa på nedskalade renderingsmål.
import * as THREE from 'three';
import { FULLSCREEN_VERT, QuadPass } from './glsl.js';

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tSrc, vUv) * 0.2270270270;
  c += texture2D(tSrc, vUv + uDir * 1.3846153846) * 0.3162162162;
  c += texture2D(tSrc, vUv - uDir * 1.3846153846) * 0.3162162162;
  c += texture2D(tSrc, vUv + uDir * 3.2307692308) * 0.0702702703;
  c += texture2D(tSrc, vUv - uDir * 3.2307692308) * 0.0702702703;
  gl_FragColor = c;
}`;

const COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tSrc, vUv); }`;

export function makeRT(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    ...opts,
  });
}

export class Blur {
  constructor(divisor = 4) {
    this.divisor = divisor;
    this.a = makeRT(1, 1);
    this.b = makeRT(1, 1);
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COPY_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.pass = new QuadPass(this.copyMat);
  }

  setSize(w, h) {
    const bw = Math.max(1, Math.round(w / this.divisor));
    const bh = Math.max(1, Math.round(h / this.divisor));
    this.a.setSize(bw, bh);
    this.b.setSize(bw, bh);
  }

  /** Nedskala `srcTex` och gör `iterations` omgångar oskärpa. Resultat i this.texture. */
  run(renderer, srcTex, { iterations = 2, radius = 1 } = {}) {
    if (srcTex !== this.a.texture) {
      this.pass.material = this.copyMat;
      this.copyMat.uniforms.tSrc.value = srcTex;
      this.pass.render(renderer, this.a);
    }
    this.pass.material = this.blurMat;
    const w = this.a.width;
    const h = this.a.height;
    for (let i = 0; i < iterations; i++) {
      const r = radius * (1 + i);
      this.blurMat.uniforms.tSrc.value = this.a.texture;
      this.blurMat.uniforms.uDir.value.set(r / w, 0);
      this.pass.render(renderer, this.b);
      this.blurMat.uniforms.tSrc.value = this.b.texture;
      this.blurMat.uniforms.uDir.value.set(0, r / h);
      this.pass.render(renderer, this.a);
    }
    return this.a.texture;
  }

  get texture() {
    return this.a.texture;
  }
}
