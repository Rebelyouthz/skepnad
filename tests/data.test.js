// Integritetstester för presets, skepnader, effekter och Twitch-parsning.
import { describe, it, expect } from 'vitest';
import { VOICES, voiceParams } from '../src/audio/voices.js';
import { VOICE_PARAM_DEFAULTS, DEFAULTS } from '../src/app/defaults.js';
import { BUILTIN_PERSONAS } from '../src/app/personas.js';
import { SCENES } from '../src/render/backgrounds/scenes.js';
import { FILTERS } from '../src/render/filters.js';
import { WARPS } from '../src/render/faceWarp.js';
import { parseIrc } from '../src/integrations/twitch.js';
import { ACCESSORIES } from '../src/render/ar/accessories.js';
import { AVATAR_LIST } from '../src/avatar/avatarLayer.js';

const sceneIds = new Set(SCENES.map((s) => s.id));
const filterIds = new Set(FILTERS.map((f) => f.id));
const voiceIds = new Set(VOICES.map((v) => v.id));
const warpIds = new Set(WARPS.map((w) => w.id));
const ACCESSORY_IDS = new Set(ACCESSORIES.map((a) => a.id));
const AVATAR_IDS = new Set(AVATAR_LIST.map((a) => a.id));

describe('röster', () => {
  it('har unika id och bara kända parametrar', () => {
    expect(voiceIds.size).toBe(VOICES.length);
    for (const v of VOICES) {
      for (const k of Object.keys(v.p)) expect(Object.keys(VOICE_PARAM_DEFAULTS)).toContain(k);
      expect(v.name && v.desc && v.icon).toBeTruthy();
    }
  });
  it('voiceParams ger kompletta parametrar', () => {
    const p = voiceParams('demon');
    expect(Object.keys(p).sort()).toEqual(Object.keys(VOICE_PARAM_DEFAULTS).sort());
    expect(p.pitch).toBe(-5);
    expect(voiceParams('finns-inte')).toEqual(VOICE_PARAM_DEFAULTS);
  });
});

describe('skepnader', () => {
  it('refererar bara till befintliga resurser', () => {
    for (const p of BUILTIN_PERSONAS) {
      const L = p.look;
      if (L.background?.scene) expect(sceneIds.has(L.background.scene)).toBe(true);
      if (L.filter?.id) expect(filterIds.has(L.filter.id)).toBe(true);
      if (L.voice?.preset) expect(voiceIds.has(L.voice.preset)).toBe(true);
      if (L.avatar?.id) expect(AVATAR_IDS.has(L.avatar.id)).toBe(true);
      for (const a of L.face?.accessories ?? []) expect(ACCESSORY_IDS.has(a)).toBe(true);
      if (L.face?.warp) expect(warpIds.has(L.face.warp)).toBe(true);
    }
  });
  it('standardinställningarna pekar på giltiga id', () => {
    expect(sceneIds.has(DEFAULTS.background.scene)).toBe(true);
    expect(filterIds.has(DEFAULTS.filter.id)).toBe(true);
    expect(voiceIds.has(DEFAULTS.voice.preset)).toBe(true);
    expect(BUILTIN_PERSONAS.some((p) => p.id === DEFAULTS.personas.active)).toBe(true);
  });
  it('varje scen har färgton och stämningsljud', () => {
    for (const s of SCENES) {
      expect(s.tint).toMatch(/^#[0-9a-f]{6}$/i);
      expect(s.ambience).toBeTruthy();
      expect(s.glsl).toContain('vec3 scene(vec2 uv)');
    }
  });
});

describe('twitch', () => {
  it('tolkar PRIVMSG med taggar', () => {
    const m = parseIrc('@badge-info=;color=#FF0000;display-name=Kalle;mod=0 :kalle!kalle@kalle.tmi.twitch.tv PRIVMSG #kanal :!konfetti nu');
    expect(m.command).toBe('PRIVMSG');
    expect(m.user).toBe('Kalle');
    expect(m.text).toBe('!konfetti nu');
    expect(m.tags.color).toBe('#FF0000');
    expect(m.params).toEqual(['#kanal']);
  });
  it('tolkar PING', () => {
    expect(parseIrc('PING :tmi.twitch.tv').command).toBe('PING');
  });
});
