// Minimal IndexedDB-nyckel/värde-lagring för filer (egna avatarer, bilder, ljud).
const DB = 'skepnad';
const STORE = 'files';
let dbp = null;

function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const idb = {
  get: (key) => tx('readonly', (s) => s.get(key)).catch(() => undefined),
  set: (key, value) => tx('readwrite', (s) => s.put(value, key)).catch(() => undefined),
  del: (key) => tx('readwrite', (s) => s.delete(key)).catch(() => undefined),
};
