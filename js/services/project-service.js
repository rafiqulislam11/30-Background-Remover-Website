/**
 * AntryGravity Project Service
 * CRUD for user projects — uses localStorage for demo.
 * Replace with real API calls (fetch/supabase) for production.
 */
import { Storage } from '../core/storage.js';
import { Auth } from '../core/auth.js';

const PROJECTS_KEY = 'antrygravity_projects';

export const ProjectService = {
  _key() {
    const user = Auth.currentUser();
    return `${PROJECTS_KEY}_${user?.id || 'guest'}`;
  },

  getAll() {
    return Storage.get(this._key(), []);
  },

  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  create({ name, type, originalUrl, processedUrl, thumbnailUrl }) {
    const project = {
      id:           'proj-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      name:         name || 'Untitled Project',
      type:         type || 'background-removal',
      status:       'processing',
      originalUrl:  originalUrl || null,
      processedUrl: processedUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    };
    const projects = this.getAll();
    projects.unshift(project);
    Storage.set(this._key(), projects);
    return project;
  },

  update(id, updates) {
    const projects = this.getAll();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
    Storage.set(this._key(), projects);
    return projects[idx];
  },

  delete(id) {
    const projects = this.getAll().filter(p => p.id !== id);
    Storage.set(this._key(), projects);
  },

  duplicate(id) {
    const original = this.getById(id);
    if (!original) return null;
    return this.create({ ...original, name: original.name + ' (Copy)' });
  },

  search(query, filter = 'all') {
    let projects = this.getAll();
    if (filter !== 'all') {
      projects = projects.filter(p => p.type === filter);
    }
    if (query) {
      const q = query.toLowerCase();
      projects = projects.filter(p => p.name.toLowerCase().includes(q));
    }
    return projects;
  },

  getStats() {
    const all = this.getAll();
    return {
      total:      all.length,
      completed:  all.filter(p => p.status === 'completed').length,
      processing: all.filter(p => p.status === 'processing').length,
      failed:     all.filter(p => p.status === 'failed').length,
    };
  },
};
