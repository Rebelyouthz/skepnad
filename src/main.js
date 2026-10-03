// Skepnad – huvudprogram: startar enheter, renderare, ljud och gränssnitt.
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import './styles/app.css';
import * as THREE from 'three';
import { createStore } from './app/store.js';
import { DEFAULTS, VOICE_PARAM_DEFAULTS } from './app/defaults.js';
import { bus } from './app/bus.js';
import { idb } from './app/idb.js';
import { Devices } from './media/devices.js';
import { Tracker } from './media/tracker.js';
import { Compositor } from './render/compositor.js';
import { SCENES, SCENE_MAP } from './render/backgrounds/scenes.js';
import { FILTERS } from './render/filters.js';
import { SPR } from './render/fx/particles.js';
import { toggleAccessory, ACCESSORY_MAP } from './render/ar/accessories.js';
import { THROWABLES } from './render/fx/throwables.js';
import { AudioEngine } from './audio/engine.js';
import { uiSounds } from './audio/uiSounds.js';
import { VOICES, VOICE_MAP, voiceParams } from './audio/voices.js';
import { SOUNDS } from './audio/sfx.js';
import { Captions } from './audio/speech.js';
import { EffectsEngine, EFFECTS } from './app/effects.js';
import { applyLook, snapshot, allPersonas } from './app/personas.js';
import { Recorder, download, stamp, shareFile } from './app/recorder.js';
import { host } from './app/host.js';
import { LiveController, SERVICE_MAP, outputUrl } from './app/live.js';
import { CallBridge } from './app/callBridge.js';
import { openGuide } from './ui/guides.js';
import qrcode from 'qrcode-generator';
import { TwitchChat } from './integrations/twitch.js';
import { loadModel } from './avatar/custom.js';
import { AVATAR_LIST } from './avatar/avatarLayer.js';
import { icon } from './ui/icons.js';
import { TABS, panelFor, esc } from './ui/panels.js';
import { bindAll } from './ui/bind.js';
import { initTooltips, initTilt, initStageTilt, initUiSounds, toast, promptModal, openModal } from './ui/fx.js';
import { Logo3D } from './ui/logo3d.js';
import { openHelp, startTour } from './ui/help.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

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
let brandLogo = null;
const live = new LiveController();
let callBridge = null;
let ffProgress = null;
const runtime = { mode: null, hasCamera: false, hasMic: false, fps: 0, clean: false, voiceOverride: null, started: false };

window.skepnad = {
  store,
  runtime,
  outputStream: () => (outStream ??= compositor?.captureStream(30)),
  trigger: (id, o) => effects?.trigger(id, o),
  command: (text, user = 'test') => handleChat(user, text),
  get compositor() {
    return compositor;
  },
  audio,
  tracker,
  host,
  live,
  get calls() {
    return callBridge;
  },
};

document.documentElement.dataset.reducedMotion = String(store.get('ui.reducedMotion'));

