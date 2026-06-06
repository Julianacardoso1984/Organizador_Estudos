'use strict';

/**
 * CourseModel — Gerencia as plataformas de cursos registradas pelo usuário.
 */
class CourseModel {
  constructor() {
    this.courses = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar courses:', error);
    } else {
      this.courses = data || [];
    }
  }

  getAll() { return [...this.courses]; }

  getById(id) { return this.courses.find(c => c.id === id) || null; }

  async create(name, url, emoji = '💻') {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const course = {
      id: _uuid(),
      user_id: window.currentUser.id,
      name: name.trim(),
      url: formattedUrl,
      emoji,
      created_at: new Date().toISOString()
    };
    
    this.courses.push(course);
    EventBus.emit('courses:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('courses').insert(course);
      if (error) console.error('Erro ao salvar course no Supabase:', error);
    }
    return course;
  }

  async delete(id) {
    this.courses = this.courses.filter(c => c.id !== id);
    EventBus.emit('courses:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('courses').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar course no Supabase:', error);
    }
  }
}
