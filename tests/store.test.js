import { describe, it, expect, vi } from 'vitest';
import { createStore, deepMerge, getPath } from '../src/app/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), _m: m };
};

describe('store', () => {
  it('läser och skriver sökvägar oföränderligt', () => {
    const s = createStore({ a: { b: 1, c: [1] } }, { storage: null });
    const before = s.get();
    s.set('a.b', 2);
    expect(s.get('a.b')).toBe(2);
    expect(before.a.b).toBe(1);
    expect(s.get('a.c')).toBe(before.a.c);
  });

  it('notifierar relaterade prenumeranter', () => {
    const s = createStore({ a: { b: 1 }, x: 0 }, { storage: null });
    const onA = vi.fn();
    const onAB = vi.fn();
    const onX = vi.fn();
    s.subscribe('a', onA);
    s.subscribe('a.b', onAB);
    s.subscribe('x', onX);
    s.set('a.b', 5);
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onAB).toHaveBeenCalledWith(5, 'a.b');
    expect(onX).not.toHaveBeenCalled();
    s.patch('a', { c: 3 });
    expect(onAB).toHaveBeenCalledTimes(2);
  });

  it('slår ihop sparat tillstånd med nya standardvärden', () => {
    const storage = memStorage();
    storage.setItem('k', JSON.stringify({ a: { b: 9 }, old: true }));
    const s = createStore({ a: { b: 1, nytt: 'ja' } }, { key: 'k', storage });
    expect(s.get('a.b')).toBe(9);
    expect(s.get('a.nytt')).toBe('ja');
  });

  it('persisterar debouncat och vid flush', () => {
    const storage = memStorage();
    const s = createStore({ v: 1 }, { key: 'k', storage, delay: 10000 });
    s.set('v', 2);
    expect(storage.getItem('k')).toBeNull();
    s.flush();
    expect(JSON.parse(storage.getItem('k')).v).toBe(2);
  });

  it('överlever korrupt lagring', () => {
    const storage = memStorage();
    storage.setItem('k', '{trasig');
    const s = createStore({ v: 1 }, { key: 'k', storage });
    expect(s.get('v')).toBe(1);
  });

  it('hjälpfunktioner', () => {
    expect(deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } })).toEqual({ a: 1, b: { c: 2, d: 3 } });
    expect(getPath({ a: { b: { c: 4 } } }, 'a.b.c')).toBe(4);
    expect(getPath({ a: 1 }, 'x.y')).toBeUndefined();
  });
});
