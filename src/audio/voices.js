// Röstpresets. Varje preset är parametervärden ovanpå VOICE_PARAM_DEFAULTS.
import { VOICE_PARAM_DEFAULTS } from '../app/defaults.js';

export const VOICES = [
  { id: 'natural', group: 'basic', name: 'Naturlig', icon: '🎙️', desc: 'Din egen röst – tydlig, lätt komprimerad och brusfri.', p: {} },
  { id: 'girl', group: 'basic', name: 'Tjej', icon: '👩', desc: 'Låter som en tjej: ljusare ton och kortare röströr – utan ekorreklang.', p: { pitch: 5, formant: 3, tone: 0.15, lowcut: 110 } },
  { id: 'guy', group: 'basic', name: 'Kille', icon: '👨', desc: 'Låter som en kille: mörkare ton och längre röströr.', p: { pitch: -5, formant: -3, tone: -0.1 } },
  { id: 'robot', group: 'creatures', name: 'Robot', icon: '🤖', desc: 'Metallisk ringmodulering som en klassisk sci-fi-robot.', p: { robot: 0.85, ringFreq: 48, chorus: 0.2, tone: 0.2, echo: 0.1, echoTime: 0.05, echoFeedback: 0.55 } },
  { id: 'chipmunk', group: 'basic', name: 'Ekorre', icon: '🐿️', desc: 'Pip pip! Tonhöjden uppskruvad nio halvtoner.', p: { pitch: 9, tone: 0.3 } },
  { id: 'helium', group: 'basic', name: 'Helium', icon: '🎈', desc: 'Som att ha andats in en hel heliumballong.', p: { pitch: 12, tone: 0.5, highcut: 12000 } },
  { id: 'baby', group: 'basic', name: 'Bebis', icon: '👶', desc: 'Liten, gullig och lite darrig.', p: { pitch: 7, tone: 0.4, tremolo: 0.15, tremoloRate: 9 } },
  { id: 'giant', group: 'basic', name: 'Jätte', icon: '🗿', desc: 'Djup, mullrande jättestämma som ekar.', p: { pitch: -7, tone: -0.5, reverb: 0.15, reverbSize: 0.6 } },
  { id: 'trailer', group: 'famous', name: 'Filmtrailer', icon: '🎬', desc: '"I en värld där…" – mörk, pampig berättarröst.', p: { pitch: -4, tone: -0.6, reverb: 0.22, reverbSize: 0.55, distortion: 0.05 } },
  { id: 'demon', group: 'creatures', name: 'Demon', icon: '😈', desc: 'Förvrängd demonröst med ett extra lager en oktav ner.', p: { pitch: -5, harmony: [-12], harmonyMix: 0.8, distortion: 0.35, reverb: 0.3, reverbSize: 0.7, tone: -0.4 } },
  { id: 'alien', group: 'creatures', name: 'Utomjording', icon: '👽', desc: 'Svajig främmande röst med ringmodulering och rymdeko.', p: { pitch: 4, robot: 0.35, ringFreq: 9, chorus: 0.6, wobble: 0.3, echo: 0.25, echoTime: 0.18 } },
  { id: 'ghost', group: 'creatures', name: 'Spöke', icon: '👻', desc: 'Svävande spökröst i ett ekande slott.', p: { pitch: -2, harmony: [12], harmonyMix: 0.25, tremolo: 0.45, tremoloRate: 6, reverb: 0.55, reverbSize: 0.9, chorus: 0.4 } },
  { id: 'radio', group: 'places', name: 'Radio', icon: '📻', desc: 'Gammal AM-radio med brus och smalt frekvensband.', p: { radio: 1, distortion: 0.4, noise: 0.15 } },
  { id: 'phone', group: 'places', name: 'Telefon', icon: '☎️', desc: 'Som ett samtal från 90-talet.', p: { radio: 0.8, distortion: 0.2 } },
  { id: 'walkie', group: 'places', name: 'Walkie-talkie', icon: '📡', desc: 'Kom in, över! Brusklick när du börjar och slutar prata.', p: { radio: 0.95, distortion: 0.5, noise: 0.1, squelch: true } },
  { id: 'megaphone', group: 'places', name: 'Megafon', icon: '📢', desc: 'Skarp och överstyrd – perfekt för utrop.', p: { radio: 0.65, distortion: 0.7, tone: 0.5, echo: 0.12, echoTime: 0.09 } },
  { id: 'cave', group: 'places', name: 'Grotta', icon: '🕳️', desc: 'Djup grotta med långa studsande ekon.', p: { echo: 0.35, echoTime: 0.33, echoFeedback: 0.45, reverb: 0.45, reverbSize: 0.8 } },
  { id: 'cathedral', group: 'places', name: 'Katedral', icon: '⛪', desc: 'Enorm stenkyrka med sekunderlång efterklang.', p: { reverb: 0.65, reverbSize: 1.0, tone: 0.1 } },
  { id: 'underwater', group: 'places', name: 'Undervatten', icon: '🌊', desc: 'Bubblande, dov röst under ytan.', p: { highcut: 900, wobble: 1, chorus: 0.8, pitch: -1, reverb: 0.2, reverbSize: 0.4 } },
  { id: 'old', group: 'basic', name: 'Gamling', icon: '👴', desc: 'Darrig röst med vibrato och tunn klang.', p: { pitch: -1, tremolo: 0.35, tremoloRate: 7, chorus: 0.35, wobble: 0.2, radio: 0.25 } },
  { id: 'autotune', group: 'music', name: 'Autotune', icon: '🎤', desc: 'Hård tonhöjdskorrigering à la T-Pain. Sjung något!', p: { autotune: true, autotuneSpeed: 1, reverb: 0.15, reverbSize: 0.4 } },
  { id: 'choir', group: 'music', name: 'Kör', icon: '🎶', desc: 'Du blir en hel kör – durackord runt din röst.', p: { harmony: [4, 7, 12], harmonyMix: 0.6, reverb: 0.35, reverbSize: 0.7, chorus: 0.3 } },
  { id: 'vocoder', group: 'music', name: 'Vocoder', icon: '🎹', desc: 'Syntrobot som sjunger ett ackord – Daft Punk-vibbar.', p: { vocoder: 1, reverb: 0.2, reverbSize: 0.5 } },
  // Figurer
  { id: 'duck', group: 'creatures', name: 'Anka', icon: '🦆', desc: 'Kvackig, raspig och nasal – som en tecknad anka. Prata snabbt!', p: { pitch: 4, radio: 0.78, robot: 0.5, ringFreq: 31, distortion: 0.32, tone: 0.45, tremolo: 0.22, tremoloRate: 13 } },
  { id: 'mouse', group: 'creatures', name: 'Mus', icon: '🐭', desc: 'Pytteliten pipig musröst.', p: { pitch: 10, tone: 0.45, radio: 0.2 } },
  { id: 'troll', group: 'creatures', name: 'Troll', icon: '👹', desc: 'Grov och mullrande trollröst från under bron.', p: { pitch: -8, harmony: [-12], harmonyMix: 0.5, distortion: 0.45, tone: -0.6, reverb: 0.18, reverbSize: 0.5 } },
  { id: 'dragon', group: 'creatures', name: 'Drake', icon: '🐉', desc: 'Väldig drakröst som ekar i grottan.', p: { pitch: -6, harmony: [-12, -5], harmonyMix: 0.55, distortion: 0.4, tone: -0.4, reverb: 0.4, reverbSize: 0.85, echo: 0.1, echoTime: 0.3 } },
  { id: 'trex', group: 'creatures', name: 'T-rex', icon: '🦖', desc: 'Jurassiskt rytande – djupt, grusigt och farligt.', p: { pitch: -10, harmony: [-12], harmonyMix: 0.7, distortion: 0.6, tone: -0.7, reverb: 0.3, reverbSize: 0.7 } },
  { id: 'gremlin', group: 'creatures', name: 'Gremlin', icon: '👺', desc: 'Busig, gnällig och lite elak.', p: { pitch: 6, distortion: 0.4, robot: 0.3, ringFreq: 40, tone: 0.4 } },
  { id: 'zombie', group: 'creatures', name: 'Zombie', icon: '🧟', desc: 'Stönande, darrig och grusig. Hjäääärnor…', p: { pitch: -4, distortion: 0.45, tremolo: 0.35, tremoloRate: 4, radio: 0.2, tone: -0.3, reverb: 0.15 } },
  { id: 'vampire', group: 'creatures', name: 'Vampyr', icon: '🧛', desc: 'Mörk greveröst i ett ekande slott.', p: { pitch: -3, reverb: 0.5, reverbSize: 0.9, echo: 0.15, echoTime: 0.25, chorus: 0.2, tone: -0.2 } },
  { id: 'witch', group: 'creatures', name: 'Häxa', icon: '🧙‍♀️', desc: 'Kväkig häxröst med darr. Hihihi!', p: { pitch: 4, tremolo: 0.3, tremoloRate: 7, chorus: 0.4, tone: 0.3, reverb: 0.2, radio: 0.15 } },
  // Kändisar & roller
  { id: 'speech', group: 'famous', name: 'Presidenttal', icon: '🏛️', desc: 'Tal till nationen från ett podium – stor sal med eko.', p: { pitch: -1, reverb: 0.35, reverbSize: 0.85, echo: 0.12, echoTime: 0.32, echoFeedback: 0.3, tone: 0.1, distortion: 0.05 } },
  { id: 'royal', group: 'famous', name: 'Kunglig', icon: '👑', desc: 'Majestätisk, djup röst som fyller en tronsal.', p: { pitch: -2, reverb: 0.45, reverbSize: 0.9, tone: -0.1, chorus: 0.1 } },
  { id: 'anchor', group: 'famous', name: 'Nyhetsröst', icon: '📺', desc: 'Klar, kompakt sändarröst. "God kväll och välkomna."', p: { tone: 0.2, reverb: 0.05, radio: 0.1 } },
  { id: 'arena', group: 'famous', name: 'Arenaspeaker', icon: '🏟️', desc: 'Laaadies and gentlemen! Studsande eko i en jättearena.', p: { pitch: -2, echo: 0.3, echoTime: 0.25, echoFeedback: 0.45, reverb: 0.4, reverbSize: 0.9, distortion: 0.1 } },
  { id: 'rock', group: 'famous', name: 'Rockkonsert', icon: '🎸', desc: 'Rå röst genom en stadion-PA.', p: { distortion: 0.25, reverb: 0.35, reverbSize: 0.8, echo: 0.2, echoTime: 0.2, tone: 0.2 } },
  { id: 'pop', group: 'famous', name: 'Popstjärna', icon: '🎤', desc: 'Mjuk autotune, glans och lite kör.', p: { autotune: true, autotuneSpeed: 0.7, chorus: 0.2, reverb: 0.25, reverbSize: 0.5, harmony: [12], harmonyMix: 0.2 } },
  { id: 'hero', group: 'famous', name: 'Superhjälte', icon: '🦸', desc: 'Djup hjälteröst med episkt eko.', p: { pitch: -3, reverb: 0.25, reverbSize: 0.7, echo: 0.15, echoTime: 0.4, tone: -0.2 } },
  { id: 'captain', group: 'famous', name: 'Flygkaptenen', icon: '👨‍✈️', desc: 'Högtalarutrop från cockpit. "Välkomna ombord!"', p: { radio: 0.7, distortion: 0.15, reverb: 0.12, reverbSize: 0.2, noise: 0.04 } },
  { id: 'pirate', group: 'famous', name: 'Pirat', icon: '🏴‍☠️', desc: 'Grov sjörövarröst. Arrr, landkrabbor!', p: { pitch: -2, distortion: 0.25, tone: -0.3, wobble: 0.1 } },
  { id: 'astronaut', group: 'famous', name: 'Astronaut', icon: '🧑‍🚀', desc: 'Radio från rymdstationen med brusklick. Houston?', p: { radio: 0.9, noise: 0.08, squelch: true, reverb: 0.05 } },
  { id: 'santa', group: 'famous', name: 'Tomten', icon: '🎅', desc: 'Varm, djup och skrattig. Ho ho ho!', p: { pitch: -3, chorus: 0.15, reverb: 0.2, reverbSize: 0.5, tone: -0.2 } },
];
export const VOICE_GROUPS = [
  { id: 'basic', name: 'Grundröster', icon: '🎙️' },
  { id: 'creatures', name: 'Djur & monster', icon: '🐉' },
  { id: 'famous', name: 'Kändisar & roller', icon: '⭐' },
  { id: 'places', name: 'Platser & apparater', icon: '📻' },
  { id: 'music', name: 'Musik', icon: '🎶' },
];
export const VOICE_MAP = Object.fromEntries(VOICES.map((v) => [v.id, v]));

export function voiceParams(id) {
  return { ...VOICE_PARAM_DEFAULTS, ...(VOICE_MAP[id]?.p ?? {}) };
}

export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
