'use strict';

/**
 * TimerModel — Temporizador Pomodoro (25/5/15 min).
 */
class TimerModel {
  constructor() {
    this.MODES = {
      focus:      { label: 'Foco',         duration: 25 * 60 },
      shortBreak: { label: 'Pausa Curta',  duration:  5 * 60 },
      longBreak:  { label: 'Pausa Longa',  duration: 15 * 60 }
    };

    this.mode       = 'focus';
    this.remaining  = this.MODES.focus.duration;
    this.running    = false;
    this.session    = 0;   // número de sessões de foco concluídas
    this._interval  = null;

    // Restaurar sessões salvas
    const saved = Storage.get('pomodoroStats');
    if (saved) this.session = saved.session || 0;
  }

  getCurrentMode() { return this.MODES[this.mode]; }

  setMode(mode) {
    if (!this.MODES[mode]) return;
    this.pause();
    this.mode = mode;
    this.remaining = this.MODES[mode].duration;
    EventBus.emit('timer:tick', this._state());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._interval = setInterval(() => {
      this.remaining--;
      EventBus.emit('timer:tick', this._state());
      if (this.remaining <= 0) this._complete();
    }, 1000);
    EventBus.emit('timer:tick', this._state());
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this._interval);
    this._interval = null;
    EventBus.emit('timer:tick', this._state());
  }

  reset() {
    this.pause();
    this.remaining = this.MODES[this.mode].duration;
    EventBus.emit('timer:tick', this._state());
  }

  toggle() { this.running ? this.pause() : this.start(); }

  _complete() {
    this.pause();
    if (this.mode === 'focus') {
      this.session++;
      Storage.set('pomodoroStats', { session: this.session });
    }
    EventBus.emit('timer:complete', { mode: this.mode, session: this.session });
    this._playSound();
    // Auto-switch
    if (this.mode === 'focus') {
      this.setMode(this.session % 4 === 0 ? 'longBreak' : 'shortBreak');
    } else {
      this.setMode('focus');
    }
  }

  _playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch (_) { /* AudioContext pode não estar disponível */ }
  }

  resetFocusSessions() {
    this.session = 0;
    Storage.set('pomodoroStats', { session: 0 });
    EventBus.emit('timer:tick', this._state());
  }

  _state() {
    return {
      mode:      this.mode,
      label:     this.MODES[this.mode].label,
      total:     this.MODES[this.mode].duration,
      remaining: this.remaining,
      running:   this.running,
      session:   this.session
    };
  }
}
