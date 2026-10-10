// Renderar bakgrunden (procedurell scen, oskärpt kamera, egen media, greenscreen).
import * as THREE from 'three';
import { COLOR, NOISE, FULLSCREEN_VERT, QuadPass } from '../glsl.js';
import { SCENES, SCENE_MAP } from './scenes.js';

const HEADER = /* glsl */ `
uniform float uTime;
uniform vec2 uRes;
uniform float uAudio;
uniform vec2 uPar;
uniform float uSrgbOut;
varying vec2 vUv;
#define ASP (uRes.x / uRes.y)
vec2 P(float d) { return uPar * d * 0.035; }
${COLOR}
${NOISE}
`;

const MEDIA_FRAG = /* glsl */ `
uniform sampler2D tMedia;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec2 uPar;
uniform float uMode; // 0 = media, 1 = video-blur (tMedia = blurrat kamerautsnitt), 2 = enfärgad
uniform vec3 uColor;
varying vec2 vUv;
${COLOR}
void main() {
  if (uMode > 1.5) { gl_FragColor = vec4(srgbToLinear(uColor), 1.0); return; }
  if (uMode > 0.5) { gl_FragColor = vec4(texture2D(tMedia, vUv).rgb, 1.0); return; }
  vec2 uv = (vUv - 0.5) * uScale * 0.96 + 0.5 + uOffset + uPar * 0.012;
  gl_FragColor = vec4(srgbToLinear(texture2D(tMedia, uv).rgb), 1.0);
}`;

export class BackgroundLayer {
  constructor() {
    this.uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1280, 720) },
      uAudio: { value: 0 },
      uPar: { value: new THREE.Vector2() },
      uSrgbOut: { value: 0 },
    };
    this.materials = new Map();
    this.mediaMat = new THREE.ShaderMaterial({
      uniforms: {
        tMedia: { value: null },
        uScale: { value: new THREE.Vector2(1, 1) },
        uOffset: { value: new THREE.Vector2() },
        uPar: this.uniforms.uPar,
        uMode: { value: 0 },
        uColor: { value: new THREE.Color(0, 1, 0) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: MEDIA_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.pass = new QuadPass(this.mediaMat);
    this.mediaTexture = null;
    this.mediaAspect = 16 / 9;
    this.liveTexture = null;
    this.liveAspect = 16 / 9;
  }

  sceneMaterial(id) {
    const def = SCENE_MAP[id] ?? SCENES[0];
    if (!this.materials.has(def.id)) {
      this.materials.set(
        def.id,
        new THREE.ShaderMaterial({
          uniforms: this.uniforms,
          vertexShader: FULLSCREEN_VERT,
          fragmentShader: `${HEADER}\n${def.glsl}\nvoid main() { vec3 c = scene(vUv); gl_FragColor = vec4(uSrgbOut > 0.5 ? clamp(c, 0.0, 1.0) : srgbToLinear(clamp(c, 0.0, 2.0)), 1.0); }`,
          depthTest: false,
          depthWrite: false,
        }),
      );
    }
    return this.materials.get(def.id);
  }

  /** Förkompilera alla scener (kallas i vilotid så att byten blir hackfria). */
  precompile(renderer, ids = SCENES.map((s) => s.id)) {
    const cam = this.pass.camera;
    for (const id of ids) {
      this.pass.material = this.sceneMaterial(id);
      renderer.compile(this.pass.scene, cam);
    }
  }

  setMedia(texture, aspect) {
    if (this.mediaTexture && this.mediaTexture !== texture) this.mediaTexture.dispose();
    this.mediaTexture = texture;
    this.mediaAspect = aspect || 16 / 9;
  }

  /** Levande plats (videoloop från public/places). */
  setLive(texture, aspect) {
    if (this.liveTexture && this.liveTexture !== texture) this.liveTexture.dispose();
    this.liveTexture = texture;
    this.liveAspect = aspect || 16 / 9;
  }

  render(renderer, target, { type, sceneId, blurTexture, outW, outH, greenColor }) {
    const u = this.uniforms;
    u.uRes.value.set(outW, outH);
    if (type === 'scene') {
      this.pass.material = this.sceneMaterial(sceneId);
    } else {
      const m = this.mediaMat;
      this.pass.material = m;
      if (type === 'blur' && blurTexture) {
        m.uniforms.uMode.value = 1;
        m.uniforms.tMedia.value = blurTexture;
      } else if ((type === 'image' && this.mediaTexture) || (type === 'live' && this.liveTexture)) {
        const live = type === 'live';
        const asp = live ? this.liveAspect : this.mediaAspect;
        m.uniforms.uMode.value = 0;
        m.uniforms.tMedia.value = live ? this.liveTexture : this.mediaTexture;
        const outA = outW / outH;
        const s = m.uniforms.uScale.value;
        if (asp > outA) s.set(outA / asp, 1);
        else s.set(1, asp / outA);
      } else {
        m.uniforms.uMode.value = 2;
        m.uniforms.uColor.value.set(type === 'green' ? greenColor || '#00ff00' : '#0b0b14');
      }
    }
    this.pass.render(renderer, target);
  }
}
