'use strict';

/**
 * CalendarModel — Gerencia eventos no calendário de estudos.
 */
class CalendarModel {
  constructor() {
    this.events = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar calendar_events:', error);
    } else {
      this.events = data || [];
      this.events.forEach(e => {
        e.subjectId = e.subject_id;
        e.taskId = e.task_id;
        e.createdAt = e.created_at;
      });
    }
  }

  getAll() { return [...this.events]; }

  getByDate(dateStr) {
    return this.events.filter(e => e.date === dateStr);
  }

  getByMonth(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.events.filter(e => e.date.startsWith(prefix));
  }

  getById(id) { return this.events.find(e => e.id === id) || null; }

  async create(data) {
    const event = {
      id: _uuid(),
      user_id: window.currentUser.id,
      title:     data.title.trim(),
      date:      data.date,         // 'YYYY-MM-DD'
      subject_id: data.subjectId || null,
      type:      data.type || 'study', // 'study' | 'deadline' | 'review' | 'exam'
      color:     data.color || '#8B5CF6',
      duration:  data.duration || 60,   // minutos
      notes:     data.notes || '',
      created_at: new Date().toISOString()
    };
    
    const localEvent = { ...event, subjectId: event.subject_id, createdAt: event.created_at };
    this.events.push(localEvent);
    EventBus.emit('calendar:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('calendar_events').insert(event);
      if (error) console.error('Erro ao salvar calendar_event no Supabase:', error);
    }
    return localEvent;
  }

  async update(id, data) {
    const idx = this.events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    
    this.events[idx] = { ...this.events[idx], ...data };
    EventBus.emit('calendar:updated', this.getAll());

    if (window.SupabaseClient) {
      const dbData = { ...data };
      if (dbData.subjectId !== undefined) { dbData.subject_id = dbData.subjectId; delete dbData.subjectId; }
      if (dbData.taskId !== undefined) { dbData.task_id = dbData.taskId; delete dbData.taskId; }
      
      const { error } = await window.SupabaseClient.from('calendar_events').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar calendar_event no Supabase:', error);
    }
    return this.events[idx];
  }

  async delete(id) {
    this.events = this.events.filter(e => e.id !== id);
    EventBus.emit('calendar:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('calendar_events').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar calendar_event no Supabase:', error);
    }
  }

  async createFromTask(task, subjectColor) {
    if (!task.dueDate) return;
    const exists = this.events.find(e => e.taskId === task.id);
    if (exists) return;

    const event = {
      id: _uuid(),
      user_id: window.currentUser.id,
      task_id:    task.id,
      title:     `📋 ${task.title}`,
      date:      task.dueDate,
      subject_id: task.subjectId,
      type:      'deadline',
      color:     subjectColor || '#F59E0B',
      duration:  0,
      notes:     task.description || '',
      created_at: new Date().toISOString()
    };
    
    const localEvent = { ...event, taskId: event.task_id, subjectId: event.subject_id, createdAt: event.created_at };
    this.events.push(localEvent);
    EventBus.emit('calendar:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('calendar_events').insert(event);
      if (error) console.error('Erro ao salvar task_event no Supabase:', error);
    }
  }

  getUpcoming(days = 7) {
    const today = new Date();
    const limit = new Date(today.getTime() + days * 86400000);
    const todayStr = today.toISOString().slice(0, 10);
    const limitStr = limit.toISOString().slice(0, 10);
    return this.events
      .filter(e => e.date >= todayStr && e.date <= limitStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
