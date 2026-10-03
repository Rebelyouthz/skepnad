// Standardtillstånd. Allt här sparas i localStorage (utom det som ligger i runtime).

export const VOICE_PARAM_DEFAULTS = {
  pitch: 0, // halvtoner
  harmony: [], // extra stämmor i halvtoner
  harmonyMix: 0.55,
  autotune: false,
  autotuneKey: 0, // 0 = C
  autotuneScale: 'major',
  autotuneSpeed: 0.85,
  robot: 0, // ringmodulering 0..1
  ringFreq: 55,
  lowcut: 70,
  highcut: 16000,
  radio: 0, // bandpass-karaktär 0..1
  distortion: 0,
  chorus: 0,
  tremolo: 0,
  tremoloRate: 5,
  tone: 0, // klangfärg -1 (mörk) .. 1 (ljus)
  echo: 0,
  echoTime: 0.28,
  echoFeedback: 0.35,
  reverb: 0,
  reverbSize: 0.5,
  vocoder: 0,
  vocoderKey: 0,
  noise: 0, // brus/statik
  squelch: false,
  wobble: 0, // undervattensvobbel
};

export const DEFAULTS = {
  version: 1,
  video: {
    mode: 'camera', // 'camera' | 'avatar'
    mirror: true,
    quality: 'balanced', // 'high' | 'balanced' | 'fast'
    autoFrame: false,
    autoFrameZoom: 1.35,
    aspect: 'landscape', // 'landscape' (16:9) | 'portrait' (9:16)
    cameraId: '',
    feather: 0.5,
  },
  background: {
    type: 'scene', // 'none' | 'blur' | 'scene' | 'image' | 'green'
    scene: 'cabin',
    blur: 0.7,
    parallax: true,
    reactive: true,
    filterAffectsBg: true,
  },
  filter: {
    id: 'none',
    intensity: 1,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    vignette: 0.25,
    grain: 0.05,
    sharpen: 0.15,
    beauty: 0.25,
    lightWrap: 0.6,
    relight: 0.5,
  },
  face: {
    accessories: [],
    warp: 'none',
    warpStrength: 0.85,
  },
  avatar: {
    id: 'robot',
    colors: {},
    scale: 1,
    offsetY: 0,
    headFollow: 1,
    customName: '',
    pngDim: false,
  },
  effects: {
    gestures: true,
    expressions: true,
    expressionMap: { breath: true, sparkle: true, wink: true, kiss: true, surprise: true },
    gestureMap: {
      Thumb_Up: 'thumbs',
      Victory: 'confetti',
      Open_Palm: 'sparkles',
      ILoveYou: 'hearts',
      Pointing_Up: 'fireworks',
      Closed_Fist: 'boom',
      Thumb_Down: 'sad',
    },
    reactToVoice: true,
    wand: false,
  },
  voice: {
    enabled: true,
    preset: 'natural',
    params: { ...VOICE_PARAM_DEFAULTS },
    monitor: false,
    monitorVolume: 0.8,
    inputGain: 1,
    gate: -58,
    micId: '',
    outputDevice: '',
    noiseSuppression: true,
    muted: false,
  },
  soundboard: { volume: 0.7, toStream: true, custom: [] },
  ambience: { enabled: false, volume: 0.35, toStream: false },
  overlays: {
    lowerThird: { enabled: false, name: 'Ditt namn', title: 'Live just nu', style: 'glass' },
    captions: { enabled: false, lang: 'sv-SE' },
    clock: false,
    live: false,
    frame: 'none', // 'none' | 'neon' | 'cinema'
    chatAlerts: true,
  },
  twitch: { channel: '', enabled: false, cooldown: 8, allowVoice: true },
  live: {
    saveCopy: true,
    quality: 'auto', // 'auto' | '720' | '1080'
    services: {
      youtube: { enabled: false, key: '', url: '' },
      twitch: { enabled: false, key: '', url: '' },
      kick: { enabled: false, key: '', url: '' },
      tiktok: { enabled: false, key: '', url: '' },
      facebook: { enabled: false, key: '', url: '' },
      custom: { enabled: false, key: '', url: '' },
    },
  },
  personas: { active: 'cozy', custom: [] },
  ui: {
    sounds: true,
    soundVolume: 0.55,
    tab: 'home',
    tooltips: true,
    seenTour: false,
    reducedMotion: false,
  },
};
