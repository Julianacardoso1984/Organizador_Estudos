'use strict';

/**
 * SidebarView — Barra lateral hierárquica estilo Notion.
 */
class SidebarView {
  constructor() {
    this.el = document.getElementById('sidebar');
    this.collapsed = false;
    this._expanded = {};   // subjectId → boolean (expandido?)
  }

  render(subjects, pages, tasks, mindmaps, materials, activeRoute) {
    this._subjects   = subjects;
    this._pages      = pages;
    this._tasks      = tasks;
    this._mindmaps   = mindmaps;
    this._materials  = materials;
    this._active     = activeRoute;

    this.el.innerHTML = `
      <div class="sidebar-header">
        <div class="app-logo">
          <span class="logo-icon">🎓</span>
          <span class="logo-text">EstudaAí</span>
        </div>
        <button class="btn-icon" id="btn-collapse-sidebar" title="Recolher sidebar">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      <div class="sidebar-search">
        <div class="search-input-wrap">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="sidebar-search" type="text" placeholder="Buscar..." autocomplete="off"/>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a href="#" class="nav-item ${activeRoute.view === 'dashboard' ? 'active' : ''}" data-nav="dashboard">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </a>
        <a href="#" class="nav-item ${activeRoute.view === 'calendar' ? 'active' : ''}" data-nav="calendar">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Calendário
        </a>
        <a href="#" class="nav-item ${activeRoute.view === 'timer' ? 'active' : ''}" data-nav="timer">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Pomodoro
        </a>
      </nav>

      <div class="sidebar-section-header">
        <span>MATÉRIAS</span>
        <button class="btn-icon btn-add-subject" id="btn-new-subject" title="Nova matéria">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <div class="sidebar-subjects" id="sidebar-subjects">
        ${subjects.length === 0 ? '<p class="sidebar-empty">Nenhuma matéria ainda.</p>' : subjects.map(s => this._renderSubject(s, pages, tasks, mindmaps, materials, activeRoute)).join('')}
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-clock-widget" id="sidebar-clock" title="Hora atual">
          <span class="clock-time">00:00:00</span>
          <span class="clock-date">Carregando...</span>
        </div>
        <button class="btn-icon theme-toggle" id="btn-theme" title="Alternar tema">
          <svg id="theme-icon-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
          <svg id="theme-icon-sun" viewBox="0 0 24 24" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
          <span>Tema</span>
        </button>
      </div>
    `;

    this._bindEvents();
  }

