'use strict';

/**
 * PageModel — Gerencia páginas/notas com blocos de conteúdo (estilo Notion).
 */
class PageModel {
  constructor() {
    this.pages = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('pages')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar pages:', error);
    } else {
      this.pages = data || [];
      // Manter compatibilidade do nome dos campos
      this.pages.forEach(p => {
        p.subjectId = p.subject_id;
        p.createdAt = p.created_at;
        p.updatedAt = p.updated_at;
      });
    }
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

  async create(subjectId, title = 'Nova Página') {
    const page = {
      id: _uuid(),
      user_id: window.currentUser.id,
      subject_id: subjectId,
      title,
      blocks: [{ id: _uuid(), type: 'text', content: '', checked: false }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const localPage = { ...page, subjectId: page.subject_id, createdAt: page.created_at, updatedAt: page.updated_at };
    this.pages.push(localPage);
    EventBus.emit('pages:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('pages').insert(page);
      if (error) console.error('Erro ao salvar page no Supabase:', error);
    }
    return localPage;
  }

  async update(id, data) {
    const idx = this.pages.findIndex(p => p.id === id);
    if (idx === -1) return null;
    
    const now = new Date().toISOString();
    this.pages[idx] = { ...this.pages[idx], ...data, updatedAt: now };
    EventBus.emit('pages:updated', this.getAll());

    if (window.SupabaseClient) {
      const dbData = { ...data, updated_at: now };
      if (dbData.subjectId !== undefined) {
        dbData.subject_id = dbData.subjectId;
        delete dbData.subjectId;
      }
      const { error } = await window.SupabaseClient.from('pages').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar page no Supabase:', error);
    }
    return this.pages[idx];
  }

  updateBlocks(id, blocks) {
    return this.update(id, { blocks });
  }

  async delete(id) {
    this.pages = this.pages.filter(p => p.id !== id);
    EventBus.emit('pages:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('pages').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar page no Supabase:', error);
    }
  }

  async deleteBySubject(subjectId) {
    this.pages = this.pages.filter(p => p.subjectId !== subjectId);
    EventBus.emit('pages:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('pages').delete().eq('subject_id', subjectId).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar pages por subject no Supabase:', error);
    }
  }

  search(query) {
    const q = query.toLowerCase();
    return this.pages.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.blocks.some(b => (b.content || '').toLowerCase().includes(q))
    );
  }
}
