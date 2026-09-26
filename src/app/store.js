// Tillståndslager med sökvägar ("background.scene"), prenumerationer och
// debouncad persistens till localStorage. Sparat tillstånd slås ihop med
// standardvärden så att nya inställningar dyker upp efter uppdateringar.

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function deepMerge(base, extra) {
  if (!isObj(base) || !isObj(extra)) return extra === undefined ? base : extra;
  const out = { ...base };
  for (const k of Object.keys(extra)) {
    out[k] = k in base ? deepMerge(base[k], extra[k]) : extra[k];
  }
  return out;
}

export function getPath(obj, path) {
  if (!path) return obj;
  let cur = obj;
  for (const part of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function setPathImmutable(obj, parts, value) {
  if (parts.length === 0) return value;
  const [head, ...rest] = parts;
  const base = isObj(obj) || Array.isArray(obj) ? obj : {};
  const copy = Array.isArray(base) ? [...base] : { ...base };
  copy[head] = setPathImmutable(base[head], rest, value);
  return copy;
}

const related = (a, b) => !a || !b || a === b || a.startsWith(b + '.') || b.startsWith(a + '.');

export function createStore(defaults, { key = null, storage = globalThis.localStorage, delay = 250 } = {}) {
  let state = structuredClone(defaults);
  if (key && storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) state = deepMerge(state, JSON.parse(raw));
    } catch {
      /* korrupt eller blockerad lagring – använd standard */
    }
  }
  const subs = new Set();
  let timer = null;

  const persist = () => {
    if (!key || !storage) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        /* fullt eller blockerat – ignorera */
      }
    }, delay);
  };

  const notify = (path) => {
    for (const s of [...subs]) {
      if (related(s.path, path)) {
        try {
          s.fn(getPath(state, s.path), path);
        } catch (err) {
          console.error('[store]', s.path, err);
        }
      }
    }
  };

  return {
    get: (path) => getPath(state, path),
    set(path, value) {
      if (getPath(state, path) === value) return;
      state = setPathImmutable(state, path ? path.split('.') : [], value);
      persist();
      notify(path);
    },
    patch(path, partial) {
      const cur = getPath(state, path);
      this.set(path, { ...(isObj(cur) ? cur : {}), ...partial });
    },
    replace(next) {
      state = deepMerge(structuredClone(defaults), next);
      persist();
      notify('');
    },
    subscribe(path, fn, { immediate = false } = {}) {
      const entry = { path, fn };
      subs.add(entry);
      if (immediate) fn(getPath(state, path), path);
      return () => subs.delete(entry);
    },
    reset() {
      state = structuredClone(defaults);
      persist();
      notify('');
    },
    flush() {
      if (!key || !storage) return;
      clearTimeout(timer);
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        /* ignorera */
      }
    },
  };
}
