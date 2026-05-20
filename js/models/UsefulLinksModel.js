'use strict';

/**
 * UsefulLinksModel — Gerencia os links úteis salvos pelo usuário.
 */
class UsefulLinksModel {
  constructor() {
    const raw = localStorage.getItem('usefulLinks');
    if (raw === null) {
      this.links = [];
      this._seed();
    } else {
      try {
        this.links = JSON.parse(raw) || [];
      } catch (e) {
        this.links = [];
      }
    }
  }

  getAll() { return [...this.links]; }

  getById(id) { return this.links.find(l => l.id === id) || null; }

  create(title, url, emoji = '🔗', description = '') {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    const link = {
      id: _uuid(),
      title: title.trim(),
      url: formattedUrl,
      emoji,
      description: description.trim(),
      createdAt: new Date().toISOString()
    };
    this.links.push(link);
    this._save();
    EventBus.emit('usefulLinks:updated', this.getAll());
    return link;
  }

  update(id, { title, url, emoji, description }) {
    const link = this.links.find(l => l.id === id);
    if (!link) return;
    if (title !== undefined)       link.title       = title.trim();
    if (emoji !== undefined)       link.emoji       = emoji;
    if (description !== undefined) link.description = description.trim();
    if (url !== undefined) {
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = 'https://' + formattedUrl;
      link.url = formattedUrl;
    }
    this._save();
    EventBus.emit('usefulLinks:updated', this.getAll());
    return link;
  }

  delete(id) {
    this.links = this.links.filter(l => l.id !== id);
    this._save();
    EventBus.emit('usefulLinks:updated', this.getAll());
  }

  _seed() {
    this.links = [
      { id: 'ul1', title: 'NotebookLM', url: 'https://notebooklm.google.com', emoji: '📓', description: 'Cadernos inteligentes com IA do Google', createdAt: new Date().toISOString() },
      { id: 'ul2', title: 'Khan Academy', url: 'https://pt.khanacademy.org', emoji: '🎓', description: 'Cursos gratuitos em português', createdAt: new Date().toISOString() },
      { id: 'ul3', title: 'YouTube', url: 'https://youtube.com', emoji: '▶️', description: 'Videoaulas e conteúdos educativos', createdAt: new Date().toISOString() },
    ];
    this._save();
  }

  _save() { Storage.set('usefulLinks', this.links); }
}
