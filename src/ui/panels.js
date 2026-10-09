// Panelinnehåll för varje flik. Ren deklarativ HTML + bindningar (bind.js) och
// actions (data-action) som hanteras i main.js.
import { icon } from './icons.js';
import { SCENES, SCENE_MAP } from '../render/backgrounds/scenes.js';
import { FILTERS, FILTER_MAP } from '../render/filters.js';
import { ACCESSORIES, ACCESSORY_MAP } from '../render/ar/accessories.js';
import { WARPS } from '../render/faceWarp.js';
import { AVATAR_LIST, AVATAR_GROUPS } from '../avatar/avatarLayer.js';
import { VOICES, VOICE_GROUPS, VOICE_MAP, KEYS } from '../audio/voices.js';
import { SOUNDS } from '../audio/sfx.js';
import { EFFECTS } from '../app/effects.js';
import { THROWABLES } from '../render/fx/throwables.js';
import { BUILTIN_PERSONAS, PERSONA_GROUPS } from '../app/personas.js';
import { SHARE_TABS, SHARE_PANELS } from './panelsShare.js';
import { SKEP_EMOJIS, SKEP_MAP, EMOJI_SETS, PLACEMENTS, TEXT_STYLES, svgUrl } from './emojis.js';

export const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const tipAttr = (tip) => (tip ? ` data-tip="${esc(tip)}"` : '');
export const slider = (path, label, min, max, step, fmt, tip, def) =>
  `<div class="ctl"${tipAttr(tip)}><div class="ctl-row"><span>${label}</span><span class="val"></span></div><input type="range" data-bind="${path}" min="${min}" max="${max}" step="${step}" data-fmt="${fmt}"${def !== undefined ? ` data-default="${def}"` : ''} aria-label="${esc(label)}"></div>`;
export const toggle = (path, label, tip, small = '') =>
  `<label class="switch"${tipAttr(tip)}><span>${label}${small ? `<small>${small}</small>` : ''}</span><input type="checkbox" data-bind="${path}"><span class="knob"></span></label>`;
export const seg = (path, options, { type = '', big = false } = {}) =>
  `<div class="seg${big ? ' big' : ''}" data-seg="${path}"${type ? ` data-type="${type}"` : ''}>${options
    .map((o) => `<button data-value="${o.value}"${tipAttr(o.tip)}>${o.icon ? icon(o.icon, 15) : ''}<span>${o.label}</span></button>`)
    .join('')}</div>`;
