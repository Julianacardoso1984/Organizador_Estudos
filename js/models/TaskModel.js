'use strict';

/**
 * TaskModel — Gerencia tarefas de estudo por matéria.
 */
class TaskModel {
  constructor() {
    this.tasks = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar tasks:', error);
    } else {
      this.tasks = data || [];
      this.tasks.forEach(t => {
        t.subjectId = t.subject_id;
        t.dueDate = t.due_date;
        t.createdAt = t.created_at;
      });
    }
  }

  getAll() { return [...this.tasks]; }

  getBySubject(subjectId) {
    return this.tasks.filter(t => t.subjectId === subjectId);
  }

  getById(id) { return this.tasks.find(t => t.id === id) || null; }

  getPending() { return this.tasks.filter(t => t.status !== 'done'); }

  getOverdue() {
    const today = new Date().toISOString().slice(0, 10);
    return this.tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
  }

  async create(subjectId, title, opts = {}) {
    const task = {
      id: _uuid(),
      user_id: window.currentUser.id,
      subject_id: subjectId,
      title: title.trim(),
      description: opts.description || '',
      status: 'todo',
      priority: opts.priority || 'medium',
      due_date: opts.dueDate || null,
      created_at: new Date().toISOString()
    };
    
    const localTask = { ...task, subjectId: task.subject_id, dueDate: task.due_date, createdAt: task.created_at };
    this.tasks.push(localTask);
    EventBus.emit('tasks:updated', this.getAll());
    
    if (localTask.dueDate) EventBus.emit('task:withDue', localTask);

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('tasks').insert(task);
      if (error) console.error('Erro ao salvar task no Supabase:', error);
    }
    return localTask;
  }

  async update(id, data) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    
    this.tasks[idx] = { ...this.tasks[idx], ...data };
    EventBus.emit('tasks:updated', this.getAll());

    if (window.SupabaseClient) {
      const dbData = { ...data };
      if (dbData.subjectId !== undefined) { dbData.subject_id = dbData.subjectId; delete dbData.subjectId; }
      if (dbData.dueDate !== undefined) { dbData.due_date = dbData.dueDate; delete dbData.dueDate; }
      
      const { error } = await window.SupabaseClient.from('tasks').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar task no Supabase:', error);
    }
    return this.tasks[idx];
  }

  setStatus(id, status) { return this.update(id, { status }); }

  async delete(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    EventBus.emit('tasks:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('tasks').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar task no Supabase:', error);
    }
  }

  async deleteBySubject(subjectId) {
    this.tasks = this.tasks.filter(t => t.subjectId !== subjectId);
    EventBus.emit('tasks:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('tasks').delete().eq('subject_id', subjectId).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar tasks por subject no Supabase:', error);
    }
  }

  stats() {
    return {
      total: this.tasks.length,
      todo: this.tasks.filter(t => t.status === 'todo').length,
      doing: this.tasks.filter(t => t.status === 'doing').length,
      done: this.tasks.filter(t => t.status === 'done').length
    };
  }
}
