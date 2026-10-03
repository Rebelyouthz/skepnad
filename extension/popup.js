const $ = (id) => document.getElementById(id);
chrome.runtime.sendMessage({ type: 'popup-status' }, (s) => {
  if (!s) return;
  $('status').classList.toggle('ok', s.ready);
  $('st').textContent = s.ready ? 'Skepnad är igång – redo för samtal!' : 'Starta Skepnad först';
  $('auto').checked = s.auto;
  $('voice').checked = s.voice;
});
for (const k of ['auto', 'voice']) {
  $(k).addEventListener('change', () => chrome.storage.local.set({ [k]: $(k).checked }));
}
