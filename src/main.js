// Skepnad – huvudprogram: startar enheter, renderare, ljud och gränssnitt.
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import './styles/app.css';
import * as THREE from 'three';
import { createStore } from './app/store.js';
import { DEFAULTS, VOICE_PARAM_DEFAULTS } from './app/defaults.js';
import { bus } from './app/bus.js';
import { idb } from './app/idb.js';
import { clipsLib } from './app/clipsLib.js';
import { Devices } from './media/devices.js';
import { Tracker } from './media/tracker.js';
import { Compositor } from './render/compositor.js';
import { SCENES, SCENE_MAP } from './render/backgrounds/scenes.js';
import { FILTERS } from './render/filters.js';
import { SPR } from './render/fx/particles.js';
import { toggleAccessory, ACCESSORIES, ACCESSORY_MAP } from './render/ar/accessories.js';
import { THROWABLES } from './render/fx/throwables.js';
import { AudioEngine } from './audio/engine.js';
import { uiSounds } from './audio/uiSounds.js';
import { VOICES, VOICE_MAP, voiceParams } from './audio/voices.js';
import { SOUNDS } from './audio/sfx.js';
import { Captions } from './audio/speech.js';
import { EffectsEngine, EFFECTS } from './app/effects.js';
import { applyLook, snapshot, allPersonas, BUILTIN_PERSONAS, PERSONA_GROUPS } from './app/personas.js';
import { Recorder, download, stamp, shareFile, checkRecorderCrash } from './app/recorder.js';
import { host } from './app/host.js';
import { LiveController, SERVICE_MAP, outputUrl } from './app/live.js';
import { CallBridge } from './app/callBridge.js';
import { openGuide } from './ui/guides.js';
import qrcode from 'qrcode-generator';
import { TwitchChat } from './integrations/twitch.js';
import { loadModel } from './avatar/custom.js';
import { AVATAR_LIST } from './avatar/avatarLayer.js';
import { icon } from './ui/icons.js';
import { emblemSvg, wordmarkHtml } from './ui/brand.js';
import { SKEP_EMOJIS, EMOJI_SETS } from './ui/emojis.js';
import { TABS, MOBILE_TOOLS, panelFor, esc } from './ui/panels.js';
import { bindAll } from './ui/bind.js';
import { initStickerUi } from './ui/stickerUi.js';
import { countdown, cancelCountdown, countdownRunning } from './ui/countdown.js';
import { initTooltips, initTilt, initStageTilt, initUiSounds, toast, promptModal, openModal } from './ui/fx.js';
import { Logo3D } from './ui/logo3d.js';
import { openHelp, startTour } from './ui/help.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** Adressen där Skepnad ligger publicerad (GitHub Pages). */
export const PAGES_URL = 'https://rebelyouthz.github.io/skepnad/';

// Säg till samtalstillägget att den här sidan är Skepnad själv (dess egen kamera ska inte bytas ut)
window.__SKEPNAD_APP__ = true;

// ---------------------------------------------------------------- Tillstånd
const store = createStore(DEFAULTS, { key: 'skepnad:v1' });
const devices = new Devices();
const tracker = new Tracker();
const audio = new AudioEngine();
const recorder = new Recorder();
const twitch = new TwitchChat();
const captions = new Captions();
let compositor = null;
let effects = null;
let outStream = null;
let stickers = null;
const live = new LiveController();
let callBridge = null;
let ffProgress = null;
let installPrompt = null;
const runtime = { mode: null, hasCamera: false, hasMic: false, fps: 0, clean: false, voiceOverride: null, started: false, mobile: false, busy: false };

window.skepnad = {
  store,
  runtime,
  outputStream: () => (outStream ??= compositor?.captureStream(30)),
  trigger: (id, o) => effects?.trigger(id, o),
  command: (text, user = 'test') => handleChat(user, text),
  get compositor() {
    return compositor;
  },
  get stickers() {
    return stickers;
  },
  audio,
  tracker,
  host,
  live,
  clipsLib,
  avatars: AVATAR_LIST,
  scenes: SCENES,
  get calls() {
    return callBridge;
  },
};

document.documentElement.dataset.reducedMotion = String(store.get('ui.reducedMotion'));

// ---------------------------------------------------------------- Mobil eller dator?
function wantMobile() {
  const pref = store.get('ui.layout');
  if (pref === 'mobile') return true;
  if (pref === 'desktop') return false;
  const coarse = matchMedia('(pointer: coarse)').matches;
  return innerWidth < 720 || (coarse && Math.min(innerWidth, innerHeight) < 820);
}

function applyLayout() {
  const m = wantMobile();
  const changed = m !== runtime.mobile;
  runtime.mobile = m;
  document.body.classList.toggle('mobile', m);
  if (!m) document.body.classList.remove('sheet-open');
  if (changed && compositor) {
    if (m) renderMobile();
    rerenderPanel();
  }
}
applyLayout();
addEventListener('resize', () => applyLayout());

// PWA: installera som app + offline-cache
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------------------------------------------------------------- Startskärm
const splashLogo = new Logo3D($('#splash-logo'));
splashLogo.start();
initTooltips(() => store.get('ui.tooltips'));
initTilt(() => !store.get('ui.reducedMotion'));
initUiSounds();
$('#feature-chips').innerHTML = [
  [AVATAR_LIST.length - 2, 'figurer'],
  [BUILTIN_PERSONAS.length, 'färdiga skepnader'],
  [VOICES.length, 'röster'],
  [SCENES.length, 'levande platser'],
  [ACCESSORIES.length, 'hattar & masker'],
  [SKEP_EMOJIS.length + EMOJI_SETS.reduce((n, s) => n + s.list.length, 0), 'emojis'],
]
  .map(([n, t]) => `<span><b>${n}</b> ${t}</span>`)
  .join('');
$$('[data-start]').forEach((b) => b.addEventListener('click', () => start(b.dataset.start)));

function progress(text, k) {
  $('#loadbar').hidden = false;
  $('#loadtext').textContent = text;
  $('#loadfill').style.width = `${Math.round(k * 100)}%`;
}

async function start(mode) {
  if (runtime.started) return;
  runtime.started = true;
  runtime.mode = mode;
  $('#cta').style.display = 'none';
  // Första gången på en telefon: stående format och lättare kvalitet
  if (runtime.mobile && !store.get('ui.mobileInit')) {
    store.set('video.aspect', 'portrait');
    store.set('video.quality', 'fast');
    store.set('ui.mobileInit', true);
  }
  progress('Startar ljudmotorn…', 0.05);
  try {
    await audio.init();
    await audio.resume();
  } catch (err) {
    console.error(err);
  }
  uiSounds.enabled = store.get('ui.sounds');
  uiSounds.setVolume(store.get('ui.soundVolume'));
  uiSounds.play('open');

  if (mode === 'full') {
    progress('Startar kameran…', 0.12);
    try {
      await devices.startCamera(store.get('video.cameraId'), store.get('video.quality'), store.get('video.facing'));
      runtime.hasCamera = true;
    } catch (err) {
      console.warn('[kamera]', err);
      toast('Kunde inte starta kameran – figurläge används istället.', 'error', 4200);
    }
  }
  if (mode !== 'demo') {
    progress('Startar mikrofonen…', 0.2);
    try {
      const s = await devices.startMic(store.get('voice.micId'), { noiseSuppression: store.get('voice.noiseSuppression') });
      audio.setMicStream(s);
      runtime.hasMic = true;
    } catch (err) {
      console.warn('[mikrofon]', err);
      toast('Kunde inte starta mikrofonen.', 'error', 3500);
    }
  }
  if (mode === 'demo' || !runtime.hasMic) audio.setDemoVoice(mode === 'demo');
  if (!runtime.hasCamera && store.get('video.mode') === 'camera') store.set('video.mode', 'avatar');

  progress('Bygger 3D-motorn…', 0.28);
  compositor = new Compositor($('#out'), { tracker, video: devices.video });
  compositor.setQuality(store.get('video.quality'), store.get('video.aspect'));
  applyAspectCss();
  effects = new EffectsEngine({
    particles: compositor.particles,
    throwables: compositor.throwables,
    overlay: compositor.overlay,
    sfx: (name) => audio.playSfx(name),
    anchor: () => compositor.faceAnchor(store.get('video.mode')),
    mouth: () => compositor.mouthAnchor(store.get('video.mode')),
    hand: () => compositor.handAnchor(store.get('video.mode')),
    fingertip: () => compositor.handAnchor(store.get('video.mode'), true),
    size: () => ({ W: compositor.width, H: compositor.height }),
    shake: (a, dir) => compositor.shake(a, dir),
  });
  bus.on('fx:hit', ({ dir }) => compositor.avatar.rig.impulse(dir));
  await host.detect();
  callBridge = new CallBridge({ videoStream: () => window.skepnad.outputStream(), audioStream: () => audio.stream });

  if (runtime.hasCamera) {
    try {
      await tracker.init({ onProgress: (t, k) => progress(t, 0.3 + k * 0.55) });
    } catch (err) {
      console.error('[tracker]', err);
      toast('AI-modellerna kunde inte laddas – spårning är avstängd.', 'error', 4200);
    }
  }
  progress('Laddar dina filer…', 0.88);
  await restoreAssets();
  progress('Förbereder shaders…', 0.94);
  wireState();
  buildShell();
  compositor.precompile();
  progress('Klart!', 1);

  await sleep(250);
  $('#splash').classList.add('leaving');
  $('#app').hidden = false;
  requestAnimationFrame(() => $('#app').classList.add('visible'));
  setTimeout(() => {
    $('#splash').remove();
    splashLogo.dispose();
  }, 800);
  uiSounds.play('success');
  requestAnimationFrame(rafLoop);
  audio.onHeartbeat = () => {
    const now = performance.now();
    if (now - lastFrameAt > 45) frame(now);
  };
  setInterval(() => {
    const now = performance.now();
    if (now - lastFrameAt > 250) frame(now);
  }, 250);
  pushRemoteState();
  if (checkRecorderCrash()) setTimeout(() => toast('Förra inspelningen kraschade webbläsaren – nu används ett säkrare format automatiskt.', 'info', 6000), 1500);
  if (runtime.mobile) {
    if (!store.get('ui.seenTour')) {
      store.set('ui.seenTour', true);
      setTimeout(() => toast('Svep bland skepnaderna längst ner och tryck på knapparna till höger! 👉', 'info', 5000), 900);
    }
  } else if (!store.get('ui.seenTour')) setTimeout(() => startTour(() => store.set('ui.seenTour', true)), 1100);
  else toast('Välkommen tillbaka! Tryck ? för hjälp.', 'ok');
}

// ---------------------------------------------------------------- Egna filer (IndexedDB)
const pngFrames = {};

function imageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

async function setPng(key, blob) {
  const img = await imageFromBlob(blob);
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  pngFrames[key] = tex;
  compositor.avatar.setPngFrames({ ...pngFrames });
}

async function setBackgroundMedia(blob, type) {
  const url = URL.createObjectURL(blob);
  if (type.startsWith('video')) {
    const v = Object.assign(document.createElement('video'), { src: url, loop: true, muted: true, playsInline: true });
    await v.play().catch(() => {});
    await new Promise((r) => (v.readyState >= 2 ? r() : v.addEventListener('loadeddata', r, { once: true })));
    const tex = new THREE.VideoTexture(v);
    compositor.bg.setMedia(tex, v.videoWidth / v.videoHeight);
  } else {
    const img = await imageFromBlob(blob);
    const tex = new THREE.Texture(img);
    tex.needsUpdate = true;
    compositor.bg.setMedia(tex, img.width / img.height);
  }
}

async function setCustomModel(name, buffer) {
  const url = URL.createObjectURL(new Blob([buffer]));
  const gltf = await loadModel(url);
  URL.revokeObjectURL(url);
  compositor.ar.attach(null);
  compositor.avatar.setCustomModel(gltf, name);
}

