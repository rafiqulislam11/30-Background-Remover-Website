/**
 * AntryGravity Auth Manager
 * Manages user session state using localStorage (demo implementation).
 * In production, replace with real backend JWT / session validation.
 */
import { Storage } from './storage.js';

const AUTH_KEY  = 'antrygravity_user';
const TOKEN_KEY = 'antrygravity_token';

export const Auth = {
  /**
   * Returns current user or null
   */
  currentUser() {
    return Storage.get(AUTH_KEY, null);
  },

  isLoggedIn() {
    return !!this.currentUser() && !!Storage.get(TOKEN_KEY);
  },

  /**
   * Demo login — in production, call your backend and store the JWT.
   */
  async login(email, password) {
    // In production: const res = await fetch('/api/auth/login', {...});
    if (!email || !password) throw new Error('Email and password are required.');

    // Demo: accept any @-containing email with 6+ char password
    if (!email.includes('@')) throw new Error('Invalid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const demoUser = {
      id:         'demo-user-001',
      name:       email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email,
      avatar:     null,
      plan:       'pro',
      credits:    245,
      createdAt:  new Date().toISOString(),
    };

    Storage.set(AUTH_KEY, demoUser);
    Storage.set(TOKEN_KEY, 'demo-token-' + Date.now());
    document.dispatchEvent(new CustomEvent('authchange', { detail: { user: demoUser } }));
    return demoUser;
  },

  async register(name, email, password) {
    if (!name || !email || !password) throw new Error('All fields are required.');
    if (!email.includes('@')) throw new Error('Invalid email address.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');

    const user = {
      id:         'user-' + Date.now(),
      name,
      email,
      avatar:     null,
      plan:       'free',
      credits:    5,
      createdAt:  new Date().toISOString(),
    };

    Storage.set(AUTH_KEY, user);
    Storage.set(TOKEN_KEY, 'token-' + Date.now());
    document.dispatchEvent(new CustomEvent('authchange', { detail: { user } }));
    return user;
  },

  logout() {
    Storage.remove(AUTH_KEY);
    Storage.remove(TOKEN_KEY);
    document.dispatchEvent(new CustomEvent('authchange', { detail: { user: null } }));
    window.location.href = 'index.html';
  },

  /**
   * Protect a page — redirects to index if not logged in.
   */
  requireAuth(redirectUrl = 'index.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectUrl + '?login=required';
      return false;
    }
    return true;
  },

  updateUser(updates) {
    const user = this.currentUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    Storage.set(AUTH_KEY, updated);
    return updated;
  },
};
