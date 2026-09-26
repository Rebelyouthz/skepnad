// Efterbehandling: komposition av bakgrund + förgrund, filter och justeringar.
import * as THREE from 'three';
import { COLOR, NOISE, FULLSCREEN_VERT, QuadPass } from './glsl.js';

export const FILTERS = [
  { id: 'none', n: 0, name: 'Inget', icon: '⚪', desc: 'Ren bild utan filter. Justeringarna nedan fungerar fortfarande.' },
  { id: 'film', n: 1, name: 'Film', icon: '🎞️', desc: 'Filmisk färgsättning: kricka skuggor, varma högdagrar och mjuk halation.' },
  { id: 'noir', n: 2, name: 'Noir', icon: '🕵️', desc: 'Svartvitt med hög kontrast och korn – som en 40-talsdeckare.' },
  { id: 'vintage', n: 3, name: 'Vintage', icon: '📜', desc: 'Blekt sepia, damm och repor som från en gammal filmrulle.' },
  { id: 'cyber', n: 4, name: 'Cyberpunk', icon: '🌃', desc: 'Neonmagenta och cyan med kromatisk aberration.' },
  { id: 'vhs', n: 5, name: 'VHS', icon: '📼', desc: 'Gammalt videoband: färgblödning, rullande brus och spårningsfel.' },
  { id: 'glitch', n: 6, name: 'Glitch', icon: '👾', desc: 'Digitala störningar som blir värre ju högre du pratar.' },
  { id: 'toon', n: 7, name: 'Serietidning', icon: '💥', desc: 'Tecknade konturer, platta färger och rasterpunkter.' },
  { id: 'paint', n: 8, name: 'Oljemålning', icon: '🎨', desc: 'Kuwahara-filter som gör bilden till en levande målning.' },
  { id: 'sketch', n: 9, name: 'Blyertsskiss', icon: '✏️', desc: 'Handritad blyertsteckning på papper.' },
  { id: 'thermal', n: 10, name: 'Värmekamera', icon: '🌡️', desc: 'Falskfärger som en värmekamera – du lyser varmast.' },
  { id: 'night', n: 11, name: 'Mörkerseende', icon: '🥽', desc: 'Grönt nattkikarläge med brus och kikarram.' },
  { id: 'pixel', n: 12, name: 'Pixelkonst', icon: '🕹️', desc: 'Retrospel-pixlar med begränsad 16-färgspalett.' },
  { id: 'ascii', n: 13, name: 'ASCII', icon: '💻', desc: 'Bilden byggs av tecken – terminalestetik.' },
  { id: 'holo', n: 14, name: 'Hologram', icon: '🛸', desc: 'Blått flimrande sci-fi-hologram med skannlinjer.' },
  { id: 'dream', n: 15, name: 'Drömsk', icon: '☁️', desc: 'Mjukt glödande pastellsken, som i en dröm.' },
  { id: 'popart', n: 16, name: 'Popkonst', icon: '🖼️', desc: 'Fyra färgglada rutor i Warhol-stil.' },
  { id: 'duotone', n: 17, name: 'Duoton', icon: '🎭', desc: 'Stilren tvåfärgsgradient – snyggt för proffsiga streams.' },
  { id: 'kaleido', n: 18, name: 'Kalejdoskop', icon: '🔯', desc: 'Roterande spegelsymmetri. Psykedeliskt!' },
  { id: 'mirror', n: 19, name: 'Spegelvärld', icon: '🪞', desc: 'Vänster halva speglas – perfekt symmetriskt ansikte.' },
];
export const FILTER_MAP = Object.fromEntries(FILTERS.map((f) => [f.id, f]));