async function setStickerImage(id, blob) {
  const img = await imageFromBlob(blob);
  compositor.overlay.stickers.setImage(id, img);
}

async function restoreAssets() {
  try {
    const model = await idb.get('model');
    if (model?.buffer) await setCustomModel(model.name, model.buffer);
  } catch (err) {
    console.warn('[assets] modell', err);
  }
  for (const k of ['idle', 'talk', 'blink', 'blinkTalk']) {
    const b = await idb.get(`png:${k}`);
    if (b) await setPng(k, b).catch(() => {});
  }
  const bg = await idb.get('bg');
  if (bg?.blob) await setBackgroundMedia(bg.blob, bg.type).catch(() => {});
  for (const snd of store.get('soundboard.custom') || []) {
    const buf = await idb.get(`sound:${snd.id}`);
    if (buf) await audio.addCustomSound(snd.id, buf).catch(() => {});
  }
  for (const it of store.get('stickers.items') || []) {
    if (it.kind !== 'image') continue;
    const b = await idb.get(`sticker:${it.value}`);
    if (b) await setStickerImage(it.value, b).catch(() => {});
  }
}

async function handleFile(action, arg, file) {
  if (!file) return;
  try {
    if (action === 'uploadModel') {
      toast('Laddar modellen…');
      const buffer = await file.arrayBuffer();
      await setCustomModel(file.name, buffer);
      await idb.set('model', { name: file.name, buffer });
      store.set('avatar.customName', file.name);
      store.set('video.mode', 'avatar');
      store.set('avatar.id', 'custom');
      applyAvatar(true);
      toast(`${file.name} laddad!`, 'ok');
    } else if (action === 'uploadPng') {
      await setPng(arg, file);
      await idb.set(`png:${arg}`, file);
      store.set('avatar.id', 'png');
      store.set('video.mode', 'avatar');
      toast('Bilden är sparad!', 'ok');
    } else if (action === 'uploadBg') {
      await setBackgroundMedia(file, file.type);
      await idb.set('bg', { blob: file, type: file.type });
      store.set('background.type', 'image');
      toast('Egen plats aktiverad!', 'ok');
    } else if (action === 'uploadSound') {
      await addSoundBuffer(await file.arrayBuffer(), file.name.replace(/\.[^.]+$/, '').slice(0, 24));
    } else if (action === 'uploadSticker') {
      const id = `img${Date.now().toString(36)}`;
      await idb.set(`sticker:${id}`, file);
      await setStickerImage(id, file);
      stickers.add({ kind: 'image', value: id, placement: store.get('ui.stickerPlace') });
      toast('Din bild ligger nu i bilden – dra runt den!', 'ok');
      rerenderPanel();
    } else if (action === 'importClip') {
      if (host.available) {
        await host.saveBlob(file.name, file);
      } else {
        await clipsLib.add(file, { name: file.name });
      }
      toast('Tillagd i Mina klipp!', 'ok');
      refreshClips();
    }
  } catch (err) {
    console.error(err);
    toast('Filen kunde inte läsas.', 'error');
  }
}

async function addSoundBuffer(buffer, name) {
  const id = `custom-${Date.now()}`;
  await audio.addCustomSound(id, buffer.slice(0));
  await idb.set(`sound:${id}`, buffer);
  store.set('soundboard.custom', [...(store.get('soundboard.custom') || []), { id, name }]);
  toast(`"${name}" tillagt i ljudbordet!`, 'ok');
  rerenderPanel();
}

// ---------------------------------------------------------------- Store → system
let colorTimer = null;
function applyAvatar(force = false) {
  const s = store.get();
  const id = s.avatar.id;
  if (!force && compositor.avatar.currentId === id && !applyAvatar.colorsDirty) return;
  applyAvatar.colorsDirty = false;
  compositor.ar.attach(null);
  compositor.avatar.setAvatar(id, s.avatar.colors?.[id] ?? {});
  if (compositor.avatar.currentId !== id) store.set('avatar.id', compositor.avatar.currentId);
  const cur = compositor.avatar.current;
  if (cur) cur.dimSilent = s.avatar.pngDim;
}

function applyVoice() {
  const s = store.get('voice');
  const o = runtime.voiceOverride;
  if (o && performance.now() < o.until) audio.applyParams(o.params);
  else audio.applyParams(s.enabled ? s.params : VOICE_PARAM_DEFAULTS);
  audio.setBypass(false);
}

function applyAmbience() {
  const s = store.get();
  const id = s.background.type === 'scene' ? SCENE_MAP[s.background.scene]?.ambience : null;
  audio.setAmbience(id, s.ambience);
}

function updateAmbientColor() {
  const s = store.get();
  let c = '#00f0ff';
  if (s.background.type === 'scene') c = SCENE_MAP[s.background.scene]?.tint ?? c;
  else if (s.background.type === 'green') c = '#00ff66';
  document.documentElement.style.setProperty('--ambient', c);
}

const restartCam = async () => {
  if (!runtime.hasCamera) return;
  try {
    await devices.startCamera(store.get('video.cameraId'), store.get('video.quality'), store.get('video.facing'));
  } catch {
    toast('Kunde inte byta kamera.', 'error');
  }
};

function wireState() {
  store.subscribe('voice.params', applyVoice);
  store.subscribe('voice.enabled', applyVoice, { immediate: true });
  store.subscribe('voice.monitor', () => audio.setMonitor(store.get('voice.monitor'), store.get('voice.monitorVolume')), { immediate: true });
  store.subscribe('voice.monitorVolume', () => audio.setMonitor(store.get('voice.monitor'), store.get('voice.monitorVolume')));
  store.subscribe('voice.muted', (m) => audio.setMuted(m), { immediate: true });
  store.subscribe('voice.inputGain', (v) => audio.setInputGain(v), { immediate: true });
  store.subscribe('voice.gate', (v) => audio.setGate(v), { immediate: true });
  store.subscribe('voice.outputDevice', async (id) => {
    const ok = await audio.setOutputDevice(id).catch(() => false);
    if (id && !ok) toast('Kunde inte välja ljudutgången.', 'error');
    else if (id) toast('Rösten skickas nu till vald utgång.', 'ok');
  });
  const restartMic = async () => {
    if (!runtime.hasMic) return;
    try {
      const s = await devices.startMic(store.get('voice.micId'), { noiseSuppression: store.get('voice.noiseSuppression') });
      audio.setMicStream(s);
    } catch {
      toast('Kunde inte byta mikrofon.', 'error');
    }
  };
  store.subscribe('voice.micId', restartMic);
  store.subscribe('voice.noiseSuppression', restartMic);
  store.subscribe('video.cameraId', restartCam);
  store.subscribe('video.facing', (f) => {
    store.set('video.mirror', f === 'user');
    restartCam();
  });
  store.subscribe('video.quality', (q) => {
    compositor.setQuality(q, store.get('video.aspect'));
    outStream = null;
    restartCam();
  });
  store.subscribe('video.aspect', (a) => {
    compositor.setQuality(store.get('video.quality'), a);
    outStream = null;
    applyAspectCss();
  });
  store.subscribe('soundboard', (sb) => audio.setSfx(sb.volume, sb.toStream), { immediate: true });
  store.subscribe('ambience', applyAmbience, { immediate: true });
  store.subscribe('background', () => {
    applyAmbience();
    updateAmbientColor();
  }, { immediate: true });
  store.subscribe('face.accessories', (ids) => compositor.ar.setAccessories(ids), { immediate: true });
  store.subscribe('avatar.id', () => applyAvatar(), { immediate: true });
  store.subscribe('avatar.colors', () => {
    clearTimeout(colorTimer);
    colorTimer = setTimeout(() => {
      applyAvatar.colorsDirty = true;
      applyAvatar();
    }, 120);
  });
  store.subscribe('avatar.pngDim', (v) => compositor.avatar.current && (compositor.avatar.current.dimSilent = v));
  store.subscribe('overlays.captions', (c) => {
    if (c.enabled) {
      captions.stop();
      if (!captions.start(c.lang)) toast('Live-textning stöds inte i den här webbläsaren (använd Chrome eller Edge).', 'error', 4000);
    } else captions.stop();
  }, { immediate: true });
  let twitchTimer = null;
  store.subscribe('twitch', (t) => {
    clearTimeout(twitchTimer);
    twitchTimer = setTimeout(() => {
      if (t.enabled && t.channel) {
        if (twitch.channel !== t.channel.trim().toLowerCase() || twitch.status === 'off') twitch.connect(t.channel);
      } else if (twitch.status !== 'off') twitch.disconnect();
    }, 700);
  }, { immediate: true });
  store.subscribe('ui', (u) => {
    uiSounds.enabled = u.sounds;
    uiSounds.setVolume(u.soundVolume);
    document.documentElement.dataset.reducedMotion = String(u.reducedMotion);
  }, { immediate: true });
  store.subscribe('ui.layout', () => applyLayout());
  store.subscribe('ui.countdown', () => updateCaptureUi());
  bus.on('caption', ({ text, final }) => compositor.overlay.setCaption(text, final));
  bus.on('toast', ({ text, kind }) => toast(text, kind));
  bus.on('twitch:message', ({ user, text }) => handleChat(user, text));
  bus.on('twitch:status', updateTwitchChip);
  bus.on('calls:update', ({ active }) => {
    if (['calls', 'home'].includes(currentTab)) rerenderPanel();
    if (active) toast('📞 Skepnad används nu i ett samtal!', 'ok', 3500);
  });
  bus.on('ext:present', () => {
    if (['calls', 'home'].includes(currentTab)) rerenderPanel();
    if (store.get('ui.tab') === 'calls') toast('✅ Samtalstillägget är installerat – nu kan du ringa!', 'ok', 4000);
  });
  bus.on('live:update', onLiveUpdate);
  bus.on('remote:cmd', onRemoteCmd);
  bus.on('remote:count', (n) => {
    const el = $('[data-remote-count]');
    if (el) el.textContent = n ? `📱 ${n} mobil ansluten` : 'Ingen mobil ansluten ännu';
    if (n) toast('📱 Mobilen är ansluten!', 'ok');
    pushRemoteState();
  });
  store.subscribe('', schedulePushRemote);
}

function applyAspectCss() {
  const portrait = store.get('video.aspect') === 'portrait';
  document.documentElement.style.setProperty('--stage-ar', portrait ? '9 / 16' : '16 / 9');
  document.documentElement.style.setProperty('--stage-arn', portrait ? '0.5625' : '1.7778');
  document.body.classList.toggle('portrait', portrait);
}

function detectBrowser() {
  return navigator.userAgentData?.brands?.some((b) => /Edge/i.test(b.brand)) || /Edg\//.test(navigator.userAgent) ? 'edge' : 'chrome';
}

async function openExternal(url) {
  if (!url) return;
  if (host.available) {
    try {
      await host.openUrl(url, detectBrowser());
      return;
    } catch {
      /* faller tillbaka */
    }
  }
  if (/^(chrome|edge):/.test(url)) toast(`Skriv ${url} i adressfältet.`, 'info', 5000);
  else window.open(url, '_blank', 'noopener');
}

function confirmModal({ title, text, okText = 'Ja', danger = true }) {
  return new Promise((resolve) => {
    let answered = false;
    openModal({
      title,
      iconName: 'alert',
      content: `<p>${text}</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-close style="flex:none">Avbryt</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes style="flex:none">${okText}</button></div>`,
      onMount(root, close) {
        root.querySelector('[data-yes]').addEventListener('click', () => {
          answered = true;
          resolve(true);
          close();
        });
        new MutationObserver(() => !root.isConnected && !answered && resolve(false)).observe(document.body, { childList: true });
      },
    });
  });
}

