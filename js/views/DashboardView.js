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
      <div class="view-content dashboard-content canvas-dashboard">
        <!-- Coluna Esquerda: Course Cards -->
        <div class="canvas-main">
          <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
            <div>
              <h1 style="font-size: 1.6rem; margin-bottom:4px;">Painel</h1>
              <p class="greeting-date" style="color:var(--text-muted); font-size: 0.9rem;">${greeting}, hoje é ${now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p>
            </div>
            <div>
              <button class="btn-primary" id="btn-dash-new-subject" style="display:flex; align-items:center; gap:8px;">
                <svg viewBox="0 0 24 24" width="16" height="16" style="stroke:currentColor; fill:none; stroke-width:2;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova Matéria
              </button>
            </div>
          </div>

          <div class="course-card-grid">
            ${subjects.length === 0 ? `<div class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;"><div class="empty-icon" style="font-size:3rem; margin-bottom:16px;">🎓</div><h2>Comece agora!</h2><p style="color:var(--text-muted);">Crie sua primeira matéria para começar a estudar.</p></div>` : ''}
            ${subjects.map(s => {
              const subPages = pages.filter(p=>p.subjectId===s.id).length;
              const subTasks = tasks.filter(t=>t.subjectId===s.id && t.status !== 'done').length;
              return `
              <a href="#" class="course-card" data-nav="notes" data-subject-id="${s.id}">
                <div class="course-card-color" style="background-color: ${s.color}; color: #fff;">
                  ${s.emoji}
                </div>
                <div class="course-card-content">
                  <div class="course-card-subtitle">Matéria</div>
                  <div class="course-card-title" title="${s.name}">${s.name}</div>
                  <div class="course-card-footer">
                    <div class="course-card-footer-icon" title="${subPages} Anotações">
                      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      ${subPages}
                    </div>
                    <div class="course-card-footer-icon" title="${subTasks} Tarefas Pendentes">
                      <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                      ${subTasks}
                    </div>
                  </div>
                </div>
              </a>`;
            }).join('')}
          </div>
        </div>

        <!-- Coluna Direita: To Do & Coming Up -->
        <div class="canvas-sidebar-right">
          <div class="canvas-todo">
            <div class="todo-header">
              A Fazer
              <span style="background:var(--bg-active); padding: 2px 6px; border-radius:12px; font-size:0.75rem;">${tasks.filter(t=>t.status!=='done').length}</span>
            </div>
            ${tasks.filter(t=>t.status!=='done').slice(0, 5).map(t => {
              const s = subjects.find(x=>x.id===t.subjectId);
              return `
              <div class="todo-item">
                <div class="todo-item-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" style="stroke:currentColor; fill:none; stroke-width:2;"><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <div class="todo-item-content">
                  <div class="todo-item-title">${t.title}</div>
                  <div class="todo-item-meta">${s ? s.name : ''} • ${t.dueDate ? this._fmtDate(t.dueDate) : 'Sem data'}</div>
                </div>
              </div>`;
            }).join('')}
            ${tasks.filter(t=>t.status!=='done').length === 0 ? '<p style="font-size:0.85rem; color:var(--text-muted);">Nada pendente!</p>' : ''}
            
            <div class="todo-header" style="margin-top:24px;">
              Próximos Eventos
            </div>
            ${upcoming.map(ev => {
              const s = subjects.find(x=>x.id===ev.subjectId);
              return `
              <div class="todo-item">
                <div class="todo-item-icon" style="color:${ev.color || 'var(--accent)'}">
                  <svg viewBox="0 0 24 24" width="16" height="16" style="stroke:currentColor; fill:none; stroke-width:2;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div class="todo-item-content">
                  <div class="todo-item-title">${ev.title}</div>
                  <div class="todo-item-meta">${this._fmtDate(ev.date)} ${s ? '• ' + s.name : ''}</div>
                </div>
              </div>`;
            }).join('')}
            ${upcoming.length === 0 ? '<p style="font-size:0.85rem; color:var(--text-muted);">Sem eventos próximos.</p>' : ''}
          </div>
        </div>
      </div>`;

    // Bind nav buttons
    this.el.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        // Since course cards navigate to subject's notes directly, emit navigation for that subject
        EventBus.emit('navigate', {view: el.dataset.nav, pageId: el.dataset.pageId, subjectId: el.dataset.subjectId});
      });
    });

    this.el.querySelector('#btn-dash-new-subject')?.addEventListener('click', () => {
      EventBus.emit('ui:newSubject');
    });

    // Zerar tempo focado
    this.el.querySelector('#btn-reset-focus-time')?.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('Deseja zerar o tempo total focado nas estatísticas?')) {
        EventBus.emit('ui:resetFocusSessions');
      }
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
}
