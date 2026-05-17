'use strict';

/**
 * CalendarModel — Gerencia eventos no calendário de estudos.
 */
class CalendarModel {
  constructor() {
    this.events = Storage.get('calendarEvents') || [];
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

  create(data) {
    const event = {
      id: _uuid(),
      title:     data.title.trim(),
      date:      data.date,         // 'YYYY-MM-DD'
      subjectId: data.subjectId || null,
      type:      data.type || 'study', // 'study' | 'deadline' | 'review' | 'exam'
      color:     data.color || '#8B5CF6',
      duration:  data.duration || 60,   // minutos
      notes:     data.notes || '',
      createdAt: new Date().toISOString()
    };
    this.events.push(event);
    this._save();
    EventBus.emit('calendar:updated', this.getAll());
    return event;
  }

  update(id, data) {
    const idx = this.events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.events[idx] = { ...this.events[idx], ...data };
    this._save();
    EventBus.emit('calendar:updated', this.getAll());
    return this.events[idx];
  }

  delete(id) {
    this.events = this.events.filter(e => e.id !== id);
    this._save();
    EventBus.emit('calendar:updated', this.getAll());
  }

  // Criado pelo TaskModel quando uma tarefa com prazo é criada
  createFromTask(task, subjectColor) {
    if (!task.dueDate) return;
    // Evitar duplicatas
    const exists = this.events.find(e => e.taskId === task.id);
    if (exists) return;

    const event = {
      id: _uuid(),
      taskId:    task.id,
      title:     `📋 ${task.title}`,
      date:      task.dueDate,
      subjectId: task.subjectId,
      type:      'deadline',
      color:     subjectColor || '#F59E0B',
      duration:  0,
      notes:     task.description || '',
      createdAt: new Date().toISOString()
    };
    this.events.push(event);
    this._save();
    EventBus.emit('calendar:updated', this.getAll());
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

  _save() { Storage.set('calendarEvents', this.events); }
}
