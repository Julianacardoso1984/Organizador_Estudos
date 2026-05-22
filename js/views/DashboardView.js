'use strict';

/**
 * DashboardView — Painel principal com estatísticas e resumo.
 */
class DashboardView {
  constructor() {
    this.el = document.getElementById('view-dashboard');
  }

  render(subjects, pages, tasks, calendar, schedule = {}, focusSessions = 0, courses = [], usefulLinks = [], timerState = null) {
    const now   = new Date();
    const hour  = now.getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const taskStats = { todo:0, doing:0, done:0 };
    tasks.forEach(t => taskStats[t.status] = (taskStats[t.status]||0)+1);

    const recentPages = [...pages]
      .sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,6);
    const upcoming = calendar
      .filter(e => e.date >= now.toISOString().slice(0,10))
      .sort((a,b) => a.date.localeCompare(b.date)).slice(0,5);

    const totalMinutes = focusSessions * 25;
    const timeStr = totalMinutes >= 60 
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` 
      : `${totalMinutes}min`;

    // Frases motivacionais — rotacionam a cada hora
    const motivationalQuotes = [
      { text: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', author: 'Robert Collier' },
      { text: 'Educação não é a preparação para a vida; educação é a própria vida.', author: 'John Dewey' },
      { text: 'A persistência é o caminho do êxito.', author: 'Charles Chaplin' },
      { text: 'Invista em conhecimento. É o que rende mais juros.', author: 'Benjamin Franklin' },
      { text: 'Quem tem um porquê para viver pode suportar quase qualquer como.', author: 'Friedrich Nietzsche' },
      { text: 'A disciplina é a ponte entre metas e realizações.', author: 'Jim Rohn' },
      { text: 'Cada dia é uma nova chance de mudar sua vida.', author: 'Provérbio' },
      { text: 'Comece de onde você está, use o que você tem, faça o que puder.', author: 'Arthur Ashe' },
      { text: 'O aprendizado é um tesouro que segue seu dono para todo lugar.', author: 'Provérbio Chinês' },
      { text: 'Acredite que você pode e você já estará na metade do caminho.', author: 'Theodore Roosevelt' },
      { text: 'Não importa o quão devagar você vai, desde que não pare.', author: 'Confúcio' },
      { text: 'O conhecimento é a única coisa que ninguém pode tirar de você.', author: 'Provérbio' },
      { text: 'Tudo parece impossível até que seja feito.', author: 'Nelson Mandela' },
      { text: 'Estude enquanto os outros dormem; trabalhe enquanto os outros descansam.', author: 'William A. Ward' },
      { text: 'O segredo de avançar é começar.', author: 'Mark Twain' },
      { text: 'Você é mais bravo do que acredita, mais forte do que parece e mais inteligente do que pensa.', author: 'A.A. Milne' },
      { text: 'A mente que se abre a uma nova ideia jamais voltará ao seu tamanho original.', author: 'Albert Einstein' },
      { text: 'Dedicação hoje é o fundamento do sucesso amanhã.', author: 'Provérbio' },
      { text: 'O esforço de hoje é a conquista de amanhã.', author: 'Provérbio' },
      { text: 'Nada é particularmente difícil se você dividir em pequenos trabalhos.', author: 'Henry Ford' },
    ];
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const quoteIndex = (dayOfYear + now.getHours()) % motivationalQuotes.length;
    const quote = motivationalQuotes[quoteIndex];

    this.el.innerHTML = `
      <div class="view-content dashboard-content">
        <div class="dashboard-greeting" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 32px;">
          <div>
            <h1>${greeting}! 👋</h1>
            <p class="greeting-date">${now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
            <blockquote class="motivational-quote">
              <span class="quote-icon">✨</span>
              <span class="quote-text">"${quote.text}"</span>
              <span class="quote-author">— ${quote.author}</span>
            </blockquote>
          </div>
          <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
            ${this._renderPomodoroWidget(timerState)}
            <div class="dashboard-clock" id="dashboard-clock" title="Hora atual">
              <span class="dash-clock-time">00:00:00</span>
            </div>
          </div>
        </div>
        <div class="stats-grid">
          ${this._stat('📚', subjects.length, 'Matérias', '#8B5CF6')}
          ${this._stat('📝', pages.length, 'Páginas', '#06B6D4')}
          ${this._stat('✅', taskStats.done||0, 'Tarefas Feitas', '#10B981')}
          ${this._stat('⏱️', timeStr, 'Tempo Focado', '#EC4899', `
            <button id="btn-reset-focus-time" style="background: none; border: none; padding: 2px 6px; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; border-radius: 4px; transition: all 0.2s;" title="Zerar tempo focado" onmouseover="this.style.color='var(--accent)';" onmouseout="this.style.color='var(--text-muted)';">
              <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            </button>
          `)}
        </div>
        ${subjects.length > 0 ? this._renderSchedule(subjects, schedule) : ''}
        ${subjects.length > 0 ? this._renderProgress(subjects, pages, tasks) : ''}
        ${this._renderCourses(courses)}
        ${this._renderUsefulLinks(usefulLinks)}
        <div class="dashboard-columns">
          ${recentPages.length > 0 ? this._renderRecent(recentPages, subjects) : ''}
          ${upcoming.length > 0 ? this._renderUpcoming(upcoming, subjects) : ''}
        </div>
        ${subjects.length === 0 ? `<div class="empty-state"><div class="empty-icon">🎓</div><h2>Comece agora!</h2><p>Crie sua primeira matéria na barra lateral.</p></div>` : ''}
      </div>`;

    // Bind nav buttons
    this.el.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        EventBus.emit('navigate', {view:el.dataset.nav, pageId:el.dataset.pageId, subjectId:el.dataset.subjectId});
      });
    });

    // Bind schedule add clicks
    this.el.querySelectorAll('.btn-add-schedule').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:addScheduleSubject', { day: btn.dataset.day });
      });
    });

    // Bind schedule remove clicks
    this.el.querySelectorAll('.btn-remove-schedule').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const { day, subjectId } = btn.dataset;
        EventBus.emit('ui:removeScheduleSubject', { day, subjectId });
      });
    });

    // Bind course platform buttons
    this.el.querySelector('#btn-add-course')?.addEventListener('click', () => {
      EventBus.emit('ui:addCoursePlatform');
    });

    this.el.querySelectorAll('.btn-delete-course').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:deleteCoursePlatform', { courseId: btn.dataset.courseId });
      });
    });

    this.el.querySelectorAll('.btn-open-platform').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        EventBus.emit('ui:openCoursePlatform', { courseId: btn.dataset.courseId });
      });
    });

    // Zerar sessões de foco
    this.el.querySelector('#btn-reset-focus-time')?.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('Deseja zerar o tempo total focado nas estatísticas?')) {
        EventBus.emit('ui:resetFocusSessions');
      }
    });

    // Bind useful links buttons
    this.el.querySelector('#btn-add-useful-link')?.addEventListener('click', () => {
      EventBus.emit('ui:addUsefulLink');
    });
    this.el.querySelectorAll('.btn-edit-useful-link').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        EventBus.emit('ui:editUsefulLink', { linkId: btn.dataset.linkId });
      });
    });
    this.el.querySelectorAll('.btn-delete-useful-link').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        EventBus.emit('ui:deleteUsefulLink', { linkId: btn.dataset.linkId });
      });
    });

    // Timer bindings
    this.el.querySelector('.dash-pomodoro-toggle')?.addEventListener('click', e => {
      e.stopPropagation();
      EventBus.emit('timer:toggle');
    });
    this.el.querySelector('.dash-pomodoro-reset')?.addEventListener('click', e => {
      e.stopPropagation();
      EventBus.emit('timer:reset');
    });
    this.el.querySelector('.dash-pomodoro-skip')?.addEventListener('click', e => {
      e.stopPropagation();
      EventBus.emit('timer:skip');
    });

  }

  updateTimer(state) {
    if (!state) return;
    const { mode, label, total, remaining, running } = state;
    const pct = ((total - remaining) / total) * 100;
    const mins = String(Math.floor(remaining/60)).padStart(2,'0');
    const secs = String(remaining % 60).padStart(2,'0');

    const displayEl = this.el.querySelector('.dash-pomodoro-time');
    const labelEl = this.el.querySelector('.dash-pomodoro-label');
    const playBtn = this.el.querySelector('.dash-pomodoro-toggle');
    const svgFg = this.el.querySelector('.dash-pomodoro-ring-fg');

    if (displayEl) displayEl.textContent = `${mins}:${secs}`;
    if (labelEl) labelEl.textContent = label;
    if (playBtn) {
       playBtn.innerHTML = running 
         ? `<svg viewBox="0 0 24 24" width="14" height="14" style="stroke:currentColor; fill:none; stroke-width:2;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar`
         : `<svg viewBox="0 0 24 24" width="14" height="14" style="stroke:currentColor; fill:none; stroke-width:2;"><polygon points="5 3 19 12 5 21 5 3"/></svg> Iniciar`;
    }
    if (svgFg) {
       const radius = 30;
       const circ = 2 * Math.PI * radius;
       const dash = circ - (pct / 100) * circ;
       svgFg.setAttribute('stroke-dasharray', circ);
       svgFg.setAttribute('stroke-dashoffset', dash);
       svgFg.style.stroke = mode === 'focus' ? '#8B5CF6' : mode === 'shortBreak' ? '#06B6D4' : '#10B981';
    }
  }

  _renderPomodoroWidget(state) {
    if (!state) return '';
    const { mode, label, total, remaining, running } = state;
    const pct = ((total - remaining) / total) * 100;
    const mins = String(Math.floor(remaining/60)).padStart(2,'0');
    const secs = String(remaining % 60).padStart(2,'0');
    const radius = 30;
    const circ   = 2 * Math.PI * radius;
    const dash   = circ - (pct / 100) * circ;
    const color  = mode === 'focus' ? '#8B5CF6' : mode === 'shortBreak' ? '#06B6D4' : '#10B981';

    return `
      <div class="dash-pomodoro-widget" style="display:flex; align-items:center; gap:16px; background:var(--bg-card); padding:12px 20px; border-radius:var(--radius-md); border:1px solid var(--border); box-shadow:var(--shadow-sm);">
        <div style="position:relative; width:70px; height:70px;">
          <svg viewBox="0 0 70 70" style="transform: rotate(-90deg); width:100%; height:100%;">
            <circle cx="35" cy="35" r="${radius}" style="fill:none; stroke:var(--border); stroke-width:4;"/>
            <circle cx="35" cy="35" r="${radius}" class="dash-pomodoro-ring-fg" style="fill:none; stroke:${color}; stroke-width:4; stroke-linecap:round; transition: stroke-dashoffset 0.5s ease;" stroke-dasharray="${circ}" stroke-dashoffset="${dash}"/>
          </svg>
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; color:var(--text);" class="dash-pomodoro-time">${mins}:${secs}</div>
        </div>
        <div>
          <div style="font-weight:600; color:var(--text); margin-bottom:8px; font-size:0.95rem;" class="dash-pomodoro-label">${label}</div>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary btn-sm dash-pomodoro-toggle" style="display:flex; align-items:center; gap:4px; padding:6px 12px; min-width: 85px; justify-content: center;">
              ${running ? `<svg viewBox="0 0 24 24" width="14" height="14" style="stroke:currentColor; fill:none; stroke-width:2;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar` : `<svg viewBox="0 0 24 24" width="14" height="14" style="stroke:currentColor; fill:none; stroke-width:2;"><polygon points="5 3 19 12 5 21 5 3"/></svg> Iniciar`}
            </button>
            <button class="btn-icon btn-sm dash-pomodoro-reset" title="Reiniciar" style="border:1px solid var(--border);">
              <svg viewBox="0 0 24 24" width="14" height="14" style="stroke:currentColor; fill:none; stroke-width:2;"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            </button>
            <button class="btn-icon btn-sm dash-pomodoro-skip" title="Pular" style="border:1px solid var(--border);">
              <svg viewBox="0 0 24 24" width="14" height="14" style="stroke:currentColor; fill:none; stroke-width:2;"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _renderSchedule(subjects, schedule) {
    const days = [
      { key: 'mon', name: 'Seg' },
      { key: 'tue', name: 'Ter' },
      { key: 'wed', name: 'Qua' },
      { key: 'thu', name: 'Qui' },
      { key: 'fri', name: 'Sex' },
      { key: 'sat', name: 'Sáb' },
      { key: 'sun', name: 'Dom' }
    ];

    return `
      <div class="dashboard-section schedule-section">
        <h2 class="section-title">📅 Cronograma Semanal de Estudos</h2>
        <div class="weekly-schedule-grid">
          ${days.map(d => {
            const daySubjectIds = schedule[d.key] || [];
            const daySubjects = daySubjectIds
              .map(id => subjects.find(s => s.id === id))
              .filter(Boolean);

            return `
              <div class="schedule-day-card" data-day="${d.key}">
                <div class="day-header">
                  <span class="day-name">${d.name}</span>
                  <button class="btn-icon btn-add-schedule" data-day="${d.key}" title="Agendar matéria">
                    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
                <div class="day-content">
                  ${daySubjects.length === 0 
                    ? '<span class="schedule-empty">Livre ✨</span>' 
                    : daySubjects.map(s => `
                      <div class="schedule-subject-badge" style="background: color-mix(in srgb, ${s.color} 10%, var(--bg-hover)); border-left: 3px solid ${s.color};">
                        <span class="subj-tag">${s.emoji} ${s.name}</span>
                        <button class="btn-remove-schedule" data-day="${d.key}" data-subject-id="${s.id}" title="Remover">&times;</button>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _stat(icon, value, label, color, actionHtml = '') {
    return `<div class="stat-card" style="--accent:${color}; position: relative;">
      <div class="stat-icon">${icon}</div>
      <div class="stat-info">
        <div class="stat-value" style="display:flex; align-items:center; gap:8px;">
          <span>${value}</span>
          ${actionHtml}
        </div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
  }

  _renderProgress(subjects, pages, tasks) {
    return `<div class="dashboard-section">
      <h2 class="section-title">Progresso por Matéria</h2>
      <div class="progress-list">
        ${subjects.map(s => {
          const subPages = pages.filter(p=>p.subjectId===s.id).length;
          const subTasks = tasks.filter(t=>t.subjectId===s.id);
          const done = subTasks.filter(t=>t.status==='done').length;
          const pct = subTasks.length > 0 ? Math.round(done/subTasks.length*100) : 0;
          return `<div class="progress-row">
            <div class="progress-meta">
              <span>${s.emoji}</span><span class="progress-name">${s.name}</span>
              <span class="progress-count">${subPages} páginas · ${done}/${subTasks.length} tarefas</span>
            </div>
            <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%;background:${s.color}"></div></div>
            <span class="progress-pct" style="color:${s.color}">${pct}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  _renderRecent(pages, subjects) {
    return `<div class="dashboard-section">
      <h2 class="section-title">Páginas Recentes</h2>
      <div class="recent-pages">
        ${pages.map(p => {
          const s = subjects.find(x=>x.id===p.subjectId);
          return `<a href="#" class="page-card" data-nav="editor" data-page-id="${p.id}" data-subject-id="${p.subjectId}">
            <div class="page-card-subject" style="color:${s?.color||'#8B5CF6'}">${s?.emoji||'📄'} ${s?.name||''}</div>
            <div class="page-card-title">${p.title}</div>
            <div class="page-card-date">${this._rel(p.updatedAt)}</div>
          </a>`;
        }).join('')}
      </div>
    </div>`;
  }

  _renderUpcoming(events, subjects) {
    const typeLabel = {study:'Estudo',deadline:'Prazo',review:'Revisão',exam:'Prova'};
    return `<div class="dashboard-section">
      <h2 class="section-title">Próximos Eventos</h2>
      <div class="event-list">
        ${events.map(ev => {
          const s = subjects.find(x=>x.id===ev.subjectId);
          return `<div class="event-item" style="border-left-color:${ev.color}">
            <div class="event-date">${this._fmtDate(ev.date)}</div>
            <div class="event-title">${ev.title}</div>
            <div class="event-meta"><span class="event-type">${typeLabel[ev.type]||ev.type}</span>
              ${s?`<span style="color:${s.color}">${s.emoji} ${s.name}</span>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  _rel(iso) {
    const diff = Date.now()-new Date(iso).getTime();
    const m = Math.floor(diff/60000);
    if(m<1) return 'agora';
    if(m<60) return `${m}min atrás`;
    const h = Math.floor(m/60);
    if(h<24) return `${h}h atrás`;
    return `${Math.floor(h/24)}d atrás`;
  }
  _fmtDate(ds) {
    const [y,m,d]=ds.split('-');
    return new Date(y,m-1,d).toLocaleDateString('pt-BR',{day:'numeric',month:'short'});
  }
  _renderCourses(courses) {
    return `
      <div class="dashboard-section courses-section" style="margin-top:32px; margin-bottom:32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <h2 class="section-title" style="margin-bottom:0;">💻 Minhas Plataformas de Cursos</h2>
          <button class="btn-primary btn-sm" id="btn-add-course" style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:3; stroke-linecap:round; stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar Plataforma
          </button>
        </div>
        <div class="courses-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:20px;">
          ${courses.length === 0 
            ? `<div class="course-empty" style="grid-column: 1/-1; text-align:center; padding:40px 20px; background:var(--bg-card); border: 1px dashed var(--border); border-radius:var(--radius-md); color:var(--text-muted);">
                 <p style="margin:0 0 8px 0; font-size:0.9rem; font-weight:600; color:var(--text);">Nenhuma plataforma cadastrada ainda.</p>
                 <span style="font-size:0.75rem; color:var(--text-muted); line-height: 1.4; display:block; max-width:400px; margin:0 auto;">Adicione sites como Alura, Udemy, Coursera ou outros para estudar sem sair do aplicativo!</span>
               </div>`
            : courses.map(c => `
              <div class="course-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:20px; background:var(--bg-card); border: 1px solid var(--border); border-radius:var(--radius-md); transition: all 0.2s ease; position:relative; box-shadow: var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                  <span style="font-size:1.8rem; background:rgba(139, 92, 246, 0.12); padding:10px; border-radius:var(--radius-sm); line-height: 1; display: inline-flex; align-items: center; justify-content: center;">${c.emoji}</span>
                  <button class="btn-icon btn-delete-course" data-course-id="${c.id}" style="color:var(--text-muted); padding:4px; margin:-4px -4px 0 0;" title="Excluir">
                    <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
                <div style="margin-bottom:20px; flex:1;">
                  <h3 style="margin:0 0 6px 0; font-size:1.05rem; font-weight:650; color:var(--text); line-height: 1.3;">${c.name}</h3>
                  <p style="margin:0; font-size:0.75rem; color:var(--text-muted); word-break:break-all; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${c.url}">${c.url}</p>
                </div>
                <button class="btn-primary btn-sm btn-open-platform" data-course-id="${c.id}" style="width:100%; display:flex; justify-content:center; align-items:center; gap:8px; font-weight:600; padding:10px;">
                  <span>Estudar no App</span>
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round;"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }

  _renderUsefulLinks(links) {
    return `
      <div class="dashboard-section useful-links-section" style="margin-top:32px; margin-bottom:32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <h2 class="section-title" style="margin-bottom:0;">🔗 Links Úteis</h2>
          <button class="btn-primary btn-sm" id="btn-add-useful-link" style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:3; stroke-linecap:round; stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar Link
          </button>
        </div>
        <div class="useful-links-grid">
          ${links.length === 0
            ? `<div class="useful-links-empty">
                 <span style="font-size:2rem; display:block; margin-bottom:10px;">🔗</span>
                 <p style="margin:0 0 4px; font-size:0.9rem; font-weight:600; color:var(--text);">Nenhum link salvo ainda.</p>
                 <span style="font-size:0.78rem; color:var(--text-muted);">Adicione sites, ferramentas ou recursos que você usa no dia a dia!</span>
               </div>`
            : links.map(l => `
              <div class="useful-link-card">
                <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="useful-link-card-link" title="${l.url}">
                  <div class="useful-link-emoji">${l.emoji}</div>
                  <div class="useful-link-info">
                    <div class="useful-link-title">${l.title}</div>
                    ${l.description ? `<div class="useful-link-desc">${l.description}</div>` : ''}
                    <div class="useful-link-url">${l.url.replace(/^https?:\/\//, '')}</div>
                  </div>
                  <svg class="useful-link-arrow" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;opacity:0.4;flex-shrink:0;pointer-events:none;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <div class="useful-link-actions">
                  <button class="btn-icon btn-edit-useful-link" data-link-id="${l.id}" title="Editar link">
                    <svg viewBox="0 0 24 24" style="pointer-events:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                  </button>
                  <button class="btn-icon btn-delete-useful-link" data-link-id="${l.id}" title="Remover link">
                    <svg viewBox="0 0 24 24" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }
}
