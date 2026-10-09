// Emojis för klistermärken: Skepnads egna handritade neon-emojis (SVG) och
// vanliga emojis i kategorier. Ljus uppifrån-vänster, mörk kontur, neonglöd.

const OUT = '#12061f';

const wrap = (inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter><filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2"/></filter>${defs}</defs>${inner}</svg>`;

const lin = (id, a, b, x2 = '0', y2 = '1') => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rad = (id, a, b, cx = '35%', cy = '30%') => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;

/** Form med glöd bakom, gradientfyllning, mörk kontur och glansreflex. */
const shape = (d, { glow, fill, stroke = OUT, sw = 5, hi = true, hiAt = [44, 40], hiR = [12, 7] }) => `
  <path d="${d}" fill="none" stroke="${glow}" stroke-width="12" opacity=".85" filter="url(#g)"/>
  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
  ${hi ? `<ellipse cx="${hiAt[0]}" cy="${hiAt[1]}" rx="${hiR[0]}" ry="${hiR[1]}" fill="#fff" opacity=".55" transform="rotate(-32 ${hiAt[0]} ${hiAt[1]})"/>` : ''}`;

const sign = (text, color, size = 40, w = 112) =>
  wrap(`
  <rect x="${64 - w / 2}" y="38" width="${w}" height="52" rx="14" fill="none" stroke="${color}" stroke-width="9" opacity=".9" filter="url(#g)"/>
  <rect x="${64 - w / 2}" y="38" width="${w}" height="52" rx="14" fill="#140a26" stroke="${color}" stroke-width="4"/>
  <rect x="${64 - w / 2 + 6}" y="44" width="${w - 12}" height="40" rx="9" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
  <text x="64" y="${64 + size * 0.36}" text-anchor="middle" font-family="'Arial Black','Segoe UI Black',Impact,sans-serif" font-weight="900" font-size="${size}" fill="${color}" filter="url(#s)">${text}</text>
  <text x="64" y="${64 + size * 0.36}" text-anchor="middle" font-family="'Arial Black','Segoe UI Black',Impact,sans-serif" font-weight="900" font-size="${size}" fill="#fff">${text}</text>`);

const HEART = 'M64 108 C30 84 14 66 14 46 C14 30 26 18 42 18 C52 18 60 24 64 32 C68 24 76 18 86 18 C102 18 114 30 114 46 C114 66 98 84 64 108Z';

export const SKEP_EMOJIS = [
  { id: 'neonHeart', name: 'Neonhjärta', svg: wrap(`${shape(HEART, { glow: '#ff2bd6', fill: 'url(#a)' })}<path d="${HEART}" transform="translate(14 13) scale(.78)" fill="none" stroke="#ffd1f7" stroke-width="3" opacity=".8"/>`, lin('a', '#ff6fe6', '#a3127f')) },
  { id: 'bolt', name: 'Blixt', svg: wrap(shape('M72 6 L24 72 L56 72 L44 122 L104 48 L70 48 L86 6 Z', { glow: '#fcee0a', fill: 'url(#a)', hiAt: [62, 30], hiR: [8, 4] }), lin('a', '#fff8a0', '#f5b700')) },
  {
    id: 'glitchSkull',
    name: 'Glitchskalle',
    svg: wrap(
      ['#00f0ff|-5', '#ff2bd6|5', '#f5f0ff|0']
        .map((v, i) => {
          const [c, dx] = v.split('|');
          return `<g transform="translate(${dx} 0)" opacity="${i < 2 ? 0.75 : 1}"><path d="M64 14 C34 14 18 34 18 58 C18 74 26 84 36 88 L36 104 C36 110 40 114 46 114 L82 114 C88 114 92 110 92 104 L92 88 C102 84 110 74 110 58 C110 34 94 14 64 14Z" fill="${c}" stroke="${OUT}" stroke-width="${i < 2 ? 0 : 5}"/>${i === 2 ? `<ellipse cx="44" cy="62" rx="13" ry="15" fill="${OUT}"/><ellipse cx="84" cy="62" rx="13" ry="15" fill="${OUT}"/><circle cx="44" cy="62" r="4" fill="#00f0ff"/><circle cx="84" cy="62" r="4" fill="#ff2bd6"/><path d="M64 74 L58 86 L70 86Z" fill="${OUT}"/><path d="M50 98 V112 M60 98 V112 M70 98 V112 M80 98 V112" stroke="${OUT}" stroke-width="4"/><ellipse cx="44" cy="30" rx="12" ry="6" fill="#fff" opacity=".6" transform="rotate(-25 44 30)"/>` : ''}</g>`;
        })
        .join('') + '<rect x="10" y="50" width="108" height="5" fill="#00f0ff" opacity=".5"/><rect x="14" y="80" width="100" height="3" fill="#ff2bd6" opacity=".6"/>',
    ),
  },
  {
    id: 'cyberEye',
    name: 'Cyberöga',
    svg: wrap(
      `${shape('M8 64 C28 30 100 30 120 64 C100 98 28 98 8 64Z', { glow: '#00f0ff', fill: '#f2fbff', hi: false })}
      <circle cx="64" cy="64" r="26" fill="url(#a)" stroke="${OUT}" stroke-width="4"/>
      <circle cx="64" cy="64" r="18" fill="none" stroke="#7df9ff" stroke-width="2" stroke-dasharray="6 4"/>
      <circle cx="64" cy="64" r="10" fill="${OUT}"/><circle cx="64" cy="64" r="4" fill="#ff2bd6" filter="url(#s)"/>
      <path d="M38 64 H26 M102 64 H90 M64 38 V30" stroke="#00f0ff" stroke-width="3"/>
      <circle cx="55" cy="55" r="5" fill="#fff"/>`,
      rad('a', '#7df9ff', '#006b8f'),
    ),
  },
  {
    id: 'crown',
    name: 'Neonkrona',
    svg: wrap(
      `${shape('M18 96 L12 38 L40 62 L64 22 L88 62 L116 38 L110 96 Z', { glow: '#fcee0a', fill: 'url(#a)', hiAt: [40, 72], hiR: [10, 5] })}
      <rect x="18" y="94" width="92" height="14" rx="4" fill="url(#a)" stroke="${OUT}" stroke-width="5"/>
      <circle cx="40" cy="84" r="6" fill="#ff2bd6" stroke="${OUT}" stroke-width="3"/><circle cx="64" cy="80" r="7" fill="#00f0ff" stroke="${OUT}" stroke-width="3"/><circle cx="88" cy="84" r="6" fill="#ff2bd6" stroke="${OUT}" stroke-width="3"/>`,
      lin('a', '#fff3a0', '#e0a100'),
    ),
  },
  {
    id: 'flame',
    name: 'Neonlåga',
    svg: wrap(
      `${shape('M64 120 C34 120 20 98 26 74 C30 58 42 50 44 32 C56 42 58 56 56 66 C64 56 70 40 66 10 C90 26 108 54 104 82 C100 106 86 120 64 120Z', { glow: '#ff2bd6', fill: 'url(#a)', hiAt: [48, 80], hiR: [7, 12] })}
      <path d="M64 112 C50 112 44 100 48 88 C52 78 60 74 62 64 C72 72 80 84 78 96 C76 106 72 112 64 112Z" fill="#fff36b" stroke="${OUT}" stroke-width="3"/>`,
      lin('a', '#ff7ae8', '#ff3d00'),
    ),
  },
  {
    id: 'starBurst',
    name: 'Stjärnsmäll',
    svg: wrap(
      shape('M64 6 L74 50 L118 40 L82 66 L110 104 L66 84 L52 122 L48 80 L8 92 L40 62 L14 26 L56 44 Z', { glow: '#00f0ff', fill: 'url(#a)', hiAt: [56, 46], hiR: [9, 5] }),
      rad('a', '#ffffff', '#00c8e6'),
    ),
  },
  {
    id: 'alien',
    name: 'Neonalien',
    svg: wrap(
      `${shape('M64 10 C96 10 114 34 112 60 C110 86 88 116 64 118 C40 116 18 86 16 60 C14 34 32 10 64 10Z', { glow: '#39ff88', fill: 'url(#a)', hiAt: [42, 30] })}
      <path d="M30 62 C34 48 52 50 56 64 C58 76 42 80 34 74 C30 71 29 66 30 62Z" fill="${OUT}"/><path d="M98 62 C94 48 76 50 72 64 C70 76 86 80 94 74 C98 71 99 66 98 62Z" fill="${OUT}"/>
      <ellipse cx="40" cy="60" rx="5" ry="3" fill="#fff"/><ellipse cx="80" cy="60" rx="5" ry="3" fill="#fff"/><path d="M56 98 Q64 102 72 98" stroke="${OUT}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      rad('a', '#b6ffd2', '#16b85a'),
    ),
  },
  {
    id: 'robot',
    name: 'Robothuvud',
    svg: wrap(
      `<path d="M64 24 V10" stroke="${OUT}" stroke-width="5"/><circle cx="64" cy="10" r="7" fill="#ff2bd6" stroke="${OUT}" stroke-width="4"/>
      ${shape('M24 30 H104 Q116 30 116 42 V98 Q116 112 102 112 H26 Q12 112 12 98 V42 Q12 30 24 30Z', { glow: '#00f0ff', fill: 'url(#a)', hiAt: [32, 44] })}
      <rect x="24" y="48" width="80" height="34" rx="10" fill="#0a0f1e" stroke="${OUT}" stroke-width="3"/>
      <rect x="34" y="58" width="20" height="12" rx="6" fill="#00f0ff" filter="url(#s)"/><rect x="74" y="58" width="20" height="12" rx="6" fill="#00f0ff" filter="url(#s)"/>
      <rect x="34" y="58" width="20" height="12" rx="6" fill="#bffaff"/><rect x="74" y="58" width="20" height="12" rx="6" fill="#bffaff"/>
      <path d="M42 96 H86" stroke="#ff2bd6" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 6"/>`,
      lin('a', '#e8edf7', '#8a93a8'),
    ),
  },
  {
    id: 'ghost',
    name: 'Neonspöke',
    svg: wrap(
      `${shape('M24 116 V56 C24 30 42 12 64 12 C86 12 104 30 104 56 V116 L90 104 L77 116 L64 104 L51 116 L38 104 Z', { glow: '#00f0ff', fill: 'url(#a)', hiAt: [44, 36] })}
      <ellipse cx="50" cy="58" rx="8" ry="11" fill="${OUT}"/><ellipse cx="80" cy="58" rx="8" ry="11" fill="${OUT}"/><ellipse cx="65" cy="82" rx="7" ry="9" fill="${OUT}"/>`,
      rad('a', '#ffffff', '#b9d9ff'),
    ),
  },
  {
    id: 'diamond',
    name: 'Diamant',
    svg: wrap(
      `${shape('M34 22 H94 L118 50 L64 118 L10 50 Z', { glow: '#00f0ff', fill: 'url(#a)', hi: false })}
      <path d="M10 50 H118 M34 22 L48 50 L64 118 M94 22 L80 50 L64 118 M48 50 L64 22 L80 50" fill="none" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M36 26 L46 46 L22 46Z" fill="#fff" opacity=".7"/>`,
      lin('a', '#d9fdff', '#1aa7d6'),
    ),
  },
  { id: 'money', name: 'Kaching', svg: wrap(`${shape('M64 10 A54 54 0 1 1 63.9 10Z', { glow: '#fcee0a', fill: 'url(#a)' })}<circle cx="64" cy="64" r="40" fill="none" stroke="#a87500" stroke-width="3"/><text x="64" y="86" text-anchor="middle" font-family="'Arial Black',Impact,sans-serif" font-size="62" font-weight="900" fill="#7a5200">$</text>`, rad('a', '#fff6b0', '#e9a800')) },
  {
    id: 'note',
    name: 'Musiknot',
    svg: wrap(
      `<path d="M44 96 V30 L104 18 V84" fill="none" stroke="#ff2bd6" stroke-width="14" opacity=".8" filter="url(#g)"/>
      <path d="M44 96 V30 L104 18 V84" fill="none" stroke="${OUT}" stroke-width="12" stroke-linejoin="round"/><path d="M44 96 V30 L104 18 V84" fill="none" stroke="url(#a)" stroke-width="6" stroke-linejoin="round"/>
      <ellipse cx="32" cy="98" rx="16" ry="12" fill="url(#a)" stroke="${OUT}" stroke-width="5"/><ellipse cx="92" cy="86" rx="16" ry="12" fill="url(#a)" stroke="${OUT}" stroke-width="5"/>
      <path d="M44 42 L104 30" stroke="${OUT}" stroke-width="4"/>`,
      lin('a', '#ff8af0', '#b3108f'),
    ),
  },
  {
    id: 'rocket',
    name: 'Raket',
    svg: wrap(
      `<path d="M52 98 Q64 126 76 98" fill="#fcee0a" stroke="${OUT}" stroke-width="4"/><path d="M57 98 Q64 114 71 98" fill="#ff7a00"/>
      ${shape('M64 8 C84 24 90 50 86 98 H42 C38 50 44 24 64 8Z', { glow: '#00f0ff', fill: 'url(#a)', hiAt: [54, 40], hiR: [5, 14] })}
      <path d="M42 70 L24 98 H42Z M86 70 L104 98 H86Z" fill="#ff2bd6" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="64" cy="54" r="11" fill="#00f0ff" stroke="${OUT}" stroke-width="4"/><circle cx="60" cy="50" r="3.5" fill="#fff"/>`,
      lin('a', '#ffffff', '#b8c0d6', '1', '0'),
    ),
  },
  {
    id: 'pizza',
    name: 'Pizza',
    svg: wrap(
      `${shape('M64 120 L16 22 Q64 6 112 22 Z', { glow: '#ff9a1f', fill: 'url(#a)', hi: false })}
      <path d="M16 22 Q64 6 112 22 L106 34 Q64 20 22 34 Z" fill="#d98a3a" stroke="${OUT}" stroke-width="4"/>
      <circle cx="50" cy="50" r="9" fill="#e0263e" stroke="${OUT}" stroke-width="3"/><circle cx="78" cy="56" r="8" fill="#e0263e" stroke="${OUT}" stroke-width="3"/><circle cx="62" cy="84" r="8" fill="#e0263e" stroke="${OUT}" stroke-width="3"/>
      <circle cx="48" cy="47" r="2.5" fill="#fff" opacity=".6"/>`,
      lin('a', '#ffe27a', '#ffb52e'),
    ),
  },
  {
    id: 'pixelShades',
    name: 'Coola brillor',
    svg: wrap(
      `<g fill="${OUT}"><rect x="6" y="44" width="116" height="10"/><rect x="14" y="54" width="44" height="12"/><rect x="70" y="54" width="44" height="12"/><rect x="20" y="66" width="32" height="10"/><rect x="76" y="66" width="32" height="10"/><rect x="58" y="54" width="12" height="6"/></g>
      <g fill="#fff"><rect x="20" y="56" width="8" height="6"/><rect x="28" y="62" width="6" height="4"/><rect x="76" y="56" width="8" height="6"/><rect x="84" y="62" width="6" height="4"/></g>
      <rect x="6" y="44" width="116" height="32" fill="none" stroke="#00f0ff" stroke-width="4" opacity=".7" filter="url(#g)"/>`,
    ),
  },
  { id: 'shock', name: 'Chock', svg: wrap(`<text x="40" y="104" text-anchor="middle" font-family="'Arial Black',Impact,sans-serif" font-size="96" font-weight="900" fill="#ff2bd6" filter="url(#g)">!</text><text x="40" y="104" text-anchor="middle" font-family="'Arial Black',Impact,sans-serif" font-size="96" font-weight="900" fill="#ff5ce1" stroke="${OUT}" stroke-width="4">!</text><text x="86" y="104" text-anchor="middle" font-family="'Arial Black',Impact,sans-serif" font-size="96" font-weight="900" fill="#00f0ff" filter="url(#g)">?</text><text x="86" y="104" text-anchor="middle" font-family="'Arial Black',Impact,sans-serif" font-size="96" font-weight="900" fill="#7df9ff" stroke="${OUT}" stroke-width="4">?</text>`) },
  {
    id: 'lips',
    name: 'Neonpuss',
    svg: wrap(
      `${shape('M10 62 C26 40 46 36 64 50 C82 36 102 40 118 62 C100 92 84 100 64 100 C44 100 28 92 10 62Z', { glow: '#ff2bd6', fill: 'url(#a)', hiAt: [42, 54], hiR: [10, 4] })}
      <path d="M14 62 C40 70 88 70 114 62" fill="none" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>`,
      lin('a', '#ff5c9a', '#c2003e'),
    ),
  },
  {
    id: 'raincloud',
    name: 'Regnmoln',
    svg: wrap(
      `${shape('M32 82 C14 82 10 58 28 54 C28 34 52 26 64 40 C74 24 104 30 102 54 C120 56 118 82 98 82 Z', { glow: '#7df9ff', fill: 'url(#a)', hiAt: [48, 46] })}
      <path d="M40 92 L34 110 M64 92 L58 112 M88 92 L82 110" stroke="#00f0ff" stroke-width="6" stroke-linecap="round"/>`,
      lin('a', '#e6ecff', '#8c98b8'),
    ),
  },
  { id: 'halo', name: 'Gloria', svg: wrap(`<ellipse cx="64" cy="64" rx="50" ry="20" fill="none" stroke="#fcee0a" stroke-width="16" opacity=".8" filter="url(#g)"/><ellipse cx="64" cy="64" rx="50" ry="20" fill="none" stroke="${OUT}" stroke-width="14"/><ellipse cx="64" cy="64" rx="50" ry="20" fill="none" stroke="url(#a)" stroke-width="8"/>`, lin('a', '#fff9c2', '#f0b400')) },
  {
    id: 'horns',
    name: 'Horn',
    svg: wrap(
      `${shape('M18 108 C10 76 14 40 40 14 C34 44 42 70 60 92 Z', { glow: '#ff2d55', fill: 'url(#a)', hiAt: [28, 70], hiR: [4, 14] })}${shape('M110 108 C118 76 114 40 88 14 C94 44 86 70 68 92 Z', { glow: '#ff2d55', fill: 'url(#a)', hi: false })}`,
      lin('a', '#ff6b7f', '#a3001f'),
    ),
  },
  {
    id: 'paw',
    name: 'Tass',
    svg: wrap(
      `${shape('M64 60 C84 60 100 80 100 96 C100 110 88 116 76 112 C70 110 58 110 52 112 C40 116 28 110 28 96 C28 80 44 60 64 60Z', { glow: '#ff2bd6', fill: 'url(#a)' })}
      ${[
        [30, 50, 11],
        [50, 30, 12],
        [78, 30, 12],
        [98, 50, 11],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#a)" stroke="${OUT}" stroke-width="5"/>`)
        .join('')}`,
      rad('a', '#ffc2f2', '#ff3fc4'),
    ),
  },
  {
    id: 'logo',
    name: 'Skepnad',
    svg: wrap(
      `<path d="M64 8 L112 30 V78 C112 98 90 114 64 122 C38 114 16 98 16 78 V30 Z" fill="none" stroke="#00f0ff" stroke-width="10" opacity=".7" filter="url(#g)"/>
      <path d="M64 8 L112 30 V78 C112 98 90 114 64 122 C38 114 16 98 16 78 V30 Z" fill="#0d0820" stroke="url(#a)" stroke-width="6"/>
      <path d="M34 60 Q48 50 58 62 Q48 70 34 60Z M94 60 Q80 50 70 62 Q80 70 94 60Z" fill="#00f0ff"/><path d="M44 88 Q64 102 84 88" stroke="#ff2bd6" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      lin('a', '#ff2bd6', '#00f0ff', '1', '1'),
    ),
  },
  { id: 'lol', name: 'LOL', svg: sign('LOL', '#00f0ff') },
  { id: 'omg', name: 'OMG', svg: sign('OMG', '#ff2bd6') },
  { id: 'gg', name: 'GG', svg: sign('GG', '#39ff88', 44, 88) },
  { id: 'wow', name: 'WOW!', svg: sign('WOW!', '#fcee0a', 34) },
  { id: 'haha', name: 'HAHA', svg: sign('HAHA', '#ff9a1f', 32) },
  { id: 'hype', name: 'HYPE', svg: sign('HYPE', '#ff2bd6', 32) },
  { id: 'ja', name: 'JA!', svg: sign('JA!', '#39ff88', 42, 92) },
  { id: 'nej', name: 'NEJ!', svg: sign('NEJ!', '#ff2d55', 36) },
  { id: 'hundra', name: '100', svg: sign('100', '#ff2d55', 42, 100) },
  { id: 'brb', name: 'BRB', svg: sign('BRB', '#7c5cff', 40, 100) },
];
export const SKEP_MAP = Object.fromEntries(SKEP_EMOJIS.map((e) => [e.id, e]));

