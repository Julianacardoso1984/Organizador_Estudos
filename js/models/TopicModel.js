'use strict';

/**
 * TopicModel — Gerencia os assuntos/tópicos de estudo.
 */
class TopicModel {
  constructor() {
    this._topics = Storage.get('topics') || [];
  }

  getAll() {
    return this._topics;
  }

  getBySubject(subjectId) {
    return this._topics.filter(t => t.subjectId === subjectId);
  }

  getById(id) {
    return this._topics.find(t => t.id === id);
  }

  create(subjectId, name) {
    const topic = {
      id: 'top_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      subjectId,
      name,
      studied: false,
      createdAt: new Date().toISOString()
    };
    this._topics.push(topic);
    this._save();
    return topic;
  }

  update(id, updates) {
    const idx = this._topics.findIndex(t => t.id === id);
    if (idx !== -1) {
      this._topics[idx] = { ...this._topics[idx], ...updates };
      this._save();
    }
  }

  toggleStudied(id) {
    const t = this.getById(id);
    if (t) {
      t.studied = !t.studied;
      this._save();
    }
  }

  delete(id) {
    this._topics = this._topics.filter(t => t.id !== id);
    this._save();
  }

  deleteBySubject(subjectId) {
    this._topics = this._topics.filter(t => t.subjectId !== subjectId);
    this._save();
  }

  _save() {
    Storage.set('topics', this._topics);
    EventBus.emit('topics:updated');
  }
}