const FILTER_CODE = /* glsl */ `
#if FILTER == 1
vec3 applyFilter(vec2 uv) {
  vec3 c = S(uv);
  float l = luma(c);
  c += mix(vec3(-0.02, 0.05, 0.08), vec3(0.1, 0.04, -0.05), smoothstep(0.1, 0.85, l)) * 0.7;
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.4);
  c = mix(vec3(0.03, 0.025, 0.045), vec3(0.98, 0.96, 0.92), c);
  vec2 px = 1.0 / uRes;
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785;
    glow += max(S(uv + vec2(cos(a), sin(a)) * px * 7.0) - 0.72, 0.0);
  }
  c += glow / 8.0 * vec3(1.0, 0.35, 0.18) * 1.2;
  return c;
}
#elif FILTER == 2
vec3 applyFilter(vec2 uv) {
  float l = luma(S(uv));
  l = smoothstep(0.06, 0.92, l);
  l = pow(l, 1.12);
  vec3 c = vec3(l) * vec3(1.0, 0.985, 0.95);
  c += (hash12(uv * uRes + fract(uTime * 3.1) * 91.0) - 0.5) * 0.09;
  c *= 1.0 - 0.55 * smoothstep(0.3, 0.95, length((uv - 0.5) * vec2(1.3, 1.0)));
  return c;
}
#elif FILTER == 3
vec3 applyFilter(vec2 uv) {
  vec2 u2 = uv + vec2(0.0, sin(uTime * 11.0) * 0.0008);
  vec3 c = S(u2);
  float l = luma(c);
  c = mix(c, vec3(l) * vec3(1.08, 0.9, 0.66), 0.6);
  c = mix(vec3(0.12, 0.09, 0.07), vec3(0.96, 0.9, 0.78), c);
  float dust = step(0.9982, hash12(floor(uv * uRes / 2.0) + floor(uTime * 12.0)));
  float scratch = step(0.9992, hash11(floor(uv.x * uRes.x / 2.0) + floor(uTime * 8.0) * 13.0)) * step(0.4, hash11(floor(uTime * 8.0)));
  c = mix(c, vec3(0.08), dust * 0.8);
  c = mix(c, vec3(0.95), scratch * 0.45);
  c *= 1.0 - 0.5 * smoothstep(0.35, 0.95, length((uv - 0.5) * vec2(1.25, 1.0)));
  c *= 0.97 + 0.03 * sin(uTime * 24.0);
  return c;
}
#elif FILTER == 4
vec3 applyFilter(vec2 uv) {
  vec2 px = 1.0 / uRes;
  float ca = 3.5;
  vec3 c = vec3(S(uv + vec2(px.x * ca, 0.0)).r, S(uv).g, S(uv - vec2(px.x * ca, 0.0)).b);
  float l = luma(c);
  vec3 g = mix(vec3(0.05, 0.02, 0.22), vec3(0.95, 0.12, 0.72), smoothstep(0.08, 0.5, l));
  g = mix(g, vec3(0.25, 0.95, 1.0), smoothstep(0.55, 0.95, l));
  c = mix(c, g, 0.62) * 1.08;
  return c;
}
#elif FILTER == 5
vec3 applyFilter(vec2 uv) {
  float t = uTime;
  float line = floor(uv.y * uRes.y / 2.0);
  float jitter = (vnoise(vec2(line * 0.08, t * 18.0)) - 0.5) * 0.0035;
  float bandPos = fract(t * 0.07);
  float band = smoothstep(0.03, 0.0, abs(uv.y - (1.0 - bandPos)) - 0.01);
  uv.x += jitter + band * 0.018 * (hash11(line + t) - 0.5);
  vec2 px = 1.0 / uRes;
  vec3 a = S(uv);
  vec3 b = S(uv + vec2(px.x * 2.0, 0.0));
  vec3 d = S(uv - vec2(px.x * 2.0, 0.0));
  vec3 c = (a * 2.0 + b + d) / 4.0;
  vec3 chroma = (S(uv + vec2(px.x * 7.0, 0.0)) + S(uv + vec2(px.x * 4.0, 0.0))) * 0.5;
  float Y = luma(c);
  c = vec3(Y) + (chroma - luma(chroma)) * 1.15;
  c *= 0.9 + 0.1 * sin(uv.y * uRes.y * 1.3);
  c += band * 0.18 * hash12(uv * uRes + t);
  c += (hash12(uv * uRes + t * 61.0) - 0.5) * 0.07;
  float bottom = smoothstep(0.035, 0.0, uv.y);
  c = mix(c, vec3(hash12(floor(uv * uRes / vec2(3.0, 1.0)) + t)), bottom * 0.75);
  c = mix(vec3(0.05, 0.03, 0.08), c * 1.04, 0.94);
  return c;
}
#elif FILTER == 6
vec3 applyFilter(vec2 uv) {
  float t = floor(uTime * 12.0);
  float amt = 0.25 + uAudio * 1.6 + uGlitchBoost;
  float bands = 8.0 + 22.0 * hash11(t);
  float blockY = floor(uv.y * bands);
  float r = hash11(blockY + t * 7.0);
  float shift = (r - 0.5) * 0.12 * step(1.0 - 0.22 * amt, hash11(blockY * 3.3 + t)) * amt;
  vec2 u2 = uv + vec2(shift, 0.0);
  float split = 0.003 + 0.01 * amt;
  vec3 c = vec3(S(u2 + vec2(split, 0.0)).r, S(u2).g, S(u2 - vec2(split, 0.0)).b);
  float inv = step(0.988 - 0.025 * amt, hash12(floor(uv * vec2(12.0, 30.0)) + t));
  c = mix(c, 1.0 - c.gbr, inv);
  c += step(0.996, hash12(vec2(floor(uv.y * uRes.y), t))) * 0.35;
  return c;
}
#elif FILTER == 7
vec3 applyFilter(vec2 uv) {
  vec2 px = 1.5 / uRes;
  float tl = luma(S(uv + px * vec2(-1.0, 1.0)));
  float tc = luma(S(uv + px * vec2(0.0, 1.0)));
  float tr = luma(S(uv + px * vec2(1.0, 1.0)));
  float ml = luma(S(uv + px * vec2(-1.0, 0.0)));
  float mr = luma(S(uv + px * vec2(1.0, 0.0)));
  float bl = luma(S(uv + px * vec2(-1.0, -1.0)));
  float bc = luma(S(uv + px * vec2(0.0, -1.0)));
  float br = luma(S(uv + px * vec2(1.0, -1.0)));
  float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
  float edge = smoothstep(0.28, 0.55, length(vec2(gx, gy)));
  vec3 c = S(uv);
  float lv = luma(c);
  float q = floor(lv * 4.0 + 0.5) / 4.0;
  c = c * (q / max(lv, 0.02));
  c = mix(vec3(luma(c)), c, 1.45);
  vec2 hp = uv * uRes / 5.0;
  vec2 hc = fract(hp) - 0.5;
  float dotR = (1.0 - lv) * 0.6;
  float dots = smoothstep(dotR, dotR - 0.12, length(hc)) * step(lv, 0.55);
  c *= 1.0 - dots * 0.35;
  c = mix(c, vec3(0.04, 0.03, 0.06), edge);
  return clamp(c, 0.0, 1.0);
}
#elif FILTER == 8
vec3 applyFilter(vec2 uv) {
  vec2 px = 1.7 / uRes;
  vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);
  vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);
  for (int j = 0; j <= 3; j++) {
    for (int i = 0; i <= 3; i++) {
      vec3 c;
      c = S(uv + vec2(-i, -j) * px); m0 += c; s0 += c * c;
      c = S(uv + vec2(i, -j) * px); m1 += c; s1 += c * c;
      c = S(uv + vec2(i, j) * px); m2 += c; s2 += c * c;
      c = S(uv + vec2(-i, j) * px); m3 += c; s3 += c * c;
    }
  }
  float n = 16.0;
  m0 /= n; m1 /= n; m2 /= n; m3 /= n;
  float v0 = dot(abs(s0 / n - m0 * m0), vec3(1.0));
  float v1 = dot(abs(s1 / n - m1 * m1), vec3(1.0));
  float v2 = dot(abs(s2 / n - m2 * m2), vec3(1.0));
  float v3 = dot(abs(s3 / n - m3 * m3), vec3(1.0));
  vec3 c = m0; float mv = v0;
  if (v1 < mv) { mv = v1; c = m1; }
  if (v2 < mv) { mv = v2; c = m2; }
  if (v3 < mv) { mv = v3; c = m3; }
  float canvas = 0.95 + 0.05 * vnoise(uv * uRes * 0.35) * vnoise(uv.yx * uRes * 0.5);
  c = mix(vec3(luma(c)), c, 1.2) * canvas;
  return c;
}
#elif FILTER == 9
vec3 applyFilter(vec2 uv) {
  vec2 px = 1.0 / uRes;
  float tl = luma(S(uv + px * vec2(-1.0, 1.0)));
  float tr = luma(S(uv + px * vec2(1.0, 1.0)));
  float bl = luma(S(uv + px * vec2(-1.0, -1.0)));
  float br = luma(S(uv + px * vec2(1.0, -1.0)));
  float l = luma(S(uv));
  float edge = length(vec2(tr + br - tl - bl, tl + tr - bl - br));
  float pencil = 1.0 - smoothstep(0.06, 0.35, edge);
  float hatch1 = step(0.55, fract((uv.x + uv.y) * uRes.y / 5.0)) * step(l, 0.45);
  float hatch2 = step(0.55, fract((uv.x - uv.y) * uRes.y / 5.0)) * step(l, 0.25);
  float shade = 1.0 - (hatch1 + hatch2) * 0.28;
  float paper = 0.92 + 0.08 * vnoise(uv * uRes / 2.5);
  vec3 c = vec3(pencil * shade * paper) * vec3(0.98, 0.96, 0.92);
  c = mix(c, c * (0.75 + S(uv) * 0.35), 0.35);
  return c;
}
#elif FILTER == 10
vec3 thermal(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 c = mix(vec3(0.0, 0.0, 0.12), vec3(0.25, 0.0, 0.6), smoothstep(0.0, 0.25, x));
  c = mix(c, vec3(0.85, 0.0, 0.45), smoothstep(0.25, 0.45, x));
  c = mix(c, vec3(1.0, 0.45, 0.0), smoothstep(0.45, 0.65, x));
  c = mix(c, vec3(1.0, 0.92, 0.2), smoothstep(0.65, 0.85, x));
  return mix(c, vec3(1.0), smoothstep(0.85, 1.0, x));
}
vec3 applyFilter(vec2 uv) {
  vec2 px = 2.0 / uRes;
  float l = (luma(S(uv)) * 2.0 + luma(S(uv + px)) + luma(S(uv - px))) / 4.0;
  float heat = l * 0.55 + fgA(uv) * 0.45;
  return thermal(heat);
}
#elif FILTER == 11
vec3 applyFilter(vec2 uv) {
  float l = luma(S(uv));
  l = pow(clamp(l * 1.8, 0.0, 1.0), 0.8);
  vec3 c = vec3(0.12, 1.0, 0.3) * l;
  c += (hash12(uv * uRes + fract(uTime * 7.0) * 100.0) - 0.5) * 0.18;
  c *= 0.9 + 0.1 * sin(uv.y * uRes.y * 1.6);
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float goggle = max(smoothstep(0.52, 0.47, length(p - vec2(-0.3, 0.0))), smoothstep(0.52, 0.47, length(p - vec2(0.3, 0.0))));
  return c * goggle;
}
#elif FILTER == 12
const vec3 PAL[16] = vec3[16](
  vec3(0.0), vec3(0.114, 0.169, 0.325), vec3(0.494, 0.145, 0.325), vec3(0.0, 0.529, 0.318),
  vec3(0.671, 0.322, 0.212), vec3(0.373, 0.341, 0.310), vec3(0.761, 0.765, 0.780), vec3(1.0, 0.945, 0.910),
  vec3(1.0, 0.0, 0.302), vec3(1.0, 0.639, 0.0), vec3(1.0, 0.925, 0.153), vec3(0.0, 0.894, 0.212),
  vec3(0.161, 0.678, 1.0), vec3(0.514, 0.463, 0.612), vec3(1.0, 0.467, 0.659), vec3(1.0, 0.8, 0.667)
);
vec3 applyFilter(vec2 uv) {
  float cells = 110.0;
  vec2 cs = vec2(cells, cells * uRes.y / uRes.x);
  vec2 q = (floor(uv * cs) + 0.5) / cs;
  vec3 c = S(q);
  vec3 best = PAL[0];
  float bd = 10.0;
  for (int i = 0; i < 16; i++) {
    vec3 d = c - PAL[i];
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; best = PAL[i]; }
  }
  vec2 f = fract(uv * cs);
  float grid = step(0.06, f.x) * step(0.06, f.y);
  return mix(c, best, 0.8) * (0.9 + 0.1 * grid);
}
#elif FILTER == 13
vec3 applyFilter(vec2 uv) {
  vec2 cs = uRes / vec2(8.0, 12.0);
  vec2 cell = floor(uv * cs);
  vec2 f = fract(uv * cs);
  vec3 c = S((cell + 0.5) / cs);
  float l = luma(c);
  float gi = floor(clamp(l * 1.15, 0.0, 0.999) * 10.0);
  float g = texture2D(tAscii, vec2((gi + f.x) / 10.0, f.y)).r;
  return mix(vec3(0.01, 0.02, 0.015), c * 1.6 + 0.05, g);
}
#elif FILTER == 14
vec3 applyFilter(vec2 uv) {
  float t = uTime;
  float bar = step(0.985, hash11(floor(uv.y * 40.0) + floor(t * 10.0)));
  uv.x += bar * 0.02;
  vec3 c = S(uv);
  float l = luma(c);
  vec3 h = vec3(0.25, 0.75, 1.0) * (l * 1.35 + 0.08);
  float a = fgA(uv);
  vec2 px = 2.0 / uRes;
  float edge = clamp(length(vec2(fgA(uv + vec2(px.x, 0.0)) - fgA(uv - vec2(px.x, 0.0)), fgA(uv + vec2(0.0, px.y)) - fgA(uv - vec2(0.0, px.y)))) * 4.0, 0.0, 1.0);
  h += vec3(0.5, 0.95, 1.0) * edge * 0.9;
  float scan = 0.72 + 0.28 * sin(uv.y * uRes.y * 0.6 - t * 9.0);
  float flick = 0.88 + 0.12 * step(0.93, hash11(floor(t * 16.0)));
  return h * scan * flick;
}
#elif FILTER == 15
vec3 applyFilter(vec2 uv) {
  vec3 c = S(uv);
  vec2 px = 1.0 / uRes;
  vec3 blur = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5236;
    blur += S(uv + vec2(cos(a), sin(a)) * px * (6.0 + mod(float(i), 2.0) * 6.0));
  }
  blur /= 12.0;
  c = 1.0 - (1.0 - c) * (1.0 - blur * 0.65);
  c = mix(c, c * vec3(1.04, 0.96, 1.1) + vec3(0.05, 0.02, 0.08), 0.6);
  return mix(vec3(luma(c)), c, 0.85);
}
#elif FILTER == 16
vec3 applyFilter(vec2 uv) {
  vec2 id = floor(uv * 2.0);
  vec2 q = fract(uv * 2.0);
  float l = luma(S(q));
  float lv = step(0.33, l) + step(0.6, l);
  float k = id.x + id.y * 2.0;
  vec3 A; vec3 B; vec3 C;
  if (k < 0.5) { A = vec3(0.1, 0.1, 0.5); B = vec3(1.0, 0.2, 0.55); C = vec3(1.0, 0.9, 0.2); }
  else if (k < 1.5) { A = vec3(0.45, 0.0, 0.3); B = vec3(0.1, 0.8, 0.8); C = vec3(1.0, 0.95, 0.85); }
  else if (k < 2.5) { A = vec3(0.0, 0.25, 0.2); B = vec3(1.0, 0.45, 0.0); C = vec3(0.6, 1.0, 0.5); }
  else { A = vec3(0.2, 0.0, 0.4); B = vec3(0.3, 0.55, 1.0); C = vec3(1.0, 0.6, 0.8); }
  vec3 c = lv < 0.5 ? A : (lv < 1.5 ? B : C);
  vec2 hc = fract(uv * uRes / 7.0) - 0.5;
  c *= 1.0 - smoothstep(0.3, 0.2, length(hc)) * 0.15 * step(lv, 1.5);
  return c;
}
#elif FILTER == 17
vec3 applyFilter(vec2 uv) {
  float l = luma(S(uv));
  return mix(vec3(0.12, 0.05, 0.36), vec3(1.0, 0.56, 0.45), smoothstep(0.04, 0.96, l));
}
#elif FILTER == 18
vec3 applyFilter(vec2 uv) {
  float asp = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x) + uTime * 0.12;
  float seg = 6.2831853 / 8.0;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  vec2 q = vec2(cos(a), sin(a)) * r;
  q.x /= asp;
  return S(q + vec2(0.5, 0.55));
}
#elif FILTER == 19
vec3 applyFilter(vec2 uv) {
  vec2 q = uv;
  if (q.x > 0.5) q.x = 1.0 - q.x;
  return S(q);
}
#else
vec3 applyFilter(vec2 uv) { return S(uv); }
#endif
`;