export const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const EMOJI_SETS = [
  { id: 'faces', name: 'Ansikten', icon: '😀', list: '😀 😂 🤣 😍 🥰 😎 🤩 🥳 😜 🤪 😏 😇 😱 😡 🤬 🥺 😭 😴 🤯 🤠 🥸 🤓 🧐 😈 👻 💀 🤡 👽 🤖 💩 🙈 🙉 🙊'.split(' ') },
  { id: 'signs', name: 'Tecken', icon: '💯', list: '❤️ 🧡 💛 💚 💙 💜 🖤 💖 💔 💯 ✨ ⭐ 🌟 🔥 💥 💫 💢 💬 💭 ❗ ❓ ⁉️ ✅ ❌ ⚡ 🌈 🎯 🆒 🆗 🔴 💤 💦'.split(' ') },
  { id: 'animals', name: 'Djur', icon: '🐶', list: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🦄 🐔 🐧 🦆 🦉 🦋 🐝 🐙 🦈 🐬 🐳 🐉 🦖 🦕 🐌'.split(' ') },
  { id: 'food', name: 'Mat', icon: '🍕', list: '🍕 🍔 🍟 🌭 🍿 🍩 🍪 🎂 🧁 🍦 🍭 🍬 🍫 🍉 🍓 🍌 🍒 🥑 🌮 🍣 🍜 ☕ 🧃 🥤'.split(' ') },
  { id: 'things', name: 'Saker', icon: '👑', list: '👑 🎩 🕶️ 👓 💍 💎 🎀 🎸 🎤 🎧 🎮 🕹️ 🏆 🥇 🎁 🎈 🎉 🎊 💸 💰 📱 💡 🚀 ✈️ 🚗 ⚽ 🏀 🎲 🪄 🔮'.split(' ') },
  { id: 'hands', name: 'Händer', icon: '👍', list: '👍 👎 👏 🙌 🤘 ✌️ 🤙 👊 🫶 👋 💪 🙏 👀 💋 👅 🫵 ☝️ 🤞'.split(' ') },
  { id: 'nature', name: 'Natur', icon: '🌙', list: '☀️ 🌙 🌚 🌝 ⭐ ☁️ 🌧️ ⛈️ ❄️ ☃️ 🌸 🌻 🌹 🍀 🌴 🌵 🍁 🌊 🌋 🌍'.split(' ') },
];

export const PLACEMENTS = [
  { id: 'above', name: 'Ovanför huvudet', icon: '⬆️', at: { anchor: 'face', dx: 0, dy: 2.5, scale: 1.7 } },
  { id: 'forehead', name: 'På pannan', icon: '🧠', at: { anchor: 'face', dx: 0, dy: 1.15, scale: 0.9 } },
  { id: 'eyes', name: 'Över ögonen', icon: '👀', at: { anchor: 'face', dx: 0, dy: 0, scale: 1.5 } },
  { id: 'cheek', name: 'På kinden', icon: '😊', at: { anchor: 'face', dx: 0.95, dy: -0.75, scale: 0.6 } },
  { id: 'mouth', name: 'Vid munnen', icon: '👄', at: { anchor: 'face', dx: 0, dy: -1.3, scale: 0.85 } },
  { id: 'side', name: 'Bredvid huvudet', icon: '➡️', at: { anchor: 'face', dx: 2.4, dy: 0.7, scale: 1.4 } },
  { id: 'free', name: 'Fritt i bilden', icon: '🖐️', at: { anchor: 'screen', x: 0.78, y: 0.2, scale: 0.2 } },
];
export const PLACEMENT_MAP = Object.fromEntries(PLACEMENTS.map((p) => [p.id, p]));

export const TEXT_STYLES = [
  { id: 'bubble', name: 'Pratbubbla', icon: '💬' },
  { id: 'think', name: 'Tankebubbla', icon: '💭' },
  { id: 'shout', name: 'Utrop', icon: '💥' },
  { id: 'neon', name: 'Neonskylt', icon: '🌃' },
  { id: 'meme', name: 'Meme-text', icon: '🖼️' },
];
