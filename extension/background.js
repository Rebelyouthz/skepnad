// Skepnad Kamera – bakgrund: kopplar ihop samtalssidor med Skepnad-fönstret.
let appPort = null;
let appSeen = 0;
const clients = new Map();

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (m) => {
    if (!m || typeof m.__skepnad !== 'string') return;
    if (m.__skepnad === 'app-hello') {
      if (appPort !== port) {
        appPort = port;
        port.onDisconnect.addListener(() => {
          if (appPort === port) appPort = null;
        });
      }
      appSeen = Date.now();
      chrome.action.setBadgeText({ text: 'PÅ' });
      chrome.action.setBadgeBackgroundColor({ color: '#7c5cff' });
      return;
    }
    if (m.__skepnad === 'from-page') {
      if (m.type === 'plan') {
        const cfg = await chrome.storage.local.get({ auto: true, voice: true });
        const ready = !!appPort;
        port.postMessage({ __skepnad: 'to-page', id: m.id, hostReady: ready, autoCam: cfg.auto && ready, autoMic: cfg.auto && cfg.voice && ready });
        return;
      }
      if (m.type === 'status') {
        port.postMessage({ __skepnad: 'to-page', id: m.id, hostReady: !!appPort, seen: appSeen });
        return;
      }
      if (!appPort) {
        port.postMessage({ __skepnad: 'to-page', id: m.id, error: 'no-app' });
        return;
      }
      clients.set(m.id, port);
      appPort.postMessage({ ...m, __skepnad: 'to-app' });
      return;
    }
    if (m.__skepnad === 'app-reply') {
      const c = clients.get(m.id);
      if (c) {
        clients.delete(m.id);
        try {
          c.postMessage({ ...m, __skepnad: 'to-page' });
        } catch {
          /* sidan stängd */
        }
      }
    }
  });
  port.onDisconnect.addListener(() => {
    for (const [id, p] of clients) if (p === port) clients.delete(id);
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'popup-status') {
    chrome.storage.local.get({ auto: true, voice: true }).then((cfg) => reply({ ready: !!appPort, ...cfg }));
    return true;
  }
  return false;
});

setInterval(() => {
  if (appPort && Date.now() - appSeen > 45000) appPort = null;
  if (!appPort) chrome.action.setBadgeText({ text: '' });
}, 15000);
