// Skepnader: färdiga kombinationer av utseende + plats + röst, och egna sparade.
// Två sorter: avatar (en 3D-figur) och kamera (du själv med tillbehör).
// Kändisar/kungligheter är påhittade arketyper – inga verkliga personer.
import { voiceParams } from '../audio/voices.js';

export const PERSONA_GROUPS = [
  { id: 'cartoon', name: 'Tecknat', icon: '🦆' },
  { id: 'famous', name: 'Kändisar & kungligheter', icon: '⭐' },
  { id: 'people', name: 'Äventyr & yrken', icon: '🧭' },
  { id: 'you', name: 'Du själv som…', icon: '🪞' },
  { id: 'spooky', name: 'Läskiga & galna', icon: '👻' },
  { id: 'vibes', name: 'Stämningar', icon: '✨' },
];

/** Avatarskepnad: en 3D-figur på en plats med en röst. */
const av = (group, id, name, icon, desc, avatar, scene, voice, extra = {}) => ({
  id,
  group,
  name,
  icon,
  desc,
  look: {
    video: { mode: 'avatar' },
    avatar: { id: avatar },
    background: { type: 'scene', scene },
    filter: { id: extra.filter ?? 'none', intensity: extra.intensity ?? 1 },
    face: { accessories: extra.acc ?? [], warp: 'none' },
    voice: { preset: voice },
    ...(extra.lowerThird ? { overlays: { lowerThird: { enabled: true, style: 'news', byPersona: true, ...extra.lowerThird } } } : {}),
  },
});

/** Kameraskepnad: du själv med tillbehör, förvrängning och filter. */
const cam = (group, id, name, icon, desc, acc, scene, voice, extra = {}) => ({
  id,
  group,
  name,
  icon,
  desc,
  look: {
    video: { mode: 'camera' },
    background: { type: extra.bgType ?? 'scene', scene },
    filter: { id: extra.filter ?? 'none', intensity: extra.intensity ?? 1 },
    face: { accessories: acc, warp: extra.warp ?? 'none' },
    voice: { preset: voice },
    ...(extra.ambience !== undefined ? { ambience: { enabled: extra.ambience } } : {}),
    ...(extra.lowerThird ? { overlays: { lowerThird: { enabled: true, style: 'news', byPersona: true, ...extra.lowerThird } } } : {}),
  },
});

