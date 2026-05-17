'use strict';

/**
 * CalendarView — Calendário mensal de estudos.
 */
class CalendarView {
  constructor() {
    this.el    = document.getElementById('view-calendar');
    this._year  = new Date().getFullYear();
    this._month = new Date().getMonth() + 1; // 1-12
  }

  render(events, subjects) {
    this._events   = events;
    this._subjects = subjects;
    this._draw();
  }

  _draw() {
    const y = this._year, m = this._month;
    const monthName = new Date(y, m-1, 1).toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
    const firstDay  = new Date(y, m-1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = new Date().toISOString().slice(0,10);

    const monthEvents = this._events.filter(e => {
      const [ey,em] = e.date.split('-');
      return parseInt(ey)===y && parseInt(em)===m;
    });

    // Build day grid
    let cells = '';
    for (let i=0; i<firstDay; i++) cells += `<div class="cal-cell cal-empty"></div>`;
    for (let d=1; d<=daysInMonth; d++) {
      const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvs = monthEvents.filter(e => e.date === ds);
      const isToday = ds === today;
      cells += `
        <div class="cal-cell ${isToday?'today':''}" data-date="${ds}">
          <div class="cal-day-num ${isToday?'today-num':''}">${d}</div>
          <div class="cal-events">
            ${dayEvs.slice(0,3).map(ev=>
              `<div class="cal-event-pill" style="background:${ev.color}20;color:${ev.color}" data-event-id="${ev.id}" title="${ev.title}">${ev.title}</div>`
            ).join('')}
            ${dayEvs.length > 3 ? `<div class="cal-more">+${dayEvs.length-3}</div>` : ''}
          </div>
        </div>`;
    }

    this.el.innerHTML = `
      <div class="view-content calendar-content">
        <div class="view-header">
          <h1>📅 Calendário</h1>
          <button class="btn-primary" id="btn-new-event">+ Novo Evento</button>
        </div>

        <div class="cal-nav">
          <button class="btn-icon cal-prev" id="cal-prev">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 class="cal-month-title">${this._capitalize(monthName)}</h2>
          <button class="btn-icon cal-next" id="cal-next">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div class="cal-grid">
          <div class="cal-weekdays">
            ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>`<div class="cal-weekday">${d}</div>`).join('')}
          </div>
          <div class="cal-cells">${cells}</div>
        </div>

        <div class="cal-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#8B5CF6"></span>Estudo</span>
          <span class="legend-item"><span class="legend-dot" style="background:#EF4444"></span>Prova</span>
          <span class="legend-item"><span class="legend-dot" style="background:#F59E0B"></span>Prazo</span>
          <span class="legend-item"><span class="legend-dot" style="background:#06B6D4"></span>Revisão</span>
        </div>
      </div>`;

    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      this._month--;
      if (this._month < 1) { this._month = 12; this._year--; }
      this._draw();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      this._month++;
      if (this._month > 12) { this._month = 1; this._year++; }
      this._draw();
    });
    document.getElementById('btn-new-event')?.addEventListener('click', () => {
      const today = new Date().toISOString().slice(0,10);
      EventBus.emit('ui:newEvent', { date: today });
    });

    // Click on cell → new event for that day
    this.el.querySelectorAll('.cal-cell:not(.cal-empty)').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.cal-event-pill')) return;
        EventBus.emit('ui:newEvent', { date: cell.dataset.date });
      });
    });

    // Click on event pill → edit
    this.el.querySelectorAll('.cal-event-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        EventBus.emit('ui:editEvent', { eventId: pill.dataset.eventId });
      });
    });
  }

  _capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
}
