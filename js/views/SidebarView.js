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
        <a href="#" class="nav-item ${activeRoute.view === 'discord-chat' ? 'active' : ''}" data-nav="discord-chat">
          <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat Discord
        </a>
        <a href="#" class="nav-item ${activeRoute.view === 'integrations' ? 'active' : ''}" data-nav="integrations">
          <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Integrações
        </a>
        <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="nav-item nav-item-external" id="btn-notebooklm" title="Abrir NotebookLM">
          <svg viewBox="0 0 24 24" style="stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 6l1.5 3 3 .5-2 2 .5 3L12 13l-3 1.5.5-3-2-2 3-.5z"/></svg>
          NotebookLM
          <svg class="external-icon" viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;margin-left:auto;opacity:0.6;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </nav>

      <div class="sidebar-scrollable">
        ${this._renderScheduleSection(subjects, schedule)}
        ${this._renderCoursesSection(courses)}
        ${this._renderLinksSection(usefulLinks)}

        <div class="sidebar-section-header">
          <span>MATÉRIAS</span>
          <button class="btn-icon btn-add-subject" id="btn-new-subject" title="Nova matéria">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <div class="sidebar-subjects" id="sidebar-subjects">
          ${subjects.length === 0 ? '<p class="sidebar-empty">Nenhuma matéria ainda.</p>' : subjects.map(s => this._renderSubject(s, pages, tasks, mindmaps, materials, activeRoute)).join('')}
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-backup-actions">
          <button class="theme-toggle" id="btn-export-backup" title="Exportar Backup de Dados">
            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Exportar Backup</span>
          </button>
          <button class="theme-toggle" id="btn-import-backup" title="Importar Backup de Dados">
            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Importar Backup</span>
          </button>
          <input type="file" id="input-import-backup" accept=".json" style="display:none;"/>
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

  // ── Seção Cronograma ─────────────────────────────────────────────────────
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

    const rows = days.map(d => {
      const ids = schedule[d.key] || [];
      const daySubjects = ids.map(id => subjects.find(s => s.id === id)).filter(Boolean);
      const isToday = d.key === todayKey;
      return `
        <div class="sched-day-row ${isToday ? 'sched-today' : ''}">
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
                  <button class="sched-remove-btn btn-remove-schedule" data-day="${d.key}" data-subject-id="${s.id}" title="Remover">×</button>
                </div>
              `).join('')}
            <button class="sched-add-btn btn-add-schedule" data-day="${d.key}" title="Adicionar matéria no ${d.name}">
              <svg viewBox="0 0 24 24" style="width:10px;height:10px;stroke:currentColor;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="sidebar-collapsible-section">
        <div class="sidebar-collapsible-header" data-section="schedule">
          <span class="sidebar-collapsible-title">
            <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            CRONOGRAMA
          </span>
          <svg class="collapsible-chevron ${this._scheduleExpanded ? 'open' : ''}" viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;transition:transform 0.2s;"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="sidebar-collapsible-body ${this._scheduleExpanded ? '' : 'hidden'}" id="sidebar-body-schedule">
          ${rows}
        </div>
      </div>
    `;
  }

  // ── Seção Plataformas de Cursos ───────────────────────────────────────────
  _renderCoursesSection(courses) {
    const items = courses.length === 0
      ? `<div class="sidebar-collapsible-empty">Nenhuma plataforma ainda.</div>`
      : courses.map(c => `
        <div class="sidebar-course-item">
          <span class="sidebar-course-emoji">${c.emoji}</span>
          <span class="sidebar-course-name" title="${this._esc(c.name)}">${this._esc(c.name)}</span>
          <div class="sidebar-item-actions">
            <button class="btn-icon sidebar-btn-open-platform" data-course-id="${c.id}" title="Abrir ${this._esc(c.name)}">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="btn-icon sidebar-btn-delete-course" data-course-id="${c.id}" title="Excluir">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      `).join('');

    return `
      <div class="sidebar-collapsible-section">
        <div class="sidebar-collapsible-header" data-section="courses">
          <span class="sidebar-collapsible-title">
            <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.37 2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6.29 6.29l1.27-.45a2 2 0 0 1 2.11.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            PLATAFORMAS
          </span>
          <div style="display:flex;align-items:center;gap:4px;">
            <button class="sidebar-btn-add-course btn-icon" title="Adicionar plataforma" style="width:16px;height:16px;opacity:0.6;" id="sidebar-add-course-btn">
              <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <svg class="collapsible-chevron ${this._coursesExpanded ? 'open' : ''}" viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;transition:transform 0.2s;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
        <div class="sidebar-collapsible-body ${this._coursesExpanded ? '' : 'hidden'}" id="sidebar-body-courses">
          ${items}
        </div>
      </div>
    `;
  }

  // ── Seção Links Úteis ─────────────────────────────────────────────────────
  _renderLinksSection(links) {
    const items = links.length === 0
      ? `<div class="sidebar-collapsible-empty">Nenhum link ainda.</div>`
      : links.map(l => `
        <div class="sidebar-link-item">
          <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="sidebar-link-anchor" title="${this._esc(l.title)}\n${l.url}">
            <span class="sidebar-link-emoji">${l.emoji}</span>
            <span class="sidebar-link-name">${this._esc(l.title)}</span>
          </a>
          <div class="sidebar-item-actions">
            <button class="btn-icon sidebar-btn-edit-link" data-link-id="${l.id}" title="Editar">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button class="btn-icon sidebar-btn-delete-link" data-link-id="${l.id}" title="Remover">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      `).join('');

    return `
      <div class="sidebar-collapsible-section">
        <div class="sidebar-collapsible-header" data-section="links">
          <span class="sidebar-collapsible-title">
            <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            LINKS ÚTEIS
          </span>
          <div style="display:flex;align-items:center;gap:4px;">
            <button class="sidebar-btn-add-link btn-icon" title="Adicionar link" style="width:16px;height:16px;opacity:0.6;" id="sidebar-add-link-btn">
              <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <svg class="collapsible-chevron ${this._linksExpanded ? 'open' : ''}" viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;transition:transform 0.2s;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
        <div class="sidebar-collapsible-body ${this._linksExpanded ? '' : 'hidden'}" id="sidebar-body-links">
          ${items}
        </div>
      </div>
    `;
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

    // ── Collapsible sections toggle ──
    this.el.querySelectorAll('.sidebar-collapsible-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // Ignore clicks on action buttons inside the header
        if (e.target.closest('button') && !e.target.closest('.collapsible-chevron')) return;
        const section = header.dataset.section;
        if (section === 'schedule') {
          this._scheduleExpanded = !this._scheduleExpanded;
          document.getElementById('sidebar-body-schedule')?.classList.toggle('hidden', !this._scheduleExpanded);
          header.querySelector('.collapsible-chevron')?.classList.toggle('open', this._scheduleExpanded);
        } else if (section === 'courses') {
          this._coursesExpanded = !this._coursesExpanded;
          document.getElementById('sidebar-body-courses')?.classList.toggle('hidden', !this._coursesExpanded);
          header.querySelector('.collapsible-chevron')?.classList.toggle('open', this._coursesExpanded);
        } else if (section === 'links') {
          this._linksExpanded = !this._linksExpanded;
          document.getElementById('sidebar-body-links')?.classList.toggle('hidden', !this._linksExpanded);
          header.querySelector('.collapsible-chevron')?.classList.toggle('open', this._linksExpanded);
        }
      });
    });

    // ── Cronograma ──
    this.el.querySelectorAll('.btn-add-schedule').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:addScheduleSubject', { day: btn.dataset.day });
      });
    });
    this.el.querySelectorAll('.btn-remove-schedule').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:removeScheduleSubject', { day: btn.dataset.day, subjectId: btn.dataset.subjectId });
      });
    });

    // ── Plataformas ──
    document.getElementById('sidebar-add-course-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      EventBus.emit('ui:addCoursePlatform');
    });
    this.el.querySelectorAll('.sidebar-btn-open-platform').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:openCoursePlatform', { courseId: btn.dataset.courseId });
      });
    });
    this.el.querySelectorAll('.sidebar-btn-delete-course').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:deleteCoursePlatform', { courseId: btn.dataset.courseId });
      });
    });

    // ── Links Úteis ──
    document.getElementById('sidebar-add-link-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      EventBus.emit('ui:addUsefulLink');
    });
    this.el.querySelectorAll('.sidebar-btn-edit-link').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:editUsefulLink', { linkId: btn.dataset.linkId });
      });
    });
    this.el.querySelectorAll('.sidebar-btn-delete-link').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:deleteUsefulLink', { linkId: btn.dataset.linkId });
      });
    });

    // ── Matérias ──
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
