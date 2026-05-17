'use strict';

/**
 * MaterialModel — Metadados dos arquivos enviados por matéria.
 * O blob real é salvo no IndexedDB via Storage.saveFile().
 */
class MaterialModel {
  constructor() {
    this.materials = Storage.get('materials') || [];
  }

  getAll() { return [...this.materials]; }

  getBySubject(subjectId) {
    return this.materials.filter(m => m.subjectId === subjectId);
  }

  getById(id) { return this.materials.find(m => m.id === id) || null; }

  async create(subjectId, file, tags = []) {
    const id = _uuid();
    const type = this._detectType(file.type, file.name);

    const meta = {
      id,
      subjectId,
      name:       file.name,
      type,                      // 'pdf' | 'image' | 'audio' | 'video' | 'doc' | 'other'
      mimeType:   file.type,
      size:       file.size,
      tags,
      uploadedAt: new Date().toISOString()
    };

    // Salvar blob no IndexedDB
    try {
      await Storage.saveFile(id, file);
    } catch (e) {
      console.error('Erro ao salvar arquivo no IndexedDB:', e);
      throw e;
    }

    this.materials.push(meta);
    this._save();
    EventBus.emit('materials:updated', this.getAll());
    return meta;
  }

  update(id, data) {
    const idx = this.materials.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.materials[idx] = { ...this.materials[idx], ...data };
    this._save();
    EventBus.emit('materials:updated', this.getAll());
    return this.materials[idx];
  }

  async delete(id) {
    this.materials = this.materials.filter(m => m.id !== id);
    this._save();
    try { await Storage.deleteFile(id); } catch (_) {}
    EventBus.emit('materials:updated', this.getAll());
  }

  async deleteBySubject(subjectId) {
    const toDelete = this.materials.filter(m => m.subjectId === subjectId);
    this.materials = this.materials.filter(m => m.subjectId !== subjectId);
    this._save();
    for (const m of toDelete) {
      try { await Storage.deleteFile(m.id); } catch (_) {}
    }
    EventBus.emit('materials:updated', this.getAll());
  }

  async getBlob(id) {
    return Storage.getFile(id);
  }

  async getBlobURL(id) {
    const blob = await this.getBlob(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  _detectType(mimeType, name) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'doc';
    if (name.endsWith('.pptx') || name.endsWith('.ppt')) return 'slide';
    return 'other';
  }

  _save() { Storage.set('materials', this.materials); }
}
