// Panelinnehåll för varje flik. Rent deklarativ HTML + bindningar (bind.js) och
// actions (data-action) som hanteras i main.js.
import { icon } from './icons.js';
import { SCENES } from '../render/backgrounds/scenes.js';
import { FILTERS } from '../render/filters.js';
import { ACCESSORIES } from '../render/ar/accessories.js';
import { WARPS } from '../render/faceWarp.js';
import { AVATAR_LIST } from '../avatar/avatarLayer.js';
import { VOICES, KEYS } from '../audio/voices.js';
import { SOUNDS } from '../audio/sfx.js';
import { EFFECTS } from '../app/effects.js';
import { THROWABLES } from '../render/fx/throwables.js';
import { BUILTIN_PERSONAS } from '../app/personas.js';
import { SHARE_TABS, SHARE_PANELS } from './panelsShare.js';

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
export const card = ({ action, arg, activePath, value, emoji, name, desc, tip, key, cls = '' }) =>
  `<button class="card ${cls}" data-action="${action}" data-arg="${esc(arg)}"${activePath ? ` data-active-path="${activePath}" data-value="${esc(value ?? arg)}"` : ''}${tipAttr(tip)}${key ? ` data-key="${key}"` : ''}><span class="emoji">${emoji}</span><span class="name">${esc(name)}</span>${desc ? `<span class="desc">${esc(desc)}</span>` : ''}${key ? `<kbd>${key}</kbd>` : ''}</button>`;
const btn = (action, label, ic, tip, cls = '', arg = '') =>
  `<button class="btn ${cls}" data-action="${action}"${arg ? ` data-arg="${esc(arg)}"` : ''}${tipAttr(tip)}>${ic ? icon(ic, 16) : ''}<span>${label}</span></button>`;
const dropzone = (action, arg, title, sub, accept) =>
  `<label class="dropzone" data-drop="${action}" data-arg="${arg}" data-tip="${esc(title)}|${esc(sub)}">${icon('upload', 20)}<b>${title}</b><span>${sub}</span><input type="file" accept="${accept}" hidden data-file="${action}" data-arg="${arg}"></label>`;

export const TABS = [
  { id: 'home', ...SHARE_TABS.home },
  { id: 'personas', icon: 'drama', label: 'Skepnader', tip: 'Skepnader|Färdiga kombinationer av utseende och röst. Byt hela din look med ett klick.' },
  { id: 'avatar', icon: 'bot', label: 'Avatar', tip: 'Avatar|Byt ut dig själv mot en 3D-figur som härmar dina miner och huvudrörelser.' },
  { id: 'background', icon: 'mountain', label: 'Bakgrund', tip: 'Bakgrund|Levande platser, oskärpa, egen bild eller greenscreen bakom dig.' },
  { id: 'filter', icon: 'palette', label: 'Filter', tip: 'Filter|Färgsättning och stileffekter på bilden: film, noir, VHS, serietidning…' },
  { id: 'face', icon: 'face', label: 'Ansikte', tip: 'Ansikte|3D-tillbehör som sitter fast på huvudet och roliga ansiktsförvrängningar.' },
  { id: 'voice', icon: 'waveform', label: 'Röst', tip: 'Röst|Låt som någon annan: robot, demon, autotune, kör, radio och mycket mer.' },
  { id: 'soundboard', icon: 'drum', label: 'Ljudbord', tip: 'Ljudbord|Spela ljudeffekter i sändningen: tuta, applåder, trumvirvel…' },
  { id: 'effects', icon: 'party', label: 'Effekter', tip: 'Effekter|Konfetti, hjärtan, fyrverkeri – via knappar, gester eller ansiktsuttryck.' },
  { id: 'overlay', icon: 'layers', label: 'Overlay', tip: 'Overlay|Namnskylt, live-textning, klocka och LIVE-märke ovanpå bilden.' },
  { id: 'clips', group: 'share', ...SHARE_TABS.clips },
  { id: 'live', ...SHARE_TABS.live },
  { id: 'calls', ...SHARE_TABS.calls },
  { id: 'phone', ...SHARE_TABS.phone },
  { id: 'settings', icon: 'settings', label: 'Inställn.', tip: 'Inställningar|Kvalitet, gränssnittsljud, hjälp och återställning.' },
];