export const BUILTIN_PERSONAS = [
  // ---------------------------------------------------------------- Tecknat
  av('cartoon', 'kvacke', 'Kvacke Anka', '🦆', 'Tecknad anka med sjömansmössa på stranden – med raspig ankröst. Kvack!', 'duck', 'beach', 'duck', { acc: ['sailorCap'] }),
  av('cartoon', 'kyckis', 'Kyckis', '🐥', 'Fluffig kyckling vid sagoslottet med pipig musröst.', 'chick', 'castle', 'mouse'),
  av('cartoon', 'vovve', 'Vovve', '🐶', 'Glad hund i den mysiga stugan. Voff!', 'dog', 'cabin', 'chipmunk'),
  av('cartoon', 'ravis', 'Rävis', '🦊', 'Listig räv i sagoskogen med busig gremlinröst.', 'fox', 'forest', 'gremlin'),
  av('cartoon', 'knorre', 'Knorre Gris', '🐷', 'Rosa gris med bebisröst. Nöff nöff!', 'pig', 'sunset', 'baby'),
  av('cartoon', 'kvakis', 'Kväkis', '🐸', 'Groda under havsytan med bubblig undervattensröst.', 'frog', 'ocean', 'underwater'),
  av('cartoon', 'bambu', 'Bambu Panda', '🐼', 'Gosig panda i skogen med bambukvist.', 'panda', 'forest', 'baby'),
  av('cartoon', 'leo', 'Lejonkungen Leo', '🦁', 'Lejon i tronsalen med majestätisk kungaröst.', 'lion', 'throne', 'royal', { acc: ['crown'] }),
  av('cartoon', 'ostis', 'Ostis Mus', '🐭', 'Liten mus med ostbit och pipröst.', 'mouse', 'cabin', 'mouse'),
  av('cartoon', 'abbe', 'Apan Abbe', '🐵', 'Busig apa på tropiska stranden.', 'monkey', 'beach', 'chipmunk'),
  av('cartoon', 'pingis', 'Pingis', '🐧', 'Pingvin under norrskenet med heliumröst.', 'penguin', 'aurora', 'helium'),
  av('cartoon', 'glitter', 'Glitter Enhörning', '🦄', 'Pastellenhörning vid sagoslottet som sjunger med popröst.', 'unicorn', 'castle', 'pop'),
  av('cartoon', 'draken', 'Draken Glöd', '🐲', 'Liten drake i tronsalen – gapa stort så sprutar den eld!', 'dragon', 'throne', 'dragon'),
  av('cartoon', 'tuffe', 'T-rex Tuffe', '🦖', 'Dinosaurie i urskogen som ryter på riktigt.', 'dino', 'forest', 'trex'),
  av('cartoon', 'bajsis', 'Bajsis', '💩', 'En bajskorv med filmtrailerröst. "I en värld där…"', 'poop', 'redcarpet', 'trailer'),
  av('cartoon', 'snoris', 'Snöris', '⛄', 'Snögubbe i stugan med tomteröst.', 'snowman', 'cabin', 'santa'),
  av('cartoon', 'robo', 'Robotkompis', '🤖', 'LED-robot i neonstaden med metallisk robotröst.', 'robot', 'neon', 'robot'),
  av('cartoon', 'alien', 'Rymdvarelse', '👽', 'Utomjording som svävar bland nebulosor med svajig rymdröst.', 'alien', 'space', 'alien'),
  av('cartoon', 'kitty', 'Kattkompis', '🐱', 'Gosig katt i den mysiga stugan med ekorrröst.', 'cat', 'cabin', 'chipmunk'),
  av('cartoon', 'nalle', 'Nalle', '🐻', 'Björn i skogen med djup jätteröst.', 'bear', 'forest', 'giant'),
  // ---------------------------------------------------------------- Kändisar & kungligheter
  av('famous', 'kungen', 'Kungen', '🤴', 'Kunglig majestät i tronsalen. "Vi tackar för förtroendet."', 'king', 'throne', 'royal', { lowerThird: { name: 'H.M. Kungen', title: 'Tal från tronen' } }),
  av('famous', 'drottningen', 'Drottningen', '👑', 'Elegant drottning i tronsalen med kunglig klang.', 'queen', 'throne', 'royal'),
  av('famous', 'prinsessan', 'Prinsessan', '👸', 'Sagoprinsessa vid slottet med fyrverkerier – och sångröst.', 'princess', 'castle', 'pop'),
  av('famous', 'presidenten', 'Presidenten', '🏛️', 'Talar till nationen från podiet – flaggor, emblem och pressblixtar.', 'president', 'podium', 'speech', { lowerThird: { name: 'Presidenten', title: 'Talar till nationen' } }),
  av('famous', 'rockstjarnan', 'Rockstjärnan', '🎸', 'Läderjacka och solglasögon på arenascenen. Rock\'n\'roll!', 'rockstar', 'concert', 'rock'),
  av('famous', 'popstjarnan', 'Popstjärnan', '🎤', 'Glittrig popstjärna på konsertscenen med autotune.', 'popstar', 'concert', 'pop'),
  av('famous', 'filmstjarnan', 'Filmstjärnan', '🎬', 'Smoking på röda mattan med paparazziblixtar och trailerröst.', 'moviestar', 'redcarpet', 'trailer'),
  av('famous', 'djneon', 'DJ Neon', '🎧', 'DJ i neonstaden med arenaeko.', 'dj', 'neon', 'arena'),
  av('famous', 'nyheter', 'Nyhetsankaret', '📺', 'Nyhetsstudion med världskarta och rullande remsa.', 'anchor', 'news', 'anchor', { lowerThird: { name: 'Kvällsnytt', title: 'Senaste nytt – direkt' } }),
  // ---------------------------------------------------------------- Äventyr & yrken
  av('people', 'astronauten', 'Astronauten', '🧑‍🚀', 'Rymdfarare på månen med radioröst. "Houston?"', 'astronaut', 'moon', 'astronaut'),
  av('people', 'piraten', 'Piraten', '🏴‍☠️', 'Piratkapten på stranden. Arrr, landkrabbor!', 'pirate', 'beach', 'pirate'),
  av('people', 'trollkarlen', 'Trollkarlen', '🧙', 'Uråldrig trollkarl vid sagoslottet med ekande röst.', 'wizard', 'castle', 'cathedral'),
  av('people', 'hjalten', 'Superhjälten', '🦸', 'Hjälte i neonstaden med episk hjälteröst.', 'hero', 'neon', 'hero'),
  av('people', 'vikingen', 'Vikingen', '⚔️', 'Viking under norrskenet med mullrande jätteröst.', 'viking', 'aurora', 'giant'),
  av('people', 'kocken', 'Mästerkocken', '👨‍🍳', 'Kock i den mysiga stugan. Smaklig måltid!', 'chef', 'cabin', 'natural'),
  av('people', 'cowboyen', 'Cowboyen', '🤠', 'Sheriff i solnedgången med trailerröst.', 'cowboy', 'sunset', 'trailer'),
  av('people', 'piloten', 'Piloten', '👨‍✈️', 'Flygkapten med högtalarröst. "Välkomna ombord!"', 'pilot', 'sunset', 'captain'),
  av('people', 'ninjan', 'Ninjan', '🥷', 'Ninja i neonregnet med grottekoröst.', 'ninja', 'neon', 'cave'),
  av('people', 'tomten', 'Tomten', '🎅', 'God jul! Tomten i stugan med brasan.', 'santa', 'cabin', 'santa'),
  // ---------------------------------------------------------------- Du själv som…
  cam('you', 'royal', 'Du som kung', '👑', 'Krona och skägg på DIG – i tronsalen med kunglig klang.', ['crown', 'beardWhite'], 'throne', 'royal'),
  cam('you', 'du-drottning', 'Du som drottning', '👸', 'Tiara på dig i tronsalen.', ['tiara'], 'throne', 'royal'),
  cam('you', 'du-president', 'Du som president', '🏛️', 'Du talar till nationen – podium, flaggor och namnskylt.', [], 'podium', 'speech', { lowerThird: { name: 'Presidenten', title: 'Talar till nationen' } }),
  cam('you', 'du-kandis', 'Du på röda mattan', '📸', 'Solglasögon, paparazzi och arenaröst – du är stjärnan.', ['sunglasses'], 'redcarpet', 'arena'),
  cam('you', 'du-rock', 'Du som rockstjärna', '🎸', 'Konsertscen, publikhav och rockröst.', ['sunglasses'], 'concert', 'rock'),
  cam('you', 'du-pirat', 'Du som pirat', '🏴‍☠️', 'Pirathatt, ögonlapp och skägg på dig.', ['pirateHat', 'eyePatch', 'beard'], 'beach', 'pirate'),
  cam('you', 'du-trollkarl', 'Du som trollkarl', '🧙', 'Stjärnhatt och långt vitt skägg vid sagoslottet.', ['wizardHat', 'beardWhite'], 'castle', 'cathedral'),
  cam('you', 'du-astronaut', 'Du på månen', '🧑‍🚀', 'Rymdhjälm på, jorden i bakgrunden och radioröst.', ['spaceHelmet'], 'moon', 'astronaut'),
  cam('you', 'du-hjalte', 'Du som superhjälte', '🦸', 'Hjältemask i neonstaden.', ['heroMask'], 'neon', 'hero'),
  cam('you', 'du-cowboy', 'Du som cowboy', '🤠', 'Cowboyhatt i solnedgången.', ['cowboyHat'], 'sunset', 'trailer'),
  cam('you', 'du-kock', 'Du som mästerkock', '👨‍🍳', 'Kockmössa och mustasch i stugan.', ['chefHat', 'mustache'], 'cabin', 'natural'),
  cam('you', 'du-pilot', 'Du som pilot', '👨‍✈️', 'Kaptensmössa, pilotglasögon och högtalarröst.', ['pilotCap', 'sunglasses'], 'sunset', 'captain'),
  cam('you', 'du-ninja', 'Du som ninja', '🥷', 'Ninjamask i neonregnet.', ['ninjaMask'], 'neon', 'cave'),
  cam('you', 'du-viking', 'Du som viking', '⚔️', 'Hornhjälm och helskägg under norrskenet.', ['viking', 'beard'], 'aurora', 'giant'),
  cam('you', 'du-tomte', 'Du som tomte', '🎅', 'Tomteluva och tomteskägg vid brasan.', ['tomte', 'beardWhite'], 'cabin', 'santa'),
  cam('you', 'du-nyheter', 'Du läser nyheterna', '📺', 'Nyhetsstudion med namnskylt och rullande remsa.', [], 'news', 'anchor', { lowerThird: { name: 'Ditt namn', title: 'Nyhetsuppläsare' } }),
  // ---------------------------------------------------------------- Läskiga & galna
  av('spooky', 'zombien', 'Zombien', '🧟', 'Zombie i regnet. Hjäääärnor…', 'zombie', 'rain', 'zombie', { filter: 'film', intensity: 0.5 }),
  av('spooky', 'vampyren', 'Vampyren', '🧛', 'Greven i tronsalen med slottsekande röst.', 'vampire', 'throne', 'vampire'),
  av('spooky', 'clownen', 'Clownen', '🤡', 'Clown på konsertscenen med gremlinröst. Tuta!', 'clown', 'concert', 'gremlin'),
  av('spooky', 'haxan', 'Häxan', '🧙‍♀️', 'Häxa i den förtrollade skogen. Hihihi!', 'witch', 'forest', 'witch'),
  av('spooky', 'skelett', 'Benny Ben', '💀', 'Skramlande skelett med spökröst.', 'skeleton', 'rain', 'ghost'),
  av('spooky', 'ghost', 'Spökstund', '👻', 'Ett litet spöke i den förtrollade skogen med kuslig röst.', 'ghost', 'forest', 'ghost', { filter: 'dream', intensity: 0.6 }),
  av('spooky', 'pumpa', 'Lyktgubben', '🎃', 'Pumpa med levande ljus och demonröst.', 'pumpkin', 'forest', 'demon'),
  cam('spooky', 'du-demon', 'Du som demon', '😈', 'Djävulshorn, värmekamera och demonröst.', ['devilHorns'], 'aura', 'demon', { filter: 'thermal', intensity: 0.7 }),
  // ---------------------------------------------------------------- Stämningar
  cam('vibes', 'cozy', 'Mysig streamer', '☕', 'Du själv i en varm stuga med sprakande brasa, mjukt filmfilter och stämningsljud.', [], 'cabin', 'natural', { filter: 'film', intensity: 0.55, ambience: true }),
  cam('vibes', 'cyber', 'Cyberpunk', '🌆', 'Neonkeps, neonstad i regn och cyberfilter.', ['baseballCap'], 'neon', 'vocoder', { filter: 'cyber', intensity: 0.65 }),
  cam('vibes', 'noir', 'Noir-detektiv', '🕵️', 'Svartvit deckare vid ett regnigt fönster med filmtrailerröst.', ['topHat', 'mustache'], 'rain', 'trailer', { filter: 'noir' }),
  cam('vibes', 'vhs', 'Retro-VHS', '📼', 'Solglasögon, lo-fi-solnedgång och ett slitet videoband. Radioröst.', ['sunglasses'], 'sunset', 'radio', { filter: 'vhs' }),
  cam('vibes', 'midsommar', 'Midsommar', '🌼', 'Blomsterkrans, sagoskog och en hel kör i rösten. Glad midsommar!', ['flowerCrown'], 'forest', 'choir', { filter: 'dream', intensity: 0.4 }),
  cam('vibes', 'hacker', 'Hackern', '💻', 'Digitalt regn, cyberpunkfärger och gamer-headset.', ['headset'], 'matrix', 'megaphone', { filter: 'cyber', intensity: 0.8 }),
  cam('vibes', 'strand', 'Strandhäng', '🏝️', 'Du själv på en tropisk strand i solnedgången.', ['sunglasses'], 'beach', 'natural', { filter: 'film', intensity: 0.4, ambience: true }),
];