// ---------------------------------------------------------------- Mobilkontroll
let pushTimer = null;
function schedulePushRemote() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemoteState, 200);
}

function pushRemoteState() {
  if (!host.available || !compositor) return;
  const s = store.get();
  const p = (x) => ({ id: x.id, name: x.name, icon: x.icon });
  host.pushState({
    personas: allPersonas(s).map(p),
    effects: EFFECTS.map(p),
    sounds: [...SOUNDS, ...(s.soundboard.custom || []).map((c) => ({ ...c, icon: '🎵' }))].map(p),
    voices: VOICES.map(p),
    scenes: SCENES.map(p),
    avatars: AVATAR_LIST.filter((a) => a.id !== 'custom' || compositor.avatar.custom).map(p),
    active: {
      persona: s.personas.active,
      voice: s.voice.preset,
      scene: s.background.type === 'scene' ? s.background.scene : null,
      avatar: s.video.mode === 'avatar' ? s.avatar.id : null,
      mode: s.video.mode,
      muted: s.voice.muted,
      recording: recorder.active,
      live: live.state === 'live',
    },
  });
}

const REMOTE_ACTIONS = new Set(['persona', 'effect', 'sfx', 'voice', 'scene', 'avatar', 'toggleMute', 'record', 'screenshot', 'toggleMode', 'throw', 'random']);
function onRemoteCmd({ action, arg }) {
  if (!REMOTE_ACTIONS.has(action)) return;
  if (action === 'avatar' && arg === 'custom' && !compositor.avatar.custom) return;
  actions[action]?.(arg);
  schedulePushRemote();
}

// ---------------------------------------------------------------- Livesändning
async function startLive() {
  if (!host.available) {
    showTab('live');
    return toast('Livesändning görs från datorn med Skepnad-motorn – se fliken Live.', 'error', 5000);
  }
  const s = store.get();
  const targets = Object.entries(s.live.services)
    .filter(([, c]) => c.enabled)
    .map(([id, c]) => ({ id, name: SERVICE_MAP[id].name, url: outputUrl(SERVICE_MAP[id], c) }));
  if (!targets.length) return toast('Slå på minst en tjänst nedan och klistra in streamnyckeln.', 'error', 4500);
  const bad = targets.find((t) => !t.url);
  if (bad) return toast(`Fyll i ${SERVICE_MAP[bad.id].editableUrl ? 'serveradress och ' : ''}streamnyckel för ${bad.name}.`, 'error', 4500);
  let info = await host.refresh();
  if (info.ffmpeg.state !== 'ready') {
    await host.installFfmpeg();
    ffProgress = 0;
    live._set('preparing', { text: 'Laddar ner sändningsmotorn…' });
    for (;;) {
      await sleep(600);
      info = await host.refresh();
      ffProgress = info.ffmpeg.progress;
      const fill = $('.live-card .fill');
      if (fill) fill.style.width = `${Math.round(ffProgress * 100)}%`;
      if (info.ffmpeg.state === 'ready') break;
      if (info.ffmpeg.state === 'error') {
        ffProgress = null;
        live._set('error', { error: `Kunde inte ladda ner sändningsmotorn: ${info.ffmpeg.error}` });
        return;
      }
    }
    ffProgress = null;
  }
  if (!(await countdown($('#countdown'), store.get('ui.countdown'), 'live'))) return;
  const q = s.live.quality;
  const px = compositor.width * compositor.height;
  const kbps = q === '1080' ? 6000 : q === '720' ? 3500 : px > 1.5e6 ? 6000 : 3500;
  live.start({ host, videoStream: window.skepnad.outputStream(), audioStream: audio.stream, targets, saveCopy: s.live.saveCopy, kbps });
}

let lastLiveState = 'idle';
function onLiveUpdate(L) {
  if (L.state !== lastLiveState) {
    if (L.state === 'live') {
      uiSounds.play('recStart');
      toast(`🔴 Du är live på ${L.targets.map((t) => t.name).join(' + ')}!`, 'ok', 4000);
    }
    if (L.state === 'error') toast(L.error || 'Sändningen stoppades.', 'error', 6000);
    if (L.state === 'idle' && lastLiveState === 'live') {
      uiSounds.play('recStop');
      toast(L.recordPath ? 'Sändningen är avslutad – en kopia finns i Mina klipp.' : 'Sändningen är avslutad.', 'ok', 4000);
    }
    lastLiveState = L.state;
    if (currentTab === 'live' || currentTab === 'home') rerenderPanel();
    pushRemoteState();
  }
  if (L.warn && currentTab === 'live') {
    const el = $('[data-live-stats]');
    if (el) el.textContent = L.warn;
  }
}

// ---------------------------------------------------------------- Klipp (motorn eller enhetens bibliotek)
const clipUrl = (name) => `/clips/${encodeURIComponent(name)}`;
const isLib = (key) => key.startsWith('lib:');
const blobUrls = new Map();

async function clipInfo(key) {
  if (isLib(key)) {
    const it = await clipsLib.get(key.slice(4));
    if (!it) return null;
    if (!blobUrls.has(key)) blobUrls.set(key, URL.createObjectURL(it.blob));
    return { key, name: it.name, blob: it.blob, url: blobUrls.get(key), image: it.type.startsWith('image') };
  }
  return { key, name: key, url: clipUrl(key), image: /\.(png|jpe?g)$/i.test(key), blob: null };
}

async function clipBlob(key) {
  const c = await clipInfo(key);
  return c?.blob ?? (await (await fetch(c.url)).blob());
}

const clipOps = {
  async share(key) {
    const c = await clipInfo(key);
    try {
      const ok = await shareFile(await clipBlob(key), c.name);
      if (!ok) throw new Error('nosupport');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (!isLib(key) && host.available) {
        await host.copyToClipboard(c.name);
        toast('Klippet är kopierat – klistra in med Ctrl+V i chatten!', 'ok', 4500);
      } else {
        download(await clipBlob(key), c.name);
        toast('Den här webbläsaren kan inte dela direkt – filen sparades istället.', 'info', 4500);
      }
    }
  },
  async save(key) {
    const c = await clipInfo(key);
    download(await clipBlob(key), c.name);
    toast(runtime.mobile ? 'Sparad! Du hittar den i Filer → Nedladdningar (och i galleriet).' : 'Sparad i Hämtade filer.', 'ok', 4000);
  },
  async copy(key) {
    try {
      await host.copyToClipboard(key);
      toast('Kopierat! Klistra in med Ctrl+V i Messenger, Discord eller mejl.', 'ok', 4500);
    } catch {
      toast('Kunde inte kopiera klippet.', 'error');
    }
  },
  async youtube(key) {
    if (runtime.mobile && isLib(key)) {
      toast('Välj YouTube (eller TikTok) i delningsmenyn som öppnas.', 'info', 4500);
      return clipOps.share(key);
    }
    await openExternal('https://www.youtube.com/upload');
    if (host.available && !isLib(key)) await host.reveal(key).catch(() => {});
    else await clipOps.save(key);
    toast('YouTube öppnas – dra in klippet i YouTube-fönstret.', 'ok', 7000);
  },
  async reveal(key) {
    if (host.available) await host.reveal(key);
  },
  async remove(key) {
    const c = await clipInfo(key);
    if (!c) return;
    if (!(await confirmModal({ title: 'Ta bort klippet?', text: `"${esc(c.name)}" raderas för gott.`, okText: 'Ta bort' }))) return;
    if (isLib(key)) {
      await clipsLib.del(key.slice(4));
      URL.revokeObjectURL(blobUrls.get(key));
      blobUrls.delete(key);
    } else await host.deleteClip(key);
    uiSounds.play('delete');
    toast('Klippet är borttaget.', 'ok');
    refreshClips();
  },
  async play(key) {
    const c = await clipInfo(key);
    if (!c) return;
    openModal({
      title: c.name,
      iconName: 'play-circle',
      content: `${c.image ? `<img src="${c.url}" style="width:100%;max-height:62vh;object-fit:contain">` : `<video src="${c.url}" controls autoplay playsinline style="width:100%;max-height:62vh;background:#000"></video>`}
        ${clipButtons(key, true)}`,
    });
  },
};

function clipButtons(key, inModal = false) {
  const lib = isLib(key);
  const b = (op, ic, label, tip, cls = '') => `<button class="btn ${inModal ? '' : 'sm'} ${cls} ${label ? '' : 'icon-only'}" data-action="clip" data-arg="${op}|${esc(key)}" data-tip="${tip}"${inModal ? ' data-close' : ''}>${icon(ic, inModal ? 16 : 14)}${label ? `<span>${label}</span>` : ''}</button>`;
  return `<div class="row clip-actions" style="flex-wrap:wrap;gap:6px;${inModal ? 'margin-top:12px' : ''}">
    ${b('share', 'share', 'Dela', 'Dela|Skicka till Messenger, WhatsApp, TikTok, YouTube, mejl …', 'btn-primary')}
    ${lib ? b('save', 'download', inModal ? 'Spara i enheten' : '', 'Spara|Ladda ner filen till telefonen/datorn.') : host.available ? b('copy', 'clip-copy', inModal ? 'Kopiera till chatten' : '', 'Kopiera|Klistra sedan in med Ctrl+V i Messenger, Discord eller mejl.') : ''}
    ${b('youtube', 'upload', inModal ? 'YouTube' : '', 'YouTube|Lägg upp på YouTube.')}
    ${!lib && host.available ? b('reveal', 'folder', inModal ? 'Visa i mappen' : '', 'Visa i mappen|Öppna Utforskaren vid filen.') : ''}
    ${b('remove', 'trash', '', 'Ta bort|Radera klippet.', 'btn-danger')}
  </div>`;
}

