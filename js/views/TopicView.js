'use strict';

/**
 * TopicView — Lista de tópicos/assuntos a estudar.
 */
class TopicView {
  constructor() {
    this.el = document.getElementById('view-topics');
  }

  render(topics, subject, allSubjects) {
    this.el.innerHTML = `
      <div class="view-content topics-content" style="max-width: 800px; margin: 0 auto;">
        <div class="view-header">
          <h1>${subject?.emoji||'📚'} ${subject?.name||'Todos os Assuntos'} — Assuntos</h1>
          <div class="view-header-actions">
            <select id="topic-subject-filter" class="select-input">
              <option value="">Todas as matérias</option>
              ${allSubjects.map(s=>`<option value="${s.id}" ${s.id===subject?.id?'selected':''}>${s.emoji} ${s.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="card" style="margin-bottom: 20px; padding: 16px;">
          <div style="display: flex; gap: 10px;">
            <input type="text" id="topic-new-input" class="modal-input" placeholder="Novo assunto para estudar..." style="flex: 1;">
            <button class="btn-primary" id="btn-add-topic">Adicionar</button>
          </div>
        </div>

        ${topics.length === 0 ? `
          <div class="empty-state small">
            <p>Nenhum assunto cadastrado ainda. Comece adicionando acima!</p>
          </div>` : `
          <div class="topics-list" style="display: flex; flex-direction: column; gap: 10px;">
            ${topics.map(t => this._renderTopicRow(t, allSubjects)).join('')}
          </div>`}
      </div>`;

    this._bindEvents(subject, allSubjects);
  }

  _renderTopicRow(topic, subjects) {
    const subject = subjects.find(s=>s.id===topic.subjectId);
    return `
      <div class="card topic-row" data-topic-id="${topic.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; opacity: ${topic.studied ? '0.6' : '1'}; transition: opacity 0.2s;">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
          <button class="btn-icon btn-topic-toggle" data-topic-id="${topic.id}" title="${topic.studied ? 'Marcar como não estudado' : 'Marcar como estudado'}" style="color: ${topic.studied ? 'var(--accent)' : 'var(--text-muted)'};">
            <svg viewBox="0 0 24 24" width="24" height="24" style="fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;">
              ${topic.studied 
                ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                : '<circle cx="12" cy="12" r="10"></circle>'}
            </svg>
          </button>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 1rem; font-weight: 500; text-decoration: ${topic.studied ? 'line-through' : 'none'};">${topic.name}</span>
            ${subject ? `<span style="font-size: 0.75rem; color: ${subject.color};">${subject.emoji} ${subject.name}</span>` : ''}
          </div>
        </div>
        <div class="topic-actions">
          <button class="btn-icon btn-topic-delete" data-topic-id="${topic.id}" title="Excluir assunto">
            <svg viewBox="0 0 24 24" width="20" height="20" style="fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }

  _bindEvents(currentSubject, allSubjects) {
    const input = document.getElementById('topic-new-input');
    const btnAdd = document.getElementById('btn-add-topic');

    const handleAdd = () => {
      const name = input?.value.trim();
      if (!name) return;
      if (!currentSubject && allSubjects.length > 0) {
        // If no subject selected, default to first or ask user. Here we just pick first for simplicity if viewing "All",
        // but better: emit an event to open a modal if no subject is selected in the view.
        EventBus.emit('ui:pickSubjectForTopic', { name });
        return;
      }
      if (!currentSubject && allSubjects.length === 0) {
        alert('Crie uma matéria primeiro.');
        return;
      }
      EventBus.emit('topic:create', { subjectId: currentSubject.id, name });
    };

    btnAdd?.addEventListener('click', handleAdd);
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAdd();
    });

    document.getElementById('topic-subject-filter')?.addEventListener('change', e => {
      EventBus.emit('navigate', {view:'topics', subjectId: e.target.value || null});
    });

    this.el.querySelectorAll('.btn-topic-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        EventBus.emit('topic:toggle', { topicId: btn.dataset.topicId });
      });
    });

    this.el.querySelectorAll('.btn-topic-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if(confirm('Excluir este assunto?')) {
          EventBus.emit('topic:delete', { topicId: btn.dataset.topicId });
        }
      });
    });
  }
}
