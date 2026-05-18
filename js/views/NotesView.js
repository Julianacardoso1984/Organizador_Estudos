'use strict';

/**
 * NotesView — Dashboard de anotações (páginas) de matérias.
 */
class NotesView {
  constructor() {
    this.el = document.getElementById('view-notes');
    this._searchQuery = '';
  }

  render(pages, subject, allSubjects) {
    this._pages = pages;
    this._subject = subject;
    this._allSubjects = allSubjects;

    // Filtrar páginas pela busca local
    const filtered = pages.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(this._searchQuery.toLowerCase());
      return matchesSearch;
    });

    this.el.innerHTML = `
      <div class="view-content notes-content">
        <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom: 24px;">
          <div>
            <h1>${subject ? `${subject.emoji} ${subject.name}` : '📚 Todas as Matérias'} — Anotações</h1>
            <p style="font-size:0.8rem; color:var(--text-muted); margin: 4px 0 0 0;">Gerencie suas anotações e cadernos de estudo estilo Notion.</p>
          </div>
          <div class="view-header-actions" style="display:flex; align-items:center; gap:12px;">
            <select id="notes-subject-filter" class="select-input" style="padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-card); color: var(--text);">
              <option value="">Todas as matérias</option>
              ${allSubjects.map(s => `<option value="${s.id}" ${s.id === subject?.id ? 'selected' : ''}>${s.emoji} ${s.name}</option>`).join('')}
            </select>
            ${subject ? `
              <button class="btn-primary" id="btn-create-note-dash" style="display:flex; align-items:center; gap:6px;">
                <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:3;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova Anotação
              </button>
            ` : ''}
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <input type="text" id="notes-search" placeholder="🔍 Buscar nas anotações..." value="${this._esc(this._searchQuery)}" style="width:100%; max-width:400px; padding:10px 14px; border:1px solid var(--border); border-radius:var(--radius-md); background:var(--bg-card); color:var(--text); outline:none;">
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state" style="text-align:center; padding:60px 20px; background:var(--bg-card); border: 1px dashed var(--border); border-radius:var(--radius-md);">
            <div style="font-size:2.5rem; margin-bottom:12px;">📝</div>
            <h3 style="margin:0 0 6px 0; color:var(--text);">Nenhuma anotação encontrada</h3>
            <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">Crie uma nova anotação para começar a registrar seus estudos!</p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
            ${filtered.map(p => this._renderCard(p, allSubjects)).join('')}
          </div>
        `}
      </div>`;

    this._bindEvents();
  }

  _renderCard(page, subjects) {
    const sub = subjects.find(s => s.id === page.subjectId);
    const date = new Date(page.updatedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // Obter prévia do primeiro bloco de texto para o card
    const firstTextBlock = page.blocks.find(b => b.type === 'text' && b.content.trim() !== '');
    const preview = firstTextBlock ? firstTextBlock.content : 'Página em branco...';

    return `
      <div class="note-card" data-page-id="${page.id}" data-subject-id="${page.subjectId}" style="display:flex; flex-direction:column; justify-content:space-between; padding:20px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); cursor:pointer; transition:all 0.2s ease; box-shadow:var(--shadow-sm); position:relative;" onmouseover="this.style.borderColor='var(--accent)';" onmouseout="this.style.borderColor='var(--border)';">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <span style="font-size:0.75rem; padding:4px 8px; border-radius:var(--radius-sm); font-weight:600; background:color-mix(in srgb, ${sub?.color || '#8B5CF6'} 12%, var(--bg-hover)); color:${sub?.color || '#8B5CF6'}; display:inline-flex; align-items:center; gap:4px;">
              ${sub?.emoji || '📄'} ${sub?.name || 'Geral'}
            </span>
            <button class="btn-icon btn-delete-note" data-page-id="${page.id}" style="color:var(--text-muted); padding:4px; margin:-4px -4px 0 0;" title="Excluir anotação">
              <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:currentColor; fill:none; stroke-width:2.5;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
          <h3 style="margin:0 0 8px 0; font-size:1.05rem; font-weight:650; color:var(--text); line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this._esc(page.title)}">${this._esc(page.title)}</h3>
          <p style="margin:0 0 16px 0; font-size:0.8rem; color:var(--text-muted); line-height:1.45; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;" title="${this._esc(preview)}">${this._esc(preview)}</p>
        </div>
        <div style="font-size:0.7rem; color:var(--text-muted); display:flex; align-items:center; gap:4px; border-top:1px solid var(--border); padding-top:12px;">
          <span>🗓️ Atualizado em:</span>
          <strong>${date}</strong>
        </div>
      </div>`;
  }

  _bindEvents() {
    // Subject filter
    document.getElementById('notes-subject-filter')?.addEventListener('change', e => {
      EventBus.emit('navigate', { view: 'notes', subjectId: e.target.value || null });
    });

    // Create note button
    document.getElementById('btn-create-note-dash')?.addEventListener('click', () => {
      if (this._subject) {
        EventBus.emit('ui:newPage', { subjectId: this._subject.id });
      }
    });

    // Search bar
    const search = document.getElementById('notes-search');
    search?.addEventListener('input', e => {
      this._searchQuery = e.target.value;
      this.render(this._pages, this._subject, this._allSubjects);
      const s = document.getElementById('notes-search');
      if (s) {
        s.focus();
        s.setSelectionRange(s.value.length, s.value.length);
      }
    });

    // Card click navigate to editor
    this.el.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-delete-note')) return;
        const { pageId, subjectId } = card.dataset;
        EventBus.emit('navigate', { view: 'editor', pageId, subjectId });
      });
    });

    // Card delete button
    this.el.querySelectorAll('.btn-delete-note').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const { pageId } = btn.dataset;
        if (confirm('Deseja excluir permanentemente esta anotação?')) {
          EventBus.emit('editor:deletePage', { pageId });
        }
      });
    });
  }

  _esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
}