const FRAG = /* glsl */ `
uniform sampler2D tBg;
uniform sampler2D tFg;
uniform sampler2D tAscii;
uniform vec2 uRes;
uniform float uTime;
uniform float uAudio;
uniform float uFilterAll;
uniform float uIntensity;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uWarmth;
uniform float uVignette;
uniform float uGrain;
uniform float uSharpen;
uniform float uFlash;
uniform vec3 uFlashColor;
uniform float uGlitchBoost;
uniform float uLetterbox;
varying vec2 vUv;
${COLOR}
${NOISE}
vec3 compLin(vec2 uv) {
  vec4 f = texture2D(tFg, uv);
  return f.rgb + texture2D(tBg, uv).rgb * (1.0 - f.a);
}
vec3 S(vec2 uv) {
  if (uFilterAll > 0.5) return linearToSrgb(compLin(uv));
  vec4 f = texture2D(tFg, uv);
  return linearToSrgb(f.a > 0.0001 ? f.rgb / f.a : vec3(0.0));
}
float fgA(vec2 uv) { return texture2D(tFg, uv).a; }
${FILTER_CODE}
void main() {
  vec2 uv = vUv;
  if (uGlitchBoost > 0.01 && FILTER != 6) {
    float tt = floor(uTime * 24.0);
    float by = floor(uv.y * 18.0);
    uv.x += (hash11(by + tt) - 0.5) * 0.09 * uGlitchBoost * step(0.55, hash11(by * 3.1 + tt));
  }
  vec3 orig = S(uv);
  if (uGlitchBoost > 0.01 && FILTER != 6) {
    float sp = 0.012 * uGlitchBoost;
    orig = vec3(S(uv + vec2(sp, 0.0)).r, orig.g, S(uv - vec2(sp, 0.0)).b);
  }
  vec3 c = FILTER == 0 ? orig : mix(orig, applyFilter(uv), uIntensity);
  if (uSharpen > 0.001) {
    vec2 px = 1.0 / uRes;
    vec3 blur = (S(uv + vec2(px.x, 0.0)) + S(uv - vec2(px.x, 0.0)) + S(uv + vec2(0.0, px.y)) + S(uv - vec2(0.0, px.y))) * 0.25;
    c += (orig - blur) * uSharpen * 1.6;
  }
  c += uBrightness * 0.22;
  c = (c - 0.5) * (1.0 + uContrast * 0.8) + 0.5;
  c = mix(vec3(luma(c)), c, 1.0 + uSaturation);
  c *= vec3(1.0 + uWarmth * 0.09, 1.0 + uWarmth * 0.015, 1.0 - uWarmth * 0.11);
  if (uFilterAll < 0.5) {
    float a = fgA(uv);
    c = mix(linearToSrgb(texture2D(tBg, uv).rgb), c, a);
  }
  float v = length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 0.85);
  c *= 1.0 - uVignette * smoothstep(0.3, 1.0, v);
  c += (hash12(uv * uRes + fract(uTime * 7.13) * 100.0) - 0.5) * uGrain * 0.3;
  if (uLetterbox > 0.0) {
    float bar = (1.0 - (uRes.x / uRes.y) / 2.39) * 0.5 * uLetterbox;
    c *= step(bar, uv.y) * step(uv.y, 1.0 - bar);
  }
  c = mix(c, uFlashColor, uFlash);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function makeAsciiAtlas() {
  const chars = ' .:-=+*#%@';
  const cw = 32;
  const ch = 48;
  const c = document.createElement('canvas');
  c.width = cw * chars.length;
  c.height = ch;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  g.font = `bold ${ch * 0.82}px Consolas, "Courier New", monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...chars].forEach((chr, i) => g.fillText(chr, i * cw + cw / 2, ch / 2 + 2));
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

