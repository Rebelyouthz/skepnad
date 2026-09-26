// Ansiktsförvrängning: förvandlar landmärken till bulge/pinch-punkter i
// videokoordinater (y ner). Radie i enheter av videohöjd.
import { MAX_WARPS } from './person.js';

export const WARPS = [
  { id: 'none', name: 'Ingen', icon: '🙂', desc: 'Ansiktet som det är.' },
  { id: 'bigEyes', name: 'Animéögon', icon: '👀', desc: 'Stora, glittrande tecknade ögon.' },
  { id: 'bigHead', name: 'Bubbelhuvud', icon: '🎈', desc: 'Pumpa upp huvudet som en ballong.' },
  { id: 'tinyFace', name: 'Pyttehuvud', icon: '🤏', desc: 'Krymp ansiktet – ser hysteriskt ut.' },
  { id: 'alien', name: 'Utomjording', icon: '👽', desc: 'Stor panna, jätteögon och liten haka.' },
  { id: 'bigMouth', name: 'Jättemun', icon: '👄', desc: 'En mun som kan svälja världen.' },
  { id: 'bigNose', name: 'Potatisnäsa', icon: '👃', desc: 'Förstorad näsa i clownstil.' },
  { id: 'hamster', name: 'Hamsterkinder', icon: '🐹', desc: 'Runda, fyllda kinder.' },
  { id: 'slim', name: 'Smalt ansikte', icon: '💎', desc: 'Smalare kinder och käke.' },
];

const P = {
  irisR: 468,
  irisL: 473,
  bridge: 168,
  forehead: 10,
  chin: 152,
  noseTip: 1,
  mouthTop: 13,
  mouthBot: 14,
  cheekR: 50,
  cheekL: 280,
  jawR: 172,
  jawL: 397,
  faceMid: 6,
};

/** Returnerar lista av [x, y, radie, styrka]. */
export function computeWarps(id, strength, face) {
  if (!face?.present || id === 'none') return [];
  const lm = face.lm;
  const g = (i) => [lm[i * 3], lm[i * 3 + 1]];
  const u = face.unitPx / face.videoH; // interokulärt avstånd i höjdenheter
  const s = strength;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const out = [];
  const add = (p, r, k) => out.length < MAX_WARPS && out.push([p[0], p[1], r * u, k * s]);
  switch (id) {
    case 'bigEyes':
      add(g(P.irisR), 0.52, 0.72);
      add(g(P.irisL), 0.52, 0.72);
      break;
    case 'bigHead':
      add(mid(g(P.bridge), g(P.forehead)), 1.7, 0.55);
      break;
    case 'tinyFace':
      add(g(P.faceMid), 1.55, -0.62);
      break;
    case 'alien': {
      add(g(P.irisR), 0.55, 0.75);
      add(g(P.irisL), 0.55, 0.75);
      const f = g(P.forehead);
      const b = g(P.bridge);
      add([f[0] + (f[0] - b[0]) * 0.4, f[1] + (f[1] - b[1]) * 0.4], 1.15, 0.5);
      add(g(P.chin), 0.85, -0.65);
      break;
    }
    case 'bigMouth':
      add(mid(g(P.mouthTop), g(P.mouthBot)), 0.8, 0.75);
      break;
    case 'bigNose':
      add(g(P.noseTip), 0.58, 0.8);
      break;
    case 'hamster':
      add(g(P.cheekR), 0.72, 0.62);
      add(g(P.cheekL), 0.72, 0.62);
      break;
    case 'slim':
      add(g(P.cheekR), 0.9, -0.42);
      add(g(P.cheekL), 0.9, -0.42);
      add(g(P.jawR), 0.7, -0.38);
      add(g(P.jawL), 0.7, -0.38);
      break;
    default:
      break;
  }
  return out;
}
