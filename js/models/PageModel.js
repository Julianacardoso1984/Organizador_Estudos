'use strict';

/**
 * PageModel — Gerencia páginas/notas com blocos de conteúdo (estilo Notion).
 */
class PageModel {
  constructor() {
    this.pages = Storage.get('pages') || [];
  }

  getAll() { return [...this.pages]; }

  getBySubject(subjectId) {
    return this.pages.filter(p => p.subjectId === subjectId);
  }

  getById(id) { return this.pages.find(p => p.id === id) || null; }

  getRecent(n = 5) {
    return [...this.pages]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, n);
  }

  create(subjectId, title = 'Nova Página') {
    const page = {
      id: _uuid(),
      subjectId,
      title,
      blocks: [{ id: _uuid(), type: 'text', content: '', checked: false }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.pages.push(page);
    this._save();
    EventBus.emit('pages:updated', this.getAll());
    return page;
  }

  update(id, data) {
    const idx = this.pages.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.pages[idx] = { ...this.pages[idx], ...data, updatedAt: new Date().toISOString() };
    this._save();
    EventBus.emit('pages:updated', this.getAll());
    return this.pages[idx];
  }

  updateBlocks(id, blocks) {
    return this.update(id, { blocks });
  }

  delete(id) {
    this.pages = this.pages.filter(p => p.id !== id);
    this._save();
    EventBus.emit('pages:updated', this.getAll());
  }

  deleteBySubject(subjectId) {
    this.pages = this.pages.filter(p => p.subjectId !== subjectId);
    this._save();
    EventBus.emit('pages:updated', this.getAll());
  }

  search(query) {
    const q = query.toLowerCase();
    return this.pages.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.blocks.some(b => (b.content || '').toLowerCase().includes(q))
    );
  }

  _save() { Storage.set('pages', this.pages); }
}
