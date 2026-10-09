// Fler levande platser: kungligt, kändisvärlden, rymden, stranden och neonstaden.
// Samma kontrakt som scenes.js: `vec3 scene(vec2 uv)` i sRGB, P(djup) = parallax.

const STARS = /* glsl */ `
float starField(vec2 uv, float scale, float t) {
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec2 h = hash22(id) - 0.5;
  float s = step(0.86, hash12(id + 7.7));
  float tw = 0.55 + 0.45 * sin(t * (1.5 + hash12(id) * 3.0) + hash12(id + 2.0) * 6.28);
  return s * tw * smoothstep(0.07, 0.0, length(f - h * 0.6));
}`;

const SPARKLE = /* glsl */ `
float dust(vec2 uv, float t, float scale, float speed) {
  vec2 g = uv * scale + vec2(0.0, -t * speed);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec2 h = hash22(id) - 0.5;
  f.x += sin(t * 0.7 + h.y * 9.0) * 0.2;
  float tw = pow(0.5 + 0.5 * sin(t * 3.0 + h.x * 30.0), 6.0);
  return step(0.7, hash12(id + 3.3)) * tw * smoothstep(0.08, 0.0, length(f - h * 0.6));
}`;

export const MORE_SCENES = [
  {
    id: 'throne',
    name: 'Tronsalen',
    icon: '👑',
    desc: 'Kunglig tronsal med röd matta, guldpelare, fladdrande baner och glittrande ljuskrona.',
    tint: '#ffc67a',
    ambience: 'hall',
    glsl: /* glsl */ `
${SPARKLE}
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 q = uv + P(0.25);
  float hw = 0.5 * ASP;
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  float h = 0.34;
  vec3 col;
  if (y > h) {
    vec3 wall = mix(vec3(0.34, 0.035, 0.065), vec3(0.11, 0.01, 0.03), smoothstep(0.0, 0.66, y - h));
    vec2 d = vec2(x, y) * 7.0;
    d.x += 0.5 * mod(floor(d.y), 2.0);
    vec2 c = abs(fract(d) - 0.5);
    wall += vec3(0.6, 0.38, 0.1) * smoothstep(0.045, 0.0, abs(c.x + c.y - 0.3)) * 0.16;
    float arch = length(vec2(x * 0.9, (y - 0.56)));
    wall += vec3(1.0, 0.62, 0.28) * exp(-arch * 3.0) * (0.42 + uAudio * 0.45);
    col = wall;
  } else {
    float d = h - y;
    float z = 0.13 / (d + 0.014);
    vec2 g = vec2(x * z, z) * 2.2;
    float chk = mod(floor(g.x) + floor(g.y), 2.0);
    vec3 fl = mix(vec3(0.05, 0.045, 0.055), vec3(0.78, 0.74, 0.7), chk);
    fl *= 0.3 + 0.7 * smoothstep(0.0, 0.26, d);
    fl += vec3(1.0, 0.55, 0.22) * exp(-abs(x) * 2.6) * 0.28 * smoothstep(0.0, 0.22, d);
    float cw = 0.05 + d * 1.25;
    float carpet = smoothstep(cw, cw - 0.008, abs(x));
    float inner = smoothstep(cw - 0.012, cw - 0.022, abs(x));
    vec3 carp = mix(vec3(0.9, 0.68, 0.22), vec3(0.58, 0.03, 0.07), inner);
    carp *= 0.5 + 0.5 * smoothstep(0.0, 0.3, d);
    col = mix(fl, carp, carpet);
  }
  // baner
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    float bx = s * max(hw * 0.5, 0.2);
    float yy = y;
    float wave = sin(yy * 9.0 + t * 1.6 + s) * 0.012 * (1.0 - yy);
    float u = (x - bx - wave) / 0.085;
    float bottom = 0.5 + abs(u) * 0.06;
    if (abs(u) < 1.0 && yy > bottom && yy < 0.97) {
      vec3 ban = vec3(0.62, 0.04, 0.08) * (0.7 + 0.3 * cos(u * 1.4));
      float border = step(0.82, abs(u)) + step(yy, bottom + 0.018);
      ban = mix(ban, vec3(0.95, 0.72, 0.25), clamp(border, 0.0, 1.0));
      vec2 e = vec2(u * 0.085, yy - 0.74);
      float crown = step(abs(e.x), 0.045) * step(-0.02, e.y) * step(e.y, 0.012);
      float spikes = step(abs(e.x), 0.045) * step(e.y, 0.012 + 0.03 * (1.0 - abs(fract(e.x * 33.0) - 0.5) * 2.0)) * step(0.0, e.y);
      ban = mix(ban, vec3(1.0, 0.8, 0.3), clamp(crown + spikes, 0.0, 1.0));
      col = ban;
    }
  }
  // pelare
  vec2 q2 = uv + P(0.55);
  float x2 = (q2.x - 0.5) * ASP;
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    float px = s * max(hw * 0.84, 0.32);
    float u = (x2 - px) / 0.08;
    if (abs(u) < 1.0) {
      float sh = sqrt(1.0 - u * u);
      vec3 m = vec3(0.93, 0.87, 0.76) * (0.35 + 0.65 * sh) * (0.86 + 0.14 * cos(u * 20.0));
      m += vec3(1.0, 0.85, 0.6) * pow(sh, 18.0) * 0.4;
      float cap = smoothstep(0.86, 0.87, q2.y) + smoothstep(0.1, 0.09, q2.y);
      m = mix(m, vec3(0.95, 0.72, 0.28) * (0.4 + 0.8 * sh), clamp(cap, 0.0, 1.0));
      col = m * (0.75 + 0.25 * smoothstep(0.0, 0.5, q2.y));
    }
  }
  // ljuskrona
  vec2 cp = vec2(x, y - 0.95);
  float fl = 0.9 + 0.1 * sin(t * 13.0) * sin(t * 7.3);
  col += vec3(1.0, 0.75, 0.4) * exp(-length(cp * vec2(1.0, 1.6)) * 6.0) * 0.8 * fl;
  for (int i = 0; i < 9; i++) {
    float a = float(i) / 9.0 * 6.2832 + t * 0.15;
    vec2 cpos = vec2(cos(a) * 0.17, -0.03 + sin(a) * 0.035);
    col += vec3(1.0, 0.85, 0.55) * smoothstep(0.012, 0.0, length(cp - cpos)) * (0.8 + 0.2 * sin(t * 9.0 + float(i)));
  }
  col += vec3(1.0, 0.82, 0.45) * dust(uv + P(0.8), t, 18.0, 0.05) * 0.9;
  col *= 1.0 - 0.35 * pow(length((uv - 0.5) * vec2(1.1, 1.0)), 2.0);
  return col;
}`,
  },
  {
    id: 'podium',
    name: 'Presskonferensen',
    icon: '🏛️',
    desc: 'Blå sammetsridå, flaggor som vajar, ett stort emblem bakom dig och pressens kamerablixtar.',
    tint: '#cfe0ff',
    ambience: 'press',
    glsl: /* glsl */ `
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 q = uv + P(0.25);
  float hw = 0.5 * ASP;
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  float fold = sin(x * 38.0 + sin(x * 6.0) * 2.0);
  vec3 col = vec3(0.05, 0.11, 0.3) * (0.62 + 0.38 * fold) + vec3(0.02, 0.05, 0.12);
  col *= 0.6 + 0.4 * smoothstep(0.0, 0.8, y);
  float val = smoothstep(0.9, 0.905, y);
  col = mix(col, vec3(0.07, 0.14, 0.38) * (0.8 + 0.2 * sin(x * 70.0)), val);
  col = mix(col, vec3(0.9, 0.72, 0.3), smoothstep(0.004, 0.0, abs(y - 0.9)));
  // emblem
  vec2 e = vec2(x, y - 0.6);
  float r = length(e);
  col = mix(col, vec3(0.04, 0.09, 0.26), smoothstep(0.345, 0.34, r));
  float ring = smoothstep(0.012, 0.0, abs(r - 0.33)) + smoothstep(0.006, 0.0, abs(r - 0.3));
  col = mix(col, vec3(0.95, 0.78, 0.36), clamp(ring, 0.0, 1.0));
  float ang = atan(e.y, e.x);
  vec2 sp = vec2(cos(floor(ang / 0.3927 + 0.5) * 0.3927), sin(floor(ang / 0.3927 + 0.5) * 0.3927)) * 0.315;
  vec2 sd = e - sp;
  float star = smoothstep(0.012, 0.0, abs(sd.x) + abs(sd.y) * 1.0 - 0.004);
  col = mix(col, vec3(1.0, 0.9, 0.55), star);
  col += vec3(0.6, 0.75, 1.0) * exp(-r * 4.0) * 0.18;
  // flaggor
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    float pole = s * max(hw * 0.72, 0.24);
    vec2 fq = uv + P(0.45);
    float fx = (fq.x - 0.5) * ASP;
    float fy = fq.y;
    col = mix(col, vec3(0.85, 0.7, 0.35) * (0.6 + 0.4 * cos((fx - pole) * 300.0)), step(abs(fx - pole), 0.006) * step(fy, 0.93));
    col = mix(col, vec3(1.0, 0.85, 0.45), smoothstep(0.016, 0.01, length(vec2(fx - pole, fy - 0.94))));
    float u = (fx - pole) * -s;
    float wave = sin(u * 18.0 - t * 3.2) * 0.02 * u * 4.0;
    float vy = fy - 0.88 + wave;
    if (u > 0.0 && u < 0.26 && vy < 0.0 && vy > -0.3) {
      float sh = 0.75 + 0.25 * cos(u * 18.0 - t * 3.2);
      float stripe = step(0.5, fract(-vy * 23.0));
      vec3 fc = mix(vec3(0.75, 0.06, 0.1), vec3(0.95, 0.95, 0.95), stripe);
      if (u < 0.11 && vy > -0.14) {
        fc = vec3(0.07, 0.16, 0.45);
        vec2 sc = fract(vec2(u, vy) * 36.0) - 0.5;
        fc = mix(fc, vec3(1.0), smoothstep(0.2, 0.1, length(sc)));
      }
      col = fc * sh;
    }
  }
  // spotlights uppifrån
  col += vec3(0.8, 0.88, 1.0) * exp(-abs(x) * 2.5) * smoothstep(0.2, 1.0, y) * 0.12;
  // kamerablixtar
  float ft = floor(t * 3.0);
  float k = fract(t * 3.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float on = step(0.72, hash11(ft * 3.1 + fi * 17.0));
    vec2 fp = vec2((hash11(ft + fi * 5.3) - 0.5) * ASP * 0.95, 0.04 + hash11(ft * 1.7 + fi) * 0.18);
    vec2 dd = vec2(x, y) - fp;
    float fl = on * exp(-k * 9.0);
    col += vec3(1.0) * fl * (exp(-length(dd) * 18.0) + smoothstep(0.004, 0.0, abs(dd.x * dd.y)) * exp(-length(dd) * 7.0));
    col += vec3(0.9, 0.95, 1.0) * fl * 0.05;
  }
  col *= 1.0 - 0.3 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
  {
    id: 'redcarpet',
    name: 'Röda mattan',
    icon: '📸',
    desc: 'Galapremiär med sponsorvägg, sammetsrep, strålkastare och paparazzi som blixtrar non-stop.',
    tint: '#ffd6e6',
    ambience: 'paparazzi',
    glsl: /* glsl */ `
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 q = uv + P(0.2);
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  vec3 col;
  float h = 0.27;
  if (y > h) {
    vec2 g = vec2(x, y) * vec2(6.0, 6.0);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float alt = mod(id.x + id.y, 2.0);
    vec3 wall = vec3(0.93, 0.93, 0.95);
    vec2 a = abs(f);
    float star = smoothstep(0.03, 0.0, a.x + a.y * 0.55 - 0.16) + smoothstep(0.03, 0.0, a.y + a.x * 0.55 - 0.16);
    float diamond = smoothstep(0.02, 0.0, abs(a.x + a.y - 0.2)) * 0.9;
    vec3 logo = mix(vec3(0.95, 0.15, 0.55), vec3(0.12, 0.12, 0.16), alt);
    wall = mix(wall, logo, clamp(alt > 0.5 ? diamond : star, 0.0, 1.0));
    wall *= 0.55 + 0.45 * exp(-pow(length(vec2(x * 0.8, y - 0.62)), 2.0) * 2.2);
    col = wall;
  } else {
    float d = h - y;
    float z = 0.1 / (d + 0.02);
    float streak = 0.85 + 0.15 * sin(x * z * 40.0);
    col = vec3(0.62, 0.03, 0.07) * streak * (0.5 + 0.5 * smoothstep(0.0, 0.25, d));
    col += vec3(1.0, 0.4, 0.5) * exp(-abs(x) * 3.0) * 0.12;
  }
  // sammetsrep med guldstolpar
  vec2 q2 = uv + P(0.5);
  float x2 = (q2.x - 0.5) * ASP;
  float y2 = q2.y;
  for (int i = 0; i < 4; i++) {
    float px = (float(i) - 1.5) * 0.55;
    float u = x2 - px;
    if (abs(u) < 0.012 && y2 < 0.3) col = vec3(0.95, 0.75, 0.3) * (0.6 + 0.4 * cos(u * 130.0));
    if (length(vec2(u, y2 - 0.305)) < 0.022) col = vec3(1.0, 0.82, 0.4);
  }
  float seg = fract(x2 / 0.55 + 0.5) - 0.5;
  float ry = 0.29 - (0.25 - seg * seg) * 0.28;
  float rope = smoothstep(0.012, 0.004, abs(y2 - ry)) * step(abs(x2), 0.83);
  col = mix(col, vec3(0.7, 0.02, 0.08) * (0.7 + 0.3 * smoothstep(0.012, 0.0, abs(y2 - ry - 0.004))), rope);
  // strålkastare
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    vec2 o = vec2(s * 0.8, 1.05);
    vec2 d = vec2(x, y) - o;
    float ang = atan(d.x, -d.y) - s * (0.45 + sin(t * 0.6 + s) * 0.15);
    float cone = smoothstep(0.16, 0.0, abs(ang)) * smoothstep(1.5, 0.2, length(d));
    col += vec3(1.0, 0.9, 0.75) * cone * 0.18;
  }
  // paparazziblixtar
  float ft = floor(t * 5.0);
  float k = fract(t * 5.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float on = step(0.45, hash11(ft * 1.3 + fi * 11.0));
    float side = hash11(ft + fi * 3.0) < 0.5 ? -1.0 : 1.0;
    vec2 fp = vec2(side * (0.35 + hash11(ft * 2.1 + fi) * 0.55), 0.05 + hash11(ft * 0.7 + fi * 9.0) * 0.32);
    vec2 dd = vec2(x, y) - fp;
    float fl = on * exp(-k * 7.0);
    col += vec3(1.0) * fl * (exp(-length(dd) * 16.0) * 1.4 + smoothstep(0.005, 0.0, min(abs(dd.x), abs(dd.y))) * exp(-length(dd) * 9.0));
    col += vec3(1.0, 0.97, 0.92) * fl * 0.06;
  }
  col *= 1.0 - 0.3 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
  {
    id: 'concert',
    name: 'Konsertscenen',
    icon: '🎤',
    desc: 'Arenascen med LED-vägg, svepande strålkastare, laser och ett publikhav som hoppar i takt.',
    tint: '#ff4fd8',
    ambience: 'crowd',
    glsl: /* glsl */ `
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
vec3 scene(vec2 uv) {
  float t = uTime;
  float beat = uAudio;
  vec2 q = uv + P(0.2);
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  vec3 col = vec3(0.01, 0.005, 0.03);
  // LED-vägg
  if (y > 0.3 && y < 0.92) {
    vec2 g = vec2(x, y) * 34.0;
    vec2 f = fract(g) - 0.5;
    vec2 id = floor(g);
    float wave = sin(id.x * 0.18 + t * 2.0) + sin(id.y * 0.22 - t * 1.4) + sin(length(id - vec2(0.0, 20.0)) * 0.25 - t * 3.0);
    vec3 led = hue(fract(wave * 0.12 + t * 0.05));
    float px = smoothstep(0.42, 0.3, max(abs(f.x), abs(f.y)));
    col += led * px * (0.18 + 0.25 * beat) * (0.5 + 0.5 * sin(wave * 2.0));
  }
  // truss
  col = mix(col, vec3(0.12, 0.12, 0.14), smoothstep(0.012, 0.0, abs(y - 0.95)) + step(0.97, y) * 0.6);
  // strålkastarkäglor
  vec3 haze = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 o = vec2((fi - 2.5) * 0.32, 0.96);
    vec2 d = vec2(x, y) - o;
    float sw = sin(t * (0.6 + fi * 0.13) + fi * 1.7) * 0.6;
    float ang = atan(d.x, -d.y) - sw;
    float cone = smoothstep(0.09, 0.0, abs(ang)) * smoothstep(1.4, 0.0, length(d));
    vec3 c = hue(fract(fi * 0.17 + t * 0.03));
    haze += c * cone * (0.35 + beat * 0.6);
    col += c * smoothstep(0.03, 0.0, length(d)) * 1.5;
  }
  float fog = fbm3(vec2(x * 2.0 + t * 0.1, y * 3.0 - t * 0.05));
  col += haze * (0.5 + fog);
  // laser
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 o = vec2(0.0, 0.3);
    float a = sin(t * 0.9 + fi * 1.6) * 1.2;
    vec2 dir = vec2(sin(a), cos(a));
    vec2 d = vec2(x, y) - o;
    float along = dot(d, dir);
    float dist = abs(d.x * dir.y - d.y * dir.x);
    col += vec3(0.2, 1.0, 0.4) * step(0.0, along) * smoothstep(0.004, 0.0, dist) * (0.6 + beat) * step(0.6, sin(t * 4.0 + fi));
  }
  // publik
  vec2 cq = uv + P(0.7);
  float cx = (cq.x - 0.5) * ASP;
  float n = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float bounce = abs(sin(t * 4.0 + floor(cx * 22.0 + fi * 7.0) * 1.3)) * (0.012 + beat * 0.025);
    float heads = 0.11 + fi * 0.04 + vnoise(vec2(cx * 26.0 + fi * 13.0, fi)) * 0.03 + bounce;
    float arm = step(0.78, vnoise(vec2(cx * 9.0 + fi * 3.0, floor(t * 0.8 + fi)))) * smoothstep(0.012, 0.0, abs(fract(cx * 9.0 + fi * 3.0) - 0.5) * 0.12) * (0.1 + bounce * 2.0);
    if (cq.y < heads + arm) n = 1.0 - fi * 0.25;
  }
  vec3 rim = hue(fract(t * 0.05 + cx * 0.3)) * 0.12;
  col = mix(col, rim * 0.3, step(0.01, n));
  col *= 1.0 - 0.25 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
  {
    id: 'news',
    name: 'Nyhetsstudion',
    icon: '📺',
    desc: 'Blå nyhetsstudio med glödande världskarta, rörliga grafer och rullande nyhetsremsa.',
    tint: '#7ab8ff',
    ambience: 'room',
    glsl: /* glsl */ `
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 q = uv + P(0.25);
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  vec3 col = mix(vec3(0.02, 0.05, 0.14), vec3(0.04, 0.12, 0.3), smoothstep(0.0, 1.0, y));
  col += vec3(0.1, 0.3, 0.7) * exp(-pow(length(vec2(x, y - 0.58)), 2.0) * 4.0) * 0.5;
  // världskarta
  vec2 m = vec2(x * 1.4, (y - 0.6) * 2.2);
  if (abs(m.x) < 1.1 && abs(m.y) < 0.6) {
    vec2 g = m * 3.0 + vec2(t * 0.03, 0.0);
    float land = smoothstep(0.52, 0.56, fbm(g + vec2(3.0, 1.0)));
    vec2 dots = fract(m * 48.0) - 0.5;
    float dt = smoothstep(0.3, 0.18, length(dots));
    float edge = smoothstep(1.1, 0.9, abs(m.x)) * smoothstep(0.6, 0.45, abs(m.y));
    col += vec3(0.2, 0.75, 1.0) * land * dt * 0.55 * edge;
    float lat = smoothstep(0.012, 0.0, abs(fract(m.y * 4.0) - 0.5) - 0.48) + smoothstep(0.012, 0.0, abs(fract(m.x * 4.0) - 0.5) - 0.48);
    col += vec3(0.2, 0.5, 1.0) * lat * 0.06 * edge;
    vec2 ping = vec2(sin(floor(t * 0.5) * 3.7) * 0.6, cos(floor(t * 0.5) * 2.3) * 0.3);
    float pr = length(m - ping);
    col += vec3(1.0, 0.3, 0.35) * (smoothstep(0.03, 0.0, pr) + smoothstep(0.01, 0.0, abs(pr - fract(t * 0.5) * 0.25)) * (1.0 - fract(t * 0.5))) * edge;
  }
  // sidoskärmar med grafer
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    vec2 sc = vec2(s * max(0.5 * ASP * 0.78, 0.3), 0.55);
    vec2 d = vec2(x, y) - sc;
    if (abs(d.x) < 0.17 && abs(d.y) < 0.12) {
      vec3 sCol = vec3(0.03, 0.08, 0.2);
      float gx = d.x / 0.17;
      float graph = sin(gx * 6.0 + t * 1.5 + s) * 0.04 + sin(gx * 13.0 - t) * 0.02 + gx * 0.03 * s;
      sCol += vec3(0.3, 1.0, 0.7) * smoothstep(0.006, 0.0, abs(d.y - graph));
      sCol += vec3(0.2, 0.5, 1.0) * step(d.y, graph) * 0.12;
      float bezel = step(0.165, abs(d.x)) + step(0.115, abs(d.y));
      col = mix(sCol, vec3(0.5, 0.6, 0.8), clamp(bezel, 0.0, 1.0));
    }
  }
  // nyhetsremsa
  float bx = q.x * ASP;
  if (y < 0.085 && y > 0.03) {
    vec3 bar = vec3(0.95, 0.96, 1.0);
    float scroll = bx * 30.0 + t * 6.0;
    float word = step(0.35, hash11(floor(scroll / 4.0))) * step(0.15, fract(scroll / 4.0)) * smoothstep(0.02, 0.0, abs(y - 0.057) - 0.01);
    float glyph = step(0.3, fract(scroll * 1.0)) * word;
    bar = mix(bar, vec3(0.05, 0.08, 0.2), glyph);
    if (bx < 0.22) {
      bar = vec3(0.86, 0.06, 0.12);
      float live = step(0.5, fract(t)) * smoothstep(0.012, 0.006, length(vec2(bx - 0.04, y - 0.057)));
      bar = mix(bar, vec3(1.0), live);
    }
    col = bar;
  }
  col = mix(col, vec3(0.86, 0.06, 0.12), smoothstep(0.003, 0.0, abs(y - 0.088)));
  col *= 1.0 - 0.3 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
  {
    id: 'moon',
    name: 'Månen',
    icon: '🌕',
    desc: 'Grå månyta full av kratrar, svart stjärnhimmel och jorden som snurrar sakta ovanför horisonten.',
    tint: '#d8e4ff',
    ambience: 'space',
    glsl: /* glsl */ `
${STARS}
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 q = uv + P(0.1);
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  vec3 col = vec3(0.0, 0.0, 0.012);
  col += vec3(0.9, 0.95, 1.0) * starField(q + vec2(t * 0.002, 0.0), 70.0, t);
  col += vec3(0.6, 0.7, 1.0) * starField(q * 1.7, 120.0, t) * 0.5;
  // jorden
  vec2 ec = vec2(max(0.5 * ASP * 0.55, 0.18), 0.78);
  vec2 e = vec2(x, y) - ec;
  float r = 0.13;
  float d = length(e);
  if (d < r) {
    vec2 n = e / r;
    float z = sqrt(1.0 - dot(n, n));
    vec2 sp = vec2(atan(n.x, z) + t * 0.05, n.y);
    float land = smoothstep(0.5, 0.55, fbm(sp * 2.5 + 3.0));
    vec3 c = mix(vec3(0.05, 0.2, 0.6), mix(vec3(0.2, 0.5, 0.2), vec3(0.6, 0.5, 0.3), fbm3(sp * 6.0)), land);
    float cloud = smoothstep(0.55, 0.75, fbm(sp * 3.0 + vec2(t * 0.03, 0.0) + 9.0));
    c = mix(c, vec3(1.0), cloud * 0.85);
    float light = clamp(dot(vec3(n, z), normalize(vec3(-0.6, 0.4, 0.7))), 0.0, 1.0);
    col = c * (0.08 + light * 1.1);
  }
  col += vec3(0.35, 0.6, 1.0) * exp(-max(d - r, 0.0) * 40.0) * 0.6 * step(r * 0.85, d);
  // månyta
  vec2 g = uv + P(0.5);
  float gx = (g.x - 0.5) * ASP;
  float hor = 0.3 + 0.025 * sin(gx * 3.0 + 1.0) + 0.015 * sin(gx * 9.0);
  if (g.y < hor) {
    float dd = hor - g.y;
    float zz = 0.1 / (dd + 0.02);
    vec2 w = vec2(gx * zz, zz);
    float base = 0.35 + 0.25 * fbm(w * 2.0);
    vec2 cid = floor(w * 1.6);
    vec2 cf = fract(w * 1.6) - 0.5 - (hash22(cid) - 0.5) * 0.4;
    float cr = 0.18 + hash12(cid) * 0.2;
    float cl = length(cf * vec2(1.0, 1.0));
    float bowl = smoothstep(cr, cr * 0.6, cl) * step(0.4, hash12(cid + 1.3));
    float rim = smoothstep(0.03, 0.0, abs(cl - cr)) * step(0.4, hash12(cid + 1.3));
    float shade = base - bowl * 0.18 + rim * 0.2 + cf.x * bowl * 0.35;
    col = vec3(0.78, 0.78, 0.8) * shade * (0.55 + 0.45 * smoothstep(0.0, 0.25, dd));
    col *= 0.8 + 0.2 * smoothstep(0.0, 0.03, dd);
  }
  col *= 1.0 - 0.25 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
  {
    id: 'beach',
    name: 'Tropisk strand',
    icon: '🏝️',
    desc: 'Solnedgång vid havet: glittrande vågor, rosa moln och palmer som vajar i vinden.',
    tint: '#ffbe85',
    ambience: 'waves',
    glsl: /* glsl */ `
vec3 palm(vec2 p, float t, float side, vec3 col) {
  // stam
  float sw = sin(t * 0.8 + side) * 0.02;
  vec2 prev = vec2(side * 0.06, -0.05);
  for (int i = 1; i < 12; i++) {
    float k = float(i) / 11.0;
    vec2 c = vec2(side * (0.06 + k * 0.12) + sw * k * k, -0.05 + k * 0.62);
    vec2 pa = p - prev;
    vec2 ba = c - prev;
    float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float dseg = length(pa - ba * hh);
    float rr = 0.02 - k * 0.008;
    float ring = 0.85 + 0.15 * step(0.5, fract(hh * 2.0));
    col = mix(col, vec3(0.08, 0.03, 0.08) * ring, smoothstep(rr + 0.003, rr, dseg));
    prev = c;
  }
  vec2 top = vec2(side * 0.18 + sw, 0.57);
  for (int j = 0; j < 7; j++) {
    float a = float(j) / 7.0 * 6.2832 + sin(t * 1.1 + float(j)) * 0.08;
    vec2 dir = vec2(cos(a), sin(a) * 0.55 - 0.15);
    vec2 d = p - top;
    float along = clamp(dot(d, dir), 0.0, 0.26);
    vec2 pt = top + dir * along + vec2(0.0, -along * along * 1.6);
    float wdt = 0.022 * (1.0 - along / 0.26);
    col = mix(col, vec3(0.06, 0.03, 0.07), smoothstep(wdt + 0.004, wdt, length(p - pt)));
  }
  return col;
}
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 q = uv + P(0.12);
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  float hor = 0.42;
  vec3 col = mix(vec3(1.0, 0.62, 0.3), vec3(0.32, 0.14, 0.42), smoothstep(hor, 1.0, y));
  col = mix(col, vec3(1.0, 0.86, 0.45), exp(-(y - hor) * 9.0) * 0.6);
  vec2 sp = vec2(x + 0.25, y - hor - 0.06);
  float sun = length(sp);
  col = mix(col, vec3(1.0, 0.95, 0.75), smoothstep(0.1, 0.095, sun));
  col += vec3(1.0, 0.6, 0.3) * exp(-sun * 5.0) * 0.5;
  float cl = fbm(vec2(x * 1.4 + t * 0.01, y * 6.0));
  col = mix(col, vec3(1.0, 0.55, 0.6), smoothstep(0.55, 0.75, cl) * smoothstep(hor + 0.08, 0.7, y) * 0.7);
  if (y < hor) {
    float d = hor - y;
    float z = 0.08 / (d + 0.01);
    vec3 sea = mix(vec3(0.95, 0.5, 0.35), vec3(0.08, 0.06, 0.25), smoothstep(0.0, 0.12, d));
    float waves = sin(x * z * 30.0 + t * 1.5) * 0.5 + 0.5;
    sea += vec3(0.4, 0.2, 0.3) * waves * 0.08;
    float glit = step(0.93, hash12(floor(vec2(x * 200.0, y * 300.0)) + floor(t * 6.0))) * exp(-abs(x + 0.25) * 6.0);
    sea += vec3(1.0, 0.85, 0.6) * glit * 1.4;
    col = sea;
    float shore = 0.2 + sin(t * 0.6) * 0.015 + sin(x * 6.0 + t) * 0.006;
    if (y < shore) {
      vec3 sand = vec3(0.85, 0.62, 0.45) * (0.85 + 0.15 * vnoise(vec2(x, y) * 120.0));
      sand = mix(sand, sand * 0.75 + vec3(0.2, 0.1, 0.1), smoothstep(shore - 0.03, shore, y));
      col = sand * (0.75 + 0.25 * smoothstep(0.0, 0.2, y));
    }
    col = mix(col, vec3(1.0, 0.95, 0.9), smoothstep(0.006, 0.0, abs(y - shore)) * 0.8);
  }
  vec2 pq = uv + P(0.6);
  float px = (pq.x - 0.5) * ASP;
  float edge = 0.5 * ASP;
  col = palm(vec2(px + edge, pq.y), t, 1.0, col);
  col = palm(vec2(px - edge, pq.y), t, -1.0, col);
  col *= 1.0 - 0.25 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
  {
    id: 'neon',
    name: 'Neonstaden',
    icon: '🌆',
    desc: 'Cyberpunkstad i regn: skyskrapor, blinkande neonskyltar, flygande bilar och blank asfalt.',
    tint: '#00e5ff',
    ambience: 'neonrain',
    glsl: /* glsl */ `
vec3 neonCol(float h) {
  return h < 0.33 ? vec3(1.0, 0.17, 0.84) : h < 0.66 ? vec3(0.0, 0.94, 1.0) : vec3(0.99, 0.93, 0.04);
}
vec3 city(vec2 p, float layer, float t) {
  float w = 0.06 + layer * 0.03;
  float id = floor(p.x / w);
  float hgt = 0.35 + hash11(id * 1.3 + layer * 17.0) * (0.35 + layer * 0.12) - layer * 0.12;
  vec3 c = vec3(0.0);
  if (p.y < hgt) {
    vec3 body = mix(vec3(0.02, 0.02, 0.06), vec3(0.06, 0.05, 0.12), layer * 0.5);
    vec2 wnd = fract(vec2(p.x / w * 6.0, p.y * (60.0 - layer * 14.0)));
    vec2 wid = floor(vec2(p.x / w * 6.0, p.y * (60.0 - layer * 14.0)));
    float lit = step(0.72, hash12(wid + id * 3.0)) * step(0.3, wnd.x) * step(0.35, wnd.y);
    float flick = step(0.02, hash12(wid + floor(t * 0.5)));
    c = body + neonCol(hash12(wid * 0.7 + id)) * lit * flick * (0.18 + layer * 0.12);
    c += vec3(0.0, 0.0, 0.0);
    return vec3(c);
  }
  return vec3(-1.0);
}
vec3 scene(vec2 uv) {
  float t = uTime;
  vec3 col = mix(vec3(0.06, 0.02, 0.12), vec3(0.01, 0.01, 0.04), uv.y);
  col += vec3(0.5, 0.1, 0.45) * exp(-abs(uv.y - 0.35) * 6.0) * 0.25;
  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    vec2 q = uv + P(0.15 + layer * 0.25);
    vec2 p = vec2((q.x - 0.5) * ASP + layer * 3.1, q.y - 0.12 + layer * 0.04);
    vec3 c = city(p, layer, t);
    if (c.x >= 0.0) col = mix(col, c, 1.0);
    col = mix(col, vec3(0.25, 0.08, 0.3), 0.12 * (2.0 - layer) * step(0.0, p.y));
  }
  // neonskyltar på närmaste husen
  vec2 q = uv + P(0.9);
  float x = (q.x - 0.5) * ASP;
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    vec2 c = vec2(s * max(0.5 * ASP * 0.8, 0.25), 0.62 - float(i) * 0.08);
    vec2 d = vec2(x, q.y) - c;
    vec2 size = vec2(0.045, 0.2);
    vec2 ad = abs(d) - size;
    float box = max(ad.x, ad.y);
    float flick = step(0.06, hash11(floor(t * 8.0) + float(i) * 7.0));
    vec3 nc = i == 0 ? vec3(1.0, 0.17, 0.84) : vec3(0.0, 0.94, 1.0);
    col += nc * exp(-max(box, 0.0) * 40.0) * 0.35 * flick * (1.0 + uAudio);
    col = mix(col, nc * 1.4 * flick, smoothstep(0.004, 0.0, abs(box)));
    if (box < 0.0) {
      vec2 gl = floor(vec2(d.x / 0.03, d.y / 0.05));
      float glyph = step(0.5, hash12(gl + float(i) * 9.0)) * step(abs(fract(d.y / 0.05) - 0.5), 0.3) * step(abs(fract(d.x / 0.03) - 0.5), 0.32);
      col = mix(col * 0.3, nc * flick * 1.2, glyph);
    }
  }
  // flygande bilar
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float sp = 0.15 + hash11(fi * 3.7) * 0.2;
    float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    float cx = (fract(t * sp * 0.2 + hash11(fi)) - 0.5) * ASP * 1.6 * dir;
    vec2 d = vec2((uv.x - 0.5) * ASP - cx, uv.y - (0.62 + fi * 0.07));
    float trail = smoothstep(0.004, 0.0, abs(d.y)) * smoothstep(0.0, -0.2 * dir, d.x * dir) * step(d.x * dir, 0.0);
    col += (mod(fi, 2.0) < 0.5 ? vec3(1.0, 0.3, 0.3) : vec3(0.6, 0.9, 1.0)) * (smoothstep(0.008, 0.0, length(d)) * 2.0 + trail * 0.6);
  }
  // våt gata med reflexer
  if (uv.y < 0.14) {
    vec2 r = vec2(uv.x, 0.28 - uv.y);
    r.x += sin(uv.y * 160.0 + t * 3.0) * 0.004;
    vec3 refl = vec3(0.02, 0.02, 0.05);
    float px = (r.x - 0.5) * ASP;
    refl += vec3(1.0, 0.17, 0.84) * exp(-abs(px + max(0.5 * ASP * 0.8, 0.25)) * 8.0) * 0.25;
    refl += vec3(0.0, 0.94, 1.0) * exp(-abs(px - max(0.5 * ASP * 0.8, 0.25)) * 8.0) * 0.25;
    col = refl * (0.6 + 0.4 * smoothstep(0.0, 0.14, uv.y)) + vec3(0.05, 0.04, 0.08);
  }
  // regn
  vec2 rp = vec2(uv.x * ASP * 60.0 + uv.y * 8.0, uv.y * 4.0 + t * 6.0);
  vec2 rid = floor(rp);
  float drop = step(0.92, hash12(vec2(rid.x, 0.0) + floor(rp.y * 0.25))) * smoothstep(0.1, 0.0, abs(fract(rp.x) - 0.5)) * smoothstep(0.0, 0.6, fract(rp.y));
  col += vec3(0.5, 0.7, 1.0) * drop * 0.25;
  col *= 1.0 - 0.3 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
  {
    id: 'castle',
    name: 'Sagoslottet',
    icon: '🏰',
    desc: 'Rosa skymning, ett sagoslott med lysande fönster och fyrverkerier som smäller över tornen.',
    tint: '#ffb3e6',
    ambience: 'pad',
    glsl: /* glsl */ `
${STARS}
${SPARKLE}
float castleSdf(vec2 p) {
  float d = 1.0;
  // tornen: (x, bredd, höjd)
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float x = (fi - 2.0) * 0.16;
    float w = 0.035 + (i == 2 ? 0.025 : 0.0);
    float h = 0.5 + (i == 2 ? 0.17 : 0.0) + (mod(fi, 2.0) > 0.5 ? 0.05 : 0.0);
    vec2 q = p - vec2(x, 0.0);
    float body = max(abs(q.x) - w, q.y - h);
    float roof = max(abs(q.x) * 2.2 + (q.y - h) - w * 2.2 - 0.0, -(q.y - h));
    roof = max(roof, q.y - h - w * 2.6);
    d = min(d, min(body, roof));
  }
  d = min(d, max(abs(p.x) - 0.3, p.y - 0.38));
  return d;
}
vec3 scene(vec2 uv) {
  float t = uTime;
  vec2 q = uv + P(0.12);
  float x = (q.x - 0.5) * ASP;
  float y = q.y;
  vec3 col = mix(vec3(1.0, 0.55, 0.65), vec3(0.18, 0.1, 0.38), smoothstep(0.2, 1.0, y));
  col += vec3(0.9) * starField(q, 60.0, t) * smoothstep(0.5, 0.9, y);
  vec2 mc = vec2(-max(0.5 * ASP * 0.6, 0.2), 0.82);
  col = mix(col, vec3(1.0, 0.97, 0.88), smoothstep(0.075, 0.07, length(vec2(x, y) - mc)));
  col += vec3(1.0, 0.85, 0.9) * exp(-length(vec2(x, y) - mc) * 6.0) * 0.25;
  // fyrverkerier
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float period = 2.6 + fi * 0.7;
    float k = fract(t / period + fi * 0.3);
    float id = floor(t / period + fi * 0.3);
    vec2 c = vec2((hash11(id + fi * 7.0) - 0.5) * ASP * 0.8, 0.68 + hash11(id * 1.7 + fi) * 0.22);
    vec2 d = vec2(x, y) - c;
    float ang = atan(d.y, d.x);
    float ray = pow(abs(sin(ang * 12.0 + id)), 40.0);
    float r = length(d);
    float shell = smoothstep(0.02, 0.0, abs(r - k * 0.2)) * (1.0 - k);
    vec3 fc = 0.5 + 0.5 * cos(6.2832 * (hash11(id + fi) + vec3(0.0, 0.33, 0.67)));
    col += fc * (shell * (0.4 + ray) + exp(-r * 30.0) * (1.0 - k) * 0.4) * 1.5;
  }
  // slottet
  vec2 cq = uv + P(0.45);
  vec2 p = vec2((cq.x - 0.5) * ASP, cq.y - 0.22);
  float d = castleSdf(p);
  vec3 stone = mix(vec3(0.42, 0.25, 0.55), vec3(0.62, 0.42, 0.72), smoothstep(0.0, 0.6, p.y));
  vec2 wg = fract(p * vec2(30.0, 18.0)) - 0.5;
  float win = step(0.75, hash12(floor(p * vec2(30.0, 18.0)))) * smoothstep(0.25, 0.15, max(abs(wg.x), abs(wg.y) * 0.6));
  stone += vec3(1.0, 0.8, 0.4) * win * (0.8 + 0.2 * sin(t * 3.0 + p.x * 40.0));
  col = mix(col, stone, smoothstep(0.003, 0.0, d));
  col += vec3(1.0, 0.7, 0.9) * exp(-max(d, 0.0) * 30.0) * 0.15 * step(0.0, d);
  // kulle
  float hill = 0.22 + 0.04 * cos(x * 3.0);
  col = mix(col, vec3(0.16, 0.08, 0.24) * (0.7 + 0.3 * fbm3(vec2(x, y) * 8.0)), smoothstep(hill + 0.003, hill, y));
  col += vec3(1.0, 0.9, 1.0) * dust(uv + P(0.8), t, 14.0, 0.04) * 0.9;
  col *= 1.0 - 0.25 * pow(length((uv - 0.5) * vec2(1.0, 1.1)), 2.0);
  return col;
}`,
  },
];
