// Deklarativ koppling mellan kontroller och store.
//   <input type=range data-bind="filter.brightness" data-fmt="pct">
//   <input type=checkbox data-bind="background.parallax">
//   <select data-bind="voice.params.autotuneKey" data-type="num|arr|str">
//   <div class="seg" data-seg="background.type"><button data-value="scene">
//   [data-active-path="filter.id"][data-value="noir"]  → klass "active"
import { uiSounds } from '../audio/uiSounds.js';

export function formatValue(v, fmt) {
  const n = Number(v);
  switch (fmt) {
    case 'pct':
      return `${Math.round(n * 100)}%`;
    case 'spct':
      return `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`;
    case 'st':
      return `${n > 0 ? '+' : ''}${n} halvtoner`;
    case 'db':
      return `${Math.round(n)} dB`;
    case 'hz':
      return `${Math.round(n)} Hz`;
    case 'ms':
      return `${Math.round(n * 1000)} ms`;
    case 'x':
      return `${n.toFixed(2)}×`;
    case 's':
      return `${Math.round(n)} s`;
    case 'int':
      return `${Math.round(n)}`;
    default:
      return n.toFixed(2);
  }
}

const parse = (el, raw) => {
  const t = el.dataset.type;
  if (t === 'num') return Number(raw);
  if (t === 'arr') return raw ? raw.split(',').map(Number) : [];
  if (t === 'bool') return raw === 'true';
  return raw;
};
const serialize = (el, v) => (el.dataset.type === 'arr' ? (v || []).join(',') : String(v ?? ''));

export function bindAll(root, store, { onUserChange } = {}) {
  const unsubs = [];
  const sub = (path, fn) => unsubs.push(store.subscribe(path, fn, { immediate: true }));

  root.querySelectorAll('input[type=range][data-bind]').forEach((el) => {
    const path = el.dataset.bind;
    const valEl = el.closest('.ctl')?.querySelector('.val');
    const min = Number(el.min || 0);
    const max = Number(el.max || 1);
    const paint = (v) => {
      el.style.setProperty('--p', `${((v - min) / (max - min)) * 100}%`);
      if (valEl) valEl.textContent = formatValue(v, el.dataset.fmt);
    };
    sub(path, (v) => {
      if (v === undefined) return;
      if (document.activeElement !== el) el.value = v;
      paint(Number(el.value));
    });
    el.addEventListener('input', () => {
      const v = Number(el.value);
      paint(v);
      store.set(path, v);
      onUserChange?.(path, v);
    });
    el.addEventListener('dblclick', () => {
      const d = el.dataset.default;
      if (d === undefined) return;
      store.set(path, Number(d));
      onUserChange?.(path, Number(d));
    });
  });

  root.querySelectorAll('input[type=checkbox][data-bind]').forEach((el) => {
    const path = el.dataset.bind;
    sub(path, (v) => (el.checked = !!v));
    el.addEventListener('change', () => {
      store.set(path, el.checked);
      uiSounds.play(el.checked ? 'on' : 'off');
      onUserChange?.(path, el.checked);
    });
  });

  root.querySelectorAll('select[data-bind], input[type=text][data-bind], input[type=color][data-bind]').forEach((el) => {
    const path = el.dataset.bind;
    sub(path, (v) => {
      if (document.activeElement !== el || el.tagName === 'SELECT') el.value = serialize(el, v);
    });
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const v = parse(el, el.value);
      store.set(path, v);
      if (el.tagName === 'SELECT') uiSounds.play('click');
      onUserChange?.(path, v);
    });
  });

  root.querySelectorAll('[data-seg]').forEach((seg) => {
    const path = seg.dataset.seg;
    const buttons = [...seg.querySelectorAll('button[data-value]')];
    sub(path, (v) => buttons.forEach((b) => b.classList.toggle('active', String(v) === b.dataset.value)));
    buttons.forEach((b) =>
      b.addEventListener('click', () => {
        const v = parse(seg, b.dataset.value);
        store.set(path, v);
        uiSounds.play('select');
        onUserChange?.(path, v);
      }),
    );
  });

  const actives = [...root.querySelectorAll('[data-active-path]')];
  const paths = [...new Set(actives.map((el) => el.dataset.activePath))];
  for (const path of paths) {
    const els = actives.filter((el) => el.dataset.activePath === path);
    sub(path, (v) => {
      for (const el of els) {
        const on = Array.isArray(v) ? v.includes(el.dataset.value) : String(v) === el.dataset.value;
        el.classList.toggle('active', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    });
  }
  return () => unsubs.forEach((u) => u());
}