/** Ögonblicksbild av nuvarande look för att spara som egen skepnad. */
export function snapshot(state) {
  return {
    video: { mode: state.video.mode },
    avatar: { id: state.avatar.id, colors: state.avatar.colors },
    background: { type: state.background.type, scene: state.background.scene },
    filter: { ...state.filter, extra: [...(state.filter.extra || [])] },
    face: { accessories: [...state.face.accessories], warp: state.face.warp, warpStrength: state.face.warpStrength, warps: [...(state.face.warps || [])] },
    voice: { preset: state.voice.preset, params: { ...state.voice.params } },
    ambience: { enabled: state.ambience.enabled },
    stickers: (state.stickers?.items || []).map((s) => ({ ...s })),
  };
}

/** Applicera en look på store. */
export function applyLook(store, look) {
  for (const section of ['video', 'avatar', 'background', 'filter', 'face', 'ambience']) {
    if (look[section]) store.patch(section, look[section]);
  }
  if (look.filter && !look.filter.extra) store.set('filter.extra', []);
  if (look.face && !look.face.warps) store.set('face.warps', []);
  if (look.voice) {
    const params = look.voice.params ?? voiceParams(look.voice.preset);
    store.patch('voice', { preset: look.voice.preset, params, enabled: true });
  }
  const lt = store.get('overlays.lowerThird');
  if (look.overlays?.lowerThird) store.set('overlays.lowerThird', { ...lt, ...look.overlays.lowerThird });
  else if (lt?.byPersona) store.set('overlays.lowerThird', { ...lt, enabled: false, byPersona: false });
  if (look.stickers) store.set('stickers.items', look.stickers.map((s) => ({ ...s })));
}

export function allPersonas(state) {
  return [...BUILTIN_PERSONAS, ...(state.personas.custom || []).map((p) => ({ ...p, group: 'own' }))];
}
