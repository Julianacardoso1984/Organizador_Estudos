'use strict';

/**
 * TaskModel — Gerencia tarefas de estudo por matéria.
 */
class TaskModel {
  constructor() {
    this.tasks = Storage.get('tasks') || [];
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

  create(subjectId, title, opts = {}) {
    const task = {
      id: _uuid(),
      subjectId,
      title: title.trim(),
      description: opts.description || '',
      status: 'todo',           // 'todo' | 'doing' | 'done'
      priority: opts.priority || 'medium', // 'low' | 'medium' | 'high'
      dueDate: opts.dueDate || null,       // 'YYYY-MM-DD'
      createdAt: new Date().toISOString()
    };
    this.tasks.push(task);
    this._save();
    EventBus.emit('tasks:updated', this.getAll());
    // Integração com Calendário: emite evento para que o CalendarModel crie entry
    if (task.dueDate) EventBus.emit('task:withDue', task);
    return task;
  }

  update(id, data) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.tasks[idx] = { ...this.tasks[idx], ...data };
    this._save();
    EventBus.emit('tasks:updated', this.getAll());
    return this.tasks[idx];
  }

  setStatus(id, status) { return this.update(id, { status }); }

  delete(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this._save();
    EventBus.emit('tasks:updated', this.getAll());
  }

  deleteBySubject(subjectId) {
    this.tasks = this.tasks.filter(t => t.subjectId !== subjectId);
    this._save();
    EventBus.emit('tasks:updated', this.getAll());
  }

  stats() {
    return {
      total: this.tasks.length,
      todo: this.tasks.filter(t => t.status === 'todo').length,
      doing: this.tasks.filter(t => t.status === 'doing').length,
      done: this.tasks.filter(t => t.status === 'done').length
    };
  }

  _save() { Storage.set('tasks', this.tasks); }
}