function fmtBytes(b) {
  return b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} kB`;
}
const fmtTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

let lastThumb = '';
async function refreshClips() {
  let clips = [];
  if (host.available) {
    try {
      clips = (await host.clips()).clips.map((c) => ({ key: c.name, name: c.name, size: c.size, mtime: c.mtime, image: c.kind === 'image', url: clipUrl(c.name) }));
    } catch {
      /* ok */
    }
  } else {
    clips = (await clipsLib.list()).map((c) => ({ key: `lib:${c.id}`, name: c.name, size: c.size, mtime: c.created, image: c.type.startsWith('image'), thumb: c.thumb, duration: c.duration, ar: c.w && c.h ? `${c.w} / ${c.h}` : '' }));
  }
  const first = clips[0];
  lastThumb = first?.thumb || '';
  updateGalleryButton();
  const list = $('#clip-list');
  if (!list) return;
  if (!clips.length) {
    list.innerHTML = '<p class="muted">Inga klipp ännu. Tryck <b>Spela in</b> ovanför!</p>';
    return;
  }
  list.innerHTML = clips
    .slice(0, 80)
    .map((c) => {
      const media = c.thumb ? `<img src="${c.thumb}" alt="">` : c.image ? `<img src="${c.url}" loading="lazy" alt="">` : `<video src="${c.url}#t=0.5" preload="metadata" muted playsinline></video>`;
      return `<div class="clip" style="${c.ar ? `--clip-ar:${c.ar}` : ''}">
        <button class="clip-thumb" data-action="clip" data-arg="play|${esc(c.key)}" data-tip="Spela|Titta på klippet.">${media}<span class="clip-play">${icon(c.image ? 'image' : 'play', 26)}</span>${c.duration ? `<span class="clip-dur">${fmtTime(c.duration)}</span>` : ''}</button>
        <div class="clip-meta"><b title="${esc(c.name)}">${esc(c.name.replace(/^Skepnad /, ''))}</b><small>${new Date(c.mtime).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })} · ${fmtBytes(c.size)}</small>${clipButtons(c.key)}</div>
      </div>`;
    })
    .join('');
}

async function saveCapture(blob, name, duration = 0) {
  if (host.available) {
    try {
      const saved = await host.saveBlob(name, blob);
      return saved?.name || name;
    } catch {
      /* faller tillbaka på enheten */
    }
  }
  const it = await clipsLib.add(blob, { name, duration });
  return `lib:${it.id}`;
}

async function showClipDone(key, duration = 0) {
  const c = await clipInfo(key);
  if (!c) return;
  const secs = Math.round(duration || 0);
  openModal({
    title: c.image ? '📸 Fotot är klart!' : '🎉 Klippet är klart!',
    iconName: 'clapper',
    content: `${c.image ? `<img src="${c.url}" style="width:100%;max-height:50vh;object-fit:contain">` : `<video src="${c.url}" controls autoplay muted playsinline style="width:100%;max-height:50vh;background:#000"></video>`}
      <p style="margin:10px 0 4px">${esc(c.name)}${secs ? ` · ${fmtTime(secs)}` : ''} · sparat i <b>Mina klipp</b></p>
      ${clipButtons(key, true)}`,
  });
  refreshClips();
}

// ---------------------------------------------------------------- Skepnader, slump och fotobås
function transformBurst() {
  compositor.glitch(1.6);
  compositor.flash('#ffffff', 0.45);
  uiSounds.play('transform');
  const a = compositor.faceAnchor(store.get('video.mode'));
  compositor.particles.emit({ x: a.x, y: a.y, jitter: a.unit * 2, count: 26, slot: SPR.puff, speed: [60, 260], drag: 2, life: [0.6, 1.2], size: [a.unit, a.unit * 2.2], sizeEnd: 1.6, colors: ['#ffffff', '#ffd1f7', '#b9f3ff'], alpha: 0.85 });
  compositor.particles.emit({ x: a.x, y: a.y, jitter: a.unit * 2.4, count: 40, slot: SPR.spark, speed: [40, 200], life: [0.5, 1.1], size: [16, 40], sizeEnd: 0, colors: ['#ffffff', '#fcee0a', '#ff2bd6', '#00f0ff'], additive: true });
}

function applyPersona(id) {
  const p = allPersonas(store.get()).find((x) => x.id === id);
  if (!p) return;
  if (p.look.video?.mode === 'camera' && !runtime.hasCamera) {
    toast('Den här skepnaden använder kameran – starta om med kamera för att se den.', 'info', 3500);
  }
  transformBurst();
  setTimeout(() => {
    applyLook(store, p.look);
    if (!runtime.hasCamera && store.get('video.mode') === 'camera') store.set('video.mode', 'avatar');
    store.set('personas.active', id);
    updateCarousel();
  }, 110);
  const nameEl = $('#m-pname');
  if (nameEl) nameEl.textContent = `${p.icon} ${p.name}`;
  else toast(`${p.icon} ${p.name}`, 'ok', 1800);
}

/**
 * "Överraska mig": väljer en slumpmässig look.
 * Returnerar { look, sticker } där sticker är ett klistermärke att sätta ovanför huvudet.
 */
function pickRandomLook() {
  const useAvatar = !runtime.hasCamera || Math.random() < 0.55;
  const figures = AVATAR_LIST.filter((a) => !['png', 'custom'].includes(a.id));
  const hats = ACCESSORIES.filter((a) => ['head', 'helmet'].includes(a.slot));
  const eyes = ACCESSORIES.filter((a) => a.slot === 'eyes');
  const acc = useAvatar ? [] : [pick(hats).id, ...(Math.random() < 0.5 ? [pick(eyes).id] : [])];
  const look = {
    video: { mode: useAvatar ? 'avatar' : 'camera' },
    avatar: useAvatar ? { id: pick(figures).id } : undefined,
    background: { type: 'scene', scene: pick(SCENES).id },
    filter: { id: Math.random() < 0.6 ? 'none' : pick(FILTERS).id, intensity: 0.8 },
    face: { accessories: acc, warp: !useAvatar && Math.random() < 0.3 ? pick(['bigEyes', 'bigHead', 'hamster', 'bigMouth']) : 'none' },
    voice: { preset: pick(VOICES.filter((v) => v.id !== 'natural')).id },
  };
  if (!look.avatar) delete look.avatar;
  return { look, sticker: Math.random() < 0.7 ? { kind: 'skep', value: pick(SKEP_EMOJIS).id } : null };
}

function randomLook() {
  const { look, sticker } = pickRandomLook();
  uiSounds.play('dice');
  transformBurst();
  setTimeout(() => {
    applyLook(store, look);
    store.set('personas.active', '');
    store.set('stickers.items', (store.get('stickers.items') || []).filter((i) => !i.random));
    if (sticker) {
      const it = stickers.add({ ...sticker, placement: 'above' });
      store.set('stickers.items', store.get('stickers.items').map((i) => (i.id === it.id ? { ...i, random: true } : i)));
      stickers.select(null);
    }
    const v = VOICE_MAP[store.get('voice.preset')];
    const av = AVATAR_LIST.find((a) => a.id === store.get('avatar.id'));
    const sc = SCENE_MAP[store.get('background.scene')];
    const who = store.get('video.mode') === 'avatar' ? `${av?.icon} ${av?.name}` : '🧑 Du själv';
    const text = `${who} · ${sc?.icon} ${sc?.name} · ${v?.icon} ${v?.name}`;
    const nameEl = $('#m-pname');
    if (nameEl && runtime.mobile) nameEl.textContent = text;
    else toast(text, 'ok', 2600);
    if (['personas', 'layers'].includes(currentTab)) rerenderPanel();
  }, 140);
}

async function photo() {
  if (runtime.busy) return;
  runtime.busy = true;
  try {
    if (!(await countdown($('#countdown'), store.get('ui.countdown'), 'photo'))) return;
    await screenshot();
  } finally {
    runtime.busy = false;
  }
}

async function booth() {
  if (runtime.busy) return;
  runtime.busy = true;
  stickers.select(null);
  try {
    const shots = [];
    const wait = Math.max(1, store.get('ui.countdown') || 3);
    for (let i = 0; i < 4; i++) {
      if (!(await countdown($('#countdown'), i ? Math.min(wait, 3) : wait, 'booth'))) return;
      flashScreen();
      uiSounds.play('shutter');
      const b = await compositor.screenshot();
      shots.push(await createImageBitmap(b));
      await sleep(350);
    }
    const blob = await composeStrip(shots);
    const key = await saveCapture(blob, `Skepnad fotobås ${stamp()}.png`);
    uiSounds.play('success');
    showClipDone(key);
  } catch (err) {
    console.error(err);
    toast('Fotobåset krånglade – försök igen.', 'error');
  } finally {
    runtime.busy = false;
  }
}

/** Fyra bilder → en fotoremsa med cyberram, logga och datum. */
async function composeStrip(shots) {
  const portrait = shots[0].height > shots[0].width;
  const tw = portrait ? 420 : 640;
  const th = Math.round((tw * shots[0].height) / shots[0].width);
  const cols = portrait ? 2 : 1;
  const rows = 4 / cols;
  const pad = 26;
  const gap = 14;
  const foot = 96;
  const c = document.createElement('canvas');
  c.width = pad * 2 + cols * tw + (cols - 1) * gap;
  c.height = pad * 2 + rows * th + (rows - 1) * gap + foot;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, c.width, c.height);
  bg.addColorStop(0, '#12061f');
  bg.addColorStop(1, '#04121a');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(0,240,255,0.12)';
  for (let y = 0; y < c.height; y += 4) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(c.width, y);
    g.stroke();
  }
  shots.forEach((s, i) => {
    const x = pad + (i % cols) * (tw + gap);
    const y = pad + Math.floor(i / cols) * (th + gap);
    g.save();
    g.shadowColor = i % 2 ? '#ff2bd6' : '#00f0ff';
    g.shadowBlur = 18;
    g.fillStyle = '#000';
    g.fillRect(x, y, tw, th);
    g.restore();
    g.drawImage(s, x, y, tw, th);
    g.strokeStyle = i % 2 ? '#ff2bd6' : '#00f0ff';
    g.lineWidth = 3;
    g.strokeRect(x + 1.5, y + 1.5, tw - 3, th - 3);
  });
  const fy = c.height - foot + 18;
  g.textAlign = 'center';
  g.font = '900 40px Orbitron, "Chakra Petch", sans-serif';
  g.fillStyle = '#ff2bd6';
  g.fillText('SKEPNAD', c.width / 2 - 2, fy + 30);
  g.fillStyle = '#00f0ff';
  g.fillText('SKEPNAD', c.width / 2 + 2, fy + 30);
  g.fillStyle = '#ffffff';
  g.fillText('SKEPNAD', c.width / 2, fy + 30);
  g.font = '600 18px "Chakra Petch", sans-serif';
  g.fillStyle = '#fcee0a';
  g.fillText(new Date().toLocaleDateString('sv-SE', { dateStyle: 'long' }).toUpperCase(), c.width / 2, fy + 60);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

function flashScreen() {
  const f = $('#flashfx');
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
}

// ---------------------------------------------------------------- Chatt-/Twitch-kommandon
const VOICE_CMDS = { robot: 'robot', ekorre: 'chipmunk', demon: 'demon', helium: 'helium', radio: 'radio', spöke: 'ghost', jätte: 'giant', anka: 'duck', drake: 'dragon' };
const KIND_ALIASES = { tomat: 'tomato', ägg: 'egg', anka: 'duck', sko: 'shoe', nalle: 'teddy', fisk: 'fish', blommor: 'flowers', tårta: 'cake' };
const cooldowns = new Map();
let lastCmd = 0;

function handleChat(user, text) {
  if (!effects || !text?.startsWith('!')) return false;
  const [cmdRaw, arg = ''] = text.slice(1).trim().split(/\s+/);
  const cmd = (cmdRaw || '').toLowerCase();
  const now = performance.now() / 1000;
  if (now - (cooldowns.get(cmd) ?? -1e9) < store.get('twitch.cooldown') || now - lastCmd < 1) return false;
  let icon_ = '✨';
  const eff = EFFECTS.find((e) => e.cmd === cmd || e.id === cmd) ?? (cmd === 'kasta' ? EFFECTS.find((e) => e.id === 'bonk') : null);
  if (eff) {
    const opts = eff.id === 'bonk' ? { kind: KIND_ALIASES[arg.toLowerCase()] ?? THROWABLES.find((t) => t.id === arg)?.id } : {};
    effects.trigger(eff.id, { ...opts, source: 'chat' });
    icon_ = eff.icon;
  } else if (VOICE_CMDS[cmd] && store.get('twitch.allowVoice')) {
    const preset = VOICE_CMDS[cmd];
    runtime.voiceOverride = { until: performance.now() + 10000, params: voiceParams(preset) };
    applyVoice();
    setTimeout(applyVoice, 10050);
    icon_ = VOICE_MAP[preset]?.icon ?? '🎙️';
  } else return false;
  cooldowns.set(cmd, now);
  lastCmd = now;
  if (store.get('overlays.chatAlerts')) compositor.overlay.alert(icon_, user, text);
  return true;
}

function updateTwitchChip(status = twitch.status) {
  const chip = $('[data-twitch-status]');
  if (!chip) return;
  const map = { off: ['', 'Inte ansluten'], connecting: ['warn', 'Ansluter…'], on: ['ok', `Ansluten till #${twitch.channel}`], error: ['bad', 'Anslutningsfel – försöker igen'] };
  const [cls, text] = map[status] ?? map.off;
  chip.className = `chip ${cls}`;
  chip.lastElementChild.textContent = text;
}

// ---------------------------------------------------------------- Inspelning, foto
function pickFile(accept, cb) {
  const i = Object.assign(document.createElement('input'), { type: 'file', accept });
  i.onchange = () => cb(i.files[0]);
  i.click();
}

