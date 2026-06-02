'use strict';

/**
 * AppController — Orquestrador central do padrão MVC.
 * Liga Models → Events → Views e gerencia navegação.
 */
class AppController {
  constructor(models, views) {
    this.models = models;
    this.views = views;

    this._route = { view: 'dashboard', subjectId: null, pageId: null, mapId: null };
    this._theme = Storage.get('theme') || 'dark';
    this._currentMindMapView = null;

    // Sons Ambientes
    this.ambientSound = new AmbientSoundSynthesizer();

    // Gravação de Notas por Voz
    this._mediaRecorder = null;
    this._audioChunks = [];
    this._isRecordingVoice = false;
    this._gcalEvents = [];

    Storage.initDB().catch(e => console.warn('IndexedDB não disponível:', e));
    this._applyTheme();
    this._bindEvents();
    this._startClock();
    this._render();

    // Handle Spotify OAuth callback
    if (window.location.search.includes('code=') && window.location.search.includes('state=spotify_auth')) {
      Spotify.handleCallback().then(success => {
        if (success) {
          this._toast('🟢 Spotify conectado com sucesso!');
          this.navigate('integrations');
        }
      });
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  navigate(view, opts = {}) {
    // Destroy mind map RAF loop before leaving
    if (this._currentMindMapView) { this._currentMindMapView.destroy(); this._currentMindMapView = null; }

    this._route = {
      view,
      subjectId: opts.subjectId || null,
      pageId: opts.pageId || null,
      mapId: opts.mapId || null,
      courseId: opts.courseId || null
    };
    this._render();
  }

  _render() {
    const { subjectModel, pageModel, taskModel, timerModel, calendarModel, materialModel, mindMapModel, courseModel, flashcardModel, quizModel, usefulLinksModel, topicModel } = this.models;
    const subjects = subjectModel.getAll();
    const pages = pageModel.getAll();
    const tasks = taskModel.getAll();
    const calendar = calendarModel.getAll();
    const materials = materialModel.getAll();
    const mindMaps = mindMapModel.getAll();
    const courses = courseModel.getAll();
    const flashcards = flashcardModel.getAll();
    const quizzes = quizModel.getAll();
    const usefulLinks = usefulLinksModel.getAll();
    const schedule = Storage.get('studySchedule') || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

    // Sidebar always visible
    this.views.sidebar.render(subjects, pages, tasks, mindMaps, materials, this._route, schedule, courses, usefulLinks);

    // Show correct view
    const allViews = ['dashboard', 'editor', 'tasks', 'calendar', 'materials', 'mindmap', 'timer', 'platform-browser', 'flashcards', 'quizzes', 'notes', 'integrations', 'discord-chat', 'topics', 'resources'];
    allViews.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle('hidden', v !== this._route.view);
    });

    const r = this._route;
    switch (r.view) {
      case 'dashboard': {
        this.views.dashboard.render(subjects, pages, tasks, calendar, {}, timerModel.session, [], [], timerModel._state());
        break;
      }

      case 'editor': {
        const page = r.pageId ? pageModel.getById(r.pageId) : null;
        const subject = page ? subjectModel.getById(page.subjectId) : null;
        if (page) this.views.editor.render(page, subject);
        break;
      }

      case 'notes': {
        const subject = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? pageModel.getBySubject(r.subjectId) : pages;
        this.views.notes.render(filtered, subject, subjects);
        break;
      }

      case 'tasks': {
        const subject = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? taskModel.getBySubject(r.subjectId) : tasks;
        this.views.tasks.render(filtered, subject, subjects);
        break;
      }

      case 'topics': {
        const subject = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? topicModel.getBySubject(r.subjectId) : (topicModel ? topicModel.getAll() : []);
        this.views.topics.render(filtered, subject, subjects);
        break;
      }

      case 'calendar':
        this._renderCalendarView();
        break;

      case 'materials': {
        const subject = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? materialModel.getBySubject(r.subjectId) : materials;
        this.views.materials.render(filtered, subject, subjects);
        break;
      }

      case 'mindmap': {
        const map = r.mapId ? mindMapModel.getById(r.mapId) : null;
        const subject = map ? subjectModel.getById(map.subjectId) : null;
        if (map) {
          this.views.mindmap.render(map, subject);
          this._currentMindMapView = this.views.mindmap;
        }
        break;
      }

      case 'timer':
        this._renderTimer();
        break;

      case 'resources': {
        this.views.resources.render(subjects, schedule, courses, usefulLinks);
        break;
      }

      case 'platform-browser': {
        // We get platform parameters from navigate (saved in route)
        const course = r.courseId ? courseModel.getById(r.courseId) : null;
        if (course) {
          this.views.platformBrowser.render(course.name, course.url);
        } else {
          this.navigate('dashboard');
        }
        break;
      }

      case 'flashcards': {
        const subject = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? flashcardModel.getBySubject(r.subjectId) : [];
        this.views.flashcard.render(filtered, subject, subjects);
        break;
      }

      case 'quizzes': {
        const subject = r.subjectId ? subjectModel.getById(r.subjectId) : null;
        const filtered = r.subjectId ? quizModel.getBySubject(r.subjectId) : quizzes;
        const subMats = r.subjectId ? materialModel.getBySubject(r.subjectId) : [];
        this.views.quiz.render(filtered, subject, subjects, subMats);
        break;
      }

      case 'integrations': {
        this.views.integrations.render();
        break;
      }

      case 'discord-chat': {
        this.views.discordChat.render();
        break;
      }
    }
  }

  // ── Event Bindings ─────────────────────────────────────────────────────────

