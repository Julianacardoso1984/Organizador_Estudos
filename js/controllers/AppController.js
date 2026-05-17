'use strict';

/**
 * AppController — Orquestrador central do padrão MVC.
 * Liga Models → Events → Views e gerencia navegação.
 */
class AppController {
  constructor(models, views) {
    this.models = models;
    this.views  = views;

    this._route   = { view: 'dashboard', subjectId: null, pageId: null, mapId: null };
    this._theme   = Storage.get('theme') || 'dark';
    this._currentMindMapView = null;

    Storage.initDB().catch(e => console.warn('IndexedDB não disponível:', e));
    this._applyTheme();
    this._bindEvents();
    this._startClock();
    this._render();
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  navigate(view, opts = {}) {
    // Destroy mind map RAF loop before leaving
    if (this._currentMindMapView) { this._currentMindMapView.destroy(); this._currentMindMapView = null; }

    this._route = { view, subjectId: opts.subjectId||null, pageId: opts.pageId||null, mapId: opts.mapId||null };
    this._render();
  }

  _render() {
    const { subjectModel, pageModel, taskModel, timerModel, calendarModel, materialModel, mindMapModel } = this.models;
    const subjects   = subjectModel.getAll();
    const pages      = pageModel.getAll();
    const tasks      = taskModel.getAll();
    const calendar   = calendarModel.getAll();
    const materials  = materialModel.getAll();
    const mindMaps   = mindMapModel.getAll();

    // Sidebar always visible
    this.views.sidebar.render(subjects, pages, tasks, mindMaps, materials, this._route);

    // Show correct view
    const allViews = ['dashboard','editor','tasks','calendar','materials','mindmap','timer'];
    allViews.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle('hidden', v !== this._route.view);
    });

