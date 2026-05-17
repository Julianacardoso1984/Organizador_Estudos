'use strict';

/**
 * TaskView — Kanban board de tarefas por matéria.
 */
class TaskView {
  constructor() {
    this.el = document.getElementById('view-tasks');
  }

  render(tasks, subject, allSubjects) {
    const cols = [
      { id:'todo',  label:'A fazer',     icon:'📋', color:'#6B7280' },
      { id:'doing', label:'Em progresso',icon:'🔄', color:'#F59E0B' },
      { id:'done',  label:'Concluído',   icon:'✅', color:'#10B981' }
    ];

    this.el.innerHTML = `
      <div class="view-content tasks-content">
        <div class="view-header">
          <h1>${subject?.emoji||'✅'} ${subject?.name||'Todas as Tarefas'} — Tarefas</h1>
          <div class="view-header-actions">
            <select id="task-subject-filter" class="select-input">
              <option value="">Todas as matérias</option>
              ${allSubjects.map(s=>`<option value="${s.id}" ${s.id===subject?.id?'selected':''}>${s.emoji} ${s.name}</option>`).join('')}
            </select>
            <button class="btn-primary" id="btn-new-task">+ Nova Tarefa</button>
          </div>
        </div>

        <div class="kanban-board">
          ${cols.map(col => {
            const colTasks = tasks.filter(t=>t.status===col.id);
            return `
              <div class="kanban-col" data-status="${col.id}">
                <div class="kanban-col-header" style="border-top-color:${col.color}">
                  <span>${col.icon} ${col.label}</span>
                  <span class="kanban-count">${colTasks.length}</span>
                </div>
                <div class="kanban-cards" data-status="${col.id}">
                  ${colTasks.map(t => this._renderCard(t, allSubjects)).join('')}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;

    this._bindEvents(allSubjects, subject);
  }

  _renderCard(task, subjects) {
    const subject = subjects.find(s=>s.id===task.subjectId);
    const pColor = {low:'#10B981',medium:'#F59E0B',high:'#EF4444'}[task.priority]||'#6B7280';
    const pLabel = {low:'Baixa',medium:'Média',high:'Alta'}[task.priority]||'';
    const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0,10) && task.status!=='done';
    return `
      <div class="task-card" data-task-id="${task.id}">
        <div class="task-card-header">
          <span class="priority-badge" style="background:${pColor}20;color:${pColor}">${pLabel}</span>
          <div class="task-card-actions">
            <button class="btn-icon btn-task-status" data-task-id="${task.id}" title="Mover status">
              <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            </button>
            <button class="btn-icon btn-task-delete" data-task-id="${task.id}" title="Excluir">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="task-card-title">${task.title}</div>
        ${task.description ? `<div class="task-card-desc">${task.description}</div>` : ''}
        <div class="task-card-footer">
          ${subject?`<span class="task-subject-tag" style="color:${subject.color}">${subject.emoji} ${subject.name}</span>`:''}
          ${task.dueDate?`<span class="task-due ${isOverdue?'overdue':''}">📅 ${this._fmtDate(task.dueDate)}</span>`:''}
        </div>
      </div>`;
  }

  _bindEvents(subjects, currentSubject) {
    // Filter by subject
    document.getElementById('task-subject-filter')?.addEventListener('change', e => {
      EventBus.emit('navigate', {view:'tasks', subjectId: e.target.value || null});
    });

    // New task
    document.getElementById('btn-new-task')?.addEventListener('click', () => {
      EventBus.emit('ui:newTask', {subjectId: currentSubject?.id || null});
    });

    // Task actions
    this.el.querySelectorAll('.btn-task-status').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('task:cycleStatus', {taskId: btn.dataset.taskId});
      });
    });

    this.el.querySelectorAll('.btn-task-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if(confirm('Excluir tarefa?')) EventBus.emit('task:delete', {taskId: btn.dataset.taskId});
      });
    });
  }

  _fmtDate(ds) {
    const [y,m,d]=ds.split('-');
    return new Date(y,m-1,d).toLocaleDateString('pt-BR',{day:'numeric',month:'short'});
  }
}
