'use strict';

/**
 * UsefulLinksModel — Gerencia os links úteis salvos pelo usuário.
 */
class UsefulLinksModel {
  constructor() {
    this.links = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('useful_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar useful_links:', error);
    } else {
      this.links = data || [];
      this.links.forEach(l => {
        l.createdAt = l.created_at;
      });
    }
  }

  getAll() { return [...this.links]; }

  getById(id) { return this.links.find(l => l.id === id) || null; }

  async create(title, url, emoji = '🔗', description = '') {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    const link = {
      id: _uuid(),
      user_id: window.currentUser.id,
      title: title.trim(),
      url: formattedUrl,
      emoji,
      description: description.trim(),
      created_at: new Date().toISOString()
    };
    
    const localLink = { ...link, createdAt: link.created_at };
    this.links.push(localLink);
    EventBus.emit('usefulLinks:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('useful_links').insert(link);
      if (error) console.error('Erro ao salvar useful_link no Supabase:', error);
    }
    return localLink;
  }

  async update(id, { title, url, emoji, description }) {
    const link = this.links.find(l => l.id === id);
    if (!link) return;
    
    const dbData = {};
    if (title !== undefined)       { link.title       = title.trim(); dbData.title = link.title; }
    if (emoji !== undefined)       { link.emoji       = emoji; dbData.emoji = link.emoji; }
    if (description !== undefined) { link.description = description.trim(); dbData.description = link.description; }
    if (url !== undefined) {
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = 'https://' + formattedUrl;
      link.url = formattedUrl;
      dbData.url = link.url;
    }
    
    EventBus.emit('usefulLinks:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('useful_links').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar useful_link no Supabase:', error);
    }
    return link;
  }

  async delete(id) {
    this.links = this.links.filter(l => l.id !== id);
    EventBus.emit('usefulLinks:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('useful_links').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar useful_link no Supabase:', error);
    }
  }
}
