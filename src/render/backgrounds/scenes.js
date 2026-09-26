// Levande procedurella bakgrunder. Varje scen definierar `vec3 scene(vec2 uv)`
// i sRGB. Tillgängligt: uTime, uRes, uAudio (0..1), P(djup) = parallaxförskjutning,
// ASP = bildförhållande, samt brus-/hashfunktioner från glsl.js.

export const SCENES = [
  {
    id: 'cabin',
    name: 'Mysig stuga',
    icon: '🏡',
    desc: 'Varm timmerstuga med sprakande brasa, ljusslingor och snöfall utanför fönstret.',
    tint: '#ffb070',
    ambience: 'fire',
    glsl: /* glsl */ `
float snowLayer(vec2 uv, float scale, float speed, float t) {
  uv *= scale;
  uv.y += t * speed;
  uv.x += sin(uv.y * 0.35 + t * 0.6) * 0.35;
  vec2 id = floor(uv);
  vec2 f = fract(uv) - 0.5;
  vec2 h = hash22(id) - 0.5;
  float d = length(f - h * 0.7);
  return smoothstep(0.075, 0.0, d) * step(0.45, hash12(id + 3.1));
}
vec3 bulbs(vec2 uv, float t) {
  vec3 col = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    vec2 off = P(0.9 + fk * 0.6);
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      float x = (fi + 0.5 + fk * 0.5) / 16.0;
      float sw = fract(x * 2.0);
      float y = (k == 0 ? 0.955 : 0.84) - 0.075 * sin(3.14159 * sw);
      vec2 c = vec2(x, y) + off;
      vec2 d = (uv - c) * vec2(ASP, 1.0);
      float r = length(d);
      float tw = 0.78 + 0.22 * sin(t * (1.1 + hash11(fi + fk * 20.0) * 1.7) + fi * 2.1);
      vec3 hue = mix(vec3(1.0, 0.74, 0.38), vec3(1.0, 0.52, 0.22), hash11(fi * 3.7 + fk));
      float size = 0.016 + 0.014 * hash11(fi * 1.7 + fk * 5.0) + fk * 0.006;
      float disc = smoothstep(size, size * 0.72, r);
      float halo = exp(-r * r / (size * size * 10.0));
      col += hue * (disc * 0.75 + halo * 0.45) * tw;
    }
  }
  return col;
}
vec3 scene(vec2 uv) {
  float t = uTime;
  // Timmervägg
  vec2 w = uv + P(0.25);
  float px = w.x * ASP * 7.0;
  float id = floor(px);
  float fx = fract(px);
  float g = fbm3(vec2(id * 13.1, w.y * 2.5));
  float streak = vnoise(vec2(fx * 6.0 + id * 3.0, w.y * 70.0));
  vec3 wood = mix(vec3(0.15, 0.078, 0.04), vec3(0.29, 0.15, 0.075), 0.3 + 0.4 * hash11(id * 1.3) + 0.3 * g);
  wood *= 0.88 + 0.12 * streak;
  float gap = smoothstep(0.0, 0.035, fx) * smoothstep(1.0, 0.965, fx);
  wood *= 0.6 + 0.4 * gap;

  // Brasans sken från nedre vänstra hörnet
  float flick = 0.62 + 0.14 * sin(t * 7.3) + 0.09 * sin(t * 12.7 + 1.3) + 0.15 * vnoise(vec2(t * 3.2, 0.0));
  vec2 fp = (uv - vec2(-0.02, -0.12)) * vec2(ASP, 1.0);
  float fireL = exp(-length(fp) * 1.55) * flick;
  vec3 light = vec3(0.16, 0.12, 0.11) + vec3(1.0, 0.45, 0.16) * fireL * 1.25;
  vec3 col = wood * light * 1.6;

  // Fönster med snönatt
  vec2 wp = uv + P(0.35);
  vec2 wc = vec2(0.745, 0.55);
  vec2 wh = vec2(0.13 / ASP * 1.78, 0.2);
  vec2 q = (wp - wc) / wh;
  float inside = step(abs(q.x), 1.0) * step(abs(q.y), 1.0);
  if (inside > 0.5) {
    vec2 sv = wp + P(0.9);
    vec3 sky = mix(vec3(0.05, 0.09, 0.2), vec3(0.01, 0.02, 0.07), q.y * 0.5 + 0.5);
    sky += vec3(0.25, 0.3, 0.45) * exp(-length((q - vec2(0.45, 0.55)) * vec2(1.0, 1.6)) * 3.0) * 0.5;
    float hills = 0.0;
    float tree = step(q.y, -0.35 + 0.18 * abs(fract(sv.x * 26.0) - 0.5) * 2.0 * (0.6 + 0.4 * hash11(floor(sv.x * 26.0))) - 0.05 * sin(sv.x * 9.0));
    sky = mix(sky, vec3(0.02, 0.035, 0.06), tree);
    float ground = step(q.y, -0.72);
    sky = mix(sky, vec3(0.55, 0.62, 0.78), ground);
    float s = snowLayer(sv * vec2(ASP, 1.0), 14.0, 0.9, t) + snowLayer(sv * vec2(ASP, 1.0) + 3.7, 24.0, 0.6, t) * 0.6;
    sky += vec3(0.85, 0.9, 1.0) * s;
    float frost = smoothstep(0.55, 1.0, length(q * vec2(0.9, 1.0))) * (0.5 + 0.5 * fbm3(q * 6.0));
    sky = mix(sky, vec3(0.75, 0.82, 0.95), frost * 0.55);
    col = sky;
    // spröjs
    float mull = max(step(abs(q.x), 0.025), step(abs(q.y), 0.025));
    col = mix(col, vec3(0.32, 0.18, 0.09) * light * 1.7, mull);
  }
  // fönsterkarm
  float frame = step(abs(q.x), 1.09) * step(abs(q.y), 1.07) * (1.0 - inside);
  col = mix(col, vec3(0.36, 0.2, 0.1) * light * 1.55, frame);
  float sill = step(abs(q.x), 1.2) * step(-1.13, q.y) * step(q.y, -1.05);
  col = mix(col, vec3(0.42, 0.24, 0.12) * light * 1.7, sill);

  // Ljusslingor och deras varma ljus
  vec3 b = bulbs(uv, t);
  col += b;
  col += vec3(1.0, 0.6, 0.3) * 0.06 * smoothstep(0.6, 1.0, uv.y);

  // Glödande partiklar/damm i ljuset
  vec2 dp = uv * vec2(ASP, 1.0) * 9.0 + vec2(0.0, -t * 0.12) + P(1.2) * 9.0;
  vec2 did = floor(dp);
  vec2 dfr = fract(dp) - 0.5 - (hash22(did) - 0.5) * 0.7;
  float mote = smoothstep(0.05, 0.0, length(dfr)) * step(0.72, hash12(did)) * (0.4 + 0.6 * sin(t * 2.0 + hash12(did) * 30.0));
  col += vec3(1.0, 0.7, 0.4) * mote * fireL * 1.4;

  // Vinjett + ljudpuls
  col *= 1.0 - 0.45 * pow(length((uv - 0.5) * vec2(1.0, 1.25)), 2.2);
  col *= 1.0 + uAudio * 0.12;
  return col;
}`,
  },
  {
    id: 'rain',
    name: 'Regnigt fönster',
    icon: '🌧️',
    desc: 'Regndroppar rinner på rutan framför en suddig storstad i neonljus. Perfekt lo-fi-känsla.',
    tint: '#7aa8ff',
    ambience: 'rain',
    glsl: /* glsl */ `
vec3 cityLights(vec2 uv, float blur) {
  vec3 col = mix(vec3(0.015, 0.02, 0.055), vec3(0.09, 0.05, 0.1), smoothstep(0.95, 0.05, uv.y));
  col += vec3(0.25, 0.12, 0.08) * smoothstep(0.5, 0.0, uv.y) * 0.5;
  for (int L = 0; L < 3; L++) {
    float fl = float(L);
    vec2 g = (uv + P(0.25 + fl * 0.25)) * vec2(ASP, 1.0) * (3.2 + fl * 2.6) + vec2(fl * 17.3, fl * 3.1);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec3 h = hash32(id + fl * 31.0);
    vec2 c = (h.xy - 0.5) * 0.55;
    float r = length(f - c);
    float size = 0.16 + 0.2 * h.z;
    float band = smoothstep(0.95, 0.25, uv.y);
    float on = step(0.38, h.z) * band;
    float pick = hash12(id * 1.7 + fl);
    vec3 lc = pick < 0.35 ? vec3(1.0, 0.62, 0.25) : pick < 0.55 ? vec3(1.0, 0.25, 0.3) : pick < 0.75 ? vec3(0.35, 0.75, 1.0) : pick < 0.88 ? vec3(0.95, 0.35, 0.95) : vec3(0.95, 0.95, 1.0);
    float edge = 0.015 + blur * 0.12;
    float disc = smoothstep(size, size - edge, r);
    float ring = smoothstep(size - edge * 0.5, size, r) * disc * 0.35;
    float blink = 0.85 + 0.15 * sin(uTime * (0.5 + h.x) + h.y * 40.0);
    col += lc * (disc * 0.2 + ring) * on * (0.55 + 0.25 * fl) * blink;
  }
  return col;
}
vec2 dropLayer(vec2 uv, float t, float scale, out float mask) {
  vec2 aspUv = uv * vec2(ASP, 1.0) * scale;
  vec2 grid = vec2(6.0, 1.0);
  vec2 p = aspUv * grid;
  float colId = floor(p.x);
  float n = hash11(colId * 7.31);
  p.y += t * (0.25 + n * 0.35) + n * 10.0;
  vec2 id = floor(p);
  vec2 st = fract(p) - vec2(0.5, 0.0);
  float h = hash12(id + 0.37);
  // droppens position i cellen (sågtand = rinner ner och fastnar)
  float ti = fract(t * 0.18 + h);
  float y = -smoothstep(0.0, 0.85, ti) * 0.8 + 0.9;
  float x = (h - 0.5) * 0.6 + sin(y * 20.0 + h * 10.0) * 0.04;
  vec2 d = (st - vec2(x, y)) * vec2(1.0, grid.x / grid.y * 0.18);
  float r = length(d * vec2(1.0, 1.0));
  float drop = smoothstep(0.14, 0.05, r);
  // spår med små droppar ovanför
  vec2 tp = st - vec2(x, 0.0);
  float trailY = fract(tp.y * 8.0) - 0.5;
  float trail = smoothstep(0.06, 0.0, length(vec2(tp.x, trailY * 0.14))) * smoothstep(y, y + 0.35, st.y) * smoothstep(1.0, y, st.y) * step(0.5, fract(h * 13.0));
  mask = max(drop, trail * 0.7) * step(0.25, h);
  return (d / 0.14) * drop + vec2(tp.x, trailY) * trail * 0.5;
}
vec2 staticDrops(vec2 uv, float t, out float mask) {
  vec2 p = uv * vec2(ASP, 1.0) * 38.0;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec3 h = hash32(id);
  vec2 c = (h.xy - 0.5) * 0.7;
  vec2 d = f - c;
  float life = fract(t * 0.07 + h.z);
  float r = length(d);
  float size = 0.18 * smoothstep(1.0, 0.0, life) * step(0.55, h.z);
  mask = smoothstep(size, size * 0.6, r);
  return d / max(size, 0.001) * mask;
}
vec3 scene(vec2 uv) {
  float t = uTime;
  float m1; float m2; float m3;
  vec2 n1 = dropLayer(uv, t, 1.0, m1);
  vec2 n2 = dropLayer(uv * 1.7 + 0.3, t * 0.9, 1.0, m2);
  vec2 n3 = staticDrops(uv, t, m3);
  vec2 n = n1 * m1 + n2 * m2 * 0.7 + n3;
  float m = sat(m1 + m2 + m3);
  vec3 blurry = cityLights(uv, 1.0);
  vec3 sharp = cityLights(uv - n * 0.035, 0.08);
  vec3 col = mix(blurry, sharp * 1.15, m);
  col += vec3(0.8, 0.85, 1.0) * m * smoothstep(0.2, 0.9, n.y) * 0.12;
  // imma i hörnen och varmt ljus inifrån rummet
  col = mix(col, vec3(0.2, 0.18, 0.22), smoothstep(0.35, 1.1, length((uv - 0.5) * vec2(1.3, 1.0))) * 0.35);
  col += vec3(1.0, 0.55, 0.25) * 0.07 * smoothstep(0.35, 0.0, uv.y);
  // fönsterkarm i ytterkant
  float fr = 1.0 - step(0.018, uv.x) * step(uv.x, 0.982) * step(0.03, uv.y) * step(uv.y, 0.97);
  col = mix(col, vec3(0.04, 0.03, 0.035), fr);
  col *= 1.0 + uAudio * 0.1;
  return col;
}`,
  },
  {
    id: 'aurora',
    name: 'Norrsken',
    icon: '🌌',
    desc: 'Dansande norrsken över snöklädda fjäll och granskog under en stjärnklar natt.',
    tint: '#5cffc8',
    ambience: 'wind',
    glsl: /* glsl */ `
float stars(vec2 uv, float density) {
  vec2 p = uv * vec2(ASP, 1.0) * density;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec3 h = hash32(id);
  float d = length(f - (h.xy - 0.5) * 0.7);
  float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h.z * 3.0) + h.x * 50.0);
  return smoothstep(0.06 * h.z + 0.02, 0.0, d) * step(0.72, h.z) * tw;
}
float curtain(vec2 p, float off, float t) {
  float cx = p.x * 1.4 + off;
  float y0 = 0.52 + 0.13 * fbm3(vec2(cx * 0.9, t * 0.06 + off)) + 0.05 * sin(cx * 2.3 + t * 0.2);
  float dy = p.y - y0;
  float rays = 0.45 + 0.55 * vnoise(vec2(cx * 34.0, t * 0.35 + off * 3.0));
  rays *= 0.6 + 0.4 * vnoise(vec2(cx * 7.0 - t * 0.1, 1.3));
  float shape = smoothstep(-0.012, 0.012, dy) * exp(-max(dy, 0.0) * 5.5);
  return shape * rays;
}
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 p = uv + P(0.15);
  vec3 col = mix(vec3(0.015, 0.05, 0.09), vec3(0.0, 0.008, 0.03), smoothstep(0.2, 1.0, p.y));
  col += vec3(0.03, 0.12, 0.13) * smoothstep(0.6, 0.25, p.y);
  col += vec3(0.9, 0.95, 1.0) * (stars(p, 110.0) + stars(p + 0.37, 60.0) * 0.8);
  float a1 = curtain(p, 0.0, t);
  float a2 = curtain(p + vec2(0.0, 0.07), 4.2, t * 1.1) * 0.7;
  float a = a1 + a2;
  float dyc = sat((p.y - 0.5) * 3.0);
  vec3 aur = mix(vec3(0.15, 1.0, 0.55), vec3(0.75, 0.25, 0.95), dyc);
  col += aur * a * (1.1 + uAudio * 0.8);
  col += vec3(0.05, 0.35, 0.25) * fbm3(vec2(p.x * 2.0 + t * 0.02, p.y)) * smoothstep(0.35, 0.7, p.y) * 0.25;

  // Fjäll
  vec2 mp = uv + P(0.3);
  float mh = 0.3 + 0.1 * fbm(vec2(mp.x * 2.2, 3.1)) + 0.05 * sin(mp.x * 4.0);
  float mnt = step(mp.y, mh);
  float snowEdge = smoothstep(mh - 0.05, mh, mp.y) * (0.6 + 0.4 * vnoise(vec2(mp.x * 60.0, mp.y * 40.0)));
  vec3 mcol = mix(vec3(0.04, 0.07, 0.12), vec3(0.45, 0.6, 0.72), snowEdge * 0.8);
  mcol += aur * 0.05;
  col = mix(col, mcol, mnt);

  // Granskog i förgrunden (två lager)
  for (int L = 0; L < 2; L++) {
    float fl = float(L);
    vec2 tp = uv + P(0.6 + fl * 0.6);
    float k = 18.0 - fl * 7.0;
    float cell = floor(tp.x * k);
    float fx = fract(tp.x * k) - 0.5;
    float ht = (0.14 + fl * 0.07) + 0.07 * hash11(cell + fl * 9.0);
    float base = 0.13 - fl * 0.07;
    float yy = (tp.y - base) / ht;
    float tiers = abs(fx) * 2.0 - (1.0 - yy) * 0.9 - 0.08 * (fract(yy * 4.0));
    float tree = step(tiers, 0.0) * step(0.0, yy) * step(yy, 1.0);
    float ground = step(tp.y, base + 0.01);
    vec3 tc = mix(vec3(0.015, 0.03, 0.05), vec3(0.005, 0.01, 0.02), fl);
    col = mix(col, tc, max(tree, ground));
  }
  // Snö på marken
  float snow = step(uv.y, 0.07 + 0.01 * sin(uv.x * 20.0));
  col = mix(col, vec3(0.55, 0.65, 0.78) + aur * 0.12, snow);
  col *= 1.0 - 0.35 * pow(length(uv - 0.5), 2.0);
  return col;
}`,
  },
  {
    id: 'synthwave',
    name: 'Neonstad',
    icon: '🌆',
    desc: 'Retrofuturistisk synthwave-solnedgång med neonrutnät som pulserar i takt med rösten.',
    tint: '#ff4fd8',
    ambience: 'synth',
    glsl: /* glsl */ `
vec3 scene(vec2 uv) {
  float t = uTime;
  float hz = 0.36;
  vec2 p = uv + P(0.12);
  vec3 col;
  if (p.y > hz) {
    float y = (p.y - hz) / (1.0 - hz);
    col = mix(vec3(1.0, 0.36, 0.42), vec3(0.28, 0.05, 0.38), smoothstep(0.0, 0.55, y));
    col = mix(col, vec3(0.05, 0.02, 0.14), smoothstep(0.5, 1.0, y));
    // stjärnor
    vec2 sp = p * vec2(ASP, 1.0) * 90.0;
    vec2 sid = floor(sp);
    float st = smoothstep(0.08, 0.0, length(fract(sp) - 0.5 - (hash22(sid) - 0.5) * 0.6)) * step(0.85, hash12(sid)) * smoothstep(0.35, 0.9, y);
    col += st * (0.7 + 0.3 * sin(t * 2.0 + hash12(sid) * 20.0));
    // sol med ränder
    vec2 sc = vec2(0.5, hz + 0.19) + P(0.2);
    vec2 d = (p - sc) * vec2(ASP, 1.0);
    float r = length(d);
    float R = 0.2;
    float sunY = (p.y - sc.y) / R;
    vec3 sunCol = mix(vec3(1.0, 0.18, 0.55), vec3(1.0, 0.88, 0.32), smoothstep(-0.8, 0.8, sunY));
    float stripes = 1.0;
    if (sunY < 0.25) {
      float k = fract((sunY) * 7.0 - t * 0.35);
      float gapW = mix(0.05, 0.45, smoothstep(0.25, -1.0, sunY));
      stripes = step(gapW, k);
    }
    float sun = smoothstep(R, R - 0.004, r) * stripes;
    col = mix(col, sunCol, sun);
    col += vec3(1.0, 0.3, 0.55) * exp(-max(r - R, 0.0) * 9.0) * 0.35 * (1.0 + uAudio * 0.6);
    // berg
    vec2 mp = uv + P(0.3);
    float mh = hz + 0.06 + 0.08 * abs(sin(mp.x * 5.0 + 1.0)) * (0.5 + 0.5 * fbm3(vec2(mp.x * 6.0, 1.0)));
    float mnt = step(mp.y, mh);
    float ridge = smoothstep(0.006, 0.0, abs(mp.y - mh)) ;
    col = mix(col, vec3(0.08, 0.02, 0.16), mnt);
    col += vec3(1.0, 0.25, 0.85) * ridge * 0.9;
    // stadssiluett
    vec2 cp = uv + P(0.45);
    float bx = floor(cp.x * 42.0);
    float bh = hz + 0.02 + 0.09 * pow(hash11(bx * 3.1), 2.5);
    float bld = step(cp.y, bh) * step(0.3, hash11(bx + 7.0));
    vec2 win = fract(vec2(cp.x * 42.0 * 4.0, cp.y * 140.0));
    float lit = step(0.6, hash12(floor(vec2(cp.x * 168.0, cp.y * 140.0)))) * step(0.3, win.x) * step(0.4, win.y);
    col = mix(col, vec3(0.04, 0.01, 0.09) + vec3(0.2, 0.9, 1.0) * lit * 0.6, bld);
  } else {
    // perspektivrutnät
    float y = (hz - p.y);
    float z = 0.08 / max(y, 0.002);
    float x = (p.x - 0.5) * ASP * z;
    float gz = fract(z * 2.0 - t * 1.4);
    float gx = fract(x * 1.2);
    float fade = smoothstep(0.0, 0.25, y);
    float lw = 0.02 + 0.05 * (1.0 - fade);
    float line = max(smoothstep(lw, 0.0, min(gx, 1.0 - gx)), smoothstep(lw * 1.5, 0.0, min(gz, 1.0 - gz)));
    col = mix(vec3(0.06, 0.0, 0.12), vec3(0.01, 0.0, 0.03), fade);
    vec3 lc = mix(vec3(1.0, 0.2, 0.8), vec3(0.2, 0.9, 1.0), sat(y * 3.0));
    col += lc * line * (0.8 + uAudio * 1.2) * (0.35 + 0.65 * fade);
    col += vec3(1.0, 0.3, 0.6) * exp(-y * 18.0) * 0.6;
  }
  col *= 1.0 - 0.3 * pow(length(uv - 0.5), 2.0);
  return col;
}`,
  },
  {
    id: 'space',
    name: 'Rymden',
    icon: '🪐',
    desc: 'Flyt runt bland nebulosor, glittrande stjärnor och en ringplanet. Stjärnfall ibland!',
    tint: '#9b7bff',
    ambience: 'space',
    glsl: /* glsl */ `
float starField(vec2 uv, float density, float seed) {
  vec2 p = uv * vec2(ASP, 1.0) * density;
  vec2 id = floor(p);
  vec3 h = hash32(id + seed);
  float d = length(fract(p) - 0.5 - (h.xy - 0.5) * 0.7);
  float tw = 0.55 + 0.45 * sin(uTime * (0.8 + h.z * 3.0) + h.y * 40.0);
  return smoothstep(0.05 + 0.05 * h.z, 0.0, d) * step(0.8, h.z) * tw;
}
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 p = uv + P(0.1);
  vec2 q = p * vec2(ASP, 1.0);
  vec2 w = vec2(fbm(q * 1.2 + t * 0.01), fbm(q * 1.2 + 7.3 - t * 0.012));
  float n = fbm(q * 1.6 + w * 1.8);
  vec3 col = vec3(0.01, 0.01, 0.035);
  col += vec3(0.25, 0.08, 0.45) * smoothstep(0.35, 0.9, n) * 1.2;
  col += vec3(0.05, 0.25, 0.55) * smoothstep(0.45, 0.95, fbm(q * 2.3 - w)) * 0.9;
  col += vec3(0.9, 0.3, 0.6) * pow(sat(n * 1.3 - 0.35), 3.0) * 1.3;
  col += vec3(1.0) * starField(uv + P(0.2), 70.0, 1.0);
  col += vec3(0.8, 0.85, 1.0) * starField(uv + P(0.5), 35.0, 7.0) * 1.2;
  col += vec3(1.0, 0.9, 0.8) * starField(uv + P(0.9), 16.0, 3.0) * 1.4;

  // stjärnfall
  float cyc = fract(t / 7.0);
  float sid = floor(t / 7.0);
  vec2 s0 = vec2(0.1 + 0.6 * hash11(sid), 0.95);
  vec2 sdir = normalize(vec2(1.0, -0.45));
  vec2 head = s0 + sdir * cyc * 1.4;
  vec2 rel = (uv - head) * vec2(ASP, 1.0);
  float along = dot(rel, -sdir);
  float across = length(rel + sdir * along);
  float streak = smoothstep(0.004, 0.0, across) * smoothstep(0.25, 0.0, along) * step(0.0, along) * smoothstep(0.35, 0.0, cyc);
  col += vec3(1.0, 0.95, 0.9) * streak * 1.5;

  // planet med ring
  vec2 pc = vec2(0.8, 0.22) + P(0.6);
  vec2 d = (uv - pc) * vec2(ASP, 1.0);
  float R = 0.3;
  float r = length(d);
  vec2 rd = vec2(d.x * 0.95 + d.y * 0.3, (d.y - d.x * 0.3) * 3.2);
  float rr = length(rd);
  float ring = smoothstep(0.012, 0.0, abs(rr - 0.48)) * 0.5 + smoothstep(0.035, 0.0, abs(rr - 0.42)) * 0.35;
  ring *= 0.7 + 0.3 * sin(rr * 120.0);
  bool front = rd.y < 0.0;
  if (!front) col += vec3(0.9, 0.75, 0.6) * ring * 0.6;
  if (r < R) {
    vec3 nrm = normalize(vec3(d / R, sqrt(max(1.0 - dot(d / R, d / R), 0.0))));
    float lat = asin(nrm.y);
    float bands = fbm(vec2(lat * 6.0, nrm.x * 2.0 + t * 0.02));
    vec3 surf = mix(vec3(0.45, 0.25, 0.55), vec3(0.95, 0.6, 0.45), bands);
    float lit = sat(dot(nrm, normalize(vec3(-0.6, 0.5, 0.6))));
    col = surf * (0.08 + lit * 1.1);
    col += vec3(0.4, 0.6, 1.0) * pow(1.0 - nrm.z, 3.0) * 0.8;
  }
  col += vec3(0.35, 0.55, 1.0) * exp(-max(r - R, 0.0) * 30.0) * 0.4 * step(R, r);
  if (front) col += vec3(0.9, 0.75, 0.6) * ring * 0.7 * step(R * 0.2, r);
  col *= 1.0 + uAudio * 0.1;
  return col;
}`,
  },
  {
    id: 'forest',
    name: 'Förtrollad skog',
    icon: '🌲',
    desc: 'Dimmig sagoskog med solstrålar genom lövtaket, glödande svampar och svävande eldflugor.',
    tint: '#8cffb0',
    ambience: 'forest',
    glsl: /* glsl */ `
vec3 scene(vec2 uv) {
  float t = uTime;
  vec3 fogCol = vec3(0.2, 0.42, 0.4);
  vec3 col = mix(vec3(0.34, 0.55, 0.46), vec3(0.03, 0.08, 0.1), smoothstep(0.15, 1.0, uv.y));
  // solstrålar genom lövverket
  vec2 src = vec2(0.28, 1.3) + P(0.1);
  vec2 dv = uv - src;
  float ang = atan(dv.x, -dv.y);
  float rays = pow(vnoise(vec2(ang * 18.0, t * 0.06)), 2.2) * smoothstep(1.5, 0.2, length(dv * vec2(ASP, 1.0)));
  col += vec3(1.0, 0.9, 0.55) * rays * 0.55;
  // trädlager bakifrån och fram
  for (int L = 0; L < 4; L++) {
    float fl = float(L);
    float depth = fl / 3.0;
    vec2 p = uv + P(0.15 + depth * 0.9);
    float k = 7.0 - fl * 1.3;
    float x = p.x * ASP * k + fl * 13.7;
    float id = floor(x);
    float fx = fract(x) - 0.5;
    float h = hash11(id * 3.3 + fl);
    float lean = (h - 0.5) * 0.12;
    float wdt = 0.07 + 0.08 * h + depth * 0.05;
    float cx = (hash11(id * 7.1 + fl) - 0.5) * 0.5 + lean * p.y;
    float trunk = step(abs(fx - cx), wdt) * step(0.35, hash11(id + 5.0 + fl));
    vec3 tc = mix(fogCol * 0.95, vec3(0.012, 0.035, 0.035), 0.4 + depth * 0.6);
    float bark = vnoise(vec2(fx * 40.0, p.y * 12.0));
    float rim = smoothstep(wdt, wdt * 0.6, abs(fx - cx - wdt * 0.6)) * rays * (1.0 - depth);
    tc = tc * (0.85 + 0.3 * bark * depth) + vec3(0.9, 0.8, 0.5) * rim * 0.15;
    col = mix(col, tc, trunk);
    float fog = fbm3(vec2(p.x * 2.0 + t * 0.03 * (1.0 + fl), p.y * 3.0 + fl));
    col = mix(col, fogCol * (0.85 + 0.3 * fog), (0.2 - depth * 0.06) * smoothstep(0.75, 0.0, uv.y) * (0.6 + fog));
  }
  // lövtak upptill
  vec2 cp = uv + P(1.0);
  float canopy = fbm(vec2(cp.x * 4.0, cp.y * 3.0 + t * 0.02));
  float leaves = smoothstep(0.88 - canopy * 0.35, 1.0 - canopy * 0.2, cp.y);
  col = mix(col, vec3(0.01, 0.04, 0.03), leaves * 0.92);
  // mossig mark och glödande svampar
  vec2 gp = uv + P(1.3);
  float ground = step(gp.y, 0.1 + 0.07 * abs(sin(gp.x * 38.0 + sin(gp.x * 7.0) * 2.0)) * (0.6 + 0.4 * sin(gp.x * 5.0 + t * 0.4)));
  col = mix(col, vec3(0.01, 0.05, 0.035), ground);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    vec2 mp = vec2(hash11(fi * 4.7) * 0.95 + 0.025, 0.07 + 0.03 * hash11(fi * 2.3)) + P(1.2);
    vec2 d = (uv - mp) * vec2(ASP, 1.0);
    float capR = 0.012 + 0.012 * hash11(fi);
    float cap = smoothstep(capR, capR * 0.7, length(d * vec2(1.0, 1.9))) * step(0.0, d.y);
    float stem = step(abs(d.x), capR * 0.3) * step(d.y, 0.0) * step(-capR * 1.4, d.y);
    vec3 mc = hash11(fi * 9.1) > 0.5 ? vec3(0.3, 1.0, 0.85) : vec3(1.0, 0.45, 0.85);
    float pulse = 0.7 + 0.3 * sin(t * 1.5 + fi * 2.0);
    col = mix(col, mc * 1.3, cap * pulse);
    col = mix(col, vec3(0.75, 0.85, 0.8), stem * 0.7);
    col += mc * exp(-dot(d, d) / (capR * capR * 18.0)) * 0.35 * pulse;
  }
  // eldflugor
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    vec2 base = vec2(hash11(fi * 1.7), hash11(fi * 9.1) * 0.75 + 0.08);
    vec2 pos = base + 0.05 * vec2(sin(t * (0.3 + hash11(fi) * 0.4) + fi), cos(t * (0.25 + hash11(fi * 2.0) * 0.3) + fi * 1.3)) + P(0.5 + hash11(fi * 4.0));
    vec2 d = (uv - pos) * vec2(ASP, 1.0);
    float glow = exp(-dot(d, d) * 9000.0) + exp(-dot(d, d) * 700.0) * 0.25;
    float blink = smoothstep(0.2, 1.0, sin(t * (1.2 + hash11(fi * 3.0)) + fi * 5.0));
    col += vec3(0.85, 1.0, 0.45) * glow * blink * (1.2 + uAudio);
  }
  col *= 1.0 - 0.4 * pow(length((uv - 0.5) * vec2(1.0, 1.2)), 2.0);
  return col;
}`,
  },
  {
    id: 'ocean',
    name: 'Undervattensvärld',
    icon: '🐠',
    desc: 'Gungande ljusreflexer, bubblor och vajande sjögräs djupt under havsytan.',
    tint: '#47d6ff',
    ambience: 'underwater',
    glsl: /* glsl */ `
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.2831, 6.2831) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
vec3 scene(vec2 uv) {
  float t = uTime * 0.6;
  vec2 p = uv + P(0.2);
  vec3 col = mix(vec3(0.0, 0.06, 0.16), vec3(0.05, 0.45, 0.62), smoothstep(0.0, 1.0, p.y));
  col += vec3(0.4, 0.9, 1.0) * caustic(p * vec2(ASP, 1.0) * 0.6, t) * smoothstep(0.35, 1.0, p.y) * 0.35;
  float rays = pow(vnoise(vec2((p.x + p.y * 0.3) * 9.0, t * 0.4)), 3.0) * smoothstep(0.1, 1.0, p.y);
  col += vec3(0.5, 0.9, 1.0) * rays * 0.35;
  // fiskstim långt bort
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float spd = 0.02 + 0.015 * hash11(fi);
    vec2 fpos = vec2(fract(hash11(fi * 3.1) + t * spd) * 1.4 - 0.2, 0.45 + 0.35 * hash11(fi * 7.7) + 0.02 * sin(t + fi));
    vec2 d = (uv + P(0.4) - fpos) * vec2(ASP, 1.0);
    float body = smoothstep(1.0, 0.8, length(d * vec2(45.0, 110.0)));
    float tail = step(d.x, -0.02) * step(-0.034, d.x) * step(abs(d.y), (-0.02 - d.x) * 0.9);
    col = mix(col, vec3(0.02, 0.15, 0.25), max(body, tail) * 0.6);
  }
  // sjögräs
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float bx = hash11(fi * 5.3) + P(0.9 + fi * 0.03).x;
    float hgt = 0.2 + 0.25 * hash11(fi * 2.1);
    float sway = sin(uv.y * 7.0 + t * 1.3 + fi) * 0.025 * uv.y * 3.0;
    float w = 0.012 * (1.0 - uv.y / hgt);
    float weed = step(abs((uv.x - bx - sway) * ASP), w) * step(uv.y, hgt);
    col = mix(col, vec3(0.02, 0.14, 0.1) * (0.6 + 0.4 * hash11(fi)), weed);
  }
  // sandbotten med kaustik
  float floorY = 0.1 + 0.02 * sin(uv.x * 8.0);
  float sand = step(uv.y, floorY);
  col = mix(col, vec3(0.08, 0.2, 0.26) + vec3(0.3, 0.6, 0.6) * caustic(uv * vec2(ASP, 1.0) * 1.3, t * 1.2) * 0.5, sand);
  // bubblor
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float spd = 0.08 + 0.1 * hash11(fi * 1.9);
    float y = fract(t * spd + hash11(fi * 4.4));
    vec2 bpos = vec2(hash11(fi * 8.2) + 0.015 * sin(y * 20.0 + fi), y * 1.1 - 0.05) + P(0.7);
    vec2 d = (uv - bpos) * vec2(ASP, 1.0);
    float R = 0.006 + 0.012 * hash11(fi * 3.3);
    float r = length(d);
    float rim = smoothstep(R, R * 0.7, r) - smoothstep(R * 0.8, R * 0.5, r);
    float hl = smoothstep(R * 0.35, 0.0, length(d - vec2(-R, R) * 0.35));
    col += vec3(0.7, 0.95, 1.0) * (rim * 0.6 + hl * 0.8);
  }
  // havssnö
  vec2 sp = uv * vec2(ASP, 1.0) * 30.0 + vec2(0.0, t * 0.5);
  vec2 sid = floor(sp);
  col += vec3(0.6, 0.9, 1.0) * smoothstep(0.06, 0.0, length(fract(sp) - 0.5 - (hash22(sid) - 0.5) * 0.7)) * step(0.85, hash12(sid)) * 0.35;
  col *= 1.0 - 0.45 * pow(length(uv - vec2(0.5, 0.6)), 2.0);
  col *= 1.0 + uAudio * 0.1;
  return col;
}`,
  },
  {
    id: 'sunset',
    name: 'Lo-fi solnedgång',
    icon: '🌇',
    desc: 'Pastellfärgad kvällshimmel över en stad där fönstren tänds ett efter ett.',
    tint: '#ff9d7a',
    ambience: 'city',
    glsl: /* glsl */ `
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 p = uv + P(0.1);
  vec3 col = mix(vec3(1.0, 0.72, 0.5), vec3(0.95, 0.5, 0.58), smoothstep(0.25, 0.6, p.y));
  col = mix(col, vec3(0.32, 0.25, 0.52), smoothstep(0.55, 1.0, p.y));
  vec2 sc = vec2(0.3, 0.36) + P(0.2);
  vec2 d = (p - sc) * vec2(ASP, 1.0);
  float r = length(d);
  col = mix(col, vec3(1.0, 0.93, 0.75), smoothstep(0.085, 0.08, r));
  col += vec3(1.0, 0.6, 0.35) * exp(-r * 5.0) * 0.45;
  // moln
  for (int L = 0; L < 3; L++) {
    float fl = float(L);
    vec2 cp = uv + P(0.25 + fl * 0.15);
    float y0 = 0.62 + fl * 0.11;
    float n = fbm(vec2(cp.x * (2.0 + fl) + t * 0.012 * (1.0 + fl), cp.y * 6.0 + fl * 3.0));
    float cl = smoothstep(0.52, 0.7, n) * smoothstep(0.12, 0.0, abs(cp.y - y0));
    vec3 cc = mix(vec3(1.0, 0.75, 0.7), vec3(0.62, 0.45, 0.72), fl / 2.0);
    col = mix(col, cc, cl * 0.8);
  }
  // fåglar
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 bp = vec2(fract(t * 0.02 + hash11(fi)) * 1.3 - 0.15, 0.62 + 0.15 * hash11(fi * 3.0) + 0.01 * sin(t + fi));
    vec2 bd = (uv - bp) * vec2(ASP, 1.0) * 180.0;
    float flap = 0.4 + 0.4 * sin(t * 8.0 + fi);
    float bird = smoothstep(0.35, 0.0, abs(bd.y - abs(bd.x) * flap)) * step(abs(bd.x), 1.6);
    col = mix(col, vec3(0.25, 0.15, 0.3), bird * 0.8);
  }
  // kullar
  vec2 hp = uv + P(0.35);
  float hill = step(hp.y, 0.3 + 0.05 * sin(hp.x * 5.0 + 1.0) + 0.03 * sin(hp.x * 13.0));
  col = mix(col, vec3(0.55, 0.36, 0.52), hill);
  // stad
  vec2 cp = uv + P(0.6);
  float k = 34.0;
  float bx = floor(cp.x * k);
  float bh = 0.14 + 0.18 * pow(hash11(bx * 1.37), 2.0);
  float bld = step(cp.y, bh);
  vec2 wg = vec2(cp.x * k * 5.0, cp.y * 90.0);
  vec2 wf = fract(wg);
  float wid = hash12(floor(wg));
  float lit = step(0.25, wf.x) * step(wf.x, 0.75) * step(0.3, wf.y) * step(wf.y, 0.75) * step(0.55, fract(wid + t * 0.01 * step(0.9, wid)));
  vec3 bc = vec3(0.24, 0.14, 0.3) + vec3(1.0, 0.8, 0.45) * lit * 0.85;
  col = mix(col, bc, bld);
  col *= 1.0 - 0.3 * pow(length(uv - 0.5), 2.0);
  return col;
}`,
  },
  {
    id: 'aura',
    name: 'Aura',
    icon: '🔮',
    desc: 'Mjuka, flytande färgmoln i premiumstil. Stilren bakgrund som andas med din röst.',
    tint: '#b388ff',
    ambience: 'pad',
    glsl: /* glsl */ `
vec3 scene(vec2 uv) {
  float t = uTime * 0.25;
  vec2 p = (uv + P(0.3) - 0.5) * vec2(ASP, 1.0);
  vec2 q = p + 0.15 * vec2(fbm3(p * 1.5 + t), fbm3(p * 1.5 - t + 4.0));
  vec3 col = vec3(0.025, 0.02, 0.06);
  vec3 pal[5];
  pal[0] = vec3(0.49, 0.36, 1.0);
  pal[1] = vec3(0.13, 0.83, 0.93);
  pal[2] = vec3(1.0, 0.31, 0.85);
  pal[3] = vec3(0.23, 0.2, 0.85);
  pal[4] = vec3(1.0, 0.6, 0.35);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = 0.55 * vec2(sin(t * (0.9 + fi * 0.21) + fi * 1.7) * ASP * 0.7, cos(t * (0.7 + fi * 0.17) + fi * 2.9));
    float rad = 0.28 + 0.06 * sin(t * 2.0 + fi) + uAudio * 0.12;
    float w = exp(-dot(q - c, q - c) / (rad * rad));
    col += pal[i] * w * 0.75;
  }
  col = col / (1.0 + col * 0.35);
  float glass = sin((q.x + q.y) * 28.0 + t * 3.0) * 0.5 + 0.5;
  col *= 0.94 + 0.06 * glass;
  col += (hash12(uv * uRes + t) - 0.5) * 0.03;
  return col;
}`,
  },
  {
    id: 'matrix',
    name: 'Digitalt regn',
    icon: '💚',
    desc: 'Fallande kodtecken i grönt – känn dig som en hackare i en cyberthriller.',
    tint: '#3dff7a',
    ambience: 'digital',
    glsl: /* glsl */ `
float glyphLayer(vec2 uv, float cellPx, float t, float seed, out float head) {
  vec2 px = uv * uRes;
  vec2 cellSize = vec2(cellPx * 0.72, cellPx);
  vec2 cell = floor(px / cellSize);
  vec2 f = fract(px / cellSize);
  float rows = uRes.y / cellSize.y;
  float colSeed = hash11(cell.x * 1.37 + seed);
  float speed = 6.0 + colSeed * 14.0;
  float headRow = fract(t * speed / rows * 0.35 + colSeed) * (rows + 25.0);
  float row = rows - cell.y;
  float dist = headRow - row;
  float len = 12.0 + colSeed * 18.0;
  float bright = dist >= 0.0 && dist < len ? 1.0 - dist / len : 0.0;
  head = smoothstep(1.5, 0.0, abs(dist));
  float gid = floor(hash12(cell + seed) * 50.0 + t * (0.5 + colSeed * 2.0) * step(0.8, hash12(cell * 1.3)));
  vec2 g = floor(f * vec2(5.0, 7.0));
  float bit = step(0.5, hash12(g + gid * 17.0 + cell * 0.1));
  float inside = step(0.1, f.x) * step(f.x, 0.9) * step(0.08, f.y) * step(f.y, 0.92);
  return bit * inside * bright;
}
vec3 scene(vec2 uv) {
  float t = uTime;
  float h1; float h2;
  float far = glyphLayer(uv + P(0.2), 12.0, t * 0.8, 3.0, h1);
  float near = glyphLayer(uv + P(0.6), 22.0, t, 11.0, h2);
  vec3 col = vec3(0.0, 0.02, 0.01);
  col += vec3(0.05, 0.45, 0.15) * far * 0.6;
  col += vec3(0.1, 1.0, 0.35) * near * 0.9;
  col += vec3(0.8, 1.0, 0.85) * near * h2 * 0.9;
  col += vec3(0.0, 0.25, 0.08) * (0.4 + uAudio);
  col *= 0.8 + 0.2 * sin(uv.y * uRes.y * 1.5);
  col *= 1.0 - 0.5 * pow(length(uv - 0.5), 2.0);
  return col;
}`,
  },
  {
    id: 'studio',
    name: 'Gamingrum',
    icon: '🎮',
    desc: 'Mörkt streamerrum med sexkantiga ljudpaneler och RGB-ljus som vandrar i vågor.',
    tint: '#6aa8ff',
    ambience: 'room',
    glsl: /* glsl */ `
vec4 hexCoords(vec2 uv) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  vec2 id = uv - gv;
  float edge = 0.5 - max(abs(gv.x), dot(abs(gv), normalize(vec2(1.0, 1.7320508))));
  return vec4(gv, id);
}
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 p = (uv + P(0.3)) * vec2(ASP, 1.0) * 5.5;
  vec4 hx = hexCoords(p);
  vec2 gv = hx.xy;
  vec2 id = hx.zw;
  float e = 0.5 - max(abs(gv.x), dot(abs(gv), normalize(vec2(1.0, 1.7320508))));
  float bevel = smoothstep(0.0, 0.08, e);
  float gap = smoothstep(0.015, 0.03, e);
  vec3 wall = vec3(0.03, 0.035, 0.05);
  float shade = 0.75 + 0.25 * dot(normalize(vec3(-gv, 0.4)), normalize(vec3(-0.4, 0.6, 0.7)));
  vec3 panel = vec3(0.06, 0.065, 0.09) * shade * (0.85 + 0.15 * bevel);
  float wave = sin(id.x * 0.35 + id.y * 0.2 - t * 1.2) * 0.5 + 0.5;
  float lit = step(0.62, hash12(id * 0.37)) * (0.35 + 0.65 * wave);
  vec3 lc = hue(fract(t * 0.05 + id.x * 0.03 + id.y * 0.015));
  panel += lc * lit * 0.55 * (smoothstep(0.02, 0.2, e) * 0.6 + 0.4) * (1.0 + uAudio * 1.5);
  vec3 col = mix(wall, panel, gap);
  // LED-list uppe och nere
  float stripTop = exp(-abs(uv.y - 0.965) * 120.0);
  float stripBot = exp(-abs(uv.y - 0.03) * 120.0);
  vec3 sc = hue(fract(uv.x * 0.8 - t * 0.12));
  col += sc * (stripTop + stripBot) * 1.1;
  col += sc * exp(-abs(uv.y - 0.965) * 12.0) * 0.18 + hue(fract(uv.x * 0.8 - t * 0.12 + 0.3)) * exp(-abs(uv.y - 0.03) * 10.0) * 0.18;
  col *= 1.0 - 0.45 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
];

export const SCENE_MAP = Object.fromEntries(SCENES.map((s) => [s.id, s]));
