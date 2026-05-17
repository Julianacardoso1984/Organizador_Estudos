'use strict';

/**
 * TimerView — Interface do Pomodoro.
 */
class TimerView {
  constructor() {
    this.el = document.getElementById('view-timer');
  }

  render(state) {
    const { mode, label, total, remaining, running, session } = state;
    const pct = ((total - remaining) / total) * 100;
    const mins = String(Math.floor(remaining/60)).padStart(2,'0');
    const secs = String(remaining % 60).padStart(2,'0');
    const radius = 110;
    const circ   = 2 * Math.PI * radius;
    const dash   = circ - (pct / 100) * circ;

    this.el.innerHTML = `
      <div class="view-content timer-content">
        <h1 class="timer-title">Pomodoro</h1>

        <div class="timer-mode-tabs">
          <button class="mode-tab ${mode==='focus'?'active':''}" data-mode="focus">🎯 Foco</button>
          <button class="mode-tab ${mode==='shortBreak'?'active':''}" data-mode="shortBreak">☕ Pausa Curta</button>
          <button class="mode-tab ${mode==='longBreak'?'active':''}" data-mode="longBreak">🛌 Pausa Longa</button>
        </div>

        <div class="timer-ring-wrap">
          <svg class="timer-ring" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="${radius}" class="ring-bg"/>
            <circle cx="130" cy="130" r="${radius}" class="ring-fg"
              stroke-dasharray="${circ}" stroke-dashoffset="${dash}"
              style="stroke:${mode==='focus'?'#8B5CF6':mode==='shortBreak'?'#06B6D4':'#10B981'}"/>
          </svg>
          <div class="timer-display">
            <div class="timer-time">${mins}:${secs}</div>
            <div class="timer-label">${label}</div>
          </div>
        </div>

        <div class="timer-controls">
          <button class="btn-icon-lg" id="btn-timer-reset" title="Reiniciar">
            <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          </button>
          <button class="btn-primary btn-timer-toggle" id="btn-timer-toggle">
            ${running ? `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar`
                      : `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Iniciar`}
          </button>
          <button class="btn-icon-lg" id="btn-timer-skip" title="Pular">
            <svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
        </div>

        <div class="timer-sessions">
          <span class="sessions-label">Sessões concluídas:</span>
          <div class="sessions-dots">
            ${Array.from({length:Math.max(session,4)}, (_,i)=>`<span class="session-dot ${i<session?'done':''}"></span>`).join('')}
          </div>
        </div>

        <div class="timer-tips">
          ${mode==='focus'
            ? '<p>🎯 Foque na tarefa. Evite distrações por <strong>25 minutos</strong>.</p>'
            : '<p>☕ Descanse e recarregue. Você merece!</p>'}
        </div>
      </div>`;

    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btn-timer-toggle')?.addEventListener('click', () => EventBus.emit('timer:toggle'));
    document.getElementById('btn-timer-reset')?.addEventListener('click',  () => EventBus.emit('timer:reset'));
    document.getElementById('btn-timer-skip')?.addEventListener('click',   () => EventBus.emit('timer:skip'));
    this.el.querySelectorAll('.mode-tab').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('timer:setMode', btn.dataset.mode));
    });
  }
}