  _bindEvents() {
    const { subjectModel, pageModel, taskModel, timerModel, calendarModel, materialModel, mindMapModel } = this.models;

    // ─ Navigation ─
    EventBus.on('navigate', ({ view, pageId, subjectId, mapId }) => {
      this.navigate(view, { pageId, subjectId, mapId });
    });

    EventBus.on('ui:renderSidebar', () => this._renderSidebar());

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
      if (this.models.topicModel) this.models.topicModel.deleteBySubject(subjectId);
      subjectModel.delete(subjectId);
      this.navigate('dashboard');
    });

    EventBus.on('subjects:updated', () => this._render());

    // ─ Pages ─
    EventBus.on('ui:newPage', ({ subjectId }) => {
      const page = pageModel.create(subjectId);
      this.navigate('editor', { pageId: page.id, subjectId });

      if (Discord.isEnabled('notes')) {
        const s = subjectId ? subjectModel.getById(subjectId) : null;
        Discord.sendEmbed({
          title: '📄 Novo Caderno de Anotações Criado!',
          description: `Um novo espaço de anotações foi iniciado para organizar os estudos. ✍️`,
          color: Discord.hexToDecimal(s?.color || '#06B6D4'),
          fields: [
            s ? { name: 'Matéria', value: `${s.emoji} ${s.name}`, inline: true } : null,
            { name: 'Título Inicial', value: page.title || 'Sem título', inline: true }
          ].filter(Boolean),
          footer: { text: 'EstudaAí' }
        }).catch(err => console.error(err));
      }
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
      const subjectId = page?.subjectId;
      pageModel.delete(pageId);
      if (subjectId) {
        this.navigate('notes', { subjectId });
      } else {
        this.navigate('dashboard');
      }
    });

    EventBus.on('pages:updated', () => this._renderSidebar());

    // ─ Tasks ─
    EventBus.on('ui:newTask', ({ subjectId }) => this._showTaskModal(subjectId));

    EventBus.on('task:cycleStatus', ({ taskId }) => {
      const t = taskModel.getById(taskId);
      if (!t) return;
      const cycle = { todo: 'doing', doing: 'done', done: 'todo' };
      const newStatus = cycle[t.status];
      taskModel.setStatus(taskId, newStatus);
      this._render();

      if (newStatus === 'done' && Discord.isEnabled('task')) {
        const s = t.subjectId ? subjectModel.getById(t.subjectId) : null;
        Discord.sendEmbed({
          title: '✅ Tarefa Concluída!',
          description: `A tarefa **"${t.title}"** foi concluída com sucesso! 🎉`,
          color: Discord.hexToDecimal(s?.color || '#10B981'),
          fields: [
            s ? { name: 'Matéria', value: `${s.emoji} ${s.name}`, inline: true } : null,
            t.description ? { name: 'Descrição', value: t.description, inline: false } : null
          ].filter(Boolean),
          footer: { text: 'EstudaAí' }
        }).catch(err => console.error(err));
      }
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

    // ─ Topics ─
    EventBus.on('topic:create', ({ subjectId, name }) => {
      this.models.topicModel.create(subjectId, name);
      this._toast('✅ Assunto adicionado!');
      this._render();
    });

    EventBus.on('topic:toggle', ({ topicId }) => {
      this.models.topicModel.toggleStudied(topicId);
      this._render();
    });

    EventBus.on('topic:delete', ({ topicId }) => {
      this.models.topicModel.delete(topicId);
      this._toast('🗑️ Assunto excluído.');
      this._render();
    });

    EventBus.on('topics:updated', () => this._render());

    EventBus.on('ui:pickSubjectForTopic', ({ name }) => {
      const subjects = this.models.subjectModel.getAll();
      if (subjects.length === 0) {
        alert('Crie uma matéria na barra lateral primeiro.');
        return;
      }
      this._openModal(`
        <h2>Selecionar Matéria</h2>
        <p>Para qual matéria você quer adicionar este assunto?</p>
        <select id="modal-pick-subject-topic" class="select-input">
          ${subjects.map(s => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('')}
        </select>
        <div class="modal-footer">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="modal-confirm-topic-subj">Adicionar</button>
        </div>
      `, () => {
        document.getElementById('modal-confirm-topic-subj')?.addEventListener('click', () => {
          const subjectId = document.getElementById('modal-pick-subject-topic')?.value;
          if (subjectId) {
            this.models.topicModel.create(subjectId, name);
            this._toast('✅ Assunto adicionado!');
          }
          this._closeModal();
          this._render();
        });
      });
    });

    // ─ Calendar ─
    EventBus.on('ui:newEvent', ({ date }) => this._showEventModal(date));
    EventBus.on('ui:editEvent', ({ eventId }) => {
      const ev = calendarModel.getById(eventId);
      if (ev) this._showEventModal(ev.date, ev);
    });
    EventBus.on('calendar:updated', () => { if (this._route.view === 'calendar') this._render(); });

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
      if (meta.type === 'drive') {
        window.open(meta.driveUrl, '_blank');
        return;
      }
      const url = await materialModel.getBlobURL(materialId);
      if (!url) { alert('Arquivo não disponível.'); return; }
      this._showPreviewModal(meta, url);
    });

    EventBus.on('material:download', async ({ materialId }) => {
      const meta = materialModel.getById(materialId);
      if (!meta) return;
      if (meta.type === 'drive') {
        window.open(meta.driveUrl, '_blank');
        return;
      }
      const url = await materialModel.getBlobURL(materialId);
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

    EventBus.on('ui:openGDrivePicker', ({ subjectId }) => {
      this._showGDrivePickerModal(subjectId);
    });

    // ─ Mind Maps ─
    EventBus.on('ui:newMindMap', ({ subjectId }) => this._showMindMapModal(subjectId));

    EventBus.on('mindmap:save', ({ mapId, nodes, edges }) => {
      mindMapModel.saveGraph(mapId, nodes, edges);
    });

    EventBus.on('mindmaps:updated', () => this._renderSidebar());

    // ─ Timer ─
    const updateDashTimer = () => {
      if (this._route.view === 'dashboard') {
        this.views.dashboard.updateTimer(this.models.timerModel._state());
      }
    };

    EventBus.on('timer:toggle', () => { this.models.timerModel.toggle(); this._renderTimer(); updateDashTimer(); });
    EventBus.on('timer:reset', () => { this.models.timerModel.reset(); this._renderTimer(); updateDashTimer(); });
    EventBus.on('timer:skip', () => { this.models.timerModel._complete(); this._renderTimer(); updateDashTimer(); });
    EventBus.on('timer:setMode', (mode) => { this.models.timerModel.setMode(mode); this._renderTimer(); updateDashTimer(); });
    EventBus.on('timer:tick', () => { if (this._route.view === 'timer') this._renderTimer(); updateDashTimer(); });
    EventBus.on('timer:setFocusTime', (minutes) => {
      this.models.timerModel.setFocusTime(minutes);
      this._toast(`Tempo de foco alterado para ${minutes} minutos!`);
      if (this._route.view === 'timer') this._renderTimer();
      updateDashTimer();
    });
    EventBus.on('timer:complete', ({ mode, session }) => {
      const msg = mode === 'focus' ? '✅ Sessão de foco concluída!' : '🎯 Hora de focar!';
      this._toast(msg);
      if (this._route.view === 'timer') this._renderTimer();
      updateDashTimer();

      if (mode === 'focus' && Discord.isEnabled('pomodoro')) {
        Discord.sendEmbed({
          title: '⏱️ Ciclo Pomodoro Finalizado!',
          description: `Mais uma sessão de foco concluída com sucesso! Continue assim. 🚀`,
          color: Discord.hexToDecimal('#EC4899'),
          fields: [
            { name: 'Duração', value: '25 minutos', inline: true },
            { name: 'Total de Ciclos', value: `${session} sessões`, inline: true }
          ],
          footer: { text: 'EstudaAí' }
        }).catch(err => console.error(err));
      }
    });

    EventBus.on('ui:resetFocusSessions', () => {
      this.models.timerModel.resetFocusSessions();
      this._toast('🔄 Tempo focado zerado com sucesso!');
      this._render();
    });

    // ─ Study Schedule ─
    EventBus.on('ui:addScheduleSubject', ({ day }) => {
      const subjects = subjectModel.getAll();
      if (subjects.length === 0) {
        alert('Crie uma matéria na barra lateral primeiro para poder agendá-la.');
        return;
      }

      this._openModal(`
        <h2>Agendar Matéria</h2>
        <p>Selecione a matéria para estudar neste dia:</p>
        <select id="modal-pick-schedule-subject" class="select-input">
          ${subjects.map(s => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('')}
        </select>
        <div class="modal-footer">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="modal-confirm">Adicionar</button>
        </div>
      `, () => {
        document.getElementById('modal-confirm')?.addEventListener('click', () => {
          const subjectId = document.getElementById('modal-pick-schedule-subject')?.value;
          if (subjectId) {
            const sched = Storage.get('studySchedule') || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
            if (!sched[day].includes(subjectId)) {
              sched[day].push(subjectId);
              Storage.set('studySchedule', sched);
              this._toast('Matéria agendada com sucesso!');
            }
          }
          this._closeModal();
          this._render();
        });
      });
    });

    EventBus.on('ui:removeScheduleSubject', ({ day, subjectId }) => {
      const sched = Storage.get('studySchedule') || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
      sched[day] = sched[day].filter(id => id !== subjectId);
      Storage.set('studySchedule', sched);
      this._toast('Matéria removida do cronograma.');
      this._render();
    });

    // ── NotebookLM MindMap Integration ──────────────────────────────────────

    EventBus.on('ui:openNotebookLMMindMapModal', ({ map }) => {
      const subject = this.models.subjectModel.getById(map.subjectId);
      const subjectName = subject?.name || 'Estudo';

      this._openModal(`
        <h2 style="display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;flex-shrink:0;"><rect width="24" height="24" rx="4" fill="#1a73e8"/><path d="M6 8h12M6 12h8M6 16h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
          Gerar Mapa Mental com NotebookLM
        </h2>
        <p style="font-size:0.8rem;color:var(--text-muted);margin:2px 0 18px 0;line-height:1.5;">
          Gere a estrutura do mapa no NotebookLM e importe de volta em JSON.
        </p>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#1a73e8 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #1a73e8;">
            <span style="font-size:1.1rem;font-weight:700;color:#1a73e8;">1</span>
            <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Defina o tema do mapa mental</span>
          </div>
          <div>
            <label class="modal-label">Tema / Assunto</label>
            <input id="nlm-mm-theme" class="modal-input" type="text"
              placeholder="Ex: Fotossíntese, Revolução Francesa..."
              style="width:100%;" value="${map.name}">
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#34a853 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #34a853;">
            <span style="font-size:1.1rem;font-weight:700;color:#34a853;">2</span>
            <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Abra o NotebookLM e cole o prompt abaixo</span>
          </div>
          <div style="position:relative;">
            <label class="modal-label">Prompt pronto para copiar 📋</label>
            <textarea id="nlm-mm-prompt-text" class="modal-input" rows="8" readonly
              style="font-size:0.75rem;font-family:monospace;resize:none;width:100%;color:var(--text-muted);line-height:1.5;"></textarea>
            <button id="nlm-mm-copy-prompt" style="position:absolute;top:28px;right:8px;padding:4px 10px;font-size:0.72rem;border:1px solid var(--border);background:var(--bg-card);border-radius:var(--radius-sm);cursor:pointer;color:var(--text);">Copiar</button>
          </div>
          <a href="https://notebooklm.google.com" target="_blank" rel="noopener"
            style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;background:linear-gradient(135deg,#1a73e8,#34a853);color:#fff;border-radius:var(--radius-sm);font-weight:600;font-size:0.85rem;text-decoration:none;">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><polyline points="15 3 21 3 21 9" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><line x1="10" y1="14" x2="21" y2="3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
            Abrir NotebookLM ↗
          </a>
        </div>
        <div class="modal-footer" style="margin-top:20px;">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="nlm-mm-next-step" style="background:linear-gradient(135deg,#1a73e8,#34a853);">Já gerei o mapa → Importar</button>
        </div>
      `, () => {
        const updatePrompt = () => {
          const theme = document.getElementById('nlm-mm-theme')?.value.trim() || map.name;
          const ta = document.getElementById('nlm-mm-prompt-text');
          if (ta) ta.value = this._buildNotebookLMMindMapPrompt(subjectName, theme, map.type);
        };
        updatePrompt();
        document.getElementById('nlm-mm-theme')?.addEventListener('input', updatePrompt);
        document.getElementById('nlm-mm-copy-prompt')?.addEventListener('click', () => {
          const ta = document.getElementById('nlm-mm-prompt-text');
          if (ta) {
            navigator.clipboard.writeText(ta.value).then(() => {
              const btn = document.getElementById('nlm-mm-copy-prompt');
              if (btn) { btn.textContent = '✓ Copiado!'; btn.style.color = '#10B981'; }
              setTimeout(() => { if (btn) { btn.textContent = 'Copiar'; btn.style.color = ''; } }, 2000);
            }).catch(() => { ta.select(); document.execCommand('copy'); });
          }
        });
        document.getElementById('nlm-mm-next-step')?.addEventListener('click', () => {
          const theme = document.getElementById('nlm-mm-theme')?.value.trim() || map.name;
          this._closeModal();
          setTimeout(() => EventBus.emit('ui:openNotebookLMMindMapImportModal', { map, theme }), 120);
        });
      });
    });

    EventBus.on('ui:openNotebookLMMindMapImportModal', ({ map, theme }) => {
      this._openModal(`
        <h2 style="display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;flex-shrink:0;"><rect width="24" height="24" rx="4" fill="#1a73e8"/><path d="M6 8h12M6 12h8M6 16h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
          Importar Mapa Mental do NotebookLM
        </h2>
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#34a853 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #34a853;margin-bottom:12px;">
          <span style="font-size:1.1rem;font-weight:700;color:#34a853;">3</span>
          <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Cole o JSON gerado pelo NotebookLM abaixo</span>
        </div>
        <textarea id="nlm-mm-import-json" class="modal-input" rows="10"
          placeholder='Cole aqui o JSON gerado pelo NotebookLM...'
          style="font-size:0.75rem;font-family:monospace;resize:vertical;width:100%;min-height:180px;line-height:1.5;"></textarea>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px dashed var(--border);">
          <strong style="color:var(--text);">Formato esperado:</strong><br>
          <code style="font-size:0.7rem;">{"nodes":[{"id":"1","text":"Nó central","x":400,"y":300,"color":"#8B5CF6"}],"edges":[{"id":"e1","from":"1","to":"2","label":""}]}</code>
        </div>
        <div class="modal-footer" style="margin-top:16px;">
          <button class="btn-ghost" id="nlm-mm-back-step">← Voltar</button>
          <button class="btn-primary" id="nlm-mm-import-btn" style="background:linear-gradient(135deg,#1a73e8,#34a853);">✅ Importar Mapa</button>
        </div>
      `, () => {
        document.getElementById('nlm-mm-import-btn')?.addEventListener('click', () => {
          const raw = document.getElementById('nlm-mm-import-json')?.value.trim();
          if (!raw) { alert('Cole o JSON antes de importar.'); return; }
          EventBus.emit('ui:importNotebookLMMindMap', { mapId: map.id, raw });
        });
        document.getElementById('nlm-mm-back-step')?.addEventListener('click', () => {
          this._closeModal();
          setTimeout(() => EventBus.emit('ui:openNotebookLMMindMapModal', { map }), 120);
        });
        document.getElementById('nlm-mm-import-json')?.focus();
      });
    });

    EventBus.on('ui:importNotebookLMMindMap', ({ mapId, raw }) => {
      const { mindMapModel } = this.models;
      let data = null;
      try {
        data = JSON.parse(raw);
        if (!Array.isArray(data.nodes) || data.nodes.length === 0) throw new Error('nodes ausente ou vazio');
      } catch (e) {
        alert('❌ JSON inválido.\n\nCopie o bloco JSON completo (com { } e a chave "nodes").\n\nDica: peça ao NotebookLM "responder apenas com o JSON, sem texto adicional".');
        return;
      }
      const nodes = data.nodes.map((n, i) => ({
        id: n.id || String(i + 1),
        text: n.text || n.label || 'Nó',
        x: typeof n.x === 'number' ? n.x : 200 + (i % 5) * 180,
        y: typeof n.y === 'number' ? n.y : 150 + Math.floor(i / 5) * 120,
        color: n.color || '#8B5CF6',
        width: n.width || 130,
        height: n.height || 44
      }));
      const edges = (data.edges || []).map((e, i) => ({
        id: e.id || `e${i}`,
        from: e.from,
        to: e.to,
        label: e.label || ''
      })).filter(e => e.from && e.to);
      mindMapModel.saveGraph(mapId, nodes, edges);
      this._closeModal();
      this._toast(`✅ Mapa importado com ${nodes.length} nós!`);
      this._render();
    });

    EventBus.on('ui:deleteMindMap', ({ mapId }) => {
      const { mindMapModel } = this.models;
      const map = mindMapModel.getById(mapId);
      if (!map) return;
      if (confirm(`Tem certeza que deseja excluir permanentemente o mapa mental "${map.name}"?`)) {
        mindMapModel.delete(mapId);
        this._toast('✅ Mapa mental excluído com sucesso.');
        this._navigate('dashboard');
      }
    });

    EventBus.on('ui:addCoursePlatform', () => {
      const { courseModel } = this.models;
      this._openModal(`
        <h2>Cadastrar Plataforma de Cursos 💻</h2>
        <div style="display:flex; flex-direction:column; gap:16px; margin: 16px 0;">
          <div>
            <label class="modal-label">Nome da Plataforma</label>
            <input id="modal-course-name" class="modal-input" type="text" placeholder="Ex: Alura, Udemy, Coursera, Hotmart..." maxlength="50" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">Link de Acesso (URL)</label>
            <input id="modal-course-url" class="modal-input" type="text" placeholder="Ex: https://cursos.alura.com.br" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">Emoji / Ícone Representativo</label>
            <input id="modal-course-emoji" class="modal-input" type="text" placeholder="Ex: 💻" value="💻" maxlength="5" style="width:100px;">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="modal-confirm-course">Cadastrar Plataforma</button>
        </div>
      `, () => {
        document.getElementById('modal-confirm-course')?.addEventListener('click', () => {
          const name = document.getElementById('modal-course-name')?.value.trim();
          const url = document.getElementById('modal-course-url')?.value.trim();
          const emoji = document.getElementById('modal-course-emoji')?.value.trim() || '💻';

          if (!name || !url) {
            alert('Por favor, preencha o Nome e a URL da plataforma.');
            return;
          }

          courseModel.create(name, url, emoji);
          this._closeModal();
          this._toast('✅ Plataforma cadastrada com sucesso!');
          this._render();
        });
        document.getElementById('modal-course-name')?.focus();
      });
    });

    EventBus.on('ui:deleteCoursePlatform', ({ courseId }) => {
      const { courseModel } = this.models;
      const course = courseModel.getById(courseId);
      if (!course) return;
      if (confirm(`Deseja remover a plataforma "${course.name}"?`)) {
        courseModel.delete(courseId);
        this._toast('🗑️ Plataforma removida com sucesso.');
        this._render();
      }
    });

    EventBus.on('ui:openCoursePlatform', ({ courseId }) => {
      this.navigate('platform-browser', { courseId });
    });

    // ― Links Úteis ―
    EventBus.on('ui:addUsefulLink', () => {
      const { usefulLinksModel } = this.models;
      this._openModal(`
        <h2>Adicionar Link Útil 🔗</h2>
        <div style="display:flex; flex-direction:column; gap:14px; margin: 16px 0;">
          <div>
            <label class="modal-label">Título do Link</label>
            <input id="modal-link-title" class="modal-input" type="text" placeholder="Ex: NotebookLM, Stack Overflow, Artigo..." maxlength="60" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">URL</label>
            <input id="modal-link-url" class="modal-input" type="text" placeholder="Ex: https://notebooklm.google.com" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">Descrição (opcional)</label>
            <input id="modal-link-desc" class="modal-input" type="text" placeholder="Breve descrição do link..." maxlength="80" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">Emoji / Ícone</label>
            <input id="modal-link-emoji" class="modal-input" type="text" placeholder="Ex: 🔗" value="🔗" maxlength="5" style="width:80px;">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="modal-confirm-link">Salvar Link</button>
        </div>
      `, () => {
        document.getElementById('modal-confirm-link')?.addEventListener('click', () => {
          const title = document.getElementById('modal-link-title')?.value.trim();
          const url = document.getElementById('modal-link-url')?.value.trim();
          const desc = document.getElementById('modal-link-desc')?.value.trim();
          const emoji = document.getElementById('modal-link-emoji')?.value.trim() || '🔗';
          if (!title || !url) {
            alert('Por favor, preencha o Título e a URL do link.');
            return;
          }
          usefulLinksModel.create(title, url, emoji, desc);
          this._closeModal();
          this._toast('✅ Link adicionado com sucesso!');
          this._render();
        });
        document.getElementById('modal-link-title')?.focus();
      });
    });

    EventBus.on('ui:editUsefulLink', ({ linkId }) => {
      const { usefulLinksModel } = this.models;
      const link = usefulLinksModel.getById(linkId);
      if (!link) return;

      this._openModal(`
        <h2>Editar Link ✏️</h2>
        <div style="display:flex; flex-direction:column; gap:14px; margin: 16px 0;">
          <div>
            <label class="modal-label">Título do Link</label>
            <input id="modal-edit-link-title" class="modal-input" type="text" value="${link.title}" maxlength="60" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">URL</label>
            <input id="modal-edit-link-url" class="modal-input" type="text" value="${link.url}" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">Descrição (opcional)</label>
            <input id="modal-edit-link-desc" class="modal-input" type="text" value="${link.description || ''}" maxlength="80" style="width:100%;">
          </div>
          <div>
            <label class="modal-label">Emoji / Ícone</label>
            <input id="modal-edit-link-emoji" class="modal-input" type="text" value="${link.emoji}" maxlength="5" style="width:80px;">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="modal-confirm-edit-link">Salvar Alterações</button>
        </div>
      `, () => {
        document.getElementById('modal-confirm-edit-link')?.addEventListener('click', () => {
          const title = document.getElementById('modal-edit-link-title')?.value.trim();
          const url = document.getElementById('modal-edit-link-url')?.value.trim();
          const desc = document.getElementById('modal-edit-link-desc')?.value.trim();
          const emoji = document.getElementById('modal-edit-link-emoji')?.value.trim() || '🔗';
          if (!title || !url) {
            alert('Por favor, preencha o Título e a URL do link.');
            return;
          }
          usefulLinksModel.update(linkId, { title, url, emoji, description: desc });
          this._closeModal();
          this._toast('✅ Link atualizado com sucesso!');
          this._render();
        });
        document.getElementById('modal-edit-link-title')?.focus();
      });
    });

    EventBus.on('ui:deleteUsefulLink', ({ linkId }) => {
      const { usefulLinksModel } = this.models;
      const link = usefulLinksModel.getById(linkId);
      if (!link) return;
      if (confirm(`Remover o link "${link.title}"?`)) {
        usefulLinksModel.delete(linkId);
        this._toast('🗑️ Link removido.');
        this._render();
      }
    });

    EventBus.on('usefulLinks:updated', () => this._render());

    // ─ Sons Ambientes ─
    EventBus.on('sound:toggle', ({ type }) => {
      const isPlaying = this.ambientSound.toggle(type);
      this.views.timer._playingSounds[type] = isPlaying;
      this.views.timer.render(this.models.timerModel._state());
    });

    EventBus.on('sound:volume', ({ type, value }) => {
      this.ambientSound.setVolume(type, value);
      this.views.timer._soundVolumes[type] = parseFloat(value);
    });

    // ─ Flashcards ─
    EventBus.on('ui:createFlashcard', ({ subjectId, front, back }) => {
      const { flashcardModel } = this.models;
      flashcardModel.create(subjectId, front, back);
      this._toast('✅ Flashcard adicionado com sucesso!');
      this._render();
    });

    EventBus.on('ui:deleteFlashcard', ({ id, subjectId }) => {
      const { flashcardModel } = this.models;
      flashcardModel.delete(id);
      this._toast('🗑️ Flashcard excluído com sucesso.');
      this._render();
    });

    EventBus.on('ui:scoreFlashcard', ({ cardId, isCorrect, subjectId }) => {
      const { flashcardModel } = this.models;
      flashcardModel.score(cardId, isCorrect);
      this._toast(isCorrect ? '🟢 Memorizado! Avançando caixa Leitner.' : '❌ Ops! Retornando para a caixa #1.');
      this._render();
    });

    // ── NotebookLM Flashcard Integration ───────────────────────────────────

    EventBus.on('ui:openNotebookLMFlashcardModal', ({ subjectId }) => {
      const subject = this.models.subjectModel.getById(subjectId);
      const subjectName = subject?.name || 'Estudo';

      this._openModal(`
        <h2 style="display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;flex-shrink:0;"><rect width="24" height="24" rx="4" fill="#1a73e8"/><path d="M6 8h12M6 12h8M6 16h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
          Gerar Flashcards com NotebookLM
        </h2>
        <p style="font-size:0.8rem;color:var(--text-muted);margin:2px 0 18px 0;line-height:1.5;">
          Gere os flashcards no NotebookLM e importe de volta em JSON.
        </p>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#1a73e8 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #1a73e8;">
            <span style="font-size:1.1rem;font-weight:700;color:#1a73e8;">1</span>
            <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Defina o tema e a quantidade de cards</span>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-end;">
            <div style="flex:1;">
              <label class="modal-label">Tema / Assunto</label>
              <input id="nlm-fc-theme" class="modal-input" type="text"
                placeholder="Ex: Álgebra Linear, Mitose, Guerra Fria..."
                style="width:100%;" value="${subjectName}">
            </div>
            <div>
              <label class="modal-label">Quantidade</label>
              <select id="nlm-fc-qty" class="modal-input" style="width:90px;">
                <option value="5">5 cards</option>
                <option value="10" selected>10 cards</option>
                <option value="15">15 cards</option>
                <option value="20">20 cards</option>
              </select>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#34a853 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #34a853;">
            <span style="font-size:1.1rem;font-weight:700;color:#34a853;">2</span>
            <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Abra o NotebookLM e cole o prompt abaixo</span>
          </div>
          <div style="position:relative;">
            <label class="modal-label">Prompt pronto para copiar 📋</label>
            <textarea id="nlm-fc-prompt-text" class="modal-input" rows="7" readonly
              style="font-size:0.75rem;font-family:monospace;resize:none;width:100%;color:var(--text-muted);line-height:1.5;"></textarea>
            <button id="nlm-fc-copy-prompt" style="position:absolute;top:28px;right:8px;padding:4px 10px;font-size:0.72rem;border:1px solid var(--border);background:var(--bg-card);border-radius:var(--radius-sm);cursor:pointer;color:var(--text);">Copiar</button>
          </div>
          <a href="https://notebooklm.google.com" target="_blank" rel="noopener"
            style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;background:linear-gradient(135deg,#1a73e8,#34a853);color:#fff;border-radius:var(--radius-sm);font-weight:600;font-size:0.85rem;text-decoration:none;">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><polyline points="15 3 21 3 21 9" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><line x1="10" y1="14" x2="21" y2="3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
            Abrir NotebookLM ↗
          </a>
        </div>
        <div class="modal-footer" style="margin-top:20px;">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="nlm-fc-next-step" style="background:linear-gradient(135deg,#1a73e8,#34a853);">Já gerei os cards → Importar</button>
        </div>
      `, () => {
        const updatePrompt = () => {
          const theme = document.getElementById('nlm-fc-theme')?.value.trim() || subjectName;
          const qty = parseInt(document.getElementById('nlm-fc-qty')?.value || '10', 10);
          const ta = document.getElementById('nlm-fc-prompt-text');
          if (ta) ta.value = this._buildNotebookLMFlashcardPrompt(subjectName, theme, qty);
        };
        updatePrompt();
        document.getElementById('nlm-fc-theme')?.addEventListener('input', updatePrompt);
        document.getElementById('nlm-fc-qty')?.addEventListener('change', updatePrompt);

        document.getElementById('nlm-fc-copy-prompt')?.addEventListener('click', () => {
          const ta = document.getElementById('nlm-fc-prompt-text');
          if (ta) {
            navigator.clipboard.writeText(ta.value).then(() => {
              const btn = document.getElementById('nlm-fc-copy-prompt');
              if (btn) { btn.textContent = '✓ Copiado!'; btn.style.color = '#10B981'; }
              setTimeout(() => { if (btn) { btn.textContent = 'Copiar'; btn.style.color = ''; } }, 2000);
            }).catch(() => { ta.select(); document.execCommand('copy'); });
          }
        });

        document.getElementById('nlm-fc-next-step')?.addEventListener('click', () => {
          const theme = document.getElementById('nlm-fc-theme')?.value.trim() || subjectName;
          const qty = parseInt(document.getElementById('nlm-fc-qty')?.value || '10', 10);
          this._closeModal();
          setTimeout(() => EventBus.emit('ui:openNotebookLMFlashcardImportModal', { subjectId, theme, qty }), 120);
        });
      });
    });

    EventBus.on('ui:openNotebookLMFlashcardImportModal', ({ subjectId, theme, qty }) => {
      this._openModal(`
        <h2 style="display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;flex-shrink:0;"><rect width="24" height="24" rx="4" fill="#1a73e8"/><path d="M6 8h12M6 12h8M6 16h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
          Importar Flashcards do NotebookLM
        </h2>
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#34a853 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #34a853;margin-bottom:12px;">
          <span style="font-size:1.1rem;font-weight:700;color:#34a853;">3</span>
          <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Cole o JSON gerado pelo NotebookLM abaixo</span>
        </div>
        <textarea id="nlm-fc-import-json" class="modal-input" rows="10"
          placeholder='Cole aqui o JSON gerado pelo NotebookLM...'
          style="font-size:0.75rem;font-family:monospace;resize:vertical;width:100%;min-height:180px;line-height:1.5;"></textarea>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px dashed var(--border);">
          <strong style="color:var(--text);">Formato esperado:</strong><br>
          <code style="font-size:0.7rem;">{"cards":[{"front":"Pergunta?","back":"Resposta completa."}]}</code>
        </div>
        <div class="modal-footer" style="margin-top:16px;">
          <button class="btn-ghost" id="nlm-fc-back-step">← Voltar</button>
          <button class="btn-primary" id="nlm-fc-import-btn" style="background:linear-gradient(135deg,#1a73e8,#34a853);">✅ Importar Flashcards</button>
        </div>
      `, () => {
        document.getElementById('nlm-fc-import-btn')?.addEventListener('click', () => {
          const raw = document.getElementById('nlm-fc-import-json')?.value.trim();
          if (!raw) { alert('Cole o JSON antes de importar.'); return; }
          EventBus.emit('ui:importNotebookLMFlashcards', { subjectId, raw });
        });
        document.getElementById('nlm-fc-back-step')?.addEventListener('click', () => {
          this._closeModal();
          setTimeout(() => EventBus.emit('ui:openNotebookLMFlashcardModal', { subjectId }), 120);
        });
        document.getElementById('nlm-fc-import-json')?.focus();
      });
    });

    EventBus.on('ui:importNotebookLMFlashcards', ({ subjectId, raw }) => {
      const { flashcardModel } = this.models;
      let data = null;
      try {
        data = JSON.parse(raw);
        if (!Array.isArray(data.cards) || data.cards.length === 0) throw new Error('cards ausente ou vazio');
      } catch (e) {
        alert('❌ JSON inválido.\n\nCopie o bloco JSON completo (com { } e a chave "cards").\n\nDica: peça ao NotebookLM "responder apenas com o JSON, sem texto adicional".');
        return;
      }
      const valid = data.cards.filter(c => c && typeof c.front === 'string' && typeof c.back === 'string' && c.front && c.back);
      if (valid.length === 0) {
        alert('Nenhum card válido encontrado. Verifique se cada item tem os campos "front" e "back".');
        return;
      }
      valid.forEach(c => flashcardModel.create(subjectId, c.front.trim(), c.back.trim()));
      this._closeModal();
      this._toast(`✅ ${valid.length} flashcards importados com sucesso!`);
      this._render();
    });

    // ─ Simulados & Quizzes ─
    EventBus.on('ui:openModalQuiz', ({ html, callback }) => {
      this._openModal(html, callback);
    });

    EventBus.on('ui:startQuizSession', ({ quizId, subjectId }) => {
      const { quizModel } = this.models;
      const quiz = quizModel.getById(quizId);
      if (quiz) {
        this.views.quiz.startSession(quiz);
        this.navigate('quizzes', { subjectId });
      }
    });

    EventBus.on('ui:deleteQuiz', ({ quizId, subjectId }) => {
      const { quizModel } = this.models;
      quizModel.delete(quizId);
      this._toast('🗑️ Simulado excluído.');
      this._render();
    });

    EventBus.on('ui:saveQuizScore', ({ quizId, score, subjectId }) => {
      const { quizModel } = this.models;
      quizModel.saveScore(quizId, score);
    });

    // ── NotebookLM Quiz Integration ──────────────────────────────────────────

    EventBus.on('ui:openNotebookLMQuizModal', ({ subject }) => {
      // Etapa 1: Exibir prompt copiável + link para NotebookLM
      this._openModal(`
        <h2 style="display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;flex-shrink:0;"><rect width="24" height="24" rx="4" fill="#1a73e8"/><path d="M6 8h12M6 12h8M6 16h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
          Gerar Simulado com NotebookLM
        </h2>
        <p style="font-size:0.8rem;color:var(--text-muted);margin:2px 0 18px 0;line-height:1.5;">
          O NotebookLM é um assistente de estudos do Google. Siga os passos abaixo para gerar um simulado personalizado.
        </p>

        <!-- PASSO 1 -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#1a73e8 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #1a73e8;">
            <span style="font-size:1.1rem;font-weight:700;color:#1a73e8;">1</span>
            <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Defina o tema do simulado</span>
          </div>
          <div>
            <label class="modal-label">Tema / Assunto</label>
            <input id="nlm-quiz-theme" class="modal-input" type="text"
              placeholder="Ex: Fotossíntese, Segunda Guerra Mundial, Álgebra Linear..."
              style="width:100%;" value="${subject.name}">
          </div>

          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#34a853 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #34a853;">
            <span style="font-size:1.1rem;font-weight:700;color:#34a853;">2</span>
            <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Abra o NotebookLM e cole o prompt abaixo</span>
          </div>

          <div style="position:relative;">
            <label class="modal-label">Prompt pronto para copiar 📋</label>
            <textarea id="nlm-prompt-text" class="modal-input" rows="7" readonly
              style="font-size:0.75rem;font-family:monospace;resize:none;width:100%;color:var(--text-muted);line-height:1.5;cursor:text;"
              ></textarea>
            <button id="nlm-copy-prompt" style="position:absolute;top:28px;right:8px;padding:4px 10px;font-size:0.72rem;border:1px solid var(--border);background:var(--bg-card);border-radius:var(--radius-sm);cursor:pointer;color:var(--text);">
              Copiar
            </button>
          </div>

          <a id="nlm-open-link" href="https://notebooklm.google.com" target="_blank" rel="noopener"
            style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;background:linear-gradient(135deg,#1a73e8,#34a853);color:#fff;border-radius:var(--radius-sm);font-weight:600;font-size:0.85rem;text-decoration:none;transition:opacity 0.2s;">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><polyline points="15 3 21 3 21 9" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><line x1="10" y1="14" x2="21" y2="3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
            Abrir NotebookLM ↗
          </a>
        </div>

        <div class="modal-footer" style="margin-top:20px;">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="nlm-next-step"
            style="background:linear-gradient(135deg,#1a73e8,#34a853);">
            Já gerei o quiz → Importar
          </button>
        </div>
      `, () => {
        // Preenche o textarea com o prompt gerado dinamicamente
        const updatePrompt = () => {
          const theme = document.getElementById('nlm-quiz-theme')?.value.trim() || subject.name;
          const prompt = this._buildNotebookLMPrompt(subject.name, theme);
          const ta = document.getElementById('nlm-prompt-text');
          if (ta) ta.value = prompt;
        };
        updatePrompt();
        document.getElementById('nlm-quiz-theme')?.addEventListener('input', updatePrompt);

        // Copiar prompt
        document.getElementById('nlm-copy-prompt')?.addEventListener('click', () => {
          const ta = document.getElementById('nlm-prompt-text');
          if (ta) {
            navigator.clipboard.writeText(ta.value).then(() => {
              const btn = document.getElementById('nlm-copy-prompt');
              if (btn) { btn.textContent = '✓ Copiado!'; btn.style.color = '#10B981'; }
              setTimeout(() => { if (btn) { btn.textContent = 'Copiar'; btn.style.color = ''; } }, 2000);
            }).catch(() => { ta.select(); document.execCommand('copy'); });
          }
        });

        // Ir para Etapa 2 — Importar JSON
        document.getElementById('nlm-next-step')?.addEventListener('click', () => {
          const theme = document.getElementById('nlm-quiz-theme')?.value.trim() || subject.name;
          this._closeModal();
          // Pequeno delay para o modal fechar antes de reabrir
          setTimeout(() => {
            EventBus.emit('ui:openNotebookLMImportModal', { subject, theme });
          }, 120);
        });
      });
    });

    EventBus.on('ui:openNotebookLMImportModal', ({ subject, theme }) => {
      this._openModal(`
        <h2 style="display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;flex-shrink:0;"><rect width="24" height="24" rx="4" fill="#1a73e8"/><path d="M6 8h12M6 12h8M6 16h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
          Importar Quiz do NotebookLM
        </h2>

        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb,#34a853 8%,var(--bg));border-radius:var(--radius-sm);border-left:3px solid #34a853;margin-bottom:4px;">
          <span style="font-size:1.1rem;font-weight:700;color:#34a853;">3</span>
          <span style="font-size:0.82rem;color:var(--text);font-weight:600;">Cole o JSON gerado pelo NotebookLM abaixo</span>
        </div>

        <p style="font-size:0.75rem;color:var(--text-muted);margin:8px 0 10px 0;line-height:1.5;">
          No NotebookLM, copie o bloco JSON completo da resposta e cole aqui. O app vai importar as questões automaticamente.
        </p>

        <textarea id="nlm-import-json" class="modal-input" rows="10"
          placeholder='Cole aqui o JSON gerado pelo NotebookLM...'
          style="font-size:0.75rem;font-family:monospace;resize:vertical;width:100%;min-height:180px;line-height:1.5;"></textarea>

        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px dashed var(--border);">
          <strong style="color:var(--text);">Formato esperado:</strong><br>
          <code style="font-size:0.7rem;">{"title":"...","questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}</code>
        </div>

        <div class="modal-footer" style="margin-top:16px;">
          <button class="btn-ghost" id="nlm-back-step">← Voltar</button>
          <button class="btn-primary" id="nlm-import-btn"
            style="background:linear-gradient(135deg,#1a73e8,#34a853);">
            ✅ Importar Simulado
          </button>
        </div>
      `, () => {
        document.getElementById('nlm-import-btn')?.addEventListener('click', () => {
          const raw = document.getElementById('nlm-import-json')?.value.trim();
          if (!raw) {
            alert('Por favor, cole o JSON gerado pelo NotebookLM antes de importar.');
            return;
          }
          EventBus.emit('ui:importNotebookLMQuiz', { subjectId: subject.id, theme, raw });
        });

        document.getElementById('nlm-back-step')?.addEventListener('click', () => {
          this._closeModal();
          setTimeout(() => EventBus.emit('ui:openNotebookLMQuizModal', { subject }), 120);
        });

        document.getElementById('nlm-import-json')?.focus();
      });
    });

    EventBus.on('ui:importNotebookLMQuiz', ({ subjectId, theme, raw }) => {
      const { quizModel } = this.models;
      let quizData = null;

      try {
        // Tenta parsear o JSON diretamente
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          quizData = parsed;
        } else {
          throw new Error('Estrutura de JSON inválida.');
        }
      } catch (e) {
        alert(
          '❌ O JSON colado não é válido ou não segue o formato esperado.\n\n' +
          'Certifique-se de que o NotebookLM gerou a resposta no formato JSON e copie o bloco completo, incluindo as chaves { }.\n\n' +
          'Dica: no NotebookLM, peça para ele "responder apenas com o JSON, sem texto adicional".' 
        );
        return;
      }

      // Valida cada questão
      const validQuestions = (quizData.questions || []).filter(q =>
        q &&
        typeof q.question === 'string' &&
        Array.isArray(q.options) && q.options.length >= 2 &&
        typeof q.answerIndex === 'number' &&
        q.answerIndex >= 0 && q.answerIndex < q.options.length
      );

      if (validQuestions.length === 0) {
        alert('Nenhuma questão válida encontrada no JSON. Verifique se o formato está correto.');
        return;
      }

      // Garante campo explanation em todas as questões
      validQuestions.forEach(q => { if (!q.explanation) q.explanation = ''; });

      const title = quizData.title || `Simulado NotebookLM: ${theme}`;
      quizModel.create(subjectId, title, validQuestions);

      this._closeModal();
      this._toast(`✅ Simulado importado com ${validQuestions.length} questões!`);
      this._render();
    });

    // ─ Notas por Voz ─
    EventBus.on('ui:toggleVoiceRecording', async ({ pageId }) => {
      if (this._isRecordingVoice) {
        this._stopVoiceRecording(pageId);
      } else {
        this._startVoiceRecording(pageId);
      }
    });

    // ─ Backup de Dados ─
    EventBus.on('ui:exportBackup', async () => {
      try {
        this._toast('📦 Preparando backup com arquivos...');
        const backupData = await Storage.exportFullBackup();
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().slice(0, 10);

        const a = document.createElement('a');
        a.href = url;
        a.download = `estuda-ai-backup-${dateStr}.json`;
        a.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this._toast('✅ Backup exportado com sucesso!');
      } catch (e) {
        console.error(e);
        alert('Erro ao exportar backup: ' + e.message);
      }
    });

    EventBus.on('ui:importBackup', (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data || typeof data !== 'object') {
            throw new Error('O arquivo de backup é inválido.');
          }

          const hasData = data.localStorage || data.subjects || data.pages || data.tasks;
          if (!hasData) {
            throw new Error('Nenhum dado de estudo válido encontrado no arquivo.');
          }

          if (confirm('Importar este backup irá substituir matérias, tarefas, anotações e todos os arquivos existentes neste navegador. Deseja continuar?')) {
            this._toast('⚡ Restaurando arquivos e dados...');
            await Storage.importFullBackup(data);
            this._toast('✅ Backup restaurado! Recarregando...');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        } catch (err) {
          console.error(err);
          alert('Erro ao importar backup: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // ─ Google Calendar ─
    EventBus.on('ui:changeGCalClientId', ({ clientId }) => {
      GoogleCalendar.setClientId(clientId);
      this._toast('ID do Cliente Google salvo.');
      this._render();
    });

    EventBus.on('ui:connectGoogleCalendar', async () => {
      try {
        this._toast('Conectando ao Google Calendar...');
        await GoogleCalendar.connect();
        this._toast('🟢 Conectado com sucesso!');
        this._render();
        await this._syncAllLocalEventsToGoogle();
        await this._fetchAndRenderGCal();
      } catch (e) {
        console.error(e);
        alert('Erro ao conectar com Google Calendar: ' + e.message);
        this._render();
      }
    });

    EventBus.on('ui:disconnectGoogleCalendar', () => {
      GoogleCalendar.disconnect();
      this._gcalEvents = [];
      this._toast('🔴 Desconectado do Google.');
      this._render();
    });

    EventBus.on('ui:saveDiscordConfig', (config) => {
      Discord.saveConfig(config);
      this._toast('Configurações do Discord salvas!');
      this._render();
    });

    EventBus.on('ui:testDiscordWebhook', async () => {
      try {
        this._toast('Enviando mensagem de teste...');
        await Discord.sendTestMessage();
        this._toast('🟢 Teste enviado com sucesso!');
      } catch (e) {
        console.error(e);
        alert('Erro ao enviar mensagem de teste: ' + e.message);
      }
    });

    EventBus.on('ui:saveSpotifyPlaylist', ({ playlistUrl }) => {
      Storage.set('spotify_playlist', playlistUrl);
      this._toast('Playlist do Spotify salva!');
      this._render();
    });

    // Spotify OAuth events
    EventBus.on('ui:spotifyLogin', async ({ clientId }) => {
      try {
        Spotify.saveClientId(clientId);
        await Spotify.login();
      } catch (e) {
        alert('Erro ao iniciar login com Spotify: ' + e.message);
      }
    });

    EventBus.on('ui:spotifyLogout', () => {
      Spotify.logout();
      this._toast('Spotify desconectado.');
      this._render();
    });

    EventBus.on('ui:loadSpotifyPlaylists', async () => {
      try {
        this._toast('🎵 Carregando suas playlists...');
        const playlists = await Spotify.getUserPlaylists();
        this.views.integrations.render(playlists);
      } catch (e) {
        alert('Erro ao carregar playlists: ' + e.message);
      }
    });

    EventBus.on('ui:selectSpotifyPlaylist', ({ id, name }) => {
      const embedUrl = `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`;
      Spotify.saveSelectedPlaylist(id, name, embedUrl);
      this._toast(`🎵 Playlist "${name}" selecionada!`);
      this._render();
    });


    EventBus.on('ui:syncGoogleCalendar', async () => {
      if (!GoogleCalendar.isAuthenticated()) {
        alert('Por favor, conecte sua conta Google primeiro.');
        return;
      }
      try {
        this._toast('🔄 Sincronizando eventos...');
        await this._syncAllLocalEventsToGoogle();
        await this._fetchAndRenderGCal();
        this._toast('✅ Sincronização concluída!');
      } catch (e) {
        console.error(e);
        alert('Erro na sincronização: ' + e.message);
      }
    });

    EventBus.on('ui:exportPageToGoogleDocs', async ({ pageId }) => {
      if (!GoogleCalendar.isAuthenticated()) {
        const confirmConn = confirm('Você precisa se conectar com a conta do Google e autorizar o Google Docs para exportar. Deseja conectar agora?');
        if (confirmConn) {
          try {
            this._toast('Conectando ao Google...');
            await GoogleCalendar.connect();
            this._toast('🟢 Conectado com sucesso!');
          } catch (e) {
            console.error(e);
            alert('Erro ao conectar com Google: ' + e.message);
            return;
          }
        } else {
          return;
        }
      }

      const page = this.models.pageModel.getById(pageId);
      if (!page) return;

      try {
        this._toast('📄 Criando documento no Google Docs...');
        const docUrl = await GoogleCalendar.exportToGoogleDocs(page);
        this._toast('✅ Documento exportado com sucesso!');

        if (confirm('Documento exportado com sucesso! Deseja abrir o documento criado no Google Docs agora?')) {
          window.open(docUrl, '_blank');
        }
      } catch (e) {
        console.error(e);
        alert('Erro ao exportar para o Google Docs: ' + e.message);
      }
    });

    EventBus.on('calendar:monthChanged', async ({ year, month }) => {
      await this._fetchAndRenderGCal();
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
    const state = this.models.timerModel._state();
    state.spotifyPlaylist = Storage.get('spotify_playlist') || '';
    this.views.timer.render(state);
  }

  _applyTheme() {
    document.body.classList.toggle('light', this._theme === 'light');
    const moon = document.getElementById('theme-icon-moon');
    const sun = document.getElementById('theme-icon-sun');
    if (moon) moon.style.display = this._theme === 'dark' ? '' : 'none';
    if (sun) sun.style.display = this._theme === 'light' ? '' : 'none';
  }

  // ── Modals ─────────────────────────────────────────────────────────────────

  _showSubjectModal() {
    const emojis = ['📚', '📐', '🔬', '🧬', '📜', '🌍', '💻', '🎨', '🎵', '⚗️', '📊', '🏛️'];
    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6', '#F97316'];
    this._openModal(`
      <h2>Nova Matéria</h2>
      <input id="modal-subject-name" class="modal-input" type="text" placeholder="Nome da matéria" maxlength="40">
      <label class="modal-label">Emoji</label>
      <div class="emoji-grid">${emojis.map(e => `<button class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}</div>
      <label class="modal-label">Cor</label>
      <div class="color-grid">${colors.map(c => `<button class="color-swatch" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">Criar</button>
      </div>
    `, () => {
      let emoji = '📚', color = '#8B5CF6';
      document.querySelectorAll('.emoji-btn').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.emoji-btn').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected'); emoji = b.dataset.emoji;
      }));
      document.querySelectorAll('.color-swatch').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
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
            ${subjects.map(s => `<option value="${s.id}" ${s.id === subjectId ? 'selected' : ''}>${s.emoji} ${s.name}</option>`).join('')}
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
        const title = document.getElementById('modal-task-title')?.value.trim();
        const desc = document.getElementById('modal-task-desc')?.value.trim();
        const subjId = document.getElementById('modal-task-subject')?.value;
        const priority = document.getElementById('modal-task-priority')?.value;
        const dueDate = document.getElementById('modal-task-due')?.value || null;
        if (!title || !subjId) return;
        this.models.taskModel.create(subjId, title, { description: desc, priority, dueDate });
        this._closeModal();
        this._render();
      });
      document.getElementById('modal-task-title')?.focus();
    });
  }

  _showEventModal(date, existing = null) {
    const subjects = this.models.subjectModel.getAll();
    const types = [{ v: 'study', l: '📖 Estudo' }, { v: 'review', l: '🔄 Revisão' }, { v: 'exam', l: '📝 Prova' }, { v: 'deadline', l: '⏰ Prazo' }];
    this._openModal(`
      <h2>${existing ? 'Editar Evento' : 'Novo Evento'}</h2>
      <input id="modal-ev-title" class="modal-input" type="text" placeholder="Título do evento" value="${existing?.title || ''}">
      <div class="modal-row">
        <div>
          <label class="modal-label">Data</label>
          <input id="modal-ev-date" class="modal-input" type="date" value="${date || ''}">
        </div>
        <div>
          <label class="modal-label">Tipo</label>
          <select id="modal-ev-type" class="select-input">
            ${types.map(t => `<option value="${t.v}" ${existing?.type === t.v ? 'selected' : ''}>${t.l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="modal-label">Matéria</label>
          <select id="modal-ev-subject" class="select-input">
            <option value="">— Nenhuma —</option>
            ${subjects.map(s => `<option value="${s.id}" ${existing?.subjectId === s.id ? 'selected' : ''}>${s.emoji} ${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <input id="modal-ev-duration" class="modal-input" type="number" placeholder="Duração (minutos)" value="${existing?.duration || 60}" min="0">
      <textarea id="modal-ev-notes" class="modal-textarea" placeholder="Notas" rows="2">${existing?.notes || ''}</textarea>
      <div class="modal-footer">
        ${existing ? `<button class="btn-danger" id="modal-delete">Excluir</button>` : ''}
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">${existing ? 'Salvar' : 'Criar'}</button>
      </div>
    `, () => {
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        const title = document.getElementById('modal-ev-title')?.value.trim();
        const evDate = document.getElementById('modal-ev-date')?.value;
        const type = document.getElementById('modal-ev-type')?.value;
        const subjectId = document.getElementById('modal-ev-subject')?.value || null;
        const duration = parseInt(document.getElementById('modal-ev-duration')?.value) || 60;
        const notes = document.getElementById('modal-ev-notes')?.value;
        if (!title || !evDate) return;
        const subject = subjectId ? this.models.subjectModel.getById(subjectId) : null;
        const typeColors = { study: '#8B5CF6', review: '#06B6D4', exam: '#EF4444', deadline: '#F59E0B' };
        const color = subject?.color || typeColors[type] || '#8B5CF6';
        let savedEvent;
        if (existing) {
          savedEvent = this.models.calendarModel.update(existing.id, { title, date: evDate, type, subjectId, duration, notes, color });
        } else {
          savedEvent = this.models.calendarModel.create({ title, date: evDate, type, subjectId, duration, notes, color });
        }
        if (savedEvent) {
          this._syncLocalEventToGoogle(savedEvent);
        }
        this._closeModal();
        if (this._route.view === 'calendar') this._render();
      });
      document.getElementById('modal-delete')?.addEventListener('click', () => {
        if (existing && confirm('Excluir evento?')) {
          if (existing.googleEventId && GoogleCalendar.isAuthenticated()) {
            GoogleCalendar.deleteEvent(existing.googleEventId).catch(err => console.error(err));
          }
          this.models.calendarModel.delete(existing.id);
          this._closeModal();
          if (this._route.view === 'calendar') this._render();
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

        if (Discord.isEnabled('mindmap')) {
          const s = subjectId ? this.models.subjectModel.getById(subjectId) : null;
          Discord.sendEmbed({
            title: `🧠 Novo Mapa ${type === 'mind' ? 'Mental' : 'Conceitual'} Criado!`,
            description: `O mapa conceitual **"${name}"** foi criado para organizar visualmente o conteúdo. 🎨`,
            color: Discord.hexToDecimal(s?.color || '#8B5CF6'),
            fields: [
              s ? { name: 'Matéria', value: `${s.emoji} ${s.name}`, inline: true } : null,
              { name: 'Tipo', value: type === 'mind' ? 'Mental' : 'Conceitual', inline: true }
            ].filter(Boolean),
            footer: { text: 'EstudaAí' }
          }).catch(err => console.error(err));
        }
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
        ${subjects.map(s => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('')}
      </select>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">Enviar</button>
      </div>
    `, () => {
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        const subjectId = document.getElementById('modal-pick-subject')?.value;
        files.forEach(f => EventBus.emit('material:upload', { file: f, subjectId }));
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
    const box = document.getElementById('modal-box');
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

  /**
   * Gera o prompt de instrução que o usuário deve colar no NotebookLM
   * para obter um quiz no formato JSON correto.
   */
  _buildNotebookLMPrompt(subjectName, theme) {
    return `Você é um professor especialista em ${subjectName}. Gere um simulado de estudo com 5 questões objetivas sobre o tema: "${theme}".

IMPORTANTE: Responda APENAS com o JSON abaixo, sem nenhum texto adicional antes ou depois.

{
  "title": "Simulado: ${theme}",
  "questions": [
    {
      "question": "Texto da pergunta aqui?",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "answerIndex": 0,
      "explanation": "Explicação detalhada do porquê a resposta correta é a Alternativa A."
    }
  ]
}

Regras:
- Gere exatamente 5 questões
- Cada questão deve ter exatamente 4 alternativas
- answerIndex é o índice (0-3) da alternativa correta
- As explicações devem ser didáticas e claras
- O JSON deve ser válido e completo`;
  }

  /**
   * Gera o prompt para criar um mapa mental via NotebookLM.
   */
  _buildNotebookLMMindMapPrompt(subjectName, theme, mapType = 'mind') {
    const typeDesc = mapType === 'concept'
      ? 'conceitual (com rótulos nas conexões)'
      : 'mental hierárquico';
    return `Você é um professor especialista em ${subjectName}. Crie um mapa ${typeDesc} sobre o tema: "${theme}".

IMPORTANTE: Responda APENAS com o JSON abaixo, sem nenhum texto adicional antes ou depois.

{
  "nodes": [
    {"id": "1", "text": "Conceito central", "x": 400, "y": 300, "color": "#8B5CF6"},
    {"id": "2", "text": "Subtópico A",      "x": 200, "y": 150, "color": "#06B6D4"},
    {"id": "3", "text": "Subtópico B",      "x": 600, "y": 150, "color": "#10B981"},
    {"id": "4", "text": "Detalhe A1",       "x": 100, "y": 300, "color": "#F59E0B"},
    {"id": "5", "text": "Detalhe B1",       "x": 700, "y": 300, "color": "#EF4444"}
  ],
  "edges": [
    {"id": "e1", "from": "1", "to": "2", "label": ""},
    {"id": "e2", "from": "1", "to": "3", "label": ""},
    {"id": "e3", "from": "2", "to": "4", "label": ""},
    {"id": "e4", "from": "3", "to": "5", "label": ""}
  ]
}

Regras:
- Crie entre 5 e 12 nós relevantes para o tema
- As coordenadas x e y devem distribuir os nós harmoniosamente (canvas de 800x600)
- Cada nó deve ter um texto curto e objetivo (máximo 4 palavras)
- As cores devem variar entre: #8B5CF6, #06B6D4, #10B981, #F59E0B, #EF4444, #EC4899, #3B82F6
- O JSON deve ser válido e completo`;
  }

  /**
   * Gera o prompt para criar flashcards via NotebookLM.
   */
  _buildNotebookLMFlashcardPrompt(subjectName, theme, qty = 10) {
    return `Você é um professor especialista em ${subjectName}. Crie ${qty} flashcards de memorização sobre o tema: "${theme}".

IMPORTANTE: Responda APENAS com o JSON abaixo, sem nenhum texto adicional antes ou depois.

{
  "cards": [
    {
      "front": "O que é [conceito]?",
      "back": "Definição completa e didática do conceito, com contexto e exemplos quando necessário."
    }
  ]
}

Regras:
- Crie exatamente ${qty} flashcards
- O campo "front" deve conter uma pergunta clara e objetiva
- O campo "back" deve conter a resposta completa, didática e com exemplos quando útil
- Varie os tipos de perguntas: definições, exemplos, comparações, aplicações
- O JSON deve ser válido e completo`;
  }

  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async _fetchGeminiMindMap(prompt, apiKey, fileData = null) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const parts = [];
    if (fileData) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64
        }
      });
      parts.push({
        text: `Gere um mapa mental completo e detalhado baseado ESTRITAMENTE no conteúdo deste material em anexo. 
Retorne ESTRITAMENTE um objeto JSON válido, sem tags de marcação markdown como \`\`\`json ou texto introdutório, apenas o JSON puro.
O JSON deve seguir esta estrutura exata:
{
  "nodes": [
    {"id": "1", "text": "Tema central do material", "color": "#8B5CF6", "x": 0, "y": 0},
    {"id": "2", "text": "Subtema A", "color": "#06B6D4", "x": -220, "y": -120},
    {"id": "3", "text": "Subtema B", "color": "#10B981", "x": 220, "y": -120},
    {"id": "4", "text": "Conceito A1", "color": "#3B82F6", "x": -370, "y": -220}
  ],
  "edges": [
    {"from": "1", "to": "2"},
    {"from": "1", "to": "3"},
    {"from": "2", "to": "4"}
  ]
}
Mantenha o mapa com 6 a 12 nós de estudo relevantes. Organize as coordenadas x e y para que os nós não fiquem sobrepostos. O nó central deve ficar em (0, 0) e os ramos secundários devem se espalhar em direções diferentes radialmente ou por níveis (com distâncias de 200px a 350px).`
      });
    } else {
      parts.push({
        text: `Gere um mapa mental completo sobre o seguinte assunto: "${prompt}". 
Retorne ESTRITAMENTE um objeto JSON válido, sem tags de marcação markdown como \`\`\`json ou texto introdutório, apenas o JSON puro.
O JSON deve seguir esta estrutura exata:
{
  "nodes": [
    {"id": "1", "text": "Tema central", "color": "#8B5CF6", "x": 0, "y": 0},
    {"id": "2", "text": "Subtema A", "color": "#06B6D4", "x": -220, "y": -120},
    {"id": "3", "text": "Subtema B", "color": "#10B981", "x": 220, "y": -120},
    {"id": "4", "text": "Conceito A1", "color": "#3B82F6", "x": -370, "y": -220}
  ],
  "edges": [
    {"from": "1", "to": "2"},
    {"from": "1", "to": "3"},
    {"from": "2", "to": "4"}
  ]
}
Mantenha o mapa com 6 a 12 nós de estudo relevantes. Organize as coordenadas x e y para que os nós não fiquem sobrepostos. O nó central deve ficar em (0, 0) e os ramos devem se espalhar em direções diferentes radialmente ou por níveis (com distâncias de 200px a 350px).`
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) throw new Error('Resposta vazia da I.A.');

    let cleanJSON = textContent.trim();
    if (cleanJSON.startsWith('```')) {
      cleanJSON = cleanJSON.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(cleanJSON);
  }

  _generateLocalMockMap(prompt) {
    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6'];
    const nodes = [
      { id: '1', text: prompt, color: colors[0], x: 0, y: 0, width: 140, height: 46 }
    ];
    const edges = [];

    const subtopics = [
      { text: 'Definição & Conceito', x: -220, y: -120, color: colors[1], sub: ['Fundamentos', 'Significado'] },
      { text: 'Aplicações Práticas', x: 220, y: -120, color: colors[2], sub: ['Exemplos Reais', 'Casos de Uso'] },
      { text: 'Aspectos Históricos', x: -220, y: 120, color: colors[3], sub: ['Origem', 'Evolução'] },
      { text: 'Importância & Impacto', x: 220, y: 120, color: colors[4], sub: ['Benefícios', 'Desafios'] }
    ];

    subtopics.forEach((t, i) => {
      const subId = `sub_${i}`;
      nodes.push({ id: subId, text: t.text, color: t.color, x: t.x, y: t.y, width: 130, height: 44 });
      edges.push({ id: `e_${subId}`, from: '1', to: subId, label: '' });

      t.sub.forEach((subSubText, j) => {
        const subSubId = `sub_${i}_sub_${j}`;
        const dx = t.x < 0 ? -160 : 160;
        const dy = j === 0 ? -60 : 60;
        nodes.push({ id: subSubId, text: subSubText, color: t.color, x: t.x + dx, y: t.y + dy, width: 120, height: 40 });
        edges.push({ id: `e_${subSubId}`, from: subId, to: subSubId, label: '' });
      });
    });

    return { nodes, edges };
  }

  // ── MÉTODOS AUXILIARES: QUIZZES & TRANSCRICÃO POR VOZ ──

  async _fetchGeminiQuiz(theme, apiKey, materialFile) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let prompt = `Você é um gerador de provas e quizzes de alto nível cognitivo.
Gere um quiz com exatamente 5 perguntas objetivas de múltipla escolha sobre o tema: "${theme}".
Retorne estritamente um objeto JSON com o formato:
{
  "questions": [
    {
      "question": "Texto da pergunta",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "answerIndex": 0,
      "explanation": "Explicação teórica de por que a resposta A é a correta."
    }
  ]
}
Forneça explicações detalhadas e didáticas para cada gabarito.`;

    const parts = [{ text: prompt }];

    if (materialFile) {
      const blob = await Storage.getFile(materialFile.fileId);
      if (blob) {
        const base64 = await this._blobToBase64(blob);
        const mimeType = blob.type || 'application/pdf';
        parts.unshift({
          inlineData: {
            mimeType,
            data: base64
          }
        });
        prompt += `\nBaseie as perguntas estritamente no material fornecido em anexo.`;
        parts[parts.length - 1].text = prompt;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Resposta vazia');
    text = text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(text);
  }

  _generateLocalMockQuiz(theme) {
    return {
      questions: [
        {
          question: `Qual conceito melhor define "${theme}" do ponto de vista conceitual básico?`,
          options: [
            'Uma abordagem superficial de estudo sem retenção.',
            'Um princípio fundamental focado em estruturação teórica e aplicação prática.',
            'Um método obsoleto de decoreba rápida.',
            'Um sistema voltado exclusivamente para exames de certificação internacional.'
          ],
          answerIndex: 1,
          explanation: `Este simulado local foi estruturado para consolidar o estudo de ${theme}, focando nos pilares teóricos fundamentais do tema.`
        },
        {
          question: `Qual dos seguintes é um benefício crucial ao dominar "${theme}"?`,
          options: [
            'Aumento da velocidade de digitação em teclados mecânicos.',
            'Melhoria na capacidade de resolução de problemas complexos na área.',
            'Eliminação completa de qualquer necessidade de revisão futura.',
            'Nenhuma das alternativas anteriores.'
          ],
          answerIndex: 1,
          explanation: `Estudar e dominar ${theme} expande diretamente o repertório de conexões neurais e habilidades de resolução de problemas na matéria.`
        },
        {
          question: `Qual é o erro mais comum ao iniciar os estudos de "${theme}"?`,
          options: [
            'Estudar com consistência diária dividindo os tópicos.',
            'Avançar para conceitos avançados sem solidificar a base teórica.',
            'Usar flashcards de repetição espaçada.',
            'Realizar exercícios práticos frequentes.'
          ],
          answerIndex: 1,
          explanation: `Sem consolidar a base sobre ${theme}, tentar absorver técnicas avançadas pode levar a gaps de conhecimento e frustrações.`
        }
      ]
    };
  }

  async _startVoiceRecording(pageId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Seu navegador não oferece suporte a gravação de áudio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._audioChunks = [];
      this._mediaRecorder = new MediaRecorder(stream);

      this._mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this._audioChunks.push(e.data);
      };

      this._mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this._audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await this._transcribeAndSummarizeVoice(audioBlob, pageId);
      };

      this._mediaRecorder.start();
      this._isRecordingVoice = true;
      this.views.editor.setRecordingState(true);
      this._toast('🎙️ Gravando áudio... Clique novamente para parar.');
    } catch (e) {
      console.error(e);
      alert('Erro ao acessar microfone: ' + e.message);
    }
  }

  _stopVoiceRecording(pageId) {
    if (this._mediaRecorder && this._isRecordingVoice) {
      this._mediaRecorder.stop();
      this._isRecordingVoice = false;
      this.views.editor.setRecordingState(false);
      this._toast('⏳ Processando gravação com I.A...');
    }
  }

  async _transcribeAndSummarizeVoice(audioBlob, pageId) {
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const { pageModel } = this.models;
    const page = pageModel.getById(pageId);
    if (!page) return;

    let markdownResult = '';

    if (apiKey) {
      try {
        const base64 = await this._blobToBase64(audioBlob);
        markdownResult = await this._fetchGeminiVoiceTranscription(base64, apiKey);
      } catch (e) {
        console.warn('Erro na transcrição Gemini Voice:', e);
      }
    }

    if (!markdownResult) {
      markdownResult = `### 🎙️ Transcrição & Resumo por Voz (Simulação Local)

Aqui está um resumo executivo da gravação efetuada:
- **Tópico Principal**: Discussão de metodologias e técnicas de estudo ativo de alta retenção.
- **Tópicos Detalhados**:
  - *Técnica Feynman*: Explicar conceitos complexos com termos simples para consolidar lacunas cognitivas.
  - *Prática Distribuída*: Distribuir sessões de estudo ao longo do tempo em vez de acumular tudo em um único dia.
  
> [!NOTE]
> *Adicione sua chave Gemini API real nas configurações do mapa mental para transcrever seus áudios literalmente com inteligência multimodal avançada!*`;
      this._toast('✨ Nota de voz gerada via simulação local!');
    }

    if (markdownResult) {
      const lines = markdownResult.split('\n');
      const newBlocks = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return { id: _uuid(), type: 'h3', content: trimmed.replace('### ', ''), checked: false };
        } else if (trimmed.startsWith('## ')) {
          return { id: _uuid(), type: 'h2', content: trimmed.replace('## ', ''), checked: false };
        } else if (trimmed.startsWith('# ')) {
          return { id: _uuid(), type: 'h1', content: trimmed.replace('# ', ''), checked: false };
        } else if (trimmed.startsWith('- ')) {
          return { id: _uuid(), type: 'bullet', content: trimmed.replace('- ', ''), checked: false };
        } else if (trimmed.startsWith('> ')) {
          return { id: _uuid(), type: 'quote', content: trimmed.replace('> ', ''), checked: false };
        } else if (trimmed !== '') {
          return { id: _uuid(), type: 'text', content: trimmed, checked: false };
        }
        return null;
      }).filter(Boolean);

      page.blocks.push(...newBlocks);
      pageModel.update(page.id, page.title, page.blocks);
      this._toast('✅ Nota de voz integrada ao caderno!');
      this._render();
    }
  }

  async _fetchGeminiVoiceTranscription(base64, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Você é um anotador e assistente de estudos profissional.
Ouça com extrema atenção a esta gravação de áudio de uma aula ou explicação gravada pelo estudante.
Transcreva fielmente os pontos mais importantes e monte um resumo executivo ultra-estruturado em formato Markdown.
Use títulos, sub-títulos, listas (bullet points) e citações para destacar conceitos críticos.
Retorne estritamente o texto formatado em Markdown, sem nenhuma introdução ou metatexto adicional.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: "audio/webm",
                data: base64
              }
            },
            { text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) throw new Error('API Gemini respondeu com erro');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // ── Google Calendar Sincronização Helpers ─────────────────────────────────

  async _renderCalendarView() {
    const calendar = this.models.calendarModel.getAll();
    const subjects = this.models.subjectModel.getAll();

    // Renderiza inicialmente com o que temos carregado
    this.views.calendar.render(calendar, subjects, this._gcalEvents || []);

    // Se estiver autenticado, busca os eventos em background e atualiza a view
    if (GoogleCalendar.isAuthenticated()) {
      await this._fetchAndRenderGCal();
    }
  }

  async _fetchAndRenderGCal() {
    if (!GoogleCalendar.isAuthenticated()) {
      this._gcalEvents = [];
      return;
    }

    try {
      const year = this.views.calendar._year;
      const month = this.views.calendar._month;

      const timeMin = new Date(year, month - 1, 1).toISOString();
      const timeMax = new Date(year, month, 0, 23, 59, 59).toISOString();

      const gEvents = await GoogleCalendar.fetchEvents(timeMin, timeMax);

      this._gcalEvents = gEvents.map(e => {
        let dateStr = '';
        if (e.start?.date) {
          dateStr = e.start.date;
        } else if (e.start?.dateTime) {
          dateStr = e.start.dateTime.slice(0, 10);
        }
        return {
          id: e.id,
          title: e.summary || '(Sem título)',
          date: dateStr,
          htmlLink: e.htmlLink,
          description: e.description || ''
        };
      });

      // Recarrega a view caso o usuário ainda esteja na aba de calendário
      if (this._route.view === 'calendar') {
        const calendar = this.models.calendarModel.getAll();
        const subjects = this.models.subjectModel.getAll();
        this.views.calendar.render(calendar, subjects, this._gcalEvents);
      }
    } catch (e) {
      console.error('Erro ao buscar eventos do Google Calendar:', e);
    }
  }

  async _syncLocalEventToGoogle(ev) {
    if (!GoogleCalendar.isAuthenticated()) return;
    try {
      const s = ev.subjectId ? this.models.subjectModel.getById(ev.subjectId) : null;
      const gId = await GoogleCalendar.pushEvent(ev, s?.name);
      if (gId && ev.googleEventId !== gId) {
        ev.googleEventId = gId;
        this.models.calendarModel._save();
      }
    } catch (e) {
      console.error('Erro ao enviar evento para o Google Calendar:', e);
    }
  }

  async _syncAllLocalEventsToGoogle() {
    if (!GoogleCalendar.isAuthenticated()) return;

    const events = this.models.calendarModel.getAll();
    const { subjectModel, calendarModel } = this.models;
    let updatedAny = false;

    for (const ev of events) {
      if (!ev.googleEventId) {
        try {
          const s = ev.subjectId ? subjectModel.getById(ev.subjectId) : null;
          const gId = await GoogleCalendar.pushEvent(ev, s?.name);
          if (gId) {
            ev.googleEventId = gId;
            updatedAny = true;
          }
        } catch (e) {
          console.error('Erro ao sincronizar evento:', ev.title, e);
        }
      }
    }

    if (updatedAny) {
      calendarModel._save();
    }
  }

  // ── Google Drive picker modal and search helpers ──────────────────────────

  async _showGDrivePickerModal(subjectId) {
    if (!GoogleCalendar.isAuthenticated()) {
      const confirmConn = confirm('Você precisa conectar sua conta do Google para buscar arquivos no Google Drive. Conectar agora?');
      if (confirmConn) {
        try {
          this._toast('Conectando ao Google...');
          await GoogleCalendar.connect();
          this._toast('🟢 Conectado com sucesso!');
        } catch (e) {
          console.error(e);
          alert('Erro ao conectar: ' + e.message);
          return;
        }
      } else {
        return;
      }
    }

    const subjects = this.models.subjectModel.getAll();
    let targetSubjectId = subjectId || (subjects[0]?.id || null);

    this._openModal(`
      <h2>Selecionar do Google Drive ☁️</h2>
      <div style="display:flex; gap:10px; margin-bottom:12px;">
        <input type="text" id="gdrive-search-input" class="modal-input" placeholder="Buscar arquivos no Google Drive..." style="margin-bottom:0; flex-grow:1;">
        <select id="gdrive-subject-select" class="select-input" style="width:180px;">
          ${subjects.map(s => `<option value="${s.id}" ${s.id === targetSubjectId ? 'selected' : ''}>${s.emoji} ${s.name}</option>`).join('')}
        </select>
      </div>
      <div id="gdrive-files-container" style="max-height:350px; min-height:120px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.15);">
        <div id="gdrive-loading" style="padding:40px; text-align:center; color:var(--text-muted);">
          Carregando arquivos do Drive...
        </div>
        <div id="gdrive-files-list"></div>
      </div>
    `, () => {
      const searchInput = document.getElementById('gdrive-search-input');
      const listEl = document.getElementById('gdrive-files-list');
      const loadingEl = document.getElementById('gdrive-loading');
      const subjectSelect = document.getElementById('gdrive-subject-select');

      let debounceTimer = null;

      const loadFiles = async (query = '') => {
        try {
          loadingEl.style.display = 'block';
          listEl.innerHTML = '';

          const files = await this._fetchDriveFiles(query);

          loadingEl.style.display = 'none';
          if (files.length === 0) {
            listEl.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">Nenhum arquivo encontrado.</div>`;
            return;
          }

          listEl.innerHTML = files.map(file => {
            const sizeStr = file.size ? this.models.materialModel.formatSize(parseInt(file.size)) : 'Tamanho desconhecido';
            return `
              <div class="gdrive-item" data-id="${file.id}" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
                <div style="display:flex; align-items:center; gap:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">
                  <span style="font-size:18px;">📄</span>
                  <div style="display:flex; flex-direction:column; overflow:hidden;">
                    <span style="font-weight:500; font-size:14px; overflow:hidden; text-overflow:ellipsis;">${file.name}</span>
                    <span style="font-size:11px; color:var(--text-muted);">${sizeStr}</span>
                  </div>
                </div>
                <button class="btn-primary btn-sm" style="padding:4px 10px;">Adicionar</button>
              </div>
            `;
          }).join('');

          listEl.querySelectorAll('.gdrive-item').forEach(el => {
            el.addEventListener('click', () => {
              const fileId = el.dataset.id;
              const selectedFile = files.find(f => f.id === fileId);
              if (selectedFile) {
                const finalSubjId = subjectSelect.value;
                this.models.materialModel.createDriveLink(finalSubjId, selectedFile);
                this._toast('✅ Arquivo do Google Drive adicionado!');
                this._closeModal();
                this._render();
              }
            });
          });

        } catch (e) {
          console.error(e);
          loadingEl.style.display = 'none';
          listEl.innerHTML = `<div style="padding:40px; text-align:center; color:#EF4444;">Erro ao carregar arquivos: ${e.message}</div>`;
        }
      };

      loadFiles();

      searchInput?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadFiles(e.target.value);
        }, 400);
      });
    });
  }

  async _fetchDriveFiles(query = '') {
    const params = new URLSearchParams({
      pageSize: '40',
      fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink)'
    });

    let qStr = "trashed = false";
    if (query.trim()) {
      const escQuery = query.replace(/'/g, "\\'");
      qStr += ` and name contains '${escQuery}'`;
    }
    params.append('q', qStr);

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GoogleCalendar.accessToken}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.files || [];
  }

  // ── MÉTODOS AUXILIARES: FLASHCARDS POR I.A ────────────────────────────────

  async _fetchGeminiFlashcards(prompt, apiKey, qty = 10, fileData = null) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const baseInstruction = `Você é um especialista em pedagogia e memorização ativa (método Leitner / repetição espaçada).
Gere exatamente ${qty} flashcards de estudo de alta qualidade sobre o tema: "${prompt}".
Retorne ESTRITAMENTE um array JSON válido, sem markdown ou texto extra, apenas o JSON puro.
Cada item deve ter: { "front": "Pergunta ou conceito", "back": "Resposta detalhada e clara" }.
As perguntas devem cobrir definições, causas, consequências, exemplos e aplicações práticas do tema.
Exemplo de formato esperado:
[
  { "front": "O que é fotossíntese?", "back": "Processo pelo qual plantas convertem luz solar, CO₂ e água em glicose e oxigênio." },
  { "front": "Onde ocorre a fotossíntese?", "back": "Principalmente nos cloroplastos das células vegetais, especialmente nas folhas." }
]`;

    const parts = [];
    if (fileData) {
      parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.base64 } });
      parts.push({ text: `Analise o material em anexo e, com base nele, ${baseInstruction}` });
    } else {
      parts.push({ text: baseInstruction });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Resposta vazia da I.A.');
    text = text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.flashcards || [];
  }

  _generateLocalMockFlashcards(topic, qty = 10) {
    const templates = [
      { front: `O que é ${topic}?`, back: `${topic} é um conceito fundamental que envolve a compreensão de princípios teóricos e sua aplicação prática no contexto de estudo.` },
      { front: `Qual a importância de ${topic}?`, back: `${topic} é importante pois forma a base para compreender conceitos mais avançados na área, permitindo maior domínio do conteúdo.` },
      { front: `Quais são os principais elementos de ${topic}?`, back: `Os principais elementos incluem: fundamentos teóricos, aplicações práticas, exemplos contextualizados e conexões com outros temas da matéria.` },
      { front: `Como ${topic} se aplica na prática?`, back: `Na prática, ${topic} pode ser observado em situações cotidianas e exercícios, sendo essencial para resolver problemas complexos da área.` },
      { front: `Qual a origem histórica de ${topic}?`, back: `${topic} surgiu como resposta a necessidades específicas da área de estudo, evoluindo ao longo do tempo com novas descobertas e pesquisas.` },
      { front: `Quais são os erros comuns ao estudar ${topic}?`, back: `Os erros mais comuns incluem: pular a base teórica, não praticar exercícios, não revisar regularmente e não fazer conexões com outros conteúdos.` },
      { front: `Como ${topic} se relaciona com outros conceitos?`, back: `${topic} possui forte relação com conceitos adjacentes da matéria, formando uma rede de conhecimento integrada e interdependente.` },
      { front: `Cite um exemplo prático de ${topic}.`, back: `Um exemplo prático é sua aplicação em resolução de problemas reais, onde os princípios de ${topic} permitem encontrar soluções estruturadas e eficazes.` },
      { front: `Quais são os benefícios de dominar ${topic}?`, back: `Dominar ${topic} amplia o repertório intelectual, melhora a capacidade analítica e abre portas para compreender tópicos avançados com facilidade.` },
      { front: `Resuma ${topic} em uma frase.`, back: `${topic} é o conjunto de princípios, métodos e aplicações que estruturam o entendimento profundo desta área do conhecimento.` },
      { front: `Quais são as diferenças entre ${topic} e conceitos similares?`, back: `Diferente de conceitos similares, ${topic} se destaca pela sua especificidade, abrangência e aplicabilidade direta nos problemas da área.` },
      { front: `Por que ${topic} é cobrado em provas?`, back: `${topic} é recorrente em avaliações pois representa um pilar central do conhecimento da matéria, exigindo compreensão profunda e não apenas memorização.` },
      { front: `Quais recursos ajudam a estudar ${topic}?`, back: `Livros didáticos, videoaulas, exercícios práticos, mapas mentais e flashcards de repetição espaçada são os melhores recursos para fixar ${topic}.` },
      { front: `Como revisar ${topic} de forma eficiente?`, back: `A revisão eficiente usa o método Leitner (repetição espaçada), intercalando ${topic} com outros temas para fortalecer as conexões neurais.` },
      { front: `Qual a fórmula / definição formal de ${topic}?`, back: `A definição formal de ${topic} abrange seus elementos constitutivos, relações com outras variáveis e o contexto teórico em que é aplicado.` },
      { front: `Quais são os tipos ou categorias de ${topic}?`, back: `${topic} pode ser classificado em diferentes categorias conforme critérios específicos da área, cada uma com características e usos particulares.` },
      { front: `Qual o impacto de ${topic} na área de estudo?`, back: `${topic} transformou profundamente a área ao fornecer novas ferramentas teóricas e práticas, influenciando pesquisas, métodos e aplicações.` },
      { front: `Como ${topic} é avaliado em contexto acadêmico?`, back: `Em contexto acadêmico, ${topic} é avaliado por meio de questões conceituais, exercícios aplicados, análise de casos e provas discursivas.` },
      { front: `Qual a crítica mais comum a ${topic}?`, back: `A crítica mais comum é a de que ${topic} pode ser abstraído demais sem prática adequada, tornando o aprendizado superficial sem aplicação real.` },
      { front: `Como ${topic} evoluiu ao longo do tempo?`, back: `Ao longo do tempo, ${topic} foi sendo refinado por pesquisadores e educadores, incorporando novas descobertas e adaptações ao contexto moderno.` }
    ];
    return templates.slice(0, Math.min(qty, templates.length));
  }
}