// ---------------------------------------------------------------- Startskärm
const splashLogo = new Logo3D($('#splash-logo'));
splashLogo.start();
initTooltips(() => store.get('ui.tooltips'));
initTilt(() => !store.get('ui.reducedMotion'));
initUiSounds();
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
      await devices.startCamera(store.get('video.cameraId'), store.get('video.quality'));
      runtime.hasCamera = true;
    } catch (err) {
      console.warn('[kamera]', err);
      toast('Kunde inte starta kameran – avatarläge används istället.', 'error', 4200);
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

  await new Promise((r) => setTimeout(r, 250));
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
  if (!store.get('ui.seenTour')) setTimeout(() => startTour(() => store.set('ui.seenTour', true)), 1100);
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
      toast('Egen bakgrund aktiverad!', 'ok');
    } else if (action === 'uploadSound') {
      const buffer = await file.arrayBuffer();
      const id = `custom-${Date.now()}`;
      await audio.addCustomSound(id, buffer);
      await idb.set(`sound:${id}`, buffer);
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 24);
      store.set('soundboard.custom', [...(store.get('soundboard.custom') || []), { id, name }]);
      toast(`"${name}" tillagt i ljudbordet!`, 'ok');
      rerenderPanel();
    }
  } catch (err) {
    console.error(err);
    toast('Filen kunde inte läsas.', 'error');
  }
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
  let c = '#7c5cff';
  if (s.background.type === 'scene') c = SCENE_MAP[s.background.scene]?.tint ?? c;
  else if (s.background.type === 'green') c = '#00ff66';
  document.documentElement.style.setProperty('--ambient', c);
}

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
  const restartCam = async () => {
    if (!runtime.hasCamera) return;
    try {
      await devices.startCamera(store.get('video.cameraId'), store.get('video.quality'));
    } catch {
      toast('Kunde inte byta kamera.', 'error');
    }
  };
  store.subscribe('video.cameraId', restartCam);
  store.subscribe('video.quality', (q) => {
    compositor.setQuality(q, store.get('video.aspect'));
    restartCam();
  });
  store.subscribe('video.aspect', (a) => {
    compositor.setQuality(store.get('video.quality'), a);
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

// ---------------------------------------------------------------- Mobilkontroll
let pushTimer = null;
function schedulePushRemote() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemoteState, 200);
}

