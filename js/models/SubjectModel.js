'use strict';

/**
 * SubjectModel — Gerencia matérias (disciplinas de estudo).
 */
class SubjectModel {
  constructor() {
    const raw = localStorage.getItem('subjects');
    if (raw === null) {
      this.subjects = [];
      this._seed();
    } else {
      try {
        this.subjects = JSON.parse(raw) || [];
      } catch (e) {
        this.subjects = [];
      }
    }
  }

  getAll() { return [...this.subjects]; }

  getById(id) { return this.subjects.find(s => s.id === id) || null; }

  create(name, emoji = '📚', color = '#8B5CF6') {
    const subject = {
      id: _uuid(),
      name: name.trim(),
      emoji,
      color,
      createdAt: new Date().toISOString()
    };
    this.subjects.push(subject);
    this._save();
    EventBus.emit('subjects:updated', this.getAll());
    return subject;
  }

  update(id, data) {
    const idx = this.subjects.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.subjects[idx] = { ...this.subjects[idx], ...data };
    this._save();
    EventBus.emit('subjects:updated', this.getAll());
    return this.subjects[idx];
  }

  delete(id) {
    this.subjects = this.subjects.filter(s => s.id !== id);
    this._save();
    EventBus.emit('subjects:updated', this.getAll());
    EventBus.emit('subject:deleted', id);
  }

  _save() { Storage.set('subjects', this.subjects); }

  _seed() {
    this.create('Matemática', '📐', '#8B5CF6');
    this.create('História', '📜', '#06B6D4');
    this.create('Biologia', '🧬', '#10B981');
  }
}

// Utilitário global de UUID
function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
