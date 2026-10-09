// Dra, nyp, skala och rotera klistermärken direkt i bilden.
// Markeringsramen är vanlig HTML ovanpå scenen – den syns aldrig i sändningen.
import { uiSounds } from '../audio/uiSounds.js';
import { icon } from './icons.js';
import { PLACEMENT_MAP } from './emojis.js';

const ANIMS = ['none', 'bob', 'pulse', 'wiggle', 'spin', 'float'];
const ANIM_NAMES = { none: 'Stilla', bob: 'Gungar', pulse: 'Pulserar', wiggle: 'Vickar', spin: 'Snurrar', float: 'Svävar' };
const uid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function initStickerUi({ stage, canvas, store, layer, size, toast = () => {} }) {
  const sel = stage.querySelector('#sticker-sel');
  let selected = null;
  let drag = null;
  const pointers = new Map();

  const items = () => store.get('stickers.items') || [];
  const find = (id) => items().find((i) => i.id === id);
  const commit = (id, patch) => store.set('stickers.items', items().map((i) => (i.id === id ? { ...i, ...patch } : i)));

  function geom() {
    const r = canvas.getBoundingClientRect();
    const { W, H } = size();
    const cover = getComputedStyle(canvas).objectFit === 'cover';
    const k = cover ? Math.max(r.width / W, r.height / H) : Math.min(r.width / W, r.height / H);
    return { r, W, H, k, ox: r.left + (r.width - W * k) / 2, oy: r.top + (r.height - H * k) / 2 };
  }
  const toOut = (cx, cy, g = geom()) => ({ x: (cx - g.ox) / g.k, y: (cy - g.oy) / g.k });

  function select(id) {
    selected = id;
    if (!id) {
      sel.hidden = true;
      return;
    }
    const it = find(id);
    sel.hidden = false;
    sel.innerHTML = `<div class="frame"></div><div class="rot" data-h="rot" title="Rotera"></div><div class="handle" data-h="scale" title="Ändra storlek"></div>
      <div class="tools">
        <button data-t="anchor" class="${it?.anchor === 'face' ? 'on' : ''}" data-tip="${it?.anchor === 'face' ? 'Följer ansiktet' : 'Fast i bilden'}|Tryck för att växla: följ ansiktet (flyttar med huvudet) eller sitt fast på samma plats i bilden.">${icon(it?.anchor === 'face' ? 'face' : 'pin', 18)}</button>
        <button data-t="anim" data-tip="Animation: ${ANIM_NAMES[it?.anim || 'none']}|Tryck för att byta: stilla, gungar, pulserar, vickar, snurrar, svävar.">${icon('sparkles', 18)}</button>
        <button data-t="bigger" data-tip="Större">${icon('plus', 18)}</button>
        <button data-t="smaller" data-tip="Mindre">${icon('minus', 18)}</button>
        <button data-t="flip" data-tip="Spegla|Vänd klistermärket åt andra hållet.">${icon('flip', 18)}</button>
        <button data-t="dupe" data-tip="Kopiera|Lägg till en kopia bredvid.">${icon('copy', 18)}</button>
        <button data-t="del" class="danger" data-tip="Ta bort|Ta bort klistermärket (Delete).">${icon('trash', 18)}</button>
      </div>`;
    update();
  }

  /** Placera markeringen över klistermärket (anropas varje bildruta). */
  function update() {
    if (!selected) return;
    const b = layer().boundsFor(selected);
    if (!b) {
      if (!find(selected)) select(null);
      return;
    }
    const g = geom();
    const sr = stage.getBoundingClientRect();
    const w = Math.max(b.w * g.k, 24);
    const h = Math.max(b.h * g.k, 24);
    const cx = g.ox + b.x * g.k - sr.left;
    const cy = g.oy + b.y * g.k - sr.top;
    sel.style.width = `${w}px`;
    sel.style.height = `${h}px`;
    sel.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${b.rot}rad)`;
    const tools = sel.querySelector('.tools');
    if (tools) tools.style.transform = `translate(-50%, 10px) rotate(${-b.rot}rad)`;
  }

  function startLive(id) {
    layer().live = { id, patch: {} };
  }
  function endLive() {
    const L = layer().live;
    layer().live = null;
    if (L && Object.keys(L.patch).length) commit(L.id, L.patch);
  }

  function current(id) {
    const base = find(id);
    const L = layer().live;
    return L?.id === id ? { ...base, ...L.patch } : base;
  }

  function onDown(e) {
    const g = geom();
    const p = toOut(e.clientX, e.clientY, g);
    pointers.set(e.pointerId, { x: p.x, y: p.y });
    const handle = e.target.closest?.('[data-h]')?.dataset.h;
    if (handle && selected) {
      const it = current(selected);
      const b = layer().boundsFor(selected);
      if (!b || !it) return;
      e.preventDefault();
      e.stopPropagation();
      startLive(selected);
      drag = { mode: handle, id: selected, cx: b.x, cy: b.y, d0: Math.hypot(p.x - b.x, p.y - b.y), a0: Math.atan2(p.y - b.y, p.x - b.x), s0: it.scale ?? 1, r0: it.rot ?? 0 };
      (e.target.setPointerCapture?.(e.pointerId));
      document.body.classList.add('dragging');
      return;
    }
    if (e.target !== canvas) return;
    if (pointers.size === 2 && selected && drag) {
      const [a, b] = [...pointers.values()];
      const it = current(selected);
      drag = { mode: 'pinch', id: selected, d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), s0: it.scale ?? 1, r0: it.rot ?? 0, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, base: { ...it }, center0: layer().boundsFor(selected) };
      return;
    }
    const hit = layer().hit(p.x, p.y);
    if (!hit) {
      if (selected) select(null);
      return;
    }
    e.preventDefault();
    if (selected !== hit.id) {
      select(hit.id);
      uiSounds.play('pop');
    }
    startLive(hit.id);
    drag = { mode: 'move', id: hit.id, offX: p.x - hit.x, offY: p.y - hit.y };
    canvas.setPointerCapture?.(e.pointerId);
    document.body.classList.add('dragging');
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const g = geom();
    const p = toOut(e.clientX, e.clientY, g);
    pointers.set(e.pointerId, { x: p.x, y: p.y });
    if (!drag) return;
    const L = layer().live;
    if (!L) return;
    const it = { ...find(drag.id), ...L.patch };
    if (drag.mode === 'move') {
      Object.assign(L.patch, layer().toStored(it, p.x - drag.offX, p.y - drag.offY, g.W, g.H));
    } else if (drag.mode === 'scale') {
      const d = Math.hypot(p.x - drag.cx, p.y - drag.cy);
      L.patch.scale = Math.min(Math.max(drag.s0 * (d / Math.max(drag.d0, 1)), it.anchor === 'face' ? 0.15 : 0.02), it.anchor === 'face' ? 12 : 1.6);
    } else if (drag.mode === 'rot') {
      const a = Math.atan2(p.y - drag.cy, p.x - drag.cx);
      L.patch.rot = drag.r0 + (a - drag.a0);
    } else if (drag.mode === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      L.patch.scale = Math.min(Math.max(drag.s0 * (d / Math.max(drag.d0, 1)), 0.02), 12);
      L.patch.rot = drag.r0 + (ang - drag.a0);
      if (drag.center0) Object.assign(L.patch, layer().toStored(it, drag.center0.x + (m.x - drag.m0.x), drag.center0.y + (m.y - drag.m0.y), g.W, g.H));
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (drag && (pointers.size === 0 || drag.mode !== 'pinch')) {
      endLive();
      if (drag.mode === 'move') uiSounds.play('drop');
      drag = null;
      document.body.classList.remove('dragging');
    }
  }

  canvas.addEventListener('pointerdown', onDown);
  sel.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  canvas.addEventListener(
    'wheel',
    (e) => {
      const g = geom();
      const p = toOut(e.clientX, e.clientY, g);
      const id = layer().hit(p.x, p.y)?.id ?? selected;
      if (!id) return;
      e.preventDefault();
      const it = find(id);
      if (e.shiftKey) commit(id, { rot: (it.rot ?? 0) + Math.sign(e.deltaY) * 0.12 });
      else commit(id, { scale: Math.max(0.02, (it.scale ?? 1) * (e.deltaY < 0 ? 1.08 : 1 / 1.08)) });
      if (selected !== id) select(id);
    },
    { passive: false },
  );

  sel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (!t || !selected) return;
    e.stopPropagation();
    const it = find(selected);
    if (!it) return;
    const { W, H } = size();
    const L = layer();
    if (t === 'del') remove(selected);
    else if (t === 'bigger' || t === 'smaller') commit(it.id, { scale: (it.scale ?? 1) * (t === 'bigger' ? 1.2 : 1 / 1.2) });
    else if (t === 'flip') commit(it.id, { flip: !it.flip });
    else if (t === 'anim') {
      const next = ANIMS[(ANIMS.indexOf(it.anim || 'none') + 1) % ANIMS.length];
      commit(it.id, { anim: next });
      toast(`Animation: ${ANIM_NAMES[next]}`, 'info', 1200);
      select(it.id);
    } else if (t === 'dupe') {
      const copy = { ...it, id: uid() };
      if (copy.anchor === 'face') copy.dx = (copy.dx ?? 0) + 0.8;
      else copy.x = Math.min((copy.x ?? 0.5) + 0.06, 0.95);
      store.set('stickers.items', [...items(), copy]);
      L.born.delete(copy.id);
      select(copy.id);
      uiSounds.play('pop');
    } else if (t === 'anchor') {
      const p = L.place(it, W, H);
      const A = L.anchor ?? { unit: H * 0.14, roll: 0 };
      if (it.anchor === 'face') {
        commit(it.id, { anchor: 'screen', x: p.x / W, y: p.y / H, scale: p.size / H, rot: p.rot });
        toast('Klistermärket sitter nu fast i bilden', 'info', 1600);
      } else {
        const f = L.toStored({ ...it, anchor: 'face' }, p.x, p.y, W, H);
        commit(it.id, { anchor: 'face', ...f, scale: p.size / A.unit, rot: p.rot + A.roll });
        toast('Klistermärket följer nu ansiktet', 'info', 1600);
      }
      select(it.id);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (!selected || e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(selected);
    } else if (e.key === 'Escape') select(null);
  });

  function remove(id) {
    store.set('stickers.items', items().filter((i) => i.id !== id));
    if (selected === id) select(null);
    uiSounds.play('delete');
  }

  /** Lägg till ett klistermärke. o: { kind, value, style?, color?, placement? } */
  function add(o) {
    const pl = PLACEMENT_MAP[o.placement || 'above'] ?? PLACEMENT_MAP.above;
    const at = { ...pl.at };
    if (o.kind === 'text') at.scale = at.anchor === 'face' ? Math.max(at.scale, 1.2) : 0.14;
    const list = items();
    // undvik att stapla exakt på varandra
    const same = list.filter((i) => i.anchor === at.anchor && Math.abs((i.dx ?? i.x ?? 0) - (at.dx ?? at.x ?? 0)) < 0.01 && Math.abs((i.dy ?? i.y ?? 0) - (at.dy ?? at.y ?? 0)) < 0.01).length;
    if (same) {
      if (at.anchor === 'face') at.dx = (at.dx ?? 0) + same * 0.9 * (same % 2 ? 1 : -1);
      else at.x = Math.min(0.95, (at.x ?? 0.5) - same * 0.07);
    }
    const it = { id: uid(), kind: o.kind, value: o.value, style: o.style, color: o.color, rot: 0, anim: o.anim ?? (o.placement === 'above' ? 'bob' : 'none'), ...at };
    store.set('stickers.items', [...list, it].slice(-40));
    const recent = [o.kind === 'emoji' || o.kind === 'skep' ? `${o.kind}:${o.value}` : null, ...(store.get('stickers.recent') || [])].filter(Boolean);
    store.set('stickers.recent', [...new Set(recent)].slice(0, 16));
    select(it.id);
    uiSounds.play('pop');
    return it;
  }

  function clear() {
    store.set('stickers.items', []);
    select(null);
    uiSounds.play('delete');
  }

  return { add, clear, select, update, remove, get selected() { return selected; } };
}

export { PLACEMENT_MAP };
