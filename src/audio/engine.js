// Ljudmotor: mikrofon → röstprocessor → effektkedja → bussar (sändning / lokal).
import { makeImpulse } from './reverb.js';
import { Vocoder } from './vocoder.js';
import { SYNTH } from './sfx.js';
import { Ambience } from './ambience.js';
import { uiSounds } from './uiSounds.js';
import { VOICE_PARAM_DEFAULTS } from '../app/defaults.js';

const WORKLET_URL = () => new URL('worklets/voice-processor.js', document.baseURI).href;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.params = { ...VOICE_PARAM_DEFAULTS };
    this.meter = { rms: 0, gate: 1, pitch: -1, correction: 1 };
    this.level = 0;
    this.outLevel = 0;
    this.speaking = false;
    this.customBuffers = new Map();
    this.workletOk = false;
    this._reverbSize = -1;
  }

  async init() {
    if (this.ctx) return;
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;
    const g = (v = 1) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    const f = (type, freq, q = 0.7) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = freq;
      n.Q.value = q;
      return n;
    };

    // Bussar
    this.streamBus = g(1);
    this.localBus = g(1);
    this.streamDest = ctx.createMediaStreamDestination();
    this.streamBus.connect(this.streamDest);
    this.localBus.connect(ctx.destination);
    uiSounds.attach(ctx, ctx.destination);

    // Ingång
    this.inGain = g(1);
    this.inAnalyser = ctx.createAnalyser();
    this.inAnalyser.fftSize = 1024;
    this.inGain.connect(this.inAnalyser);
    this.hp = f('highpass', 70);
    this.inGain.connect(this.hp);

    try {
      await ctx.audioWorklet.addModule(WORKLET_URL());
      this.voice = new AudioWorkletNode(ctx, 'skepnad-voice', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      this.voice.port.onmessage = (e) => {
        if (e.data?.type === 'meter') this.meter = e.data;
      };
      this.workletOk = true;
    } catch (err) {
      console.warn('[audio] AudioWorklet saknas – röstförvrängning av tonhöjd avstängd', err);
      this.voice = g(1);
    }
    this.hp.connect(this.voice);

    // Klang (tilt-EQ) och bandbredd
    this.low = f('lowshelf', 250);
    this.high = f('highshelf', 3200);
    this.lowcut = f('highpass', 70, 0.7);
    this.highcut = f('lowpass', 16000, 0.7);
    this.voice.connect(this.low).connect(this.high).connect(this.lowcut).connect(this.highcut);

    // Distorsion (torr/våt)
    this.distDry = g(1);
    this.distWet = g(0);
    this.shaper = ctx.createWaveShaper();
    this.shaper.oversample = '2x';
    this.distOut = g(1);
    this.highcut.connect(this.distDry).connect(this.distOut);
    this.highcut.connect(this.shaper).connect(this.distWet).connect(this.distOut);

    // Chorus / vobbel
    this.chDelay = ctx.createDelay(0.1);
    this.chDelay.delayTime.value = 0.015;
    this.chLfo = ctx.createOscillator();
    this.chLfo.frequency.value = 1.2;
    this.chDepth = g(0.003);
    this.chLfo.connect(this.chDepth).connect(this.chDelay.delayTime);
    this.chLfo.start();
    this.chDry = g(1);
    this.chWet = g(0);
    this.chOut = g(1);
    this.distOut.connect(this.chDry).connect(this.chOut);
    this.distOut.connect(this.chDelay).connect(this.chWet).connect(this.chOut);

    // Tremolo
    this.trem = g(1);
    this.tremLfo = ctx.createOscillator();
    this.tremLfo.frequency.value = 5;
    this.tremDepth = g(0);
    this.tremLfo.connect(this.tremDepth).connect(this.trem.gain);
    this.tremLfo.start();
    this.chOut.connect(this.trem);

    // Vocoder (parallell)
    this.vocDry = g(1);
    this.vocWet = g(0);
    this.fxSum = g(1);
    this.trem.connect(this.vocDry).connect(this.fxSum);
    this.vocoder = null;

    // Eko
    this.echo = ctx.createDelay(2);
    this.echoFb = g(0.35);
    this.echoLp = f('lowpass', 3200);
    this.echoWet = g(0);
    this.fxSum.connect(this.echo);
    this.echo.connect(this.echoLp).connect(this.echoFb).connect(this.echo);
    this.echoLp.connect(this.echoWet);

    // Rumsklang
    this.convolver = ctx.createConvolver();
    this.revWet = g(0);
    this.fxSum.connect(this.convolver).connect(this.revWet);

    // Summering, brus, kompressor
    this.mix = g(1);
    this.fxSum.connect(this.mix);
    this.echoWet.connect(this.mix);
    this.revWet.connect(this.mix);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = nb;
    this.noiseSrc.loop = true;
    this.noiseGain = g(0);
    this.noiseSrc.connect(f('bandpass', 2500, 0.5)).connect(this.noiseGain).connect(this.mix);
    this.noiseSrc.start();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -22;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.makeup = g(1.5);
    this.voiceOut = g(1);
    this.mix.connect(this.comp).connect(this.makeup).connect(this.voiceOut);
    this.outAnalyser = ctx.createAnalyser();
    this.outAnalyser.fftSize = 1024;
    this.voiceOut.connect(this.outAnalyser);
    this.voiceOut.connect(this.streamBus);
    this.monitorGain = g(0);
    this.voiceOut.connect(this.monitorGain).connect(this.localBus);

    // Ljudbord och stämningsljud
    this.sfxBus = g(0.7);
    this.sfxToStream = g(1);
    this.sfxBus.connect(this.localBus);
    this.sfxBus.connect(this.sfxToStream).connect(this.streamBus);
    this.ambBus = g(0.35);
    this.ambToStream = g(0);
    this.ambBus.connect(this.localBus);
    this.ambBus.connect(this.ambToStream).connect(this.streamBus);
    this.ambience = new Ambience(ctx, this.ambBus);

    this._buf = new Float32Array(1024);
    this.ready = true;
    this.applyParams(this.params);
  }

  resume() {
    return this.ctx?.state === 'suspended' ? this.ctx.resume() : Promise.resolve();
  }

  setMicStream(stream) {
    this.micSource?.disconnect();
    this.micSource = null;
    if (!stream || !this.ctx) return;
    this.micSource = this.ctx.createMediaStreamSource(stream);
    this.micSource.connect(this.inGain);
  }

  /** Spela syntetisk demoröst (för demoläge utan mikrofon). */
  setDemoVoice(on) {
    if (!this.ctx) return;
    if (!on) {
      this.demo?.stop();
      this.demo = null;
      return;
    }
    if (this.demo) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 150;
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 800;
    f1.Q.value = 3;
    const env = ctx.createGain();
    env.gain.value = 0;
    o.connect(f1).connect(env).connect(this.inGain);
    o.start();
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const at = t + i * 0.22;
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(0.25, at + 0.04);
        env.gain.linearRampToValueAtTime(0, at + 0.18);
        o.frequency.setValueAtTime(130 + Math.random() * 60, at);
        f1.frequency.setValueAtTime(500 + Math.random() * 900, at);
      }
      setTimeout(loop, 1320 + 700);
    };
    loop();
    this.demo = { stop: () => ((alive = false), o.stop(), env.disconnect()) };
  }

  applyParams(p) {
    this.params = { ...VOICE_PARAM_DEFAULTS, ...p };
    if (!this.ready) return;
    const P = this.params;
    const t = this.ctx.currentTime;
    const set = (param, v, tc = 0.03) => param.setTargetAtTime(v, t, tc);
    if (this.workletOk) {
      this.voice.port.postMessage({
        type: 'params',
        params: {
          pitch: P.pitch,
          harmony: P.harmony,
          harmonyMix: P.harmonyMix,
          autotune: P.autotune,
          autotuneKey: P.autotuneKey,
          autotuneScale: P.autotuneScale,
          autotuneSpeed: P.autotuneSpeed,
          robot: P.robot,
          ringFreq: P.ringFreq,
        },
      });
    }
    set(this.low.gain, -P.tone * 7);
    set(this.high.gain, P.tone * 8);
    set(this.lowcut.frequency, Math.max(P.lowcut, 70 + P.radio * 450));
    set(this.highcut.frequency, Math.min(P.highcut, 16000 - P.radio * 12600));
    this.lowcut.Q.value = 0.7 + P.radio * 1.2;
    this.highcut.Q.value = 0.7 + P.radio * 1.2;
    // distorsion
    const k = P.distortion * 60;
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / 512) - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    this.shaper.curve = curve;
    const wet = Math.min(P.distortion * 1.6, 1);
    set(this.distWet.gain, wet / (1 + P.distortion * 3.4));
    set(this.distDry.gain, 1 - wet);
    // chorus + vobbel
    const chorusMix = Math.min(P.chorus + P.wobble * 0.5, 1);
    set(this.chWet.gain, chorusMix * 0.8);
    set(this.chDry.gain, 1 - chorusMix * 0.45);
    set(this.chDepth.gain, 0.002 + P.wobble * 0.006);
    set(this.chLfo.frequency, P.wobble > 0 ? 0.6 + (1 - P.wobble) * 1.4 : 1.3);
    // tremolo
    set(this.trem.gain, 1 - P.tremolo * 0.5);
    set(this.tremDepth.gain, P.tremolo * 0.5);
    set(this.tremLfo.frequency, P.tremoloRate);
    // vocoder
    if (P.vocoder > 0 && !this.vocoder) {
      this.vocoder = new Vocoder(this.ctx);
      this.trem.connect(this.vocoder.input);
      this.vocoder.output.connect(this.vocWet).connect(this.fxSum);
    }
    this.vocoder?.setKey(P.vocoderKey);
    set(this.vocWet.gain, P.vocoder);
    set(this.vocDry.gain, 1 - P.vocoder * 0.92);
    // eko
    set(this.echo.delayTime, P.echoTime, 0.08);
    set(this.echoFb.gain, Math.min(P.echoFeedback, 0.85));
    set(this.echoWet.gain, P.echo * 0.9);
    // rumsklang
    if (Math.abs(P.reverbSize - this._reverbSize) > 0.02) {
      this._reverbSize = P.reverbSize;
      clearTimeout(this._revTimer);
      this._revTimer = setTimeout(() => (this.convolver.buffer = makeImpulse(this.ctx, P.reverbSize)), 60);
    }
    set(this.revWet.gain, P.reverb * 1.3);
    set(this.noiseGain.gain, P.noise * 0.05);
    set(this.makeup.gain, 1.5 / (1 + P.radio * 0.9 + (P.harmony?.length ? P.harmonyMix * 0.6 : 0)));
  }

  setInputGain(v) {
    if (this.ready) this.inGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  setGate(db) {
    if (this.workletOk) this.voice.port.postMessage({ type: 'params', params: { gate: db } });
  }

  setBypass(bypass) {
    if (this.workletOk) this.voice.port.postMessage({ type: 'params', params: { bypass } });
  }

  setMuted(muted) {
    if (this.ready) this.voiceOut.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  setMonitor(on, vol = 0.8) {
    if (this.ready) this.monitorGain.gain.setTargetAtTime(on ? vol : 0, this.ctx.currentTime, 0.03);
  }

  setSfx(volume, toStream) {
    if (!this.ready) return;
    this.sfxBus.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.03);
    this.sfxToStream.gain.setTargetAtTime(toStream ? 1 : 0, this.ctx.currentTime, 0.03);
  }

  setAmbience(id, { enabled, volume, toStream }) {
    if (!this.ready) return;
    this.ambBus.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    this.ambToStream.gain.setTargetAtTime(toStream ? 1 : 0, this.ctx.currentTime, 0.05);
    if (enabled && id) this.ambience.play(id);
    else this.ambience.stop();
  }

  /** Välj ljudutgång för sändningen (t.ex. VB-Cable) via ett dolt <audio>-element. */
  async setOutputDevice(deviceId) {
    if (!this.ready) return false;
    if (!deviceId) {
      this.outEl?.pause();
      if (this.outEl) this.outEl.srcObject = null;
      return true;
    }
    if (!('setSinkId' in HTMLMediaElement.prototype)) return false;
    this.outEl ??= Object.assign(new Audio(), { autoplay: true });
    this.outEl.srcObject = this.streamDest.stream;
    await this.outEl.setSinkId(deviceId);
    await this.outEl.play().catch(() => {});
    return true;
  }

  playSfx(name, { toStream = true } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.01;
    if (this.customBuffers.has(name)) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.customBuffers.get(name);
      s.connect(this.sfxBus);
      s.start(t);
      return;
    }
    const fn = SYNTH[name];
    if (!fn) return;
    fn(this.ctx, toStream ? this.sfxBus : this.localBus, t);
  }

  async addCustomSound(id, arrayBuffer) {
    const buf = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    this.customBuffers.set(id, buf);
    return buf.duration;
  }

  /** Anropas varje bildruta: nivåer, prat-detektering, walkie-brusklick. */
  tick() {
    if (!this.ready) return;
    const rms = (an) => {
      an.getFloatTimeDomainData(this._buf);
      let s = 0;
      for (let i = 0; i < this._buf.length; i++) s += this._buf[i] * this._buf[i];
      return Math.sqrt(s / this._buf.length);
    };
    const inR = rms(this.inAnalyser) * (this.meter.gate ?? 1);
    const outR = rms(this.outAnalyser);
    this.level += (inR - this.level) * (inR > this.level ? 0.6 : 0.15);
    this.outLevel += (outR - this.outLevel) * (outR > this.outLevel ? 0.6 : 0.15);
    const was = this.speaking;
    this.speaking = this.level > (was ? 0.012 : 0.02);
    if (this.params.squelch && was !== this.speaking) {
      SYNTH.squelch(this.ctx, this.mix, this.ctx.currentTime + 0.01);
    }
  }

  get stream() {
    return this.streamDest?.stream ?? null;
  }
}