const PANELS = {
  personas: {
    title: 'Skepnader',
    sub: 'Hela looken – utseende, bakgrund, filter och röst – med ett klick.',
    render: (s) => {
      const builtins = BUILTIN_PERSONAS.map((p, i) =>
        card({ action: 'persona', arg: p.id, activePath: 'personas.active', emoji: p.icon, name: p.name, desc: p.desc, tip: `${p.name}|${p.desc}`, key: i < 9 ? `⇧${i + 1}` : '' }),
      ).join('');
      const custom = (s.personas.custom || [])
        .map((p) => `<div style="position:relative">${card({ action: 'persona', arg: p.id, activePath: 'personas.active', emoji: p.icon || '⭐', name: p.name, desc: 'Din egen skepnad', tip: `${p.name}|Din sparade skepnad. Klicka för att byta till den.` })}<button class="btn sm icon-only" style="position:absolute;bottom:8px;right:8px;width:28px;height:28px" data-action="deletePersona" data-arg="${esc(p.id)}" data-tip="Ta bort|Radera den här skepnaden.">${icon('trash', 14)}</button></div>`)
        .join('');
      return `
        ${section('Färdiga skepnader', `<div class="grid wide">${builtins}</div>`)}
        ${section('Dina skepnader', `${custom ? `<div class="grid wide" style="margin-bottom:12px">${custom}</div>` : ''}${btn('savePersona', 'Spara nuvarande look som skepnad', 'save', 'Spara skepnad|Sparar allt du ställt in just nu (avatar, bakgrund, filter, tillbehör och röst) så att du kan byta tillbaka med ett klick.', 'btn-primary')}`)}
        ${note('Tryck <kbd>Shift</kbd> + <kbd>1</kbd>–<kbd>9</kbd> för att byta skepnad blixtsnabbt mitt i sändningen – med en häftig förvandlingseffekt.')}`;
    },
  },
  avatar: {
    title: 'Avatar',
    sub: 'Bli en 3D-figur som härmar dina ögon, mun, ögonbryn och huvudrörelser.',
    render: (s) => {
      const id = s.avatar.id;
      const cards = AVATAR_LIST.map((a) => card({ action: 'avatar', arg: a.id, activePath: 'avatar.id', emoji: a.icon, name: a.name, desc: a.desc, tip: `${a.name}|${a.desc}` })).join('');
      const def = AVATAR_LIST.find((a) => a.id === id);
      const colorKeys = Object.keys(def?.defaults ?? {}).filter((k) => ['primary', 'accent', 'glow'].includes(k));
      const labels = { primary: 'Huvudfärg', accent: 'Detaljer', glow: 'Glöd' };
      const colors = colorKeys.length
        ? `<div class="colors">${colorKeys.map((k) => `<label class="color" data-tip="${labels[k]}|Klicka för att välja färg."><input type="color" data-bind="avatar.colors.${id}.${k}">${labels[k]}</label>`).join('')}</div>
           <div style="margin-top:10px">${btn('resetColors', 'Återställ färger', 'reset', 'Återställ|Tillbaka till avatarens originalfärger.', 'sm')}</div>`
        : '<p class="note">Den här avataren har inga färgval.</p>';
      return `
        ${section('Läge', seg('video.mode', [
          { value: 'camera', label: 'Kamera', icon: 'video', tip: 'Kamera|Visa dig själv med bakgrund, filter och AR-tillbehör.' },
          { value: 'avatar', label: 'Avatar', icon: 'bot', tip: 'Avatar|Ersätt dig själv med en 3D-avatar som följer dina miner.' },
        ], { big: true }))}
        ${section('Välj avatar', `<div class="grid">${cards}</div>`)}
        ${section('Färger', colors)}
        ${section('Placering', `
          ${slider('avatar.scale', 'Storlek', 0.6, 1.6, 0.01, 'x', 'Storlek|Hur stor avataren är i bild. Dubbelklicka för att återställa.', 1)}
          ${slider('avatar.offsetY', 'Höjd', -0.8, 0.8, 0.01, 'spct', 'Höjd|Flytta avataren upp eller ner.', 0)}
          ${slider('avatar.headFollow', 'Huvudföljning', 0, 1.5, 0.01, 'pct', 'Huvudföljning|Hur mycket avatarens huvud följer dina rörelser. Över 100 % blir det överdrivet och roligt!', 1)}`)}
        ${section('Egen 3D-modell', `${dropzone('uploadModel', '', 'Ladda VRM eller GLB', 'Släpp en fil här eller klicka. VRoid Studio, Ready Player Me m.fl.', '.vrm,.glb,.gltf')}
          <div id="custom-model-name" class="note" style="margin-top:10px" hidden></div>`)}
        ${section('PNG-tuber-bilder', `<div class="grid" style="grid-template-columns:1fr 1fr">
          ${dropzone('uploadPng', 'idle', 'Tyst', 'Bild när du inte pratar', 'image/*')}
          ${dropzone('uploadPng', 'talk', 'Pratar', 'Bild när du pratar', 'image/*')}
          ${dropzone('uploadPng', 'blink', 'Blinkar', 'Valfri', 'image/*')}
          ${dropzone('uploadPng', 'blinkTalk', 'Blinkar + pratar', 'Valfri', 'image/*')}</div>
          <div style="margin-top:10px">${toggle('avatar.pngDim', 'Dämpa när tyst', 'Dämpa när tyst|Bilden blir lite mörkare när du inte pratar – populärt i Discord-stil.')}</div>
          ${btn('clearPng', 'Använd standardfiguren', 'reset', 'Rensa|Ta bort dina uppladdade PNG-bilder.', 'sm')}`)}
        ${note('Avatarläget fungerar även utan kamera – då rör sig munnen efter din röst och avataren blinkar av sig själv.')}`;
    },
  },
  background: {
    title: 'Bakgrund',
    sub: 'Placera dig på en levande, mysig plats – eller sudda ut rummet bakom dig.',
    render: () => {
      const scenes = SCENES.map(
        (sc) => `<button class="card thumb" data-action="scene" data-arg="${sc.id}" data-active-path="background.scene" data-value="${sc.id}" data-tip="${esc(sc.name)}|${esc(sc.desc)} Håll musen över för att se den levande förhandsvisningen." data-thumb="${sc.id}"><canvas width="256" height="160"></canvas><span class="label">${sc.icon} ${esc(sc.name)}</span></button>`,
      ).join('');
      return `
        ${section('Typ', seg('background.type', [
          { value: 'scene', label: 'Levande', tip: 'Levande plats|Animerade 3D-miljöer som rör sig och reagerar på dig.' },
          { value: 'blur', label: 'Oskärpa', tip: 'Oskärpa|Behåll ditt rum men gör det suddigt, som ett proffsobjektiv.' },
          { value: 'image', label: 'Egen', tip: 'Egen bild/video|Använd en egen bild eller video som bakgrund.' },
          { value: 'none', label: 'Ingen', tip: 'Ingen|Visa kamerabilden som den är.' },
          { value: 'green', label: 'Green', tip: 'Greenscreen|Grön bakgrund för Chroma Key i OBS – lägg dig ovanpå spelet!' },
        ]))}
        ${section('Levande platser', `<div class="grid" style="grid-template-columns:1fr 1fr">${scenes}</div>`)}
        ${section('Känsla', `
          ${toggle('background.parallax', '3D-djup (parallax)', 'Parallax|Bakgrunden förskjuts när du rör huvudet, så det känns som att du verkligen sitter där.', 'Bakgrunden rör sig med ditt huvud')}
          ${toggle('background.reactive', 'Reagerar på rösten', 'Ljudreaktiv|Ljus och färger i bakgrunden pulserar när du pratar.', 'Ljus pulserar när du pratar')}
          ${toggle('background.filterAffectsBg', 'Filter påverkar bakgrunden', 'Filter på bakgrund|Av = filtret läggs bara på dig, inte på bakgrunden.')}
          ${slider('background.blur', 'Oskärpa-styrka', 0, 1, 0.01, 'pct', 'Oskärpa|Hur suddig bakgrunden blir i oskärpeläget.', 0.7)}`)}
        ${section('Urklipp', `
          ${slider('video.feather', 'Kantmjukhet', 0, 1, 0.01, 'pct', 'Kantmjukhet|Hur mjuk övergången mellan dig och bakgrunden är. Högre = mjukare hår och kanter.', 0.5)}
          ${slider('filter.lightWrap', 'Ljusomslag', 0, 1, 0.01, 'pct', 'Ljusomslag|Låter bakgrundens ljus lysa in över dina kanter – får dig att smälta in naturligt (proffsteknik från film).', 0.6)}
          ${slider('filter.relight', 'Smart ljussättning', 0, 1, 0.01, 'pct', 'Smart ljussättning|Ger dig en färgton som matchar platsen – varm vid brasan, blå i norrskenet.', 0.5)}`)}
        ${section('Stämningsljud', `
          ${toggle('ambience.enabled', 'Stämningsljud', 'Stämningsljud|Syntetiserade ljud som matchar platsen: sprakande brasa, regn, fåglar, bubblor…', 'Ljud som matchar platsen')}
          ${slider('ambience.volume', 'Volym', 0, 1, 0.01, 'pct', 'Volym|Hur högt stämningsljudet spelas.', 0.35)}
          ${toggle('ambience.toStream', 'Skicka till sändningen', 'Till sändningen|På = tittarna hör också stämningsljudet. Av = bara du.')}`)}
        ${section('Egen bakgrund', dropzone('uploadBg', '', 'Ladda bild eller video', 'JPG, PNG, GIF, MP4, WebM', 'image/*,video/*'))}`;
    },
  },
  filter: {
    title: 'Filter',
    sub: 'Stilar och färgsättning. Förhandsvisningarna visar din riktiga bild.',
    render: () => {
      const cards = FILTERS.map(
        (f) => `<button class="card thumb" data-action="filter" data-arg="${f.id}" data-active-path="filter.id" data-value="${f.id}" data-tip="${esc(f.name)}|${esc(f.desc)}" data-fthumb="${f.id}"><canvas width="192" height="120"></canvas><span class="label">${f.icon} ${esc(f.name)}</span></button>`,
      ).join('');
      return `
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
        ${section('Porträtt', slider('filter.beauty', 'Skönhetsfilter', 0, 1, 0.01, 'pct', 'Skönhetsfilter|Mjukar upp huden med ett kantbevarande filter – ögon, hår och konturer förblir skarpa.', 0.25))}
        ${btn('resetFilter', 'Återställ justeringar', 'reset', 'Återställ|Nollställ alla justeringar till standard.', 'sm')}`;
    },
  },
  face: {
    title: 'Ansikte',
    sub: '3D-tillbehör som sitter fast på huvudet – även på din avatar!',
    render: () => {
      const acc = ACCESSORIES.map((a) => card({ action: 'accessory', arg: a.id, activePath: 'face.accessories', emoji: a.icon, name: a.name, desc: a.desc, tip: `${a.name}|${a.desc} Du kan kombinera flera (en hatt och ett par glasögon åt gången).` })).join('');
      const warps = WARPS.map((w) => card({ action: 'warp', arg: w.id, activePath: 'face.warp', emoji: w.icon, name: w.name, tip: `${w.name}|${w.desc}` })).join('');
      return `
        ${section('3D-tillbehör', `<div class="grid">${acc}</div><div style="margin-top:10px">${btn('clearAccessories', 'Ta av allt', 'x', 'Ta av allt|Ta bort alla tillbehör.', 'sm')}</div>`)}
        ${section('Förvrängning', `<div class="grid">${warps}</div>${slider('face.warpStrength', 'Styrka', 0, 1.5, 0.01, 'pct', 'Styrka|Hur kraftig förvrängningen är.', 0.85)}`, 'Förvrängning|Fungerar i kameraläge.')}
        ${section('Kamera', `
          ${toggle('video.mirror', 'Spegelvänd bild', 'Spegelvänd|Visa bilden som en spegel (mest naturligt när du tittar på dig själv).')}
          ${toggle('video.autoFrame', 'Auto-inramning', 'Auto-inramning|Kameran zoomar in och följer ditt ansikte mjukt, som Center Stage.', 'Zoomar och följer ditt ansikte')}
          ${slider('video.autoFrameZoom', 'Inzoomning', 1, 2.5, 0.01, 'x', 'Inzoomning|Hur nära auto-inramningen zoomar.', 1.35)}`)}
        ${note('Tillbehören sitter på ditt ansikte i kameraläge och på avatarens huvud i avatarläge.')}`;
    },
  },
  voice: {
    title: 'Röst',
    sub: 'Låt som någon annan – i realtid, med låg fördröjning.',
    render: (s) => {
      const voices = VOICES.map((v) => card({ action: 'voice', arg: v.id, activePath: 'voice.preset', emoji: v.icon, name: v.name, desc: v.desc, tip: `${v.name}|${v.desc}` })).join('');
      const keys = KEYS.map((k, i) => ({ value: i, label: k }));
      return `
        <div class="section">
          ${toggle('voice.enabled', 'Röstförvrängning', 'Röstförvrängning|Av = din vanliga röst går igenom, men brusspärr och kompressor finns kvar.', 'Stäng av för att snabbt låta som dig själv')}
          <div class="row" style="margin-top:6px" data-tip="Nivåer|Vänster: mikrofonen in. Höger: det tittarna hör.">
            <div class="meter" data-meter="in" style="flex:1"></div><div class="meter" data-meter="out" style="flex:1"></div>
          </div>
          <div class="tuner" data-tuner ${s.voice.params.autotune ? '' : 'hidden'} style="margin-top:10px" data-tip="Stämapparat|Visar tonen du sjunger och hur mycket autotunen korrigerar."><div class="note-name">–</div><div class="bar"><i></i></div></div>
        </div>
        ${section('Röster', `<div class="grid">${voices}</div>`)}
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
          ${slider('voice.params.ringFreq', 'Robotfrekvens', 5, 200, 1, 'hz', 'Robotfrekvens|Låg = darrig alien, hög = klassisk robot.', 55)}
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
          ${toggle('voice.params.autotune', 'Autotune', 'Autotune|Drar din tonhöjd till närmaste ton i vald tonart. Hög hastighet = robotisk T-Pain-effekt.')}
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
          ${slider('voice.gate', 'Brusspärr', -90, -20, 1, 'db', 'Brusspärr|Tystar bakgrundsljud när du inte pratar. Höj om tangentbordet hörs.', -58)}
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
        ${section('Egna ljud', `${dropzone('uploadSound', '', 'Lägg till eget ljud', 'MP3, WAV, OGG – sparas i appen', 'audio/*')}${list ? `<div class="list" style="margin-top:10px">${list}</div>` : ''}`)}
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
    title: 'Overlay',
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
      ${section('Live-textning', `
        ${toggle('overlays.captions.enabled', 'Visa textning', 'Live-textning|Det du säger visas som text i bilden. Använder Chromes taligenkänning (kräver internet).', 'Tal blir text i realtid')}
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
    sub: 'Prestanda, gränssnitt och hjälp.',
    render: () => `
      ${section('Prestanda', `
        ${seg('video.quality', [
          { value: 'high', label: '1080p', tip: 'Hög|Skarpast bild. Kräver en bra grafikkort.' },
          { value: 'balanced', label: '720p', tip: 'Balanserad|Bra kvalitet och flyt för de flesta datorer.' },
          { value: 'fast', label: '540p', tip: 'Snabb|För äldre datorer och bärbara.' },
        ])}
        <p style="font-size:12px;color:var(--muted)" data-perf>–</p>`)}
      ${section('Kamera & format', `
        ${select('video.cameraId', 'Kamera', [{ value: '', label: 'Standard' }], { tip: 'Kamera|Välj vilken kamera som används.' })}
        <div class="field"><label>Format</label>${seg('video.aspect', [
          { value: 'landscape', label: 'Liggande 16:9', icon: 'landscape', tip: 'Liggande|För YouTube, Twitch och samtal.' },
          { value: 'portrait', label: 'Stående 9:16', icon: 'portrait', tip: 'Stående|För TikTok, Shorts och Reels.' },
        ])}</div>`)}
      ${section('Gränssnitt', `
        ${toggle('ui.sounds', 'Gränssnittsljud', 'Gränssnittsljud|Diskreta ljud när du klickar och hovrar. Hörs bara för dig, aldrig i sändningen.')}
        ${slider('ui.soundVolume', 'Volym', 0, 1, 0.01, 'pct', 'Volym|Gränssnittsljudens volym.', 0.55)}
        ${toggle('ui.tooltips', 'Förklaringar vid hovring', 'Förklaringar|Visa de här små hjälprutorna.')}
        ${toggle('ui.reducedMotion', 'Mindre rörelse', 'Mindre rörelse|Stänger av animationer och 3D-lutning i gränssnittet.')}`)}
      ${section('Hjälp', `<div class="row">${btn('tour', 'Guidad tur', 'pointer', 'Guidad tur|En snabb rundtur i appen.')}${btn('help', 'Hjälp & tangenter', 'keyboard', 'Hjälp|Kom igång, streaming-guide och alla snabbtangenter.')}</div>`)}
      ${section('Återställ', btn('resetAll', 'Återställ alla inställningar', 'reset', 'Återställ allt|Tar bort alla inställningar och sparade skepnader.', 'btn-danger'))}
      <p style="color:var(--faint);font-size:12px;line-height:1.6">Skepnad 1.0 · Allt körs lokalt i din dator.<br>Byggd med three.js, MediaPipe och Web Audio.</p>`,
  },
};

export function panelFor(id) {
  return SHARE_PANELS[id] ?? PANELS[id] ?? SHARE_PANELS.home;
}