export class PostPass {
  constructor() {
    this.uniforms = {
      tBg: { value: null },
      tFg: { value: null },
      tAscii: { value: makeAsciiAtlas() },
      uRes: { value: new THREE.Vector2(1280, 720) },
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uFilterAll: { value: 1 },
      uIntensity: { value: 1 },
      uBrightness: { value: 0 },
      uContrast: { value: 0 },
      uSaturation: { value: 0 },
      uWarmth: { value: 0 },
      uVignette: { value: 0.25 },
      uGrain: { value: 0.05 },
      uSharpen: { value: 0.15 },
      uFlash: { value: 0 },
      uFlashColor: { value: new THREE.Color(1, 1, 1) },
      uGlitchBoost: { value: 0 },
      uLetterbox: { value: 0 },
    };
    this.materials = new Map();
    this.pass = new QuadPass(this.material('none'));
    this.current = 'none';
  }

  material(id) {
    const def = FILTER_MAP[id] ?? FILTERS[0];
    if (!this.materials.has(def.id)) {
      this.materials.set(
        def.id,
        new THREE.ShaderMaterial({
          defines: { FILTER: def.n },
          uniforms: this.uniforms,
          vertexShader: FULLSCREEN_VERT,
          fragmentShader: FRAG,
          depthTest: false,
          depthWrite: false,
        }),
      );
    }
    return this.materials.get(def.id);
  }

  setFilter(id) {
    this.current = id;
    this.pass.material = this.material(id);
  }

  precompile(renderer, ids = FILTERS.map((f) => f.id)) {
    const keep = this.pass.material;
    for (const id of ids) {
      this.pass.material = this.material(id);
      renderer.compile(this.pass.scene, this.pass.camera);
    }
    this.pass.material = keep;
  }

  render(renderer, target = null) {
    this.pass.render(renderer, target);
  }
}
