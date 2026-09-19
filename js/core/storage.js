/**
 * AntryGravity Storage Helper
 * Typed LocalStorage wrappers with JSON serialization
 */
export const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },

  remove(key) { localStorage.removeItem(key); },

  clear(prefix = null) {
    if (!prefix) { localStorage.clear(); return; }
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  },

  has(key) { return localStorage.getItem(key) !== null; },
};
