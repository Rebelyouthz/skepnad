// AI-ansikten: fotorealistiska, AI-genererade och PÅHITTADE personer – inga riktiga
// människor. Bilder och ansiktspunkter ligger i public/faces (faces.json skapas av
// ett mätskript som kör MediaPipe på bilderna).
export const FACE_LIST = [
  { id: 'elin', name: 'Elin', desc: 'Tjej, 24 – fräknar', voice: 'girl' },
  { id: 'oskar', name: 'Oskar', desc: 'Kille, 26 – skäggstubb', voice: 'guy' },
  { id: 'king', name: 'Kungen', desc: 'Gråsprängd, skäggstubb' },
  { id: 'queen', name: 'Drottningen', desc: 'Äldre, silverhår' },
  { id: 'president', name: 'Presidenten', desc: 'Kostym och allvar' },
  { id: 'anna', name: 'Anna', desc: 'Mörkt hår, naturlig' },
  { id: 'marco', name: 'Marco', desc: 'Helskägg, glad' },
  { id: 'mei', name: 'Mei', desc: 'Leende, mörkt hår' },
  { id: 'sara', name: 'Sara', desc: 'Uppsatt hår' },
  { id: 'johan', name: 'Johan', desc: 'Kortklippt, stubb' },
  { id: 'emma', name: 'Emma', desc: 'Ljust hår, glad' },
  { id: 'linnea', name: 'Linnea', desc: 'Rött hår' },
  { id: 'erik', name: 'Erik', desc: 'Lockigt hår' },
  { id: 'mattias', name: 'Mattias', desc: 'Kort mörkt hår' },
];
export const FACE_MAP = Object.fromEntries(FACE_LIST.map((f) => [f.id, f]));

export const faceImage = (id) => `faces/${id}.jpg`;

let all = null;
/** Hela definitionen (bild-url, 468 punkter, hudton) – laddas första gången den behövs. */
export async function faceDef(id) {
  if (!id || id === 'none') return null;
  all ??= fetch(new URL('faces/faces.json', document.baseURI))
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  const list = await all;
  if (!list.length) all = null; // försök igen nästa gång (t.ex. tillfälligt nätverksfel)
  return list.find((f) => f.id === id) ?? null;
}

/** Levande, fotorealistiska platser (AI-genererade videoloopar). */
export const LIVE_PLACES = [
  { id: 'cozy', name: 'Mysig stuga', icon: '🔥', desc: 'Brasa, levande ljus och snöfall utanför fönstret.' },
  { id: 'city', name: 'Takterrass', icon: '🌃', desc: 'Neonstad i regn – högt upp över skyskraporna.' },
];
export const placeVideo = (id) => `places/${id}.mp4`;
export const placePoster = (id) => `places/${id}.jpg`;

/** Sminkförval. */
export const MAKEUP_PRESETS = [
  { id: 'off', name: 'Inget', icon: '○', makeup: { lips: 0, blush: 0 } },
  { id: 'natural', name: 'Naturlig', icon: '🌸', makeup: { lips: 0.35, lipColor: '#b5545c', blush: 0.35, blushColor: '#e48a8a' } },
  { id: 'red', name: 'Klassisk röd', icon: '💋', makeup: { lips: 0.85, lipColor: '#9e0f22', blush: 0.25, blushColor: '#e07a7a' } },
  { id: 'pink', name: 'Rosa', icon: '🎀', makeup: { lips: 0.7, lipColor: '#d0507a', blush: 0.5, blushColor: '#f08aa8' } },
  { id: 'berry', name: 'Bär', icon: '🍇', makeup: { lips: 0.8, lipColor: '#6b1638', blush: 0.3, blushColor: '#c86a80' } },
  { id: 'nude', name: 'Nude', icon: '🤎', makeup: { lips: 0.6, lipColor: '#b07a6a', blush: 0.2, blushColor: '#d99a88' } },
];
