// Mobilkontroll: styr Skepnad på datorn från telefonen.
import '@fontsource-variable/inter';
import './remote.css';

const $ = (id) => document.getElementById(id);
const token = location.hash.slice(1);
let ws = null;
let state = null;
let tab = localStorage.getItem('skepnad-remote-tab') || 'effects';

const TABS = [
  ['effects', '✨', 'Effekter'],
  ['sounds', '🔊', 'Ljud'],
  ['personas', '🎭', 'Skepnader'],
  ['voices', '🎙️', 'Röst'],
  ['scenes', '🌄', 'Plats'],
  ['avatars', '🤖', 'Avatar'],
];
const ACTION = { effects: 'effect', sounds: 'sfx', personas: 'persona', voices: 'voice', scenes: 'scene', avatars: 'avatar' };
const ACTIVE = { personas: 'persona', voices: 'voice', scenes: 'scene', avatars: 'avatar' };

function send(action, arg = '') {
  if (ws?.readyState !== 1) return;
  ws.send(JSON.stringify({ type: 'cmd', action, arg }));
  navigator.vibrate?.(12);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function renderQuick() {
  const a = state?.active || {};
  $('quick').innerHTML = [
    ['toggleMute', a.muted ? '🔇' : '🎤', a.muted ? 'Mik av' : 'Mik på', a.muted ? 'warn' : ''],
    ['record', a.recording ? '⏹️' : '⏺️', a.recording ? 'Stoppa' : 'Spela in', a.recording ? 'rec' : ''],
    ['toggleMode', a.mode === 'avatar' ? '🤖' : '📷', a.mode === 'avatar' ? 'Avatar' : 'Kamera', ''],
    ['screenshot', '📸', 'Bild', ''],
  ]
    .map(([act, e, l, cls]) => `<button class="q ${cls}" data-act="${act}"><span>${e}</span><small>${l}</small></button>`)
    .join('');
}

function renderTabs() {
  $('tabs').innerHTML = TABS.map(([id, e, l]) => `<button class="${id === tab ? 'on' : ''}" data-tab="${id}"><span>${e}</span>${l}</button>`).join('');
}

function renderGrid() {
  const list = state?.[tab] || [];
  const activeId = ACTIVE[tab] ? state?.active?.[ACTIVE[tab]] : null;
  $('grid').innerHTML = list.length
    ? list.map((it) => `<button class="tile ${it.id === activeId ? 'on' : ''}" data-act="${ACTION[tab]}" data-arg="${esc(it.id)}"><span class="e">${it.icon}</span><span class="n">${esc(it.name)}</span></button>`).join('')
    : '<p class="empty">Väntar på Skepnad…</p>';
}

function render() {
  renderQuick();
  renderTabs();
  renderGrid();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (t) {
    tab = t.dataset.tab;
    localStorage.setItem('skepnad-remote-tab', tab);
    renderTabs();
    renderGrid();
    return;
  }
  const b = e.target.closest('[data-act]');
  if (b) {
    b.classList.remove('hit');
    void b.offsetWidth;
    b.classList.add('hit');
    send(b.dataset.act, b.dataset.arg || '');
  }
});

function connect() {
  if (!token) {
    $('conn').textContent = 'Saknar nyckel – skanna QR-koden';
    $('offline').hidden = false;
    return;
  }
  ws = new WebSocket(`ws://${location.host}/ws/remote?token=${encodeURIComponent(token)}`);
  ws.onopen = () => {
    $('conn').textContent = 'Ansluten ✓';
    $('conn').className = 'conn ok';
    $('offline').hidden = true;
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'state') {
      state = msg;
      render();
    }
  };
  ws.onclose = () => {
    $('conn').textContent = 'Frånkopplad – försöker igen…';
    $('conn').className = 'conn';
    $('offline').hidden = false;
    setTimeout(connect, 2000);
  };
}

render();
connect();
