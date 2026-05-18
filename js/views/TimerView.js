'use strict';

/**
 * TimerView — Interface do Pomodoro.
 */
class TimerView {
  constructor() {
    this.el = document.getElementById('view-timer');
    this._playingSounds = { rain: false, wind: false, binaural: false, campfire: false, waves: false };
    this._soundVolumes = { rain: 0.3, wind: 0.3, binaural: 0.2, campfire: 0.3, waves: 0.3 };
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
      <div class="view-content timer-content" style="display:flex; flex-direction:column; align-items:center; gap:20px; padding:32px 24px;">
        <h1 class="timer-title" style="margin:0;">Pomodoro</h1>

        <div class="timer-mode-tabs" style="margin:0;">
          <button class="mode-tab ${mode==='focus'?'active':''}" data-mode="focus">🎯 Foco</button>
          <button class="mode-tab ${mode==='shortBreak'?'active':''}" data-mode="shortBreak">☕ Pausa Curta</button>
          <button class="mode-tab ${mode==='longBreak'?'active':''}" data-mode="longBreak">🛌 Pausa Longa</button>
        </div>

        <div class="timer-ring-wrap" style="margin:0;">
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

        <div class="timer-controls" style="margin:0;">
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

        <div class="timer-sessions" style="margin:0;">
          <span class="sessions-label">Sessões concluídas:</span>
          <div class="sessions-dots">
            ${Array.from({length:Math.max(session,4)}, (_,i)=>`<span class="session-dot ${i<session?'done':''}"></span>`).join('')}
          </div>
        </div>

        <div class="timer-tips" style="margin:0;">
          ${mode==='focus'
            ? '<p>🎯 Foque na tarefa. Evite distrações por <strong>25 minutos</strong>.</p>'
            : '<p>☕ Descanse e recarregue. Você merece!</p>'}
        </div>

        <!-- Painel Zen Focus de Sons Ambientes -->
        <div class="timer-zen-panel" style="margin-top: 16px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); max-width: 420px; width: 100%; box-shadow: var(--shadow-sm);">
          <h3 style="margin: 0 0 16px 0; font-size: 0.95rem; font-weight: 650; display: flex; align-items: center; gap: 6px; color: var(--text); justify-content:center;">
            <span>🧘</span> Sons Ambientes Zen (Modo Foco)
          </h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Chuva -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <button class="btn-ghost btn-sm btn-sound-toggle ${this._playingSounds.rain ? 'active' : ''}" data-sound="rain" style="display: flex; align-items: center; gap: 6px; min-width: 130px; justify-content: flex-start; padding: 6px 12px; border-radius: var(--radius-sm);">
                <span class="sound-emoji">🌧️</span> Chuva
              </button>
              <input type="range" class="sound-slider" data-sound="rain" min="0" max="1" step="0.05" value="${this._soundVolumes.rain}" style="flex: 1; accent-color: var(--accent);">
            </div>
            <!-- Vento -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <button class="btn-ghost btn-sm btn-sound-toggle ${this._playingSounds.wind ? 'active' : ''}" data-sound="wind" style="display: flex; align-items: center; gap: 6px; min-width: 130px; justify-content: flex-start; padding: 6px 12px; border-radius: var(--radius-sm);">
                <span class="sound-emoji">💨</span> Vento Suave
              </button>
              <input type="range" class="sound-slider" data-sound="wind" min="0" max="1" step="0.05" value="${this._soundVolumes.wind}" style="flex: 1; accent-color: var(--accent);">
            </div>
            <!-- Ondas Binaurais -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <button class="btn-ghost btn-sm btn-sound-toggle ${this._playingSounds.binaural ? 'active' : ''}" data-sound="binaural" style="display: flex; align-items: center; gap: 6px; min-width: 130px; justify-content: flex-start; padding: 6px 12px; border-radius: var(--radius-sm);" title="Utilize fones de ouvido para sentir o efeito de 10Hz">
                <span class="sound-emoji">🧠</span> Ondas Alfa (10Hz)
              </button>
              <input type="range" class="sound-slider" data-sound="binaural" min="0" max="1" step="0.05" value="${this._soundVolumes.binaural}" style="flex: 1; accent-color: var(--accent);">
            </div>
            <!-- Lareira Crepitante -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <button class="btn-ghost btn-sm btn-sound-toggle ${this._playingSounds.campfire ? 'active' : ''}" data-sound="campfire" style="display: flex; align-items: center; gap: 6px; min-width: 130px; justify-content: flex-start; padding: 6px 12px; border-radius: var(--radius-sm);">
                <span class="sound-emoji">🔥</span> Lareira
              </button>
              <input type="range" class="sound-slider" data-sound="campfire" min="0" max="1" step="0.05" value="${this._soundVolumes.campfire}" style="flex: 1; accent-color: var(--accent);">
            </div>
            <!-- Ondas do Mar -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <button class="btn-ghost btn-sm btn-sound-toggle ${this._playingSounds.waves ? 'active' : ''}" data-sound="waves" style="display: flex; align-items: center; gap: 6px; min-width: 130px; justify-content: flex-start; padding: 6px 12px; border-radius: var(--radius-sm);">
                <span class="sound-emoji">🌊</span> Ondas do Mar
              </button>
              <input type="range" class="sound-slider" data-sound="waves" min="0" max="1" step="0.05" value="${this._soundVolumes.waves}" style="flex: 1; accent-color: var(--accent);">
            </div>
          </div>
          <p style="font-size: 0.68rem; color: var(--text-muted); margin: 12px 0 0 0; line-height: 1.4; text-align: center;">
            Sons gerados matematicamente offline em tempo real pelo navegador! Use fones para usufruir das Ondas Alfa.
          </p>
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

    // Sons Ambientes
    this.el.querySelectorAll('.btn-sound-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.sound;
        EventBus.emit('sound:toggle', { type });
      });
    });

    this.el.querySelectorAll('.sound-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const type = slider.dataset.sound;
        const val = e.target.value;
        EventBus.emit('sound:volume', { type, value: val });
      });
    });
  }
}
