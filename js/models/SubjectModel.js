'use strict';

/**
 * SubjectModel — Gerencia matérias (disciplinas de estudo).
 */
class SubjectModel {
  constructor() {
    this.subjects = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar subjects:', error);
    } else {
      this.subjects = data || [];
    }
  }

  getAll() { return [...this.subjects]; }

  getById(id) { return this.subjects.find(s => s.id === id) || null; }

  async create(name, emoji = '📚', color = '#8B5CF6') {
    const subject = {
      id: _uuid(),
      user_id: window.currentUser.id,
      name: name.trim(),
      emoji,
      color,
      created_at: new Date().toISOString()
    };
    
    this.subjects.push(subject);
    EventBus.emit('subjects:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('subjects').insert(subject);
      if (error) console.error('Erro ao salvar subject no Supabase:', error);
    }
    return subject;
  }

  async update(id, data) {
    const idx = this.subjects.findIndex(s => s.id === id);
    if (idx === -1) return null;
    
    this.subjects[idx] = { ...this.subjects[idx], ...data };
    EventBus.emit('subjects:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('subjects').update(data).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar subject no Supabase:', error);
    }
    return this.subjects[idx];
  }

  async delete(id) {
    this.subjects = this.subjects.filter(s => s.id !== id);
    EventBus.emit('subjects:updated', this.getAll());
    EventBus.emit('subject:deleted', id);

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('subjects').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar subject no Supabase:', error);
    }
  }
}

// Utilitário global de UUID
function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