  _renderSubject(s, pages, tasks, mindmaps, materials, activeRoute) {
    const isExpanded = this._expanded[s.id] !== false; // expanded by default
    const subjectPages    = pages.filter(p => p.subjectId === s.id);
    const subjectMaps     = mindmaps.filter(m => m.subjectId === s.id);
    const subjectMats     = materials.filter(m => m.subjectId === s.id);
    const pendingTasks    = tasks.filter(t => t.subjectId === s.id && t.status !== 'done').length;
    const isSubjectActive = activeRoute.subjectId === s.id;

    return `
      <div class="subject-item" data-subject-id="${s.id}">
        <div class="subject-header ${isSubjectActive && !activeRoute.pageId ? 'active' : ''}" data-toggle="${s.id}">
          <button class="subject-chevron ${isExpanded ? 'open' : ''}">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span class="subject-emoji" style="color:${s.color}">${s.emoji}</span>
          <span class="subject-name">${this._esc(s.name)}</span>
          ${pendingTasks > 0 ? `<span class="badge" style="background:${s.color}">${pendingTasks}</span>` : ''}
          <div class="subject-actions">
            <button class="btn-icon btn-add-page" data-subject-id="${s.id}" title="Nova página">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="btn-icon btn-delete-subject" data-subject-id="${s.id}" title="Excluir matéria">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>

        <div class="subject-children ${isExpanded ? '' : 'hidden'}">
          <a href="#" class="child-item child-special ${activeRoute.view === 'notes' && activeRoute.subjectId === s.id ? 'active' : ''}" data-nav="notes" data-subject-id="${s.id}">
            <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
            Anotações ${subjectPages.length > 0 ? `<span class="badge-sm">${subjectPages.length}</span>` : ''}
          </a>

          <a href="#" class="child-item child-special ${activeRoute.view === 'tasks' && activeRoute.subjectId === s.id ? 'active' : ''}" data-nav="tasks" data-subject-id="${s.id}">
            <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            Tarefas
          </a>

          <a href="#" class="child-item child-special ${activeRoute.view === 'materials' && activeRoute.subjectId === s.id ? 'active' : ''}" data-nav="materials" data-subject-id="${s.id}">
            <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            Materiais ${subjectMats.length > 0 ? `<span class="badge-sm">${subjectMats.length}</span>` : ''}
          </a>

          <a href="#" class="child-item child-special ${activeRoute.view === 'flashcards' && activeRoute.subjectId === s.id ? 'active' : ''}" data-nav="flashcards" data-subject-id="${s.id}">
            <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17h6M9 13h6M9 9h6"/></svg>
            Flashcards
          </a>

          <a href="#" class="child-item child-special ${activeRoute.view === 'quizzes' && activeRoute.subjectId === s.id ? 'active' : ''}" data-nav="quizzes" data-subject-id="${s.id}">
            <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Simulados
          </a>

          ${subjectMaps.map(mm => `
            <a href="#" class="child-item ${activeRoute.mapId === mm.id ? 'active' : ''}" data-nav="mindmap" data-map-id="${mm.id}" data-subject-id="${s.id}">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/><line x1="6" y1="6" x2="9.5" y2="10"/><line x1="18" y1="6" x2="14.5" y2="10"/><line x1="6" y1="18" x2="9.5" y2="14"/><line x1="18" y1="18" x2="14.5" y2="14"/></svg>
              ${this._esc(mm.name)}
            </a>
          `).join('')}

          <button class="child-item child-add-map btn-text" data-subject-id="${s.id}">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo mapa
          </button>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    // Collapse sidebar
    document.getElementById('btn-collapse-sidebar')?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.el.classList.toggle('collapsed', this.collapsed);
      document.getElementById('app-layout').classList.toggle('sidebar-collapsed', this.collapsed);
    });

    // Theme toggle
    document.getElementById('btn-theme')?.addEventListener('click', () => {
      EventBus.emit('ui:toggleTheme');
    });

    // New subject
    document.getElementById('btn-new-subject')?.addEventListener('click', () => {
      EventBus.emit('ui:newSubject');
    });

    // Search
    document.getElementById('sidebar-search')?.addEventListener('input', (e) => {
      EventBus.emit('ui:search', e.target.value);
    });

    // Subject toggle expand/collapse
    this.el.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.toggle;
        this._expanded[id] = !this._expanded[id];
        const chevron = el.querySelector('.subject-chevron');
        const children = el.closest('.subject-item').querySelector('.subject-children');
        chevron?.classList.toggle('open', this._expanded[id]);
        children?.classList.toggle('hidden', !this._expanded[id]);
      });
    });

    // Nav items
    this.el.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const { nav, pageId, subjectId, mapId } = el.dataset;
        EventBus.emit('navigate', { view: nav, pageId, subjectId, mapId });
      });
    });

    // Add page
    this.el.querySelectorAll('.btn-add-page').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        EventBus.emit('ui:newPage', { subjectId: btn.dataset.subjectId });
      });
    });

    // Delete subject
    this.el.querySelectorAll('.btn-delete-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        EventBus.emit('ui:deleteSubject', { subjectId: btn.dataset.subjectId });
      });
    });

    // Add mind map
    this.el.querySelectorAll('.child-add-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        EventBus.emit('ui:newMindMap', { subjectId: btn.dataset.subjectId });
      });
    });
  }

  _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}
