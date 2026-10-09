// Nedräkning 3-2-1 → REC / LIVE / FOTO. Ritas i HTML ovanpå scenen,
// så den kommer inte med i inspelningen eller sändningen.
import { uiSounds } from '../audio/uiSounds.js';

let running = null;

/**
 * Kör en nedräkning. seconds = 0 hoppar direkt till slutet.
 * kind: 'rec' | 'live' | 'photo'. Returnerar true om den fullföljdes, false om den avbröts.
 */
export function countdown(el, seconds, kind = 'rec') {
  cancelCountdown();
  const label = { rec: 'REC', live: 'LIVE', photo: 'FOTO', booth: 'LE!' }[kind] ?? 'GO';
  return new Promise((resolve) => {
    const state = { cancelled: false, resolve, timers: [] };
    running = state;
    el.hidden = false;
    const show = (text, cls = '') => {
      el.innerHTML = `<div class="ring"></div><span class="${cls}" data-n="${text}">${text}</span>`;
    };
    const finish = (ok) => {
      state.timers.forEach(clearTimeout);
      if (running === state) running = null;
      resolve(ok);
    };
    let n = Math.max(0, Math.round(seconds));
    const tick = () => {
      if (state.cancelled) return finish(false);
      if (n > 0) {
        show(String(n));
        uiSounds.play('count');
        navigator.vibrate?.(20);
        n -= 1;
        state.timers.push(setTimeout(tick, 1000));
      } else {
        show(label, `go ${kind}`);
        uiSounds.play('go');
        navigator.vibrate?.([30, 40, 60]);
        state.timers.push(
          setTimeout(() => {
            el.hidden = true;
            el.innerHTML = '';
          }, 750),
        );
        finish(true);
      }
    };
    state.cancel = () => {
      state.cancelled = true;
      el.hidden = true;
      el.innerHTML = '';
      finish(false);
    };
    tick();
  });
}

export function cancelCountdown() {
  running?.cancel?.();
  running = null;
}

export const countdownRunning = () => !!running;
