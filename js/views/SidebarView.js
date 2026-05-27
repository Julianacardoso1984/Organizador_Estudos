'use strict';

/**
 * SidebarView — Barra lateral hierárquica estilo Notion.
 */
class SidebarView {
  constructor() {
    this.el = document.getElementById('sidebar');
    this.collapsed = false;
    this._expanded = {};   // subjectId → boolean (expandido?)
    this._scheduleExpanded = true;
    this._coursesExpanded = true;
    this._linksExpanded = true;
  }

  render(subjects, pages, tasks, mindmaps, materials, activeRoute, schedule = {}, courses = [], usefulLinks = []) {
    this._subjects    = subjects;
    this._pages       = pages;
    this._tasks       = tasks;
    this._mindmaps    = mindmaps;
    this._materials   = materials;
    this._active      = activeRoute;
    this._schedule    = schedule;
    this._courses     = courses;
    this._usefulLinks = usefulLinks;

    const activeSubject = activeRoute.subjectId ? subjects.find(s => s.id === activeRoute.subjectId) : null;
    let courseNavHtml = '';

    if (activeSubject) {
      courseNavHtml = `
        <div class="course-nav-container">
          <div class="course-nav-header" style="color: ${activeSubject.color || 'var(--text)'};">
            ${activeSubject.emoji} ${activeSubject.name}
          </div>
          <nav class="course-nav-list">
            <a href="#" class="course-nav-item ${activeRoute.view === 'notes' ? 'active' : ''}" data-nav="notes" data-subject-id="${activeSubject.id}">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Anotações
            </a>
            <a href="#" class="course-nav-item ${activeRoute.view === 'tasks' ? 'active' : ''}" data-nav="tasks" data-subject-id="${activeSubject.id}">
              <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              Tarefas
            </a>
            <a href="#" class="course-nav-item ${activeRoute.view === 'topics' ? 'active' : ''}" data-nav="topics" data-subject-id="${activeSubject.id}">
              <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Assuntos
            </a>
            <a href="#" class="course-nav-item ${activeRoute.view === 'materials' ? 'active' : ''}" data-nav="materials" data-subject-id="${activeSubject.id}">
              <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Materiais
            </a>
            <a href="#" class="course-nav-item ${activeRoute.view === 'flashcards' ? 'active' : ''}" data-nav="flashcards" data-subject-id="${activeSubject.id}">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              Flashcards
            </a>
            <a href="#" class="course-nav-item ${activeRoute.view === 'quizzes' ? 'active' : ''}" data-nav="quizzes" data-subject-id="${activeSubject.id}">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Simulados
            </a>
            
            <div style="margin-top: 16px; padding: 0 12px 8px; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim); font-weight: 700; letter-spacing: 0.05em;">Mapas Mentais</div>
            ${mindmaps.filter(m => m.subjectId === activeSubject.id).map(mm => `
              <a href="#" class="course-nav-item ${activeRoute.mapId === mm.id ? 'active' : ''}" data-nav="mindmap" data-map-id="${mm.id}" data-subject-id="${activeSubject.id}">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/><line x1="6" y1="6" x2="9.5" y2="10"/><line x1="18" y1="6" x2="14.5" y2="10"/><line x1="6" y1="18" x2="9.5" y2="14"/><line x1="18" y1="18" x2="14.5" y2="14"/></svg>
                ${this._esc(mm.name)}
              </a>
            `).join('')}
            <button class="course-nav-item child-add-map" style="background: none; border: none; width: 100%; text-align: left; opacity: 0.7; cursor: pointer;" data-subject-id="${activeSubject.id}">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo mapa
            </button>
          </nav>
        </div>
      `;
    }

    this.el.innerHTML = `
      <div class="global-nav-container">
        <div class="sidebar-header">
          <div class="app-logo">
            <span class="logo-icon">🎓</span>
            <span class="logo-text">EstudaAí</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a href="#" class="nav-item ${activeRoute.view === 'dashboard' ? 'active' : ''}" data-nav="dashboard" title="Dashboard">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Painel
          </a>
          
          <a href="#" class="nav-item ${activeRoute.view === 'resources' ? 'active' : ''}" data-nav="resources" title="Recursos Gerais">
            <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
            Recursos
          </a>

          <a href="#" class="nav-item ${activeRoute.view === 'calendar' ? 'active' : ''}" data-nav="calendar" title="Calendário">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Agenda
          </a>
          <a href="#" class="nav-item ${activeRoute.view === 'timer' ? 'active' : ''}" data-nav="timer" title="Pomodoro">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Timer
          </a>
          <a href="#" class="nav-item ${activeRoute.view === 'discord-chat' ? 'active' : ''}" data-nav="discord-chat" title="Chat Discord">
            <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat
          </a>
          <a href="#" class="nav-item ${activeRoute.view === 'integrations' ? 'active' : ''}" data-nav="integrations" title="Integrações">
            <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Integrar
          </a>
          <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="nav-item nav-item-external" id="btn-notebooklm" title="Abrir NotebookLM">
            <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 6l1.5 3 3 .5-2 2 .5 3L12 13l-3 1.5.5-3-2-2 3-.5z"/></svg>
            IA
          </a>
        </nav>

        <div style="flex:1;"></div>

        <div class="sidebar-footer">
          <button class="theme-toggle" id="btn-theme" title="Alternar tema">
            <svg id="theme-icon-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
            <svg id="theme-icon-sun" viewBox="0 0 24 24" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
          </button>
        </div>
      </div>
      ${courseNavHtml}
    `;

    this._bindEvents();
  }



  // ── Matéria individual ────────────────────────────────────────────────────
  _renderSubject(s, pages, tasks, mindmaps, materials, activeRoute) {
    const isExpanded = this._expanded[s.id] !== false;
    const subjectPages = pages.filter(p => p.subjectId === s.id);
    const subjectMaps  = mindmaps.filter(m => m.subjectId === s.id);
    const subjectMats  = materials.filter(m => m.subjectId === s.id);
    const pendingTasks = tasks.filter(t => t.subjectId === s.id && t.status !== 'done').length;
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

          <a href="#" class="child-item child-special ${activeRoute.view === 'topics' && activeRoute.subjectId === s.id ? 'active' : ''}" data-nav="topics" data-subject-id="${s.id}">
            <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Assuntos
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

    // Export backup
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      EventBus.emit('ui:exportBackup');
    });

    // Import backup
    const btnImport = document.getElementById('btn-import-backup');
    const inputImport = document.getElementById('input-import-backup');
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', () => { inputImport.click(); });
      inputImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) { EventBus.emit('ui:importBackup', file); inputImport.value = ''; }
      });
    }

    // New subject
    document.getElementById('btn-new-subject')?.addEventListener('click', () => {
      EventBus.emit('ui:newSubject');
    });

    // Search
    document.getElementById('sidebar-search')?.addEventListener('input', (e) => {
      EventBus.emit('ui:search', e.target.value);
    });

    // ── Matérias ──
    this.el.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.toggle;
        // Inicializa explicitamente como true se nunca foi definido
        if (this._expanded[id] === undefined) this._expanded[id] = true;
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