    const r = this._route;
    switch (r.view) {
      case 'dashboard':
        this.views.dashboard.render(subjects, pages, tasks, calendar);
        break;

      case 'editor': {
        const page    = r.pageId ? pageModel.getById(r.pageId) : null;
        const subject = page ? subjectModel.getById(page.subjectId) : null;
        if (page) this.views.editor.render(page, subject);
        break;
      }

      case 'tasks': {
        const subject = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? taskModel.getBySubject(r.subjectId) : tasks;
        this.views.tasks.render(filtered, subject, subjects);
        break;
      }

      case 'calendar':
        this.views.calendar.render(calendar, subjects);
        break;

      case 'materials': {
        const subject  = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? materialModel.getBySubject(r.subjectId) : materials;
        this.views.materials.render(filtered, subject, subjects);
        break;
      }

      case 'mindmap': {
        const map     = r.mapId ? mindMapModel.getById(r.mapId) : null;
        const subject = map ? subjectModel.getById(map.subjectId) : null;
        if (map) {
          this.views.mindmap.render(map, subject);
          this._currentMindMapView = this.views.mindmap;
        }
        break;
      }

      case 'timer':
        this.views.timer.render(timerModel._state());
        break;
    }
  }

  // ── Event Bindings ─────────────────────────────────────────────────────────

  _bindEvents() {
    const { subjectModel, pageModel, taskModel, timerModel, calendarModel, materialModel, mindMapModel } = this.models;

    // ─ Navigation ─
    EventBus.on('navigate', ({ view, pageId, subjectId, mapId }) => {
      this.navigate(view, { pageId, subjectId, mapId });
    });

    // ─ Theme ─
    EventBus.on('ui:toggleTheme', () => {
      this._theme = this._theme === 'dark' ? 'light' : 'dark';
      Storage.set('theme', this._theme);
      this._applyTheme();
      this._render();
    });

    // ─ Search ─
    EventBus.on('ui:search', (query) => {
      if (!query.trim()) return;
      const results = pageModel.search(query);
      // Simple: navigate to first result
      if (results.length > 0) {
        this.navigate('editor', { pageId: results[0].id, subjectId: results[0].subjectId });
      }
    });

    // ─ Subjects ─
    EventBus.on('ui:newSubject', () => this._showSubjectModal());

    EventBus.on('ui:deleteSubject', ({ subjectId }) => {
      const s = subjectModel.getById(subjectId);
      if (!s) return;
      if (!confirm(`Excluir "${s.name}" e todos os seus dados?`)) return;
      pageModel.deleteBySubject(subjectId);
      taskModel.deleteBySubject(subjectId);
      materialModel.deleteBySubject(subjectId);
      mindMapModel.deleteBySubject(subjectId);
      subjectModel.delete(subjectId);
      this.navigate('dashboard');
    });

    EventBus.on('subjects:updated', () => this._render());

    // ─ Pages ─
    EventBus.on('ui:newPage', ({ subjectId }) => {
      const page = pageModel.create(subjectId);
      this.navigate('editor', { pageId: page.id, subjectId });
    });

    EventBus.on('editor:save', ({ pageId, title, blocks }) => {
      pageModel.update(pageId, { title, blocks });
      this._renderSidebar();
    });

    EventBus.on('editor:updateTitle', ({ pageId, title }) => {
      pageModel.update(pageId, { title });
      this._renderSidebar();
    });

    EventBus.on('editor:deletePage', ({ pageId }) => {
      const page = pageModel.getById(pageId);
      pageModel.delete(pageId);
      this.navigate('dashboard');
    });

    EventBus.on('pages:updated', () => this._renderSidebar());

    // ─ Tasks ─
    EventBus.on('ui:newTask', ({ subjectId }) => this._showTaskModal(subjectId));

    EventBus.on('task:cycleStatus', ({ taskId }) => {
      const t = taskModel.getById(taskId);
      if (!t) return;
      const cycle = { todo:'doing', doing:'done', done:'todo' };
      taskModel.setStatus(taskId, cycle[t.status]);
      this._render();
    });

    EventBus.on('task:delete', ({ taskId }) => {
      taskModel.delete(taskId);
      this._render();
    });

    EventBus.on('tasks:updated', () => this._render());

    // Task with due date → auto-create calendar entry
    EventBus.on('task:withDue', (task) => {
      const s = subjectModel.getById(task.subjectId);
      calendarModel.createFromTask(task, s?.color);
    });

    // ─ Calendar ─
    EventBus.on('ui:newEvent', ({ date }) => this._showEventModal(date));
    EventBus.on('ui:editEvent', ({ eventId }) => {
      const ev = calendarModel.getById(eventId);
      if (ev) this._showEventModal(ev.date, ev);
    });
    EventBus.on('calendar:updated', () => { if(this._route.view==='calendar') this._render(); });

    // ─ Materials ─
    EventBus.on('material:upload', async ({ file, subjectId }) => {
      try {
        await materialModel.create(subjectId, file);
        if (this._route.view === 'materials') this._render();
      } catch (e) {
        alert('Erro ao fazer upload: ' + e.message);
      }
    });

    EventBus.on('material:preview', async ({ materialId }) => {
      const meta = materialModel.getById(materialId);
      if (!meta) return;
      const url = await materialModel.getBlobURL(materialId);
      if (!url) { alert('Arquivo não disponível.'); return; }
      this._showPreviewModal(meta, url);
    });

    EventBus.on('material:download', async ({ materialId }) => {
      const meta = materialModel.getById(materialId);
      const url  = await materialModel.getBlobURL(materialId);
      if (!url) { alert('Arquivo não disponível.'); return; }
      const a = document.createElement('a');
      a.href = url; a.download = meta.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });

    EventBus.on('material:delete', async ({ materialId }) => {
      await materialModel.delete(materialId);
      this._render();
    });

    EventBus.on('ui:pickSubjectForUpload', ({ files }) => {
      this._showPickSubjectModal(files);
    });

    // ─ Mind Maps ─
    EventBus.on('ui:newMindMap', ({ subjectId }) => this._showMindMapModal(subjectId));

    EventBus.on('mindmap:save', ({ mapId, nodes, edges }) => {
      mindMapModel.saveGraph(mapId, nodes, edges);
    });

    EventBus.on('mindmaps:updated', () => this._renderSidebar());

    // ─ Timer ─
    EventBus.on('timer:toggle',   () => { this.models.timerModel.toggle();             this._renderTimer(); });
    EventBus.on('timer:reset',    () => { this.models.timerModel.reset();              this._renderTimer(); });
    EventBus.on('timer:skip',     () => { this.models.timerModel._complete();          this._renderTimer(); });
    EventBus.on('timer:setMode',  (mode) => { this.models.timerModel.setMode(mode);   this._renderTimer(); });
    EventBus.on('timer:tick',     () => { if(this._route.view==='timer') this._renderTimer(); });
    EventBus.on('timer:complete', ({ mode }) => {
      const msg = mode==='focus' ? '✅ Sessão de foco concluída!' : '🎯 Hora de focar!';
      this._toast(msg);
      if(this._route.view==='timer') this._renderTimer();
    });
  }

  _renderSidebar() {
    const { subjectModel, pageModel, taskModel, mindMapModel, materialModel } = this.models;
    this.views.sidebar.render(
      subjectModel.getAll(), pageModel.getAll(), taskModel.getAll(),
      mindMapModel.getAll(), materialModel.getAll(), this._route
    );
  }

  _renderTimer() {
    this.views.timer.render(this.models.timerModel._state());
  }

  _applyTheme() {
    document.body.classList.toggle('light', this._theme==='light');
    const moon = document.getElementById('theme-icon-moon');
    const sun  = document.getElementById('theme-icon-sun');
    if (moon) moon.style.display = this._theme==='dark'  ? '' : 'none';
    if (sun)  sun.style.display  = this._theme==='light' ? '' : 'none';
  }

  // ── Modals ─────────────────────────────────────────────────────────────────

  _showSubjectModal() {
    const emojis = ['📚','📐','🔬','🧬','📜','🌍','💻','🎨','🎵','⚗️','📊','🏛️'];
    const colors = ['#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#3B82F6','#F97316'];
    this._openModal(`
      <h2>Nova Matéria</h2>
      <input id="modal-subject-name" class="modal-input" type="text" placeholder="Nome da matéria" maxlength="40">
      <label class="modal-label">Emoji</label>
      <div class="emoji-grid">${emojis.map(e=>`<button class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}</div>
      <label class="modal-label">Cor</label>
      <div class="color-grid">${colors.map(c=>`<button class="color-swatch" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">Criar</button>
      </div>
    `, () => {
      let emoji = '📚', color = '#8B5CF6';
      document.querySelectorAll('.emoji-btn').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.emoji-btn').forEach(x=>x.classList.remove('selected'));
        b.classList.add('selected'); emoji = b.dataset.emoji;
      }));
      document.querySelectorAll('.color-swatch').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('selected'));
        b.classList.add('selected'); color = b.dataset.color;
      }));
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        const name = document.getElementById('modal-subject-name')?.value.trim();
        if (!name) return;
        this.models.subjectModel.create(name, emoji, color);
        this._closeModal();
        this._render();
      });
      document.getElementById('modal-subject-name')?.focus();
    });
  }

  _showTaskModal(subjectId) {
    const subjects = this.models.subjectModel.getAll();
    this._openModal(`
      <h2>Nova Tarefa</h2>
      <input id="modal-task-title" class="modal-input" type="text" placeholder="Título da tarefa" maxlength="100">
      <textarea id="modal-task-desc" class="modal-textarea" placeholder="Descrição (opcional)" rows="2"></textarea>
      <div class="modal-row">
        <div>
          <label class="modal-label">Matéria</label>
          <select id="modal-task-subject" class="select-input">
            ${subjects.map(s=>`<option value="${s.id}" ${s.id===subjectId?'selected':''}>${s.emoji} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="modal-label">Prioridade</label>
          <select id="modal-task-priority" class="select-input">
            <option value="low">🟢 Baixa</option>
            <option value="medium" selected>🟡 Média</option>
            <option value="high">🔴 Alta</option>
          </select>
        </div>
        <div>
          <label class="modal-label">Prazo</label>
          <input id="modal-task-due" class="modal-input" type="date">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">Criar</button>
      </div>
    `, () => {
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        const title    = document.getElementById('modal-task-title')?.value.trim();
        const desc     = document.getElementById('modal-task-desc')?.value.trim();
        const subjId   = document.getElementById('modal-task-subject')?.value;
        const priority = document.getElementById('modal-task-priority')?.value;
        const dueDate  = document.getElementById('modal-task-due')?.value || null;
        if (!title || !subjId) return;
        this.models.taskModel.create(subjId, title, { description:desc, priority, dueDate });
        this._closeModal();
        this._render();
      });
      document.getElementById('modal-task-title')?.focus();
    });
  }

  _showEventModal(date, existing = null) {
    const subjects = this.models.subjectModel.getAll();
    const types    = [{v:'study',l:'📖 Estudo'},{v:'review',l:'🔄 Revisão'},{v:'exam',l:'📝 Prova'},{v:'deadline',l:'⏰ Prazo'}];
    this._openModal(`
      <h2>${existing ? 'Editar Evento' : 'Novo Evento'}</h2>
      <input id="modal-ev-title" class="modal-input" type="text" placeholder="Título do evento" value="${existing?.title||''}">
      <div class="modal-row">
        <div>
          <label class="modal-label">Data</label>
          <input id="modal-ev-date" class="modal-input" type="date" value="${date||''}">
        </div>
        <div>
          <label class="modal-label">Tipo</label>
          <select id="modal-ev-type" class="select-input">
            ${types.map(t=>`<option value="${t.v}" ${existing?.type===t.v?'selected':''}>${t.l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="modal-label">Matéria</label>
          <select id="modal-ev-subject" class="select-input">
            <option value="">— Nenhuma —</option>
            ${subjects.map(s=>`<option value="${s.id}" ${existing?.subjectId===s.id?'selected':''}>${s.emoji} ${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <input id="modal-ev-duration" class="modal-input" type="number" placeholder="Duração (minutos)" value="${existing?.duration||60}" min="0">
      <textarea id="modal-ev-notes" class="modal-textarea" placeholder="Notas" rows="2">${existing?.notes||''}</textarea>
      <div class="modal-footer">
        ${existing ? `<button class="btn-danger" id="modal-delete">Excluir</button>` : ''}
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">${existing?'Salvar':'Criar'}</button>
      </div>
    `, () => {
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        const title     = document.getElementById('modal-ev-title')?.value.trim();
        const evDate    = document.getElementById('modal-ev-date')?.value;
        const type      = document.getElementById('modal-ev-type')?.value;
        const subjectId = document.getElementById('modal-ev-subject')?.value || null;
        const duration  = parseInt(document.getElementById('modal-ev-duration')?.value)||60;
        const notes     = document.getElementById('modal-ev-notes')?.value;
        if (!title || !evDate) return;
        const subject = subjectId ? this.models.subjectModel.getById(subjectId) : null;
        const typeColors = { study:'#8B5CF6', review:'#06B6D4', exam:'#EF4444', deadline:'#F59E0B' };
        const color = subject?.color || typeColors[type] || '#8B5CF6';
        if (existing) {
          this.models.calendarModel.update(existing.id, { title, date:evDate, type, subjectId, duration, notes, color });
        } else {
          this.models.calendarModel.create({ title, date:evDate, type, subjectId, duration, notes, color });
        }
        this._closeModal();
        if (this._route.view==='calendar') this._render();
      });
      document.getElementById('modal-delete')?.addEventListener('click', () => {
        if (existing && confirm('Excluir evento?')) {
          this.models.calendarModel.delete(existing.id);
          this._closeModal();
          if (this._route.view==='calendar') this._render();
        }
      });
      document.getElementById('modal-ev-title')?.focus();
    });
  }

  _showMindMapModal(subjectId) {
    this._openModal(`
      <h2>Novo Mapa</h2>
      <input id="modal-map-name" class="modal-input" type="text" placeholder="Nome do mapa" maxlength="60">
      <label class="modal-label">Tipo</label>
      <div class="map-type-options">
        <label class="type-option">
          <input type="radio" name="map-type" value="mind" checked>
          <span class="type-label">🧠 Mental<br><small>Hierárquico</small></span>
        </label>
        <label class="type-option">
          <input type="radio" name="map-type" value="concept">
          <span class="type-label">🔗 Conceitual<br><small>Conexões livres com rótulos</small></span>
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">Criar</button>
      </div>
    `, () => {
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        const name = document.getElementById('modal-map-name')?.value.trim();
        const type = document.querySelector('input[name="map-type"]:checked')?.value || 'mind';
        if (!name) return;
        const map = this.models.mindMapModel.create(subjectId, name, type);
        this._closeModal();
        this.navigate('mindmap', { mapId: map.id, subjectId });
      });
      document.getElementById('modal-map-name')?.focus();
    });
  }

  _showPickSubjectModal(files) {
    const subjects = this.models.subjectModel.getAll();
    if (subjects.length === 0) { alert('Crie uma matéria primeiro.'); return; }
    this._openModal(`
      <h2>Selecionar Matéria</h2>
      <p>Para qual matéria deseja enviar ${files.length} arquivo(s)?</p>
      <select id="modal-pick-subject" class="select-input">
        ${subjects.map(s=>`<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('')}
      </select>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">Enviar</button>
      </div>
    `, () => {
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        const subjectId = document.getElementById('modal-pick-subject')?.value;
        files.forEach(f => EventBus.emit('material:upload', { file:f, subjectId }));
        this._closeModal();
      });
    });
  }

  _showPreviewModal(meta, url) {
    let preview = '';
    if (meta.type === 'image') {
      preview = `<img src="${url}" class="preview-img" alt="${meta.name}">`;
    } else if (meta.type === 'audio') {
      preview = `<audio controls src="${url}" class="preview-audio"></audio>`;
    } else if (meta.type === 'video') {
      preview = `<video controls src="${url}" class="preview-video"></video>`;
    } else if (meta.type === 'pdf') {
      preview = `<iframe src="${url}" class="preview-pdf" title="${meta.name}"></iframe>`;
    } else {
      preview = `<p class="preview-unavail">Pré-visualização não disponível para este tipo de arquivo.</p>`;
    }
    this._openModal(`
      <div class="preview-header">
        <h2>${meta.name}</h2>
        <a href="${url}" download="${meta.name}" class="btn-primary">⬇ Baixar</a>
      </div>
      <div class="preview-body">${preview}</div>
      <div class="modal-footer"><button class="btn-ghost" id="modal-cancel">Fechar</button></div>
    `, null, 'modal-lg');
  }

  _openModal(html, onMount, extraClass = '') {
    const overlay = document.getElementById('modal-overlay');
    const box     = document.getElementById('modal-box');
    box.className = `modal-box ${extraClass}`;
    box.innerHTML = html;
    overlay.classList.remove('hidden');

    // Cancel / close
    box.querySelector('#modal-cancel')?.addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeModal(); }, { once: true });

    if (onMount) onMount();
  }

  _closeModal() {
    document.getElementById('modal-overlay')?.classList.add('hidden');
  }

  _startClock() {
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });
      const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

      // Update sidebar clock
      const sideClock = document.getElementById('sidebar-clock');
      if (sideClock) {
        const timeEl = sideClock.querySelector('.clock-time');
        const dateEl = sideClock.querySelector('.clock-date');
        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
      }

      // Update dashboard clock
      const dashClock = document.getElementById('dashboard-clock');
      if (dashClock) {
        const timeEl = dashClock.querySelector('.dash-clock-time');
        if (timeEl) timeEl.textContent = timeStr;
      }
    };

    // Run immediately and then every second
    update();
    setInterval(update, 1000);
  }

  _toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
}
