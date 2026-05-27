'use strict';

class ResourcesView {
  constructor() {
    this.el = document.getElementById('view-resources');
  }

  render(subjects, schedule, courses, usefulLinks) {
    this._subjects = subjects;
    this._schedule = schedule;
    this._courses = courses;
    this._usefulLinks = usefulLinks;

    this.el.innerHTML = `
      <div class="dashboard-content" style="max-width: 1400px; margin: 0 auto; width: 100%;">
        <div class="dashboard-greeting">
          <h1>Recursos Gerais</h1>
          <div class="greeting-date">Gerencie seu Cronograma de Estudos, Plataformas de Cursos e Links Úteis em um só lugar.</div>
        </div>
        
        <div class="dashboard-columns" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; align-items: start;">
          <div class="resource-card" style="background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-sm);">
            <h2 style="font-size: 1.1rem; margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Meu Cronograma
            </h2>
            <div class="sidebar-schedule-body">
              ${this._renderScheduleSection(subjects, schedule)}
            </div>
          </div>

          <div class="resource-card" style="background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h2 style="font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.37 2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6.29 6.29l1.27-.45a2 2 0 0 1 2.11.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Plataformas
              </h2>
              <button class="btn-icon" id="res-btn-add-course" title="Adicionar plataforma" style="background: var(--bg); border: 1px solid var(--border);">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <div class="sidebar-collapsible-body">
              ${this._renderCoursesSection(courses)}
            </div>
          </div>

          <div class="resource-card" style="background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h2 style="font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Links Úteis
              </h2>
              <button class="btn-icon" id="res-btn-add-link" title="Adicionar link" style="background: var(--bg); border: 1px solid var(--border);">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <div class="sidebar-collapsible-body">
              ${this._renderLinksSection(usefulLinks)}
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _renderScheduleSection(subjects, schedule) {
    const days = [
      { key: 'mon', name: 'Seg' },
      { key: 'tue', name: 'Ter' },
      { key: 'wed', name: 'Qua' },
      { key: 'thu', name: 'Qui' },
      { key: 'fri', name: 'Sex' },
      { key: 'sat', name: 'Sáb' },
      { key: 'sun', name: 'Dom' },
    ];
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];

    return days.map(d => {
      const ids = schedule[d.key] || [];
      const daySubjects = ids.map(id => subjects.find(s => s.id === id)).filter(Boolean);
      const isToday = d.key === todayKey;
      return `
        <div class="sched-day-row ${isToday ? 'sched-today' : ''}" style="margin-bottom: 8px;">
          <div class="sched-day-label">
            <span class="sched-day-name ${isToday ? 'sched-today-label' : ''}">${d.name}</span>
            ${isToday ? '<span class="sched-today-dot"></span>' : ''}
          </div>
          <div class="sched-day-subjects">
            ${daySubjects.length === 0
              ? '<span class="sched-empty-day">—</span>'
              : daySubjects.map(s => `
                <div class="sched-subject-pill" style="border-left-color:${s.color}; background: color-mix(in srgb, ${s.color} 12%, var(--bg-3));" title="${this._esc(s.name)}">
                  <span>${s.emoji}</span>
                  <span class="sched-pill-name">${this._esc(s.name)}</span>
                  <button class="sched-remove-btn res-btn-remove-schedule" data-day="${d.key}" data-subject-id="${s.id}" title="Remover">×</button>
                </div>
              `).join('')}
            <button class="sched-add-btn res-btn-add-schedule" data-day="${d.key}" title="Adicionar matéria no ${d.name}">
              <svg viewBox="0 0 24 24" style="width:10px;height:10px;stroke:currentColor;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  _renderCoursesSection(courses) {
    if (courses.length === 0) return `<div class="sidebar-collapsible-empty">Nenhuma plataforma ainda.</div>`;
    
    return courses.map(c => `
        <div class="sidebar-course-item" style="padding: 8px 12px; background: var(--bg); border-radius: var(--radius-sm); margin-bottom: 8px;">
          <span class="sidebar-course-emoji">${c.emoji}</span>
          <span class="sidebar-course-name" title="${this._esc(c.name)}">${this._esc(c.name)}</span>
          <div class="sidebar-item-actions">
            <button class="btn-icon res-btn-open-platform" data-course-id="${c.id}" title="Abrir ${this._esc(c.name)}">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="btn-icon res-btn-delete-course" data-course-id="${c.id}" title="Excluir">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      `).join('');
  }

  _renderLinksSection(links) {
    if (links.length === 0) return `<div class="sidebar-collapsible-empty">Nenhum link ainda.</div>`;
    
    return links.map(l => `
        <div class="sidebar-link-item" style="padding: 8px 12px; background: var(--bg); border-radius: var(--radius-sm); margin-bottom: 8px;">
          <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="sidebar-link-anchor" title="${this._esc(l.title)}\n${l.url}">
            <span class="sidebar-link-emoji">${l.emoji}</span>
            <span class="sidebar-link-name">${this._esc(l.title)}</span>
          </a>
          <div class="sidebar-item-actions">
            <button class="btn-icon res-btn-edit-link" data-link-id="${l.id}" title="Editar">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button class="btn-icon res-btn-delete-link" data-link-id="${l.id}" title="Remover">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      `).join('');
  }

  _bindEvents() {
    this.el.querySelectorAll('.res-btn-add-schedule').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('ui:addScheduleSubject', { day: btn.dataset.day }));
    });
    this.el.querySelectorAll('.res-btn-remove-schedule').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('ui:removeScheduleSubject', { day: btn.dataset.day, subjectId: btn.dataset.subjectId }));
    });

    document.getElementById('res-btn-add-course')?.addEventListener('click', () => EventBus.emit('ui:addCoursePlatform'));
    this.el.querySelectorAll('.res-btn-open-platform').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('ui:openCoursePlatform', { courseId: btn.dataset.courseId }));
    });
    this.el.querySelectorAll('.res-btn-delete-course').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('ui:deleteCoursePlatform', { courseId: btn.dataset.courseId }));
    });

    document.getElementById('res-btn-add-link')?.addEventListener('click', () => EventBus.emit('ui:addUsefulLink'));
    this.el.querySelectorAll('.res-btn-edit-link').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('ui:editUsefulLink', { linkId: btn.dataset.linkId }));
    });
    this.el.querySelectorAll('.res-btn-delete-link').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('ui:deleteUsefulLink', { linkId: btn.dataset.linkId }));
    });
  }

  _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}
