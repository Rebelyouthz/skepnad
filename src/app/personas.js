// Skepnader: färdiga kombinationer av utseende + röst, och egna sparade.
import { voiceParams } from '../audio/voices.js';

export const BUILTIN_PERSONAS = [
  {
    id: 'cozy',
    name: 'Mysig streamer',
    icon: '☕',
    desc: 'Du själv i en varm stuga med sprakande brasa, mjukt filmfilter och stämningsljud.',
    look: { video: { mode: 'camera' }, background: { type: 'scene', scene: 'cabin' }, filter: { id: 'film', intensity: 0.55 }, face: { accessories: [], warp: 'none' }, voice: { preset: 'natural' }, ambience: { enabled: true } },
  },
  {
    id: 'robo',
    name: 'Robotkompis',
    icon: '🤖',
    desc: 'LED-robot i neonstaden med metallisk robotröst.',
    look: { video: { mode: 'avatar' }, avatar: { id: 'robot' }, background: { type: 'scene', scene: 'synthwave' }, filter: { id: 'none' }, face: { accessories: [] }, voice: { preset: 'robot' } },
  },
  {
    id: 'alien',
    name: 'Rymdvarelse',
    icon: '👽',
    desc: 'Utomjording som svävar bland nebulosor med svajig rymdröst.',
    look: { video: { mode: 'avatar' }, avatar: { id: 'alien' }, background: { type: 'scene', scene: 'space' }, filter: { id: 'none' }, face: { accessories: [] }, voice: { preset: 'alien' } },
  },
  {
    id: 'noir',
    name: 'Noir-detektiv',
    icon: '🕵️',
    desc: 'Svartvit deckare vid ett regnigt fönster med filmtrailerröst.',
    look: { video: { mode: 'camera' }, background: { type: 'scene', scene: 'rain' }, filter: { id: 'noir', intensity: 1 }, face: { accessories: ['topHat', 'mustache'], warp: 'none' }, voice: { preset: 'trailer' } },
  },
  {
    id: 'ghost',
    name: 'Spökstund',
    icon: '👻',
    desc: 'Ett litet spöke i den förtrollade skogen med kuslig röst.',
    look: { video: { mode: 'avatar' }, avatar: { id: 'ghost' }, background: { type: 'scene', scene: 'forest' }, filter: { id: 'dream', intensity: 0.6 }, face: { accessories: [] }, voice: { preset: 'ghost' } },
  },
  {
    id: 'royal',
    name: 'Kunglig',
    icon: '👑',
    desc: 'Krona på huvudet under norrskenet – med katedralklang på rösten.',
    look: { video: { mode: 'camera' }, background: { type: 'scene', scene: 'aurora' }, filter: { id: 'none' }, face: { accessories: ['crown'], warp: 'none' }, voice: { preset: 'cathedral' } },
  },
  {
    id: 'vhs',
    name: 'Retro-VHS',
    icon: '📼',
    desc: 'Solglasögon, lo-fi-solnedgång och ett slitet videoband. Radioröst.',
    look: { video: { mode: 'camera' }, background: { type: 'scene', scene: 'sunset' }, filter: { id: 'vhs', intensity: 1 }, face: { accessories: ['sunglasses'], warp: 'none' }, voice: { preset: 'radio' } },
  },
  {
    id: 'midsommar',
    name: 'Midsommar',
    icon: '🌼',
    desc: 'Blomsterkrans, sagoskog och en hel kör i rösten. Glad midsommar!',
    look: { video: { mode: 'camera' }, background: { type: 'scene', scene: 'forest' }, filter: { id: 'dream', intensity: 0.4 }, face: { accessories: ['flowerCrown'], warp: 'none' }, voice: { preset: 'choir' } },
  },
  {
    id: 'hacker',
    name: 'Hackern',
    icon: '💻',
    desc: 'Digitalt regn, cyberpunkfärger och gamer-headset.',
    look: { video: { mode: 'camera' }, background: { type: 'scene', scene: 'matrix' }, filter: { id: 'cyber', intensity: 0.8 }, face: { accessories: ['headset'], warp: 'none' }, voice: { preset: 'megaphone' } },
  },
  {
    id: 'kitty',
    name: 'Kattkompis',
    icon: '🐱',
    desc: 'Gosig katt i den mysiga stugan med ekorrröst.',
    look: { video: { mode: 'avatar' }, avatar: { id: 'cat' }, background: { type: 'scene', scene: 'cabin' }, filter: { id: 'none' }, face: { accessories: [] }, voice: { preset: 'chipmunk' } },
  },
];

/** Ögonblicksbild av nuvarande look för att spara som egen skepnad. */
export function snapshot(state) {
  return {
    video: { mode: state.video.mode },
    avatar: { id: state.avatar.id, colors: state.avatar.colors },
    background: { type: state.background.type, scene: state.background.scene },
    filter: { ...state.filter },
    face: { accessories: [...state.face.accessories], warp: state.face.warp, warpStrength: state.face.warpStrength },
    voice: { preset: state.voice.preset, params: { ...state.voice.params } },
    ambience: { enabled: state.ambience.enabled },
  };
}

/** Applicera en look på store. */
export function applyLook(store, look) {
  for (const section of ['video', 'avatar', 'background', 'filter', 'face', 'ambience']) {
    if (look[section]) store.patch(section, look[section]);
  }
  if (look.voice) {
    const params = look.voice.params ?? voiceParams(look.voice.preset);
    store.patch('voice', { preset: look.voice.preset, params });
  }
}

export function allPersonas(state) {
  return [...BUILTIN_PERSONAS, ...(state.personas.custom || [])];
}
