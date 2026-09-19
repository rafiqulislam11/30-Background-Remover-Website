/**
 * AntryGravity Notifications
 * Toast notification system with auto-dismiss
 */
export class Notifications {
  static _container = null;

  static init() {
    if (this._container) return;
    this._container = document.createElement('div');
    this._container.className = 'toast-container';
    this._container.setAttribute('aria-live', 'polite');
    this._container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(this._container);
  }

  static show({ type = 'info', title, message, duration = 4500 }) {
    this.init();

    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-desc">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => this._remove(toast));
    this._container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this._remove(toast), duration);
    }

    return toast;
  }

  static _remove(toast) {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 500);
  }

  static success(title, message, duration) { return this.show({ type: 'success', title, message, duration }); }
  static error(title, message, duration)   { return this.show({ type: 'error',   title, message, duration: duration ?? 6000 }); }
  static warning(title, message, duration) { return this.show({ type: 'warning', title, message, duration }); }
  static info(title, message, duration)    { return this.show({ type: 'info',    title, message, duration }); }
}