async function toggleRecord() {
  if (countdownRunning()) {
    cancelCountdown();
    runtime.busy = false;
    toast('Nedräkningen avbröts.', 'info', 1400);
    return;
  }
  if (recorder.active) {
    const res = await recorder.stop();
    uiSounds.play('recStop');
    updateRecordUi();
    if (res?.saved) showClipDone(res.saved.name, res.duration);
    else if (res?.blob) {
      const key = await saveCapture(res.blob, `Skepnad ${stamp()}.${res.ext}`, res.duration);
      showClipDone(key, res.duration);
    }
    if (currentTab === 'clips') rerenderPanel();
    pushRemoteState();
    return;
  }
  if (runtime.busy) return;
  runtime.busy = true;
  stickers?.select(null);
  const ok = await countdown($('#countdown'), store.get('ui.countdown'), 'rec');
  runtime.busy = false;
  if (!ok) return;
  try {
    await recorder.start(window.skepnad.outputStream(), audio.stream, { host, baseName: `Skepnad ${stamp()}`, pixels: compositor.width * compositor.height });
    uiSounds.play('recStart');
    if (!runtime.mobile) toast('Inspelning startad – tryck R för att stoppa.');
  } catch (err) {
    console.error(err);
    toast('Kunde inte starta inspelningen.', 'error');
  }
  updateRecordUi();
  if (currentTab === 'clips') rerenderPanel();
  pushRemoteState();
}

async function screenshot() {
  stickers?.select(null);
  const blob = await compositor.screenshot();
  compositor.flash('#ffffff', 0.6);
  flashScreen();
  uiSounds.play('shutter');
  if (!blob) return;
  const key = await saveCapture(blob, `Skepnad ${stamp()}.png`);
  toast('📸 Fotot sparades i Mina klipp!', 'ok');
  refreshClips();
  if (runtime.mobile) showClipDone(key);
}

async function recordSound() {
  const mic = devices.micStream;
  if (!mic) return toast('Mikrofonen är inte igång.', 'error');
  const rec = new MediaRecorder(mic);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  if (!(await countdown($('#countdown'), 3, 'rec'))) return;
  rec.start();
  toast('🎙️ Spelar in ljud i 3 sekunder…', 'info', 2800);
  await sleep(3000);
  rec.stop();
  await done;
  const buf = await new Blob(chunks, { type: rec.mimeType }).arrayBuffer();
  const name = await promptModal({ title: 'Namnge ljudet', label: 'Vad ska knappen heta?', placeholder: 't.ex. Mitt skratt', value: 'Mitt ljud', maxlength: 24, iconName: 'mic' });
  await addSoundBuffer(buf, name || 'Mitt ljud');
}

function setClean(on) {
  runtime.clean = on;
  document.body.classList.toggle('clean', on);
  if (on) toast('Ren vy – tryck H eller Esc för att visa gränssnittet.', 'info', 2500);
}

function setWarpSet(list) {
  const set = [...new Set(list.filter((w) => w && w !== 'none'))].slice(0, 3);
  store.patch('face', { warp: set[0] ?? 'none', warps: set.slice(1) });
}

// ---------------------------------------------------------------- Actions
const actions = {
  persona: (id) => applyPersona(id),
  personaCat: (id) => {
    store.set('ui.personaCat', id);
    rerenderPanel();
  },
  dockCat: (id) => {
    store.set('ui.dockCat', id);
    renderDock();
  },
  avatarCat: (id) => {
    store.set('ui.avatarCat', id);
    rerenderPanel();
  },
  avatar: (id) => {
    if (id === 'custom' && !compositor.avatar.custom) return pickFile('.vrm,.glb,.gltf', (f) => handleFile('uploadModel', '', f));
    store.set('avatar.id', id);
    store.set('video.mode', 'avatar');
  },
  scene: (id) => store.patch('background', { scene: id, type: 'scene' }),
  filter: (id) => store.set('filter.id', id),
  addFilterLayer: (id) => {
    const extra = store.get('filter.extra') || [];
    if (store.get('filter.id') === 'none') {
      store.set('filter.id', id);
      toast('Filtret är valt – tryck ＋ på ett till för att kombinera.', 'ok', 2200);
    } else if (extra.length >= 3) toast('Max tre extra filterlager – ta bort ett under Lager först.', 'error');
    else {
      store.set('filter.extra', [...extra, { id, intensity: 0.8, on: true }]);
      uiSounds.play('pop');
      toast(`Lager tillagt: ${FILTERS.find((f) => f.id === id)?.name}`, 'ok', 1600);
    }
    rerenderPanel();
  },
  removeFilterLayer: (i) => {
    store.set('filter.extra', (store.get('filter.extra') || []).filter((_, k) => k !== Number(i)));
    uiSounds.play('delete');
    rerenderPanel();
  },
  toggleFilterLayer: (i) => {
    store.set('filter.extra', (store.get('filter.extra') || []).map((e, k) => (k === Number(i) ? { ...e, on: e.on === false } : e)));
    rerenderPanel();
  },
  accessory: (id) => {
    const next = toggleAccessory(store.get('face.accessories'), id);
    store.set('face.accessories', next);
    if (next.includes(id) && id === 'clownNose') audio.playSfx('honk');
    else if (next.includes(id)) audio.playSfx('pop');
    if (currentTab === 'layers') rerenderPanel();
  },
  clearAccessories: () => store.set('face.accessories', []),
  warp: (id) => {
    if (id === 'none') setWarpSet([]);
    else {
      const cur = [store.get('face.warp'), ...(store.get('face.warps') || [])];
      setWarpSet(cur.includes(id) ? cur.filter((w) => w !== id) : [...cur, id]);
    }
    rerenderPanel();
  },
  warpOff: (id) => {
    setWarpSet([store.get('face.warp'), ...(store.get('face.warps') || [])].filter((w) => w !== id));
    rerenderPanel();
  },
  voice: (id) => store.patch('voice', { preset: id, params: voiceParams(id), enabled: true }),
  sfx: (id, el) => {
    audio.playSfx(id);
    if (el) {
      el.classList.remove('playing');
      void el.offsetWidth;
      el.classList.add('playing');
    }
  },
  effect: (id) => effects.trigger(id),
  throw: (id) => effects.trigger('bonk', { kind: id }),
  record: toggleRecord,
  screenshot,
  photo,
  booth,
  random: randomLook,
  recordSound,
  capture: () => {
    const m = store.get('ui.captureMode');
    if (m === 'photo') photo();
    else if (m === 'booth') booth();
    else if (m === 'live') (live.state === 'live' ? live.stop() : startLive());
    else toggleRecord();
  },
  captureMode: (m) => {
    store.set('ui.captureMode', m);
    uiSounds.play('tab');
    updateCaptureUi();
    if (m === 'live' && !host.available) showTab('live');
  },
  timerCycle: () => {
    const order = [0, 3, 5, 10];
    const next = order[(order.indexOf(store.get('ui.countdown')) + 1) % order.length];
    store.set('ui.countdown', next);
    toast(next ? `Nedräkning: ${next} sekunder` : 'Nedräkning av', 'info', 1300);
  },
  flipCam: () => {
    if (!runtime.hasCamera) return toast('Ingen kamera igång.', 'error');
    store.set('video.cameraId', '');
    store.set('video.facing', store.get('video.facing') === 'user' ? 'environment' : 'user');
    uiSounds.play('glitch');
    compositor.glitch(1.2);
  },
  // klistermärken
  addSticker: (arg) => {
    const i = arg.indexOf('|');
    stickers.add({ kind: arg.slice(0, i), value: arg.slice(i + 1), placement: store.get('ui.stickerPlace') });
    if (runtime.mobile) closeSheet();
    else rerenderPanel();
  },
  addText: (style) => {
    const ta = $('#sticker-text');
    const text = ta?.value.trim();
    if (!text) {
      ta?.focus();
      return toast('Skriv något i rutan först.', 'error', 1800);
    }
    const colors = ['#ff2bd6', '#00f0ff', '#fcee0a', '#39ff88'];
    stickers.add({ kind: 'text', value: text, style, color: pick(colors), placement: style === 'meme' ? 'free' : store.get('ui.stickerPlace') === 'above' ? 'side' : store.get('ui.stickerPlace') });
    if (runtime.mobile) closeSheet();
    else rerenderPanel();
  },
  stickerPlace: (id) => {
    store.set('ui.stickerPlace', id);
    rerenderPanel();
  },
  emojiSet: (id) => {
    store.set('ui.emojiSet', id);
    rerenderPanel();
  },
  selectSticker: (id) => {
    stickers.select(id);
    if (runtime.mobile) closeSheet();
  },
  removeSticker: (id) => {
    stickers.remove(id);
    rerenderPanel();
  },
  clearStickers: () => {
    stickers.clear();
    rerenderPanel();
  },
  toggleLower: () => {
    store.set('overlays.lowerThird.enabled', false);
    rerenderPanel();
  },
  resetLook: async () => {
    if (!(await confirmModal({ title: 'Rensa allt?', text: 'Filter, tillbehör, förvrängningar och emojis tas bort.', okText: 'Rensa' }))) return;
    store.patch('filter', { id: 'none', extra: [] });
    store.patch('face', { accessories: [], warp: 'none', warps: [] });
    stickers.clear();
    store.set('overlays.lowerThird.enabled', false);
    rerenderPanel();
  },
  outputWindow: () => {
    const w = window.open('output.html', 'skepnad-output', 'width=1280,height=720');
    if (!w) toast('Popup blockerades – tillåt popup-fönster för den här sidan.', 'error', 4000);
    else toast('Sändningsfönstret öppnat – fånga det i OBS med Fönsterinspelning.', 'ok', 3500);
  },
  cleanView: () => setClean(!runtime.clean),
  help: () => openHelp(),
  tour: () => (runtime.mobile ? toast('Turen finns i datorvyn – håll inne en knapp för att se vad den gör.', 'info', 3500) : startTour()),
  toggleMode: () => {
    if (store.get('video.mode') === 'avatar' && !runtime.hasCamera) return toast('Ingen kamera igång – figurläget används.', 'info');
    store.set('video.mode', store.get('video.mode') === 'camera' ? 'avatar' : 'camera');
    if (currentTab === 'layers') rerenderPanel();
  },
  toggleMute: () => {
    store.set('voice.muted', !store.get('voice.muted'));
    if (currentTab === 'layers') rerenderPanel();
  },
  toggleUiSound: () => store.set('ui.sounds', !store.get('ui.sounds')),
  tab: (id) => showTab(id),
  closeSheet: () => closeSheet(),
  guide: (id) => openGuide(id, { showTab, record: toggleRecord, store, recording: () => recorder.active }),
  clip: (arg) => {
    const i = arg.indexOf('|');
    clipOps[arg.slice(0, i)]?.(arg.slice(i + 1));
  },
  openClipsFolder: () => (host.available ? host.openFolder('videos') : toast('Klippen ligger i appen – tryck Spara vid ett klipp för att lägga det i enheten.', 'info', 4000)),
  refreshClips: () => refreshClips(),
  liveStart: () => startLive(),
  liveStop: () => live.stop(),
  openKeyPage: (id) => openExternal(SERVICE_MAP[id]?.keyUrl),
  openPages: () => window.open(PAGES_URL, '_blank', 'noopener'),
  copyPages: async () => {
    await navigator.clipboard.writeText(PAGES_URL).catch(() => {});
    toast('Länken är kopierad – skicka den till mobilen!', 'ok');
  },
  install: async () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt = null;
    } else toast(runtime.mobile ? 'Tryck på menyn ⋮ i Chrome → "Lägg till på startskärmen".' : 'Klicka på installera-ikonen i adressfältet.', 'info', 5000);
  },
  extOpenFolder: async () => {
    if (!host.available) return toast('Starta Skepnad via ikonen på datorn för att öppna mappen.', 'error');
    const r = await host.openFolder('extension');
    await navigator.clipboard.writeText(r.path).catch(() => {});
    toast('Mappen är öppnad och sökvägen kopierad.', 'ok', 3500);
  },
  extOpenPage: () => openExternal(detectBrowser() === 'edge' ? 'edge://extensions' : 'chrome://extensions'),
  openCallSite: (id) => openExternal({ messenger: 'https://www.messenger.com/', meet: 'https://meet.google.com/', discord: 'https://discord.com/app' }[id]),
  remoteStart: async () => {
    if (!host.available) return;
    try {
      await host.startRemote();
      await host.refresh();
      rerenderPanel();
      pushRemoteState();
    } catch (err) {
      toast(`Kunde inte starta mobilkontrollen: ${err.message}`, 'error');
    }
  },
  remoteStop: async () => {
    await host.stopRemote();
    await host.refresh();
    rerenderPanel();
  },
  savePersona: async () => {
    const name = await promptModal({ title: 'Spara skepnad', label: 'Vad ska skepnaden heta?', placeholder: 't.ex. Kvällsstream', value: '' });
    if (!name) return;
    const s = store.get();
    const iconChar = s.video.mode === 'avatar' ? AVATAR_LIST.find((a) => a.id === s.avatar.id)?.icon : ACCESSORY_MAP[s.face.accessories[0]]?.icon || SCENE_MAP[s.background.scene]?.icon;
    const p = { id: `custom-${Date.now()}`, name, icon: iconChar || '⭐', look: snapshot(s) };
    store.set('personas.custom', [...(s.personas.custom || []), p]);
    store.set('personas.active', p.id);
    store.set('ui.personaCat', 'own');
    toast(`Skepnaden "${name}" sparad!`, 'ok');
    rerenderPanel();
    renderDock();
    renderCarousel();
  },
  deletePersona: (id) => {
    store.set('personas.custom', (store.get('personas.custom') || []).filter((p) => p.id !== id));
    rerenderPanel();
    renderDock();
    renderCarousel();
  },
  resetFilter: () => {
    const keep = store.get('filter');
    store.set('filter', { ...DEFAULTS.filter, id: keep.id, extra: keep.extra || [] });
  },
  resetColors: () => {
    const id = store.get('avatar.id');
    const def = AVATAR_LIST.find((a) => a.id === id)?.defaults ?? {};
    store.set(`avatar.colors.${id}`, { ...def });
  },
  clearPng: async () => {
    for (const k of ['idle', 'talk', 'blink', 'blinkTalk']) {
      await idb.del(`png:${k}`);
      delete pngFrames[k];
    }
    compositor.avatar.setPngFrames({});
    toast('Standardfiguren används igen.', 'ok');
  },
  deleteSound: async (id) => {
    await idb.del(`sound:${id}`);
    audio.customBuffers.delete(id);
    store.set('soundboard.custom', (store.get('soundboard.custom') || []).filter((c) => c.id !== id));
    rerenderPanel();
  },
  testOutput: () => audio.playSfx('ding'),
  testCommand: () => {
    const v = $('#cmd-test')?.value?.trim() || '!konfetti';
    if (!handleChat('Du (test)', v.startsWith('!') ? v : `!${v}`)) toast('Okänt kommando eller nedkylning pågår.', 'error');
  },
  resetAll: async () => {
    if (!(await confirmModal({ title: 'Återställ allt?', text: 'Alla inställningar och sparade skepnader raderas. Dina klipp finns kvar.', okText: 'Återställ' }))) return;
    store.reset();
    store.flush();
    location.reload();
  },
};