function pushRemoteState() {
  if (!host.available || !compositor) return;
  const s = store.get();
  const pick = (x) => ({ id: x.id, name: x.name, icon: x.icon });
  host.pushState({
    personas: allPersonas(s).map(pick),
    effects: EFFECTS.map(pick),
    sounds: [...SOUNDS, ...(s.soundboard.custom || []).map((c) => ({ ...c, icon: '🎵' }))].map(pick),
    voices: VOICES.map(pick),
    scenes: SCENES.map(pick),
    avatars: AVATAR_LIST.filter((a) => a.id !== 'custom' || compositor.avatar.custom).map(pick),
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

const REMOTE_ACTIONS = new Set(['persona', 'effect', 'sfx', 'voice', 'scene', 'avatar', 'toggleMute', 'record', 'screenshot', 'toggleMode', 'throw']);
function onRemoteCmd({ action, arg }) {
  if (!REMOTE_ACTIONS.has(action)) return;
  if (action === 'avatar' && arg === 'custom' && !compositor.avatar.custom) return;
  actions[action]?.(arg);
  schedulePushRemote();
}

// ---------------------------------------------------------------- Livesändning
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startLive() {
  if (!host.available) return toast('Livesändning kräver Skepnad-motorn – starta Skepnad via ikonen.', 'error', 5000);
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

// ---------------------------------------------------------------- Klipp
const clipUrl = (name) => `/clips/${encodeURIComponent(name)}`;
let memClips = []; // klipp utan motorn (nedladdade), för delning i samma session

async function clipBlob(name) {
  const mem = memClips.find((c) => c.name === name);
  if (mem) return mem.blob;
  return (await fetch(clipUrl(name))).blob();
}

const clipOps = {
  async share(name) {
    try {
      const ok = await shareFile(await clipBlob(name), name);
      if (!ok) throw new Error('nosupport');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (host.available && !memClips.some((c) => c.name === name)) {
        await host.copyToClipboard(name);
        toast('Klippet är kopierat – klistra in med Ctrl+V i chatten!', 'ok', 4500);
      } else toast('Delning stöds inte här.', 'error');
    }
  },
  async copy(name) {
    try {
      await host.copyToClipboard(name);
      toast('Kopierat! Klistra in med Ctrl+V i Messenger, Discord eller mejl.', 'ok', 4500);
    } catch {
      toast('Kunde inte kopiera klippet.', 'error');
    }
  },
  async youtube(name) {
    await openExternal('https://www.youtube.com/upload');
    if (host.available && name) await host.reveal(name).catch(() => {});
    toast('YouTube öppnas – dra klippet från mappen in i YouTube-fönstret.', 'ok', 7000);
  },
  async reveal(name) {
    if (host.available) await host.reveal(name);
  },
  async remove(name) {
    const ok = await promptModal({ title: 'Ta bort klippet?', label: `Skriv JA för att radera "${name}".`, okText: 'Ta bort' });
    if (ok?.toUpperCase() !== 'JA') return;
    await host.deleteClip(name);
    toast('Klippet är borttaget.', 'ok');
    refreshClips();
  },
  play(name) {
    const mem = memClips.find((c) => c.name === name);
    const src = mem ? mem.url : clipUrl(name);
    const isImg = /\.(png|jpg)$/i.test(name);
    openModal({ title: name, iconName: 'play-circle', content: isImg ? `<img src="${src}" style="width:100%;border-radius:14px">` : `<video src="${src}" controls autoplay style="width:100%;max-height:60vh;border-radius:14px;background:#000"></video>` });
  },
};

function fmtBytes(b) {
  return b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} kB`;
}

async function refreshClips() {
  const list = $('#clip-list');
  if (!list) return;
  let clips = memClips.map((c) => ({ name: c.name, size: c.blob.size, mtime: c.mtime, kind: 'video', url: c.url }));
  if (host.available) {
    try {
      clips = (await host.clips()).clips.map((c) => ({ ...c, url: clipUrl(c.name) }));
    } catch {
      /* ok */
    }
  }
  if (!clips.length) {
    list.innerHTML = '<p class="muted">Inga klipp ännu. Tryck <b>Spela in</b> ovan!</p>';
    return;
  }
  const a = (op, name, ic, label, tip, cls = '') => `<button class="btn sm ${cls}" data-action="clip" data-arg="${op}|${esc(name)}" data-tip="${tip}">${icon(ic, 14)}${label ? `<span>${label}</span>` : ''}</button>`;
  list.innerHTML = clips
    .slice(0, 60)
    .map(
      (c) => `<div class="clip">
        <button class="clip-thumb" data-action="clip" data-arg="play|${esc(c.name)}" data-tip="Spela|Titta på klippet.">${c.kind === 'image' ? `<img src="${c.url}" loading="lazy" alt="">` : `<video src="${c.url}#t=0.5" preload="metadata" muted></video>`}<span class="clip-play">${icon('play', 18)}</span></button>
        <div class="clip-meta"><b title="${esc(c.name)}">${esc(c.name)}</b><small>${new Date(c.mtime).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })} · ${fmtBytes(c.size)}</small>
          <div class="clip-actions">${a('share', c.name, 'share', 'Dela', 'Dela|Skicka via Windows delningsmeny (t.ex. till mobilen, mejl eller appar).', 'btn-primary')}${host.available ? a('copy', c.name, 'clip-copy', 'Kopiera', 'Kopiera|Kopiera filen – klistra sedan in med Ctrl+V i Messenger, Discord eller mejl.') : ''}${c.kind === 'video' ? a('youtube', c.name, 'upload', 'YouTube', 'YouTube|Öppnar YouTubes uppladdning och visar filen i mappen.') : ''}${host.available ? a('reveal', c.name, 'folder', '', 'Visa i mappen|Öppna Utforskaren vid filen.') : ''}${host.available ? a('remove', c.name, 'trash', '', 'Ta bort|Radera klippet.') : ''}</div>
        </div>
      </div>`,
    )
    .join('');
}

function showClipDone(name, duration) {
  const src = memClips.find((c) => c.name === name)?.url ?? clipUrl(name);
  const secs = Math.round(duration || 0);
  openModal({
    title: '🎉 Klippet är klart!',
    iconName: 'clapper',
    content: `<video src="${src}" controls autoplay muted style="width:100%;max-height:46vh;border-radius:14px;background:#000"></video>
      <p style="margin:10px 0 14px">${esc(name)} · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} ${host.available ? '· sparat i <b>Mina klipp</b>' : '· nedladdat till <b>Hämtade filer</b>'}</p>
      <div class="row" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn-primary" data-action="clip" data-arg="share|${esc(name)}" data-close>${icon('share', 16)}<span>Dela</span></button>
        ${host.available ? `<button class="btn" data-action="clip" data-arg="copy|${esc(name)}" data-close>${icon('clip-copy', 16)}<span>Kopiera till chatten</span></button>` : ''}
        <button class="btn" data-action="clip" data-arg="youtube|${esc(name)}" data-close>${icon('upload', 16)}<span>Lägg upp på YouTube</span></button>
        ${host.available ? `<button class="btn" data-action="clip" data-arg="reveal|${esc(name)}" data-close>${icon('folder', 16)}<span>Visa i mappen</span></button>` : ''}
      </div>`,
  });
}


// ---------------------------------------------------------------- Skepnader
function applyPersona(id) {
  const p = allPersonas(store.get()).find((x) => x.id === id);
  if (!p) return;
  compositor.glitch(1.6);
  compositor.flash('#ffffff', 0.45);
  uiSounds.play('transform');
  const a = compositor.faceAnchor(store.get('video.mode'));
  compositor.particles.emit({ x: a.x, y: a.y, jitter: a.unit * 2, count: 26, slot: SPR.puff, speed: [60, 260], drag: 2, life: [0.6, 1.2], size: [a.unit, a.unit * 2.2], sizeEnd: 1.6, colors: ['#ffffff', '#d9ccff', '#b9f3ff'], alpha: 0.85 });
  compositor.particles.emit({ x: a.x, y: a.y, jitter: a.unit * 2.4, count: 40, slot: SPR.spark, speed: [40, 200], life: [0.5, 1.1], size: [16, 40], sizeEnd: 0, colors: ['#ffffff', '#ffe38a', '#ff9bf0'], additive: true });
  setTimeout(() => {
    applyLook(store, p.look);
    store.set('personas.active', id);
  }, 110);
  toast(`${p.icon} ${p.name}`, 'ok', 1800);
}

// ---------------------------------------------------------------- Chatt-/Twitch-kommandon
const VOICE_CMDS = { robot: 'robot', ekorre: 'chipmunk', demon: 'demon', helium: 'helium', radio: 'radio', spöke: 'ghost', jätte: 'giant' };
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

// ---------------------------------------------------------------- Actions
function pickFile(accept, cb) {
  const i = Object.assign(document.createElement('input'), { type: 'file', accept });
  i.onchange = () => cb(i.files[0]);
  i.click();
}

async function toggleRecord() {
  if (recorder.active) {
    const res = await recorder.stop();
    uiSounds.play('recStop');
    updateRecordUi();
    if (res?.saved) showClipDone(res.saved.name, res.duration);
    else if (res?.blob) {
      const name = `Skepnad ${stamp()}.${res.ext}`;
      memClips.unshift({ name, blob: res.blob, url: URL.createObjectURL(res.blob), mtime: Date.now() });
      download(res.blob, name);
      showClipDone(name, res.duration);
    }
    if (currentTab === 'clips') rerenderPanel();
  } else {
    try {
      await recorder.start(window.skepnad.outputStream(), audio.stream, { host, baseName: `Skepnad ${stamp()}`, pixels: compositor.width * compositor.height });
      uiSounds.play('recStart');
      toast('Inspelning startad – tryck R för att stoppa.');
    } catch (err) {
      console.error(err);
      toast('Kunde inte starta inspelningen.', 'error');
    }
    updateRecordUi();
    if (currentTab === 'clips') rerenderPanel();
  }
  pushRemoteState();
}

async function screenshot() {
  const blob = await compositor.screenshot();
  compositor.flash('#ffffff', 0.6);
  uiSounds.play('shutter');
  if (!blob) return;
  const name = `Skepnad ${stamp()}.png`;
  if (host.available) {
    try {
      await host.saveBlob(name, blob);
      toast('Bilden sparades i Mina klipp!', 'ok');
      if (currentTab === 'clips') refreshClips();
      return;
    } catch {
      /* faller tillbaka */
    }
  }
  download(blob, name);
  toast('Skärmdump sparad!', 'ok');
}

function setClean(on) {
  runtime.clean = on;
  document.body.classList.toggle('clean', on);
  if (on) toast('Ren vy – tryck H eller Esc för att visa gränssnittet.', 'info', 2500);
}

const actions = {
  persona: (id) => applyPersona(id),
  avatar: (id) => {
    if (id === 'custom' && !compositor.avatar.custom) return pickFile('.vrm,.glb,.gltf', (f) => handleFile('uploadModel', '', f));
    store.set('avatar.id', id);
    store.set('video.mode', 'avatar');
  },
  scene: (id) => store.patch('background', { scene: id, type: 'scene' }),
  filter: (id) => store.set('filter.id', id),
  accessory: (id) => {
    const next = toggleAccessory(store.get('face.accessories'), id);
    store.set('face.accessories', next);
    if (next.includes(id) && id === 'clownNose') audio.playSfx('honk');
    else if (next.includes(id)) audio.playSfx('pop');
  },
  clearAccessories: () => store.set('face.accessories', []),
  warp: (id) => store.set('face.warp', id),
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
  outputWindow: () => {
    const w = window.open('output.html', 'skepnad-output', 'width=1280,height=720');
    if (!w) toast('Popup blockerades – tillåt popup-fönster för den här sidan.', 'error', 4000);
    else toast('Sändningsfönstret öppnat – fånga det i OBS med Fönsterinspelning.', 'ok', 3500);
  },
  cleanView: () => setClean(!runtime.clean),
  help: () => openHelp(),
  tour: () => startTour(),
  toggleMode: () => store.set('video.mode', store.get('video.mode') === 'camera' ? 'avatar' : 'camera'),
  toggleMute: () => store.set('voice.muted', !store.get('voice.muted')),
  toggleUiSound: () => store.set('ui.sounds', !store.get('ui.sounds')),
  tab: (id) => showTab(id),
  guide: (id) => openGuide(id, { showTab, record: toggleRecord, store, recording: () => recorder.active }),
  clip: (arg) => {
    const i = arg.indexOf('|');
    clipOps[arg.slice(0, i)]?.(arg.slice(i + 1));
  },
  openClipsFolder: () => (host.available ? host.openFolder('videos') : toast('Klippen finns i Hämtade filer.')),
  refreshClips: () => refreshClips(),
  liveStart: () => startLive(),
  liveStop: () => live.stop(),
  openKeyPage: (id) => openExternal(SERVICE_MAP[id]?.keyUrl),
  extOpenFolder: async () => {
    if (!host.available) return toast('Starta Skepnad via ikonen för att öppna mappen.', 'error');
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
    toast(`Skepnaden "${name}" sparad!`, 'ok');
    rerenderPanel();
    renderDock();
  },
  deletePersona: (id) => {
    store.set('personas.custom', (store.get('personas.custom') || []).filter((p) => p.id !== id));
    rerenderPanel();
    renderDock();
  },
  resetFilter: () => {
    const keep = store.get('filter.id');
    store.set('filter', { ...DEFAULTS.filter, id: keep });
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
    const ok = await promptModal({ title: 'Återställ allt?', label: 'Skriv JA för att radera alla inställningar och skepnader.', okText: 'Återställ' });
    if (ok?.toUpperCase() !== 'JA') return;
    store.reset();
    store.flush();
    location.reload();
  },
};

window.skepnad.actions = actions;

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !compositor) return;
  actions[el.dataset.action]?.(el.dataset.arg, el, e);
});
document.addEventListener('change', (e) => {
  const input = e.target.closest('input[data-file]');
  if (input) handleFile(input.dataset.file, input.dataset.arg, input.files[0]).finally(() => (input.value = ''));
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
    h: () => setClean(!runtime.clean),
    r: () => toggleRecord(),
    p: () => screenshot(),
    escape: () => runtime.clean && setClean(false),
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

function buildShell() {
  brandLogo = new Logo3D($('#brand-logo'), { particles: false, fps: 30 });
  brandLogo.start();
  initStageTilt($('#stage'), () => !store.get('ui.reducedMotion'));

  $('#status').innerHTML = `
    <span class="chip" data-chip="cam" data-tip="Kamera|Visar om kameran är igång."><span class="dot"></span><span>Kamera</span></span>
    <span class="chip" data-chip="mic" data-tip="Mikrofon|Visar om mikrofonen är igång och om den är avstängd."><span class="dot"></span><span>Mikrofon</span></span>
    <span class="chip" data-chip="face" data-tip="Ansiktsspårning|Grön när AI:n ser ditt ansikte."><span class="dot"></span><span>Spårning</span></span>
    <span class="chip" data-chip="fps" data-tip="Bildrutor per sekund|Hur flytande bilden är. Över 30 är bra."><span class="dot"></span><span>– fps</span></span>`;

  $('#actions').innerHTML = `
    <button class="btn rec" data-action="record" data-tip="Spela in|Spelar in bild och ljud till en videofil." data-key="R">${icon('rec', 16)}<span>Spela in</span></button>
    <button class="btn icon-only" data-action="screenshot" data-tip="Skärmdump|Spara en bild av det tittarna ser." data-key="P">${icon('camera')}</button>
    <button class="btn icon-only hide-sm" data-action="outputWindow" data-tip="Sändningsfönster|Öppna ett rent fönster för OBS Fönsterinspelning.">${icon('external')}</button>
    <button class="btn icon-only" data-action="cleanView" data-tip="Ren vy|Dölj gränssnittet så att bara bilden syns." data-key="H">${icon('eye-off')}</button>
    <span class="sep"></span>
    <button class="btn icon-only" data-action="toggleUiSound" data-ui-sound data-tip="Gränssnittsljud|Slå av eller på klick- och hovringsljud (hörs bara för dig).">${icon('volume')}</button>
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
    <div class="seg" data-seg="video.mode" style="width:210px">
      <button data-value="camera" data-tip="Kameraläge|Du själv med bakgrund, filter och tillbehör.">${icon('video', 15)}<span>Kamera</span></button>
      <button data-value="avatar" data-tip="Avatarläge|En 3D-figur härmar dina miner.">${icon('bot', 15)}<span>Avatar</span></button>
    </div>
    <button class="btn sm" data-action="tab" data-arg="voice" data-voice-chip data-tip="Aktiv röst|Klicka för att byta röst."></button>
    <div class="grow"></div>
    <div class="fx-quick">${quickFx
      .map(([id, e, key]) => {
        const def = EFFECTS.find((x) => x.id === id);
        return `<button data-action="effect" data-arg="${id}" data-tip="${esc(def.name)}|${esc(def.desc)}"${key ? ` data-key="${key}"` : ''}>${e}</button>`;
      })
      .join('')}</div>`;
  bindAll($('#quickbar'), store);
  buildMeters($('#quickbar'));

  renderDock();
  store.subscribe('personas', renderDock);
  store.subscribe('voice', updateVoiceChip, { immediate: true });
  store.subscribe('ui.sounds', (on) => ($('[data-ui-sound]').innerHTML = icon(on ? 'volume' : 'mute')), { immediate: true });
  showTab(store.get('ui.tab') || 'personas');
}

function updateVoiceChip() {
  const el = $('[data-voice-chip]');
  if (!el) return;
  const v = store.get('voice');
  const def = VOICE_MAP[v.preset];
  el.innerHTML = `${icon('waveform', 15)}<span>${v.enabled ? (def ? `${def.icon} ${def.name}` : '🎛️ Egen röst') : 'Naturlig (av)'}</span>`;
  const mb = $('[data-mute-btn]');
  if (mb) {
    mb.innerHTML = icon(v.muted ? 'mic-off' : 'mic');
    mb.classList.toggle('on-state', v.muted);
  }
}

function renderDock() {
  const dock = $('#dock');
  if (!dock) return;
  const s = store.get();
  dock.innerHTML =
    allPersonas(s)
      .map((p, i) => `<button class="p-card card-lite ${s.personas.active === p.id ? 'active' : ''}" data-action="persona" data-arg="${esc(p.id)}" data-tip="${esc(p.name)}|${esc(p.desc || 'Din egen skepnad.')}"${i < 9 ? ` data-key="Shift+${i + 1}"` : ''}><span class="e">${p.icon}</span><span class="n">${esc(p.name)}</span>${i < 9 ? `<kbd>⇧${i + 1}</kbd>` : ''}</button>`)
      .join('') + `<button class="p-card add" data-action="savePersona" data-tip="Spara skepnad|Spara din nuvarande look så att du kan byta tillbaka med ett klick.">${icon('plus', 22)}</button>`;
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
      const c = i / bars.length > 0.85 ? '#ff2d55' : i / bars.length > 0.65 ? '#ffb547' : '#3ddc97';
      bars[i].style.setProperty('--c', c);
    }
  }
}

function showTab(id) {
  const tab = TABS.find((t) => t.id === id) ?? TABS[0];
  currentTab = tab.id;
  store.set('ui.tab', tab.id);
  $$('#rail [data-tab-id]').forEach((b) => b.classList.toggle('active', b.dataset.tabId === tab.id));
  renderPanel();
}

function rerenderPanel() {
  if (currentTab) renderPanel();
}

function panelCtx() {
  return { host, calls: callBridge, live, runtime, browser: detectBrowser(), recording: recorder.active, ffProgress };
}

function renderPanel() {
  unbindPanel?.();
  panelCleanup?.();
  const tab = TABS.find((t) => t.id === currentTab);
  const p = panelFor(currentTab);
  const s = store.get();
  if (currentTab === 'avatar') {
    const id = s.avatar.id;
    const def = AVATAR_LIST.find((a) => a.id === id)?.defaults ?? {};
    if (!s.avatar.colors?.[id] && Object.keys(def).length) store.set(`avatar.colors.${id}`, { ...def });
  }
  $('#panel-title').innerHTML = `${icon(tab.icon, 22)}<span>${p.title}</span>`;
  $('#panel-sub').textContent = p.sub;
  const body = $('#panel-body');
  body.innerHTML = p.render(store.get(), panelCtx());
  body.classList.remove('swap');
  void body.offsetWidth;
  body.classList.add('swap');
  body.scrollTop = 0;
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
      cardEl.addEventListener('pointerenter', () => requestAnimationFrame(anim));
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
    every(1500, paint);
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
  if (id === 'calls') {
    devices.list().then((d) => fillSelect($('select[data-bind="voice.outputDevice"]', body), d.outputs, store.get('voice.outputDevice')));
  }
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
    const box = $('#remote-qr', body);
    const url = host.info?.remote?.urls?.[0];
    if (box && url) {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    }
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
  return () => cleanups.forEach((c) => c());
}

function updateRecordUi() {
  $$('[data-action="record"]').forEach((b) => {
    b.classList.toggle('on', recorder.active);
    const label = b.querySelector('span');
    if (label) label.textContent = recorder.active ? 'Stoppa' : 'Spela in';
  });
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
      gestureEvery: s.effects.wand ? 2 : 3,
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
  if (hasVideo && !tracker.face.present && tracker.ready.face) text = '👀 Hittar inget ansikte – titta in i kameran och se till att du har ljus framifrån.';
  else if (!hasVideo && s.video.mode === 'camera') text = '📷 Ingen kamera – byt till Avatar-läge eller starta om med kamera.';
  el.textContent = text;
  el.classList.toggle('fade', !text);
}

const fmtTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
