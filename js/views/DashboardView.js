'use strict';

/**
 * DashboardView — Painel principal com estatísticas e resumo.
 */
class DashboardView {
  constructor() {
    this.el = document.getElementById('view-dashboard');
  }

  render(subjects, pages, tasks, calendar) {
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

    this.el.innerHTML = `
      <div class="view-content dashboard-content">
        <div class="dashboard-greeting" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 32px;">
          <div>
            <h1>${greeting}! 👋</h1>
            <p class="greeting-date">${now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div class="dashboard-clock" id="dashboard-clock" title="Hora atual">
            <span class="dash-clock-time">00:00:00</span>
          </div>
        </div>
        <div class="stats-grid">
          ${this._stat('📚', subjects.length, 'Matérias', '#8B5CF6')}
          ${this._stat('📝', pages.length, 'Páginas', '#06B6D4')}
          ${this._stat('✅', taskStats.done||0, 'Concluídas', '#10B981')}
          ${this._stat('⏳', (taskStats.todo||0)+(taskStats.doing||0), 'Pendentes', '#F59E0B')}
        </div>
        ${subjects.length > 0 ? this._renderProgress(subjects, pages, tasks) : ''}
        <div class="dashboard-columns">
          ${recentPages.length > 0 ? this._renderRecent(recentPages, subjects) : ''}
          ${upcoming.length > 0 ? this._renderUpcoming(upcoming, subjects) : ''}
        </div>
        ${subjects.length === 0 ? `<div class="empty-state"><div class="empty-icon">🎓</div><h2>Comece agora!</h2><p>Crie sua primeira matéria na barra lateral.</p></div>` : ''}
      </div>`;

    this.el.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        EventBus.emit('navigate', {view:el.dataset.nav, pageId:el.dataset.pageId, subjectId:el.dataset.subjectId});
      });
    });
  }

  _stat(icon, value, label, color) {
    return `<div class="stat-card" style="--accent:${color}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-info"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>
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
