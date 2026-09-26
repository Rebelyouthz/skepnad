// Röstpresets. Varje preset är parametervärden ovanpå VOICE_PARAM_DEFAULTS.
import { VOICE_PARAM_DEFAULTS } from '../app/defaults.js';

export const VOICES = [
  { id: 'natural', name: 'Naturlig', icon: '🎙️', desc: 'Din egen röst – tydlig, lätt komprimerad och brusfri.', p: {} },
  { id: 'robot', name: 'Robot', icon: '🤖', desc: 'Metallisk ringmodulering som en klassisk sci-fi-robot.', p: { robot: 0.85, ringFreq: 48, chorus: 0.2, tone: 0.2, echo: 0.1, echoTime: 0.05, echoFeedback: 0.55 } },
  { id: 'chipmunk', name: 'Ekorre', icon: '🐿️', desc: 'Pip pip! Tonhöjden uppskruvad nio halvtoner.', p: { pitch: 9, tone: 0.3 } },
  { id: 'helium', name: 'Helium', icon: '🎈', desc: 'Som att ha andats in en hel heliumballong.', p: { pitch: 12, tone: 0.5, highcut: 12000 } },
  { id: 'baby', name: 'Bebis', icon: '👶', desc: 'Liten, gullig och lite darrig.', p: { pitch: 7, tone: 0.4, tremolo: 0.15, tremoloRate: 9 } },
  { id: 'giant', name: 'Jätte', icon: '🗿', desc: 'Djup, mullrande jättestämma som ekar.', p: { pitch: -7, tone: -0.5, reverb: 0.15, reverbSize: 0.6 } },
  { id: 'trailer', name: 'Filmtrailer', icon: '🎬', desc: '"I en värld där…" – mörk, pampig berättarröst.', p: { pitch: -4, tone: -0.6, reverb: 0.22, reverbSize: 0.55, distortion: 0.05 } },
  { id: 'demon', name: 'Demon', icon: '😈', desc: 'Förvrängd demonröst med ett extra lager en oktav ner.', p: { pitch: -5, harmony: [-12], harmonyMix: 0.8, distortion: 0.35, reverb: 0.3, reverbSize: 0.7, tone: -0.4 } },
  { id: 'alien', name: 'Utomjording', icon: '👽', desc: 'Svajig främmande röst med ringmodulering och rymdeko.', p: { pitch: 4, robot: 0.35, ringFreq: 9, chorus: 0.6, wobble: 0.3, echo: 0.25, echoTime: 0.18 } },
  { id: 'ghost', name: 'Spöke', icon: '👻', desc: 'Svävande spökröst i ett ekande slott.', p: { pitch: -2, harmony: [12], harmonyMix: 0.25, tremolo: 0.45, tremoloRate: 6, reverb: 0.55, reverbSize: 0.9, chorus: 0.4 } },
  { id: 'radio', name: 'Radio', icon: '📻', desc: 'Gammal AM-radio med brus och smalt frekvensband.', p: { radio: 1, distortion: 0.4, noise: 0.15 } },
  { id: 'phone', name: 'Telefon', icon: '☎️', desc: 'Som ett samtal från 90-talet.', p: { radio: 0.8, distortion: 0.2 } },
  { id: 'walkie', name: 'Walkie-talkie', icon: '📡', desc: 'Kom in, över! Brusklick när du börjar och slutar prata.', p: { radio: 0.95, distortion: 0.5, noise: 0.1, squelch: true } },
  { id: 'megaphone', name: 'Megafon', icon: '📢', desc: 'Skarp och överstyrd – perfekt för utrop.', p: { radio: 0.65, distortion: 0.7, tone: 0.5, echo: 0.12, echoTime: 0.09 } },
  { id: 'cave', name: 'Grotta', icon: '🕳️', desc: 'Djup grotta med långa studsande ekon.', p: { echo: 0.35, echoTime: 0.33, echoFeedback: 0.45, reverb: 0.45, reverbSize: 0.8 } },
  { id: 'cathedral', name: 'Katedral', icon: '⛪', desc: 'Enorm stenkyrka med sekunderlång efterklang.', p: { reverb: 0.65, reverbSize: 1.0, tone: 0.1 } },
  { id: 'underwater', name: 'Undervatten', icon: '🌊', desc: 'Bubblande, dov röst under ytan.', p: { highcut: 900, wobble: 1, chorus: 0.8, pitch: -1, reverb: 0.2, reverbSize: 0.4 } },
  { id: 'old', name: 'Gamling', icon: '👴', desc: 'Darrig röst med vibrato och tunn klang.', p: { pitch: -1, tremolo: 0.35, tremoloRate: 7, chorus: 0.35, wobble: 0.2, radio: 0.25 } },
  { id: 'autotune', name: 'Autotune', icon: '🎤', desc: 'Hård tonhöjdskorrigering à la T-Pain. Sjung något!', p: { autotune: true, autotuneSpeed: 1, reverb: 0.15, reverbSize: 0.4 } },
  { id: 'choir', name: 'Kör', icon: '🎶', desc: 'Du blir en hel kör – durackord runt din röst.', p: { harmony: [4, 7, 12], harmonyMix: 0.6, reverb: 0.35, reverbSize: 0.7, chorus: 0.3 } },
  { id: 'vocoder', name: 'Vocoder', icon: '🎹', desc: 'Syntrobot som sjunger ett ackord – Daft Punk-vibbar.', p: { vocoder: 1, reverb: 0.2, reverbSize: 0.5 } },
];
export const VOICE_MAP = Object.fromEntries(VOICES.map((v) => [v.id, v]));

export function voiceParams(id) {
  return { ...VOICE_PARAM_DEFAULTS, ...(VOICE_MAP[id]?.p ?? {}) };
}

export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