window.skepnad.actions = actions;

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !compositor) return;
  if (el.dataset.close !== undefined) setTimeout(() => actions[el.dataset.action]?.(el.dataset.arg, el, e), 0);
  else actions[el.dataset.action]?.(el.dataset.arg, el, e);
  if (el.closest('.card, .addlayer') || el.dataset.action === 'addFilterLayer') e.stopPropagation();
});
document.addEventListener('change', (e) => {
  const input = e.target.closest('input[data-file]');
  if (input) handleFile(input.dataset.file, input.dataset.arg, input.files[0]).finally(() => (input.value = ''));
});
document.addEventListener('input', (e) => {
  const r = e.target.closest?.('[data-layer-intensity]');
  if (!r) return;
  const i = Number(r.dataset.layerIntensity);
  store.set('filter.extra', (store.get('filter.extra') || []).map((x, k) => (k === i ? { ...x, intensity: Number(r.value) } : x)));
});
document.addEventListener('dragover', (e) => {
  const dz = e.target.closest?.('[data-drop]');
  if (!dz) return;
  e.preventDefault();
  dz.classList.add('drag');
});
document.addEventListener('dragleave', (e) => e.target.closest?.('[data-drop]')?.classList.remove('drag'));
document.addEventListener('drop', (e) => {
  const dz = e.target.closest?.('[data-drop]');
  if (!dz) return;
  e.preventDefault();
  dz.classList.remove('drag');
  handleFile(dz.dataset.drop, dz.dataset.arg, e.dataTransfer.files[0]);
});

// ---------------------------------------------------------------- Snabbtangenter
function cycle(list, current, dir) {
  const i = list.indexOf(current);
  return list[(i + dir + list.length) % list.length];
}

document.addEventListener('keydown', (e) => {
  if (!compositor) return;
  if (e.target.closest?.('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('.modal-back, .tour-card')) return;
  const k = e.key.toLowerCase();
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1) {
      if (e.shiftKey) {
        const p = allPersonas(store.get())[n - 1];
        if (p) applyPersona(p.id);
      } else {
        const all = [...SOUNDS, ...(store.get('soundboard.custom') || [])];
        if (all[n - 1]) audio.playSfx(all[n - 1].id);
      }
      e.preventDefault();
    }
    return;
  }
  const handled = {
    m: () => {
      actions.toggleMute();
      toast(store.get('voice.muted') ? 'Mikrofonen är avstängd' : 'Mikrofonen är på', store.get('voice.muted') ? 'error' : 'ok', 1400);
    },
    v: () => {
      store.set('voice.enabled', !store.get('voice.enabled'));
      toast(store.get('voice.enabled') ? 'Röstförvrängning på' : 'Din vanliga röst', 'ok', 1400);
    },
    a: () => actions.toggleMode(),
    b: () => store.patch('background', { type: 'scene', scene: cycle(SCENES.map((s) => s.id), store.get('background.scene'), e.shiftKey ? -1 : 1) }),
    f: () => store.set('filter.id', cycle(FILTERS.map((f) => f.id), store.get('filter.id'), e.shiftKey ? -1 : 1)),
    c: () => effects.trigger('confetti'),
    l: () => effects.trigger('hearts'),
    y: () => effects.trigger('fireworks'),
    t: () => effects.trigger('bonk'),
    z: () => randomLook(),
    e: () => showTab('stickers'),
    h: () => setClean(!runtime.clean),
    r: () => toggleRecord(),
    p: () => screenshot(),
    escape: () => {
      if (countdownRunning()) cancelCountdown();
      else if (runtime.clean) setClean(false);
    },
    '?': () => openHelp(2),
  }[e.key === '?' ? '?' : k];
  if (handled) {
    e.preventDefault();
    handled();
  }
});

// ---------------------------------------------------------------- Gränssnitt
let currentTab = null;
let unbindPanel = null;
let panelCleanup = null;
let brandLogo = null;

function buildShell() {
  $('#brand').innerHTML = `${emblemSvg({ size: 40, uid: 'top' })}<div class="brand-text">${wordmarkHtml()}<span>LIVE STUDIO</span></div>`;
  initStageTilt($('#stage'), () => !store.get('ui.reducedMotion'));

  $('#status').innerHTML = `
    <span class="chip" data-chip="cam" data-tip="Kamera|Visar om kameran är igång."><span class="dot"></span><span>Kamera</span></span>
    <span class="chip" data-chip="mic" data-tip="Mikrofon|Visar om mikrofonen är igång och om den är avstängd."><span class="dot"></span><span>Mikrofon</span></span>
    <span class="chip" data-chip="face" data-tip="Ansiktsspårning|Grön när AI:n ser ditt ansikte."><span class="dot"></span><span>Spårning</span></span>
    <span class="chip" data-chip="fps" data-tip="Bildrutor per sekund|Hur flytande bilden är. Över 30 är bra."><span class="dot"></span><span>– fps</span></span>`;

  $('#actions').innerHTML = `
    <button class="btn rec" data-action="record" data-tip="Spela in|Spelar in bild och ljud till en videofil – med nedräkning." data-key="R">${icon('rec', 16)}<span>Spela in</span></button>
    <button class="btn icon-only" data-action="screenshot" data-tip="Foto|Spara en bild av det tittarna ser." data-key="P">${icon('camera')}</button>
    <button class="btn icon-only" data-action="random" data-tip="Överraska mig|Slumpa en helt ny look." data-key="Z">${icon('dice')}</button>
    <button class="btn icon-only hide-sm" data-action="outputWindow" data-tip="Sändningsfönster|Öppna ett rent fönster för OBS Fönsterinspelning.">${icon('external')}</button>
    <button class="btn icon-only" data-action="cleanView" data-tip="Ren vy|Dölj gränssnittet så att bara bilden syns." data-key="H">${icon('eye-off')}</button>
    <span class="sep"></span>
    <button class="btn icon-only" data-action="toggleUiSound" data-ui-sound data-tip="Knappljud|Slå av eller på klickljuden (hörs bara för dig).">${icon('volume')}</button>
    <button class="btn icon-only" data-action="help" data-tip="Hjälp|Kom igång, streaming-guide och snabbtangenter." data-key="?">${icon('help')}</button>`;

  $('#rail').innerHTML = TABS.map((t, i) => `${i === TABS.length - 1 ? '<div class="spacer"></div>' : ''}${t.id === 'personas' || t.id === 'clips' ? '<div class="rail-sep"></div>' : ''}<button data-action="tab" data-arg="${t.id}" data-tab-id="${t.id}" data-tip="${esc(t.tip)}" aria-label="${t.label}">${icon(t.icon, 22)}<span>${t.label}</span></button>`).join('');

  const quickFx = [
    ['confetti', '🎊', 'C'],
    ['hearts', '💖', 'L'],
    ['fireworks', '🎆', 'Y'],
    ['sparkles', '✨', ''],
    ['bonk', '🍅', 'T'],
    ['boom', '💥', ''],
    ['fire', '🔥', ''],
    ['laugh', '😂', ''],
  ];
  $('#quickbar').innerHTML = `
    <div class="group">
      <button class="btn icon-only" data-action="toggleMute" data-mute-btn data-tip="Mikrofon|Stäng av eller slå på mikrofonen." data-key="M">${icon('mic')}</button>
      <div class="meter" data-meter="out" data-tip="Nivå|Så högt tittarna hör dig."></div>
    </div>
    <div class="seg" data-seg="video.mode" style="width:220px">
      <button data-value="camera" data-tip="Du själv|Du med plats, filter, tillbehör och emojis.">${icon('video', 15)}<span>Du själv</span></button>
      <button data-value="avatar" data-tip="Figur|En 3D-figur härmar dina miner.">${icon('bot', 15)}<span>Figur</span></button>
    </div>
    <button class="btn sm" data-action="tab" data-arg="voice" data-voice-chip data-tip="Aktiv röst|Klicka för att byta röst."></button>
    <button class="btn sm" data-action="tab" data-arg="stickers" data-tip="Emojis|Sätt emojis i bilden." data-key="E">${icon('emoji', 15)}<span>Emojis</span></button>
    <div class="grow"></div>
    <div class="fx-quick">${quickFx
      .map(([id, em, key]) => {
        const def = EFFECTS.find((x) => x.id === id);
        return `<button data-action="effect" data-arg="${id}" data-tip="${esc(def.name)}|${esc(def.desc)}"${key ? ` data-key="${key}"` : ''}>${em}</button>`;
      })
      .join('')}</div>`;
  bindAll($('#quickbar'), store);
  buildMeters($('#quickbar'));

  stickers = initStickerUi({ stage: $('#stage'), canvas: $('#out'), store, layer: () => compositor.overlay.stickers, size: () => ({ W: compositor.width, H: compositor.height }), toast });
  $('#out').addEventListener('pointerdown', () => {
    if (document.body.classList.contains('sheet-open') && !stickers.selected) setTimeout(() => !stickers.selected && closeSheet(), 0);
  });
  initSheetDrag();

  renderDock();
  renderMobile();
  store.subscribe('personas', () => {
    renderDock();
    updateCarousel();
  });
  store.subscribe('voice', updateVoiceChip, { immediate: true });
  store.subscribe('ui.sounds', (on) => ($('[data-ui-sound]').innerHTML = icon(on ? 'volume' : 'mute')), { immediate: true });
  showTab(runtime.mobile ? 'personas' : store.get('ui.tab') || 'home', { open: false });
  refreshClips();
}