export const select = (path, label, options, { type = '', tip = '' } = {}) =>
  `<div class="field"${tipAttr(tip)}><label>${label}</label><select data-bind="${path}"${type ? ` data-type="${type}"` : ''}>${options
    .map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`)
    .join('')}</select></div>`;
export const section = (title, body, tip) => `<div class="section"><div class="section-title"${tipAttr(tip)}>${title}</div>${body}</div>`;
const note = (text, kind = '', ic = 'info') => `<div class="note ${kind}">${icon(ic, 15)}<span>${text}</span></div>`;
export const card = ({ action, arg, activePath, value, emoji, name, desc, tip, key, cls = '', extra = '' }) =>
  `<button class="card ${cls}" data-action="${action}" data-arg="${esc(arg)}"${activePath ? ` data-active-path="${activePath}" data-value="${esc(value ?? arg)}"` : ''}${tipAttr(tip)}${key ? ` data-key="${key}"` : ''}><span class="tick">${icon('check', 12)}</span><span class="emoji">${emoji}</span><span class="name">${esc(name)}</span>${desc ? `<span class="desc">${esc(desc)}</span>` : ''}${key ? `<kbd>${key}</kbd>` : ''}${extra}</button>`;
const btn = (action, label, ic, tip, cls = '', arg = '') =>
  `<button class="btn ${cls}" data-action="${action}"${arg !== '' ? ` data-arg="${esc(arg)}"` : ''}${tipAttr(tip)}>${ic ? icon(ic, 16) : ''}<span>${label}</span></button>`;
const dropzone = (action, arg, title, sub, accept) =>
  `<label class="dropzone" data-drop="${action}" data-arg="${arg}" data-tip="${esc(title)}|${esc(sub)}">${icon('upload', 20)}<b>${title}</b><span>${sub}</span><input type="file" accept="${accept}" hidden data-file="${action}" data-arg="${arg}"></label>`;
const chips = (action, items, active) =>
  `<div class="cats">${items.map((c) => `<button class="chipbtn ${c.id === active ? 'active' : ''}" data-action="${action}" data-arg="${c.id}">${c.icon ? `<span>${c.icon}</span>` : ''}<span>${esc(c.name)}</span></button>`).join('')}</div>`;
const skepImg = (id, cls = '') => `<img class="${cls}" src="${svgUrl(SKEP_MAP[id]?.svg ?? '')}" alt="" draggable="false">`;
export const stickerIcon = (it) => (it.kind === 'skep' ? skepImg(it.value) : it.kind === 'text' ? (TEXT_STYLES.find((t) => t.id === it.style)?.icon ?? '💬') : it.kind === 'image' ? '🖼️' : it.value);

export const TABS = [
  { id: 'home', ...SHARE_TABS.home },
  { id: 'personas', icon: 'drama', label: 'Skepnader', short: 'Bli', tip: 'Skepnader|Färdiga figurer och looks – tecknat, kändisar, kungligheter, monster. Byt allt med ett tryck.' },
  { id: 'avatar', icon: 'bot', label: 'Figurer', short: 'Figur', tip: 'Figurer|Byt ut dig själv mot en 3D-figur som härmar dina miner: anka, kung, drake, robot…' },
  { id: 'background', icon: 'mountain', label: 'Platser', short: 'Plats', tip: 'Platser|Levande bakgrunder: tronsal, månen, röda mattan, neonstaden – eller suddigt rum.' },
  { id: 'filter', icon: 'palette', label: 'Filter', short: 'Filter', tip: 'Filter|Färg och stil: film, VHS, serietidning, glitch… Kombinera flera som lager.' },
  { id: 'face', icon: 'face', label: 'Ansikte', short: 'Ansikte', tip: 'Ansikte|Hattar, glasögon, skägg och masker som sitter fast på huvudet – och roliga förvrängningar.' },
  { id: 'stickers', icon: 'emoji', label: 'Emojis', short: 'Emoji', tip: 'Emojis|Sätt emojis, pratbubblor och egna bilder i bilden. Dra runt dem med fingret eller musen.' },
  { id: 'layers', icon: 'layers', label: 'Lager', short: 'Lager', tip: 'Lager|Allt som är på just nu – stäng av, ändra styrka eller ta bort enskilda lager.' },
  { id: 'voice', icon: 'waveform', label: 'Röst', short: 'Röst', tip: 'Röst|Låt som någon annan: anka, president, robot, drake, autotune…' },
  { id: 'soundboard', icon: 'drum', label: 'Ljud', short: 'Ljud', tip: 'Ljudbord|Spela ljudeffekter i sändningen: tuta, applåder, trumvirvel…' },
  { id: 'effects', icon: 'party', label: 'Effekter', short: 'Effekt', tip: 'Effekter|Konfetti, hjärtan, fyrverkeri – via knappar, gester eller ansiktsuttryck.' },
  { id: 'overlay', icon: 'text', label: 'Text & TV', short: 'Text', tip: 'Text & TV|Namnskylt, live-textning, klocka och LIVE-märke ovanpå bilden.' },
  { id: 'clips', group: 'share', ...SHARE_TABS.clips },
  { id: 'live', ...SHARE_TABS.live },
  { id: 'calls', ...SHARE_TABS.calls },
  { id: 'phone', ...SHARE_TABS.phone },
  { id: 'settings', icon: 'settings', label: 'Inställn.', short: 'Inställn.', tip: 'Inställningar|Kvalitet, kamera, nedräkning, ljud och hjälp.' },
];
export const MOBILE_TOOLS = ['personas', 'avatar', 'background', 'filter', 'stickers', 'voice', 'effects', 'layers'];

const ACC_GROUPS = [
  { name: 'Hattar, kronor & hår', slots: ['head', 'hair', 'above', 'helmet'] },
  { name: 'Glasögon & masker', slots: ['eyes', 'eye1'] },
  { name: 'Skägg, näsa & mun', slots: ['beard', 'mouth', 'nose', 'ears'] },
];
const COLOR_LABELS = { primary: 'Huvudfärg', accent: 'Detaljer', glow: 'Extra', skin: 'Hy', hair: 'Hår' };

const PANELS = {
  personas: {
    title: 'Skepnader',
    sub: 'Hela looken – figur, plats, filter och röst – med ett tryck.',
    render: (s) => {
      const cat = s.ui.personaCat || 'cartoon';
      const groups = [...PERSONA_GROUPS, { id: 'own', name: 'Mina', icon: '⭐' }];
      const list = cat === 'own' ? s.personas.custom || [] : BUILTIN_PERSONAS.filter((p) => p.group === cat);
      const all = [...BUILTIN_PERSONAS, ...(s.personas.custom || [])];
      const cards = list
        .map((p) => {
          const i = all.indexOf(p);
          const del = cat === 'own' ? `<span class="addlayer" data-action="deletePersona" data-arg="${esc(p.id)}" data-tip="Ta bort|Radera den här skepnaden.">${icon('trash', 14)}</span>` : '';
          return card({ action: 'persona', arg: p.id, activePath: 'personas.active', emoji: p.icon || '⭐', name: p.name, desc: p.desc || 'Din egen skepnad', tip: `${p.name}|${p.desc || 'Din sparade skepnad.'}`, key: i < 9 ? `⇧${i + 1}` : '', extra: del });
        })
        .join('');
      return `
        <div class="row" style="margin-bottom:14px">${btn('random', 'Överraska mig', 'dice', 'Överraska mig|Slumpar en helt ny skepnad: figur, plats, röst och en emoji. Tryck igen och igen!', 'btn-primary')}${btn('savePersona', 'Spara min look', 'save', 'Spara skepnad|Sparar allt du ställt in just nu så att du kan byta tillbaka med ett tryck.')}</div>
        ${chips('personaCat', groups, cat)}
        ${cards ? `<div class="grid wide">${cards}</div>` : `<p class="muted">Inga egna skepnader än. Ställ in en look du gillar och tryck <b>Spara min look</b>.</p>`}
        <div style="height:12px"></div>
        ${note('Kändisar, kungligheter och presidenter är påhittade roller – inga riktiga personer. Tryck <kbd>Shift</kbd>+<kbd>1</kbd>–<kbd>9</kbd> för blixtbyte.')}`;
    },
  },
  avatar: {
    title: 'Figurer',
    sub: 'Bli en 3D-figur som härmar dina ögon, mun, ögonbryn och huvud.',
    render: (s) => {
      const id = s.avatar.id;
      const cat = s.ui.avatarCat || AVATAR_LIST.find((a) => a.id === id)?.group || 'animals';
      const cards = AVATAR_LIST.filter((a) => a.group === cat).map((a) => card({ action: 'avatar', arg: a.id, activePath: 'avatar.id', emoji: a.icon, name: a.name, desc: a.desc, tip: `${a.name}|${a.desc}` })).join('');
      const def = AVATAR_LIST.find((a) => a.id === id);
      const colorKeys = Object.keys(def?.defaults ?? {}).filter((k) => COLOR_LABELS[k]);
      const colors = colorKeys.length
        ? `<div class="colors">${colorKeys.map((k) => `<label class="color" data-tip="${COLOR_LABELS[k]}|Tryck för att välja färg."><input type="color" data-bind="avatar.colors.${id}.${k}">${COLOR_LABELS[k]}</label>`).join('')}</div>
           <div style="margin-top:10px">${btn('resetColors', 'Originalfärger', 'reset', 'Återställ|Tillbaka till figurens originalfärger.', 'sm')}</div>`
        : '<p class="note">Den här figuren har inga färgval.</p>';
      return `
        ${section('Läge', seg('video.mode', [
          { value: 'camera', label: 'Du själv', icon: 'video', tip: 'Du själv|Visa dig själv med plats, filter, tillbehör och emojis.' },
          { value: 'avatar', label: 'Figur', icon: 'bot', tip: 'Figur|Ersätt dig själv med en 3D-figur som följer dina miner.' },
        ], { big: true }))}
        ${chips('avatarCat', AVATAR_GROUPS, cat)}
        <div class="grid">${cards}</div>
        <div style="height:18px"></div>
        ${section('Färger', colors)}
        ${section('Placering', `
          ${slider('avatar.scale', 'Storlek', 0.6, 1.6, 0.01, 'x', 'Storlek|Hur stor figuren är i bild. Dubbelklicka för att återställa.', 1)}
          ${slider('avatar.offsetY', 'Höjd', -0.8, 0.8, 0.01, 'spct', 'Höjd|Flytta figuren upp eller ner.', 0)}
          ${slider('avatar.headFollow', 'Huvudföljning', 0, 1.5, 0.01, 'pct', 'Huvudföljning|Hur mycket figurens huvud följer dina rörelser. Över 100 % blir det överdrivet och roligt!', 1)}`)}
        ${section('Egen 3D-modell', `${dropzone('uploadModel', '', 'Ladda VRM eller GLB', 'VRoid Studio, Ready Player Me m.fl.', '.vrm,.glb,.gltf')}
          <div id="custom-model-name" class="note" style="margin-top:10px" hidden></div>`)}
        ${section('PNG-tuber-bilder', `<div class="grid" style="grid-template-columns:1fr 1fr">
          ${dropzone('uploadPng', 'idle', 'Tyst', 'Bild när du inte pratar', 'image/*')}
          ${dropzone('uploadPng', 'talk', 'Pratar', 'Bild när du pratar', 'image/*')}
          ${dropzone('uploadPng', 'blink', 'Blinkar', 'Valfri', 'image/*')}
          ${dropzone('uploadPng', 'blinkTalk', 'Blinkar + pratar', 'Valfri', 'image/*')}</div>
          <div style="margin-top:10px">${toggle('avatar.pngDim', 'Dämpa när tyst', 'Dämpa när tyst|Bilden blir lite mörkare när du inte pratar – populärt i Discord-stil.')}</div>
          ${btn('clearPng', 'Använd standardfiguren', 'reset', 'Rensa|Ta bort dina uppladdade PNG-bilder.', 'sm')}`)}
        ${note('Figurerna fungerar även utan kamera – då rör sig munnen efter din röst och de blinkar av sig själva.')}`;
    },
  },
  background: {
    title: 'Platser',
    sub: 'Placera dig på en levande plats – eller sudda ut rummet bakom dig.',
    render: () => {
      const scenes = SCENES.map(
        (sc) => `<button class="card thumb" data-action="scene" data-arg="${sc.id}" data-active-path="background.scene" data-value="${sc.id}" data-tip="${esc(sc.name)}|${esc(sc.desc)}" data-thumb="${sc.id}"><canvas width="256" height="160"></canvas><span class="label">${sc.icon} ${esc(sc.name)}</span></button>`,
      ).join('');
      return `
        ${section('Typ', seg('background.type', [
          { value: 'scene', label: 'Levande', tip: 'Levande plats|Animerade miljöer som rör sig och reagerar på dig.' },
          { value: 'blur', label: 'Oskärpa', tip: 'Oskärpa|Behåll ditt rum men gör det suddigt, som ett proffsobjektiv.' },
          { value: 'image', label: 'Egen', tip: 'Egen bild/video|Använd en egen bild eller video som bakgrund.' },
          { value: 'none', label: 'Ingen', tip: 'Ingen|Visa kamerabilden som den är.' },
          { value: 'green', label: 'Green', tip: 'Greenscreen|Grön bakgrund för Chroma Key i OBS.' },
        ]))}
        ${section('Levande platser', `<div class="grid" style="grid-template-columns:1fr 1fr">${scenes}</div>`)}
        ${section('Egen plats', dropzone('uploadBg', '', 'Lägg till bild eller video', 'Från datorn eller mobilens galleri', 'image/*,video/*'))}
        ${section('Känsla', `
          ${toggle('background.parallax', '3D-djup (parallax)', 'Parallax|Bakgrunden förskjuts när du rör huvudet, så det känns som att du verkligen sitter där.', 'Bakgrunden rör sig med ditt huvud')}
          ${toggle('background.reactive', 'Reagerar på rösten', 'Ljudreaktiv|Ljus och färger i bakgrunden pulserar när du pratar.', 'Ljus pulserar när du pratar')}
          ${toggle('background.filterAffectsBg', 'Filter påverkar bakgrunden', 'Filter på bakgrund|Av = filtret läggs bara på dig, inte på bakgrunden.')}
          ${slider('background.blur', 'Oskärpa-styrka', 0, 1, 0.01, 'pct', 'Oskärpa|Hur suddig bakgrunden blir i oskärpeläget.', 0.7)}`)}
        ${section('Urklipp', `
          ${slider('video.feather', 'Kantmjukhet', 0, 1, 0.01, 'pct', 'Kantmjukhet|Hur mjuk övergången mellan dig och bakgrunden är.', 0.5)}
          ${slider('filter.lightWrap', 'Ljusomslag', 0, 1, 0.01, 'pct', 'Ljusomslag|Låter bakgrundens ljus lysa in över dina kanter – du smälter in.', 0.6)}
          ${slider('filter.relight', 'Smart ljussättning', 0, 1, 0.01, 'pct', 'Smart ljussättning|Ger dig en färgton som matchar platsen.', 0.5)}`)}
        ${section('Stämningsljud', `
          ${toggle('ambience.enabled', 'Stämningsljud', 'Stämningsljud|Ljud som matchar platsen: brasa, regn, publik, vågor, paparazzi…', 'Ljud som matchar platsen')}
          ${slider('ambience.volume', 'Volym', 0, 1, 0.01, 'pct', 'Volym|Hur högt stämningsljudet spelas.', 0.35)}
          ${toggle('ambience.toStream', 'Skicka till sändningen', 'Till sändningen|På = tittarna hör också stämningsljudet. Av = bara du.')}`)}`;
    },
  },
  filter: {
    title: 'Filter',
    sub: 'Stilar och färgsättning. Tryck för att välja – tryck ＋ för att lägga till som extra lager.',
    render: (s) => {
      const extra = s.filter.extra || [];
      const cards = FILTERS.map((f) => {
        const inLayer = extra.some((e) => e.id === f.id);
        return `<button class="card thumb ${inLayer ? 'inlayer' : ''}" data-action="filter" data-arg="${f.id}" data-active-path="filter.id" data-value="${f.id}" data-tip="${esc(f.name)}|${esc(f.desc)} Tryck ＋ för att lägga det ovanpå som ett extra lager." data-fthumb="${f.id}"><canvas width="192" height="120"></canvas><span class="label">${f.icon} ${esc(f.name)}</span>${f.id !== 'none' ? `<span class="addlayer" data-action="addFilterLayer" data-arg="${f.id}" data-tip="Lägg till som lager|Kombinera ${esc(f.name)} med ditt nuvarande filter.">${icon('plus', 14)}</span>` : ''}</button>`;
      }).join('');
      const layerChips = extra.length
        ? `<div class="cats">${extra.map((e, i) => `<button class="chipbtn active" data-action="removeFilterLayer" data-arg="${i}" data-tip="Ta bort lagret|${esc(FILTER_MAP[e.id]?.name ?? e.id)}">${FILTER_MAP[e.id]?.icon ?? ''} ${esc(FILTER_MAP[e.id]?.name ?? e.id)} ✕</button>`).join('')}<button class="chipbtn" data-action="tab" data-arg="layers">${icon('layers', 14)} Alla lager</button></div>`
        : '';
      return `
        ${layerChips ? section('Extra filterlager', layerChips) : ''}
        ${section('Stil', `<div class="grid" style="grid-template-columns:1fr 1fr 1fr">${cards}</div>`)}
        ${slider('filter.intensity', 'Filterstyrka', 0, 1, 0.01, 'pct', 'Filterstyrka|Blanda mellan originalbilden och filtret.', 1)}
        ${section('Justeringar', `
          ${slider('filter.brightness', 'Ljusstyrka', -1, 1, 0.01, 'spct', 'Ljusstyrka|Ljusare eller mörkare bild. Dubbelklicka för att nollställa.', 0)}
          ${slider('filter.contrast', 'Kontrast', -1, 1, 0.01, 'spct', 'Kontrast|Skillnaden mellan ljust och mörkt.', 0)}
          ${slider('filter.saturation', 'Mättnad', -1, 1, 0.01, 'spct', 'Mättnad|Hur starka färgerna är. Helt ner = svartvitt.', 0)}
          ${slider('filter.warmth', 'Färgtemperatur', -1, 1, 0.01, 'spct', 'Färgtemperatur|Varmare (gult) eller kallare (blått) ljus.', 0)}
          ${slider('filter.vignette', 'Vinjett', 0, 1, 0.01, 'pct', 'Vinjett|Mörkare hörn som drar blicken mot mitten.', 0.25)}
          ${slider('filter.grain', 'Filmkorn', 0, 1, 0.01, 'pct', 'Filmkorn|Levande brus som ger en analog filmkänsla.', 0.05)}
          ${slider('filter.sharpen', 'Skärpa', 0, 1, 0.01, 'pct', 'Skärpa|Framhäver detaljer i bilden.', 0.15)}`)}
        ${section('Porträtt', slider('filter.beauty', 'Skönhetsfilter', 0, 1, 0.01, 'pct', 'Skönhetsfilter|Mjukar upp huden – ögon, hår och konturer förblir skarpa.', 0.25))}
        ${btn('resetFilter', 'Återställ justeringar', 'reset', 'Återställ|Nollställ alla justeringar till standard.', 'sm')}`;
    },
  },
  face: {
    title: 'Ansikte',
    sub: 'Saker som sitter fast på huvudet – på dig och på figurerna. Kombinera fritt!',
    render: (s) => {
      const groups = ACC_GROUPS.map((g) => {
        const acc = ACCESSORIES.filter((a) => g.slots.includes(a.slot)).map((a) => card({ action: 'accessory', arg: a.id, activePath: 'face.accessories', emoji: a.icon, name: a.name, desc: a.desc, tip: `${a.name}|${a.desc}` })).join('');
        return section(g.name, `<div class="grid">${acc}</div>`);
      }).join('');
      const active = [s.face.warp, ...(s.face.warps || [])].filter((w) => w && w !== 'none');
      const warps = WARPS.map((w) => card({ action: 'warp', arg: w.id, emoji: w.icon, name: w.name, tip: `${w.name}|${w.desc} ${w.id === 'none' ? '' : 'Tryck på flera för att kombinera!'}`, cls: (w.id === 'none' ? !active.length : active.includes(w.id)) ? 'active' : '' })).join('');
      return `
        <div class="row" style="margin-bottom:14px">${btn('clearAccessories', 'Ta av allt', 'x', 'Ta av allt|Ta bort alla tillbehör.', 'sm')}${btn('tab', 'Emojis i bilden', 'emoji', 'Emojis|Sätt emojis som följer ansiktet.', 'sm', 'stickers')}</div>
        ${groups}
        ${section('Förvrängning', `<div class="grid">${warps}</div>${slider('face.warpStrength', 'Styrka', 0, 1.5, 0.01, 'pct', 'Styrka|Hur kraftig förvrängningen är.', 0.85)}`, 'Förvrängning|Fungerar när du syns i kameran. Välj flera för att kombinera.')}
        ${section('Kamera', `
          ${toggle('video.mirror', 'Spegelvänd bild', 'Spegelvänd|Visa bilden som en spegel (mest naturligt när du tittar på dig själv).')}
          ${toggle('video.autoFrame', 'Auto-inramning', 'Auto-inramning|Kameran zoomar in och följer ditt ansikte mjukt.', 'Zoomar och följer ditt ansikte')}
          ${slider('video.autoFrameZoom', 'Inzoomning', 1, 2.5, 0.01, 'x', 'Inzoomning|Hur nära auto-inramningen zoomar.', 1.35)}`)}`;
    },
  },
  stickers: {
    title: 'Emojis',
    sub: 'Tryck på en emoji så hamnar den i bilden. Dra runt den med fingret eller musen.',
    render: (s) => {
      const place = s.ui.stickerPlace || 'above';
      const set = s.ui.emojiSet || 'faces';
      const items = s.stickers?.items || [];
      const recent = (s.stickers?.recent || []).slice(0, 12);
      const emojiBtn = (kind, value, title) => `<button data-action="addSticker" data-arg="${kind}|${esc(value)}" data-tip="${esc(title)}|Tryck för att lägga i bilden.">${kind === 'skep' ? skepImg(value) : value}</button>`;
      const current = EMOJI_SETS.find((e) => e.id === set) ?? EMOJI_SETS[0];
      const inImage = items
        .map((it) => `<div class="layer" style="--lc:var(--magenta)"><span class="lic">${stickerIcon(it)}</span><div><b>${esc(it.kind === 'text' ? it.value : it.kind === 'skep' ? SKEP_MAP[it.value]?.name ?? 'Emoji' : it.kind === 'image' ? 'Egen bild' : 'Emoji')}</b><small>${it.anchor === 'face' ? 'Följer ansiktet' : 'Fast i bilden'}</small></div><div class="lbtns"><button class="btn sm" data-action="selectSticker" data-arg="${it.id}" data-tip="Markera|Visa handtagen i bilden.">${icon('pointer', 15)}</button><button class="btn sm" data-action="removeSticker" data-arg="${it.id}" data-tip="Ta bort">${icon('trash', 15)}</button></div></div>`)
        .join('');
      return `
        ${section('Var ska den hamna?', `<div class="place-row">${PLACEMENTS.map((p) => `<button class="${p.id === place ? 'active' : ''}" data-action="stickerPlace" data-arg="${p.id}">${p.icon}<span>${p.name}</span></button>`).join('')}</div>`)}
        ${recent.length ? section('Senast använda', `<div class="emoji-grid">${recent.map((r) => { const [k, ...v] = r.split(':'); return emojiBtn(k, v.join(':'), 'Senast använd'); }).join('')}</div>`) : ''}
        ${section('Skepnads egna neon-emojis', `<div class="emoji-grid skep">${SKEP_EMOJIS.map((e) => emojiBtn('skep', e.id, e.name)).join('')}</div>`)}
        ${section('Emojis', `${chips('emojiSet', EMOJI_SETS, set)}<div class="emoji-grid">${current.list.map((e) => emojiBtn('emoji', e, e)).join('')}</div>`)}
        ${section('Text & pratbubblor', `
          <div class="field"><textarea id="sticker-text" maxlength="80" placeholder="Skriv något kul… t.ex. Hej allihopa!"></textarea></div>
          <div class="place-row">${TEXT_STYLES.map((t) => `<button data-action="addText" data-arg="${t.id}">${t.icon}<span>${t.name}</span></button>`).join('')}</div>`)}
        ${section('Egen bild', dropzone('uploadSticker', '', 'Lägg till egen bild som klistermärke', 'PNG med genomskinlig bakgrund blir finast', 'image/*'))}
        ${section(`I bilden nu (${items.length})`, items.length ? `<div class="layers">${inImage}</div><div style="margin-top:10px">${btn('clearStickers', 'Ta bort alla', 'trash', 'Ta bort alla|Rensa alla emojis och texter ur bilden.', 'sm btn-danger')}</div>` : '<p class="muted">Inga emojis i bilden än – tryck på en ovanför!</p>')}
        ${note('Dra för att flytta. Nyp med två fingrar (eller scrolla) för att ändra storlek och vrida. <b>Följer ansiktet</b> = emojin flyttar med huvudet.')}`;
    },
  },
  layers: {
    title: 'Lager',
    sub: 'Allt som syns och hörs just nu – uppifrån och ner. Stäng av, ändra styrka eller ta bort.',
    render: (s, ctx) => {
      const row = ({ ic, title, small, lc = 'var(--cyan)', btns = '', extra = '', off = false }) => `<div class="layer ${off ? 'off' : ''}" style="--lc:${lc}"><span class="lic">${ic}</span><div><b>${title}</b><small>${small}</small></div><div class="lbtns">${btns}</div>${extra}</div>`;
      const b = (action, arg, ic, tip) => `<button class="btn sm" data-action="${action}" data-arg="${esc(arg)}" data-tip="${esc(tip)}">${icon(ic, 15)}</button>`;
      const out = [];
      const items = s.stickers?.items || [];
      out.push('<div class="layer-kind">Överst · grafik</div>');
      out.push(row({ ic: '😀', title: `Emojis & text (${items.length})`, small: items.length ? 'Dra dem direkt i bilden' : 'Inga än', lc: 'var(--magenta)', btns: `${b('tab', 'stickers', 'plus', 'Lägg till|Öppna emojis.')}${items.length ? b('clearStickers', '', 'trash', 'Ta bort alla emojis') : ''}` }));
      if (s.overlays.lowerThird.enabled) out.push(row({ ic: '📺', title: 'Namnskylt', small: `${esc(s.overlays.lowerThird.name)} – ${esc(s.overlays.lowerThird.title)}`, lc: 'var(--magenta)', btns: `${b('tab', 'overlay', 'text', 'Ändra')}${b('toggleLower', '', 'x', 'Stäng av namnskylten')}` }));
      out.push('<div class="layer-kind">Filter</div>');
      const main = FILTER_MAP[s.filter.id];
      out.push(row({ ic: main?.icon ?? '⚪', title: `Huvudfilter: ${esc(main?.name ?? 'Inget')}`, small: s.filter.id === 'none' ? 'Inget filter' : `Styrka ${Math.round(s.filter.intensity * 100)} %`, lc: 'var(--yellow)', btns: `${b('tab', 'filter', 'palette', 'Byt filter')}${s.filter.id !== 'none' ? b('filter', 'none', 'x', 'Ta bort filtret') : ''}` }));
      (s.filter.extra || []).forEach((e, i) => {
        const f = FILTER_MAP[e.id];
        out.push(row({ ic: f?.icon ?? '🎨', title: `Lager ${i + 2}: ${esc(f?.name ?? e.id)}`, small: e.on === false ? 'Avstängt' : `Styrka ${Math.round((e.intensity ?? 1) * 100)} %`, lc: 'var(--yellow)', off: e.on === false, btns: `${b('toggleFilterLayer', i, e.on === false ? 'eye-off' : 'eye', 'Visa/dölj lagret')}${b('removeFilterLayer', i, 'trash', 'Ta bort lagret')}`, extra: `<input type="range" min="0" max="1" step="0.01" value="${e.intensity ?? 1}" data-layer-intensity="${i}" aria-label="Styrka">` }));
      });
      out.push(`<div style="margin:2px 0 6px">${btn('tab', 'Lägg till filterlager', 'plus', 'Fler filter|Välj ett filter och tryck ＋ på det.', 'sm', 'filter')}</div>`);
      out.push('<div class="layer-kind">Ansikte</div>');
      (s.face.accessories || []).forEach((id) => {
        const a = ACCESSORY_MAP[id];
        if (a) out.push(row({ ic: a.icon, title: esc(a.name), small: 'Tillbehör på huvudet', lc: 'var(--lime)', btns: b('accessory', id, 'trash', 'Ta av') }));
      });
      [s.face.warp, ...(s.face.warps || [])].filter((w) => w && w !== 'none').forEach((w) => {
        const d = WARPS.find((x) => x.id === w);
        out.push(row({ ic: d?.icon ?? '🙂', title: esc(d?.name ?? w), small: 'Förvrängning', lc: 'var(--lime)', btns: b('warpOff', w, 'trash', 'Ta bort förvrängningen') }));
      });
      if (!(s.face.accessories || []).length && !(s.face.warps || []).length && (s.face.warp === 'none' || !s.face.warp)) out.push(`<p class="muted" style="margin:4px 0">Inget på ansiktet. ${btn('tab', 'Välj tillbehör', 'face', '', 'sm', 'face')}</p>`);
      out.push('<div class="layer-kind">Du / figuren</div>');
      const av = AVATAR_LIST.find((a) => a.id === s.avatar.id);
      out.push(row({ ic: s.video.mode === 'avatar' ? av?.icon ?? '🤖' : '🧑', title: s.video.mode === 'avatar' ? `Figur: ${esc(av?.name ?? '')}` : 'Du själv (kamera)', small: s.video.mode === 'avatar' ? 'Härmar dina miner' : 'Med urklipp av bakgrunden', btns: `${b('toggleMode', '', 'shuffle', 'Växla mellan du själv och figur')}${b('tab', s.video.mode === 'avatar' ? 'avatar' : 'personas', 'drama', 'Byt')}` }));
      out.push('<div class="layer-kind">Underst · plats</div>');
      const sc = SCENE_MAP[s.background.scene];
      const bgName = { scene: `${sc?.icon ?? ''} ${esc(sc?.name ?? '')}`, blur: 'Suddigt rum', image: 'Egen bild/video', none: 'Ingen bakgrund', green: 'Greenscreen' }[s.background.type];
      out.push(row({ ic: '🏞️', title: `Plats: ${bgName}`, small: s.ambience.enabled ? 'Med stämningsljud' : 'Utan stämningsljud', lc: 'var(--violet)', btns: b('tab', 'background', 'mountain', 'Byt plats') }));
      out.push('<div class="layer-kind">Ljud</div>');
      const v = VOICE_MAP[s.voice.preset];
      out.push(row({ ic: v?.icon ?? '🎛️', title: `Röst: ${s.voice.enabled ? esc(v?.name ?? 'Egen') : 'Naturlig (av)'}`, small: s.voice.muted ? 'Mikrofonen är avstängd' : 'Hörs i sändningen', lc: 'var(--cyan)', off: !s.voice.enabled, btns: `${b('tab', 'voice', 'waveform', 'Byt röst')}${b('toggleMute', '', s.voice.muted ? 'mic-off' : 'mic', 'Mikrofon av/på')}` }));
      return `<div class="layers">${out.join('')}</div>
        <div class="row" style="margin-top:16px">${btn('resetLook', 'Rensa allt', 'reset', 'Rensa allt|Tar bort filter, tillbehör, förvrängningar och emojis – du blir dig själv igen.', 'btn-danger')}${btn('savePersona', 'Spara som skepnad', 'save', 'Spara|Spara hela lagerstacken som en egen skepnad.')}</div>`;
    },
  },
  voice: {
    title: 'Röst',
    sub: 'Låt som någon annan – i realtid, med låg fördröjning.',
    render: (s) => {
      const groups = VOICE_GROUPS.map((g) =>
        section(
          `${g.icon} ${g.name}`,
          `<div class="grid">${VOICES.filter((v) => v.group === g.id)
            .map((v) => card({ action: 'voice', arg: v.id, activePath: 'voice.preset', emoji: v.icon, name: v.name, desc: v.desc, tip: `${v.name}|${v.desc}` }))
            .join('')}</div>`,
        ),
      ).join('');
      const keys = KEYS.map((k, i) => ({ value: i, label: k }));
      return `
        <div class="section">
          ${toggle('voice.enabled', 'Röstförvrängning', 'Röstförvrängning|Av = din vanliga röst går igenom, men brusspärr och kompressor finns kvar.', 'Stäng av för att snabbt låta som dig själv')}
          <div class="row" style="margin-top:6px" data-tip="Nivåer|Vänster: mikrofonen in. Höger: det tittarna hör.">
            <div class="meter" data-meter="in" style="flex:1"></div><div class="meter" data-meter="out" style="flex:1"></div>
          </div>
          <div class="tuner" data-tuner ${s.voice.params.autotune ? '' : 'hidden'} style="margin-top:10px" data-tip="Stämapparat|Visar tonen du sjunger och hur mycket autotunen korrigerar."><div class="note-name">–</div><div class="bar"><i></i></div></div>
        </div>
        ${groups}
        ${section('Finjustera', `
          ${note('Dra i reglagen för att skapa en helt egen röst. Dubbelklicka på ett reglage för att nollställa det.')}
          <div style="height:10px"></div>
          ${slider('voice.params.pitch', 'Tonhöjd', -12, 12, 1, 'st', 'Tonhöjd|Ljusare eller mörkare röst i halvtoner. +12 = en oktav upp.', 0)}
          ${select('voice.params.harmony', 'Stämmor (kör)', [
            { value: '', label: 'Inga' },
            { value: '4,7', label: 'Durackord' },
            { value: '3,7', label: 'Mollackord' },
            { value: '4,7,12', label: 'Stor kör' },
            { value: '7', label: 'Kvint' },
            { value: '12', label: 'Oktav upp' },
            { value: '-12', label: 'Oktav ner (demon)' },
            { value: '-12,12', label: 'Oktaver' },
          ], { type: 'arr', tip: 'Stämmor|Lägger till extra röster i harmoni med din – du blir en hel kör.' })}
          ${slider('voice.params.harmonyMix', 'Stämmornas volym', 0, 1, 0.01, 'pct', 'Stämmornas volym|Hur starka de extra rösterna är.', 0.55)}
          ${slider('voice.params.robot', 'Robot', 0, 1, 0.01, 'pct', 'Robot|Ringmodulering som gör rösten metallisk.', 0)}
          ${slider('voice.params.ringFreq', 'Robotfrekvens', 5, 200, 1, 'hz', 'Robotfrekvens|Låg = darrig/raspig, hög = klassisk robot.', 55)}
          ${slider('voice.params.tone', 'Klangfärg', -1, 1, 0.01, 'spct', 'Klangfärg|Mörkare/fylligare eller ljusare/skarpare röst.', 0)}
          ${slider('voice.params.radio', 'Radio/telefon', 0, 1, 0.01, 'pct', 'Radio|Smalare frekvensband, som genom en radio eller telefon.', 0)}
          ${slider('voice.params.distortion', 'Distorsion', 0, 1, 0.01, 'pct', 'Distorsion|Överstyrd, grusig röst.', 0)}
          ${slider('voice.params.chorus', 'Chorus', 0, 1, 0.01, 'pct', 'Chorus|Tjockare, svävande röst som om flera pratar samtidigt.', 0)}
          ${slider('voice.params.wobble', 'Vobbel', 0, 1, 0.01, 'pct', 'Vobbel|Svajig undervattenseffekt.', 0)}
          ${slider('voice.params.tremolo', 'Tremolo', 0, 1, 0.01, 'pct', 'Tremolo|Darrande volym, som en gammal eller rädd röst.', 0)}
          ${slider('voice.params.tremoloRate', 'Tremolohastighet', 2, 14, 0.1, 'hz', 'Tremolohastighet|Hur snabbt rösten darrar.', 5)}
          ${slider('voice.params.echo', 'Eko', 0, 1, 0.01, 'pct', 'Eko|Studsande repetitioner av din röst.', 0)}
          ${slider('voice.params.echoTime', 'Ekotid', 0.04, 0.8, 0.01, 'ms', 'Ekotid|Tid mellan ekona.', 0.28)}
          ${slider('voice.params.echoFeedback', 'Ekorepetitioner', 0, 0.85, 0.01, 'pct', 'Ekorepetitioner|Hur många gånger ekot upprepas.', 0.35)}
          ${slider('voice.params.reverb', 'Rumsklang', 0, 1, 0.01, 'pct', 'Rumsklang|Låter som att du står i ett rum, en kyrka eller en grotta.', 0)}
          ${slider('voice.params.reverbSize', 'Rumsstorlek', 0, 1, 0.01, 'pct', 'Rumsstorlek|Litet rum ↔ enorm katedral.', 0.5)}
          ${slider('voice.params.noise', 'Brus/statik', 0, 1, 0.01, 'pct', 'Brus|Lägg till radiobrus.', 0)}
          ${slider('voice.params.vocoder', 'Vocoder', 0, 1, 0.01, 'pct', 'Vocoder|Rösten styr en synt som spelar ett ackord.', 0)}
          ${toggle('voice.params.squelch', 'Walkie-brusklick', 'Brusklick|Ett "kssht" när du börjar och slutar prata, som en walkie-talkie.')}`)}
        ${section('Autotune & vocoder', `
          ${toggle('voice.params.autotune', 'Autotune', 'Autotune|Drar din tonhöjd till närmaste ton i vald tonart. Hög hastighet = robotisk effekt.')}
          <div class="row">${select('voice.params.autotuneKey', 'Tonart', keys, { type: 'num', tip: 'Tonart|Vilken tonart autotunen ska snappa till.' })}${select('voice.params.autotuneScale', 'Skala', [
            { value: 'major', label: 'Dur' },
            { value: 'minor', label: 'Moll' },
            { value: 'pentatonic', label: 'Pentatonisk' },
            { value: 'blues', label: 'Blues' },
            { value: 'chromatic', label: 'Kromatisk' },
          ], { tip: 'Skala|Vilka toner som är tillåtna.' })}</div>
          ${slider('voice.params.autotuneSpeed', 'Hastighet', 0, 1, 0.01, 'pct', 'Hastighet|Låg = naturlig korrigering, hög = hård robotisk snapp.', 0.85)}
          ${select('voice.params.vocoderKey', 'Vocoder-ackord', keys.map((k) => ({ ...k, label: `${k.label}-moll` })), { type: 'num', tip: 'Vocoder-ackord|Vilket ackord vocodern spelar.' })}`)}
        ${section('Mikrofon', `
          ${select('voice.micId', 'Mikrofon', [{ value: '', label: 'Standard' }], { tip: 'Mikrofon|Välj vilken mikrofon som används.' })}
          ${slider('voice.inputGain', 'Förstärkning', 0, 3, 0.01, 'x', 'Förstärkning|Höj om du låter för svag, sänk om det sprakar.', 1)}
          ${slider('voice.gate', 'Brusspärr', -90, -20, 1, 'db', 'Brusspärr|Tystar bakgrundsljud när du inte pratar.', -58)}
          ${toggle('voice.noiseSuppression', 'Brusreducering', 'Brusreducering|Webbläsarens inbyggda filtrering av fläktar och brus.')}
          ${toggle('voice.muted', 'Stäng av mikrofonen', 'Mikrofon av|Ingen röst skickas ut.', 'Snabbtangent: M')}`)}
        ${section('Hör dig själv', `
          ${toggle('voice.monitor', 'Medhörning', 'Medhörning|Hör din förvrängda röst i realtid.', 'Använd hörlurar!')}
          ${slider('voice.monitorVolume', 'Medhörningsvolym', 0, 1.5, 0.01, 'pct', 'Volym|Hur högt du hör dig själv.', 0.8)}
          ${note('Använd hörlurar när medhörning är på – annars kan det bli rundgång (tjut).', 'warn', 'headphones')}`)}`;
    },
  },
  soundboard: {
    title: 'Ljudbord',
    sub: 'Ljudeffekter som hörs i sändningen. Alla ljud skapas live i appen.',
    render: (s) => {
      const pads = SOUNDS.map((snd, i) => card({ action: 'sfx', arg: snd.id, emoji: snd.icon, name: snd.name, tip: `${snd.name}|${snd.desc}`, key: i < 9 ? String(i + 1) : '', cls: 'pad' })).join('');
      const custom = (s.soundboard.custom || []).map((c) => card({ action: 'sfx', arg: c.id, emoji: '🎵', name: c.name, tip: `${c.name}|Ditt eget ljud.`, cls: 'pad' })).join('');
      const list = (s.soundboard.custom || []).map((c) => `<div class="list-item">🎵<span class="grow">${esc(c.name)}</span><button class="btn sm icon-only" data-action="deleteSound" data-arg="${esc(c.id)}" data-tip="Ta bort|Radera ljudet.">${icon('trash', 14)}</button></div>`).join('');
      return `
        ${section('Ljud', `<div class="grid pads">${pads}${custom}</div>`)}
        ${slider('soundboard.volume', 'Volym', 0, 1.5, 0.01, 'pct', 'Volym|Ljudbordets volym.', 0.7)}
        ${toggle('soundboard.toStream', 'Skicka till sändningen', 'Till sändningen|På = tittarna hör ljuden. Av = bara du hör dem.')}
        ${section('Egna ljud', `<div class="row" style="margin-bottom:10px">${btn('recordSound', 'Spela in eget ljud (3 s)', 'mic', 'Spela in ljud|Säg eller gör ett ljud i mikrofonen – det blir en ny knapp i ljudbordet.', 'sm')}</div>${dropzone('uploadSound', '', 'Lägg till ljudfil', 'MP3, WAV, OGG – sparas i appen', 'audio/*')}${list ? `<div class="list" style="margin-top:10px">${list}</div>` : ''}`)}
        ${note('Tangenterna <kbd>1</kbd>–<kbd>9</kbd> spelar de nio första ljuden.')}`;
    },
  },
  effects: {
    title: 'Effekter',
    sub: 'Konfetti, hjärtan och kaos – via knappar, handgester eller ansiktsuttryck.',
    render: () => {
      const keys = { confetti: 'C', hearts: 'L', bonk: 'T', fireworks: 'Y' };
      const fx = EFFECTS.map((e) => card({ action: 'effect', arg: e.id, emoji: e.icon, name: e.name, desc: e.desc, tip: `${e.name}|${e.desc} Chattkommando: !${e.cmd}`, key: keys[e.id] || '' })).join('');
      const thr = THROWABLES.map((t) => card({ action: 'throw', arg: t.id, emoji: t.char, name: t.name, tip: `Kasta ${t.name.toLowerCase()}|Flyger in och träffar huvudet med ett ${t.text}` })).join('');
      const gestures = [
        ['Thumb_Up', '👍', 'Tummen upp'],
        ['Victory', '✌️', 'V-tecken'],
        ['Open_Palm', '✋', 'Öppen hand'],
        ['ILoveYou', '🤟', 'Rock/kärlek'],
        ['Pointing_Up', '☝️', 'Peka upp'],
        ['Closed_Fist', '✊', 'Knytnäve'],
        ['Thumb_Down', '👎', 'Tummen ner'],
      ];
      const opts = [{ value: '', label: '— Ingen —' }, ...EFFECTS.map((e) => ({ value: e.id, label: `${e.icon} ${e.name}` }))];
      const gRows = gestures.map(([k, e, n]) => `<div class="row" style="margin-bottom:6px"><span style="flex:0 0 120px;font-size:13px">${e} ${n}</span>${select(`effects.gestureMap.${k}`, '', opts).replace('<label></label>', '')}</div>`).join('');
      return `
        ${section('Roliga lägen', `<div class="grid wide">
          ${card({ action: 'booth', arg: '', emoji: '📸', name: 'Fotobås', desc: '4 bilder med nedräkning → en fotoremsa att dela.', tip: 'Fotobås|Fyra foton i rad med nedräkning – blir en snygg remsa du kan spara och dela.' })}
          ${card({ action: 'random', arg: '', emoji: '🎲', name: 'Överraska mig', desc: 'Slumpa figur, plats, röst och emoji.', tip: 'Överraska mig|Slumpar en helt ny look. Tryck igen och igen!' })}
          ${card({ action: 'screenshot', arg: '', emoji: '🖼️', name: 'Ta ett foto', desc: 'Sparar en bild av det tittarna ser.', tip: 'Foto|Sparar en skärmdump (P).' })}
        </div>`)}
        ${section('Tryck för effekt', `<div class="grid">${fx}</div>`)}
        ${section('Kasta saker på dig själv', `<div class="grid">${thr}</div>`, 'Kasta|Inspirerat av VTuber-appar: tittare kan kasta saker på dig via chatten (!bonk).')}
        ${section('Handgester', `${toggle('effects.gestures', 'Gestigenkänning', 'Gester|Visa en handgest i kameran – håll den en halv sekund så triggas effekten.')}<div style="margin-top:8px">${gRows}</div>`)}
        ${section('Uttrycksmagi', `
          ${toggle('effects.expressions', 'Uttrycksmagi', 'Uttrycksmagi|Dina ansiktsuttryck triggar effekter automatiskt.')}
          ${toggle('effects.expressionMap.breath', 'Gapa stort → eldsprutare 🔥', 'Eldsprutare|Håll munnen vidöppen i en halv sekund.')}
          ${toggle('effects.expressionMap.sparkle', 'Stort leende → gnistor ✨', 'Gnistor|Le stort!')}
          ${toggle('effects.expressionMap.wink', 'Blinka → stjärna 😉', 'Stjärnblink|Blinka med ett öga.')}
          ${toggle('effects.expressionMap.kiss', 'Pussmun → slängpuss 💋', 'Slängpuss|Gör en pussmun.')}
          ${toggle('effects.expressionMap.surprise', 'Förvånad → utropstecken ❗', 'Chock|Höj ögonbrynen och öppna munnen.')}`)}
        ${section('Trollstav', toggle('effects.wand', 'Magisk trollstav 🪄', 'Trollstav|Ditt pekfinger lämnar ett glittrande spår i luften. Kräver att handen syns i kameran.', 'Pekfingret ritar gnistor i luften'))}`;
    },
  },
  overlay: {
    title: 'Text & TV',
    sub: 'Grafik ovanpå bilden – filtren påverkar inte texten.',
    render: () => `
      ${section('Namnskylt', `
        ${toggle('overlays.lowerThird.enabled', 'Visa namnskylt', 'Namnskylt|En snygg skylt med ditt namn nere i vänstra hörnet, som på TV.')}
        <div class="field"><label>Namn</label><input type="text" data-bind="overlays.lowerThird.name" maxlength="40"></div>
        <div class="field"><label>Undertext</label><input type="text" data-bind="overlays.lowerThird.title" maxlength="60"></div>
        ${seg('overlays.lowerThird.style', [
          { value: 'glass', label: 'Glas', tip: 'Glas|Frostat glas med gradient – stilren.' },
          { value: 'neon', label: 'Neon', tip: 'Neon|Glödande neonskylt.' },
          { value: 'minimal', label: 'Minimal', tip: 'Minimal|Bara text och en tunn linje.' },
          { value: 'news', label: 'Nyheter', tip: 'Nyheter|Som en nyhetssändning – BREAKING!' },
        ])}`)}
      ${section('Pratbubblor & meme-text', `<p class="muted" style="margin:0 0 8px">Text som går att dra runt i bilden finns under Emojis.</p>${btn('tab', 'Öppna Emojis', 'emoji', '', 'sm', 'stickers')}`)}
      ${section('Live-textning', `
        ${toggle('overlays.captions.enabled', 'Visa textning', 'Live-textning|Det du säger visas som text i bilden. Använder webbläsarens taligenkänning (kräver internet).', 'Tal blir text i realtid')}
        ${select('overlays.captions.lang', 'Språk', [
          { value: 'sv-SE', label: 'Svenska' },
          { value: 'en-US', label: 'Engelska' },
          { value: 'nb-NO', label: 'Norska' },
          { value: 'da-DK', label: 'Danska' },
          { value: 'fi-FI', label: 'Finska' },
          { value: 'de-DE', label: 'Tyska' },
          { value: 'es-ES', label: 'Spanska' },
        ], { tip: 'Språk|Vilket språk du pratar.' })}`)}
      ${section('Mer', `
        ${toggle('overlays.live', 'LIVE-märke', 'LIVE|Pulserande LIVE-märke med sändningstid.')}
        ${toggle('overlays.clock', 'Klocka', 'Klocka|Visa aktuell tid uppe till höger.')}
        ${toggle('overlays.chatAlerts', 'Chattnotiser', 'Chattnotiser|Visa vem i Twitch-chatten som triggade en effekt.')}
        <div class="field" style="margin-top:6px"><label>Ram</label>${seg('overlays.frame', [
          { value: 'none', label: 'Ingen', tip: 'Ingen ram' },
          { value: 'neon', label: 'Neon', tip: 'Neonram|Animerad glödande kant.' },
          { value: 'cinema', label: 'Biograf', tip: 'Biograf|Svarta filmränder upptill och nertill (2.39:1).' },
        ])}</div>`)}`,
  },
  settings: {
    title: 'Inställningar',
    sub: 'Prestanda, kamera, nedräkning och hjälp.',
    render: (s, ctx) => `
      ${section('Nedräkning', `
        <div class="field"><label>Innan inspelning, foto och live</label>${seg('ui.countdown', [
          { value: 0, label: 'Av', tip: 'Av|Startar direkt.' },
          { value: 3, label: '3 s', tip: '3 sekunder|3-2-1 och sen kör vi!' },
          { value: 5, label: '5 s', tip: '5 sekunder|Hinner sätta dig till rätta.' },
          { value: 10, label: '10 s', tip: '10 sekunder|Perfekt när mobilen står på ett stativ.' },
        ], { type: 'num' })}</div>`)}
      ${section('Kamera & format', `
        ${select('video.cameraId', 'Kamera', [{ value: '', label: 'Standard' }], { tip: 'Kamera|Välj vilken kamera som används.' })}
        <div class="field"><label>Mobilkamera</label>${seg('video.facing', [
          { value: 'user', label: 'Framsida (selfie)', icon: 'user', tip: 'Selfiekameran' },
          { value: 'environment', label: 'Baksida', icon: 'camera', tip: 'Bakre kameran' },
        ])}</div>
        <div class="field"><label>Format</label>${seg('video.aspect', [
          { value: 'landscape', label: 'Liggande 16:9', icon: 'landscape', tip: 'Liggande|För YouTube, Twitch och samtal.' },
          { value: 'portrait', label: 'Stående 9:16', icon: 'portrait', tip: 'Stående|För TikTok, Shorts, Reels och mobilen.' },
        ])}</div>`)}
      ${section('Prestanda', `
        ${seg('video.quality', [
          { value: 'high', label: '1080p', tip: 'Hög|Skarpast bild. Kräver en bra grafikkort.' },
          { value: 'balanced', label: '720p', tip: 'Balanserad|Bra kvalitet och flyt för de flesta datorer.' },
          { value: 'fast', label: '540p', tip: 'Snabb|För mobiler, äldre datorer och bärbara.' },
        ])}
        <p style="font-size:12px;color:var(--muted)" data-perf>–</p>`)}
      ${section('Gränssnitt', `
        <div class="field"><label>Utseende</label>${seg('ui.layout', [
          { value: 'auto', label: 'Automatiskt', tip: 'Automatiskt|Mobilvy på telefoner, datorvy annars.' },
          { value: 'mobile', label: 'Mobilvy', icon: 'smartphone', tip: 'Mobilvy|Helskärmskamera med knappar som i Snapchat/TikTok.' },
          { value: 'desktop', label: 'Datorvy', icon: 'landscape', tip: 'Datorvy|Paneler och verktyg bredvid bilden.' },
        ])}</div>
        ${toggle('ui.sounds', 'Knappljud', 'Knappljud|Digitala klick när du trycker och hovrar. Hörs bara för dig, aldrig i sändningen.')}
        ${slider('ui.soundVolume', 'Volym', 0, 1, 0.01, 'pct', 'Volym|Knappljudens volym.', 0.55)}
        ${toggle('ui.tooltips', 'Förklaringar', 'Förklaringar|Visa de här små hjälprutorna (håll inne en knapp på mobilen).')}
        ${toggle('ui.reducedMotion', 'Mindre rörelse', 'Mindre rörelse|Stänger av animationer och 3D-lutning i gränssnittet.')}`)}
      ${section('Hjälp', `<div class="row">${btn('tour', 'Guidad tur', 'pointer', 'Guidad tur|En snabb rundtur i appen.')}${btn('help', 'Hjälp & tangenter', 'keyboard', 'Hjälp|Kom igång, streaming-guide och alla snabbtangenter.')}</div>`)}
      ${ctx.installable ? section('Installera', btn('install', 'Lägg Skepnad på hemskärmen', 'download', 'Installera|Lägger Skepnad som en app med egen ikon.', 'btn-primary')) : ''}
      ${section('Återställ', btn('resetAll', 'Återställ alla inställningar', 'reset', 'Återställ allt|Tar bort alla inställningar och sparade skepnader.', 'btn-danger'))}
      <p style="color:var(--faint);font-size:12px;line-height:1.6">Skepnad 2.0 · Allt körs i din egen enhet.<br>Byggd med three.js, MediaPipe och Web Audio.</p>`,
  },
  menu: {
    title: 'Meny',
    sub: 'Allt i Skepnad.',
    render: (s, ctx) => `<div class="grid">${TABS.filter((t) => t.id !== 'menu').map((t) => `<button class="card" data-action="tab" data-arg="${t.id}" data-tip="${esc(t.tip)}"><span class="emoji">${icon(t.icon, 28)}</span><span class="name">${esc(t.label)}</span></button>`).join('')}</div>
      <div style="height:14px"></div>
      <div class="row">${btn('help', 'Hjälp', 'help', '', '')}${ctx.installable ? btn('install', 'Installera appen', 'download', '', 'btn-primary') : ''}</div>`,
  },
};

export function panelFor(id) {
  return SHARE_PANELS[id] ?? PANELS[id] ?? SHARE_PANELS.home;
}
