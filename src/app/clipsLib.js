// Klippbibliotek i enheten (IndexedDB): används på mobilen och när motorn
// inte körs. Sparar video/bild + miniatyr så att man kan spela upp, dela,
// spara till galleriet och radera – även efter omstart.

const DB = 'skepnad-clips';
const STORE = 'clips';
let dbp = null;

function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'id' });
      s.createIndex('created', 'created');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function run(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req?.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

/** Första bildrutan (eller bilden) som liten JPEG-dataURL. */
export async function makeThumb(blob, maxW = 360) {
  const url = URL.createObjectURL(blob);
  try {
    let src;
    let w;
    let h;
    let duration = 0;
    if (blob.type.startsWith('image')) {
      src = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      w = src.naturalWidth;
      h = src.naturalHeight;
    } else {
      src = document.createElement('video');
      src.muted = true;
      src.playsInline = true;
      src.preload = 'auto';
      src.src = url;
      await new Promise((res, rej) => {
        src.onloadeddata = res;
        src.onerror = rej;
        setTimeout(res, 4000);
      });
      duration = Number.isFinite(src.duration) ? src.duration : 0;
      try {
        src.currentTime = Math.min(0.4, (duration || 1) / 3);
        await new Promise((res) => {
          src.onseeked = res;
          setTimeout(res, 1500);
        });
      } catch {
        /* behåll första bilden */
      }
      w = src.videoWidth;
      h = src.videoHeight;
    }
    if (!w || !h) return { thumb: '', w: 0, h: 0, duration };
    const k = Math.min(1, maxW / w);
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return { thumb: c.toDataURL('image/jpeg', 0.72), w, h, duration };
  } catch {
    return { thumb: '', w: 0, h: 0, duration: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const clipsLib = {
  async add(blob, { name, duration = 0 } = {}) {
    const meta = await makeThumb(blob);
    const item = {
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      blob,
      type: blob.type || 'video/webm',
      size: blob.size,
      created: Date.now(),
      duration: duration || meta.duration,
      thumb: meta.thumb,
      w: meta.w,
      h: meta.h,
    };
    await run('readwrite', (s) => s.put(item));
    return item;
  },
  async list() {
    const all = (await run('readonly', (s) => s.getAll()).catch(() => [])) || [];
    return all.sort((a, b) => b.created - a.created);
  },
  get: (id) => run('readonly', (s) => s.get(id)).catch(() => null),
  del: (id) => run('readwrite', (s) => s.delete(id)).catch(() => null),
  async count() {
    return (await run('readonly', (s) => s.count()).catch(() => 0)) || 0;
  },
  async rename(id, name) {
    const it = await this.get(id);
    if (!it) return;
    it.name = name;
    await run('readwrite', (s) => s.put(it));
  },
};
