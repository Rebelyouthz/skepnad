// Live-textning via webbläsarens taligenkänning (Chrome/Edge). Kräver internet.
import { bus } from '../app/bus.js';

export class Captions {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SR;
    this.SR = SR;
    this.active = false;
    this.rec = null;
  }

  start(lang = 'sv-SE') {
    if (!this.supported || this.active) return this.supported;
    this.active = true;
    this.lang = lang;
    this._boot();
    return true;
  }

  _boot() {
    const rec = new this.SR();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) bus.emit('caption', { text: final.trim(), final: true });
      else if (interim) bus.emit('caption', { text: interim.trim(), final: false });
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.active = false;
        bus.emit('toast', { kind: 'error', text: 'Taligenkänning nekades av webbläsaren.' });
      }
    };
    rec.onend = () => {
      if (this.active) setTimeout(() => this.active && this._boot(), 250);
    };
    try {
      rec.start();
    } catch {
      /* startar redan */
    }
    this.rec = rec;
  }

  stop() {
    this.active = false;
    try {
      this.rec?.stop();
    } catch {
      /* ignorera */
    }
    this.rec = null;
  }
}
