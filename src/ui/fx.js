// Tooltips, 3D-tilt, toasts och UI-ljud via delegering.
import { uiSounds } from '../audio/uiSounds.js';
import { icon } from './icons.js';

// ---------- Tooltip ----------
export function initTooltips(isEnabled = () => true) {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let timer = null;
  let target = null;

  const show = (el) => {
    const raw = el.dataset.tip || '';
    const [title, ...rest] = raw.split('|');
    const desc = rest.join('|');
    const key = el.dataset.key;
    tip.innerHTML = `<b><span>${title}</span>${key ? `<kbd>${key}</kbd>` : ''}</b>${desc ? `<p>${desc}</p>` : ''}`;
    tip.classList.add('show');
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2;
    let y = r.top - th - 10;
    if (el.closest('.rail')) {
      x = r.right + 12;
      y = r.top + r.height / 2 - th / 2;
    } else if (y < 8) y = r.bottom + 10;
    x = Math.max(8, Math.min(x, innerWidth - tw - 8));
    y = Math.max(8, Math.min(y, innerHeight - th - 8));
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };
  const hide = () => {
    clearTimeout(timer);
    tip.classList.remove('show');
    target = null;
  };
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el === target) return;
    hide();
    if (!el || !isEnabled()) return;
    target = el;
    timer = setTimeout(() => show(el), 320);
  });
  document.addEventListener('pointerdown', hide);
  document.addEventListener('scroll', hide, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el && isEnabled() && e.target.matches(':focus-visible')) show(el);
  });
  document.addEventListener('focusout', hide);
  return { hide };
}

// ---------- 3D-tilt ----------
export function initTilt(isEnabled = () => true) {
  let active = null;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('.card, .p-card');
    if (active && active !== el) {
      active.style.setProperty('--rx', '0deg');
      active.style.setProperty('--ry', '0deg');
      active = null;
    }
    if (!el || !isEnabled()) return;
    active = el;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const strength = el.classList.contains('thumb') ? 8 : 14;
    el.style.setProperty('--rx', `${(0.5 - py) * strength}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * strength}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  });
}

// ---------- Scenens subtila 3D-lutning ----------
export function initStageTilt(stage, isEnabled = () => true) {
  let raf = 0;
  document.addEventListener('pointermove', (e) => {
    if (!isEnabled() || document.body.classList.contains('clean')) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - (r.left + r.width / 2)) / innerWidth;
      const py = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      stage.style.transform = `rotateY(${px * 2.2}deg) rotateX(${-py * 1.6}deg)`;
    });
  });
}

// ---------- UI-ljud ----------
export function initUiSounds() {
  let last = null;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.('button, .card, .p-card, .switch, select, .dropzone');
    if (el && el !== last && !el.disabled) uiSounds.play('hover');
    last = el;
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('button');
    if (!el || el.dataset.silent !== undefined || el.closest('[data-seg]')) return;
    if (el.closest('.rail')) uiSounds.play('tab');
    else if (el.classList.contains('card') || el.classList.contains('p-card')) uiSounds.play('select');
    else uiSounds.play('click');
  });
}

// ---------- Toasts ----------
let toastRoot = null;
export function toast(text, kind = 'info', ms = 2600) {
  toastRoot ??= Object.assign(document.createElement('div'), { className: 'toasts' });
  if (!toastRoot.isConnected) document.body.appendChild(toastRoot);
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  const ic = kind === 'ok' ? 'check' : kind === 'error' ? 'x' : 'info';
  el.innerHTML = `${icon(ic, 16)}<span>${text}</span>`;
  toastRoot.appendChild(el);
  if (kind === 'error') uiSounds.play('error');
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }, ms);
}

// ---------- Modal ----------
export function openModal({ title, iconName = 'info', tabs = null, content = '', onMount }) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
      <header>${icon(iconName, 22)}<h3>${title}</h3><button class="btn icon-only" data-close data-tip="Stäng|Stäng fönstret (Esc)">${icon('x')}</button></header>
      ${tabs ? `<div class="tabs seg" style="margin:12px 20px 0">${tabs.map((t, i) => `<button data-tab="${i}" class="${i ? '' : 'active'}">${t.label}</button>`).join('')}</div>` : ''}
      <div class="content">${tabs ? tabs[0].html : content}</div>
    </div>`;
  document.body.appendChild(back);
  uiSounds.play('open');
  const close = () => {
    uiSounds.play('close');
    back.remove();
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-close]')) close();
    const tb = e.target.closest('[data-tab]');
    if (tb && tabs) {
      back.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === tb));
      back.querySelector('.content').innerHTML = tabs[Number(tb.dataset.tab)].html;
      uiSounds.play('tab');
    }
  });
  onMount?.(back, close);
  return close;
}

/** Enkel inmatningsdialog. */
export function promptModal({ title, label, value = '', placeholder = '', okText = 'Spara' }) {
  return new Promise((resolve) => {
    let done = false;
    const close = openModal({
      title,
      iconName: 'save',
      content: `<div class="field"><label>${label}</label><input type="text" value="${value.replace(/"/g, '&quot;')}" placeholder="${placeholder}" maxlength="40"></div>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-close style="flex:none">Avbryt</button><button class="btn btn-primary" data-ok style="flex:none">${okText}</button></div>`,
      onMount(root, closeFn) {
        const input = root.querySelector('input');
        input.focus();
        input.select();
        const ok = () => {
          done = true;
          resolve(input.value.trim());
          closeFn();
        };
        root.querySelector('[data-ok]').addEventListener('click', ok);
        input.addEventListener('keydown', (e) => e.key === 'Enter' && ok());
        new MutationObserver(() => !root.isConnected && !done && resolve(null)).observe(document.body, { childList: true });
      },
    });
    return close;
  });
}
