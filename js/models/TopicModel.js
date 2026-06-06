'use strict';

/**
 * TopicModel — Gerencia os assuntos/tópicos de estudo.
 */
class TopicModel {
  constructor() {
    this._topics = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('topics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar topics:', error);
    } else {
      this._topics = data || [];
      this._topics.forEach(t => {
        t.subjectId = t.subject_id;
        t.createdAt = t.created_at;
      });
    }
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

  async create(subjectId, name) {
    const topic = {
      id: _uuid(),
      user_id: window.currentUser.id,
      subject_id: subjectId,
      name,
      studied: false,
      created_at: new Date().toISOString()
    };
    
    const localTopic = { ...topic, subjectId: topic.subject_id, createdAt: topic.created_at };
    this._topics.push(localTopic);
    EventBus.emit('topics:updated');

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('topics').insert(topic);
      if (error) console.error('Erro ao salvar topic no Supabase:', error);
    }
    return localTopic;
  }

  async update(id, updates) {
    const idx = this._topics.findIndex(t => t.id === id);
    if (idx !== -1) {
      this._topics[idx] = { ...this._topics[idx], ...updates };
      EventBus.emit('topics:updated');

      if (window.SupabaseClient) {
        const dbData = { ...updates };
        if (dbData.subjectId !== undefined) { dbData.subject_id = dbData.subjectId; delete dbData.subjectId; }
        const { error } = await window.SupabaseClient.from('topics').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
        if (error) console.error('Erro ao atualizar topic no Supabase:', error);
      }
    }
  }

  async toggleStudied(id) {
    const t = this.getById(id);
    if (t) {
      const newStatus = !t.studied;
      t.studied = newStatus;
      EventBus.emit('topics:updated');
      
      if (window.SupabaseClient) {
        const { error } = await window.SupabaseClient.from('topics').update({ studied: newStatus }).eq('id', id).eq('user_id', window.currentUser.id);
        if (error) console.error('Erro ao alternar status do topic no Supabase:', error);
      }
    }
  }

  async delete(id) {
    this._topics = this._topics.filter(t => t.id !== id);
    EventBus.emit('topics:updated');

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('topics').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar topic no Supabase:', error);
    }
  }

  async deleteBySubject(subjectId) {
    this._topics = this._topics.filter(t => t.subjectId !== subjectId);
    EventBus.emit('topics:updated');

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('topics').delete().eq('subject_id', subjectId).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar topics por subject no Supabase:', error);
    }
  }
}
