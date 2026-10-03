// Skepnad Kamera – brygga mellan sidan och tilläggets bakgrund.
(() => {
  let port = null;
  const getPort = () => {
    if (port) return port;
    port = chrome.runtime.connect({ name: 'skepnad' });
    port.onMessage.addListener((m) => window.postMessage(m, '*'));
    port.onDisconnect.addListener(() => {
      port = null;
    });
    return port;
  };
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || typeof e.data.__skepnad !== 'string') return;
    const d = e.data;
    try {
      if (d.__skepnad === 'from-page' || d.__skepnad === 'app-reply') getPort().postMessage(d);
      else if (d.__skepnad === 'app-hello') {
        getPort().postMessage(d);
        window.postMessage({ __skepnad: 'ext-present', version: chrome.runtime.getManifest().version }, '*');
      }
    } catch {
      port = null;
    }
  });
})();