function updateVoiceChip() {
  const v = store.get('voice');
  const def = VOICE_MAP[v.preset];
  const el = $('[data-voice-chip]');
  if (el) el.innerHTML = `${icon('waveform', 15)}<span>${v.enabled ? (def ? `${def.icon} ${def.name}` : '🎛️ Egen röst') : 'Naturlig (av)'}</span>`;
  $$('[data-mute-btn]').forEach((mb) => {
    mb.innerHTML = icon(v.muted ? 'mic-off' : 'mic', mb.classList.contains('m-round') ? 20 : 18);
    mb.classList.toggle('on-state', v.muted);
    mb.classList.toggle('on', v.muted);
  });
}

function renderDock() {
  const dock = $('#dock');
  if (!dock) return;
  const s = store.get();
  const cat = s.ui.dockCat || 'cartoon';
  const groups = [...PERSONA_GROUPS, ...(s.personas.custom?.length ? [{ id: 'own', name: 'Mina', icon: '⭐' }] : [])];
  $('#dock-cats').innerHTML = groups.map((g) => `<button class="chipbtn ${g.id === cat ? 'active' : ''}" data-action="dockCat" data-arg="${g.id}"><span>${g.icon}</span><span>${esc(g.name)}</span></button>`).join('') + `<button class="chipbtn" data-action="random" data-tip="Överraska mig|Slumpa en helt ny look.">🎲 <span>Slumpa</span></button>`;
  const all = allPersonas(s);
  const list = all.filter((p) => (cat === 'own' ? p.group === 'own' : p.group === cat));
  dock.innerHTML =
    list
      .map((p) => {
        const i = all.indexOf(p);
        return `<button class="p-card card-lite ${s.personas.active === p.id ? 'active' : ''}" data-action="persona" data-arg="${esc(p.id)}" data-tip="${esc(p.name)}|${esc(p.desc || 'Din egen skepnad.')}"${i < 9 ? ` data-key="Shift+${i + 1}"` : ''}><span class="e">${p.icon}</span><span class="n">${esc(p.name)}</span>${i < 9 ? `<kbd>⇧${i + 1}</kbd>` : ''}</button>`;
      })
      .join('') + `<button class="p-card add" data-action="savePersona" data-tip="Spara skepnad|Spara din nuvarande look så att du kan byta tillbaka med ett klick.">${icon('plus', 22)}</button>`;
}

// ---------------------------------------------------------------- Mobilvy
function renderMobile() {
  if (!compositor) return;
  $('#m-top').innerHTML = `
    <div class="m-brand">${emblemSvg({ size: 34, uid: 'm' })}${wordmarkHtml()}</div>
    <button class="m-round" data-action="timerCycle" data-tip="Nedräkning|Tryck för att välja 0, 3, 5 eller 10 sekunders nedräkning.">${icon('timer', 20)}<small data-timer-label></small></button>
    <button class="m-round" data-action="flipCam" data-tip="Vänd kameran|Växla mellan selfiekameran och den bakre kameran.">${icon('flip', 22)}</button>
    <button class="m-round" data-action="toggleMute" data-mute-btn data-tip="Mikrofon|Stäng av eller slå på mikrofonen.">${icon('mic', 20)}</button>
    <button class="m-round" data-action="tab" data-arg="menu" data-tip="Meny|Allt i Skepnad: klipp, ljud, text, inställningar…">${icon('menu', 22)}</button>`;
  $('#m-tools').innerHTML = MOBILE_TOOLS.map((id) => {
    const t = TABS.find((x) => x.id === id);
    return `<button class="m-tool" data-action="tab" data-arg="${id}" data-mtool="${id}" data-tip="${esc(t.tip)}">${icon(t.icon, 24)}<span>${t.short}</span></button>`;
  }).join('');
  $('#m-bottom').innerHTML = `
    <div class="m-pname" id="m-pname"></div>
    <div class="m-carousel" id="m-carousel"></div>
    <div class="m-capture">
      <button class="cap-side" data-action="tab" data-arg="clips" id="m-gallery" data-tip="Mina klipp|Titta på, dela och spara dina klipp och foton.">${icon('clapper', 24)}</button>
      <button class="cap-btn" id="cap-btn" data-action="capture" aria-label="Spela in" data-tip="Spela in|Tryck för att starta – tryck igen för att stoppa."></button>
      <button class="cap-side" data-action="random" data-tip="Överraska mig|Slumpa en helt ny look.">${icon('dice', 26)}</button>
    </div>
    <div class="m-modes" id="m-modes">${[
      ['photo', 'Foto'],
      ['video', 'Video'],
      ['booth', 'Fotobås'],
      ['live', 'Live'],
    ]
      .map(([m, l]) => `<button data-action="captureMode" data-arg="${m}">${l}</button>`)
      .join('')}</div>`;
  renderCarousel();
  updateCaptureUi();
  updateVoiceChip();
  updateGalleryButton();
}

let carouselLock = 0;
function renderCarousel() {
  const el = $('#m-carousel');
  if (!el) return;
  const s = store.get();
  el.innerHTML = allPersonas(s)
    .map((p) => `<button data-action="persona" data-arg="${esc(p.id)}" data-pid="${esc(p.id)}" class="${s.personas.active === p.id ? 'active' : ''}" aria-label="${esc(p.name)}">${p.icon}</button>`)
    .join('');
  if (!el.dataset.wired) {
    el.dataset.wired = '1';
    let t = null;
    el.addEventListener(
      'scroll',
      () => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (performance.now() < carouselLock) return;
          const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
          let best = null;
          let bd = 1e9;
          for (const b of el.children) {
            const r = b.getBoundingClientRect();
            const d = Math.abs(r.left + r.width / 2 - mid);
            if (d < bd) {
              bd = d;
              best = b;
            }
          }
          if (best && !best.classList.contains('active')) applyPersona(best.dataset.pid);
        }, 260);
      },
      { passive: true },
    );
  }
  updateCarousel(true);
}

function updateCarousel(instant = false) {
  const el = $('#m-carousel');
  if (!el) return;
  const id = store.get('personas.active');
  let act = null;
  for (const b of el.children) {
    const on = b.dataset.pid === id;
    b.classList.toggle('active', on);
    if (on) act = b;
  }
  if (act && runtime.mobile) {
    carouselLock = performance.now() + 900;
    const left = act.offsetLeft - el.clientWidth / 2 + act.offsetWidth / 2;
    el.scrollTo({ left, behavior: instant ? 'auto' : 'smooth' });
  }
}

function updateCaptureUi() {
  const mode = store.get('ui.captureMode');
  const btn = $('#cap-btn');
  if (btn) {
    btn.classList.toggle('photo', mode === 'photo');
    btn.classList.toggle('booth', mode === 'booth');
    btn.classList.toggle('on', recorder.active || (mode === 'live' && live.state === 'live'));
    btn.setAttribute('aria-label', { photo: 'Ta foto', booth: 'Fotobås', live: 'Gå live', video: 'Spela in' }[mode]);
  }
  $$('#m-modes button').forEach((b) => b.classList.toggle('active', b.dataset.arg === mode));
  const tl = $('[data-timer-label]');
  if (tl) tl.textContent = store.get('ui.countdown') ? `${store.get('ui.countdown')}s` : '';
  $('[data-action="timerCycle"]')?.classList.toggle('on', !!store.get('ui.countdown'));
}

function updateGalleryButton() {
  const g = $('#m-gallery');
  if (g) g.innerHTML = lastThumb ? `<img src="${lastThumb}" alt="">` : icon('clapper', 24);
}

function openSheet() {
  if (!runtime.mobile) return;
  document.body.classList.add('sheet-open');
  uiSounds.play('open');
}

function closeSheet() {
  if (!document.body.classList.contains('sheet-open')) return;
  document.body.classList.remove('sheet-open');
  $$('.m-tool').forEach((b) => b.classList.remove('active'));
  uiSounds.play('close');
}

