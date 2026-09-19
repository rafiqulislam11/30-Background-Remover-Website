/**
 * AntryGravity Theme Manager
 * Handles light/dark mode with localStorage persistence
 */
export class ThemeManager {
  static STORAGE_KEY = 'antrygravity_theme';
  static DEFAULT     = 'dark';

  static init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    this.apply(saved || preferred);

    // Listen for OS-level changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.apply(e.matches ? 'dark' : 'light');
      }
    });
  }

  static apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    this._updateToggleIcons(theme);
  }

  static toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    this.apply(current === 'dark' ? 'light' : 'dark');
  }

  static current() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  static _updateToggleIcons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      const moonIcon = btn.querySelector('.icon-moon');
      const sunIcon  = btn.querySelector('.icon-sun');
      if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
      if (sunIcon)  sunIcon.style.display  = theme === 'light' ? 'block' : 'none';
    });
  }
}
