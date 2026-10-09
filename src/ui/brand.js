// Skepnads varumärke: emblem (maskeradmask i avfasad neonsköld), ordmärke
// och appikon. Ljus uppifrån-vänster, magenta→cyan, mörk kärna.

const MASK =
  'M64 55.2C71.9 48.2 88.2 43.8 103.6 49C109.8 55.2 108 69.3 99.2 74.6C89.5 80.7 76.3 78.1 69.7 71C67.1 68.4 60.9 68.4 58.3 71C51.7 78.1 38.5 80.7 28.8 74.6C20 69.3 18.2 55.2 24.4 49C39.8 43.8 56.1 48.2 64 55.2Z';
const SHIELD = 'M26 8H102L120 26V90L90 120H38L8 90V26Z';

/** Emblemets SVG. `uid` gör id:n unika när flera emblem finns på sidan. */
export function emblemSvg({ size = 48, uid = 'e', glow = true, cls = 'emblem' } = {}) {
  const id = (n) => `${n}-${uid}`;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 128 128" aria-hidden="true">
  <defs>
    <linearGradient id="${id('rim')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2bd6"/><stop offset=".55" stop-color="#9b5cff"/><stop offset="1" stop-color="#00f0ff"/></linearGradient>
    <linearGradient id="${id('core')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1430"/><stop offset="1" stop-color="#07050f"/></linearGradient>
    <linearGradient id="${id('mask')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f1ff"/><stop offset=".45" stop-color="#b9a8ff"/><stop offset="1" stop-color="#3b2a7a"/></linearGradient>
    <filter id="${id('blur')}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
    <clipPath id="${id('clip')}"><path d="${SHIELD}"/></clipPath>
  </defs>
  ${glow ? `<path d="${SHIELD}" fill="none" stroke="url(#${id('rim')})" stroke-width="8" opacity=".75" filter="url(#${id('blur')})"/>` : ''}
  <path d="${SHIELD}" fill="url(#${id('core')})"/>
  <g clip-path="url(#${id('clip')})" opacity=".35" stroke="#00f0ff" stroke-width=".6">
    <path d="M8 92H120M8 104H120M8 116H120M28 84 0 128M48 84 32 128M64 84V128M80 84 96 128M100 84 128 128"/>
  </g>
  <path d="${SHIELD}" fill="none" stroke="url(#${id('rim')})" stroke-width="4"/>
  <path d="M30 13H98L114 29" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/>
  <path d="${MASK}" fill="#00f0ff" opacity=".55" filter="url(#${id('blur')})" transform="translate(-3 2)"/>
  <path d="${MASK}" fill="#ff2bd6" opacity=".55" filter="url(#${id('blur')})" transform="translate(3 -1)"/>
  <path d="${MASK}" fill="url(#${id('mask')})" stroke="#12061f" stroke-width="2.4"/>
  <ellipse cx="43.8" cy="62" rx="9.2" ry="5" transform="rotate(12 43.8 62)" fill="#07050f"/>
  <ellipse cx="84.2" cy="62" rx="9.2" ry="5" transform="rotate(-12 84.2 62)" fill="#07050f"/>
  <ellipse cx="43.8" cy="62" rx="6" ry="2.4" transform="rotate(12 43.8 62)" fill="#00f0ff"/>
  <ellipse cx="84.2" cy="62" rx="6" ry="2.4" transform="rotate(-12 84.2 62)" fill="#00f0ff"/>
  <path d="M34 50C44 46 54 47 60 52" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <rect x="16" y="66" width="96" height="2" fill="#fcee0a" opacity=".75"/>
  <path d="M50 96H78" stroke="#ff2bd6" stroke-width="4" stroke-linecap="square"/>
  <path d="M56 104H72" stroke="#00f0ff" stroke-width="3" stroke-linecap="square"/>
</svg>`;
}

/** Fristående appikon (för PNG-export): emblem på mörk bakgrund med rutnät och glöd. */
export function appIconSvg({ maskable = false } = {}) {
  const inner = maskable ? 0.62 : 0.78;
  const off = (1 - inner) / 2;
  const emblem = emblemSvg({ size: 128, uid: 'ai' }).replace('<svg class="emblem" width="128" height="128"', `<svg x="${off * 128}" y="${off * 128}" width="${inner * 128}" height="${inner * 128}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="512" height="512">
  <defs>
    <radialGradient id="bgg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#2a1250"/><stop offset=".55" stop-color="#0c0820"/><stop offset="1" stop-color="#040309"/></radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00f0ff" stop-opacity="0"/><stop offset="1" stop-color="#00f0ff" stop-opacity=".45"/></linearGradient>
  </defs>
  <rect width="128" height="128" rx="${maskable ? 0 : 28}" fill="url(#bgg)"/>
  <g stroke="url(#floor)" stroke-width=".5" opacity=".7">
    <path d="M0 96H128M0 104H128M0 113H128M0 124H128M64 88V128M44 88 24 128M84 88 104 128M24 88-8 128M104 88 136 128"/>
  </g>
  <circle cx="64" cy="58" r="44" fill="#9b5cff" opacity=".18"/>
  ${emblem}
</svg>`;
}

/** Ordmärket med kromatisk aberration (CSS gör glitchen). */
export function wordmarkHtml(cls = '') {
  return `<span class="wordmark-cyber ${cls}" data-text="SKEPNAD">SKEPNAD</span>`;
}