function initSheetDrag() {
  const panel = $('#panel');
  let y0 = null;
  let dy = 0;
  const down = (e) => {
    if (!runtime.mobile) return;
    y0 = e.clientY;
    dy = 0;
    panel.style.transition = 'none';
  };
  const move = (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  };
  const up = () => {
    if (y0 === null) return;
    y0 = null;
    panel.style.transition = '';
    panel.style.transform = '';
    if (dy > 70) closeSheet();
  };
  $('#sheet-handle').addEventListener('pointerdown', down);
  $('.panel-head').addEventListener('pointerdown', (e) => !e.target.closest('button') && down(e));
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

function buildMeters(root) {
  $$('[data-meter]', root).forEach((m) => {
    if (m.children.length) return;
    m.innerHTML = '<i></i>'.repeat(m.dataset.meter === 'out' ? 16 : 20);
  });
}

function paintMeters() {
  const toDb = (v) => (v > 0 ? 20 * Math.log10(v) : -100);
  for (const m of $$('[data-meter]')) {
    const lvl = m.dataset.meter === 'in' ? audio.level : audio.outLevel * (store.get('voice.muted') ? 0 : 1);
    const k = Math.min(Math.max((toDb(lvl) + 60) / 60, 0), 1);
    const bars = m.children;
    const n = Math.round(k * bars.length);
    for (let i = 0; i < bars.length; i++) {
      const on = i < n;
      if (bars[i].classList.contains('on') !== on) bars[i].classList.toggle('on', on);
      const c = i / bars.length > 0.85 ? '#ff2d55' : i / bars.length > 0.65 ? '#fcee0a' : '#39ff88';
      bars[i].style.setProperty('--c', c);
    }
  }
}

function showTab(id, { open = true } = {}) {
  const tab = TABS.find((t) => t.id === id) ?? (id === 'menu' ? { id: 'menu', icon: 'menu', label: 'Meny' } : TABS[0]);
  currentTab = tab.id;
  if (tab.id !== 'menu') store.set('ui.tab', tab.id);
  $$('#rail [data-tab-id]').forEach((b) => b.classList.toggle('active', b.dataset.tabId === tab.id));
  $$('.m-tool').forEach((b) => b.classList.toggle('active', b.dataset.mtool === tab.id && open));
  renderPanel();
  if (open) openSheet();
}

function rerenderPanel() {
  if (currentTab) {
    const body = $('#panel-body');
    const top = body.scrollTop;
    renderPanel(false);
    body.scrollTop = top;
  }
}

function panelCtx() {
  return { host, calls: callBridge, live, runtime, mobile: runtime.mobile, browser: detectBrowser(), recording: recorder.active, ffProgress, installable: !!installPrompt || runtime.mobile, pagesUrl: PAGES_URL, onPages: location.hostname.endsWith('github.io') };
}

function renderPanel(animate = true) {
  unbindPanel?.();
  panelCleanup?.();
  const tab = TABS.find((t) => t.id === currentTab) ?? { id: 'menu', icon: 'menu' };
  const p = panelFor(currentTab);
  const s = store.get();
  if (currentTab === 'avatar') {
    const id = s.avatar.id;
    const def = AVATAR_LIST.find((a) => a.id === id)?.defaults ?? {};
    if (!s.avatar.colors?.[id] && Object.keys(def).length) store.set(`avatar.colors.${id}`, { ...def });
  }
  $('#panel-title').innerHTML = `${icon(tab.icon, 22)}<span>${p.title}</span>`;
  $('#panel-sub').textContent = p.sub;
  const close = $('.sheet-close');
  if (close && !close.innerHTML) close.innerHTML = icon('x', 18);
  const body = $('#panel-body');
  body.innerHTML = p.render(store.get(), panelCtx());
  if (animate) {
    body.classList.remove('swap');
    void body.offsetWidth;
    body.classList.add('swap');
    body.scrollTop = 0;
  }
  unbindPanel = bindAll(body, store, {
    onUserChange: (path) => {
      if (path.startsWith('voice.params.')) store.set('voice.preset', 'custom');
    },
  });
  buildMeters(body);
  panelCleanup = mountPanel(currentTab, body);
}

function fillSelect(sel, items, current) {
  if (!sel) return;
  const first = sel.options[0]?.outerHTML ?? '';
  sel.innerHTML = first + items.map((d) => `<option value="${esc(d.id)}">${esc(d.label)}</option>`).join('');
  sel.value = current ?? '';
}

function qrInto(box, url) {
  if (!box || !url) return;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

let sceneAtlas = null;
function mountPanel(id, body) {
  const cleanups = [];
  const every = (ms, fn) => {
    const h = setInterval(fn, ms);
    cleanups.push(() => clearInterval(h));
  };
  if (id === 'background') {
    sceneAtlas ??= compositor.sceneThumbs(SCENES.map((s) => s.id));
    $$('[data-thumb]', body).forEach((cardEl) => {
      const cv = cardEl.querySelector('canvas');
      const r = sceneAtlas.rects[cardEl.dataset.thumb];
      cv.getContext('2d').drawImage(sceneAtlas.canvas, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height);
      let raf = 0;
      let t0 = 0;
      const anim = (now) => {
        t0 ||= now;
        const one = compositor.sceneThumbs([cardEl.dataset.thumb], 3 + (now - t0) / 1000);
        cv.getContext('2d').drawImage(one.canvas, 0, 0, cv.width, cv.height);
        raf = setTimeout(() => requestAnimationFrame(anim), 50);
      };
      cardEl.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && requestAnimationFrame(anim));
      cardEl.addEventListener('pointerleave', () => clearTimeout(raf));
      cleanups.push(() => clearTimeout(raf));
    });
  }
  if (id === 'filter') {
    const paint = () => {
      const atlas = compositor.filterThumbs(FILTERS.map((f) => f.id));
      $$('[data-fthumb]', body).forEach((cardEl) => {
        const cv = cardEl.querySelector('canvas');
        const r = atlas.rects[cardEl.dataset.fthumb];
        cv.getContext('2d').drawImage(atlas.canvas, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height);
      });
    };
    setTimeout(paint, 60);
    every(runtime.mobile ? 3000 : 1500, paint);
  }
  if (id === 'voice') {
    devices.list().then((d) => fillSelect($('select[data-bind="voice.micId"]', body), d.mics, store.get('voice.micId')));
    const tuner = $('[data-tuner]', body);
    cleanups.push(store.subscribe('voice.params.autotune', (on) => tuner && (tuner.hidden = !on)));
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    every(80, () => {
      if (!tuner || tuner.hidden) return;
      const f = audio.meter.pitch;
      if (f > 0) {
        const midi = 69 + 12 * Math.log2(f / 440);
        tuner.querySelector('.note-name').textContent = `${names[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(Math.round(midi) / 12) - 1}`;
        const cents = (midi - Math.round(midi)) * 100;
        tuner.querySelector('i').style.left = `${50 + cents}%`;
      }
    });
  }
  if (id === 'calls') devices.list().then((d) => fillSelect($('select[data-bind="voice.outputDevice"]', body), d.outputs, store.get('voice.outputDevice')));
  if (id === 'live') {
    updateTwitchChip();
    every(500, () => {
      const t = $('[data-live-time]', body);
      if (t) t.textContent = fmtTime(live.elapsed);
      const st = $('[data-live-stats]', body);
      if (st && live.stats && !live.warn) st.textContent = `${Math.round(live.stats.fps)} bilder/s · ${live.stats.kbps ? `${Math.round(live.stats.kbps)} kbit/s · ` : ''}${live.stats.encoder === 'x264' ? 'processor' : 'grafikkort'}`;
    });
  }
  if (id === 'clips') {
    refreshClips();
    every(500, () => {
      const t = $('[data-rec-time]', body);
      if (t) t.textContent = fmtTime(recorder.elapsed);
    });
  }
  if (id === 'phone') {
    qrInto($('#pages-qr', body), PAGES_URL);
    qrInto($('#remote-qr', body), host.info?.remote?.urls?.[0]);
  }
  if (id === 'avatar') {
    const nameEl = $('#custom-model-name', body);
    const name = store.get('avatar.customName');
    if (nameEl && compositor.avatar.custom && name) {
      nameEl.hidden = false;
      nameEl.innerHTML = `${icon('box', 15)}<span>Laddad modell: <b>${esc(name)}</b></span>`;
    }
    cleanups.push(store.subscribe('avatar.id', () => setTimeout(rerenderPanel, 0)));
  }
  if (id === 'settings') {
    devices.list().then((d) => fillSelect($('select[data-bind="video.cameraId"]', body), d.cameras, store.get('video.cameraId')));
    every(500, () => {
      const el = $('[data-perf]', body);
      if (el) el.textContent = `${runtime.fps} fps · Spårning ${tracker.stats.faceMs.toFixed(1)} ms · Urklipp ${tracker.stats.segMs.toFixed(1)} ms · ${compositor.width}×${compositor.height}`;
    });
  }
  if (id === 'personas') cleanups.push(store.subscribe('personas.custom', () => setTimeout(rerenderPanel, 0)));
  if (id === 'layers') cleanups.push(store.subscribe('stickers.items', () => setTimeout(rerenderPanel, 0)));
  if (id === 'stickers') {
    let n = (store.get('stickers.items') || []).length;
    cleanups.push(
      store.subscribe('stickers.items', (items) => {
        if ((items || []).length !== n) {
          n = (items || []).length;
          setTimeout(rerenderPanel, 0);
        }
      }),
    );
  }
  return () => cleanups.forEach((c) => c());
}

function updateRecordUi() {
  $$('[data-action="record"]').forEach((b) => {
    b.classList.toggle('on', recorder.active);
    const label = b.querySelector('span');
    if (label) label.textContent = recorder.active ? 'Stoppa' : 'Spela in';
  });
  updateCaptureUi();
}

// ---------------------------------------------------------------- Huvudloop
let last = performance.now();
let fpsFrames = 0;
let fpsTime = 0;
let uiTime = 0;
let hintTimer = 0;
let lastFrameAt = 0;

function rafLoop(now) {
  requestAnimationFrame(rafLoop);
  frame(now);
}

// Kallas av rAF – eller av ljudtrådens hjärtslag när fönstret är dolt/täckt,
// så att samtal, livesändning och inspelning fortsätter i bakgrunden.
function frame(now) {
  if (now - lastFrameAt < 12) return;
  lastFrameAt = now;
  if (document.hidden && compositor.videoTex) compositor.videoTex.needsUpdate = true;
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const t = now / 1000;
  const s = store.get();
  const hasVideo = devices.hasCamera && devices.video.readyState >= 2;
  const mode = s.video.mode;
  if (hasVideo && tracker.ready.face) {
    tracker.process(devices.video, {
      segment: mode === 'camera' && s.background.type !== 'none',
      gesture: (s.effects.gestures || s.effects.wand) && tracker.ready.gesture,
      gestureEvery: s.effects.wand ? 2 : runtime.mobile ? 5 : 3,
      segEvery: runtime.mobile ? 2 : 1,
      faceSize: runtime.mobile ? 480 : 640,
    });
  }
  audio.tick();
  if (runtime.voiceOverride && now > runtime.voiceOverride.until) runtime.voiceOverride = null;
  effects.wand = s.effects.wand && hasVideo;
  effects.handleGesture(tracker.gesture, dt, s.effects.gestureMap, s.effects.gestures && hasVideo);
  effects.handleExpressions(tracker.face, dt, s.effects.expressionMap, s.effects.expressions && hasVideo);
  effects.update(dt, t);
  compositor.throwables.update(
    dt,
    () => {
      const a = compositor.faceAnchor(mode);
      return { x: a.x, y: a.y, r: a.unit };
    },
    (it, dir) => effects.onThrowHit(it, dir),
  );
  compositor.render({ dt, t, s, audio: s.voice.muted ? 0 : audio.level, hasVideo });
  stickers?.update();

  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    runtime.fps = Math.round(fpsFrames / fpsTime);
    fpsFrames = 0;
    fpsTime = 0;
    updateStatus(s, hasVideo);
  }
  uiTime += dt;
  if (uiTime > 1 / 30) {
    uiTime = 0;
    paintMeters();
  }
  hintTimer += dt;
  if (hintTimer > 0.5) {
    hintTimer = 0;
    updateHint(s, hasVideo);
  }
}

function setChip(name, cls, text) {
  const c = $(`[data-chip="${name}"]`);
  if (!c) return;
  c.className = `chip ${cls}`;
  c.lastElementChild.textContent = text;
}

function updateStatus(s, hasVideo) {
  setChip('cam', hasVideo ? 'ok' : 'bad', hasVideo ? 'Kamera' : 'Ingen kamera');
  setChip('mic', runtime.hasMic ? (s.voice.muted ? 'warn' : 'ok') : runtime.mode === 'demo' ? 'warn' : 'bad', runtime.hasMic ? (s.voice.muted ? 'Mik av' : 'Mikrofon') : runtime.mode === 'demo' ? 'Demoröst' : 'Ingen mik');
  setChip('face', tracker.face.present ? 'ok' : hasVideo ? 'warn' : '', tracker.face.present ? 'Ansikte hittat' : hasVideo ? 'Söker ansikte…' : 'Spårning av');
  setChip('fps', runtime.fps >= 28 ? 'ok' : runtime.fps >= 18 ? 'warn' : 'bad', `${runtime.fps} fps`);
  const badges = $('#stage-badges');
  const calls = callBridge?.activeCalls || 0;
  const want = [
    live.state === 'live' ? `<span class="badge rec"><span class="dot"></span>LIVE ${fmtTime(live.elapsed)}</span>` : '',
    recorder.active ? `<span class="badge rec"><span class="dot"></span>REC ${fmtTime(recorder.elapsed)}</span>` : '',
    calls ? `<span class="badge">📞 I samtal${calls > 1 ? ` (${calls})` : ''}</span>` : '',
    host.remoteCount ? '<span class="badge">📱 Mobil</span>' : '',
  ].join('');
  if (badges.innerHTML !== want) badges.innerHTML = want;
}

function updateHint(s, hasVideo) {
  const el = $('#stage-hint');
  let text = '';
  if (hasVideo && !tracker.face.present && tracker.ready.face && s.video.mode === 'camera') text = '👀 Hittar inget ansikte – titta in i kameran och se till att du har ljus framifrån.';
  else if (!hasVideo && s.video.mode === 'camera') text = '📷 Ingen kamera – byt till Figur eller starta om med kamera.';
  el.textContent = text;
  el.classList.toggle('fade', !text);
}
